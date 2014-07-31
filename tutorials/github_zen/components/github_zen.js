F("github_zen", F.Component.extend({
  afterRender: function(cb) {
    var self = this;
    self.$('.btn').click(function(){
      self.load();
    });
    cb();
  },
  getData: function(cb) {
    var self = this;
    F.require("https://api.github.com/zen", {contentType: "application/vnd.github.VERSION.text+json"}, function(data){
      self.data = { zen: data };
      cb();
    });
  }
}));
