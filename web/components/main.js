F("main", F.Component.extend({}));

F("body", F.Components.Router.extend({
  getComponentName: function(changed, cb) {
    if (F.env.page) {
      return cb(F.env.page);
    }
    cb("home");
  }
}));

F("MarkDownDoc", F.Component.extend({
  loadOnce: true,
  getDocName: function() { return this.docName || this.name; },
  template: '<div class="container" id="doc">{{{doc}}}</div>',
  getData: function(cb) {
    var self = this;
    var md = "docs/" + self.getDocName() + ".md";
    F.require(md, {contentType: "text/plain"}, function(data){
      F.require("//cdnjs.cloudflare.com/ajax/libs/marked/0.3.2/marked.min.js", function(){
        var doc = marked(data);
        self.data = { doc: doc };
        cb();
      });
    });
  }
}));
