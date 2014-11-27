#!/usr/bin/env node

var fs = require("fs");

var getComponent = function(name) {
  return 'F("' + name + '", ' +
    'F.Component.extend({ getData: function(cb){ cb({name: this.fullName}); } })' +
    ');';
};

var getTemplate = function(name) {
  return '<p>' + name + ': {{name}}</p>';
};

var getConfig = function(name){
  return 'F("' + name+ '", F.Env.extend({}));';
}

var getContainer = function(envName, name) {
  return '<div data-role="component" data-name="' + envName + ':' + name + '"></div>\n';
};

var prefix = "__generated__/";
if (!fs.existsSync(prefix)) {
  fs.mkdirSync(prefix);
}

var i=0;
var forEachTemplate = "";
for(; i<100; ++i){
  var group = parseInt(i/100);
  var envName = "require_ns" + group;
  var name = "foreach_" + i;

  var myPrefix = prefix + group + "/";
  if (!fs.existsSync(myPrefix)) {
    fs.mkdirSync(myPrefix);
  }

  var myConfig = prefix + group + "/ns.js";
  if (!fs.existsSync(myConfig)) {
    fs.writeFileSync(myConfig, getConfig(envName));
  }

  (function(fileName){
    fs.writeFileSync(fileName, getComponent(name));
  })(myPrefix + name + ".js");
  (function(fileName){
    fs.writeFileSync(fileName, getTemplate(name));
  })(myPrefix + name + ".tmpl");
  forEachTemplate += getContainer(envName, name);
}

fs.writeFileSync(prefix + "foreach.tmpl", forEachTemplate);

