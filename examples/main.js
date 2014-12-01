F('main', F.app.Router.extend({
  getDefaultName: function() { return F.app.query.page || "list"; },
  getComponentName: function(changed, cb) {
    var page = changed.page ? F.app.query.page : "list";
    page = page || "list";
    cb(page);
  },
}));

