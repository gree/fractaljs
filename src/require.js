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
      data = {};
      if (ownerCount === 0) {
        console.debug("release done", dataOwner);
        dataOwner = null;
        ownerCount = 0;
      }
      return true;
    };

    var lock = function(name) {
      if (!dataOwner || dataOwner === name) {
        dataOwner = name;
        ++ownerCount;
        data = {};
        console.debug("lock", dataOwner, ownerCount);
        return true;
      } else {
        return false;
      }
    };

    var loadObjects = (function(){
      var asyncCall = namespace.createAsyncCall();

      var main = function(url, name, callback) {
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
            main(url, name, callback);
          });
        }
      };

      return function(name, url, callback) {
        asyncCall(url, main, name, callback);
      };
    })();

    namespace.define = function(name, constructor) {
      console.debug("define", (name || "config"), "dataOwner", dataOwner);
      data[name] = constructor;
    };

    namespace.requireComponents = function(envName, url, callback) {
      loadObjects("component." + envName, url, callback);
    };

    namespace.requireConfig = function(url, callback) {
      loadObjects("config", url, function(data){
        for (var i in data) {
          callback(data[i]);
          return;
        }
        callback();
      });
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
      var asyncCall = namespace.createAsyncCall();

      var main = function(url, param, callback) {
        var type = getResourceType(url);
        console.log("network require", url)
        Type2Getter[type](url, function(err, data) {
          if (err) {
            console.error('Require error: ' + err);
          }
          callback(data);
        });
      };

      return function(url, callback) {
        asyncCall(url, main, null, callback);
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

