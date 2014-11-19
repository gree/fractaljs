(function(namespace){
  // TODO replace with faster algorithm, data structure
  var MaxStocked = 100;
  var Stock = function(){
    this.arrived = {};
    this.buffer = {};
  };
  Stock.prototype.count = function(){
    var count = 0;
    for (var i in this.buffer) ++count;
    return count;
  };
  Stock.prototype.add = function(topic, data) {
    if (this.count() >= MaxStocked && !(topic in this.buffer)) {
      var oldest = new Data();
      var oldestTopic = "";
      for (var i in this.arrived) {
        if (this.arrived[i] < oldest) {
          oldest = this.arrived[i];
          oldestTopic = i;
        }
      }
      delete this.buffer[oldestTopic];
      delete this.arrived[oldestTopic];
    }
    this.buffer[topic] = data;
    this.arrived[topic] = new Date();
  };
  Stock.prototype.get = function(topic) {
    if (topic in this.buffer) {
      var data = this.buffer[topic];
      delete this.buffer[topic];
      delete this.arrived[topic];
      return data;
    }
    return null;
  };

  var topics = {};
  var seq = 0;
  var stock = new Stock();
  namespace.Pubsub = (function() {
    return {
      publish: function(topic, data, from) {
        if (!topics[topic]) {
          stock.add(topic, {d: data, f: from});
          return;
        }
        var subscribers = topics[topic];
        for (var i in subscribers) subscribers[i].callback(topic, data, from);
      },
      subscribe: function(topic, callback) {
        if (!topics[topic]) topics[topic] = [];
        var token = ++seq;
        topics[topic].push({
          token: token,
          callback: callback
        });
        var data = stock.get(topic);
        if (data) callback(topic, data.d, data.f);
        return token;
      },
      unsubscribe: function(topic, token) {
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
  }());
})(window.F._private);

