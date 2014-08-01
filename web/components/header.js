F("header", F.Component.extend({
  menuItems: {
    "?start": "Getting Started",
    "?tutorials": "Tutorials",
    "?examples": "Examples",
    "?doc": "Doc",
    "https://github.com/gree/fractaljs": "Github",
  },
  init: function(name, $container) {
    var self = this;
    self._super(name, $container);
    self.subscribe(Fractal.TOPIC.ENV_CHANGED, function(topic, data){
      if (data.page) self.load();
    });
  },
  getData: function(cb){
    var menus = [];
    for (var i in this.menuItems) {
      menus.push({
        active: window.location.search.indexOf(i) >= 0,
        link: i,
        text: this.menuItems[i]
      });
    }
    this.data = {
      menus: menus,
    };
    cb();
  }
}));
