F("listItem", F.Component.extend({
  getData: function(cb, param) {
    var count = this.$container.data("arg");
    cb({count: count});
  }
}));
