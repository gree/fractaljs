// Source: src/interface.js
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

  F.__ = namespace;
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
      F.Component = F.__.Component;
      ready = true;
      var c = new F.Component("__ROOT__", $(global.document), env);
      c.loadChildren(callback);
    });
  };

  F.TOPIC = {
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
})(window);


// Source: src/require.js
(function(namespace){
  namespace.ObjectLoader = (function(){
    var data = null;
    var queue = [];

    var lock = {
      get: function(){
        if (!data) {
          data = {};
          return true;
        }
        return false;
      },
      release: function(){ data = null; }
    };

    var lockedCall = function(func) {
      if (!lock.get()) {
        queue.push(func);
        return false;
      } else {
        func(function(){
          lock.release();
          if (queue.length) {
            lockedCall(queue.shift());
          }
        });
        return true;
      }
    };

    return {
      component: {
        define: function(name, constructor) {
          data.components[name] = constructor;
        },
        load: function(url, callback) {
          var res = lockedCall(function(lockedCallback){
            data.components = {};
            namespace.require(url, function(){
              var components = data.components;
              lockedCallback();
              callback(components);
            });
          });
        },
      },
      config: {
        define: function(config) {
          data.config = config;
        },
        load: function(url, callback) {
          lockedCall(function(lockedCallback){
            namespace.require(url, function(){
              var config = data.config;
              lockedCallback();
              callback(config);
            });
          });
        },
      },
    };
  })();

  namespace.require = (function(){
    var byAddingElement = function(element, callback) {
      var done = false;
      element.onload = element.onreadystatechange = function(){
        if ( !done && (!this.readyState ||
                       this.readyState == "loaded" || this.readyState == "complete") ) {
          done = true;
          callback(false, true);
          element.onload = element.onreadystatechange = null;
        }
      };
      var container = document.getElementsByTagName("head")[0];
      container.appendChild(element);
    };
    var byAjax = function(url, callback){
      var xhr = new XMLHttpRequest();
      xhr.open('GET', url, true);
      xhr.onreadystatechange = function(){
        if (xhr.readyState === 4) {
          var err, data;
          if ((xhr.status === 200 || xhr.status === 0) && xhr.responseText) {
            callback(false, xhr.responseText);
          } else {
            callback("unexpected server resposne: " + xhr.status);
          }
        }
      }
      xhr.send("");
    };
    var Type2Getter = {
      "js": function(url, callback) {
        var el = document.createElement("script");
        el.src = url;
        byAddingElement(el, callback);
      },
      "css": function(url, callback) {
        var el = document.createElement("link");
        el.rel="stylesheet";
        el.href = url;
        document.getElementsByTagName("head")[0].appendChild(el);
        callback(false, true);
      },
      "tmpl": byAjax
    };
    var singleRequire = (function(){
      var listeners = {};
      var cache = {};

      var releaseListeners = function(resource, data) {
        listeners[resource.url].forEach(function(v){
          v(data, resource.id);
        });
        delete listeners[resource.url];
      };

      return function(resource, callback) {
        if (resource.url in cache) {
          callback(cache[resource.url], resource.id);
          return;
        }
        if (resource.url in listeners) {
          listeners[resource.url].push(callback);
          return;
        }

        var timeout = setTimeout(function(){
          console.error('Require timeout: ' + resource.url);
          releaseListeners(resource);
        }, 10000);
        listeners[resource.url] = [callback];
        Type2Getter[resource.type](resource.url, function(err, data) {
          clearTimeout(timeout);
          if (err) {
            console.error('Require error: ' + err);
          } else {
            cache[resource.url] = data;
          }
          releaseListeners(resource, data);
        });
      };
    })();

    return function(resourceList, callback) {
      if (!Array.isArray(resourceList)) {
        return singleRequire(resourceList, callback);
      }
      var retData = {};
      namespace.forEachAsync(
        resourceList,
        function(v, cb){
          singleRequire(v, function(data, id){
            retData[id] = data;
            cb();
          });
        },
        function(){
          callback(retData);
        }
      );
    };
  })();
})(window.F.__);


// Source: src/pubsub.js
(function(namespace){
  // TODO replace with faster algorithm, data structure
  var MaxStocked = 100;
  var Stock = function(){
    this.arrived = {};
    this.buffer = {};
  };
  var proto = Stock.prototype;
  proto.count = function(){
    var count = 0;
    for (var i in this.buffer) ++count;
    return count;
  };
  proto.add = function(topic, data) {
    if (this.count() >= MaxStocked && !(topic in this.buffer)) {
      var oldest = new Data();
      var oldestTopic = "";
      for (var i in this.arrived) {
        if (this.arrived[i] < oldest) {
          oldest = this.arrived[i];
          oldestTopic = i;
        }
      }
      delete this.buffer[oldestTopic];
      delete this.arrived[oldestTopic];
    }
    this.buffer[topic] = data;
    this.arrived[topic] = new Date();
  };
  proto.get = function(topic) {
    if (topic in this.buffer) {
      var data = this.buffer[topic];
      delete this.buffer[topic];
      delete this.arrived[topic];
      return data;
    }
    return null;
  };

  var topics = {};
  var seq = 0;
  var stock = new Stock();
  namespace.Pubsub = (function() {
    return {
      publish: function(topic, data, from) {
        if (!topics[topic]) {
          stock.add(topic, {d: data, f: from});
          return;
        }
        var subscribers = topics[topic];
        for (var i in subscribers) subscribers[i].cb(topic, data, from);
      },
      subscribe: function(topic, callback) {
        if (!topics[topic]) topics[topic] = [];
        var token = ++seq;
        topics[topic].push({
          token: token,
          cb: callback
        });
        var data = stock.get(topic);
        if (data) {
          callback(topic, data.d, data.f);
        }
        return token;
      },
      unsubscribe: function(topic, token) {
        if (!(topic in topics)) return;
        var subscribers = topics[topic];
        for (var i in subscribers) {
          if (subscribers[i].token === token) {
            subscribers.splice(i, 1);
            break;
          }
        }
        if (subscribers.length === 0) delete topics[topic];
      },
    };
  }());
})(window.F.__);


// Source: src/env.js
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
          env.getComponentClass(componentName, callback);
        });
      } else {
        if (name in self.components) {
          callback(self.components[name], name, self);
        } else {
          var url = resolveUrl(self, self.Prefix.Component + name + '.js');
          namespace.ObjectLoader.component.load(url, function(components){
            var asyncCalls = [];
            for (var i in components) {
              var constructor = components[i];
              if (constructor.isComponent) {
                self.components[i] = constructor;
              } else {
                // this componentClass will be generated from a function
                asyncCalls.push({name: i, createClass: constructor});
              }
            }
            namespace.forEachAsync(
              asyncCalls,
              function(v, cb){
                v.createClass(self, function(componentClass){
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

  var getOrCreateEnv = (function(){
    var envs = {};
    return function(envName, callback) {
      if (!envName) return callback(namespace.defaultEnv);
      if (envName in envs) return callback(envs[envName]);
      if (!(envName in EnvDescs)) throw new Error('unknown env name: ' + envName);

      var onEnvLoaded = function(env) {
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

})(window.F.__, window);


// Source: src/component.js
(function(namespace){
  var Class = (function(){
    /* Simple JavaScript Inheritance
     * By John Resig http://ejohn.org/
     * MIT Licensed.
     */
    // Inspired by base2 and Prototype
    var initializing = false, fnTest = /xyz/.test(function(){xyz;}) ? /\b_super\b/ : /.*/;
    var Class = function(){};
    Class.extend = function(prop) {
      var _super = this.prototype;

      initializing = true;
      var prototype = new this();
      initializing = false;

      for (var name in prop) {
        prototype[name] = typeof prop[name] == "function" &&
          typeof _super[name] == "function" && fnTest.test(prop[name]) ?
          (function(name, fn){
            return function() {
              var tmp = this._super;
              this._super = _super[name];

              var ret = fn.apply(this, arguments);
              this._super = tmp;

              return ret;
            };
          })(name, prop[name]) :
        prop[name];
      }

      var Class = function(){
        if ( !initializing && this.init )
          this.init.apply(this, arguments);
      }

      Class.prototype = prototype;
      Class.prototype.constructor = Class;

      Class.extend = arguments.callee;
      Class.isComponent = true;
      return Class;
    };

    return Class;
  })();

  namespace.Component = (function(){
    var ComponentFilter = "[data-role=component]";
    var setLoad = function(self, next) {
      if (!next) return;
      if (!self.__load){
        self.__load = next;
        return;
      }
      var temp = self.__load;
      self.__load = function(callback, param) {
        temp.bind(self)(function(){
          next.bind(self)(callback, param);
        }, param);
      };
    };

    var Component = {};
    Component.init = function(name, $container, env){
      this.name = name;
      this.$container = $container;
      this.F = env;

      this.$ = this.$container.find.bind(this.$container);
      var resetDisplay = this.$container.data("display");
      if (resetDisplay) this.$container.css("display", resetDisplay);
      this.$container.on("destroyed", this.unload.bind(this));

      this.rendered = false;
      this.subscribeList = {};
      this.earlyRecieved = [];
      // // TODO implement if needed
      // self.children = [];
      // self.parent = null;
      this.templateName = this.templateName || this.name;
      if (typeof(this.template) === "string") this.template = this.F.Template.Compile(this.template);

      setLoad(this, this.getData);
      setLoad(this, this.getTemplate);
      setLoad(this, this.render);
      setLoad(this, this.afterRender);
      setLoad(this, this.myselfLoaded);
      if (!this.loadMyselfOnly)
        setLoad(this, this.loadChildren);
      setLoad(this, this.allLoaded);

      var subscribes = [];
      for (var i in this) {
        if (typeof(this[i]) === "function" && i.indexOf("on") === 0) {
          subscribes.push([i.substr(2), this[i]]);
        }
      }
      var publicMethods = this.Public || {};
      for (var i in publicMethods) {
        subscribes.push([this.F.getName() + ":" + this.name + "." + i, publicMethods[i]]);
      }

      var self = this;
      subscribes.forEach(function(v){
        (function(topic, method){
          self.subscribe(topic, function(topic, data, from){
            method.bind(self)(data, from);
          });
        })(v[0], v[1]);
      });
    };
    Component.call = function(name, data) {
      var topic = name;
      if (name.indexOf(":") < 0) {
        topic = this.F.getName() + ":" + topic;
      }
      this.publish(topic, data, this);
    };
    Component.__load = null;

    Component.load = function(param, callback){
      param = param || {};
      this.__load(function(){
        if (callback) callback();
      }, param);
    };
    Component.getData = null;
    Component.getTemplate = function(callback) {
      var self = this;
      if (self.template) return callback();
      self.F.getTemplate(self.templateName || self.name, function(template){
        self.template = template;
        callback();
      });
    };
    Component.render = function(callback, param){
      var contents = this.F.Template.Render(this.template, param.data, param.partials);
      this.$container.html(contents);
      callback();
    };
    Component.afterRender = null;
    Component.myselfLoaded = function(callback){
      this.rendered = true;
      while (this.earlyRecieved.length > 0) {
        this.earlyRecieved.pop()();
      }
      this.publish(namespace.TOPIC.COMPONENT_LOADED_MYSELF);
      callback();
    };
    Component.loadChildren = function(callback, param){
      var self = this;
      var components = self.$(ComponentFilter);
      var len = components.length;
      if (!len) {
        self.publish(namespace.TOPIC.COMPONENT_LOADED_CHILDREN);
        if (callback) callback();
        return;
      }
      namespace.forEachAsync(components, function(container, cb){
        var $container = $(container);
        var name = $container.data('name');
        self.F.getComponentClass(name, function(componentClass, name, env){
          var c = new componentClass(name, $container, env);
          c.load(param, cb);
        });
      }, function(){
        self.publish(namespace.TOPIC.COMPONENT_LOADED_CHILDREN);
        if (callback) callback();
      })
    },
    Component.allLoaded = null;
    Component.unload = function(){ this.unsubscribe(); };

    Component.require = function(name, options, callback) { this.F.require(name, options, callback); };
    Component.publish = function(topic, data) { namespace.Pubsub.publish(topic, data, this); };
    Component.subscribe = function(topic, callback){
      var self = this;
      self.subscribeList[topic] = namespace.Pubsub.subscribe(topic, function(topic, data, from){
        if (self.rendered) callback(topic, data, from);
        else self.earlyRecieved.push(function(){ callback(topic, data, from); });
      });
    };
    Component.unsubscribe = function(topic) {
      if (!topic) {
        for (var i in this.subscribeList) namespace.Pubsub.unsubscribe(i, this.subscribeList[i]);
      } else {
        if (topic in this.subscribeList) namspace.Pubsub.unsubscribe(topic, this.subscribeList[topic]);
      }
    };

    return Class.extend(Component);
  })();
})(window.F.__);

