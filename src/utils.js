(function(namespace){
  namespace.forEachAsync = function(items, asyncCall, done) {
    var len = items.length;
    if (!len) return done();
    var i = 0, complete = 0;
    for (; i<len; ++i) {
      asyncCall(items[i], function(){
        if (++complete === len) done();
      });
    }
  };

  namespace.createAsyncCall = function(){
    var listeners = {};
    var cache = {};

    var releaseListeners = function(key, result) {
      listeners[key].forEach(function(v){
        v(result);
      });
      delete listeners[key];
    };

    return function(key, main, param, callback) {
      if (key in cache) {
        callback(cache[key]);
        return;
      }
      if (key in listeners) {
        listeners[key].push(callback);
        return;
      }
      var timeout = setTimeout(function(){
        console.error('asyncCall timeout: ' + key);
        releaseListeners(key);
      }, 20000);

      listeners[key] = [callback];

      main(key, param, function(result, multiple){
        clearTimeout(timeout);
        var cbRes;
        if (multiple) {
          for (var i in result) {
            cache[i] = result[i];
          }
          cbRes = result[key];
        } else {
          cache[key] = result;
          cbRes = result;
        }
        releaseListeners(key, cbRes);
      });
    }
  };

})(window.F.__);

