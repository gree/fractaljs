F("main", F.Component.extend({
  getData: function(cb, param) {
    var i = 0, stop = 100;
    var count = [];
    for (; i<stop; ++i) {
      count.push(i);
    }
    count.push("stop");
    cb({count: count});
  }
}));
