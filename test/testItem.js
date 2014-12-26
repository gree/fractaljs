F.component("testItem", {
  getData: function(cb) {
    cb({name: F.app.query.name});
  }
});

F.component("testBody", {
  getDefaultName: function() {
    return F.app.query.name || "list";
  },
  getComponentName: function(changed, cb) {
    cb(changed.name ? F.app.query.name : null);
  },
}, F.app.Router);

