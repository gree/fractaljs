F.component("main", {
  getDefaultName: function() { return F.app.query.page || "testList"; },
  getComponentName: function(changed, cb) { cb(changed.page ? F.app.query.page : ""); },
}, F.app.Router);
