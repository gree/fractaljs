(function(namespace, global){
  var EnvDescs = {};

  var getType = (function(){
    var KNOWN_TYPES = {js:1, css:1, tmpl:1};
    return function(name) {
      var type = name.split('.').pop();
      return (type in KNOWN_TYPES) ? type : 'tmpl';
    };
  })();

  var Env = (function(){
    var resolveUrl = function(self, name) {
      var type = getType(name);
      var url = (function(type){
        if (name.indexOf("http") === 0 || name.indexOf("//") === 0) return name;
        return self.SourceRoot + ((name.indexOf("/") === 0) ? name.slice(1) : name);
      })(type);
      return { id: name, type: type, url: url };
    };

    var protocol = global.location.protocol == 'file:' ? 'http:' : global.location.protocol;
    var defaultConfig = {
      DomParser: protocol + '//cdnjs.cloudflare.com/ajax/libs/jquery/2.1.1/jquery.min.js',
      Template: {
        Engine: protocol + '//cdnjs.cloudflare.com/ajax/libs/hogan.js/3.0.0/hogan.js',
        Compile: function(text) { return Hogan.compile(text) },
        Render: function(template, data, options) { return template.render(data, options); },
      },
      Prefix: {
        Component: 'components/',
        Template: 'templates/',
      },
      Envs: {},
      Requires: [],
    };

    var Env = function(name, descUrl, config){
      this.__name = name;
      this.descUrl = descUrl;
      config = config || {};

      this.SourceRoot = config.SourceRoot || (function(url){
        return url.split('/').slice(0, -1).join('/') + '/';
      })(descUrl || global.location.pathname);

      this.components = {};
      for (var i in defaultConfig) {
        this[i] = config[i] || defaultConfig[i];
      }
      var self = this;
      ['Template', 'Prefix'].forEach(function(v){
        for (var i in defaultConfig[v]) {
          self[v][i] = self[v][i] || defaultConfig[v][i];
        }
      });
    };
    var proto = Env.prototype;
    proto.getDisplayName = function() { return this.__name || '[defaultEnv]'; };
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
        namespace.require(resolveUrl(self, names), callback);
      } else {
        namespace.require(names.map(function(v){ return resolveUrl(self, v); }), callback);
      }
    };

    proto.getTemplate = (function(){
      var __get = function(self, name, callback){
        var tmplName = self.__name ? (self.__name + ':' + name) : name;
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
      if (name.indexOf(':') >= 0) {
        var parts = name.split(':');
        var envName = parts[0];
        var componentName = parts[1];
        getOrCreateEnv(envName, function(env){
          console.debug("getComponentClass from other env", envName, componentName);
          env.getComponentClass(componentName, callback);
        });
      } else {
        if (name in self.components) {
          console.debug("getComponentClass return from cache", self.getDisplayName(), name);
          callback(self.components[name], name, self);
        } else {
          var url = resolveUrl(self, self.Prefix.Component + name + '.js');
          namespace.ObjectLoader.component.load(url, function(components){
            var asyncCalls = [];
            for (var i in components) {
              var componentClass = components[i];
              if (componentClass.prototype && componentClass.prototype.constructor.name === 'Class') {
                console.info('load ' + name + ' into ' + self.getDisplayName());
                self.components[i] = componentClass;
              } else {
                // this componentClass will be generated from a function
                asyncCalls.push({name: i, createClass: componentClass});
              }
            }
            namespace.forEachAsync(
              asyncCalls,
              function(v, cb){
                v.createClass(self, function(componentClass){
                  console.info('load ' + v.name + ' into ' + self.getDisplayName());
                  self.components[v.name] = componentClass;
                  cb();
                });
              },
              function(){
                if (!(name in components)) {
                  throw new Error('component ' + name + ' is not found in ' + url.url);
                }
                callback(self.components[name], name, self);
              }
            );
          }); // ObjectLoader.component.load
        }
      }
    };

    return Env;
  })();

  getOrCreateEnv = (function(){
    var envs = {};
    return function(envName, callback) {
      if (!envName) return callback(namespace.defaultEnv);
      if (envName in envs) return callback(envs[envName]);
      if (!(envName in EnvDescs)) throw new Error('unknown env name: ' + envName);

      var onEnvLoaded = function(env) {
        console.info('create env: ' + env.getDisplayName() + ' root: ' + env.SourceRoot);
        envs[envName] = env;
        callback(env);
      };

      var descUrl = EnvDescs[envName];
      var ext = descUrl.split('.').pop();
      if (ext !== 'js') {
        if (descUrl[descUrl.length - 1] !== '/') descUrl += '/';
        var env = new Env(envName, descUrl);
          env.init(onEnvLoaded);
      } else {
        namespace.ObjectLoader.config.load({ type: 'js', url: descUrl }, function(config){
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

})(window.F._private, window);

