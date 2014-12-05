(function(namespace){ // dev

  var setImmediate = (function() {
    var timeouts = [];
    var messageName = "F.setImmediate";

    function handleMessage(event) {
      if (event.source == window && event.data == messageName) {
        event.stopPropagation();
        if (timeouts.length > 0) {
          var fn = timeouts.shift();
          fn();
        }
      }
    }
    window.addEventListener("message", handleMessage, true);

    return function(fn) {
      timeouts.push(fn);
      window.postMessage(messageName, "*");
    };
  })();


  var forEachAsync = function(items, fn, done) {
    var count, left;
    count = left = items.length;
    if (!count) {
      done();
    } else {
      while (count) {
        fn(items[--count], function(){
          if (!--left) done();
        });
      }
    }
  };

  var createAsyncOnce = function(){
    var listeners = {};
    return function(key, fn, callback) {
      if (key in listeners) {
        listeners[key].push(callback);
      } else {
        listeners[key] = [callback];
        fn(function(f){
          var q = listeners[key], count = q.length;
          delete listeners[key];
          while(count) f(q[--count]);
        });
      }
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
  namespace.setImmediate = setImmediate; // dev

})(F.__); // dev

