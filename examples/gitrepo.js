F.component("gitrepo");

var prefix = "https://api.github.com/repos/gree/fractaljs/";
var API = {
  branches: prefix + "branches",
  commits: function(br) { return prefix + "commits?per_page=5&sha=" + br; }
};


var br_monitor = F.ComponentBase.extend({
  init: function(name, $container, f) {
    var self = this;
    self._super(name, $container, f);
    self.subscribe("app.query.changed", function(topic, data){
      if (data.br) self.load({br: F.app.query.br});
    });
  },
  getBr: function(param) {
    return F.app.query.br || param.br || "master";
  }
});

F.component("gitrepo_branches", {
  getData: function(cb, param) {
    var self = this;
    $.get(API.branches, function(data){
      cb({branches: data});
    });
  }
});

F.component("gitrepo_branch_name", {
  template: '{{#isCurrent}}<strong>{{name}}</strong>{{/isCurrent}}' +
    '{{^isCurrent}}<a href="#gitrepo&br={{name}}">{{name}}</a>{{/isCurrent}}',
  getData: function(cb, param) {
    if (!this.br) this.br = this.$container.data("br");
    cb({
      isCurrent: this.getBr(param) === this.br,
      name: this.br
    });
  }
}, br_monitor);

F.component("gitrepo_commits", {
  getData: function(cb, param) {
    var self = this;
    $.get(API.commits(self.getBr(param)), function(data){
      data = data.map(function(v){
        v.sha = v.sha.substr(0, 10);
        return v;
      });
      cb({commits: data});
    });
  }
}, br_monitor);

