Fractal("sidebar", Fractal.Component.extend({
  afterRender: function(callback) {
    var self = this;
    self.$(".btn-item").click(function(){
      self.publish("toggle.menu");
    });
    callback();
  }
}));
