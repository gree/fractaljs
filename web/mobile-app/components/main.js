Fractal(function(){
  var effectsInPusher = {
    3: true,
    6: true,
    7: true,
    8: true,
    14: true
  };
  Fractal("main", Fractal.Component.extend({
    init: function(name, $container){
      var self = this;
      self._super(name, $container);
      self.isMenuOpen = false;
      self.subscribe("change.effect", function(topic, data){
        self.effectId = data;
        self.load();
      });
      self.subscribe("toggle.menu", function(topic, data){
        self.toggleMenu();
      });
    },
    toggleMenu: function(){
      var self = this;
      if (!self.isMenuOpen) {
        this.$("#st-container").addClass("st-menu-open");
        self.isMenuOpen = true;
      } else {
        this.$("#st-container").removeClass("st-menu-open");
        self.isMenuOpen = false;
      }
    },
    getData: function(callback) {
      this.data = {
        effect: this.effectId || 1,
        in_pusher: function() { return effectsInPusher[this.effect]; }
      }
      callback();
    }
  }));
});
