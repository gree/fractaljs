var Store = (function(){
  var items = [];
  for(var i=0; i<100; ++i) {
    items.push({_id: i, name: "item" + i, value: "value" + i});
  }
  return {
    getItems: function(callback){
      setTimeout(function(){
        callback(items);
      }, 250);
    },
    getItem: function(id, callback){
      setTimeout(function(){
        callback(items[id]);
      }, 250);
    }
  };
})();

Fractal("items", Fractal.Component.extend({
  afterRender: function(callback){
    var self = this;
    self.$(".btn-item").click(function(){
      var id = $(this).data("id");
      id = parseInt(id);
      self.show("item", Fractal.TRANS_TYPE.MOVE_TO_LEFT_FROM_RIGHT, {_id: id});
    });
    callback();
  },
  show: function(name, trans, data, callback){
    var self = this;
    var param = {
      load: true,
      component: {
        name: name,
        data: data,
      },
    };
    if (trans) param.trans = trans;
    self.publish("body.next", param);
    self.publish(Fractal.TOPIC.SET_BACK, function(){
      var backParam = { component: {name: self.name}, load: true };
      if (trans) backParam.trans = Fractal.TRANS_TYPE.MAX - trans;
      self.publish("body.next", backParam);
    });
  },
  getData: function(callback){
    var self = this;
    Store.getItems(function(items){
      self.data = {items: items};
      callback();
    });
  },
}));

Fractal("item", Fractal.Component.extend({
  getData: function(callback){
    var self = this;
    var id = self.param._id;
    Store.getItem(id, function(item){
      self.data = item;
      callback();
    });
  }
}));
