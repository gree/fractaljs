Fractal("hello", Fractal.Component.extend({
  getData: function(cb, param) {
    var name = param;
    this.data = { text: name || "World" };
    cb();
  }
}));
