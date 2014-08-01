F("markdown", F.Component.extend({
  afterRender: function(cb) {
    var self = this;
    F.require("//cdnjs.cloudflare.com/ajax/libs/marked/0.3.2/marked.min.js", function(){
      var doc = marked(self.data.raw);
      self.$("#marked").html(doc);
      cb();
    });
  },
  getData: function(cb) {
    var self = this;
    var name = "heading1";
    var md = "/../../docs/" + name + ".md";
    F.require(md, {contentType: "text/plain"}, function(data){
      self.data = { raw: data.trim() };
      cb();
    });
  }
}));

