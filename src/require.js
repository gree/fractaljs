F(function(namespace){
  var TYPE = namespace.ClassType;
  var createAsyncCall = namespace.createAsyncCall;

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
    var refCount = 0;
    var queue = [];

    var release = function(name){
      if (name !== dataOwner) return false;
      --refCount;
      var refCopy = data;
      data = {};
      if (refCount === 0) {
        console.debug("release done", dataOwner);
        dataOwner = null;
        refCount = 0;
      }
      return refCopy;
    };

    var lock = function(name) {
      if (!dataOwner || dataOwner === name) {
        dataOwner = name;
        ++refCount;
        data = {};
        console.debug("lock", dataOwner, refCount);
        return true;
      } else {
        return false;
      }
    };

    var loadObjects = (function(){
      var asyncCall = createAsyncCall();

      var main = function(url, name, callback) {
        console.debug("loadObjects", name, url);
        if (lock(name)) {
          require(url, function(){
            var data = release(name);
            if (queue.length) queue.shift()();
            callback(data);
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
      console.debug("define", name, "dataOwner", dataOwner);
      data[name] = constructor;
    };

    namespace.requireComponent = function(envName, url, callback) {
      loadObjects(TYPE.COMPONENT + "." + envName, url, callback);
    };

    namespace.requireEnv = function(url, callback) {
      loadObjects(TYPE.ENV, url, callback);
    };
  })();

  var require = namespace.require = (function(){
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
      var asyncCall = createAsyncCall();

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
});

