F("github_activities", F.Component.extend({
  getData: function(cb) {
    var self = this;
    F.require("https://api.github.com/repos/gree/fractaljs/events", function(data){
      self.data = {
        activities: data
        desc: function(){
          if (this.type == "CreateEvent") {
            
          }
        }
      };
      cb();
    });
  }
}));
