var sharedData = function(){
  var possible = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  var text = "";
  for( var i=0; i<64; i++ )
    text += possible.charAt(Math.floor(Math.random() * possible.length));
  var dt = new Date();
  var time = dt.toLocaleString();
  return {
    text: text,
    time: time
  };
};

var basic = Fractal.Component.extend({
  afterRender: function() {
    var self = this;
    $('#stop_sub').click(function(){
      Fractal.unsubscribe(self.update);
    });

    Fractal.subscribe(Fractal.TOPIC.DATA_UPDATED, self.update);

    setInterval(function(){
      Fractal.updateData("SHARED", sharedData());
    }, 1000);

  },

  getData: function(callback) {
    Fractal.require("static.json", function() {
      var viewData = {
        shared: sharedData(),
        static: Fractal.data["static.json"]
      }
      callback(viewData);
    });
  },

  update: function(message, dataName) {
    if (dataName == "SHARED") {
      var viewData = Fractal.data[dataName];
      $('#clock_time').text(viewData.time);
      $('#random_text').text(viewData.text);
    }
  }
});


