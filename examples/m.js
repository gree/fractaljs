F.component("m", {
  DefaultPage: "mp_center",
}, F.m.Component);

["center", "left", "right", "top", "bottom"].forEach(function(v){
  F.component("mp_" + v, {
    template: '{{parent}}::{{name}}</h1><div f-component="mp_btns" />',
    getData: function(cb, param){
      cb({
        name: this.name,
        parent: param.m.name,
      });
    },
  });
});

F.component("mp_btns", {
  template: '<button id="btn-push-top">push top</button>' +
    ''+
    '<button id="btn-pop">pop</button>',
  afterRender: function(cb, param){
    var self = this;
    self.$("#btn-push-top").click(function(){
      param.m.push("mp_top", {}, F.m.TRANS.SCALE_DOWN_FROM_TOP);
    });
    self.$("#btn-pop").click(function(){
      param.m.pop({});
    });
    cb();
  }
});
