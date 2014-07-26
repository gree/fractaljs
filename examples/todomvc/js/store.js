(function( window ) {
	'use strict';

	// Your starting point. Enjoy the ride!
  var Store = (function(){
    var __seq = 0;
    var Store = function(){
      this.name = "OBJLIST." + (++__seq);
      this.topic = this.name + ".updated";
      this.getAll();
    };
    var proto = Store.prototype;
    proto.getAll = function() {
      if (!this.data) {
        var data = localStorage.getItem(this.name);
        if (data) data = JSON.parse(data);
        this.data = data || [];
      }
      return this.data;
    };
    var sync = function() {
      localStorage.setItem(this.name, JSON.stringify(this.data));
      Fractal.Pubsub.publish(this.topic, this.data);
    };
    proto.insert = function(item) {
      var id = this.data.length;
      item._id = id;
      this.data[id] = item;
      sync.bind(this)();
    };
    proto.update = function(idList, key, value) {
      if (!Array.isArray(idList)) idList = [idList];
      var i = 0, len = this.data.length;
      for (; i<len; ++i) {
        var id = idList[i];
        var j = 0;
        for (; j<this.data.length; ++j) {
          if (this.data[j]._id == id) {
            this.data[j][key] = value;
            break;
          }
        }
      }
      sync.bind(this)();
    };
    proto.remove = function(idList) {
      if (!Array.isArray(idList)) idList = [idList];
      var i = 0, len = idList.length;
      for (; i<len; ++i) {
        var id = idList[i];
        var j = 0;
        for (; j<this.data.length; ++j) {
          if (this.data[j]._id == id) {
            this.data.splice(j, 1); // we only do 1 splice, so it is safe
            break;
          }
        }
      }
      sync.bind(this)();
    };
    proto.onChange = function(cb) { Fractal.Pubsub.subscribe(this.topic, cb); };

    return Store;
  })();

  window.GetStore = (function(){
    var store = new Store();
    return function() { return store; };
  })();

})( window );
