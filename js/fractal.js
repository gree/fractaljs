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
    init: function(name, $container, root){
      var self = this;
      self.name = name;
      self.$container = $container;
      self.root = root || this;

      self.data = {};
      self.scripts = {};
      self.requireListeners = {};
    },
    // private
    iterate: function(callback, loadMyself) {
      var self = this;

      var __loadComponents = function(){
        var $components = self.$container.find('[data-role=component]');
        if ($components.length == 0 && callback) callback();
        var finished = 0;
        $components.each(function(){
          var name = $(this).data("name");
          if (name) {
            Fractal.loadComponent(name, $(this), function(){
              finished++;
              if (finished == $components.length && callback) {
                callback();
              }
            })
          } else {
            console.log("data-name attribute not found:", this);
          }
        });
      };

      if (loadMyself === false) {
        __loadComponents();
      } else {
        self.loadMyself(function(){
          __loadComponents();
        });
      }
    },
    // public / protected
    getData: function(callback) { setTimeout( function(){ callback({}); }, 0 ); },
    generate: function(data) {
      // TODO client-side EJS seems not promising, move to Hogan ??
      var template = this.template || Fractal.getTemplate(this.name);
      return new EJS({url: template}).render(data);
    },
    loadMyself: function(callback) {
      var self = this;
      self.getData(function(data){
        var view = self.generate(data);
        self.$container.html(view);
        if (self.afterRender) self.afterRender();
        if (callback) callback();
      });
    },
    updateMyself: function(data, callback){
      var view = self.generate(data);
      self.$container.html(view);
      if (self.afterRender) self.afterRender();
      if (callback) callback();
    }
  });

  var ROOT_NAME = "__root__";
  var Fractal = {
    components: {},
    root: null,
    data: {},
    requireListeners: {},
    Component: Component
  };

  Fractal.getTemplate = function(name) {
    var $template = $('script[type="text/template"][id="' + name + '"]');
    if ($template.length > 0) {
      return $template.html();
    } else {
      return isAbs(name) ? name : "/templates/" +name + ".ejs";
    }
  };
  Fractal.getComponentJS = function(name) { return "/components/" + name + ".js"; };
  Fractal.getJSONUrl = function(name) { return "/api/get/" + name; };
  Fractal.getScriptUrl = function(name) { return "" + name; }

  Fractal.construct = function($container, getenv, callback) {
    if (typeof $container == "function") {
      if (!getenv) {
        callback = $container;
        getenv = null;
      } else {
        callback = getenv;
        getenv = $container;        
      }
      $container = null;
    }
    if (getenv) this.env = getenv();
    $container = $container || $(document);
    this.root = new Component(ROOT_NAME, $container);
    this.root.iterate(callback, false);
  };

  Fractal.loadComponent = function(name, $container, callback) {
    var self = this;
    var __init_component = function() {
      var component = new window[name](name, $container, self.root);
      self.components[name] = component;
      component.iterate(callback);
    };

    if (name in window) {
      __init_component();
    } else {
      var js = self.getComponentJS(name);
      self.require(js, function(){
        if (!(name in window)) {
          console.log("Component not found: " + name);
          callback(null);
        } else {
          __init_component();
        }
      });
    }    
  }

  Fractal.require = function(resourceList, callback) {
    if (typeof resourceList == "string") resourceList = [resourceList];
    if (resourceList.length == 0) {
      if (callback) callback();
      return;
    }

    var self = this;
    var __get = function(resource) {
      var d = new $.Deferred();
      if (resource in self.data) {
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
          resource = isAbs(resource) ? resource : self.getScriptUrl(resource);
          getScript(resource, function(){
            console.log("require script", resource);
            self.data[resource] = true;
            if (resource in self.requireListeners){
              for (var i in self.requireListeners[resource]) {
                self.requireListeners[resource][i].resolve();
              }
              delete self.requireListeners[resource];
            }
            return d.resolve();
          });
        } else if (ext == resource) {
          resource = isAbs(resource) ? resource : self.getJSONUrl(resource);
          getJSON(resource, function(data){
            console.log("require JSON", resource);
            self.data[resource] = data;
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
    var head = document.getElementsByTagName("body")[0];
    var el = document.createElement("script");
    el.src = url;
    {
      var done = false;

      el.onload = el.onreadystatechange = function(){
        if ( !done && (!this.readyState ||
          this.readyState == "loaded" || this.readyState == "complete") ) {
          done = true;
          if (callback) callback();
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

  this.Fractal = Fractal;

})();



