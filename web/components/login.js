F(function(){
  var KEY = "fractaljs-demo-loginName";
  Fractal.TOPIC.LOAD_LOGIN = "load.login";

  F("login", F.Component.extend({
    init: function(name, $container) {
      var self = this;
      self._super(name, $container);
      self.subscribe(Fractal.TOPIC.LOAD_LOGIN, function(){
        var name = localStorage.getItem(KEY);
        self.load(name);
      });
    },
    getData: function(cb, param) {
      var name = param;
      if (name) {
        this.data = { componentName: "hello2" };
      } else {
        this.data = { componentName: "form" };
      }
      cb();
    }
  }));

  F("form", F.Component.extend({
    afterRender: function(cb){
      var self = this;
      self.$("#btn-login").click(function(){
        var name = self.$("#input-name").val().trim();
        if (!name) return false;
        localStorage.setItem(KEY, name);
        self.publish(Fractal.TOPIC.LOAD_LOGIN);
        return false;
      });
      cb();
    }
  }));

  F("hello2", F.Component.extend({
    afterRender: function(cb){
      var self = this;
      self.$("#btn-logout").click(function(){
        localStorage.removeItem(KEY);
        self.publish(Fractal.TOPIC.LOAD_LOGIN);
      });
      cb();
    }
  }));
});
