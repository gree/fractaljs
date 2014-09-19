(function(global){
  var ready = false;
  var readyListeners = [];

  var F = global.Fractal = global.F = function(arg1, arg2){
    var callback = null;
    if (typeof(arg1) === 'function') { // register a 'onReady' listener
      callback = arg1
    } else if (typeof(arg1) === 'string' && typeof(arg2) === 'function') { // add a component
      var name = arg1, component = arg2;
      callback = function(){
        ComponentLoader.define(name, component);
      };
    }
    if (!callback) return;
    if (ready) return callback();
    readyListeners.push(callback);
  };

  F.TOPIC = {
    COMPONENT_LOADED_MYSELF: "Fractal.component.loaded.myself",
    COMPONENT_LOADED_CHILDREN: "Fractal.component.loaded.children",
  };

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

  var ComponentLoader = (function(){
    var components = null;
    var requireQueue = [];

    var define = function(name, component) {
      if (!components) F.defaultEnv.components[name] = component;
      else components[name] = component;
    };
    var require = function(env, url, callback) {
      if (components) {
        return requireQueue.push(function(){
          require(env, url, callback);
        });
      }
      components = {};
      F.require(url, function(){
        for (var i in components) {
          console.info('load', i, 'into namespace', env.namespace);
          env.components[i] = components[i];
        }
        callback();
        components = null;
        next();
      });
    };
    var next = function(){
      if (requireQueue.length) {
        requireQueue.shift()();
      }
    };
    return {
      define: define,
      require: require,
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

  var Pubsub = (function() {
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
      publish: function(topic, data) {
        if (!topics[topic]) {
          stock.add(topic, data);
          return;
        }
        var subscribers = topics[topic];
        for (var i in subscribers) subscribers[i].callback(topic, data);
      },
      subscribe: function(topic, callback) {
        if (!topics[topic]) topics[topic] = [];
        var token = ++seq;
        topics[topic].push({
          token: token,
          callback: callback
        });
        var data = stock.get(topic);
        if (data) callback(topic, data);
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

  var Env = (function(){
    var KNOWN_TYPES = {js: 1, css:1, tmpl:1};

    var protocol = global.location.protocol == 'file:' ? 'http:' : global.location.protocol;
    var root = global.location.pathname.split('/').slice(0, -1).join('/') + '/';
    var defaultConfig = {
      API_ROOT: root,
      SOURCE_ROOT: root,
      DOM_PARSER: protocol + '//cdnjs.cloudflare.com/ajax/libs/jquery/2.1.1/jquery.min.js',
      TEMPLATE_ENGINE: protocol + '//cdnjs.cloudflare.com/ajax/libs/hogan.js/3.0.0/hogan.js',
      PREFIX: {
        component: 'components/',
        template: 'templates/',
      },
      Template: {
        Compile: function(templateText) { return Hogan.compile(templateText); },
        Render: function(template, data, options) { return template.render(data, options); },
      },
    };

    var getUrl = function(self, name) {
      var type = name.split('.').pop();
      type = (type in KNOWN_TYPES) ? type : 'ajax';
      var url = (function(type){
        if (name.indexOf("http") === 0 || name.indexOf("//") === 0) return name;
        if (name.indexOf(".") === 0) {
          if (type === 'ajax') throw new Error('relative path is not allow for ajax calls');
        }
        var base = (type === 'ajax') ? self.API_ROOT : self.SOURCE_ROOT;
        if (name.indexOf("/") === 0) name = name.slice(1);
        return base + name;
      })(type);
      return { type: type, url: url };
    };

    var Env = function(namespace, config){
      config = config || defaultConfig;
      this.namespace = namespace;
      this.components = {};
      this.PREFIX = {};
      this.Template = {};
      this.setup(config);
    };
    var proto = Env.prototype;
    proto.setup = function(config){
      if (config.API_ROOT) this.API_ROOT = config.API_ROOT;
      if (config.SOURCE_ROOT) this.SOURCE_ROOT = config.SOURCE_ROOT;
      if (config.DOM_PARSER) this.DOM_PARSER = config.DOM_PARSER;
      if (config.TEMPLATE_ENGINE) this.TEMPLATE_ENGINE = config.TEMPLATE_ENGINE;
      if (config.PREFIX) for (var i in config.PREFIX) this.PREFIX[i] = config.PREFIX[i];
      if (config.Template) for (var i in config.Template) this.Template[i] = config.Template[i];
    };
    proto.init = function(callback) {
      this.require([this.DOM_PARSER, this.TEMPLATE_ENGINE], function(){
        $.event.special.destroyed = {
          remove: function(o) {
            if (o.handler) o.handler();
          }
        };
        callback();
      });
    };
    proto.require = function(names, callback){
      var self = this;
      if (!Array.isArray(names)) {
        F.require(getUrl(self, names), callback);
      } else {
        F.require(names.map(function(v){ return getUrl(self, v); }), callback);
      }
    };
    proto.getTemplate = (function(){
      var __get = function(self, name, callback){
        var $tmpl = $('script[type="text/template"][data-name="' + self.namespace + ':' + name + '"]');
        if ($tmpl.length > 0) {
          callback(self.Template.Compile($tmpl.html()));
        } else {
          self.require(self.PREFIX.template + name + ".tmpl", function(data){
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
      if (name in self.components) {
        callback(self.components[name]);
      } else {
        var url = getUrl(self, self.PREFIX.component + name + '.js');
        ComponentLoader.require(self, url, function(){
          callback(self.components[name]);
        });
      }
    };

    return Env;
  })();

  F.require = (function(){
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
        return function(url, options, callback) {
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
        Type2Getter[resource.type](resource.url, function(err, data) {
          var callbackList = listeners[resource.url].map(function(v){return v;});
          delete listeners[resource.url];
          callbackList.forEach(function(v){v(data);});
        }, options);
      };
    })();

    return function(resourceList, options, callback) {
      if (typeof(options) === "function") {
        callback = options;
        options = null;
      }
      if (!Array.isArray(resourceList)) {
        return requireDefault(resourceList, options, callback);
      }
      var retData = {};
      forEachAsync(resourceList, function(v, cb){
        requireDefault(v, options, function(data){
          retData[v.url] = data;
          cb();
        });
      }, function(){ callback(retData); });
    };
  })();

  F.Class = (function(){
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
      this.templateName = this.templateName || self.name;
      if (typeof(this.template) === "string") this.template = this.F.Compile(this.template);

      setLoad(this, this.getData);
      setLoad(this, this.getTemplate);
      setLoad(this, this.render);
      setLoad(this, this.afterRender);
      setLoad(this, this.onMyselfLoaded);
      if (!this.loadMyselfOnly)
        setLoad(this, this.loadChildren);
      setLoad(this, this.onAllLoaded);
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
      this.F.getTemplate(self.templateName || self.name, function(template){
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
    Component.onMyselfLoaded = function(callback){
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
        var namespace = '';
        var name = $container.data('name');
        if (name.indexOf(':') >= 0) {
          var parts = name.split(':');
          namespace = parts[0];
          name = parts[1];
        }
        getOrCreateEnv(namespace, function(env){
          env.getComponentClass(name, function(componentClass){
            var c = new componentClass(name, $container, env);
            c.__load(cb, param);
          });
        });
      }, function(){
        self.publish(F.TOPIC.COMPONENT_LOADED_CHILDREN);
        if (callback) callback();
      })
    },
    Component.onAllLoaded = null;
    Component.unload = function(){ this.unsubscribe(); };

    Component.publish = function(topic, data) { Pubsub.publish(topic, { from: this, data: data }); };
    Component.subscribe = function(topic, callback){
      var self = this;
      self.subscribeList[topic] = Pubsub.subscribe(topic, function(topic, data){
        if (self.rendered) callback(topic, data.data, data.from);
        else self.earlyRecieved.push(function(){ callback(topic, data.data, data.from); });
      });
    };
    Component.unsubscribe = function(topic) {
      if (!topic) {
        for (var i in this.subscribeList) Pubsub.unsubscribe(i, this.subscribeList[i]);
      } else {
        if (topic in this.subscribeList) Pubsub.unsubscribe(topic, this.subscribeList[topic]);
      }
    };
    return F.Class.extend(Component);
  })();

  var getOrCreateEnv = (function(){
    var envs = {};
    return function(namespace, callback) {
      if (!namespace) return callback(F.defaultEnv);
      if (namespace in envs) return callback(envs[namespace]);
      if (!(namespace in F.nsDescriptors)) throw new Error('unknown namspace: ' + namepspace);
      var descriptorUrl = F.nsDescriptors[namespace];
      F.defaultEnv.require(descriptorUrl, function(nsConfig){
        var env = new Env(nsConfig);
        env.init(function(){
          envs[namespace] = env;
          callback(env);
        });
      });
    };
  })();

  F.construct = function(config, callback){
    if (typeof(config) === 'function') {
      callback = config;
      config = {};
    }
    (function(config, cb){
      if (!F.defaultEnv) {
        var env = new Env('default', config);
        env.init(function(){
          F.defaultEnv = env;
          cb(env);
        });
      } else {
        cb(F.defaultEnv);
      }
    })(config, function(env){
      var c = new F.Component('__ROOT__', $(global.document), env);
      c.loadChildren(callback);
    });
  };

  if (readyListeners && readyListeners.length) {
    readyListeners.forEach(function(v){ v(); });
    readyListeners = [];
  }
  ready =  true;
})(window);

