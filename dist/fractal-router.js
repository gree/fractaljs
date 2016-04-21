(function (global, factory) {
  typeof exports === 'object' && typeof module !== 'undefined' ? module.exports = factory() :
  typeof define === 'function' && define.amd ? define(factory) :
  (global.F = global.F || {}, global.F.Router = factory());
}(this, function () { 'use strict';

  var _RE = /^#([0-9a-zA-Z_\-\/\.]+)/;
  var getComponentName = function getComponentName(hash) {
    var match = _RE.exec(hash);
    return match && match[1] || "";
  };

  var router = F.component(null, {
    template: '{{#name}}<div f-component="{{name}}" />{{/name}}' + '{{^name}}`DefaultComponent` is not defined{{/name}}',
    current: getComponentName(location.hash),
    init: function init(name, el, parent) {
      var _this = this;

      this._super(name, el, parent);
      this.subscribe("onpopstate", function (topic, hash) {
        var component = getComponentName(hash);
        if (_this.current != component) {
          _this.current = component;
          _this.load();
        }
      });
    },
    getData: function getData(cb, param) {
      cb({
        name: this.current || this.DefaultComponent
      });
    }
  });

  window.onpopstate = function () {
    F.Pubsub.publish("onpopstate", location.hash);
  };

  return router;

}));
//# sourceMappingURL=fractal-router.js.map