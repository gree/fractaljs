/* Simple JavaScript Inheritance
 * By John Resig http://ejohn.org/
 * MIT Licensed.
 */
// Inspired by base2 and Prototype
(function(){
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

  var Component = Class.extend({
    // constructor
    init: function(name, $container){
      var self = this;
      self.name = name;
      self.$container = $container;

      self.data = {};
      self.scripts = {};
      self.requireListeners = {};
    },
    // public / protected
    getData: function(callback) { setTimeout( function(){ callback({}); }, 0 ); },
    generate: function(data) {
      // TODO client-side EJS seems not promising, move to Hogan ??
      var template = this.template || window.Fractal.getTemplate(this.name);
      return new EJS({url: template}).render(data);
    },
    load: function(callback) {
      var self = this;
      self.getData(function(data){
        var view = self.generate(data);
        self.$container.html(view);
        if (self.afterRender) self.afterRender();
        if (callback) callback();
      });
    }
  });

  var Fractal = function() {
    this.components = {};

    this.prefix = {
      components: "/components/",
      templates: "/templates/",
      json: "/api/get/",
      scripts: "/scripts/",
    };

    this.data = {};
    this.requireListeners = {};

    this.Component = Component;

    this.TOPIC = { // TODO should be TOPIC_"PREFIX"
      LOADED: "fractal.loaded",
      DATA_UPDATED: "data.updated",
    };

  };

  var proto = Fractal.prototype;

  proto.getTemplate = function(name) {
    var $template = $('script[type="text/template"][id="' + name + '"]');
    if ($template.length > 0) {
      return $template.html();
    } else {
      return this.prefix.templates + name + ".ejs";
    }
  };
  proto.getComponentJS = function(name) { return this.prefix.components + name + ".js"; };
  proto.getJSONUrl = function(name) { return this.prefix.json + name; };
  proto.getScriptUrl = function(name) { return this.prefix.script + name; }

  proto.setOpts = function(opts) {
    for (var i in this.prefix) {
      if (i in opts) this.prefix[i] = opts[i];
    }
  };

  // Fractal.iterate(name, $container, callback);
  // Fractal.iterate($container, callback); // name: null
  // Fractal.iterate(callback); // name: null, $container: $document
  proto.iterate = function(name, $container, callback) {
    var self = this;
    if (typeof(name) != "string") {
      if (typeof(name) == "function") {
        callback = name;
        $container = $(document);
        name = null;
      } else {
        callback = $container;
        $container = name;
        name = null;
      }
    }

    var __loadComponents = function(){
      $subComponents = $container.find('[data-role=component]');
      var len = $subComponents.length;
      if (len == 0) {
        if (callback) callback();
      } else {
        var finished = 0;
        $subComponents.each(function(){
          self.iterate($(this), function(){
            finished++;
            if (finished == len) {
              self.publish(self.TOPIC.LOADED, {type: "Sub Components", name: name});
              if (callback) callback();
            }
          });
        });
      }
    };

    var __loadComponent = function(componentName, componentLoaded){

      var __initComponent = function() {
        var component = new window[componentName](componentName, $container);
        self.components[componentName] = component;
        component.load(componentLoaded);
      };

      if (componentName in window) {
        __initComponent();
      } else {
        var js = self.getComponentJS(componentName);
        self.require(js, function(){
          if (!(componentName in window)) {
            console.log("Component not found: " + componentName);
            componentLoaded(null);
          } else {
            __initComponent();
          }
        });
      }    
    };

    var name = name || $container.data("name");
    if (name) { // load myself first
      __loadComponent(name, function() {
        self.publish(self.TOPIC.LOADED, {type: "Myself", name: name});
        __loadComponents();
      });
    } else {
      __loadComponents();
    }

  };

  // wrapper for pubsubjs
  // TODO pubsub feature is necessary, see if this is the best solution.
  proto.publish = function(topic, data) {
    PubSub.publish(topic, data);
  };

  proto.subscribe = function(topic, handler) {
    var token = PubSub.subscribe(topic, handler);
  };

  proto.unsubscribe = function(token) {
    PubSub.unsubscribe(token);
  };

  proto.updateData = function(name, data) {
    var self = this;
    self.data[name] = data;
    self.publish(self.TOPIC.DATA_UPDATED, name);
  };

  proto.require = function(resourceList, callback, forcedRefresh) {
    if (typeof resourceList == "string") resourceList = [resourceList];
    if (resourceList.length == 0) {
      if (callback) callback();
      return;
    }

    var self = this;
    var __get = function(resource) {
      var d = new $.Deferred();
      if (resource in self.data && !forcedRefresh) {
        if (self.data[resource]) {
          return d.resolve();
        } else {
          if (!(resource in self.requireListeners))
            self.requireListeners[resource] = [];
          self.requireListeners[resource].push(d);
          return d.promise();
        }
      } else {
        self.data[resource] = false;
        var ext = resource.split('.').pop();
        if (ext == "js") {
          var url = isAbs(resource) ? resource : self.getScriptUrl(resource);
          getScript(url, function(success){
            console.log("require script", resource, success);
            self.data[resource] = {loaded: success};
            if (resource in self.requireListeners){
              for (var i in self.requireListeners[resource]) {
                self.requireListeners[resource][i].resolve();
              }
              delete self.requireListeners[resource];
            }
            return d.resolve();
          });
        } else if (ext == resource || ext == "json") {
          var url = isAbs(resource) ? resource : self.getJSONUrl(resource);
          getJSON(url, function(data){
            console.log("require JSON", resource);
            self.updateData(resource, data);
            if (resource in self.requireListeners){
              for (var i in self.requireListeners[resource]) {
                self.requireListeners[resource][i].resolve();
              }
              delete self.requireListeners[resource];
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
      if (callback) callback();
    });
  }

  // ////////
  // Utils
  var isAbs = function(url) {
    return (url.indexOf("/") == 0 || url.indexOf(".") == 0 || url.indexOf("http://") == 0);
  };

  var getScript = function(url, callback) {
    var __myTimer = setTimeout(function(){
      callback(false); // require failed
    }, 1000);

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

  if (typeof define === 'function' && define.amd) {
    define(function () {
      return new Fractal();
    });
  }
  else if (typeof module === 'object' && module.exports){
    module.exports = new Fractal();
  }
  else {
    this.Fractal = new Fractal();
  }

}.call(this));

