F("menu", F.Component.extend({
  afterRender: function(cb) {
    var self = this;
    self.$("#showActivities").click(function(){
      self.publish("main.load", {componentName: "github_activities2"});
    });
    cb();
  }
}));
