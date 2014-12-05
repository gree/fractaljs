F.Component = (function(){
  // import
  var namespace = F.__; // dev
  var isClass = namespace.isClass; // dev
  var ClassType = namespace.ClassType; // dev
  var createClass = namespace.createClass; // dev
  var forEachAsync = namespace.forEachAsync; // dev
  var setImmediate = namespace.setImmediate; // dev

  var pubsub = F.Pubsub,
  COMPONENT = ClassType.COMPONENT,
  COMPONENT_ATTR = "f-component",
  __defaultLoadHandler = function(callback, param) { callback(); },
  idSeq = 0;

  return createClass(COMPONENT).extend({
    init: function(name, $container, env){
      var self = this;
      self.name = name;
      self.$container = $container;
      self.F = env;
      self.fullName = self.F.name + ":" + name;
      self.id = ++idSeq;

      self.$ = self.$container.find.bind(self.$container);
      if (self.resetDisplay) self.$container.css("display", self.resetDisplay);
      self.$container.on("destroyed", self.unload.bind(self));

      self.rendered = false;
      self.subscribeList = {};
      self.earlyRecieved = [];
      // TODO implement if needed
      // self.children = [];
      // self.parent = null;
      self.templateName = self.templateName || self.name;
      if (typeof(self.template) === "string")
        self.template = self.F.compile(self.template);

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
      var self = this;
      if (methodName.indexOf(":") < 0) {
        methodName = self.F.name + ":" + methodName;
      }
      self.publish(methodName, data, self);
    },
    load: (function(){
      var seq = 0;

      return function(param, callback){
        var self = this;
        console.time(self.fullName);
        param = param || {};
        if (!param.__seq) param.__seq = ++seq;

        self.getData(function(data, partials){
          self.getTemplate(function(template){
            self.render(data, partials, template, function() {
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
      };
    })(),

    getData: __defaultLoadHandler,
    getTemplate: function(callback, param) {
      var self = this;
      if (self.template) {
        return callback(self.template);
      }
      var templateName = self.templateName || self.name;
      self.F.getTemplate(templateName, function(template){
        self.template = template;
        callback(self.template);
      });
    },
    render: function(data, partials, template, callback, param){
      var self = this;
      var contents = self.F.render(template, data, partials);
      self.$container.html(contents);
      callback();
    },
    afterRender: __defaultLoadHandler,
    myselfLoaded: function(callback, param){
      var earlyRecieved = this.earlyRecieved;
      while (earlyRecieved.length > 0) {
        earlyRecieved.pop()();
      }
      callback();
    },
    loadChildren: function(callback, param){
      var self = this;
      var els = self.$("[" + COMPONENT_ATTR + "]");
      var len = els.length;
      if (!len) {
        if (callback) callback();
        return;
      }

      forEachAsync(els, function(container, cb){
        var $container = $(container);
        var fullName = $container.attr(COMPONENT_ATTR);
        self.F.requireComponent(fullName, function(constructor, name, env){
          if (!isClass(constructor, COMPONENT)) {
            throw new Error("not component class: " + env.name + ":" + name);
          }
          var c = new constructor(name, $container, env);
          (function(c, cb){
            setImmediate(function(){
              c.load(param, cb);
            });
          })(c, cb);
        });
      }, function(){
        if (callback) callback();
      })
    },
    allLoaded: __defaultLoadHandler,
    unload: function(){
      console.debug("unload called", this.fullName);
      this.unsubscribe();
    },

    publish: function(topic, data) {
      pubsub.publish(topic, data, this);
    },
    subscribe: function(topic, callback){
      var self = this;
      self.subscribeList[topic] = pubsub.subscribe(topic, function(topic, data, from){
        if (self.rendered) {
          callback(topic, data, from);
        } else {
          self.earlyRecieved.push(function(){ callback(topic, data, from); });
        }
      });
    },
    unsubscribe: function(topic) {
      var list = this.subscribeList;
      if (!topic) {
        for (var i in list) pubsub.unsubscribe(i, list[i]);
      } else {
        if (topic in list) pubsub.unsubscribe(topic, list[topic]);
      }
    },
  });

})();

