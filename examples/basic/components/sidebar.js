Fractal("sidebar", Fractal.Component.extend({
  afterRender: function(cb) {
    var self = this;
    self.$(".sidebar-item").click(function(){
      var value = $(this).data("value");
      self.publish("body.show", value);
    });
  },
  getData: function(cb) {
    this.data = {
      items: [
        { name: "Contents1", value: "contents1" },
        { name: "Contents2", value: "contents2" },
      ]
    };
    cb();
  }
}));
