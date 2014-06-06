Fractal(function(){
  Fractal.DataMonitor = (function () {
    var DEFAULT_INTERVAL = 10000; // check every 60 sec
    var _dataSubscribers = {};
    var _runner = null;

    Fractal.Pubsub.subscribe(Fractal.TOPIC.DATA_UPDATED, function(topic, data){
      var called = {};
      for (var i in data) {
        if (i in _dataSubscribers) {
          var subscribers = _dataSubscribers[i];
          for (var j in subscribers) {
            if (j in called) continue;
            called[j] = true;
            console.debug("DataMonitor callback", j);
            subscribers[j]();
          }
        }
      }
    });

    var DataMonitor = {};
    DataMonitor.register = function(dataName, component, onUpdate) {
      if (!(dataName in _dataSubscribers)) {
        _dataSubscribers[dataName] = {};
      }
      if (component.name in _dataSubscribers[dataName]) return;
      console.debug("DataMonitor register", dataName, component.name);
      _dataSubscribers[dataName][component.name] = onUpdate.bind(component);
      if (!_runner) {
        this.start();
      }
    };

    DataMonitor.unregister = function(dataName, component) {
      if (dataName in _dataSubscribers) {
        var subscribers  = _dataSubscribers[dataName];
        if (component.name in subscribers) {
          delete subscribers[component.name];
        }
        var empty = true;
        for (var i in subscribers) {
          empty = false;
          break;
        }
        if (empty) delete _dataSubscribers[dataName];
      }
    };

    DataMonitor.__start = function(interval) {
      if (_runner) return;
      var empty = true;
      for (var i in _dataSubscribers) {
        empty = false;
        break;
      }
      if (empty) return;

      var self = this;
      var interval = interval || DEFAULT_INTERVAL;

      var __getData = function(){
        var dataList = [];
        for (var i in _dataSubscribers) {
          dataList.push(i);
        }
        console.debug("DataMonitor require", dataList);
        Fractal.require(dataList, {forced: true});
      };
      __getData();
      _runner = setInterval(function(){
        __getData();
      }, interval);
      console.debug("DataMonitor started");
    };

    DataMonitor.stop = function() {
      if (_runner) {
        clearInterval(_runner);
        _runner = null;
        console.debug("DataMonitor stopped");
      }
    };

    DataMonitor.enable = function(){
      DataMonitor.start = DataMonitor.__start;
      DataMonitor.start();
    };

    DataMonitor.disable = function(){
      DataMonitor.start = function(){};
      DataMonitor.stop();
    };

    DataMonitor.enable();
    return DataMonitor;
  })();

  Fractal.Console = (function(){
    // initial setup
    var __log_method_in_order = ["debug", "log", "info", "warn", "error"];
    var MyConsole = {};
    for (var i in __log_method_in_order) {
      var levelName = __log_method_in_order[i];
      MyConsole[levelName] = {
        true: window.console[levelName].bind(window.console),
        false: function(){}
      };
    }

    var myLevel = "debug";
    var setLogLevel = function(newLevel) {
      if (newLevel == myLevel) return;
      window.console = {}; // overide the original !!
      var enabled = false;
      for (var i in __log_method_in_order) {
        var levelName = __log_method_in_order[i];
        if (levelName == newLevel) enabled = true;
        window.console[levelName] = MyConsole[levelName][enabled];
      }
      myLevel = newLevel;
    };

    return {
      LogLevel: __log_method_in_order,
      setLogLevel: setLogLevel
    };
  })();

  Fractal.models = (function(){
    var models = {};
    var MODELS_PREFIX = "Fractal.Models.";

    var __exists = function(itemKey) {
      return !!localStorage.getItem(itemKey);
    }

    var __load = function(itemKey, initData) {
      var data = null;
      var stored = localStorage.getItem(itemKey);
      if (stored) {
        try {
          data = JSON.parse(stored);
        } catch (e) {
          console.error(itemKey, "storage was broken", stored);
        }
      }
      if (!data) {
        __save(itemKey, initData);
        data = initData;
      }
      return data;
    };

    var __save = function(itemKey, data) {
      localStorage.setItem(itemKey, JSON.stringify(data));
      Fractal.Pubsub.publish(itemKey + ".updated");
    };

    var __remove = function(itemKey) {
      localStorage.removeItem(itemKey);
    };

    models.FlatKV = (function(){
      var KEY_PREFIX = MODELS_PREFIX + "flatkv.";

      var FlatKV = function(name, defaults) {
        this.key = KEY_PREFIX + name;
        this.defaults = defaults;
      };
      var proto = FlatKV.prototype;

      proto.getAll = function(key) {
        return __load(this.key, this.defaults);
      };
      proto.get = function(key) {
        var data = __load(this.key, this.defaults);
        return data[key];
      };
      proto.set = function(key, value) {
        if (typeof key == "object") {
          __remove(this.key);
          var data = __load(this.key, this.defaults);
          var obj = key;
          for(var i in obj) {
            data[i] = obj[i];
          }
          __save(this.key, data);
        } else {
          var data = __load(this.key, this.defaults);
          data[key] = value;
          __save(this.key, data);
        }
      };
      proto.unset = function(key, value) {
        var data = __load(this.key, this.defaults);
        delete data[key];
        __save(this.key, data);
      };
      proto.clear = function() {
        __remove(this.key);
      };

      return FlatKV;
    })();

    models.Ring = (function(){
      var KEY_PREFIX = MODELS_PREFIX + "Ring.";

      var __guessGetKey = function(v) {
        if (typeof(v) == "object") {
          if (v.key || v._id) {
            return function(v) { return v.key || v._id; };
          }
        } else {
          return function(v) { return v; };
        }
        return JSON.stringify(v);
      };

      var Ring = function(name, max, uniq){
        if (typeof uniq == 'undefined') uniq = true;
        this.key = KEY_PREFIX + name;
        this.defaults = {
          max: max || 100,
          uniq: !!uniq,
          head: -1,
          container: []
        };
      };
      var proto = Ring.prototype;

      proto.exists = function(){
        return __exists(this.key);
      };

      proto.getStoreId = function() {
        return this.key;
      };
      proto.setMax = function(max) {
        var data = __load(this.key, this.defaults);
        data.max = max;
        __save(this.key, data);
      };
      proto.setUniq = function(isUniq) {
        var data = __load(this.key, this.defaults);
        data.uniq = isUniq;
        __save(this.key, data);
      };
      proto.addList = function(valueList, getKey) {
        var self = this;
        var data = __load(this.key, this.defaults);
        valueList.forEach(function(v){ self.__add(data, v, getKey); });
        __save(this.key, data);
      },
      proto.add = function(value, getKey) {
        var data = __load(this.key, this.defaults);
        this.__add(data, value, getKey);
        __save(this.key, data);
      }
      proto.__add = function(data, value, getKey) {
        if (!value) return;
        if (data.uniq) {
          // duplicate check
          getKey = getKey || __guessGetKey(value);
          var keyToAdd = getKey(value);
          for (var i in data.container) {
            if (data.container[i]) {
              if (keyToAdd == getKey(data.container[i])) {
                return;
              }
            }
          }
        }
        data.head++;
        if (data.head == data.max) data.head = 0;
        data.container[data.head] = value;
      };
      proto.update = function(value, getKey){
        var data = __load(this.key, this.defaults);
        getKey = getKey || __guessGetKey(value);
        var keyToUpd = getKey(value);
        var __updated = false;
        for (var i in data.container) {
          if (data.container[i]) {
            if (keyToUpd == getKey(data.container[i])) {
              __updated = true;
              data.container[i] = value;
            }
          }
        }
        if (__updated) {
          __save(this.key, data);
        }
      },
      proto.remove = function(value, getKey) {
        var data = __load(this.key, this.defaults);
        getKey = getKey || __guessGetKey(value);
        var keyToRemove = getKey(value);

        var updated = false;
        for (var i in data.container) {
          if (data.container[i]) {
            if (keyToRemove == getKey(data.container[i])) {
              delete data.container[i];
              updated = true;
              if (data.uniq) break;
            }
          }
        }
        if (updated) __save(this.key, data);
      };
      proto.getMostRecent = function(num) {
        var data = __load(this.key, this.defaults);
        num = num || data.max;
        if (num > data.max) num = data.max;
        var result = [];
        for (var i=0; i<data.max; i++) {
          var pos = data.head - i;
          if (pos < 0) pos = data.max - 1;
          if (data.container[pos]) {
            result.push(data.container[pos]);
            if (result.length == num) break;
          }
        }
        return result;
      };
      proto.shift = function() {
        var data = __load(this.key, this.defaults);
        for (var i=0; i<data.container.length; i++) {
          var pos = data.head + i + 1;
          if (pos >= data.container.length) pos = pos - data.container.length;
          if (typeof (data.container[pos]) !== 'undefined' && data.container[pos] !== null) {
            var ret = data.container[pos];
            this.remove(ret);
            return ret
          }
        }
        return null;
      };

      proto.clear = function() {
        __remove(this.key);
      };

      return Ring;
    })();

    return models;
  })();
});
