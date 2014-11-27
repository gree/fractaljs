(function(namespace, global){
  var createAsyncCall = namespace.createAsyncCall;
  var require = namespace.require;

  var EnvDescs = {};

  var Env = (function(){
    var protocol = global.location.protocol == "file:" ? "http:" : global.location.protocol;
    var defaultConfig = {
      DomParser: protocol + "//cdnjs.cloudflare.com/ajax/libs/jquery/2.1.1/jquery.min.js",
      Template: {
        Engine: protocol + "//cdnjs.cloudflare.com/ajax/libs/hogan.js/3.0.0/hogan.js",
        Compile: function(text) { return Hogan.compile(text) },
        Render: function(template, data, options) { return template.render(data, options); },
      },
      Prefix: {
        Component: "/",
        Template: "/",
      },
      Envs: {},
      Requires: [],
    };

    var Env = function(name, descUrl, config){
      this.__name = name;
      this.descUrl = descUrl;
      config = config || {};

      this.SourceRoot = config.SourceRoot || (function(url){
        return url.split("/").slice(0, -1).join("/") + "/";
      })(descUrl || global.location.pathname);

      this.components = {};
      for (var i in defaultConfig) {
        this[i] = config[i] || defaultConfig[i];
      }
      var self = this;
      ["Template", "Prefix"].forEach(function(v){
        for (var i in defaultConfig[v]) {
          self[v][i] = self[v][i] || defaultConfig[v][i];
        }
      });
      self.asyncCall = createAsyncCall();
    };

    var proto = Env.prototype;
    proto.resolveUrl = function(name) {
      if (name.indexOf("http") === 0 || name.indexOf("//") === 0) return name;
      return this.SourceRoot + ((name.indexOf("/") === 0) ? name.slice(1) : name);
    };
    proto.getName = function() { return this.__name; };
    proto.init = function(callback) {
      var self = this;
      for (var i in self.Envs) {
        EnvDescs[i] = self.resolveUrl(self.Envs[i]);
      }
      self.require([self.DomParser, self.Template.Engine], function(){
        $.event.special.destroyed = {
          remove: function(o) {
            if (o.handler) o.handler();
          }
        };
        self.require(self.Requires, function(){
          callback();
        });
      });
    };

    proto.require = function(names, callback){
      var self = this;
      if (!Array.isArray(names)) {
        require(self.resolveUrl(names), callback);
      } else {
        require(names.map(function(v){ return self.resolveUrl(v); }), callback);
      }
    };

    proto.getTemplate = (function(){
      var __get = function(self, name, callback){
        var tmplName = self.__name ? (self.__name + ":" + name) : name;
        var $tmpl = $('script[type="text/template"][data-name="' + tmplName + '"]');
        if ($tmpl.length > 0) {
          callback(self.Template.Compile($tmpl.html()));
        } else {
          self.require(self.Prefix.Template + name + ".tmpl", function(data){
            callback(self.Template.Compile(data));
          });
        }
      };
      return function(names, callback){
        var self = this;
        if (typeof(names) === "string") return __get(self, names, callback);
        var results = {};
        namespace.forEachAsync(names, function(v, cb){
          __get(self, v, function(data){
            results[v] = data;
            cb();
          });
        }, function(){ callback(results); });
      };
    })();

    proto.getComponentClass = (function(){
      var main = function(name, env, callback) {
        var url = env.resolveUrl(env.Prefix.Component + name + ".js");
        namespace.requireComponents(env.getName(), url, function(components){
          callback(components, true);
        });
      };

      return function(fullName, callback) {
        var self = this;
        var envName, componentName;
        if (fullName.indexOf(":") >= 0) {
          var parts = fullName.split(":");
          envName = parts[0] || self.getName();
          componentName = parts[1];
        } else {
          envName = self.getName();
          componentName = fullName;
        }
        if (envName !== self.getName()) {
          resolveEnv(envName, function(env){
            env.getComponentClass(componentName, callback);
          });
        } else {
          self.asyncCall(componentName, main, self, function(constructor){
            callback(constructor, componentName, self);
          });
        }
      };
    })();

    return Env;
  })();

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
        createEnv(envName, url, null, callback);
      } else {
        namespace.requireConfig(url, function(configs){
          var config = configs[envName];
          createEnv(envName, url, config, callback);
        });
      }
    };

    return function(envName, callback) {
      if (!envName) return callback(defaultEnv);
      if (!(envName in EnvDescs)) throw new Error("unknown env name: " + envName);
      var url = EnvDescs[envName];
      asyncCall(url, main, envName, callback);
    }
  })();

  var defaultEnv = null;
  namespace.createDefaultEnv = function(config, cb){
    if (defaultEnv) return cb(defaultEnv);
    var env = new Env("", "", config);
    env.init(function(){
      defaultEnv = env;
      cb(env);
    });
  };

})(window.F.__, window);

