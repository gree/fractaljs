F.Pubsub = (function(){
  // TODO replace with faster algorithm, data structure
  var MaxStocked = 100;
  var Stock = function(){
    this.arrived = {};
    this.buffer = {};
  };
  var proto = Stock.prototype;
  proto.count = function(){
    var count = 0;
    for (var i in this.buffer) ++count;
    return count;
  };
  proto.add = function(topic, data) {
    var self = this;
    if (self.count() >= MaxStocked && !(topic in self.buffer)) {
      var oldest = new Data();
      var oldestTopic = "";
      for (var i in self.arrived) {
        if (self.arrived[i] < oldest) {
          oldest = self.arrived[i];
          oldestTopic = i;
        }
      }
      delete self.buffer[oldestTopic];
      delete self.arrived[oldestTopic];
    }
    self.buffer[topic] = data;
    self.arrived[topic] = new Date();
  };
  proto.get = function(topic) {
    var self = this;
    if (topic in self.buffer) {
      var data = self.buffer[topic];
      delete self.buffer[topic];
      delete self.arrived[topic];
      return data;
    }
    return null;
  };

  var topics = {}, seq = 0, stock = new Stock();

  return {
    publish: function(topic, data, from) {
      if (!topics[topic]) {
        console.debug("stock message", topic, (from && from.name), data);
        stock.add(topic, {d: data, f: from});
        return;
      }
      var subscribers = topics[topic];
      for (var i in subscribers) subscribers[i].cb(topic, data, from);
    },
    subscribe: function(topic, callback) {
      console.debug("subscribe", topic);
      if (!topics[topic]) topics[topic] = [];
      var token = ++seq;
      topics[topic].push({
        token: token,
        cb: callback
      });
      var data = stock.get(topic);
      if (data) {
        console.debug("get from stock", topic, data.f, data.d);
        callback(topic, data.d, data.f);
      }
      return token;
    },
    unsubscribe: function(topic, token) {
      console.debug("unsubscribe", topic);
      if (!(topic in topics)) return;
      var subscribers = topics[topic];
      for (var i in subscribers) {
        if (subscribers[i].token === token) {
          subscribers.splice(i, 1);
          break;
        }
      }
      if (subscribers.length === 0) delete topics[topic];
    },
  };

})();

