F(function(namespace){
  // import
  var isClass = namespace.isClass;
  var pubsub = namespace.Pubsub;
  var COMPONENT = namespace.ClassType.COMPONENT;

  var ComponentFilter = "[data-role=component]";
  var __defaultLoadHandler = function(callback, param) { callback(); };

  var getConstructor = function(constructor, env, callback) {
    if (isClass(constructor, COMPONENT)) {
      callback(constructor);
    } else {
      constructor(env, callback);
    }
  };

  namespace.Component = namespace.defineClass(COMPONENT).extend({
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
      if (typeof(self.template) === "string") self.template = self.F.compile(self.template);

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
      if (self.template) {
        return callback();
      }

      var $tmpl = self.$('script[type="text/template"]');
      if ($tmpl.length > 0) {
        self.template = self.F.compile($tmpl.html());
        return callback();
      }

      self.F.getTemplate(self.templateName || self.name, function(template){
        self.template = template;
        callback();
      });
    },
    render: function(data, partials, callback, param){
      var self = this;
      var contents = self.F.render(self.template, data, partials);
      self.$container.html(contents);
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
        var fullName = $container.data("name");
        self.F.getComponentClass(fullName, function(constructor, componentName, env){
          getConstructor(constructor, env, function(constructor){
            if (!isClass(constructor, COMPONENT)) {
              throw new Error("unexpected component class: " + env.getName() + ":" + componentName);
            }
            var c = new constructor(componentName, $container, env);
            c.load(param, cb);
          });
        });
      }, function(){
        if (callback) callback();
      })
    },
    allLoaded: __defaultLoadHandler,
    unload: function(){ this.unsubscribe(); },

    require: function(name, options, callback) { this.F.require(name, options, callback); },
    publish: function(topic, data) { pubsub.publish(topic, data, this); },
    subscribe: function(topic, callback){
      var self = this;
      self.subscribeList[topic] = pubsub.subscribe(topic, function(topic, data, from){
        if (self.rendered) callback(topic, data, from);
        else self.earlyRecieved.push(function(){ callback(topic, data, from); });
      });
    },
    unsubscribe: function(topic) {
      if (!topic) {
        for (var i in this.subscribeList) pubsub.unsubscribe(i, this.subscribeList[i]);
      } else {
        if (topic in this.subscribeList) pubsub.unsubscribe(topic, this.subscribeList[topic]);
      }
    },
  });
});

