(function(root){
  __startup = [];
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
    else __startup.push(callback);
  };
  Fractal.ready =  function(){
    Fractal.__ready = true;
    __startup.forEach(function(v){v();});
    __startup = [];
  };
  // Settings
  Fractal.API_ROOT = "/";
  Fractal.SOURCE_ROOT = "";
  Fractal.DOM_PARSER = "//cdnjs.cloudflare.com/ajax/libs/jquery/2.1.1/jquery.min.js";
  Fractal.TEMPLATE_ENGINE = "//cdnjs.cloudflare.com/ajax/libs/hogan.js/3.0.0/hogan.js";
  Fractal.TOPIC = {
    COMPONENT_LOADED_MYSELF: "Fractal.component.loaded.myself",
    COMPONENT_LOADED_CHILDREN: "Fractal.component.loaded.children",
    DATA_UPDATED: "Fractal.data.updated"
  };
  Fractal.PREFIX = {
    component: "",
    template: "",
    css: "",
    json: "",
    script: ""
  };
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

  Fractal.Client = (function(){
    var AddElement = function(element, callback) {
      var __myTimer = setTimeout(function(){
        console.error("Timeout: adding " + element.src);
        callback(false); // require failed
      }, 10000);

      var container = document.getElementsByTagName("head")[0];
      {
        var done = false;
        element.onload = element.onreadystatechange = function(){
          if ( !done && (!this.readyState ||
            this.readyState == "loaded" || this.readyState == "complete") ) {
            done = true;
            clearTimeout(__myTimer);
            if (callback) callback(true);
            element.onload = element.onreadystatechange = null;
          }
        };
      }
      container.appendChild(element);
    };

    return Fractal.Class.extend({
      ajaxGet: function(url, options, callback) {
        var xhr = new XMLHttpRequest();
        xhr.open("GET", url, true);

        xhr.onreadystatechange = function () {
          if (xhr.readyState == 4) {
            if ((xhr.status == 200 || xhr.status == 0) && xhr.responseText) {
              callback(null, xhr.responseText);
            } else {
              console.error("unexpected server resposne: " + xhr.status + " " + url);
              callback(true, null);
            }
          }
        }

        if (options && options.contentType)
          xhr.setRequestHeader("Accept" , options.contentType);
        xhr.send("");
      },

      isAbs: function(url) {
        return (url.indexOf("/") == 0 || url.indexOf(".") == 0 || url.indexOf("http") == 0);
      },

      getScriptUrl: function(name) { return Fractal.SOURCE_ROOT + Fractal.PREFIX.script + name; },
      getCSSUrl: function(name) { return Fractal.SOURCE_ROOT + Fractal.PREFIX.css + name; },
      getJSONUrl: function(name) { return Fractal.API_ROOT + Fractal.PREFIX.json + name; },
      getTemplateUrl: function(name) { return Fractal.SOURCE_ROOT + Fractal.PREFIX.template + name; },

      getJS: function(url, callback) {
        var el = document.createElement("script");
        el.src = url;
        AddElement(el, callback);
      },
      getCSS: function(url, callback) {
        var el = document.createElement("link");
        el.rel="stylesheet";
        el.href = url;
        var container = document.getElementsByTagName("head")[0];
        container.appendChild(el);
        callback(true);
      },
      getJSON: function(url, callback) {
        this.ajaxGet(url, {contentType: "application/json"}, function(err, responseText){
          if (err) callback(err, responseText);
          else {
            var data = null;
            try {
              data = JSON.parse(responseText);
            } catch (e) {
              console.error("failed to parse responseText, url: " + url + ", res: " + responseText);
              callback(true, null);
            }
            callback(false, data);
          }
        });
      },
      getTemplate: function(url, callback) {
        this.ajaxGet(url, null, callback);
      },

      getResource: function(resourceId, callback) {
        var name = resourceId.split('/').pop();
        var ext = name.split('.').pop();
        if (ext == "js") {
          var url = this.isAbs(resourceId) ? resourceId : this.getScriptUrl(resourceId);
          this.getJS(url, function(success){
            callback(success);
          });
        } else if (ext == "css") {
          var url = this.isAbs(resourceId) ? resourceId : this.getCSSUrl(resourceId);
          this.getCSS(url, function(success){
            callback(success);
          });
        } else if (ext == "tmpl") {
          var url = this.isAbs(resourceId) ? resourceId : this.getTemplateUrl(resourceId);
          this.getTemplate(url, function(err, data) {
            if (err) callback(null);
            else callback(data);
          });
        // } else if (ext == name || ext == "json") {
        } else {
          var url = this.isAbs(resourceId) ? resourceId : this.getJSONUrl(resourceId);
          this.getJSON(url, function(err, data) {
            if (err) callback(null);
            else callback(data);
          });
        // } else {
        //   console.warn("nothing to do with: " + resourceId);
        //   callback(null);
        }
      }
    });
  })();
  Fractal.client = new Fractal.Client();
  Fractal.require = (function(){
    var requireDefault = (function(){
      var dataCache = {};
      var listeners = {};
      return function(resource, callback, forcedRefresh) {
        if ((resource in dataCache) && !forcedRefresh) {
          if (dataCache[resource]) {
            callback(dataCache[resource], true);
          } else {
            if (!(resource in listeners)) listeners[resource] = [];
            listeners[resource].push(callback);
          }
        } else {
          dataCache[resource] = false;
          Fractal.client.getResource(resource, function(data){
            if (data) {
              dataCache[resource] = data;
            }
            if (resource in listeners){
              listeners[resource].forEach(function(v){ v(data); });
              delete listeners[resource];
            }
            callback(data);
          });
        }
      };
    })();

    var requireNoCache = function(resource, callback) {
      Fractal.client.getResource(resource, callback);
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
            for(var i in updated) {
              Fractal.Pubsub.publish(Fractal.TOPIC.DATA_UPDATED, updated);
              break;
            }
          }
        }, !!options.forced);
      });
    };
  })();

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
  Fractal.getTemplate = function(templateName, callback){
    var $template = $('script[type="text/template"][id="template-' + templateName + '"]');
    if ($template.length > 0) {
      callback($template.html());
    } else {
      Fractal.require(templateName + ".tmpl", function(template){
        callback(template);
      });
    }
  };
  Fractal.Component = (function(){
    var ComponentFilter = '[data-role=component]';
    var NOP = null;
    var CompIdGen = 0;

    var getComponentJS = function(name) { return Fractal.PREFIX.component + name + ".js"; };

    var setLoad = function(self, func) {
      if (func && typeof(func) === "function") {
        var temp = self.load;
        self.load = function(callback) {
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
      self._id = ++CompIdGen;
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
      this.compiled = false;
      this.template = null;
    };
    Component.load = function(callback) {
      this.$contents = null;
      callback();
    };
    Component.getData = NOP;
    Component.afterRender = NOP;
    Component.onAllLoaded = NOP;
    Component.unload = function(){
      console.debug("unload component", this.name);
      this.unsubscribe();
    };
    Component.getTemplate = function(callback) {
      var self = this;
      if (self.template) {
        if (!self.compiled) {
          self.template = Hogan.compile(self.template);
          self.compiled = true;
        }
        callback();
      } else {
        Fractal.getTemplate(self.templateName || self.name, function(template){
          self.template = template;
          self.getTemplate(callback);
        });
      }
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
        component.load(function(name){
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

    return Fractal.Class.extend(Component);
  })();
  Fractal.Components = {};

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

