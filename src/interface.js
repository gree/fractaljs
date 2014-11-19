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
        namespace.ObjectLoader.component.define(name, component);
      };
    } else if (typeof(arg1) === 'object') {
      // env config
      var config = arg1;
      callback = function(){
        namespace.ObjectLoader.config.define(config);
      }
    }

    if (!callback) return;
    if (ready) return callback();
    readyListeners.push(callback);
  };

  F._private = namespace;
  F.construct = function(config, callback){
    if (typeof(config) === "function") {
      callback = config;
      config = {};
    }
    namespace.createDefaultEnv(config, function(env){
      if (readyListeners && readyListeners.length) {
        readyListeners.forEach(function(v){ v(); });
        readyListeners = [];
      }

      //setup public interface
      F.Component = F._private.Component;
      F.TOPIC = F._private.TOPIC;

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

