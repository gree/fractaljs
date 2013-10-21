var getSharedData = function(){
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
  afterRender: function(callback) {
    var self = this;
    if (callback) callback();
  },
  getData: function(callback) {
    Fractal.require("static.json", function(data) {
      var viewData = {
        shared: getSharedData(),
        static: data["static.json"]
      }
      callback(viewData);
    });
  }
});


