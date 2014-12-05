F("gitrepo", F.Component.extend({}));

var prefix = "https://api.github.com/repos/gree/fractaljs/";
var API = {
  branches: prefix + "branches",
  commits: function(br) { return prefix + "commits?per_page=5&sha=" + br; }
};


var br_monitor = F.Component.extend({
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

F("gitrepo_branches", F.Component.extend({
  getData: function(cb, param) {
    var self = this;
    $.get(API.branches, function(data){
      cb({branches: data});
    });
  }
}));

F("gitrepo_branch_name", br_monitor.extend({
  template: '{{#isCurrent}}<strong>{{name}}</strong>{{/isCurrent}}' +
    '{{^isCurrent}}<a href="#gitrepo&br={{name}}">{{name}}</a>{{/isCurrent}}',
  getData: function(cb, param) {
    if (!this.br) this.br = this.$container.data("br");
    cb({
      isCurrent: this.getBr(param) === this.br,
      name: this.br
    });
  }
}));

F("gitrepo_commits", br_monitor.extend({
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
}));

