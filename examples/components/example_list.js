F("example_list", F.Component.extend({
  getData: function(cb){
    this.data = {
      examples: [ "hello", "counter", "login", "editor" ]
    };
    cb();
  }
}));

F("exampleBase", F.Component.extend({
  templateName: "example",
  getTitle: null,
  getDesc: null,
  getDemo: null,
  afterRender: function(cb){
    this.$('#tab-' + this.getDemo()).tab();
    cb();
  },
  getData: function(cb){
    var self = this;
    var demo = self.getDemo();
    var jsQuery = "examples/components/" + demo + ".js";
    var tmplQuery = "examples/templates/" + demo + ".tmpl";
    F.require([jsQuery, tmplQuery], {contentType: "text/plain"}, function(data){
      for (var i in data) { data[i] = data[i].trim(); }
      var rows = Math.min(
        Math.max(data[jsQuery].split("\n").length, data[tmplQuery].split("\n").length) + 1,
        20);
      self.data = {
        title: self.getTitle(),
        desc: self.getDesc(),
        demo: demo,
        js: data[jsQuery],
        template: data[tmplQuery],
        rows: rows
      };
      cb();
    });
  }
}));

F("example_hello", F.Components.exampleBase.extend({
  getTitle: function() { return "Hello World - A Simple Component"; },
  getDesc: function() {
    return [
      "Implement 'getData' method to set 'this.data'.",
      "FractalJS will try to find 'hello'.tmpl (Same name with the component),",
      "Then pass 'this.data' as parameter to the template engine.",
      "The 2nd arg of 'getData'('param') lets you set some data from outside. (Explained later)"
    ];
  },
  getDemo: function() { return "hello"; },
}));

F("example_counter", F.Components.exampleBase.extend({
  getTitle: function() { return "Counter - A Component can refresh itself"; },
  getDesc: function() {
    return [
      "'afterRender' is called after the contents is inserted into DOM.",
      "Ususally you will set DOM event handlers in 'afterRender'.",
      "'this.$' only find elements inside the components.",
      "It is always better (or must) to use 'this.$' instead of just '$'.",
      "'this.load' renders the component again."
    ]; },
  getDemo: function() { return "counter"; },
}));

F("example_login", F.Components.exampleBase.extend({
  getTitle: function() { return "Login - Load other components on the fly"; },
  getDesc: function() {
    return [
      "'form' and 'hello2' are children components of 'login'.",
      "They are loaded recursively by 'login' depends on the value of 'componentName'.",
      "Multiple components/templates can be put together in 1 file.",
      "Fractaljs provides a simple Pub/Sub messaging function to support the communication between components.",
      "'param' is available during the loading of the component including its childrens.",
      "'hello'(in the first example), is reused here as a child of 'hello2'."
    ]; },
  getDemo: function() { return "login"; },
}));

F("example_editor", F.Components.exampleBase.extend({
  getTitle: function() { return "JSON Editor - External resources are required" },
  getDesc: function() {
    return [
      "Some external files (javascript, css, template) are required in this example.",
      "We include css before the contents get rendered at 'getData',",
      "Then include js/tmpl at 'afterRender' and initialize the editor.",
      "Fractaljs gets .js and .css by adding 'script' or 'style' tag into DOM.",
      "Fractaljs gets other type of resources (e.g. template, json API, ...) by making ajax requests. "
    ];
  },
  getDemo: function() { return "editor" },
}));

