Fractal("body", Fractal.Component.extend({
  init: function(name, $container) {
    var self = this;
    self._super(name, $container);
    self.subscribe(self.name + ".show", function(topic, data){
      self.contentsName = data;
      self.load();
    });
  },
}));
