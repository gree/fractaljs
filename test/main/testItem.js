F("testItem", F.Component.extend({
  getData: function(cb) {
    cb({name: F.app.query.name});
  }
}));

F("testBody", F.app.Router.extend({
  getDefaultName: function() { return "namespace:main"; },
  getComponentName: function(changed, cb) {
    if (changed.name) {
      cb(F.app.query.name + ":" + main);
    } else {
      cb();
    }
  },
}));
