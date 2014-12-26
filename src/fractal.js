(function(global){
  var setImmediate = (function() {
    var timeouts = [];
    var messageName = (new Date()).getTime();

    function handleMessage(event) {
      if (event.source == window && event.data == messageName) {
        event.stopPropagation();
        if (timeouts.length > 0) {
          var fn = timeouts.shift();
          fn();
        }
      }
    }
    window.addEventListener("message", handleMessage, true);

    return function(fn) {
      timeouts.push(fn);
      window.postMessage(messageName, "*");
    };
  })();

  var forEachAsync = function(items, fn, done) {
    var count, left;
    count = left = items.length;
    if (!count) {
      done();
    } else {
      while (count) {
        fn(items[--count], function(){
          if (!--left) done();
        });
      }
    }
  };

  var createAsyncOnce = function(){
    var listeners = {};
    return function(key, fn, callback) {
      if (key in listeners) {
        listeners[key].push(callback);
      } else {
        listeners[key] = [callback];
        fn(function(f){
          var q = listeners[key], count = q.length;
          delete listeners[key];
          while(count) f(q[--count]);
        });
      }
    }
  };

  var createClass = function(type){
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
      Class.getType = function() { return type; };
      return Class;
    };

    return Class;
  };

  var isClass = function(object, type) {
    if (!object.getType) return false;
    return (!type) || (object.getType() === type);
  };

  var ClassType = {
    COMPONENT: 1,
    ENV: 2
  };

  var Pubsub = (function(){
    // TODO not important, but replace with faster implementation
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
      var self = this;
      if (self.count() >= MaxStocked && !(topic in self.buffer)) {
        var oldest = new Data();
        var oldestTopic = "";
        for (var i in self.arrived) {
          if (self.arrived[i] < oldest) {
            oldest = self.arrived[i];
            oldestTopic = i;
          }
        }
        delete self.buffer[oldestTopic];
        delete self.arrived[oldestTopic];
      }
      self.buffer[topic] = data;
      self.arrived[topic] = new Date();
    };
    proto.get = function(topic) {
      var self = this;
      if (topic in self.buffer) {
        var data = self.buffer[topic];
        delete self.buffer[topic];
        delete self.arrived[topic];
        return data;
      }
      return null;
    };

    var topics = {}, seq = 0, stock = new Stock();

    return {
      publish: function(topic, data, from) {
        if (!topics[topic]) {
          console.debug("stock message", topic, (from && from.name) || "", data);
          stock.add(topic, {d: data, f: from});
          return;
        }
        var subscribers = topics[topic];
        for (var i in subscribers) subscribers[i].cb(topic, data, from);
      },
      subscribe: function(topic, callback) {
        console.debug("subscribe", topic);
        if (!topics[topic]) topics[topic] = [];
        var token = ++seq;
        topics[topic].push({
          token: token,
          cb: callback
        });
        var data = stock.get(topic);
        if (data) {
          console.debug("get from stock", topic, data.f, data.d);
          callback(topic, data.d, data.f);
        }
        return token;
      },
      unsubscribe: function(topic, token) {
        console.debug("unsubscribe", topic);
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
  })();

  var require = (function(){
    var cache = {}, asyncOnce = createAsyncOnce();

    var _methods = {
      "js": function(url, cb) {
        var el = document.createElement("script");
        el.src = url;

        var done = false;
        el.onload = el.onreadystatechange = function(){
          var state = this.readyState;
          if ( !done && (!state || state == "loaded" || state == "complete") ) {
            done = true;
            cb(false, true);
            el.onload = el.onreadystatechange = null;
          }
        };
        document.getElementsByTagName("head")[0].appendChild(el);
      },
      "css": function(url, cb) {
        var el = document.createElement("link");
        el.rel="stylesheet";
        el.href = url;
        document.getElementsByTagName("head")[0].appendChild(el);
        cb(false, true);
      },
      "ajax": function(url, cb) {
        var xhr = new XMLHttpRequest();
        xhr.open('GET', url, true);
        xhr.onreadystatechange = function(){
          if (xhr.readyState === 4) {
            var err, data, status = xhr.status, res = xhr.responseText;
            if ((status === 200 || status === 0) && res) {
              cb(false, res);
            } else {
              cb("unexpected server resposne: " + status);
            }
          }
        }
        xhr.send("");
      }
    };

    var getMethod = function(name) { return _methods[name.split(".").pop()] || _methods.ajax; };

    var main = function(url, cb) {
      console.log("network require", url)
      getMethod(url)(url, function(err, data) {
        if (err) {
          console.error('Require error: ' + err);
        }
        cache[url] = data;
        cb(data);
      });
    };

    return function(url, cb) {
      if (url in cache) {
        cb(cache[url]);
      } else {
        asyncOnce(url, function(cb){
          main(url, function(data){
            cb(function(cb){ cb(data); });
          });
        }, cb);
      }
    };
  })();

  var location = global.location,
  protocol = (location.protocol === "file:") ? "http:" : location.protocol,
  COMPONENT_ATTR = "f-component",
  __noImpl = function(fn) { fn(); },
  idSeq = 0;

  var Env = createClass(ClassType.ENV).extend({
    prefixComponent: "/",
    prefixTemplate: "/",
    requireList: [],
    domParser: protocol + "//cdnjs.cloudflare.com/ajax/libs/jquery/2.1.1/jquery.min.js",
    templateEngine: protocol + "//cdnjs.cloudflare.com/ajax/libs/hogan.js/3.0.0/hogan.js",
    compile: function(text) { return Hogan.compile(text) },
    render: function(template, data, options) { return template.render(data, options); },

    init: function(options) {
      var self = this;
      self.sourceRoot = self.sourceRoot || (function(url){
        return url.split("/").slice(0, -1).join("/") + "/";
      })(location.pathname);
    },
    resolveUrl: function(name) {
      if (name.indexOf("http") === 0 || name.indexOf("//") === 0) return name;
      return this.sourceRoot + ((name.indexOf("/") === 0) ? name.slice(1) : name);
    },
    setup: function(cb) {
      var self = this;
      self.requireList.unshift(self.domParser);
      self.requireList.unshift(self.templateEngine);
      self.require(self.requireList, function(){
        $.event.special.destroyed = {
          remove: function(o) {
            if (o.handler) o.handler();
          }
        };
        cb();
      });
    },
    require: function(names, cb){
      var self = this;
      if (!Array.isArray(names)) {
        var url = self.resolveUrl(names);
        require(url, cb);
      } else {
        var urls = names.map(function(v){ return self.resolveUrl(v); });
        forEachAsync(urls, require, cb);
      }
    },
    getTemplate: (function(){
      var tmplExt = "tmpl";
      return function(name, cb) {
        var self = this;
        var ext = name.split(".").pop();
        if (ext !== tmplExt) {
          // TOOD have to find globally ...
          var $tmpl = $('template[name="template_' + name + '"]');
          if ($tmpl.length > 0) {
            return cb($tmpl.html());
          }
        }
        var url = self.prefixTemplate + name + ((ext!=tmplExt) ? ("." + tmplExt) : "");
        self.require(url, cb);
      };
    })(),
    requireComponent: function(name, cb) {
      var self = this;
      var c = getComponentByName(name);
      if (c) {
        cb(c);
      } else {
        var url = self.prefixComponent + name + ".js";
        self.require(url, function(){
          cb(getComponentByName(name));
        });
      }
    },
  });

  var Component = createClass(ClassType.COMPONENT).extend({
    init: function(name, $container, env){
      var self = this;
      self.name = name;
      self.$container = $container;
      self.env = env;
      self.id = ++idSeq;
      self.$ = self.$container.find.bind(self.$container);
      self.rendered = false;
      self.subscribeList = {};
      self.buffered = [];
      self.templateName = self.templateName || self.name;

      if (self.resetDisplay) self.$container.css("display", self.resetDisplay);
      self.$container.on("destroyed", self.unload.bind(self));

      // TODO implement if needed
      // self.children = [];
      // self.parent = null;
      if (typeof(self.template) === "string")
        self.template = self.env.compile(self.template);
    },
    load: function(param, callback){
      var self = this;
      console.time("Component." + self.name + self.id);
      param = param || {};

      self.getData(function(data, partials){
        self.getTemplate(function(template){
          self.render(data, partials, template, function() {
            self.afterRender(function(){
              self.rendered = true;
              self.myselfLoaded(function(){
                self.loadChildren(function(){
                  self.allLoaded(function(){
                    console.timeEnd("Component." + self.name + self.id);
                    if (callback) callback();
                  }, param);
                }, param);
              }, param);
            }, param);
          }, param);
        }, param);
      }, param);
    },
    getData: __noImpl,
    getTemplate: function(callback, param) {
      var self = this;
      if (self.template) {
        callback(self.template);
      } else {
        self.env.getTemplate(self.templateName, function(template){
          if (!self.template) self.template = self.env.compile(template);
          callback(self.template);
        });
      }
    },
    render: function(data, partials, template, callback, param){
      var self = this;
      var contents = self.env.render(template, data, partials);
      self.$container.html(contents);
      callback();
    },
    afterRender: __noImpl,
    myselfLoaded: function(callback, param){
      var buffered = this.buffered;
      while (buffered.length > 0) {
        buffered.pop()();
      }
      callback();
    },
    loadChildren: function(callback, param){
      var self = this;
      var els = self.$("[" + COMPONENT_ATTR + "]");
      var len = els.length;
      if (!len) {
        if (callback) callback();
        return;
      }

      forEachAsync(els, function(container, cb){
        var $container = $(container);
        var componentClassName = $container.attr(COMPONENT_ATTR);
        self.env.requireComponent(componentClassName, function(constructor){
          var component = new constructor(componentClassName, $container, self.env);
          (function(component, cb){
            // NOTE
            //  this "setImmediate" looks like the fastest implementation ...
            //  but there is still a several ms delay comparing to just calling "component.load"
            setImmediate(function(){
              component.load(param, cb);
            });
          })(component, cb);
        });
      }, function(){
        if (callback) callback();
      })
    },
    allLoaded: __noImpl,
    unload: function(){
      console.debug("unload called", this.name);
      this.unsubscribe();
    },

    publish: function(topic, data) { Pubsub.publish(topic, data, this); },
    subscribe: function(topic, callback){
      var self = this;
      self.subscribeList[topic] = Pubsub.subscribe(topic, function(topic, data, from){
        if (self.rendered) {
          callback(topic, data, from);
        } else {
          self.buffered.push(function(){
            console.debug(self.name, "recieved before render",  topic, data, from);
            callback(topic, data, from);
          });
        }
      });
    },
    unsubscribe: function(topic) {
      var list = this.subscribeList;
      if (!topic) {
        for (var i in list) Pubsub.unsubscribe(i, list[i]);
      } else {
        if (topic in list) Pubsub.unsubscribe(topic, list[topic]);
      }
    },
  });

  var ready = false, initCbq = [], components = {}, TOPIC_ENV_CHANGED = "env.changed";

  var getComponentByName = function(name) { return components[name] || null; };

  // private
  var namespace = {};
  namespace.getComponentByName = getComponentByName;
  namespace.Pubsub = Pubsub;

  // public
  var F = global.F = function(fn){
    if (ready) fn(namespace);
    else initCbq.push(fn);
  };

  F.ComponentBase = Component;

  F.component = function(name, object, base) {
    console.debug("register component class", name);
    components[name] = (base || Component).extend(object || {});
  };

  F.env = function(options) {
    var env = new Env(options);
    env.setup(function(){
      Pubsub.publish(TOPIC_ENV_CHANGED, env);
    });
  };

  F.init = function(options, cb){
    Pubsub.subscribe(TOPIC_ENV_CHANGED, function(topic, env){
      Pubsub.unsubscribe(TOPIC_ENV_CHANGED);
      ready = true;
      var i=0, len=initCbq.length;
      for (; i<len; ++i) initCbq[i](namespace);
      initCbq = [];

      console.time("build");
      var c = new Component("", $(global.document), env);
      c.loadChildren(function(){
        console.timeEnd("build");
        if (cb) cb();
      });
    });

    if (typeof(options) === "string") {
      var envDescriptorUrl = options;
      require(envDescriptorUrl);
    } else {
      F.env(options);
    }
  };

})(window);

