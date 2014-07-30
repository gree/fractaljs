F("world2", F.Component.extend({
  getData: function(cb){
    this.data = { name: "FractalJS" };
    cb();
  }
}));
