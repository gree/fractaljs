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

  namespace.Component = (function(){
    var ComponentFilter = "[data-role=component]";
    var setLoad = function(self, next) {
      if (!next) return;
      if (!self.__load){
        self.__load = next;
        return;
      }
      var temp = self.__load;
      self.__load = function(callback, param) {
        temp.bind(self)(function(){
          next.bind(self)(callback, param);
        }, param);
      };
    };

    var Component = {};
    Component.init = function(name, $container, env){
      this.name = name;
      this.$container = $container;
      this.F = env;

      this.$ = this.$container.find.bind(this.$container);
      var resetDisplay = this.$container.data("display");
      if (resetDisplay) this.$container.css("display", resetDisplay);
      this.$container.on("destroyed", this.unload.bind(this));

      this.rendered = false;
      this.subscribeList = {};
      this.earlyRecieved = [];
      // // TODO implement if needed
      // self.children = [];
      // self.parent = null;
      this.templateName = this.templateName || this.name;
      if (typeof(this.template) === "string") this.template = this.F.Template.Compile(this.template);

      setLoad(this, this.getData);
      setLoad(this, this.getTemplate);
      setLoad(this, this.render);
      setLoad(this, this.afterRender);
      setLoad(this, this.myselfLoaded);
      if (!this.loadMyselfOnly)
        setLoad(this, this.loadChildren);
      setLoad(this, this.allLoaded);

      var subscribes = [];
      for (var i in this) {
        if (typeof(this[i]) === "function" && i.indexOf("on") === 0) {
          subscribes.push([i.substr(2), this[i]]);
        }
      }
      var publicMethods = this.Public || {};
      for (var i in publicMethods) {
        subscribes.push([this.F.getName() + ":" + this.name + "." + i, publicMethods[i]]);
      }

      var self = this;
      subscribes.forEach(function(v){
        (function(topic, method){
          self.subscribe(topic, function(topic, data, from){
            method.bind(self)(data, from);
          });
        })(v[0], v[1]);
      });
    };
    Component.call = function(name, data) {
      var topic = name;
      if (name.indexOf(":") < 0) {
        topic = this.F.getName() + ":" + topic;
      }
      this.publish(topic, data, this);
    };
    Component.__load = null;

    Component.load = function(param, callback){
      param = param || {};
      this.__load(function(){
        if (callback) callback();
      }, param);
    };
    Component.getData = null;
    Component.getTemplate = function(callback) {
      var self = this;
      if (self.template) return callback();
      self.F.getTemplate(self.templateName || self.name, function(template){
        self.template = template;
        callback();
      });
    };
    Component.render = function(callback, param){
      var contents = this.F.Template.Render(this.template, param.data, param.partials);
      this.$container.html(contents);
      callback();
    };
    Component.afterRender = null;
    Component.myselfLoaded = function(callback){
      this.rendered = true;
      while (this.earlyRecieved.length > 0) {
        this.earlyRecieved.pop()();
      }
      this.publish(namespace.TOPIC.COMPONENT_LOADED_MYSELF);
      callback();
    };
    Component.loadChildren = function(callback, param){
      var self = this;
      var components = self.$(ComponentFilter);
      var len = components.length;
      if (!len) {
        self.publish(namespace.TOPIC.COMPONENT_LOADED_CHILDREN);
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
        self.publish(namespace.TOPIC.COMPONENT_LOADED_CHILDREN);
        if (callback) callback();
      })
    },
    Component.allLoaded = null;
    Component.unload = function(){ this.unsubscribe(); };

    Component.require = function(name, options, callback) { this.F.require(name, options, callback); };
    Component.publish = function(topic, data) { namespace.Pubsub.publish(topic, data, this); };
    Component.subscribe = function(topic, callback){
      var self = this;
      self.subscribeList[topic] = namespace.Pubsub.subscribe(topic, function(topic, data, from){
        if (self.rendered) callback(topic, data, from);
        else self.earlyRecieved.push(function(){ callback(topic, data, from); });
      });
    };
    Component.unsubscribe = function(topic) {
      if (!topic) {
        for (var i in this.subscribeList) namespace.Pubsub.unsubscribe(i, this.subscribeList[i]);
      } else {
        if (topic in this.subscribeList) namspace.Pubsub.unsubscribe(topic, this.subscribeList[topic]);
      }
    };

    return Class.extend(Component);
  })();
})(window.F.__);

