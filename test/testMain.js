F("testMain", F.Component.extend({
  getData: function(cb) {
    var envs = [];
    for (var i in this.F.Envs) {
      envs.push(i);
    }
    cb({ tests: envs.sort() });
  },
}));
