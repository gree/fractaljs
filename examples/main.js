F.component("main", {
  getDefaultName: function() { return F.app.query.page || "list"; },
  getComponentName: function(changed, cb) {
    var page = changed.page ? (F.app.query.page || "list") : "";
    cb(page);
  },
}, F.app.Router);

var examples = [
  "markdown",
  "gitrepo",
  { "todomvc": "todomvc.html" },
  "datagrid",
];

F.component("list", {
  getData: function(cb) {
    var data = examples.map(function(v){
      if (typeof(v) === "string") {
        return { href: "#" + v, name: v }
      } else {
        for (var i in v) {
          return { href: v[i], name: i };
        }
      }
    });
    cb({ examples: data });
  }
});

