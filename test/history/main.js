F("main", F.app.Router.extend({
  getDefaultName: function() { return F.app.query.p || "page_main"; },
  getComponentName: function(changed, cb) {
    cb(changed.p ? F.app.query.p : "");
  },
}));

var pageBase = F.Component.extend({
  template: '<h3>{{name}}</h3>' +
    '<a href="#testItem&name=history&p=page_main">main</a><br/>' +
    '<a href="#testItem&name=history&p=page1">page1</a><br/>' +
    '<a href="#testItem&name=history&p=page2">page2</a>',
  getData: function(cb){ cb({name: this.name}); },
  afterRender: function(cb){
    var self = this;
    self.$("a").click(function(e){
      var $this = $(this);
      e.preventDefault();
      F.app.navigate(e.target.href);
    });
  }
});

F("page1", pageBase.extend({}));
F("page2", pageBase.extend({}));
F("page_main", pageBase.extend({}));
