#!/usr/bin/env node

var fs = require("fs");

var getComponent = function(name) {
  return 'F("' + name + '", F.Component.extend({ getData: function(cb){ cb({name: this.name}); } }));';
}

var getTemplate = function(name) {
  return '<p>' + name + ': {{name}}</p>';
}

var getContainer = function(name) {
  return '<div data-role="component" data-name="' + name + '"></div>\n';
}

var i=0;
var forEachTemplate = "";
for(; i<100; ++i){
  var name = "foreach_" + i;
  (function(fileName){
    fs.writeFileSync(fileName, getComponent(name));
  })("components/" + name + ".js");
  (function(fileName){
    fs.writeFileSync(fileName, getTemplate(name));
  })("templates/" + name + ".tmpl");
  forEachTemplate += getContainer(name);
}

fs.writeFileSync("templates/foreach.tmpl", forEachTemplate);

