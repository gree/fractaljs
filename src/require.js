(function(namespace){
  var getResourceType = (function(){
    var KNOWN_TYPES = {js:1, css:1, tmpl:1};
    return function(name) {
      var type = name.split(".").pop();
      return (type in KNOWN_TYPES) ? type : "tmpl";
    };
  })();

  (function(){
    var data = null;
    var dataOwner = null;
    var ownerCount = 0;
    var queue = [];

    var release = function(name){
      if (name !== dataOwner) return false;
      --ownerCount;
      console.debug("release", dataOwner, ownerCount);
      if (ownerCount === 0) {
        console.debug("release done", dataOwner);
        data = null;
        dataOwner = null;
        ownerCount = 0;
      }
      return true;
    };

    var lock = function(name) {
      if (!dataOwner){
      //if (!dataOwner || dataOwner === name) {
        dataOwner = name;
        ++ownerCount;
        data = {};
        console.debug("lock", dataOwner, ownerCount);
        return true;
      } else {
        return false;
      }
    };

    var loadObjects = function(name, url, callback) {
      console.debug("loadObjects", name, url);
      if (lock(name)) {
        namespace.require(url, function(){
          var loadedData = data;
          release(name);
          if (queue.length) queue.shift()();
          callback(loadedData);
        });
      } else {
        queue.push(function(){
          loadObjects(name, url, callback);
        });
      }
    };

    namespace.define = function(name, constructor) {
      console.debug("define", name, "dataOwner", dataOwner);
      data[name] = constructor;
    };

    namespace.requireComponents = function(envName, url, callback) {
      loadObjects("component." + envName, url, callback);
    };

    namespace.requireConfig = function(url, callback) {
      loadObjects("config", url, function(data){
        if (data) {
          for (var i in data) {
            callback(data[i]);
            break;
          }
        } else {
          callback();
        }
      });
    };
  })();

  namespace.ObjectLoader = (function(){
    // var data = null;
    // var queue = [];

    // var lock = {
    //   get: function(){
    //     if (!data) {
    //       data = {};
    //       return true;
    //     }
    //     return false;
    //   },
    //   release: function(){
    //     data = null;
    //   },
    // };

    // var lockedCall = function(func) {
    //   if (!lock.get()) {
    //     queue.push(func);
    //     return false;
    //   } else {
    //     func(function(){
    //       lock.release();
    //       if (queue.length) {
    //         lockedCall(queue.shift());
    //       }
    //     });
    //     return true;
    //   }
    // };

    data = {}; // TODO remove me
    return {
      component: {
        define: function(name, constructor) {
          data.components[name] = constructor;
        },
        load: function(url, callback) {
          // var res = lockedCall(function(lockedCallback){
          //   data.components = {};
          //   namespace.require(url, function(){
          //     var components = data.components;
          //     lockedCallback();
          //     callback(components);
          //   });
          // });
          // console.debug("lockedCall", url, res);
          console.log("load", url);
          data.components = {};
          namespace.require(url, function(){
            var components = data.components;
            console.log("load done", url);
            callback(components);
          });
        },
      },
      config: {
        define: function(config) {
          data.config = config;
        },
        load: function(url, callback) {
          // lockedCall(function(lockedCallback){
          //   namespace.require(url, function(){
          //     var config = data.config;
          //     lockedCallback();
          //     callback(config);
          //   });
          // });
          namespace.require(url, function(){
            var config = data.config;
            callback(config);
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
      xhr.onreadystatechange = function(){
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

      var releaseListeners = function(url, data) {
        listeners[url].forEach(function(v){
          v(data);
        });
        delete listeners[url];
      };

      return function(url, callback) {
        if (url in cache) {
          callback(cache[url]);
          return;
        }
        if (url in listeners) {
          listeners[url].push(callback);
          return;
        }

        var timeout = setTimeout(function(){
          console.error('Require timeout: ' + url);
          releaseListeners(url);
        }, 10000);
        listeners[url] = [callback];
        var type = getResourceType(url);
        Type2Getter[type](url, function(err, data) {
          clearTimeout(timeout);
          if (err) {
            console.error('Require error: ' + err);
          } else {
            cache[url] = data;
          }
          releaseListeners(url, data);
        });
      };
    })();

    return function(urlList, callback) {
      if (!Array.isArray(urlList)) {
        return singleRequire(urlList, callback);
      }
      if (!urlList.length) return callback();
      var retData = {};
      namespace.forEachAsync(
        urlList,
        function(v, cb){
          singleRequire(v, function(data, id){
            retData[id] = data;
            cb();
          });
        },
        function(){
          callback(retData);
        }
      );
    };
  })();
})(window.F.__);

