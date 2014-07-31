F("main", F.Component.extend({
  init: function(name, $container) {
    var self = this;
    self._super(name, $container);
    self.subscribe(self.name + ".load", function(topic, data){
      self.load(data);
    });
  },
  getData: function(cb, data) {
    var componentName = (data && data.componentName) || "github_activities2";
    this.data = { componentName: componentName };
    cb();
  }
}));
