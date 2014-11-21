F("main", F.Component.extend({
  getData: function(cb, param) {
    if (!param.count) param.count = 1;
    else ++param.count;
    cb({
      enabled: param.count < 100,
      count: param.count,
    });
  }
}));


