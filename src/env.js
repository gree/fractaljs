F(function(namespace){
  // import
  var isClass = namespace.isClass;
  var ENV = namespace.ClassType.ENV;
  var createAsyncCall = namespace.createAsyncCall;
  var require = namespace.require;

  var EnvDescs = {};

  var protocol = (function(protocol){
    return (protocol === "file:") ? "http:" : protocol;
  })(window.location.protocol);

  namespace.Env = namespace.defineClass(ENV).extend({
    PrefixComponent: "/",
    PrefixTemplate: "/",
    Envs: {},
    Requires: [],

    DomParser: protocol + "//cdnjs.cloudflare.com/ajax/libs/jquery/2.1.1/jquery.min.js",
    TemplateEngine: protocol + "//cdnjs.cloudflare.com/ajax/libs/hogan.js/3.0.0/hogan.js",
    compile: function(text) { return Hogan.compile(text) },
    render: function(template, data, options) { return template.render(data, options); },

    init: function(name, url) {
      var self = this;
      self.__name = name;
      self.SourceRoot = self.SourceRoot || (function(url){
        return url.split("/").slice(0, -1).join("/") + "/";
      })(url || window.location.pathname);

      for (var i in self.Envs) {
        EnvDescs[i] = self.resolveUrl(self.Envs[i]);
      }
      self.asyncCall = createAsyncCall();
    },

    resolveUrl: function(name) {
      if (name.indexOf("http") === 0 || name.indexOf("//") === 0) return name;
      return this.SourceRoot + ((name.indexOf("/") === 0) ? name.slice(1) : name);
    },
    getName: function(){ return this.__name },
    setup: function(callback) {
      var self = this;
      self.require([self.DomParser, self.TemplateEngine], function(){
        $.event.special.destroyed = {
          remove: function(o) {
            if (o.handler) o.handler();
          }
        };
        self.require(self.Requires, function(){
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
        self.asyncCall(self.PrefixTemplate + name + ".tmpl", main.bind(self), null, callback);
      };
    })(),
    getComponentClass: (function(){
      var main = function(name, param, callback) {
        var self = this;
        var url = self.resolveUrl(self.PrefixComponent + name + ".js");
        namespace.requireComponent(self.__name, url, function(components){
          callback(components, true);
        });
      };

      return function(fullName, callback) {
        var self = this;
        var envName, componentName;
        if (fullName.indexOf(":") >= 0) {
          var parts = fullName.split(":");
          envName = parts[0] || self.__name;
          componentName = parts[1];
        } else {
          envName = self.__name;
          componentName = fullName;
        }
        if (envName !== self.__name) {
          resolveEnv(envName, function(env){
            env.getComponentClass(componentName, callback);
          });
        } else {
          self.asyncCall(componentName, main.bind(self), null, function(constructor){
            callback(constructor, componentName, self);
          });
        }
      };
    })(),
  });

  var resolveEnv = (function(){
    var asyncCall = createAsyncCall();

    var createEnv = function(name, url, config, callback) {
      var env = new Env(name, url, config);
      env.init(function(){
        callback(env);
      });
    };

    var main = function(url, envName, callback) {
      var ext = url.split(".").pop();
      if (ext !== "js") {
        if (url[url.length - 1] !== "/") url += "/";
        var env = new namespace.Env(envName, url);
        env.setup(function(){
          callback(env);
        });
      } else {
        namespace.requireEnv(url, function(constructors){
          var constructor = constructors[envName];
          var env = new constructor(envName, url);
          env.setup(function(){
            callback(env);
          });
        });
      }
    };

    return function(envName, callback) {
      if (!envName) return callback(defaultEnv);
      if (!(envName in EnvDescs)) throw new Error("unknown env name: " + envName);
      var url = EnvDescs[envName];
      asyncCall(url, main, envName, callback);
    };
  })();
});

