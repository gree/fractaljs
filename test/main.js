F('main', F.app.Router.extend({
  getDefaultName: function() { return F.app.query.page || "testMain"; },
  getComponentName: function(changed, cb) { cb(changed.page ? F.app.query.page : ""); },
}));

