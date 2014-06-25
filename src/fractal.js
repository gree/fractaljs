(function(root){
  var Fractal = function(){
    var callback = null;
    if (typeof arguments[0] === 'function') {
      callback = arguments[0];
    } else if (typeof arguments[0] === 'string' && typeof arguments[1] === 'function') {
      var name = arguments[0], component = arguments[1];
      callback = function(){ Fractal.Components[name] = component; };
    }
    if (!callback) return;
    if (Fractal.__ready) callback();
    else {
      if (!Fractal.__startup) Fractal.__startup = [];
      Fractal.__startup.push(callback);
    }
  };
  Fractal.ready =  function(){
    Fractal.ready = null;
    Fractal.__ready = true;
    if (Fractal.__startup) {
      Fractal.__startup.forEach(function(v){ v(); });
      Fractal.__startup = [];
    }
  };
  // Settings
  Fractal.API_ROOT = window.location.pathname;
  Fractal.SOURCE_ROOT = Fractal.API_ROOT;
  Fractal.DOM_PARSER = "//cdnjs.cloudflare.com/ajax/libs/jquery/2.1.1/jquery.min.js";
  Fractal.TEMPLATE_ENGINE = "//cdnjs.cloudflare.com/ajax/libs/hogan.js/3.0.0/hogan.js";
  Fractal.TOPIC = {
    COMPONENT_LOADED_MYSELF: "Fractal.component.loaded.myself",
    COMPONENT_LOADED_CHILDREN: "Fractal.component.loaded.children",
    DATA_UPDATED: "Fractal.data.updated"
  };
  Fractal.PREFIX = {}; // component, template
  // get external resources
  Fractal.require = (function(){
    var byAddingElement = function(element, callback) {
      var __myTimer = setTimeout(function(){
        console.error("Timeout: adding " + element.src);
        callback(true, false); // err, result
      }, 10000);
      var container = document.getElementsByTagName("head")[0];
      {
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
      }
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
    var getType = (function(){
      var ExtType = { "js": "script", "css": "css", "tmpl": "template" };
      return function(resourceId) {
        var ext = resourceId.split('.').pop();
        return ExtType[ext] || "json";
      };
    })();
    var getUrl = function(type, name) {
      if (name.indexOf("http") === 0 || name.indexOf("//") === 0) return name;
      if (name.indexOf(".") === 0) return window.location.pathname + name;
      var base = (type === "json") ? Fractal.API_ROOT : Fractal.SOURCE_ROOT;
      if (name.indexOf("/") === 0) return base + name.slice(1);
      return base + (Fractal.PREFIX[type] || "") + name;
    };
    var Type2Getter = {
      "script": function(url, callback) {
        var el = document.createElement("script");
        el.src = url;
        byAddingElement(el, callback);
      },
      "css": function(url, callback) {
        var el = document.createElement("link");
        el.rel="stylesheet";
        el.href = url;
        byAddingElement(el, callback);
      },
      "template": byAjax,
      "json": function(url, callback){
        byAjax(url, {contentType: "application/json"}, function(err, responseText){
          if (err) callback(err, responseText);
          else {
            var data = null;
            try {
              data = JSON.parse(responseText);
            } catch (e) {
              console.error("failed to parse responseText, url: " + url + ", res: " + responseText);
              callback(true, false);
            }
            callback(false, data);
          }
        });
      },
    };
    var getResource = function(resourceId, callback) {
      var type = getType(resourceId);
      var url = getUrl(type, resourceId);
      Type2Getter[type](url, callback);
    };

    var requireDefault = (function(){
      var dataCache = {};
      var listeners = {};

      var __require = function(resource, callback, options){
        dataCache[resource] = null;
        getResource(resource, function(err, data){
          if (!err) dataCache[resource] = {seq: options.setSeq || Seq.get(), data: data};
          if (resource in listeners) {
            listeners[resource].forEach(function(v){ v(data); });
            delete listeners[resource];
          }
          callback(data);
        });
      };

      return function(resource, callback, options) {
        if (resource in dataCache) {
          if (dataCache[resource]) {
            if (dataCache[resource].seq >= Seq.get()) callback(dataCache[resource].data, true);
            else __require(resource, callback, options);
          } else {
            if (!(resource in listeners)) listeners[resource] = [];
            listeners[resource].push(callback);
          }
        } else {
          __require(resource, callback, options);
        }
      };
    })();

    var requireNoCache = function(resource, callback) {
      getResource(resource, function(err, data){ callback(data); });
    };

    return function(resourceList, options, callback) {
      var wantarray = true;
      if (typeof(resourceList) === "string") {
        wantarray = false;
        resourceList = [resourceList];
      } else {
        if (!resourceList.length) {
          if (callback) callback({});
          return;
        }
      }
      if (typeof(options) === "function") {
        callback = options;
        options = null;
      }
      options = options || {};
      var myRequire = (!!options.nocache) ? requireNoCache : requireDefault;

      var total = resourceList.length;
      var complete = 0;
      var retData = {};
      var updated = {};
      resourceList.forEach(function(v){
        myRequire(v, function(data, cached){
          if (!cached) updated[v] = true;
          retData[v] = data;
          if ((++complete) === total) {
            if (callback) callback(wantarray ? retData : retData[resourceList[0]]);
            for(var i in updated) { // if (updated is not empty)
              Fractal.Pubsub.publish(Fractal.TOPIC.DATA_UPDATED, updated);
              break;
            }
          }
        }, options);
      });
    };
  })();
  // Objects
  Fractal.Class = (function(){
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
  Fractal.getTemplate = (function(){
    var __get = function(templateName, callback){
      var $template = $('script[type="text/template"][id="template-' + templateName + '"]');
      if ($template.length > 0) {
        callback(Hogan.compile($template.html()));
      } else {
        Fractal.require(templateName + ".tmpl", function(template){
          callback(Hogan.compile(template));
        });
      }
    };
    return function(templateNames, callback){
      if (typeof(templateNames) === "string") return __get(templateNames, callback);
      var results = {}, total = templateNames.length, complete = 0;
      templateNames.forEach(function(v){
        __get(v, function(data){
          results[v] = data;
          if (++complete === total) callback(results);
        });
      });
    };
  })();

  var Seq = {
    __seq: 1,
    __last: (+new Date),
    get: function(){ return Seq.__seq; },
    increment: function(){
      var now = +new Date;
      if (now - Seq.__last > 500) {
        ++Seq.__seq;
        Seq.__last = now;
      }
    },
  };
  Fractal.Component = (function(){
    var ComponentFilter = '[data-role=component]';
    var NOP = null;
    var getComponentJS = function(name) { return Fractal.PREFIX.component + name + ".js"; };

    var setLoad = function(self, func) {
      if (func && typeof(func) === "function") {
        var temp = self.__load;
        self.__load = function(callback) {
          temp.bind(self)(func.bind(self, callback));
        };
      }
    };
    var setUnload = function(self, func) {
      if (func && typeof(func) === "function") {
        self.$container.on("destroyed", func.bind(self));
      }
    };

    var Component = {};
    Component.init = function(name, $container){
      var self = this;
      self.$container = $container;
      var resetDisplay = self.$container.data("display");
      if (resetDisplay) self.$container.css("display", resetDisplay);
      self.loadOnce = self.loadOnce || (self.$container.attr("load-once") === "true");

      self.name = name;
      self.rendered = false;
      self.subscribeList = {};
      // // TODO implement if needed
      // self.children = [];
      // self.parent = null;
      self.templateName = self.templateName || self.name;
      if (self.template && typeof(self.template) === "string")
        self.template = Hogan.compile(self.template);

      setLoad(self, self.getData);
      setLoad(self, self.getTemplate);
      setLoad(self, self.getRenderFunc());
      setLoad(self, self.afterRender);
      setLoad(self, self.onMyselfLoaded);
      setLoad(self, self.loadChildren);
      setLoad(self, self.onAllLoaded);

      if (!self.loadOnce) setUnload(self, self.unload);
    };
    Component.setTemplate = function(name) {
      this.templateName = name;
      this.template = null;
    };
    Component.__load = function(callback) {
      this.$contents = null;
      callback();
    };
    Component.load = function(callback) {
      Seq.increment();
      this.__load(callback);
    };
    Component.getData = NOP;
    Component.afterRender = NOP;
    Component.onAllLoaded = NOP;
    Component.unload = function(){
      this.unsubscribe();
    };
    Component.getTemplate = function(callback) {
      var self = this;
      if (self.template) return callback();
      Fractal.getTemplate(self.templateName || self.name, function(template){
        self.template = template;
        callback();
      });
    };
    Component.getRenderFunc = function(){
      var self = this;
      var __render = function(){ return self.template.render(self.data, self.partials).trim(); };
      if (self.loadOnce) {
        return function(callback){
          var $html = $($.parseHTML(__render()));
          self.$container.replaceWith($html);
          self.$contents = $html;
          callback();
        };
      } else {
        return function(callback) {
          self.$container.html(__render());
          self.$contents = self.$container.contents();
          callback();
        }
      }
    };
    Component.onMyselfLoaded = function(callback){
      this.rendered = true;
      if (this.loadOnce) this.load = NOP;
      Fractal.Pubsub.publish(Fractal.TOPIC.COMPONENT_LOADED_MYSELF, {name: this.name});
      callback();
    };
    Component.loadChildren = function(callback){
      var self = this;
      if (!self.$contents) self.$contents = self.$container.contents();
      $subComponents = self.$contents.find(ComponentFilter).andSelf().filter(ComponentFilter);
      var len = $subComponents.length;
      if (len == 0) {
        Fractal.Pubsub.publish(Fractal.TOPIC.COMPONENT_LOADED_CHILDREN, {name: self.name});
        if (callback) callback();
        return;
      }
      // start to load children
      var finished = 0;
      var __onChildLoaded = function(err){
        if (err) {
          console.error("Failed to load component: " + err);
        }
        if (++finished == len) {
          Fractal.Pubsub.publish(Fractal.TOPIC.COMPONENT_LOADED_CHILDREN, {name: self.name});
          if (callback) callback();
        }
      };

      var __initComponent = function(name, $container) {
        var component = new Fractal.Components[name](name, $container);
        component.__load(function(name){
          return __onChildLoaded();
        });
      };

      $subComponents.each(function(){
        var $subContainer = $(this);
        var name = $subContainer.data("name");
        if (name in Fractal.Components) { // load instantly if $component.js is already included
          __initComponent(name, $subContainer);
        } else {
          var js = getComponentJS(name);
          Fractal.require(js, function(){ // create <script> and wait util ready
            if (name in Fractal.Components) {
              __initComponent(name, $subContainer);
            } else {
              console.error("Component object not found in " + js);
              __onChildLoaded(name); // TODO mark this as a failed load
            }
          });
        }

      });
    };

    Component.publish = function(topic, data) {
      data = data || null;
      Fractal.Pubsub.publish(topic, data);
    };
    Component.subscribe = function(topic, callback){
      var self = this;
      var token = Fractal.Pubsub.subscribe(topic, callback);
      this.subscribeList[topic] = token;
    };
    Component.unsubscribe = function(topic) {
      if (!topic) {
        for (var i in this.subscribeList) {
          Fractal.Pubsub.unsubscribe(i, this.subscribeList[i]);
        }
      } else {
        if (topic in this.subscribeList) {
          Fractal.Pubsub.unsubscribe(topic, this.subscribeList[topic]);
        }
      }
    };
    Fractal.Components = {};
    return Fractal.Class.extend(Component);
  })();

  Fractal.construct = function(callback){
    Fractal.construct = null;
    Fractal.require([Fractal.DOM_PARSER, Fractal.TEMPLATE_ENGINE], function(){
      $.event.special.destroyed = {
        remove: function(o) {
          if (o.handler) o.handler();
        }
      }
      var c = new Fractal.Component("__ROOT__", $(document));
      c.loadChildren(callback);
    });
  };
  // pub-sub
  Fractal.Pubsub = (function() {
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
    var Pubsub = {};
    var stock = new Stock();
    Pubsub.publish = function(topic, data) {
      if (!topics[topic]) {
        stock.add(topic, data);
        return;
      }
      var subscribers = topics[topic];
      for (var i in subscribers) {
        subscribers[i].callback(topic, data);
      }
      return;
    };
    Pubsub.subscribe = function(topic, callback) {
      if (!topics[topic]) {
        topics[topic] = [];
      }
      var token = ++seq;
      topics[topic].push({
        token: token,
        callback: callback
      });

      var data = stock.get(topic);
      if (data) callback(topic, data);

      return token;
    };
    Pubsub.unsubscribe = function(topic, token) {
      if (!(topic in topics)) return;
      var subscribers = topics[topic];
      for (var i in subscribers) {
        if (subscribers[i].token === token) {
          subscribers.splice(i, 1);
          break;
        }
      }
      if (subscribers.length === 0)
        delete topics[topic];
    };
    return Pubsub;
  }());

  if (typeof define === 'function' && define.amd) {
    define(function () {
      return Fractal;
    });
  } else if (typeof module === 'object' && module.exports){
    module.exports = Fractal;
  } else {
    root.Fractal = Fractal;
  }

  Fractal.ready();
}(( typeof window === 'object' && window ) || this));
