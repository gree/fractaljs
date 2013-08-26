var basic = Fractal.Component.extend({
  afterRender: function() {
    var self = this;
    $('.btn').click(function(){
      alert("static component loaded !!");
    });

    setInterval(function(){
      var dt = new Date();
      var data = { time: dt.toLocaleString() };
      self.update(data);
    }, 1000);

  },

  getData: function(callback) {
    Fractal.require("static.json", function() {
      var dt = new Date();
      var viewData = {
        time: dt.toLocaleString(),
        static: Fractal.data["static.json"]
      }
      callback(viewData);
    });
  },

  update: function(data) {
    $('#clock_time').text(data.time);
  }
});


