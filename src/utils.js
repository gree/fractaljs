(function(namespace){ // dev

  var forEachAsync = function(items, asyncCall, done) {
    var len = items.length;
    if (!len) return done();
    var i = 0, complete = 0;
    for (; i<len; ++i) {
      asyncCall(items[i], function(){
        if (++complete === len) done();
      });
    }
  };

  var createAsyncOnce = function(){
    var listeners = {};

    var releaseListeners = function(key, result) {
      //console.debug("asyncCall", key, "releaselisteners", listeners[key].length);
      var q = listeners[key];
      delete listeners[key];
      q.forEach(function(v){
        v(result);
      });
    };

    return function(key, main, param, callback) {
      if (key in listeners) {
        listeners[key].push(callback);
        return;
      }
      var timeout = setTimeout(function(){
        console.error('asyncCall timeout: ' + key);
        releaseListeners(key);
      }, 20000);

      listeners[key] = [callback];

      main(key, param, function(result){
        clearTimeout(timeout);
        releaseListeners(key, result);
      });
    }
  };

  var createClass = function(type){
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

  var isClass = function(object, type) {
    if (!object.getType) return false;
    if (!type) return true
    return object.getType() === type;
  };

  var ClassType = {
    COMPONENT: 1,
    ENV: 2
  };

  namespace.forEachAsync = forEachAsync; // dev
  namespace.createAsyncOnce = createAsyncOnce; // dev
  namespace.createClass = createClass; // dev
  namespace.isClass = isClass; // dev
  namespace.ClassType = ClassType; // dev

})(F.__); // dev

