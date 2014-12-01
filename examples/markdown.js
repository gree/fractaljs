F("markdown", F.Component.extend({
  afterRender: function(cb) {
    var self = this;
    self.F.require("//cdnjs.cloudflare.com/ajax/libs/marked/0.3.2/marked.min.js", function(){
      var doc = marked(self.mdData);
      self.$("#marked").html(doc);
      cb();
    });
  },
  getData: function(cb) {
    var self = this;
    var md = "/README.md";
    $.get(md, function(data){
      self.mdData = data;
      cb({raw: data});
    });
  }
}));
