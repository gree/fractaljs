F("github_activities", F.Component.extend({
  getData: function(cb) {
    var self = this;
    F.require("https://api.github.com/repos/gree/fractaljs/events", function(data){
      self.data = {
        activities: data.filter(function(v){ return v.type == "CreateEvent" }),
        desc: function(){
          return "created " + this.payload.ref_type + " " + (this.payload.ref || "");
        }
      };
      cb();
    });
  }
}));
