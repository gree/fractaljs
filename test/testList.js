F.component("testList", {
  getData: function(cb) {
    var tests = [
      "list",
      "recursive",
      "require",
      "template",
      "history",
    ];
    cb({ tests: tests.sort() });
  },
});

