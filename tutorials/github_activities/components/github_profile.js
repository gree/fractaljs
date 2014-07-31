F("github_profile", F.Component.extend({
  getData: function(cb, param) {
    var self = this;
    var user = (param && param.data);
    if (user) {
      F.require("https://api.github.com/users/" + user, function(data){
        self.data = data;
        cb();
      });
    } else {
      self.data = { error: "no user" };
      cb();
    }
  }
}));
