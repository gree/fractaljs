F('display', F.Component.extend({
  Public: {
    change: function(name, from) {
      var data = { dispName: name };
      this.load({data: data});
    }
  },
  getData: function(cb, param){ cb(); }
}));

