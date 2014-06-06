var header = Fractal.Component.extend({
  getData: function(callback) {
    var self = this;
    Fractal.require(["header.json"], function(data) {
      self.data = data["header.json"];
      callback();
    });
  }
});

