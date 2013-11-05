(function(root){

  var Fractal = {};

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
    script: "",
  };

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

      getScriptUrl: function(name) { return Fractal.PREFIX.script + name; },
      getCSSUrl: function(name) { return Fractal.PREFIX.css + name; },
      getJSONUrl: function(name) { return Fractal.PREFIX.json + name; },
      getTemplateUrl: function(name) { return Fractal.PREFIX.template + name; },

      getJS: function(url, callback) {
        var el = document.createElement("script");
        el.src = url;
        AddElement(el, callback);
      },
      getCSS: function(url, callback) {
        var el = document.createElement("link");
        el.rel="stylesheet";
        el.href = url;
        AddElement(el, callback);
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
        } else if (ext == name || ext == "json") {
          var url = this.isAbs(resourceId) ? resourceId : this.getJSONUrl(resourceId);
          this.getJSON(url, function(err, data) {
            if (err) callback(null);
            else callback(data);
          });
        } else {
          console.warn("nothing to do with: " + resourceId);
          callback(null);
        }
      }
    });
  })();

  Fractal.client = new Fractal.Client();
  Fractal.require = (function(){
    var dataCache = {};
    var listeners = [];

    var updateData = function(name, data) {
      dataCache[name] = data;
      Fractal.publish(Fractal.TOPIC.DATA_UPDATED, name);
    };

    // Synchronically require external data (script or JSON data)
    // "resourceList" is the Array of URLs
    // Script: create <script src="xxx"></script> if not found in current document
    // Data:   synchronically return "resourceList" from cache (if cahed) or send an ajax request
    return function(resourceList, callback, forcedRefresh) {
      if (typeof resourceList == "string") resourceList = [resourceList];
      if (resourceList.length == 0) {
        if (callback) callback({});
        return;
      }

      var resourceUpdated = {};
      var retData = {};
      var __get = function(resource) {
        var d = new $.Deferred();
        if (resource in dataCache && !forcedRefresh) {
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
              console.debug("require " + resource);
              updateData(resource, data);
              resourceUpdated[resource] = data;
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

      var getList = [];
      $.each(resourceList, function (i, resource) {
        getList.push(__get(resource));
      });
      $.when.apply($, getList).done(function(){
        empty = true;
        for (var i in resourceUpdated){
          empty = false;
          break;
        }
        if (!empty) {
          Fractal.publish(Fractal.TOPIC.DATASET_UPDATED, resourceUpdated);
        }
        if (callback) callback(dataCache); // TODO just return what were requested ?
      });
    }
  })();

  Fractal.components = {};
  Fractal.Component = (function(){

    var getTemplate = function(resourceId, callback) {
      var $template = $('script[type="text/template"][id="' + resourceId + '"]');
      if ($template.length > 0) {
        callback($template.html());
      } else {
        var tmplQuery = resourceId + ".tmpl"
        Fractal.require([tmplQuery], function(data){
          callback(data[tmplQuery]);
        });
      }
    };
    var getComponentJS = function(name) { return Fractal.PREFIX.component + name + ".js"; };

    var components = Fractal.components;

    return Fractal.Class.extend({
      // constructor
      init: function(name, $container){
        var self = this;
        self.name = name;
        self.$container = $container;
        self.rendered = false;
        self.lazyLoad = false;
        // // TODO implement if needed
        // self.children = [];
        // self.parent = null;
      },
      // public / protected
      getData: function(callback) { setTimeout( function(){ callback({}); }, 0 ); },
      render: function(data, partials, callback) {
        var self = this;
        if (self.compiledTemplate) {
          var view = self.compiledTemplate.render(data, partials);
          self.$container.html(view);
          if (callback) callback();          
        } else {
          getTemplate(this.template || this.name , function(template){
            if (!template) {
              console.error("failed to load template" + this.name);
              if (callback) callback();
              return;
            }
            self.compiledTemplate = Hogan.compile(template);
            self.render(data, partials, callback);
          });
        }
      },
      afterRender: function(callback) { if (callback) callback(); },

      loadChildren: function(callback){
        var self = this;
        $subComponents = self.$container.find('[data-role=component]');
        var len = $subComponents.length;
        if (len == 0) {
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
            Fractal.publish(Fractal.TOPIC.COMPONENT_LOADED_CHILDREN, {name: self.name});
            if (callback) callback();
          }
        }

        var __initComponent = function(name, $container) {
          var component = new window[name](name, $container);
          components[name] = component;
          component.load(function(name){
            return __onChildLoaded();
          });
        };

        $subComponents.each(function(){
          var $subContainer = $(this);
          $subContainer.css("display", "inline");
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
      },

      load: function(callback) {
        var self = this;
        // console.time("Component.load " + self.name);
        self.getData(function(data, partials){
          self.render(data, partials, function(){
            self.afterRender(function(){
              // console.timeEnd("Component.load " + self.name);
              self.rendered = true;
              Fractal.publish(Fractal.TOPIC.COMPONENT_LOADED_MYSELF, {name: self.name});
              setTimeout(function(){
                self.loadChildren(function(){
                  if (callback) callback(self.name);
                });
              }, 0);
            });
          });
        });
      }
    });
  })(); // Fractal.Component

  // Usually used as the start point for constructing a website
  Fractal.construct = function(callback) {
    var rootComponent = new Fractal.Component("__ROOT__", $(document));
    rootComponent.loadChildren(callback);
  };

  // wrapper functions for pubsubjs
  // TODO pubsub feature is necessary, see if this is the best solution.
  Fractal.publish = function(topic, data) {
    data = data || null;
    PubSub.publish(topic, data);
  };

  Fractal.subscribe = function(topic, handler, checknow) {
    PubSub.subscribe(topic, handler);
  };

  Fractal.unsubscribe = function(token) {
    PubSub.unsubscribe(token);
  };

  Fractal.platform = (function(){
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
  }
  else if (typeof module === 'object' && module.exports){
    module.exports = Fractal;
  }
  else {
    root.Fractal = Fractal;
  }

}(( typeof window === 'object' && window ) || this));
