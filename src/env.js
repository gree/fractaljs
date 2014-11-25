(function(namespace, global){
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
        Component: "components/",
        Template: "templates/",
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
        EnvDescs[i] = self.Envs[i];
      }
      self.require([self.DomParser, self.Template.Engine], function(){
        $.event.special.destroyed = {
          remove: function(o) {
            if (o.handler) o.handler();
          }
        };
        self.require(self.Requires, function(){
          callback(self);
        });
      });
    };

    proto.require = function(names, callback){
      var self = this;
      if (!Array.isArray(names)) {
        namespace.require(self.resolveUrl(names), callback);
      } else {
        namespace.require(names.map(function(v){ return self.resolveUrl(v); }), callback);
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

    proto.getComponentClass = function(name, callback){
      var self = this;
      if (name.indexOf(":") >= 0) {
        var parts = name.split(":");
        var envName = parts[0];
        var componentName = parts[1];
        getOrCreateEnv(self, envName, function(env){
          console.debug("getComponentClass from other env " + envName + ":" + componentName);
          env.getComponentClass(componentName, callback);
        });
      } else {
        if (name in self.components) {
          console.debug("getComponentClass return from cache " + self.getName() + ":" + name);
          callback(self.components[name], name, self);
        } else {
          var url = self.resolveUrl(self.Prefix.Component + name + ".js");
          namespace.requireComponents(self.getName(), url, function(components){
            var asyncCalls = [];
            for (var i in components) {
              var constructor = components[i];
              if (constructor.isComponent) {
                if (!(i in self.components)) {
                  console.log("load " + self.getName() + ":" + i + " from " + url);
                  self.components[i] = constructor;
                }
              } else {
                // this componentClass will be generated from a function
                asyncCalls.push({name: i, createClass: constructor});
              }
            }
            namespace.forEachAsync(
              asyncCalls,
              function(v, cb){
                v.createClass(self, function(componentClass){
                  console.log("load " + self.getName() + ":" + v.name + " from " + url);
                  self.components[v.name] = componentClass;
                  cb();
                });
              },
              function(){
                if (!(name in components)) {
                  throw new Error("component " + name + " is not found in " + url);
                }
                callback(self.components[name], name, self);
              }
            );
          }); // requireComponents
        }
      }
    };

    return Env;
  })();

  var getOrCreateEnv = (function(){
    var envs = {};
    return function(env, envName, callback) {
      if (!envName) return callback(namespace.defaultEnv);
      if (envName in envs) return callback(envs[envName]);
      if (!(envName in EnvDescs)) throw new Error("unknown env name: " + envName);

      var onEnvLoaded = function(env) {
        console.log("createEnv " + env.getName() + " root: " + env.SourceRoot);
        envs[envName] = env;
        callback(env);
      };

      var descUrl = env.resolveUrl(EnvDescs[envName]);
      var ext = descUrl.split(".").pop();
      if (ext !== "js") {
        if (descUrl[descUrl.length - 1] !== "/") descUrl += "/";
        var env = new Env(envName, descUrl);
          env.init(onEnvLoaded);
      } else {
        namespace.requireConfig(descUrl, function(config){
          var env = new Env(envName, descUrl, config);
          env.init(onEnvLoaded);
        });
      }
    };
  })();

  namespace.createDefaultEnv = function(config, cb){
    if (namespace.defaultEnv) return cb(namespace.defaultEnv);
    var env = new Env("", "", config);
    env.init(function(){
      namespace.defaultEnv = env;
      cb(env);
    });
  };

})(window.F.__, window);

