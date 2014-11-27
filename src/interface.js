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
  F.construct = function(config, callback){
    console.time("F.construct");
    if (typeof(config) === "function") {
      callback = config;
      config = {};
    }
    namespace.createDefaultEnv(config, function(env){
      console.debug("defaultEnv", env);

      F.Component = F.__.Component;

      if (readyListeners && readyListeners.length) {
        readyListeners.forEach(function(v){
          v();
        });
        readyListeners = [];
      }
      ready = true;
      var c = new F.Component("__ROOT__", $(global.document), env);
      c.loadChildren(function(){
        console.timeEnd("F.construct");
        if (callback) {
          callback();
        }
      });
    });
  };

})(window);

