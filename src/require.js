(function(namespace){
  namespace.ObjectLoader = (function(){
    var data = null;
    var queue = [];

    var lock = {
      get: function(){
        if (!data) {
          data = {};
          return true;
        }
        return false;
      },
      release: function(){ data = null; }
    };

    var lockedCall = function(func) {
      if (!lock.get()) {
        queue.push(func);
        return false;
      } else {
        func(function(){
          lock.release();
          if (queue.length) {
            lockedCall(queue.shift());
          }
        });
        return true;
      }
    };

    return {
      component: {
        define: function(name, component) {
          data.components[name] = component;
        },
        load: function(url, callback) {
          var res = lockedCall(function(lockedCallback){
            data.components = {};
            namespace.require(url, function(){
              var components = data.components;
              lockedCallback();
              callback(components);
            });
          });
          console.debug("lockedCall", url, res);
        },
      },
      config: {
        define: function(config) {
          data.config = config;
        },
        load: function(url, callback) {
          lockedCall(function(lockedCallback){
            namespace.require(url, function(){
              var config = data.config;
              lockedCallback();
              callback(config);
            });
          });
        },
      },
    };
  })();

  namespace.require = (function(){
    var byAddingElement = function(element, callback) {
      var done = false;
      element.onload = element.onreadystatechange = function(){
        if ( !done && (!this.readyState ||
                       this.readyState == "loaded" || this.readyState == "complete") ) {
          done = true;
          callback(false, true);
          element.onload = element.onreadystatechange = null;
        }
      };
      var container = document.getElementsByTagName("head")[0];
      container.appendChild(element);
    };
    var byAjax = function(url, callback){
      var xhr = new XMLHttpRequest();
      xhr.open('GET', url, true);
      xhr.onreadystatechange = function () {
        if (xhr.readyState === 4) {
          var err, data;
          if ((xhr.status === 200 || xhr.status === 0) && xhr.responseText) {
            callback(false, xhr.responseText);
          } else {
            callback("unexpected server resposne: " + xhr.status);
          }
        }
      }
      xhr.send("");
    };
    var Type2Getter = {
      "js": function(url, callback) {
        var el = document.createElement("script");
        el.src = url;
        byAddingElement(el, callback);
      },
      "css": function(url, callback) {
        var el = document.createElement("link");
        el.rel="stylesheet";
        el.href = url;
        document.getElementsByTagName("head")[0].appendChild(el);
        callback(false, true);
      },
      "tmpl": byAjax
    };
    var singleRequire = (function(){
      var listeners = {};
      var cache = {};

      var releaseListeners = function(resource, data) {
        listeners[resource.url].forEach(function(v){v(data, resource.id);});
        delete listeners[resource.url];
      };

      return function(resource, callback) {
        if (resource.url in cache) {
          callback(cache[resource.url], resource.id);
          return;
        }
        if (resource.url in listeners) {
          listeners[resource.url].push(callback);
          return;
        }

        var timeout = setTimeout(function(){
          console.error('Require timeout: ' + resource.url);
          releaseListeners(resource);
        }, 10000);
        listeners[resource.url] = [callback];
        Type2Getter[resource.type](resource.url, function(err, data) {
          clearTimeout(timeout);
          if (err) {
            console.error('Require error: ' + err);
          } else {
            cache[resource.url] = data;
          }
          releaseListeners(resource, data);
        });
      };
    })();

    return function(resourceList, callback) {
      if (!Array.isArray(resourceList)) {
        return singleRequire(resourceList, callback);
      }
      var retData = {};
      namespace.forEachAsync(resourceList, function(v, cb){
        singleRequire(v, function(data, id){
          retData[id] = data;
          cb();
        });
      }, function(){ callback(retData); });
    };
  })();
})(window.F._private);

