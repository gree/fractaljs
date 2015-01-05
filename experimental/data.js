F(function(namespace){
  var exports = F.data = {};
  var cache = {}, dataMethods = {}, topicPrefix = "F.data.updated.";

  exports.Component = F.Component.extend({
    data: {},
    init: function(name, $container, f) {
      var self = this;
      self._super(name, $container, f);
      self.dataCount = 0;
      for (var name in self.data) {
        registerData(name, self.data[name], self);
        ++self.dataCount;
      }
    },
    update: function(){
      this.load({update: true});
    },
    getCacheData: function(name, param, cb) {
      F.data.get.bind(this)(name, param, cb);
    },
  });

  var registerData = exports.registerData = function(name, fn, self) {
    console.debug("registerData", name);
    dataMethods[name] = fn.bind(self);
    self.subscribe(topicPrefix + name, function(topic, data, from){
      if (from.id !== self.id) {
        self.update();
      }
    });
  };

  var genSignature = function(param, seq) {
    return JSON.stringify([param, seq]);
  };

  exports.get = (function(){
    var asyncOnce = namespace.createAsyncOnce();

    var main = function(name, param, sig, cb){
      var self = this;
      dataMethods[name](param, function(data){
        cache[name] = {
          data: data,
          sig: sig
        };
        //F.Pubsub.publish(topicPrefix + name, null, self);
        cb(data);
      });
    };

    return function(name, param, cb) {
      if (typeof(param) === "function") {
        cb = param;
        param = {};
      }
      var self = this;
      var sig = genSignature(param, self.seq);
      if (name in cache && cache[name].sig === sig) {
        console.debug("F.data return from cache", name);
        cb(cache[name]);
      } else {
        if (!(name in dataMethods)) {
          throw new Error("unknown data name: " + name);
        }
        asyncOnce(name, function(cb){
          console.debug("F.data get fresh data", name);
          main(name, param, sig, function(data){
            cb(function(cb){ cb(data); });
          });
        }, cb);
      }
    };
  })();

});

