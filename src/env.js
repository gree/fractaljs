F.Env = (function(){
  // import
  var namespace = F.__; // dev
  var isClass = namespace.isClass, // dev
  ClassType = namespace.ClassType, // dev
  createAsyncCall = namespace.createAsyncCall, // dev
  require = namespace.require, // dev
  defineClass = namespace.defineClass, // dev
  ObjectLoader = namespace.ObjectLoader; // dev

  var descriptors = {};

  var protocol = (function(protocol){
    return (protocol === "file:") ? "http:" : protocol;
  })(window.location.protocol);

  var resolveEnv = (function(){
    var cache = {}, asyncCall = createAsyncCall();

    var createEnv = function(constructor, name, url, callback) {
      var env = new constructor(name, url);
      env.setup(function(){
        cache[name] = env;
        callback(env);
      });
    };

    var main = function(envName, param, callback) {
      if (!(envName in descriptors)) throw new Error("unknown env name: " + envName);
      var url = descriptors[envName];
      var ext = url.split(".").pop();
      if (ext !== "js") {
        if (url[url.length - 1] !== "/") url += "/";
        createEnv(F.Env, envName, url, callback);
      } else {
        ObjectLoader.requireEnv(url, function(constructors){
          var constructor = constructors[envName];
          createEnv(constructor, envName, url, callback);
        });
      }
    };

    return function(envName, callback) {
      if (envName in cache) {
        return callback(cache[envName]);
      }
      asyncCall(envName, main, null, callback);
    };
  })();

  return defineClass(ClassType.ENV).extend({
    PrefixComponent: "/",
    PrefixTemplate: "/",
    Envs: {},
    Requires: [],

    DomParser: protocol +
      "//cdnjs.cloudflare.com/ajax/libs/jquery/2.1.1/jquery.min.js",
    TemplateEngine: protocol +
      "//cdnjs.cloudflare.com/ajax/libs/hogan.js/3.0.0/hogan.js",
    compile: function(text) { return Hogan.compile(text) },
    render: function(template, data, options) { return template.render(data, options); },

    init: function(name, url) {
      var self = this;
      self.ready = false;
      self.name = name;
      self.SourceRoot = self.SourceRoot || (function(url){
        return url.split("/").slice(0, -1).join("/") + "/";
      })(url || window.location.pathname);

      for (var i in self.Envs) {
        descriptors[i] = self.resolveUrl(self.Envs[i]);
      }
      self.asyncCall = createAsyncCall();
      self.components = {};
    },

    resolveUrl: function(name) {
      if (name.indexOf("http") === 0 || name.indexOf("//") === 0) return name;
      return this.SourceRoot + ((name.indexOf("/") === 0) ? name.slice(1) : name);
    },
    setup: function(callback) {
      var self = this;
      if (self.ready) return callback();
      self.require([self.DomParser, self.TemplateEngine], function(){
        $.event.special.destroyed = {
          remove: function(o) {
            if (o.handler) o.handler();
          }
        };
        self.require(self.Requires, function(){
          self.ready = true;
          callback();
        });
      });
    },
    require: function(names, callback){
      var self = this;
      if (!Array.isArray(names)) {
        require(self.resolveUrl(names), callback);
      } else {
        require(names.map(function(v){ return self.resolveUrl(v); }), callback);
      }
    },
    getTemplate: (function(){
      var main = function(name, param, callback) {
        var self = this;
        self.require(name, function(data){
          callback(self.compile(data));
        });
      };
      return function(name, callback) {
        var self = this;
        self.asyncCall(
          self.PrefixTemplate + name + ".tmpl",
          main.bind(self), null, callback
        );
      };
    })(),
    requireComponent: (function(){
      var main = function(name, param, callback) {
        var self = this;
        var url = self.resolveUrl(self.PrefixComponent + name + ".js");
        ObjectLoader.requireComponent(self.name, url, function(components){
          for (var i in components) {
            self.components[i] = components[i];
          }
          callback(components[name]);
        });
      };

      return function(fullName, callback) {
        var self = this;
        var componentName;

        if (fullName.indexOf(":") >= 0) {
          var parts = fullName.split(":");
          componentName = parts[1];
          if (parts[0] !== self.name) {
            resolveEnv(parts[0], function(env){
              env.requireComponent(componentName, callback);
            });
            return;
          }
        } else {
          componentName = fullName;
        }

        var components = self.components;
        if (componentName in components) {
          return callback(components[componentName], componentName, self);
        }
        self.asyncCall(componentName, main.bind(self), null, function(constructor){
          callback(constructor, componentName, self);
        });
      };
    })(),
  });

})();

