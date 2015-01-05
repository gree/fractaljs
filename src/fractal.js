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
      publish: function(topic, data, from) {
        var subscribers = topics[topic];
        for (var i in subscribers) subscribers[i].cb(topic, data, from);
      },
      subscribe: function(topic, cb) {
        console.debug("subscribe", topic);
        if (!topics[topic]) topics[topic] = [];
        var token = ++seq;
        topics[topic].push({
          token: token,
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
  TMPL_EXT = "tmpl";

  var Env = (function(){
    var idSeq = 0;
    var defaults = {
      prefixComponent: "/",
      prefixTemplate: "/",
      requireList: [],
      domParser: protocol + "//cdnjs.cloudflare.com/ajax/libs/jquery/2.1.1/jquery.min.js",
      templateEngine: protocol + "//cdnjs.cloudflare.com/ajax/libs/hogan.js/3.0.0/hogan.js",
      compile: function(text) { return Hogan.compile(text) },
      render: function(template, data, options) { return template.render(data, options); },
    };

    var Env = function(options){
      var self = this;
      self.id = idSeq++;
      console.time("env.build" + self.id);
      for (var i in defaults) self[i] = defaults[i];
      for (var i in options) self[i] = options[i];
      self.sourceRoot = self.sourceRoot || (function(url){
        return url.split("/").slice(0, -1).join("/") + "/";
      })(location.pathname);

      self.components = {};
    };

    var proto = Env.prototype;
    proto.init = function(cb) {
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
    };
    proto.build = function($container, param, cb){
      var self = this;
      self.$root = $container || $(global.document);
      var componentName = self.$root.attr(COMPONENT_ATTR);
      if (componentName) {
        var c = new Component(componentName, self.$root, self);
        c.load(param, function(){
          console.timeEnd("env.build" + self.id);
          if (cb) cb();
        });
      } else {
        var c = new Component("", self.$root, self);
        c.loadChildren(function(){
          console.timeEnd("env.build" + self.id);
          if (cb) cb();
        });
      }
    };
    proto.resolveUrl = function(name) {
      if (name.indexOf("http") === 0 || name.indexOf("//") === 0) return name;
      return this.sourceRoot + ((name.indexOf("/") === 0) ? name.slice(1) : name);
    };
    proto.require = function(names, cb){
      var self = this;
      if (!Array.isArray(names)) {
        var url = self.resolveUrl(names);
        require(url, cb);
      } else {
        var urls = names.map(function(v){ return self.resolveUrl(v); });
        forEachAsync(urls, require, cb);
      }
    };
    proto.getTemplate = function(name, cb) {
      var self = this;
      var ext = name.split(".").pop();
      if (ext !== TMPL_EXT) {
        var $tmpl = self.$root.find('template[name="template_' + name + '"]');
        if ($tmpl.length > 0) {
          return cb($tmpl.html());
        }
      }
      var url = self.prefixTemplate + name + ((ext!=TMPL_EXT) ? ("." + TMPL_EXT) : "");
      self.require(url, cb);
    };
    proto.requireComponent = function(name, cb) {
      var self = this;
      var c = self.components[name];
      if (c) {
        cb(c);
      } else {
        var url = self.prefixComponent + name + ".js";
        requireComponentClass(self, url, function(){
          cb(self.components[name]);
        });
      }
    };

    return Env;
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
    __noImpl = function(fn) { fn(); };

    return Class.extend({
      init: function(name, $container, env){
        var self = this;
        self.name = name;
        self.$container = $container;
        self.env = env;
        self.id = idSeq++;
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
      load: function(param, cb){
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
                      if (cb) cb();
                    }, param);
                  }, param);
                }, param);
              }, param);
            }, param);
          }, param);
        }, param);
      },
      getData: __noImpl,
      getTemplate: function(cb, param) {
        var self = this;
        if (self.template) {
          cb(self.template);
        } else {
          self.env.getTemplate(self.templateName, function(template){
            if (!self.template) self.template = self.env.compile(template);
            cb(self.template);
          });
        }
      },
      render: function(data, partials, template, cb, param){
        var self = this;
        var contents = self.env.render(template, data, partials);
        self.$container.html(contents);
        cb();
      },
      afterRender: __noImpl,
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
        }, cb);
      },
      allLoaded: __noImpl,
      unload: function(){
        console.debug("unload called", this.name);
        this.unsubscribe();
      },

      publish: function(topic, data) { Pubsub.publish(topic, data, this); },
      subscribe: function(topic, cb){
        var self = this;
        self.subscribeList[topic] = Pubsub.subscribe(topic, function(topic, data, from){
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

  var currentEnv = null;
  var defineComponentClass = function(name, object, base) {
    if (!currentEnv) throw new Error("disallowed operation");
    currentEnv.components[name] = (base || Component).extend(object || {});
    //console.debug("register component class", name, "to env", currentEnv.id);
  };

  var requireComponentClass = (function(){
    var _queue = [];
    var next = function(){
      if (!_queue.length) return;
      var nameDict = {};
      var cbArray = [];
      while(_queue.length) {
        var task = _queue[0];
        var env = task[0], name = task[1], cb = task[2];
        if (!currentEnv) currentEnv = env;
        else if (env.id != currentEnv.id) break;
        _queue.shift();
        nameDict[name] = true;
        cbArray.push(cb);
      }
      (function(cbArray){
        var nameArray = [];
        for (var i in nameDict) nameArray.push(i);
        if (!nameArray.length) currentEnv = null;
        else {
          console.debug("requiring", nameArray.length, "components");
          forEachAsync(nameArray, function(name, cb){
            env.require(name, cb);
          }, function(){
            var i=0; len=cbArray.length;
            for (; i<len; ++i) cbArray[i]();
            currentEnv = null;
            next();
          });
        }
      })(cbArray);
    };

    return function(env, name, cb){
      _queue.push([env, name, cb]);
      setImmediate(next);
    };
  })();

  (function(){
    var F = global.F = {};

    F.Pubsub = Pubsub;
    F.Env = Env;
    F.ComponentBase = Component;

    F.component = defineComponentClass;
    F.createEnv = function(options, cb) {
      if (typeof(options) === "function") {
        cb = options;
        options = {};
      }
      var env = new Env(options);
      env.init(function(){
        cb(env);
      });
    };
  })();

})(window);

