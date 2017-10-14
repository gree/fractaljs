const _RE = /^#([0-9a-zA-Z_\-\/\.]+)/;
function getComponentName(hash) {
  const match = _RE.exec(hash);
  return (match && match[1]) || "";
};

F.component('router', {
  template: require('../template/router.html'),
  init: function() {
    this.current = getComponentName(location.hash);
    this.subscribe("onpopstate", (topic, hash) => {
      let component = getComponentName(hash);
      if (this.current != component) {
        this.current = component;
        this.load();
      }
    });
  },
  getData: function(cb) {
    cb({
      name: this.current || this.getDefaultComponent()
    });
  }
});

window.onpopstate = function () {
  F.publish("onpopstate", location.hash);
};
