(function(root){

  var Fractal = {};
  Fractal.env = {};
  Fractal.API_ROOT = "/";
  Fractal.SOURCE_ROOT = "";
  Fractal.REQUIRE_DATA_CACHE = true;

  // Settings
  Fractal.TOPIC = { // TODO should be TOPIC_"PREFIX"
    COMPONENT_LOADED_MYSELF: "Fractal.component.loaded.myself",
    COMPONENT_LOADED_CHILDREN: "Fractal.component.loaded.children",
    DATA_UPDATED: "Fractal.data.updated",
    DATASET_UPDATED: "Fractal.dataset.updated",
  };

  Fractal.PREFIX = {
    component: "",
    template: "",
    css: "",
    json: "",
    script: ""
  };

  // Objects
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

    return Class.extend({
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
            callback({loaded: success});
          });
        } else if (ext == "css") {
          var url = this.isAbs(resourceId) ? resourceId : this.getCSSUrl(resourceId);
          this.getCSS(url, function(success){
            callback({loaded: success});
          });
        } else if (ext == "tmpl") {
          var url = this.isAbs(resourceId) ? resourceId : this.getTemplateUrl(resourceId);
          this.getTemplate(url, function(err, data) {
            if (err) callback(null);
            else callback(data);
          });
        } else {
          var url = this.isAbs(resourceId) ? resourceId : this.getJSONUrl(resourceId);
          this.getJSON(url, function(err, data) {
            if (err) callback(null);
            else callback(data);
          });
        }
      }
    });
  })();
  Fractal.client = new Fractal.Client();
  Fractal.require = (function(){
    var requireDefault = (function(){
      var dataCache = {};
      var listeners = [];

      var updateData = function(name, data) {
        dataCache[name] = data;
        Fractal.Pubsub.publish(Fractal.TOPIC.DATA_UPDATED, name);
      };

      return function(resourceList, forcedRefresh, callback) {
        var updated = {};

        var __get = function(resource) {
          var d = new $.Deferred();
          if ((resource in dataCache) && !forcedRefresh) {
            if (dataCache[resource]) {
              return d.resolve();
            } else {
              if (!(resource in listeners))
                listeners[resource] = [];
              listeners[resource].push(d);
              return d.promise();
            }
          } else {
            dataCache[resource] = false;
            Fractal.client.getResource(resource, function(data){
              if (data) {
                console.debug("cached require " + resource);
                updateData(resource, data);
                updated[resource] = data;
              }
              if (resource in listeners){
                for (var i in listeners[resource]) {
                  listeners[resource][i].resolve();
                }
                delete listeners[resource];
              }
              return d.resolve();
            });
            return d.promise();
          }
        };

        var getList = resourceList.map(function(v){ return __get(v); });
        $.when.apply($, getList).done(function(){
          callback(dataCache, updated);
        });
      };
    })();

    var requireNoCache = function(resourceList, forcedRefresh, callback) {
      var retData = {};
      var total = resourceList.length;
      var complete = 0;
      resourceList.forEach(function(resource){
        Fractal.client.getResource(resource, function(data){
          if (data) {
            console.debug("require " + resource);
            retData[resource] = data;
          }
          complete++;
          if (complete == total) {
            callback(retData, retData);
          }
        });
      });
    };

    return function(resourceList, options, callback) {
      var returnSingle = false;
      if (typeof(resourceList) == "string") {
        returnSingle = true;
        resourceList = [resourceList];
      } else {
        if (resourceList.length == 0) {
          if (callback) callback({});
          return;
        }
      }
      if (typeof(options) == "function") {
        callback = options;
        options = null;
      }
      options = options || {};
      var nocache = options.nocache || (!Fractal.REQUIRE_DATA_CACHE);
      var _require = nocache ? requireNoCache : requireDefault;

      _require(resourceList, !!options.forced, function(data, updated) {
        for (var i in updated) {
          Fractal.Pubsub.publish(Fractal.TOPIC.DATASET_UPDATED, updated);
          break;
        }
        if (callback) {
          if (returnSingle) {
            data = data[resourceList[0]];
          }
          callback(data);
        }
      });
    };
  })();

  Fractal.Pubsub = (function() {
    var topics = {};
    var seq = 0;

    var Pubsub = {};
    Pubsub.publish = function(topic, data) {
      if (!topics[topic]) {
        // no listener
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
      return token;
    };
    Pubsub.unsubscribe = function(topic, token) {
      if (!topics[topic]) return;
      var subscribers = topics[topic];
      for (var i in subscribers) {
        if (subscribers[i].token === token) {
          subscribers.splice(i, 1);
          return;
        }
      }
    };

    return Pubsub;
  }());

  Fractal.components = {};
  Fractal.Component = (function(){
    var NOP = null;
    var compIdGen = 0;

    var getComponentJS = function(name) { return Fractal.PREFIX.component + name + ".js"; };

    var setLoad = function(self, func) {
      if (func && typeof(func) === "function") {
        if (!self.load) self.load = func.bind(self);
        else {
          var temp = self.load;
          self.load = function(callback){
            temp(function(){
              func.bind(self, callback)();
            });
          }
        }
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
      self._id = ++compIdGen;

      self.name = name;
      self.$container = $container;
      self.rendered = false;
      self.subscribeList = {};
      // // TODO implement if needed
      // self.children = [];
      // self.parent = null;

      setLoad(self, self.getData);
      setLoad(self, self.getTemplateFunc());
      setLoad(self, self.getRenderFunc());
      setLoad(self, self.afterRender);
      setLoad(self, self.onMyselfLoaded);
      setLoad(self, self.loadChildren);
      setLoad(self, self.onAllLoaded);

      setUnload(self, self.unload);
    };

    Component.getData = NOP;
    Component.afterRender = NOP;
    Component.onAllLoaded = NOP;
    Component.unload = function(){
      this.unsubscribe();
      delete Fractal.components[this._id];
    };
    Component.__getTemplate = function(callback) {
      var self = this;
      var resourceId = self.template || self.name;
      var $template = $('script[type="text/template"][id="template-' + resourceId + '"]');
      if ($template.length > 0) {
        self.templateContents = $template.html();
        callback();
      } else {
        Fractal.require(resourceId + ".tmpl", function(template){
          self.templateContents = template;
          callback();
        });
      }
    };
    Component.__getCompiledTemplate = function(callback) {
      var self = this;
      if (self.compiledTemplate) {
        callback();
      } else {
        self.__getTemplate(function(){
          if (!self.templateContents) {
            console.error("failed to load template" + this.name);
            self.compiledTemplate = null;
          } else {
            self.compiledTemplate = Hogan.compile(self.templateContents);
          }
          callback();
        });
      }
    };

    Component.getTemplateFunc = function(){
      if (this.getData === NOP) {
        return this.__getTemplate;
      } else {
        return this.__getCompiledTemplate;
      }
    };
    Component.getRenderFunc = function(){
      if (this.getData === NOP) {
        return function(callback) {
          var self = this;
          self.$container.html(self.templateContents);
          callback();
        };
      } else {
        return function(callback){
          var self = this;
          var html = self.compiledTemplate.render(self.data, self.partials);
          self.$container.html(html);
          callback();
        };
      }
    };
    Component.onMyselfLoaded = function(callback){
      this.rendered = true;
      Fractal.Pubsub.publish(Fractal.TOPIC.COMPONENT_LOADED_MYSELF, {name: this.name});
      callback();
    };
    Component.loadChildren = function(callback){
      var self = this;
      $subComponents = self.$container.find('[data-role=component]');
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
        var component = new window[name](name, $container);

        Fractal.components[component._id] = component;
        component.load(function(name){
          return __onChildLoaded();
        });
      };

      $subComponents.each(function(){
        var $subContainer = $(this);
        var name = $subContainer.data("name");
        if (name in window) { // load instantly if $component.js is already includes
          __initComponent(name, $subContainer);
        } else {
          var js = getComponentJS(name);
          Fractal.require(js, function(){ // create <script> and wait util ready
            if (!(name in window)) {
              console.error("Component object not found in " + js);
              __onChildLoaded(name); // TODO mark this as a failed load
            } else {
              __initComponent(name, $subContainer);
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

    return Class.extend(Component);
  })();

  // Usually used as the start point for constructing a webpage
  Fractal.construct = function(callback) {
    $.event.special.destroyed = {
      remove: function(o) {
        if (o.handler) {
          o.handler()
        }
      }
    }

    var rootComponent = new Fractal.Component("__ROOT__", $(document));
    rootComponent.loadChildren(callback);
  };

  Fractal.platform = (function(){
    if (window.location.href.indexOf("http") == 0) {
      return "www";
    }
    var isAndroid = !!(navigator.userAgent.match(/Android/i));
    var isIOS     = !!(navigator.userAgent.match(/iPhone|iPad|iPod/i));

    if (isAndroid) return "android";
    else if (isIOS) return "ios";
    else return "www";
  })();

  if (typeof define === 'function' && define.amd) {
    define(function () {
      return Fractal;
    });
  } else if (typeof module === 'object' && module.exports){
    module.exports = Fractal;
  } else {
    root.Fractal = Fractal;
  }

}(( typeof window === 'object' && window ) || this));
