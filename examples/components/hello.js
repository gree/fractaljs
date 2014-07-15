Fractal("hello", Fractal.Component.extend({
  getData: function(cb) {
    this.data = { text: this.param || "World" };
    cb();
  }
}));
