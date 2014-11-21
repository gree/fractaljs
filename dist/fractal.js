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

      F.Component = F.__.Component;

      if (readyListeners && readyListeners.length) {
        readyListeners.forEach(function(v){ v(); });
        readyListeners = [];
      }
      ready = true;
      var c = new F.Component("__ROOT__", $(global.document), env);
      c.loadChildren(function(){
        console.timeEnd("F.construct");
        if (callback) callback();
      });
    });
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
  var getResourceType = (function(){
    var KNOWN_TYPES = {js:1, css:1, tmpl:1};
    return function(name) {
      var type = name.split(".").pop();
      return (type in KNOWN_TYPES) ? type : "tmpl";
    };
  })();

  namespace.ObjectLoader = (function(){
    // var data = null;
    // var queue = [];

    // var lock = {
    //   get: function(){
    //     if (!data) {
    //       data = {};
    //       return true;
    //     }
    //     return false;
    //   },
    //   release: function(){
    //     data = null;
    //   },
    // };

    // var lockedCall = function(func) {
    //   if (!lock.get()) {
    //     queue.push(func);
    //     return false;
    //   } else {
    //     func(function(){
    //       lock.release();
    //       if (queue.length) {
    //         lockedCall(queue.shift());
    //       }
    //     });
    //     return true;
    //   }
    // };

    data = {}; // TODO remove me
    return {
      component: {
        define: function(name, constructor) {
          data.components[name] = constructor;
        },
        load: function(url, callback) {
          // var res = lockedCall(function(lockedCallback){
          //   data.components = {};
          //   namespace.require(url, function(){
          //     var components = data.components;
          //     lockedCallback();
          //     callback(components);
          //   });
          // });
          // console.debug("lockedCall", url, res);
          data.components = {};
          namespace.require(url, function(){
            var components = data.components;
            callback(components);
          });
        },
      },
      config: {
        define: function(config) {
          data.config = config;
        },
        load: function(url, callback) {
          // lockedCall(function(lockedCallback){
          //   namespace.require(url, function(){
          //     var config = data.config;
          //     lockedCallback();
          //     callback(config);
          //   });
          // });
          namespace.require(url, function(){
            var config = data.config;
            callback(config);
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

      var releaseListeners = function(url, data) {
        listeners[url].forEach(function(v){
          v(data);
        });
        delete listeners[url];
      };

      return function(url, callback) {
        if (url in cache) {
          callback(cache[url]);
          return;
        }
        if (url in listeners) {
          listeners[url].push(callback);
          return;
        }

        var timeout = setTimeout(function(){
          console.error('Require timeout: ' + url);
          releaseListeners(url);
        }, 10000);
        listeners[url] = [callback];
        var type = getResourceType(url);
        Type2Getter[type](url, function(err, data) {
          clearTimeout(timeout);
          if (err) {
            console.error('Require error: ' + err);
          } else {
            cache[url] = data;
          }
          releaseListeners(url, data);
        });
      };
    })();

    return function(urlList, callback) {
      if (!Array.isArray(urlList)) {
        return singleRequire(urlList, callback);
      }
      if (!urlList.length) return callback();
      var retData = {};
      namespace.forEachAsync(
        urlList,
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
          env.getComponentClass(componentName, callback);
        });
      } else {
        if (name in self.components) {
          callback(self.components[name], name, self);
        } else {
          var url = self.resolveUrl(self.Prefix.Component + name + ".js");
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
                  throw new Error("component " + name + " is not found in " + url);
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
    return function(env, envName, callback) {
      if (!envName) return callback(namespace.defaultEnv);
      if (envName in envs) return callback(envs[envName]);
      if (!(envName in EnvDescs)) throw new Error("unknown env name: " + envName);

      var onEnvLoaded = function(env) {
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
        namespace.ObjectLoader.config.load(descUrl, function(config){
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

  var ComponentFilter = "[data-role=component]";
  var __defaultLoadHandler = function(callback, param) { callback(); };

  namespace.Component = Class.extend({
    init: function(name, $container, env){
      var self = this;
      self.name = name;
      self.$container = $container;
      self.F = env;
      self.fullName = self.F.getName() + ":" + name;

      self.$ = self.$container.find.bind(self.$container);
      var resetDisplay = self.$container.data("display");
      if (resetDisplay) self.$container.css("display", resetDisplay);
      self.$container.on("destroyed", self.unload.bind(self));

      self.rendered = false;
      self.subscribeList = {};
      self.earlyRecieved = [];
      // TODO implement if needed
      // self.children = [];
      // self.parent = null;
      self.templateName = self.templateName || self.name;
      if (typeof(self.template) === "string") self.template = self.F.Template.Compile(self.template);

      var publicMethods = self.Public || {};
      for (var i in publicMethods) {
        (function(topic, method){
          self.subscribe(topic, function(topic, data, from){
            method.bind(self)(data, from);
          });
        })(self.fullName + "." + i, publicMethods[i]);
      }
    },
    call: function(methodName, data) {
      if (methodName.indexOf(":") < 0) {
        methodName = this.F.getName() + ":" + methodName;
      }
      this.publish(methodName, data, this);
    },
    load: function(param, callback){
      var self = this;
      param = param || {};
      self.getData(function(data, partials){
        self.getTemplate(function(){
          self.render(data, partials, function() {
            self.afterRender(function(){
              self.rendered = true;
              self.myselfLoaded(function(){
                self.loadChildren(function(){
                  self.allLoaded(function(){
                    console.timeEnd(self.fullName);
                    if (callback) callback();
                  }, param);
                }, param);
              }, param);
            }, param);
          }, param);
        }, param);
      }, param);
    },

    getData: __defaultLoadHandler,
    getTemplate: function(callback, param) {
      var self = this;
      if (self.template) return callback();
      self.F.getTemplate(self.templateName || self.name, function(template){
        self.template = template;
        callback();
      });
    },
    render: function(data, partials, callback, param){
      var contents = this.F.Template.Render(this.template, data, partials);
      this.$container.html(contents);
      callback();
    },
    afterRender: __defaultLoadHandler,
    myselfLoaded: function(callback, param){
      while (this.earlyRecieved.length > 0) {
        this.earlyRecieved.pop()();
      }
      callback();
    },
    loadChildren: function(callback, param){
      var self = this;
      var components = self.$(ComponentFilter);
      var len = components.length;
      if (!len) {
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
        if (callback) callback();
      })
    },
    allLoaded: __defaultLoadHandler,
    unload: function(){ this.unsubscribe(); },

    require: function(name, options, callback) { this.F.require(name, options, callback); },
    publish: function(topic, data) { namespace.Pubsub.publish(topic, data, this); },
    subscribe: function(topic, callback){
      var self = this;
      self.subscribeList[topic] = namespace.Pubsub.subscribe(topic, function(topic, data, from){
        if (self.rendered) callback(topic, data, from);
        else self.earlyRecieved.push(function(){ callback(topic, data, from); });
      });
    },
    unsubscribe: function(topic) {
      if (!topic) {
        for (var i in this.subscribeList) namespace.Pubsub.unsubscribe(i, this.subscribeList[i]);
      } else {
        if (topic in this.subscribeList) namspace.Pubsub.unsubscribe(topic, this.subscribeList[topic]);
      }
    },
  });
})(window.F.__);

