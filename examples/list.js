var examples = [
  "markdown",
  "gitrepo",
  { "todomvc": "todomvc.html" }
];

F("list", F.Component.extend({
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
}));

