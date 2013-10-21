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
    json: "/api/",
    scripts: "/scripts/",
  };

  Fractal.require = (function(){
    var dataCache = {};
    var listeners = [];

    var isAbs = function(url) {
      return (url.indexOf("/") == 0 || url.indexOf(".") == 0 || url.indexOf("http://") == 0);
    };

    var getScript = function(url, callback) {
      var __myTimer = setTimeout(function(){
        console.error("Timeout: getting script", url);
        callback(false); // require failed
      }, 30000);

      var head = document.getElementsByTagName("body")[0];
      var el = document.createElement("script");
      el.src = url;
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

      head.appendChild(el);
    };

    var updateData = function(name, data) {
      dataCache[name] = data;
      Fractal.publish(Fractal.TOPIC.DATA_UPDATED, name);
    };

    var getJSON = function(path, callback) {
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

    var getScriptUrl = function(name) { return Fractal.PREFIX.script + name; }
    var getJSONUrl = function(name) { return Fractal.PREFIX.json + name; };


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
          var ext = resource.split('.').pop();
          if (ext == "js") {
            var url = isAbs(resource) ? resource : getScriptUrl(resource);
            getScript(url, function(success){
              console.debug("require script", resource, success);
              dataCache[resource] = {loaded: success};
              if (resource in listeners){
                for (var i in listeners[resource]) {
                  listeners[resource][i].resolve();
                }
                delete listeners[resource];
              }
              return d.resolve();
            });
          } else if (ext == resource || ext == "json") {
            var url = isAbs(resource) ? resource : getJSONUrl(resource);
            getJSON(url, function(data){
              console.debug("require JSON", resource);
              updateData(resource, data);
              resourceUpdated[resource] = data;
              if (resource in listeners){
                for (var i in listeners[resource]) {
                  listeners[resource][i].resolve();
                }
                delete listeners[resource];
              }
              return d.resolve();
            });
          } else {
            console.log("nothing to do with:", resource, ext);
            return d.resolve();
          }
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
        if (callback) callback(resourceUpdated);
      });
    }
  })();

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

    var components = {};

    return Class.extend({
      // constructor
      init: function(name, $container){
        var self = this;
        self.name = name;
        self.$container = $container;
        self.rendered = false;

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
