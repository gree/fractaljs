F("counter", F.Component.extend({
  counter: 0,
  afterRender: function(cb){
    var self = this;
    self.$("#btn-increment").click(function(){
      ++self.counter;
      self.load();
    });
    cb();
  },
  getData: function(cb){
    this.data = {
      val: this.counter
    };
    cb();
  },
}));

