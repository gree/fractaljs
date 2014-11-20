F('selector', F.Component.extend({
  afterRender: function(cb) {
    var self = this;
    self.$('select').change(function(){
      var name = self.F.getName() + ":" + this.value;
      self.call(':display.change', name);
    });
    cb();
  }
}));

