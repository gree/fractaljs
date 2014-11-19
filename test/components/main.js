F('main', F.Component.extend({
  init: function(name, $container, env) {
    var self = this;
    self._super(name, $container, env);

    self.subscribe(F.TOPIC.COMPONENT_LOADED_MYSELF, function(topic, data, from){
      // let it go
      // console.log(topic, from.name);
    });
    self.subscribe(F.TOPIC.COMPONENT_LOADED_CHILDREN, function(topic, data, from){
      // let it go
      // console.log(topic, from.name);
    });
  }
}));

