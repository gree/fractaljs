(function (global, factory) {
  typeof exports === 'object' && typeof module !== 'undefined' ? module.exports = factory() :
  typeof define === 'function' && define.amd ? define(factory) :
  (global.F = factory());
}(this, function () { 'use strict';

  /* Simple JavaScript Inheritance
   * By John Resig http://ejohn.org/
   * MIT Licensed.
   */
  // Inspired by base2 and Prototype
  var initializing = false;
  var fnTest = /xyz/.test(function () {
    xyz;
  }) ? /\b_super\b/ : /.*/;
  var Class = function Class() {};
  Class.extend = function (prop) {
    var _super = this.prototype;
    var callee = this.extend;

    initializing = true;
    var prototype = new this();
    initializing = false;

    for (var name in prop) {
      prototype[name] = typeof prop[name] == "function" && typeof _super[name] == "function" && fnTest.test(prop[name]) ? function (name, fn) {
        return function () {
          var tmp = this._super;
          this._super = _super[name];

          var ret = fn.apply(this, arguments);
          this._super = tmp;

          return ret;
        };
      }(name, prop[name]) : prop[name];
    }

    var Class = function Class() {
      if (!initializing && this.init) this.init.apply(this, arguments);
    };

    Class.prototype = prototype;
    Class.prototype.constructor = Class;

    Class.extend = this.extend;
    return Class;
  };

  var topics = {};
  var seq = 0;
  var Pubsub = {
    publish: function publish(topic, data, publisher) {
      console.debug("publish", topic);
      var subscribers = topics[topic];
      for (var i in subscribers) {
        subscribers[i].cb(topic, data, publisher);
      }
    },
    subscribe: function subscribe(topic, cb, subscriber) {
      console.debug("subscribe", topic);
      if (!topics[topic]) topics[topic] = [];
      var token = ++seq;
      topics[topic].push({
        token: token,
        subscriber: subscriber,
        cb: cb
      });
      return token;
    },
    unsubscribe: function unsubscribe(topic, token) {
      console.debug("unsubscribe", topic);
      if (!(topic in topics)) return;
      var subscribers = topics[topic];
      for (var i in subscribers) {
        if (subscribers[i].token === token) {
          subscribers.splice(i, 1);
          break;
        }
      }
      if (subscribers.length === 0) delete topics[topic];
    },
    getSubscribers: function getSubscribers(topic) {
      if (!(topic in topics)) return [];
      return topics[topic].map(function (v) {
        return v.subscriber;
      });
    }
  };

  function noImpl(name) {
    return function () {
      throw new Error('To be defined: ' + name);
    };
  }

  var Config = {
    compile: false,
    render: noImpl('render'),
    dynamicRequire: {
      component: noImpl('dynamicRequire.component'),
      template: noImpl('dynamicRequire.template')
    },
    Pubsub: Pubsub
  };

  var COMPONENT_ATTR = 'f-component';
  var RENDERED_ATTR = 'f-rendered';
  var knownComponents = {};

  function hasClass(el, className) {
    if (el.classList) el.classList.contains(className);else new RegExp('(^| )' + className + '( |$)', 'gi').test(el.className);
  }

  function addClass(el, className) {
    if (el.classList) el.classList.add(className);else el.className += ' ' + className;
  }

  var Component = Class.extend({
    init: function init(name, el, parent) {
      this.name = name;
      this.el = el;
      this.complete = false;
      this.subTokens = {};
      if (this.name && !this.template) this.template = getTemplate(this.templateName || this.name);
      this.parent = parent;
      this.children = [];
    },
    getData: function getData(cb, param) {
      cb(this.data || {});
    },
    render: function render(data, template, param) {
      this.el.innerHTML = Config.render(template, data);
      this.children.forEach(function (c) {
        c.destroyed(param);
      });
      this.children = [];
    },
    rendered: function rendered(param) {},
    loadChildren: function loadChildren(cb, param) {
      var _this = this;

      var els = this.el.querySelectorAll('[' + COMPONENT_ATTR + ']');
      if (!els || !els.length) return cb();
      var len = els.length;

      var nbComplete = 0;
      Array.prototype.forEach.call(els, function (el, i) {
        var name = el.getAttribute(COMPONENT_ATTR);
        console.debug("found component:", name);
        var Class = getComponent(name);
        var c = new Class(name, el, _this);
        _this.children.push(c);
        c.load(param, function () {
          if (++nbComplete === len) cb();
        });
      });
    },
    loaded: function loaded(param) {},
    destroyed: function destroyed(param) {
      this.children.forEach(function (c) {
        c.destroyed(param);
      });
      this.children = [];
      console.debug(this.name, "destroyed");
      for (var topic in this.subTokens) {
        Config.Pubsub.unsubscribe(this.subTokens[topic]);
      }
    },
    // main entry
    load: function load(param, cb) {
      var _this2 = this;

      param = param || {};
      console.time('Component.' + this.name);
      this.complete = false;
      this.getData(function (data) {
        _this2.render(data, _this2.template, param);
        _this2.rendered(param);
        _this2.loadChildren(function () {
          _this2.complete = true;
          console.timeEnd('Component.' + _this2.name);
          _this2.loaded(param);
          if (!hasClass(_this2.el, RENDERED_ATTR)) addClass(_this2.el, RENDERED_ATTR);
        }, param);
      }, param);
    },
    // pubsub
    publish: function publish(topic, data) {
      Config.Pubsub.publish(topic, data, this);
    },
    subscribe: function subscribe(topic, cb) {
      this.subTokens[topic] = Config.Pubsub.subscribe(topic, cb, this);
    }
  });

  function build(param, cb) {
    var c = new Component('', window.document, null);
    c.loadChildren(function () {
      if (cb) cb();
    }, param || {});
  }

  function getTemplate(name) {
    var template = Config.dynamicRequire.template("./" + name + ".html");
    if (template) {
      if (Config.compile) template = Config.compile(template);
      return template;
    }
    console.error("Template not found: " + name);
    return "";
  }

  function getComponent(name) {
    if (name in knownComponents) return knownComponents[name];
    var Class = Config.dynamicRequire.component("./" + name);
    if (Class) {
      knownComponents[name] = Class;
      return Class;
    }
    console.error("Component not found: " + name);
    return Component;
  }

  function defineComponent(name, props, base) {
    var c = (base || Component).extend(props || {});
    if (name) knownComponents[name] = c;
    return c;
  }

  var index = {
    init: function init(templateEngine, dynamicRequire, pubsub) {
      // template engine
      if (templateEngine) {
        if (templateEngine.compile) Config.compile = templateEngine.compile;
        Config.render = templateEngine.render;
      }
      // dynamic require
      if (dynamicRequire) {
        ['component', 'template'].forEach(function (v) {
          if (v in dynamicRequire) Config.dynamicRequire[v] = dynamicRequire[v];
        });
      }
      // pubsub
      if (pubsub) {
        ['publish', 'subscribe', 'unsubscribe'].forEach(function (v) {
          if (v in pubsub) Config.Pubsub[v] = pubsub[v];
        });
      }
    },
    build: build,
    Pubsub: Config.Pubsub,
    component: defineComponent
  };

  return index;

}));
//# sourceMappingURL=fractal.js.map