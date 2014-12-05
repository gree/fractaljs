F.Env = (function(){
  // import
  var namespace = F.__; // dev
  var isClass = namespace.isClass, // dev
  ClassType = namespace.ClassType, // dev
  createAsyncOnce = namespace.createAsyncOnce, // dev
  require = namespace.require, // dev
  createClass = namespace.createClass, // dev
  forEachAsync = namespace.forEachAsync, //dev
  ObjectLoader = namespace.ObjectLoader; // dev

  var descriptors = {};

  var protocol = (function(protocol){
    return (protocol === "file:") ? "http:" : protocol;
  })(window.location.protocol);

  var resolveEnv = (function(){
    var cache = {}, asyncOnce = createAsyncOnce();

    var createEnv = function(constructor, name, url, callback) {
      var env = new constructor(name, url);
      env.setup(function(){
        cache[name] = env;
        callback(env);
      });
    };

    var main = function(envName, callback) {
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
      asyncOnce(envName, function(cb){
        main(envName, function(data){
          cb(function(cb){ cb(data); });
        });
      }, callback);
    };
  })();

  return createClass(ClassType.ENV).extend({
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
      self.asyncOnce = createAsyncOnce();

      // cache
      self.components = {};
      self.templates = {};
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
        var ret = {};
        forEachAsync(
          names,
          function(name, cb){
            require(self.resolveUrl(name), function(data){
              ret[name] = data;
              cb();
            });
          },
          function(){
            callback(ret);
          }
        );
      }
    },
    getTemplate: (function(){
      var tmplExt = "tmpl";

      var main = function(self, name, callback) {
        self.require(name, function(data){
          callback(self.compile(data));
        });
      };

      return function(name, callback) {
        var self = this;
        if (name in self.templates) {
          return callback(self.templates[name]);
        }
        var ext = name.split(".").pop();
        if (ext !== tmplExt) {
          // TODO have to find globally ?
          var $tmpl = $("template#template_" + name);
          if ($tmpl.length > 0) {
            var template = self.templates[name] = self.compile($tmpl.html());
            return callback(template);
          }
        }
        var tmplPath = self.PrefixTemplate + name;
        if (ext !== tmplExt) tmplPath += "." + tmplExt;
        self.asyncOnce(tmplPath, function(cb){
          main(self, tmplPath, function(data){
            self.templates[name] = data;
            cb(function(cb){ cb(data); });
          });
        }, callback);
      };
    })(),
    requireComponent: (function(){
      var main = function(env, envName, compoName, callback) {
        if (envName !== env.name) {
          resolveEnv(envName, function(env){
            main(env, envName, compoName, callback);
          });
        } else {
          var cache = env.components;
          if (compoName in cache) {
            return callback(cache[compoName], compoName, env);
          }

          var url = env.resolveUrl(env.PrefixComponent + compoName + ".js");
          ObjectLoader.requireComponent(envName, url, function(components){
            for (var i in components) {
              cache[i] = components[i];
            }
            callback(cache[compoName], compoName, env);
          });
        }
      };

      return function(fullName, callback) {
        var self = this, envName, compoName;
        if (fullName.indexOf(":") >= 0) {
          var parts = fullName.split(":");
          envName = parts[0];
          compoName = parts[1];
        } else {
          envName = self.name;
          compoName = fullName;
          fullName = envName + ":" + compoName;
        }

        self.asyncOnce(fullName, function(cb){
          main(self, envName, compoName, function(constructor, name, env){
            if (isClass(constructor, ClassType.COMPONENT)) {
              cb(function(cb){ cb(constructor, name, env); });
            } else {
              constructor(env, function(constructor){
                cb(function(cb){ cb(constructor, name, env); });
              });
            }
          });
        }, callback);
      };
    })(),
  });

})();

