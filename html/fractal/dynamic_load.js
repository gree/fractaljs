var __user = {
  name: "a",
  email: "a@a.com",
  password: "qwert",
  __login: false
};

var getUser = function(callback) {
  setTimeout(callback(null), 100); // use "setTimeout" to simulate a async ajax request
};

var doLogin = function(data, callback) {
  setTimeout(function(){ // use "setTimeout" to simulate a async ajax request
    var success = false;
    if (data.email == __user.email && data.password == __user.password) {
      success = true;
      __user.__login = true;
    }
    callback(success);
  }, 100);
};

var dynamic_load = Fractal.Component.extend({
  load: function(callback){
    var self = this;
    getUser(function(user){
      if (!__user.__login) {
        Fractal.iterate("login", self.$container);
      } else {
        Fractal.iterate("mypage", self.$container);
      }
      if (callback) callback();
    });
  }

});


var login = Fractal.Component.extend({
  afterRender: function(){
    var self = this;
    $("#signin").click(function(e){
      e.preventDefault();
      var data = {
        email: $('#email').val(),
        password: $('#password').val(),
      };
      doLogin(data, function(success){
        Fractal.iterate("dynamic_load", self.$container);
      });
      return false;
    });
  }
});


var mypage = Fractal.Component.extend({
  afterRender: function(){
    var self = this;
    $("#signout").click(function(e){
      e.preventDefault();
      __user.__login = false;
      Fractal.iterate("dynamic_load", self.$container);
      return false;
    });
  },

  getData: function(callback){
    callback(__user);
  }
});