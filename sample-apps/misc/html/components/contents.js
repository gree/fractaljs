var __get_some_data = function(){
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

var contents = Fractal.Component.extend({
  afterRender: function(callback) {
    var self = this;
    $('#btn-basic').click(function(){
      alert(JSON.stringify(self.fromServer));
    });
    callback();
  },
  getData: function(callback) {
    var self = this;
    Fractal.require("basic.json", function(data) {
      self.fromServer = data["basic.json"];
      self.data = {
        data: __get_some_data(),
        from_server: self.fromServer
      };
      callback();
    });
  }
});


