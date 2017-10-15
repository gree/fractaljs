(function (global, factory) {
	typeof exports === 'object' && typeof module !== 'undefined' ? module.exports = factory() :
	typeof define === 'function' && define.amd ? define(factory) :
	(global.F = factory());
}(this, (function () { 'use strict';

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

var asyncGenerator = function () {
  function AwaitValue(value) {
    this.value = value;
  }

  function AsyncGenerator(gen) {
    var front, back;

    function send(key, arg) {
      return new Promise(function (resolve, reject) {
        var request = {
          key: key,
          arg: arg,
          resolve: resolve,
          reject: reject,
          next: null
        };

        if (back) {
          back = back.next = request;
        } else {
          front = back = request;
          resume(key, arg);
        }
      });
    }

    function resume(key, arg) {
      try {
        var result = gen[key](arg);
        var value = result.value;

        if (value instanceof AwaitValue) {
          Promise.resolve(value.value).then(function (arg) {
            resume("next", arg);
          }, function (arg) {
            resume("throw", arg);
          });
        } else {
          settle(result.done ? "return" : "normal", result.value);
        }
      } catch (err) {
        settle("throw", err);
      }
    }

    function settle(type, value) {
      switch (type) {
        case "return":
          front.resolve({
            value: value,
            done: true
          });
          break;

        case "throw":
          front.reject(value);
          break;

        default:
          front.resolve({
            value: value,
            done: false
          });
          break;
      }

      front = front.next;

      if (front) {
        resume(front.key, front.arg);
      } else {
        back = null;
      }
    }

    this._invoke = send;

    if (typeof gen.return !== "function") {
      this.return = undefined;
    }
  }

  if (typeof Symbol === "function" && Symbol.asyncIterator) {
    AsyncGenerator.prototype[Symbol.asyncIterator] = function () {
      return this;
    };
  }

  AsyncGenerator.prototype.next = function (arg) {
    return this._invoke("next", arg);
  };

  AsyncGenerator.prototype.throw = function (arg) {
    return this._invoke("throw", arg);
  };

  AsyncGenerator.prototype.return = function (arg) {
    return this._invoke("return", arg);
  };

  return {
    wrap: function (fn) {
      return function () {
        return new AsyncGenerator(fn.apply(this, arguments));
      };
    },
    await: function (value) {
      return new AwaitValue(value);
    }
  };
}();





var classCallCheck = function (instance, Constructor) {
  if (!(instance instanceof Constructor)) {
    throw new TypeError("Cannot call a class as a function");
  }
};

var createClass = function () {
  function defineProperties(target, props) {
    for (var i = 0; i < props.length; i++) {
      var descriptor = props[i];
      descriptor.enumerable = descriptor.enumerable || false;
      descriptor.configurable = true;
      if ("value" in descriptor) descriptor.writable = true;
      Object.defineProperty(target, descriptor.key, descriptor);
    }
  }

  return function (Constructor, protoProps, staticProps) {
    if (protoProps) defineProperties(Constructor.prototype, protoProps);
    if (staticProps) defineProperties(Constructor, staticProps);
    return Constructor;
  };
}();









var inherits = function (subClass, superClass) {
  if (typeof superClass !== "function" && superClass !== null) {
    throw new TypeError("Super expression must either be null or a function, not " + typeof superClass);
  }

  subClass.prototype = Object.create(superClass && superClass.prototype, {
    constructor: {
      value: subClass,
      enumerable: false,
      writable: true,
      configurable: true
    }
  });
  if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass;
};











var possibleConstructorReturn = function (self, call) {
  if (!self) {
    throw new ReferenceError("this hasn't been initialised - super() hasn't been called");
  }

  return call && (typeof call === "object" || typeof call === "function") ? call : self;
};

var COMPONENT_ATTR = 'f-component';
var knownComponents = {};

var Component = function () {
  function Component(name, el, parent) {
    classCallCheck(this, Component);

    this.name = name;
    this.el = el;
    this.complete = false;
    this.parent = parent;
    this.children = [];
    this.subTokens = {};
  }

  createClass(Component, [{
    key: 'getData',
    value: function getData(cb, param) {
      cb(this.data || {});
    }
  }, {
    key: 'render',
    value: function render(data, template, param) {
      this.el.innerHTML = template(data);
      this.children.forEach(function (c) {
        c.destroyed(param);
      });
      this.children = [];
    }
  }, {
    key: 'loadChildren',
    value: function loadChildren(cb, param) {
      var _this = this;

      var els = this.el.querySelectorAll('[' + COMPONENT_ATTR + ']');
      if (!els || !els.length) {
        if (cb) cb();
        return;
      }

      var len = els.length;
      var nbComplete = 0;
      Array.prototype.forEach.call(els, function (el, i) {
        var name = el.getAttribute(COMPONENT_ATTR);
        console.log("load component:", name);
        var Class = knownComponents[name];
        var c = new Class(name, el, _this);
        _this.children.push(c);
        c.load(param, function () {
          if (++nbComplete === len) {
            if (cb) cb();
          }
        });
      });
    }
  }, {
    key: 'destroyed',
    value: function destroyed(param) {
      this.children.forEach(function (c) {
        c.destroyed(param);
      });
      this.children = [];
      console.debug(this.name, "destroyed");
      for (var topic in this.subTokens) {
        Pubsub.unsubscribe(this.subTokens[topic]);
      }
    }
  }, {
    key: 'rendered',
    value: function rendered(cb, param) {
      if (cb) cb();
    }
  }, {
    key: 'loaded',
    value: function loaded(param) {}
  }, {
    key: 'load',
    value: function load(param, cb) {
      var _this2 = this;

      param = param || {};
      console.time('Component.' + this.name);
      this.complete = false;
      this.getData(function (data) {
        console.log(_this2.name, data);
        var template = _this2.template || require('./' + (_this2.templateName || _this2.name) + '.tmpl');
        _this2.render(data, template, param);
        _this2.rendered(function () {
          _this2.loadChildren(function () {
            _this2.complete = true;
            console.timeEnd('Component.' + _this2.name);
            _this2.loaded(param);
            if (cb) cb();
          }, param);
        }, param);
      }, param);
    }
  }, {
    key: 'publish',
    value: function publish(topic, data) {
      Pubsub.publish(topic, data, this);
    }
  }, {
    key: 'subscribe',
    value: function subscribe(topic, cb) {
      this.subTokens[topic] = Pubsub.subscribe(topic, cb, this);
    }
  }]);
  return Component;
}();

var Root = function (_Component) {
  inherits(Root, _Component);

  function Root(el) {
    classCallCheck(this, Root);
    return possibleConstructorReturn(this, (Root.__proto__ || Object.getPrototypeOf(Root)).call(this, '', el, null));
  }

  return Root;
}(Component);

function build(el, param) {
  var root = new Root(el);
  root.loadChildren(function () {}, param);
}

function registerComponent(name, component) {
  knownComponents[name] = component;
}

function createComponent(name, def) {
  registerComponent(name, function (_Component) {
    inherits(_class, _Component);

    function _class(name, el, parent) {
      classCallCheck(this, _class);

      var _this = possibleConstructorReturn(this, (_class.__proto__ || Object.getPrototypeOf(_class)).call(this, name, el, parent));

      if (def.template) {
        _this.template = def.template;
      }
      if (def.init) {
        def.init.bind(_this)();
      }
      if (def.getData) {
        _this.getData = def.getData.bind(_this);
      }
      if (def.rendered) {
        _this.rendered = def.rendered.bind(_this);
      }
      return _this;
    }

    return _class;
  }(Component));
}

window.onpopstate = function () {
  Pubsub.publish("onpopstate", location.hash);
};

var index = {
  build: build,
  component: createComponent
};

return index;

})));
//# sourceMappingURL=fractal.js.map
