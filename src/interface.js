(function(global){ // dev

  var namespace = {}; // dev
  var ready = false, listeners = [];

  var F = global.F = function(arg1, arg2){
    var ObjectLoader = namespace.ObjectLoader; // dev
    var isClass = namespace.isClass; // dev

    var callback = null;
    if (typeof(arg1) === "function") {
      // 'onready' event handler
      callback = arg1;
    } else if (typeof(arg1) === "string" && arg2) {
      // define an object
      var name = arg1, object = arg2;
      callback = function(){
        ObjectLoader.define(name, object);
      };
    } else {
      return;
    }
    if (ready) {
      callback();
    } else {
      listeners.push(callback);
    }
  };

  F.__ = namespace; // dev

  F.construct = function(env, callback){
    console.time("F.construct");
    if (typeof(env) === "function") {
      callback = env;
      env = null;
    }
    if (!env) env = new F.Env("");
    env.setup(function(){
      ready = true;
      var i = 0, len = listeners.length;
      for (; i < len; ++i) {
        listeners[i]();
      }
      listeners = [];

      var c = new F.Component("", $(global.document), env);
      c.loadChildren(function(){
        console.timeEnd("F.construct");
        if (callback) {
          callback();
        }
      });
    });
  };

})(window); // dev

