// polyfill console
if (!console.debug) console.debug = console.log;
if (!console.time) console.time = function(){};
if (!console.timeEnd) console.timeEnd = function(){};

// -- BEGIN --

// polyfill bind
if (!Function.prototype.bind) {
  Function.prototype.bind = function(oThis) {
    if (typeof this !== 'function') {
      // closest thing possible to the ECMAScript 5
      // internal IsCallable function
      throw new TypeError('Function.prototype.bind - what is trying to be bound is not callable');
    }

    var aArgs   = Array.prototype.slice.call(arguments, 1),
    fToBind = this,
    fNOP    = function() {},
    fBound  = function() {
      return fToBind.apply(this instanceof fNOP
                           ? this
                           : oThis,
                           aArgs.concat(Array.prototype.slice.call(arguments)));
    };

    if (this.prototype) {
      // native functions don't have a prototype
      fNOP.prototype = this.prototype;
    }
    fBound.prototype = new fNOP();

    return fBound;
  };
}

(function(global){
  var buildStatic = (window.navigator.userAgent === "fractaljs-site-builder");
  var COMPONENT_ATTR = "f-component";

  // utils
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
    return function(key, fn, cb) {
      if (key in listeners) {
        listeners[key].push(cb);
      } else {
        listeners[key] = [cb];
        fn(function(f){
          var q = listeners[key], count = q.length;
          delete listeners[key];
          while(count) f(q[--count]);
        });
      }
    }
  };

  var Pubsub = (function(){
    var topics = {}, seq = 0;
    return {
      publish: function(topic, data, publisher) {
        var subscribers = topics[topic];
        for (var i in subscribers) subscribers[i].cb(topic, data, publisher);
      },
      subscribe: function(topic, subscriber, cb) {
        console.debug("subscribe", topic);
        if (!topics[topic]) topics[topic] = [];
        var token = ++seq;
        topics[topic].push({
          token: token,
          subscriber: subscriber,
          cb: cb
        });
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
      getSubscribers: function(topic) {
        if (!(topic in topics)) return [];
        return topics[topic].map(function(v){ return v.subscriber; });
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
      console.debug("network require", url)
      getMethod(url)(url, function(err, data) {
        if (err) {
          console.error('Require error: ' + err);
        }
        cache[url] = data;
        cb(data);
      });
    };

    return function(url, cb, forceUpdate) {
      if (url in cache && !forceUpdate) {
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

  var Component = (function(){
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
        return Class;
      };

      return Class;
    })();

    var idSeq = 0,
    _noImpl = function(fn) { fn(); };

    return Class.extend({
      init: function(name, $container, f){
        var self = this;
        self.name = name;
        self.$container = $container;
        self.f = f;
        self.id = idSeq++;
        F.all[self.id] = self;
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
          self.template = self.f.compile(self.template);
      },
      load: function(param, cb){
        var self = this;
        console.time("Component." + self.name + self.id);
        param = param || {};

        if (buildStatic && self.alwaysRender) {
          self.rendered = true;
          if (cb) cb();
          return;
        }
        self.rendered = false;
        self.getData(function(data, partials){
          self.getTemplate(function(template){
            self.render(data, partials, template, function() {
              self.afterRender(function(){
                self.rendered = true;
                self.myselfLoaded(function(){
                  self.loadChildren(function(){
                    self.allLoaded(function(){
                      console.timeEnd("Component." + self.name + self.id);
                      if (buildStatic) {
                        self.$container.removeAttr(COMPONENT_ATTR);
                      }
                      if (cb) cb();
                    }, param);
                  }, param);
                }, param);
              }, param);
            }, param);
          }, param);
        }, param);
      },
      getData: _noImpl,
      getTemplate: function(cb, param) {
        var self = this;
        if (self.template) {
          cb(self.template);
        } else {
          self.f.getTemplate(self.templateName, function(template){
            if (!self.template) self.template = self.f.compile(template);
            cb(self.template);
          });
        }
      },
      render: function(data, partials, template, cb, param){
        var self = this;
        var contents = self.f.render(template, data, partials);
        self.$container.html(contents);
        cb();
      },
      afterRender: _noImpl,
      myselfLoaded: function(cb, param){
        var buffered = this.buffered;
        while (buffered.length > 0) {
          buffered.pop()();
        }
        cb();
      },
      loadChildren: function(cb, param){
        var self = this;
        var els = self.$("[" + COMPONENT_ATTR + "]");
        var len = els.length;
        if (!len) return cb();

        forEachAsync(els, function(container, cb){
          var $container = $(container);
          var componentClassName = $container.attr(COMPONENT_ATTR);
          self.f.requireComponent(componentClassName, function(constructor){
            var component = new constructor(componentClassName, $container, self.f);
            (function(component, cb){
              // NOTE
              //  this "setImmediate" looks like the fastest implementation ...
              //  but there is still a several ms delay comparing to just calling "component.load"
              setImmediate(function(){
                component.load(param, cb);
              });
            })(component, cb);
          });
        }, cb);
      },
      allLoaded: _noImpl,
      unload: function(){
        console.debug("unload called", this.name);
        this.unsubscribe();
        delete F.all[this.id];
      },

      publish: function(topic, data) { Pubsub.publish(topic, data, this); },
      subscribe: function(topic, cb){
        var self = this;
        self.subscribeList[topic] = Pubsub.subscribe(topic, self, function(topic, data, from){
          if (self.rendered) {
            cb(topic, data, from);
          } else {
            self.buffered.push(function(){
              console.debug(self.name, "recieved before render",  topic, data, from);
              cb(topic, data, from);
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
  })();

  (function(){
    var currentInstance = null,
    location = global.location,
    protocol = (location.protocol === "file:") ? "http:" : location.protocol,
    TMPL_EXT = "tmpl",
    idSeq = 0,
    defaults = {
      prefixComponent: "",
      prefixTemplate: "",
      requireList: [],
      domParser: protocol + "//cdnjs.cloudflare.com/ajax/libs/jquery/2.1.1/jquery.min.js",
      templateEngine: protocol + "//cdnjs.cloudflare.com/ajax/libs/hogan.js/3.0.0/hogan.js",
      compile: function(text) { return Hogan.compile(text) },
      render: function(template, data, options) { return template.render(data, options); },
    };

    var Fractal = function(options){
      var self = this;
      options = options || {};
      self.id = ++idSeq;
      for (var i in defaults) self[i] = defaults[i];
      for (var i in options) self[i] = options[i];
      if (!self.sourceRoot)
        self.sourceRoot = location.pathname.split("/").slice(0, -1).join("/") + "/";
      self._classes = {};
    };

    var realBuild = function($container, param, cb){
      var self = this;
      console.time("f.build." + self.id);
      if (typeof($container) === "function") {
        cb = $container;
        $container = null;
        param = null;
      }
      self.$root = $container || $(global.document);
      var componentClassName = self.$root.attr(COMPONENT_ATTR);
      if (componentClassName) {
        self.requireComponent(componentClassName, function(constructor){
          var c = new constructor(componentClassName, self.$root, self);
          c.load(param, function(){
            console.timeEnd("f.build." + self.id);
            if (cb) cb();
          });
        });
      } else {
        var c = new Component("", self.$root, self);
        c.loadChildren(function(){
          c.rendered = true;
          console.timeEnd("f.build" + self.id);
          if (cb) cb();
        });
      }
    };

    Fractal.prototype = {
      init: function(cb) {
        var self = this;
        var requireList = [self.domParser, self.templateEngine].concat(self.requireList);
        self.require(requireList, function(){
          $.event.special.destroyed = {
            remove: function(o) {
              if (o.handler) o.handler();
            }
          };
          cb(self);
        });
      },
      resolve: function(name) {
        if (name.indexOf("http") === 0 || name.indexOf("/") === 0) return name;
        return this.sourceRoot + ((name.indexOf("/") === 0) ? name.slice(1) : name);
      },
      require: function(names, cb){
        var self = this;
        if (!Array.isArray(names)) {
          var url = self.resolve(names);
          require(url, cb);
        } else {
          var urls = names.map(function(v){ return self.resolve(v); });
          forEachAsync(urls, require, cb);
        }
      },
      getTemplate: function(name, cb) {
        var self = this;
        var ext = name.split(".").pop();
        if (ext !== TMPL_EXT) {
          var $tmpl = self.$root.find('script[name="template_' + name + '"]');
          if ($tmpl.length > 0) {
            return cb($tmpl.html());
          }
        }
        var url = self.prefixTemplate + name + ((ext!=TMPL_EXT) ? ("." + TMPL_EXT) : "");
        self.require(url, cb);
      },
      defineComponent: function(name, object, base) {
        this._classes[name] = (base || Component).extend(object || {});
        console.debug("register component class", name, "to instance", this.id);
      },
      requireComponent: (function(){
        var _queue = [], wip = false;
        var next = function(){
          if (!_queue.length) return;
          var runArray = [];
          while(_queue.length) {
            var task = _queue[0];
            if (!currentInstance) currentInstance = task.f;
            else if (task.f.id !== currentInstance.id) break;
            _queue.shift();
            runArray.push(task);
          }
          console.debug("require", runArray.length, "components");
          if (!runArray.length) return;
          else {
            wip = true;
            forEachAsync(runArray, function(task, cb){
              var url = task.f.prefixComponent + task.name + ".js";
              task.f.require(url, function(){
                task.cb(task.f._classes[task.name]);
                cb();
              });
            }, function(){
              currentInstance = null;
              wip = false;
              next()
            });
          }
        };

        return function(name, cb) {
          var self = this;
          var c = self._classes[name];
          if (c) {
            cb(c);
          } else {
            var active = !!_queue.length;
            _queue.push({ f: self, name: name, cb: cb });
            if (!active && !wip) setImmediate(next);
          }
        };
      })(),
    };

    var pendingBuilders = [];
    if (buildStatic) {
      Fractal.prototype._build = realBuild;
      Fractal.prototype.build = function($container, param, cb) {
        var self = this;
        pendingBuilders.push(function(){
          self._build($container, param, function(){
            Pubsub.publish("f.build.done", self.id, self);
            if (cb) cb();
          });
        });
      };
    } else {
      Fractal.prototype.build = realBuild;
    }

    global.F = {
      all: {}, // contains all components
      Pubsub: Pubsub,
      Require: require,
      ComponentBase: Component,
      component: function(name, object, base){
        currentInstance.defineComponent(name, object, base);
      },
      createInstance: function(options, cb) {
        if (typeof(options) === "function") {
          cb = options;
          options = null;
        }
        var f = new Fractal(options);
        f.init(cb);
      },
      buildStatic: function(){
        pendingBuilders.forEach(function(v){
          v();
        });
      }
    };

  })();

})(window);

