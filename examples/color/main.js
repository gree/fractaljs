F('main', F.Component.extend({}));

F('color', F.Component.extend({
  template: '<p><span style="color:{{name}}">{{envName}}:{{name}}</span></p>',
  getData: function(cb){
    this.data = {
      envName: this.F.getName(),
      name: this.name
    };
    cb();
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

