F('main', F.Component.extend({}));

F('color', F.Component.extend({
  template: '<span style="color:{{name}}">{{envName}}:{{name}}</span>',
  getData: function(cb, param){
    cb({
      envName: this.F.name,
      name: this.name
    });
  }
}));

F('red', function(env, cb){
  env.getComponentClass('color', function(base){
    cb(base.extend({}));
  });
});

F('blue', function(env, cb){
  env.getComponentClass('color', function(base){
    cb(base.extend({}));
  });
});

