Fractal("body", Fractal.Components.PageTrans.extend({
  getDefaultPage: function() { return "home"; },
  getFirstPage: function() { return Fractal.env.page || this.getDefaultPage(); },
  getDefaultTrans: function() { return Fractal.TRANS_TYPE.SCALE_DOWN_SCALE_UP; },
  init: function(name, $container) {
    var self = this;
    self._super(name, $container);
    self.subscribe(Fractal.TOPIC.ENV_CHANGED, function(topic, data){
      if (!self.rendered) return;
      if (data.page) {
        var param = {
          load: true,
          component: { name: Fractal.env.page },
        };
        self.next(param);
        if (Fractal.env.page !== self.getDefaultPage()) {
          self.publish(Fractal.TOPIC.SET_BACK, {page: self.getDefaultPage()});
        }
      }
    });
    self.subscribe();
  },
}));

