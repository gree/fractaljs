(function(){
  if (!window.Fractal) {
    throw new Error("include fractal.js first");
  }

  Fractal.DataMonitor = (function () {
    var DEFAULT_INTERVAL = 5000; // check every 5sec
    var _dataNameDict = {};
    var _runner = null;

    var DataMonitor = {};
    DataMonitor.register = function(dataNameList, interval) {
      if (dataNameList.length == 0) return;
      for (var i in dataNameList) {
        if (dataNameList[i] in _dataNameDict) continue;
        _dataNameDict[dataNameList[i]] = true;
      }
      // start after the first registration
      if (!_runner) {
        this.start(interval);
      }
    };

    DataMonitor.unregister = function(dataName) {
      if (dataName in _dataNameDict) {
        delete _dataNameDict[dataName];
      }
    };

    DataMonitor.start = function(interval) {
      if (_runner) return;
      var empty = true;
      for (var i in _dataNameDict) {
        empty = false;
        break;
      }
      if (empty) return;
      var interval = interval || DEFAULT_INTERVAL;
      var self = this;
      _runner = setInterval(function(){
        var dataList = [];
        for (var i in _dataNameDict) {
          dataList.push(i);
        }
        if (dataList.length == 0) {
          self.stop();
        }
        Fractal.require(dataList, {forced: true}, function() {});
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

    return DataMonitor;
  })();

  Fractal.Console = (function(){
    // initial setup
    var __log_method_in_order = ["debug", "log", "info", "warn", "error"];
    var LogLevel = {};
    for (var level in __log_method_in_order) {
      var levelName = __log_method_in_order[level];
      LogLevel[levelName] = level;
    }
    var MyConsole = {};
    for (var levelName in LogLevel) {
      MyConsole[levelName] = {
        true: window.console[levelName].bind(window.console),
        false: function(){}
      };
    }

    var myLevel = -1;
    var setLogLevel = function(newLevel) {
      if (newLevel == myLevel) return;
      if (newLevel < 0 || newLevel >= __log_method_in_order.length) return;
      window.console = {}; // overide the original !!
      var enabled = false;
      for (var level in __log_method_in_order) {
        var levelName = __log_method_in_order[level];
        if (level == newLevel) enabled = true;
        window.console[levelName] = MyConsole[levelName][enabled];
      }
      myLevel = newLevel;
    };

    return {
      LogLevel: LogLevel,
      setLogLevel: setLogLevel
    };
  })();

  Fractal.models = (function(){
    var models = {};
    var MODELS_PREFIX = "Fractal.Models.";

    var __load = function(itemKey, initData) {
      var data = null;
      var stored = localStorage.getItem(itemKey);
      if (stored) {
        try {
          data = JSON.parse(stored);
        } catch (e) {
          console.error(itemKey, "storage was broken");
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
      var INIT_DATA = {};

      var FlatKV = function(name) {
        this.key = KEY_PREFIX + name;
      };
      var proto = FlatKV.prototype;

      proto.getAll = function(key) {
        return __load(this.key, INIT_DATA);
      };
      proto.get = function(key) {
        var data = __load(this.key, INIT_DATA);
        return data[key];
      };
      proto.set = function(key, value) {
        var data = __load(this.key, INIT_DATA);
        data[key] = value;
        __save(this.key, data);
      };
      proto.unset = function(key, value) {
        var data = __load(this.key, INIT_DATA);
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
      var INIT_DATA = {
        max: 100,
        uniq: true,
        head: -1,
        container: []
      };

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

      var Ring = function(name){
        this.key = KEY_PREFIX + name;
      };
      var proto = Ring.prototype;

      proto.getStoreId = function() {
        return this.key;
      };
      proto.setMax = function(max) {
        var data = __load(this.key, INIT_DATA);
        data.max = max;
        __save(this.key, data);
      };
      proto.setUniq = function(isUniq) {
        var data = __load(this.key, INIT_DATA);
        data.uniq = isUniq;
        __save(this.key, data);
      };
      proto.addList = function(valueList, getKey) {
        var self = this;
        var data = __load(this.key, INIT_DATA);
        valueList.forEach(function(v){ self.__add(data, v, getKey); });
        __save(this.key, data);
      },
      proto.addOne = function(value, getKey) {
        var data = __load(this.key, INIT_DATA);
        this.add(data, value, getKey);
        __save(this.key, data);
      }
      proto.__add = function(data, value, getKey) {
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
        var data = __load(this.key, INIT_DATA);
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
        var data = __load(this.key, INIT_DATA);
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
        var data = __load(this.key, INIT_DATA);
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
      proto.clear = function() {
        __remove(this.key);
      };

      return Ring;
    })();

    return models;
  })();

})();
