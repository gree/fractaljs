F("gitrepo", F.Component.extend({}));

var prefix = "https://api.github.com/repos/gree/fractaljs/";
var API = {
  branches: prefix + "branches",
  commits: function(br) { return prefix + "commits?per_page=5&sha=" + br; }
};


var BranchMonitor = F.Component.extend({
  init: function(name, $container, env) {
    var self = this;
    self._super(name, $container, env);
    self.subscribe("app.query.changed", function(topic, data){
      if (data.br) self.load({br: F.app.query.br});
    });
  },
  getBr: function(param) {
    return F.app.query.br || param.br || "master";
  }
});

F("gitbranches", BranchMonitor.extend({
  getData: function(cb, param) {
    var self = this;
    if (self.cached) cb({branches: self.cached});
    else {
      $.get(API.branches, function(data){
        for (var i in data) {
          if (data[i].name === self.getBr(param)) data[i].isCurrent = true;
        }
        cb({branches: data});
      });
    }
  }
}));

F("gitcommits", BranchMonitor.extend({
  getData: function(cb, param) {
    var self = this;
    $.get(API.commits(self.getBr(param)), function(data){
      cb({commits: data});
    });
  }
}));
