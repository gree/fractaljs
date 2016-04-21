const _RE = /^#([0-9a-zA-Z_\-\/\.]+)/;
let getComponentName = function(hash) {
  let match = _RE.exec(hash);
  return (match && match[1]) || "";
};

export default F.component(null, {
  template: '{{#name}}<div f-component="{{name}}" />{{/name}}' +
    '{{^name}}`DefaultComponent` is not defined{{/name}}',
  current: getComponentName(location.hash),
  init: function(name, el, parent) {
    this._super(name, el, parent);
    this.subscribe("onpopstate", (topic, hash) => {
      let component = getComponentName(hash);
      if (this.current != component) {
        this.current = component;
        this.load();
      }
    });
  },
  getData: function(cb, param) {
    cb({
      name: this.current || this.DefaultComponent
    });
  },
});

window.onpopstate = function(){
  F.Pubsub.publish("onpopstate", location.hash);
};

