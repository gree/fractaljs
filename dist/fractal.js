// Source: src/interface.js
(function(global){
  var ready = false, readyListeners = [], namespace = {};

  var F = global.Fractal = global.F = function(arg1, arg2){
    var callback = null;

    if (typeof(arg1) === 'function') {
      // 'onready' event handler
      callback = arg1;
    } else if (typeof(arg1) === 'string' && arg2) {
      // define an object
      var name = arg1, object = arg2;
      callback = function(){
        namespace.define(name, object);
      };
    }

    if (!callback) {
      return;
    }
    if (ready) {
      return callback();
    }
    readyListeners.push(callback);
  };

  F.__ = namespace;

  F.init = function(callback) {
    if (readyListeners && readyListeners.length) {
      readyListeners.forEach(function(v){
        v(namespace);
      });
      readyListeners = [];
    }
    ready = true;

    F.Component = namespace.Component;
    F.Env = namespace.Env;

    callback();
  };

  F.construct = function(env, callback){
    if (typeof(env) === "function") {
      callback = env;
      env = null;
    }
    if (!env) env = new namespace.Env();
    env.setup(function(){
      var c = new F.Component("", $(global.document), env);
      c.loadChildren(function(){
        console.timeEnd("F.construct");
        if (callback) {
          callback();
        }
      });
    });
  };

})(window);


// Source: src/utils.js
F(function(namespace){
  namespace.forEachAsync = function(items, asyncCall, done) {
    var len = items.length;
    if (!len) return done();
    var i = 0, complete = 0;
    for (; i<len; ++i) {
      asyncCall(items[i], function(){
        if (++complete === len) done();
      });
    }
  };

  namespace.createAsyncCall = function(){
    var listeners = {};

    var releaseListeners = function(key, result) {
      //console.debug("asyncCall", key, "releaselisteners", listeners[key].length);
      var q = listeners[key];
      delete listeners[key];
      q.forEach(function(v){
        v(result);
      });
    };

    return function(key, main, param, callback) {
      if (key in listeners) {
        listeners[key].push(callback);
        return;
      }
      var timeout = setTimeout(function(){
        console.error('asyncCall timeout: ' + key);
        releaseListeners(key);
      }, 20000);

      listeners[key] = [callback];

      main(key, param, function(result){
        clearTimeout(timeout);
        releaseListeners(key, result);
      });
    }
  };

  namespace.defineClass = function(type){
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

  namespace.isClass = function(object, type) {
    if (!object.getType) return false;
    if (!type) return true
    return object.getType() === type;
  };

  namespace.ClassType = {
    COMPONENT: 1,
    ENV: 2
  };

});


// Source: src/require.js
F(function(namespace){
  var TYPE = namespace.ClassType, createAsyncCall = namespace.createAsyncCall;

  var getResourceType = (function(){
    var KNOWN_TYPES = {js:1, css:1, tmpl:1};
    return function(name) {
      var type = name.split(".").pop();
      return (type in KNOWN_TYPES) ? type : "tmpl";
    };
  })();

  (function(){
    var data = null,
    dataOwner = null,
    refCount = 0,
    queue = [];

    var release = function(name){
      if (name !== dataOwner) return false;
      --refCount;
      var refCopy = data;
      data = {};
      if (refCount === 0) {
        dataOwner = null;
        refCount = 0;
      }
      return refCopy;
    };

    var lock = function(name) {
      if (!dataOwner || dataOwner === name) {
        dataOwner = name;
        ++refCount;
        data = {};
        return true;
      } else {
        return false;
      }
    };

    var loadObjects = (function(){
      var asyncCall = createAsyncCall();

      var main = function(url, name, callback) {
        if (lock(name)) {
          require(url, function(){
            var data = release(name);
            if (queue.length) queue.shift()();
            callback(data);
          });
        } else {
          queue.push(function(){
            main(url, name, callback);
          });
        }
      };

      return function(name, url, callback) {
        asyncCall(url, main, name, callback);
      };
    })();

    namespace.define = function(name, constructor) {
      data[name] = constructor;
    };

    namespace.requireComponent = function(envName, url, callback) {
      loadObjects(TYPE.COMPONENT + "." + envName, url, callback);
    };

    namespace.requireEnv = function(url, callback) {
      loadObjects(TYPE.ENV, url, callback);
    };
  })();

  var require = namespace.require = (function(){
    var byAddingElement = function(element, callback) {
      var done = false;
      element.onload = element.onreadystatechange = function(){
        var state = this.readyState;
        if ( !done && (!state || state == "loaded" || state == "complete") ) {
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
          var err, data, status = xhr.status, res = xhr.responseText;
          if ((status === 200 || status === 0) && res) {
            callback(false, res);
          } else {
            callback("unexpected server resposne: " + status);
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
      var cache = {};
      var asyncCall = createAsyncCall();

      var main = function(url, param, callback) {
        var type = getResourceType(url);
        Type2Getter[type](url, function(err, data) {
          if (err) {
            console.error('Require error: ' + err);
          }
          cache[url] = data;
          callback(data);
        });
      };

      return function(url, callback) {
        if (url in cache) {
          return callback(cache[url]);
        }
        asyncCall(url, main, null, callback);
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
});


// Source: src/pubsub.js
F(function(namespace){
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
});


// Source: src/env.js
F(function(namespace){
  // import
  var isClass = namespace.isClass,
  ENV = namespace.ClassType.ENV,
  createAsyncCall = namespace.createAsyncCall,
  require = namespace.require;

  var EnvDescs = {};

  var protocol = (function(protocol){
    return (protocol === "file:") ? "http:" : protocol;
  })(window.location.protocol);

  var Env = namespace.Env = namespace.defineClass(ENV).extend({
    PrefixComponent: "/",
    PrefixTemplate: "/",
    Envs: {},
    Requires: [],

    DomParser: protocol + "//cdnjs.cloudflare.com/ajax/libs/jquery/2.1.1/jquery.min.js",
    TemplateEngine: protocol + "//cdnjs.cloudflare.com/ajax/libs/hogan.js/3.0.0/hogan.js",
    compile: function(text) { return Hogan.compile(text) },
    render: function(template, data, options) { return template.render(data, options); },

    init: function(name, url) {
      var self = this;
      self.__name = name;
      self.SourceRoot = self.SourceRoot || (function(url){
        return url.split("/").slice(0, -1).join("/") + "/";
      })(url || window.location.pathname);

      for (var i in self.Envs) {
        EnvDescs[i] = self.resolveUrl(self.Envs[i]);
      }
      self.asyncCall = createAsyncCall();
      self.components = {};
    },

    resolveUrl: function(name) {
      if (name.indexOf("http") === 0 || name.indexOf("//") === 0) return name;
      return this.SourceRoot + ((name.indexOf("/") === 0) ? name.slice(1) : name);
    },
    getName: function(){ return this.__name },
    setup: function(callback) {
      var self = this;
      self.require([self.DomParser, self.TemplateEngine], function(){
        $.event.special.destroyed = {
          remove: function(o) {
            if (o.handler) o.handler();
          }
        };
        self.require(self.Requires, function(){
          callback();
        });
      });
    },
    require: function(names, callback){
      var self = this;
      if (!Array.isArray(names)) {
        require(self.resolveUrl(names), callback);
      } else {
        require(names.map(function(v){ return self.resolveUrl(v); }), callback);
      }
    },
    getTemplate: (function(){
      var main = function(name, param, callback) {
        var self = this;
        self.require(name, function(data){
          callback(self.compile(data));
        });
      };
      return function(name, callback) {
        var self = this;
        self.asyncCall(self.PrefixTemplate + name + ".tmpl", main.bind(self), null, callback);
      };
    })(),
    getComponentClass: (function(){
      var main = function(name, param, callback) {
        var self = this;
        var url = self.resolveUrl(self.PrefixComponent + name + ".js");
        namespace.requireComponent(self.__name, url, function(components){
          for (var i in components) {
            self.components[i] = components[i];
          }
          callback(components[name]);
        });
      };

      return function(fullName, callback) {
        var self = this;
        var componentName;

        if (fullName.indexOf(":") >= 0) {
          var parts = fullName.split(":");
          componentName = parts[1];
          if (parts[0] !== self.__name) {
            resolveEnv(parts[0], function(env){
              env.getComponentClass(componentName, callback);
            });
            return;
          }
        } else {
          componentName = fullName;
        }

        var components = self.components;
        if (componentName in components) {
          return callback(components[componentName], componentName, self);
        }
        self.asyncCall(componentName, main.bind(self), null, function(constructor){
          callback(constructor, componentName, self);
        });
      };
    })(),
  });

  var resolveEnv = (function(){
    var cache = {}, asyncCall = createAsyncCall();

    var createEnv = function(constructor, name, url, callback) {
      var env = new constructor(name, url);
      env.setup(function(){
        cache[name] = env;
        callback(env);
      });
    };

    var main = function(envName, param, callback) {
      if (!(envName in EnvDescs)) throw new Error("unknown env name: " + envName);
      var url = EnvDescs[envName];
      var ext = url.split(".").pop();
      if (ext !== "js") {
        if (url[url.length - 1] !== "/") url += "/";
        createEnv(Env, envName, url, callback);
      } else {
        namespace.requireEnv(url, function(constructors){
          var constructor = constructors[envName];
          createEnv(constructor, envName, url, callback);
        });
      }
    };

    return function(envName, callback) {
      if (envName in cache) {
        return callback(cache[envName]);
      }
      asyncCall(envName, main, null, callback);
    };
  })();
});


// Source: src/component.js
F(function(namespace){
  // import
  var isClass = namespace.isClass,
  pubsub = namespace.Pubsub,
  COMPONENT = namespace.ClassType.COMPONENT;

  var ComponentFilter = "[data-role=component]";
  var __defaultLoadHandler = function(callback, param) { callback(); };

  var getConstructor = function(constructor, env, callback) {
    if (isClass(constructor, COMPONENT)) {
      callback(constructor);
    } else {
      constructor(env, callback);
    }
  };

  namespace.Component = namespace.defineClass(COMPONENT).extend({
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
      if (typeof(self.template) === "string") self.template = self.F.compile(self.template);

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
      var self = this;
      if (methodName.indexOf(":") < 0) {
        methodName = self.F.getName() + ":" + methodName;
      }
      self.publish(methodName, data, self);
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
      if (self.template) {
        return callback();
      }

      var $tmpl = self.$('script[type="text/template"]');
      if ($tmpl.length > 0) {
        self.template = self.F.compile($tmpl.html());
        return callback();
      }

      self.F.getTemplate(self.templateName || self.name, function(template){
        self.template = template;
        callback();
      });
    },
    render: function(data, partials, callback, param){
      var self = this;
      var contents = self.F.render(self.template, data, partials);
      self.$container.html(contents);
      callback();
    },
    afterRender: __defaultLoadHandler,
    myselfLoaded: function(callback, param){
      var earlyRecieved = this.earlyRecieved;
      while (earlyRecieved.length > 0) {
        earlyRecieved.pop()();
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
        var fullName = $container.data("name");
        self.F.getComponentClass(fullName, function(constructor, componentName, env){
          getConstructor(constructor, env, function(constructor){
            if (!isClass(constructor, COMPONENT)) {
              throw new Error("unexpected component class: " + env.getName() + ":" + componentName);
            }
            var c = new constructor(componentName, $container, env);
            c.load(param, cb);
          });
        });
      }, function(){
        if (callback) callback();
      })
    },
    allLoaded: __defaultLoadHandler,
    unload: function(){ this.unsubscribe(); },

    require: function(name, options, callback) { this.F.require(name, options, callback); },
    publish: function(topic, data) { pubsub.publish(topic, data, this); },
    subscribe: function(topic, callback){
      var self = this;
      self.subscribeList[topic] = pubsub.subscribe(topic, function(topic, data, from){
        if (self.rendered) callback(topic, data, from);
        else self.earlyRecieved.push(function(){ callback(topic, data, from); });
      });
    },
    unsubscribe: function(topic) {
      var list = this.subscribeList;
      if (!topic) {
        for (var i in list) pubsub.unsubscribe(i, list[i]);
      } else {
        if (topic in list) pubsub.unsubscribe(topic, list[topic]);
      }
    },
  });
});

