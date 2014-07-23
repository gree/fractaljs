F("demo_list", F.Component.extend({
  getData: function(cb){
    this.data = {
      demos: [ "hello", "counter", "login", "editor" ]
    };
    cb();
  }
}));

F("demo", F.Component.extend({
  pathPrefix: "web",
  afterRender: function(cb){
    this.$('#tab-' + this.demoName).tab();
    cb();
  },
  getData: function(cb){
    var self = this;
    self.demoName = self.$container.data("demoname");
    var jsQuery = self.pathPrefix + "/components/" + self.demoName + ".js";
    var tmplQuery = self.pathPrefix + "/templates/" + self.demoName + ".tmpl";
    F.require([jsQuery, tmplQuery], {contentType: "text/plain"}, function(data){
      for (var i in data) { data[i] = data[i].trim(); }
      var rows = Math.min(
        Math.max(data[jsQuery].split("\n").length, data[tmplQuery].split("\n").length) + 1,
        20);
      self.data = {
        demo: self.demoName,
        js: data[jsQuery],
        template: data[tmplQuery],
        rows: rows
      };
      cb();
    });
  }
}));


