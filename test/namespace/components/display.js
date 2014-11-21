F('display', F.Component.extend({
  Public: {
    change: function(name, from) {
      this.load({name: name});
    }
  },
  getData: function(cb, param){
    cb(param);
  }
}));

