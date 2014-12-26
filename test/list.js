F.component("list", {
  getData: function(cb, param) {
    var i = 0, stop = 100;
    var count = [];
    for (; i<stop; ++i) {
      count.push(i);
    }
    count.push("stop");
    cb({count: count});
  }
});

F.component("listItem", {
  resetDisplay: "inline",
  getData: function(cb, param) {
    var count = this.$container.data("arg");
    cb({count: count});
  }
});

