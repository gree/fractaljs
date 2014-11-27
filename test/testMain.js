F("testMain", F.Component.extend({
  getData: function(cb) {
    cb({
      tests: [
        "list",
        "recursive",
        "namespace",
        "require",
      ]
    });
  },
}));
