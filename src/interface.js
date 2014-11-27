(function(global){
  var ready = false;
  var readyListeners = [];
  var namespace = {};

  var F = global.Fractal = global.F = function(arg1, arg2){
    var callback = null;

    if (typeof(arg1) === 'function') {
      // 'onready' event handler
      callback = arg1;
    } else if (typeof(arg1) === 'string' && arg2) {
      // define an object
      var name = arg1, object = arg2;
      callback = function(){
        namespace.define(name, object);
      };
    }

    if (!callback) {
      return;
    }
    if (ready) {
      return callback();
    }
    readyListeners.push(callback);
  };

  F.__ = namespace;

  F.init = function(callback) {
    if (readyListeners && readyListeners.length) {
      readyListeners.forEach(function(v){
        v(F.__);
      });
      readyListeners = [];
    }
    ready = true;

    F.Component = F.__.Component;
    F.Env = F.__.Env;

    callback();
  };

  F.construct = function(env, callback){
    console.time("F.construct");
    if (typeof(env) === "function") {
      callback = env;
      env = null;
    }
    if (!env) env = new namespace.Env();
    env.setup(function(){
      var c = new F.Component("", $(global.document), env);
      c.loadChildren(function(){
        console.timeEnd("F.construct");
        if (callback) {
          callback();
        }
      });
    });
  };

})(window);

