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

  namespace.defineClass = function(type){
    /* Simple JavaScript Inheritance
     * By John Resig http://ejohn.org/
     * MIT Licensed.
     */
    // Inspired by base2 and Prototype
    var initializing = false, fnTest = /xyz/.test(function(){xyz;}) ? /\b_super\b/ : /.*/;
    var Class = function(){};
    Class.extend = function(prop) {
      var _super = this.prototype;

      initializing = true;
      var prototype = new this();
      initializing = false;

      for (var name in prop) {
        prototype[name] = typeof prop[name] == "function" &&
          typeof _super[name] == "function" && fnTest.test(prop[name]) ?
          (function(name, fn){
            return function() {
              var tmp = this._super;
              this._super = _super[name];

              var ret = fn.apply(this, arguments);
              this._super = tmp;

              return ret;
            };
          })(name, prop[name]) :
        prop[name];
      }

      var Class = function(){
        if ( !initializing && this.init )
          this.init.apply(this, arguments);
      }

      Class.prototype = prototype;
      Class.prototype.constructor = Class;

      Class.extend = arguments.callee;
      Class.getType = function() { return type; };
      return Class;
    };

    return Class;
  };

  namespace.isClass = function(object, type) {
    if (!object.getType) return false;
    if (!type) return true
    return object.getType() === type;
  };

  namespace.ClassType = {
    COMPONENT: 1,
    ENVCONFIG: 2
  };

})(window.F.__);

