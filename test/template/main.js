F("main", F.Component.extend({}));

var base = F.Component.extend({
  getData: function(cb){ cb({name: this.fullName}); },
});

F("inside_component", base.extend({
  template: "<span>{{name}}</span>",
}));

F("external_file", base.extend({}));

F("inside_dom", base.extend({}));

F("external_file_name", base.extend({
  templateName: "external_file_other_name.tmpl",
}));

F("inside_dom_name", base.extend({
  templateName: "inside_dom_other_name",
}));

F("nested", base.extend({}));

F("nested_external_file", base.extend({}));

F("nested_inside_dom", base.extend({}));

F("partial", F.Component.extend({
  getData: function(cb){
    var self = this;
    var partials = {};
    self.F.getTemplate("partial_external_file", function(data){
      partials["external_file"] = data;
      self.F.getTemplate("partial_inside_dom", function(data){
        partials["inside_dom"] = data;
        cb(
          {name: self.fullName, a: "a", b: "b"},
          partials
        );
      });
    });
  },
}));
