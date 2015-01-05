var w = 20, h = 20, max = 1000, interval = 50;

var Publisher = (function(){
  var getN = function(range) {
    return Math.floor(Math.random() * range);
  };

  var publish = function(next){
    var topic = getTopic(getN(w), getN(h));
    F.Pubsub.publish(topic, getN(1000));
  };

  var getTopic = function(row, col) {
    return "d." + row + "." + col;
  };

  var myInterval = null;
  return {
    start: function(){
      console.log("publisher started");
      myInterval = setInterval(publish, interval);
    },
    stop: function(){
      console.log("publisher stopped");
      clearInterval(myInterval);
    },
    getTopic: getTopic,
  };
})();


F.component("datagrid", {
  afterRender: function(cb) {
    Publisher.start();
    cb();
  },
  getData: function(cb) {
    var i = 0, j = 0, rows = [];
    for (; i<h; ++i) {
      rows.push({r: i, cols: []})
    }
    for (i=0; i<h; ++i) {
      var cols = rows[i].cols;
      for (j=0; j<w; ++j) {
        cols.push({c: j});
      }
    }
    cb({rows: rows});
  },
  unload: function() {
    Publisher.stop();
    this._super();
    console.log("unloaded");
  }
});


F.component("cell", {
  template: '<span></span>',
  init: function(name, $container, f) {
    var self = this;
    self._super(name, $container, f);
    var r = $container.data("r"), c = $container.data("c"), topic = Publisher.getTopic(r, c);
    self.subscribe(topic, function(topic, data){
      self.update(data);
    });
  },
  afterRender: function(cb) {
    this.$val = this.$("span");
    cb();
  },
  update: function(val){
    this.$val.text(val);
  },
});

