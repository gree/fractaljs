Fractal("header", Fractal.Component.extend({
  afterRender: function(cb) {
    var self = this;
    self.$(".header-item").click(function(){
      var value = $(this).data("value");
      self.publish("body.show", value);
    });
  },
  getData: function(cb) {
    this.data = {
      brand: "Fractal - Basic",
      items: [
        { name: "Contents1", value: "contents1" },
        { name: "Contents2", value: "contents2" },
      ]
    };
    cb();
  }
}));
