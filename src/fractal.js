(function(global){
  var ready = false;
  var readyListeners = [];

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

  F.envDescs = {};
  F.TOPIC = {
    COMPONENT_LOADED_MYSELF: "component.loaded.myself",
    COMPONENT_LOADED_CHILDREN: "component.loaded.children",
  };

  var getType = (function(){
    var KNOWN_TYPES = {js: 1, css:1, tmpl:1};
    return function(name) {
      var type = name.split('.').pop();
      return (type in KNOWN_TYPES) ? type : 'ajax';
    };
  })();

  var forEachAsync = function(items, onEach, onDone) {
    var len = items.length;
    if (!len) return onDone();
    var i = 0, complete = 0;
    for (; i<len; ++i) {
      onEach(items[i], function(){
        if (++complete === len) onDone();
      });
    }
  };

  var ObjectLoader = (function(){
    var items = null;
    var queue = [];

    var lock = {
      get: function(){
        if (!items) {
          items = {};
          return true;
        }
        return false;
      },
      release: function(){ items = null; }
    };

    var lockedCall = function(func) {
      if (!lock.get()) {
        queue.push(func);
      } else {
        func(function(){
          lock.release();
          if (queue.length) {
            lockedCall(queue.shift());
          }
        });
      }
    };

    return {
      component: (function(){
        var load = function(env, url, callback) {
          items.components = {};
          require(url, {}, function(){
            var asyncCalls = [];
            for (var i in items.components) {
              var component = items.components[i];
              if (component.prototype && component.prototype.constructor.name === 'Class') {
                console.info('load ' + i + ' into ' + env.getName());
                env.components[i] = component;
              } else {
                asyncCalls.push([i, component]);
              }
            }
            forEachAsync(asyncCalls, function(v, cb){
              var name = v[0];
              var func = v[1];
              func(env, function(componentClass){
                console.info('load ' + name + ' into ' + env.getName());
                env.components[name] = componentClass;
                cb();
              });
            }, function(){
              callback();
            });
          });
        };
        return {
          define: function(name, component) {
            if (!items) F.defaultEnv.components[name] = component;
            else items.components[name] = component;
          },
          load: function(env, url, callback) {
            lockedCall(function(lockedCallback){
              load(env, url, function(res){
                callback(res);
                lockedCallback();
              });
            });
          },
        };
      })(),
      config: (function(){
        var load = function(name, url, callback) {
          items.config = null;
          require(url, {}, function(){
            if (!items.config) {
              console.warn('config not found in ' + url.url);
              console.warn('using default config for ' + name);
              items.config = {};
            }
            (new Env(name, url.url, items.config)).init(callback);
          });
        };
        return {
          define: function(config) {
            items.config = config;
          },
          load: function(name, url, callback) {
            lockedCall(function(lockedCallback){
              load(name, url, function(res){
                callback(res);
                lockedCallback();
              });
            });
          },
        };
      })(),
    };
  })();

  var Seq = {
    __seq: 1,
    __last: (+new Date),
    get: function(){ return Seq.__seq; },
    increment: function(){
      var now = +new Date;
      if (now - Seq.__last > 100) {
        ++Seq.__seq;
        Seq.__last = now;
      }
    },
  };

  var Env = (function(){
    var getUrl = function(self, name) {
      var type = getType(name);
      var url = (function(type){
        if (name.indexOf("http") === 0 || name.indexOf("//") === 0) return name;
        if (name.indexOf(".") === 0) {
          if (type === 'ajax') throw new Error('relative path is not allow for ajax calls');
        }
        var base = (type === 'ajax') ? self.APIRoot : self.SourceRoot;
        if (name.indexOf("/") === 0) name = name.slice(1);
        return base + name;
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
      this.APIRoot = config.APIRoot || this.SourceRoot;

      this.components = {};
      for (var i in defaultConfig) {
        this[i] = config[i] || defaultConfig[i];
      }
    };
    var proto = Env.prototype;
    proto.getName = function() { return this.__name || '[default]'; };
    proto.init = function(callback) {
      var self = this;
      for (var i in self.Envs) {
        F.envDescs[i] = self.Envs[i];
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
    proto.require = function(names, options, callback){
      if (typeof(options) === "function") {
        callback = options;
        options = {};
      }
      var self = this;
      if (!Array.isArray(names)) {
        require(getUrl(self, names), options, callback);
      } else {
        require(names.map(function(v){ return getUrl(self, v); }), options, callback);
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
        forEachAsync(names, function(v, cb){
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
        name = parts[1];
        getOrCreateEnv(envName, function(env){
          env.getComponentClass(name, callback);
        });
      } else {
        if (name in self.components) {
          callback(self.components[name], name, self);
        } else {
          var url = getUrl(self, self.Prefix.Component + name + '.js');
          ObjectLoader.component.load(self, url, function(loaded){
            if (!(name in self.components)) {
              throw new Error('component ' + name + ' is not found in ' + url.url );
            }
            callback(self.components[name], name, self);
          });
        }

      }
    };
    return Env;
  })();

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

      function Class() {
        if ( !initializing && this.init )
          this.init.apply(this, arguments);
      }

      Class.prototype = prototype;
      Class.prototype.constructor = Class;

      Class.extend = arguments.callee;

      return Class;
    };

    return Class;
  })();

  var getOrCreateEnv = (function(){
    var envs = {};
    return function(envName, callback) {
      if (!envName) return callback(F.defaultEnv);
      if (envName in envs) return callback(envs[envName]);
      if (!(envName in F.envDescs)) throw new Error('unknown env name: ' + envName);

      var onEnvLoaded = function(env) {
        console.info('create env: ' + env.getName() + ' root: ' + env.SourceRoot);
        envs[env.getName()] = env;
        callback(env);
      };

      var descUrl = F.envDescs[envName];
      var ext = descUrl.split('.').pop();
      if (ext !== 'js') {
        if (descUrl[descUrl.length - 1] !== '/') descUrl += '/';
        (new Env(envName, descUrl)).init(onEnvLoaded);
      } else {
        ObjectLoader.config.load(envName, { type: 'js', url: descUrl }, onEnvLoaded);
      }
    };
  })();

  var require = (function(){
    var byAddingElement = function(element, callback) {
      var __myTimer = setTimeout(function(){
        console.error("Timeout: adding " + element.src);
        callback(true, false); // err, result
      }, 10000);
      var done = false;
      element.onload = element.onreadystatechange = function(){
        if ( !done && (!this.readyState ||
                       this.readyState == "loaded" || this.readyState == "complete") ) {
          done = true;
          clearTimeout(__myTimer);
          callback(false, true); // err, result
          element.onload = element.onreadystatechange = null;
        }
      };
      var container = document.getElementsByTagName("head")[0];
      container.appendChild(element);
    };
    var byAjax = function(url, options, callback){
      if (typeof options === 'function') {
        callback = options;
        options = {};
      }
      var xhr = new XMLHttpRequest();
      xhr.open("GET", url, true);
      xhr.onreadystatechange = function () {
        if (xhr.readyState == 4) {
          if ((xhr.status == 200 || xhr.status == 0) && xhr.responseText) {
            callback(false, xhr.responseText);
          } else {
            console.error("unexpected server resposne: " + xhr.status + " " + url);
            callback(true, false);
          }
        }
      }
      if (options && options.contentType)
        xhr.setRequestHeader("Accept" , options.contentType);
      xhr.send("");
    };
    var Type2Getter = {
      "js": (function(){
        var cache = {};
        return function(url, callback) {
          if (url in cache) return callback(false, true);
          cache[url] = true;
          var el = document.createElement("script");
          el.src = url;
          byAddingElement(el, callback);
        };
      })(),
      "css": (function(){
        var cache = {};
        return function(url, callback) {
          if (url in cache) return callback(false, true);
          cache[url] = true;
          var el = document.createElement("link");
          el.rel="stylesheet";
          el.href = url;
          document.getElementsByTagName("head")[0].appendChild(el);
          callback(false, true);
        };
      })(),
      "tmpl": (function(){
        var cache = {};
        return function(url, callback, options) {
          if (url in cache) return callback(false, cache[url]);
          byAjax(url, options, function(err, result){
            if (!err) cache[url] = result;
            callback(err, result);
          });
        };
      })(),
      "ajax": (function(){
        var cache = {};
        return function(url, callback, options){
          options = options || {};
          var forced = !!options.forced;
          if (!forced && url in cache && cache[url].seq >= Seq.get()) {
            console.debug("require from cache", url);
            return callback(false, cache[url].data);
          }
          var contentType = options.contentType || "application/json";
          console.debug("require new", url, forced, cache[url] ? cache[url].seq : "-1", Seq.get());
          byAjax(url, {contentType: contentType}, function(err, responseText){
            if (err) return callback(err, responseText);
            var data = null;
            if (contentType === "application/json") {
              try {
                data = JSON.parse(responseText);
              } catch (e) {
                console.error("failed to parse responseText, url: " + url + ", res: " + responseText);
                callback(true, false);
              }
            } else {
              data = responseText;
            }
            cache[url] = { seq: Seq.get(), data: data };
            callback(false, data);
          });
        };
      })(),
    };
    var requireDefault = (function(){
      var listeners = {};
      return function(resource, options, callback) {
        if (resource.url in listeners) {
          listeners[resource.url].push(callback);
          return;
        }
        listeners[resource.url] = [callback];
        var type = options.contentType ? 'ajax' : resource.type;
        Type2Getter[type](resource.url, function(err, data) {
          var callbackList = listeners[resource.url].map(function(v){return v;});
          delete listeners[resource.url];
          callbackList.forEach(function(v){v(data, resource.id);});
        }, options);
      };
    })();

    return function(resourceList, options, callback) {
      if (!Array.isArray(resourceList)) {
        return requireDefault(resourceList, options, callback);
      }
      var retData = {};
      forEachAsync(resourceList, function(v, cb){
        requireDefault(v, options, function(data, id){
          retData[id] = data;
          cb();
        });
      }, function(){ callback(retData); });
    };
  })();

  var Pubsub = F.Pubsub = (function() {
    var Stock = function(){
      this.arrived = {};
      this.buffer = {};
    };
    var count = function(){
      var count = 0;
      for (var i in this.buffer) ++count;
      return count;
    };
    Stock.prototype.add = function(topic, data) {
      if (count.bind(this)() >= 10 && !(topic in this.buffer)) {
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
    Stock.prototype.get = function(topic) {
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
    return {
      publish: function(topic, data, from) {
        if (!topics[topic]) {
          stock.add(topic, {d: data, f: from});
          return;
        }
        var subscribers = topics[topic];
        for (var i in subscribers) subscribers[i].callback(topic, data, from);
      },
      subscribe: function(topic, callback) {
        if (!topics[topic]) topics[topic] = [];
        var token = ++seq;
        topics[topic].push({
          token: token,
          callback: callback
        });
        var data = stock.get(topic);
        if (data) callback(topic, data.d, data.f);
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

  F.Component = (function(){
    var ComponentFilter = '[data-role=component]';

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
        if (typeof(this[i]) === 'function' && i.indexOf('on') === 0) {
          subscribes.push([i.substr(2), this[i]]);
        }
      }
      var publicMethods = this.Public || {};
      for (var i in publicMethods) {
        subscribes.push([this.F.getName() + '.' + this.name + '.' + i, publicMethods[i]]);
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
      this.publish(this.F.getName() + '.' + name, data, this);
    };

    Component.setTemplate = function(name) {
      this.templateName = name;
      this.template = null;
    };
    Component.load = function(param, callback){
      Seq.increment();
      this.__load(function(){
        if (callback) callback();
      }, param);
    };
    Component.__load = null;
    Component.getData = null;
    Component.getTemplate = function(callback) {
      var self = this;
      if (self.template) return callback();
      self.F.getTemplate(self.templateName || self.name, function(template){
        self.template = template;
        callback();
      });
    };
    Component.render = function(callback){
      var contents = this.F.Template.Render(this.template, this.data, this.partials);
      this.$container.html(contents);
      callback();
    };
    Component.afterRender = null;
    Component.myselfLoaded = function(callback){
      this.rendered = true;
      while (this.earlyRecieved.length > 0) {
        this.earlyRecieved.pop()();
      }
      this.publish(F.TOPIC.COMPONENT_LOADED_MYSELF);
      callback();
    };
    Component.loadChildren = function(callback, param){
      var self = this;
      var components = self.$(ComponentFilter);
      var len = components.length;
      if (!len) {
        self.publish(F.TOPIC.COMPONENT_LOADED_CHILDREN);
        if (callback) callback();
        return;
      }
      forEachAsync(components, function(container, cb){
        var $container = $(container);
        var name = $container.data('name');
        self.F.getComponentClass(name, function(componentClass, name, env){
          var c = new componentClass(name, $container, env);
          c.__load(cb, param);
        });
      }, function(){
        self.publish(F.TOPIC.COMPONENT_LOADED_CHILDREN);
        if (callback) callback();
      })
    },
    Component.allLoaded = null;
    Component.unload = function(){
      this.unsubscribe();
    };

    Component.require = function(name, options, callback) { this.F.require(name, options, callback); };
    Component.publish = function(topic, data) {
      Pubsub.publish(topic, data, this);
    };
    Component.subscribe = function(topic, callback){
      var self = this;
      self.subscribeList[topic] = Pubsub.subscribe(topic, function(topic, data, from){
        if (self.rendered) callback(topic, data, from);
        else self.earlyRecieved.push(function(){ callback(topic, data, from); });
      });
    };
    Component.unsubscribe = function(topic) {
      if (!topic) {
        for (var i in this.subscribeList) Pubsub.unsubscribe(i, this.subscribeList[i]);
      } else {
        if (topic in this.subscribeList) Pubsub.unsubscribe(topic, this.subscribeList[topic]);
      }
    };
    return Class.extend(Component);
  })();

  F.construct = function(config, callback){
    if (typeof(config) === 'function') {
      callback = config;
      config = {};
    }
    (function(config, cb){
      if (!F.defaultEnv) {
        var env = new Env('', '', config);
        env.init(function(){
          F.defaultEnv = env;
          cb(env);
        });
      } else {
        cb(F.defaultEnv);
      }
    })(config, function(env){
      if (readyListeners && readyListeners.length) {
        readyListeners.forEach(function(v){ v(); });
        readyListeners = [];
      }
      ready =  true;

      var c = new F.Component('__ROOT__', $(global.document), env);
      c.loadChildren(callback);
    });
  };

})(window);

