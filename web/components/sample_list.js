F("example_list", F.Component.extend({
  getData: function(cb){
    this.data = {
      samples: [ "hello", "dynamic", "todo_simple", "editor" ]
    };
    cb();
  }
}));

F("exampleBase", F.Component.extend({
  templateName: "example.tmpl",
  getTitle: null,
  getDesc: null,
  demoComponent: null,
  afterRender: function(cb){
    cb();
  },
  getData: function(cb){
    cb();
  }
}));
