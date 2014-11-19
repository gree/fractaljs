(function(global){
  var F = global.Fractal = global.F = function(arg1, arg2){
    var callback = null;

    if (typeof(arg1) === 'function') {
      // 'onready' event handler
      callback = arg1;
    } else if (typeof(arg1) === 'string' && typeof(arg2) === 'function') {
      // define a component
      var name = arg1, component = arg2;
      callback = function(){
        ObjectLoader.component.define(name, component);
      };
    } else if (typeof(arg1) === 'object') {
      // env config
      var config = arg1;
      callback = function(){
        ObjectLoader.config.define(config);
      }
    }

    if (!callback) return;
    if (ready) return callback();
    readyListeners.push(callback);
  };

  var namespace = F._private = {};

  F.construct = function(config, callback){
    if (typeof(config) === "function") {
      callback = config;
      config = {};
    }
    (function(config, cb){
      if (!namespace.defaultEnv) {
        var env = new Env("", "", config);
        env.init(function(){
          namespace.defaultEnv = env;
          cb(env);
        });
      } else {
        cb(namespace.defaultEnv);
      }
    })(config, function(env){
      if (readyListeners && readyListeners.length) {
        readyListeners.forEach(function(v){ v(); });
        readyListeners = [];
      }
      ready =  true;

      var c = new F.Component("__ROOT__", $(global.document), env);
      c.loadChildren(callback);
    });
  };
})(window);

(function(namespace){
  namespace.TOPIC = {
    COMPONENT_LOADED_MYSELF: "component.loaded.myself",
    COMPONENT_LOADED_CHILDREN: "component.loaded.children",
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
})(window.F._private);

