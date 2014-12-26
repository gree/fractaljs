#!/usr/bin/env node

var fs = require("fs");
var prefix = "__generated__/";

var getComponent = function(name) {
  return 'F.component("' + prefix + name + '", ' +
    '{ getData: function(cb){ cb({name: this.name}); }' +
    '});';
};

var getTemplate = function(name) {
  return '<p>' + name + ': {{name}}</p>';
};

var getContainer = function(name) {
  return '<div f-component="' + prefix + name + '"></div>\n';
};

if (!fs.existsSync(prefix)) {
  fs.mkdirSync(prefix);
}

var i=0;
var forEachTemplate = "";
for(; i<500; ++i){
  var name = "foreach_" + i;

  (function(fileName){ fs.writeFileSync(fileName, getComponent(name)); })(prefix + name + ".js");
  (function(fileName){ fs.writeFileSync(fileName, getTemplate(name)); })(prefix + name + ".tmpl");
  forEachTemplate += getContainer(name);
}

fs.writeFileSync(prefix + "foreach.tmpl", forEachTemplate);

