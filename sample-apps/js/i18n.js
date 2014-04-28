
(function () {
  'use strict';

  var getJson = function (path, callback) {
    var xhr = new XMLHttpRequest();
      xhr.open("GET", path, true);
      xhr.onreadystatechange = function () {
        if (xhr.readyState == 4) {
          if (xhr.status == 200) {
            var data = JSON.parse(xhr.responseText);
            callback(data);
          } else {
            callback(null);
          }
        }
      }
      xhr.setRequestHeader("Accept" , "application/json");
      xhr.send("");
  };

  function i18n(lang) {
    this._cache = {};
    this.setLang(lang);
  };
  var proto = i18n.prototype;

  proto.setLang = function(lang){
    var self = this;
    self.lang = lang || null;

    if (!self.lang) {
      proto.gettext = function() {
        throw "lang not set";
      };
    } else {
      proto.gettext = proto.__gettext;
    }
  }

  proto.__gettext = function(category, key, callback) {
    var self = this;
    if (!callback) {
      callback = key;
      key = category;
      category = "i18n";
    }
    if (!(self.lang in self._cache)) {
      self._cache[self.lang] =  {};
    }
    var cache = self._cache[self.lang];
    if (category in cache) {
      if (!(key in cache[category])) {
        console.log(key, "not found in ", url);
        return callback(null);
      }
      callback( cache[category][key] );
    } else {
      var url = "/i18n/" + self.lang + "/" + category + ".json";
      getJson(url, function(data){
        if (!data) {
          console.log("translation not found", self.lang, category);
          return callback(null);
        }
        cache[category] = data;
        if (!(key in cache[category])) {
          console.log(key, "not found in ", url);
          return callback(null);
        }
        callback( cache[category][key] );
      });
    }
  };

  if (typeof define === 'function' && define.amd) {
    define(function () {
      return new i18n();
    });
  }
  else if (typeof module === 'object' && module.exports){
    module.exports = new i18n();
  }
  else {
    this.i18n = new i18n();
  }
}.call(this));

