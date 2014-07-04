Fractal("header", Fractal.Component.extend({
  afterRender: function(callback) {
    var self = this;
    self.$(".btn-toggle-menu").click(function(){
      self.publish("toggle.menu");
    });
    callback();
  }
}));
