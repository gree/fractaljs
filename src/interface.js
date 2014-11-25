(function(global){
  var ready = false;
  var readyListeners = [];
  var namespace = {};

  var F = global.Fractal = global.F = function(arg1, arg2){
    var callback = null;

    if (typeof(arg1) === 'function') {
      // 'onready' event handler
      callback = arg1;
    } else if (typeof(arg1) === 'string' && typeof(arg2) === 'function') {
      // define a component
      var name = arg1, component = arg2;
      callback = function(){
        namespace.define(name, component);
      };
    } else if (typeof(arg1) === 'object') {
      // env config
      var config = arg1;
      callback = function(){
        namespace.define("", config);
      }
    }

    if (!callback) return;
    if (ready) return callback();
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
        readyListeners.forEach(function(v){ v(); });
        readyListeners = [];
      }
      ready = true;
      var c = new F.Component("__ROOT__", $(global.document), env);
      c.loadChildren(function(){
        console.timeEnd("F.construct");
        if (callback) callback();
      });
    });
  };

  namespace.forEachAsync = function(items, onEach, onDone) {
    var len = items.length;
    if (!len) return onDone();
    var i = 0, complete = 0;
    for (; i<len; ++i) {
      onEach(items[i], function(){
        if (++complete === len) onDone();
      });
    }
  };
})(window);

