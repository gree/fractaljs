F('main', F.Component.extend({}));

F('font', F.Component.extend({
  template: '<p><span style="font-family:{{name}}">{{envName}}:{{name}}</span></p>',
  getData: function(cb){
    this.data = {
      envName: this.F.getName(),
      name: this.name
    };
    cb();
  }
}));

F('Georgia', function(env, cb){
  env.getComponentClass('font', function(base){
    cb(base.extend({}));
  });
});

F('Arial', function(env, cb){
  env.getComponentClass('font', function(base){
    cb(base.extend({}));
  });
});

