F.component("template");

var base = F.ComponentBase.extend({
  getData: function(cb){ cb({name: this.name}); },
});

F.component("inside_component", { template: "<span>{{name}} OK</span>" }, base);
F.component("external_file", {}, base);
F.component("inside_dom", {}, base);
F.component("external_file_name", { templateName: "external_file_other_name.tmpl" }, base);
F.component("inside_dom_name", { templateName: "inside_dom_other_name" }, base);
F.component("nested", {}, base);
F.component("nested_external_file", {}, base);
F.component("nested_inside_dom", {}, base);
F.component("partial", {
  getData: function(cb){
    var self = this;
    var partials = {};
    self.env.getTemplate("partial_external_file", function(data){
      partials["external_file"] = data;
      self.env.getTemplate("partial_inside_dom", function(data){
        partials["inside_dom"] = data;
        cb(
          {name: self.fullName, a: "a", b: "b"},
          partials
        );
      });
    });
  },
}, base);

