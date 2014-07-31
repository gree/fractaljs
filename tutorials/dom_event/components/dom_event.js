F("dom_event", F.Component.extend({
  afterRender: function(cb){
    this.$('#myBtn').click(function(){
      alert("Hello World");
    });
    cb();
  }
}));

