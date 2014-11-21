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
      console.time(self.fullName);
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

