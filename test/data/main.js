F("main", F.Component.extend({}));

var prefix = "https://api.github.com/repos/gree/fractaljs/";
var API = {
  branches: prefix + "branches",
  commits: function(br) { return prefix + "commits?per_page=5&sha=" + br; }
};

var br_monitor = F.data.Component.extend({
  init: function(name, $container, env) {
    var self = this;
    self._super(name, $container, env);
    self.subscribe("app.query.changed", function(topic, data){
      if (data.br) self.load({br: F.app.query.br});
    });
  },
  getCurrentBr: function(param, cb) {
    var self = this;
    var br = F.app.query.br || param.br;
    if (!br) {
      self.getCacheData("branches", function(data){
        cb(data[0].name);
      });
    } else {
      cb(br);
    }
  }
});

F("gitrepo_branches", F.data.Component.extend({
  data: {
    branches: function(param, cb) {
      $.get(API.branches, function(data){
        cb(data);
      });
    },
  },
  getData: function(cb, param) {
    this.getCacheData("branches", function(data){
      cb({branches: data});
    });
  }
}));

F("gitrepo_commits", br_monitor.extend({
  data: {
    commits: function(param, cb) {
      this.getCurrentBr(param, function(br){
        $.get(API.commits(br), function(data){
          data = data.map(function(v){
            v.sha = v.sha.substr(0, 10);
            return v;
          });
          cb(data);
        })
      });
    },
  },
  getData: function(cb, param) {
    var self = this;
    self.getCurrentBr(param, function(br){
      self.getCacheData("commits", br, function(data){
        cb({commits: data});
      });
    });
  }
}));


F("gitrepo_branch_name", br_monitor.extend({
  template: '{{#isCurrent}}<strong>{{name}}</strong>{{/isCurrent}}' +
    '{{^isCurrent}}<a href="#testItem&name=data&br={{name}}">{{name}}</a>{{/isCurrent}}',
  getData: function(cb, param) {
    var self = this;
    if (!self.br) self.br = self.$container.data("br");
    self.getCurrentBr(param, function(br){
      cb({
        isCurrent: br === self.br,
        name: self.br
      });
    });
  }
}));

