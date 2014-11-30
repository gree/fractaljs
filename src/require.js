(function(namespace){ // dev

  // import
  var ClassType = namespace.ClassType, // dev
  createAsyncOnce = namespace.createAsyncOnce; // dev

  var ObjectLoader = (function(){
    var data = null,
    dataOwner = null,
    refCount = 0,
    queue = [];

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

    var asyncOnce = createAsyncOnce();

    var main = function(name, url, callback) {
      console.debug("loadObjects", name, url);
      if (lock(name)) {
        require(url, function(){
          var data = release(name);
          if (queue.length) queue.shift()();
          callback(data);
        });
      } else {
        queue.push(function(){
          main(name, url, callback);
        });
      }
    };

    var load =  function(name, url, callback) {
      asyncOnce(url, function(cb){
        main(name, url, function(data){
          cb(function(cb){ cb(data); });
        });
      }, callback);
    };

    return {
      define: function(name, constructor) {
        data[name] = constructor;
      },
      requireComponent: function(envName, url, callback) {
        load(ClassType.COMPONENT + "." + envName, url, callback);
      },
      requireEnv: function(url, callback) {
        load(ClassType.ENV, url, callback);
      },
    };
  })();

  var require = (function(){
    var KNOWN_TYPES = {js:1, css:1, tmpl:1};
    var getResourceType = function(name) {
      var type = name.split(".").pop();
      return (type in KNOWN_TYPES) ? type : "tmpl";
    };

    var byAddingElement = function(element, callback) {
      var done = false;
      element.onload = element.onreadystatechange = function(){
        var state = this.readyState;
        if ( !done && (!state || state == "loaded" || state == "complete") ) {
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
          var err, data, status = xhr.status, res = xhr.responseText;
          if ((status === 200 || status === 0) && res) {
            callback(false, res);
          } else {
            callback("unexpected server resposne: " + status);
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

    return (function(){
      var cache = {};
      var asyncOnce = createAsyncOnce();

      var main = function(url, callback) {
        var type = getResourceType(url);
        console.log("network require", url)
        Type2Getter[type](url, function(err, data) {
          if (err) {
            console.error('Require error: ' + err);
          }
          cache[url] = data;
          callback(data);
        });
      };

      return function(url, callback) {
        if (url in cache) {
          return callback(cache[url]);
        }
        asyncOnce(url, function(cb){
          main(url, function(data){
            cb(function(cb){ cb(data); });
          });
        }, callback);
      };
    })();
  })();

  namespace.ObjectLoader = ObjectLoader; // dev
  namespace.require = require; // dev

})(F.__); // dev

