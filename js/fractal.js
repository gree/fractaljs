(function(root){

  var Fractal = {};

  Fractal.TOPIC = { // TODO should be TOPIC_"PREFIX"
    COMPONENT_LOADED_MYSELF: "Fractal.component.loaded.myself",
    COMPONENT_LOADED_CHILDREN: "Fractal.component.loaded.children",
    DATA_UPDATED: "Fractal.data.updated",
    DATASET_UPDATED: "Fractal.dataset.updated",
  };

  Fractal.PREFIX = {
    component: "/components/",
    template: "/templates/",
    css: "/css/",
    json: "/api/",
    scripts: "/scripts/",
  };

  Fractal.require = (function(){
    var dataCache = {};
    var listeners = [];

    var createElementHandlers = {
      "js": function(url) {
        var src = isAbs(url) ? url : getScriptUrl(url);
        var el = document.createElement("script");
        el.src = src;
        return el;
      },
      "css": function(url) {
        var href = isAbs(url) ? url : getCSSUrl(url);
        var el = document.createElement("link");
        el.rel="stylesheet";
        el.href = href;
        return el;
      }
    };

    var addElement = function(url, ext, callback) {
      var __myTimer = setTimeout(function(){
        console.error("Timeout: getting script", url);
        callback(false); // require failed
      }, 10000);

      var container = document.getElementsByTagName("head")[0];
      var el = createElementHandlers[ext](url);
      {
        var done = false;
        el.onload = el.onreadystatechange = function(){
          if ( !done && (!this.readyState ||
            this.readyState == "loaded" || this.readyState == "complete") ) {
            done = true;
            clearTimeout(__myTimer);
            if (callback) callback(true);
            el.onload = el.onreadystatechange = null;
          }
        };
      }
      container.appendChild(el);
    };

    var getJSON = function(url, callback) {
      var path = isAbs(url) ? url : getJSONUrl(url);
      var xhr = new XMLHttpRequest();
      xhr.open("GET", path, true);
      xhr.onreadystatechange = function () {
        if (xhr.readyState == 4) {
          var data = JSON.parse(xhr.responseText);
          callback(data);
        }
      }
      xhr.setRequestHeader("Accept" , "application/json");
      xhr.send("");
    };

    var isAbs = function(url) {
      return (url.indexOf("/") == 0 || url.indexOf(".") == 0 || url.indexOf("http") == 0);
    };
    var getScriptUrl = function(name) { return Fractal.PREFIX.script + name; }
    var getCSSUrl = function(name) { return Fractal.PREFIX.css + name; }
    var getJSONUrl = function(name) { return Fractal.PREFIX.json + name; };

    var updateData = function(name, data) {
      dataCache[name] = data;
      Fractal.publish(Fractal.TOPIC.DATA_UPDATED, name);
    };

    var getResource = function(resourceId, callback) {
      dataCache[resourceId] = false;
      var ext = resourceId.split('.').pop();
      if (ext == "js" || ext == "css") {
        addElement(resourceId, ext, function(success){
          callback({loaded: success});
        });
      } else if (ext == resourceId || ext == "json") {
        getJSON(resourceId, function(data){
          callback(data);
        });
      } else {
        console.warning("nothing to do with: " + resourceId);
        callback(null);
      }
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
          getResource(resource, function(data){
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
        if (!$.isEmptyObject(resourceUpdated)) {
          Fractal.publish(Fractal.TOPIC.DATASET_UPDATED, resourceUpdated);
        }
        if (callback) callback(dataCache);
      });
    }
  })();

  Fractal.components = {};
  Fractal.Component = (function(){
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

    var getTemplate = function(name) {
      var $template = $('script[type="text/template"][id="' + name + '"]');
      if ($template.length > 0) {
        return $template.html();
      } else {
        return Fractal.PREFIX.template + name + ".tmpl";
      }
    };
    var getComponentJS = function(name) { return Fractal.PREFIX.component + name + ".js"; };

    var components = Fractal.components;

    return Class.extend({
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
      render: function(data, callback) {
        var self = this;
        // TODO client-side EJS seems not promising, move to Hogan ? Handlerbars ??
        var template = this.template || getTemplate(this.name);
        var view = new EJS({url: template}).render(data);
        self.$container.html(view);
        if (callback) callback();
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
        self.getData(function(data){
          self.render(data, function(){
            self.afterRender(function(){
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

  // Alias of loadComponent(null, $document, callback)
  // Usually used as the start point for constructing a page
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
