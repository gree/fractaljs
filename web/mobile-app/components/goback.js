Fractal(function(){
  Fractal.TOPIC.SET_BACK = "Fractal.SetBack";
});

Fractal("goback", Fractal.Component.extend({
  init: function(name, $container) {
    var self = this;
    self.goback = [];
    self._super(name, $container);
    self.subscribe(Fractal.TOPIC.SET_BACK, function(topic, data){
      self.enable(data);
    });
  },
  afterRender: function(callback){
    var self = this;
    self.getBtn().click(function(){
      var goback = self.goback.pop();
      if (!goback || self.goback.length === 0) self.disable();
      self.getBtn().prop("disabled", true);
      if (goback) goback(function(){
        self.getBtn().prop("disabled", false);
      });
    });
    callback();
  },
  enable: function(goback) {
    if (typeof(goback) === "object") {
      this.goback = [];
      this.goback.push(function(callback){
        Fractal.next(goback.page, goback.params);
        callback();
      });
    } else {
      this.goback.push(goback);
    }
    this.getBtn().css("opacity", 1);
  },
  disable: function() {
    this.goback = []
    this.getBtn().css("opacity", 0);
  },
  getBtn: function() {
    return this.$(".btn-goback");
  },
}));
