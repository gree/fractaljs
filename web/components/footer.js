F("footer", F.Component.extend({
  getData: function(cb){
    var now = new Date();
    this.data = { year: now.getFullYear() };
    cb();
  }
}));
