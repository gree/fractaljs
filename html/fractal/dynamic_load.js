(function(){

  var __user = {
    name: "a",
    email: "a@a.com",
    password: "qwert",
    __login: false
  };

  var getUser = function(callback) {
    setTimeout(callback(__user), 100);
  };

  var doLogin = function(data, callback) {
    setTimeout(function(){
      var success = false;
      if (data.email == __user.email && data.password == __user.password) {
        success = true;
        __user.__login = true;
      }
      callback(success);
    }, 100);
  };

  var doLogout = function(callback) {
    setTimeout(function(){
      __user.__login = false;
      callback();
    }, 100);
  };


  var dynamic_load = Fractal.Component.extend({
    init: function(name, $container){
      var self = this;
      self.userLogin = false;
      self._super(name, $container);
      Fractal.subscribe("user.login", function(topic, login){
        if (!self.rendered) return;
        if (login != self.userLogin) self.load();
      });
    },
    getData: function(callback){
      var self = this;
      getUser(function(user){
        self.userLogin = user.__login;
        callback({name: user.__login ? "mypage" : "login"});
      });
    }
  });


  var login = Fractal.Component.extend({
    afterRender: function(callback){
      var self = this;
      $("#signin").click(function(){
        var data = {
          email: $('#email').val(),
          password: $('#password').val(),
        };
        doLogin(data, function(success){
          if (!success) {
            alert("user/pass is wrong");
            // self.load();
          } else {
            Fractal.publish("user.login", true);
          }
        });
        return false;
      });

      if (callback) callback();
    },
  });


  var mypage = Fractal.Component.extend({
    afterRender: function(callback){
      var self = this;
      $("#signout").click(function(){
        doLogout(function(){
          Fractal.publish("user.login", false);
        });
        return false;
      });
      if (callback) callback();
    },
    getData: function(callback){
      callback(__user);
    }
  });

  this.dynamic_load = dynamic_load;
  this.login = login;
  this.mypage = mypage;

}(this));

