F(function(){
  F.decodeParam = function(queryString){
    if (!queryString) return {};
    var match,
    pl     = /\+/g,  // Regex for replacing addition symbol with a space
    search = /([^&=]+)=?([^&]*)/g,
    decode = function (s) { return decodeURIComponent(s.replace(pl, " ")); },
    myQuery = {};

    while (m = search.exec(queryString)) {
      if (!m[2] && !myQuery.page) {
        m[2] = m[1];
        m[1] = "page";
      }
      myQuery[decode(m[1])] = decode(m[2]);
    }
    return myQuery;
  };
  F.encodeParam = function(data) {
    var kvp = [];
    for (var i in data) {
      kvp.push([i, data[i]]);
    }
    return kvp.map(function(v){
      return encodeURIComponent(v[0]) + "=" + encodeURIComponent(v[1]);
    }).join("&");
  };
  __ignoreQueryChange = {};
  F.navigate = function(page, params, ignoreQueryChange) {
    params = params || {};
    var hash = "#" + page + "&" + F.encodeParam(params);
    if (window.location.hash !== hash) {
      if (ignoreQueryChange) {
        __ignoreQueryChange[hash] = true;
      }
      window.location.hash = hash;
    }
  };
  F.query = (function(){
    var query = {};

    function parse() {
      var queryString = window.location.search.substring(1);
      queryString += "&";
      queryString += window.location.hash.substring(1);

      var decoded = F.decodeParam(queryString);
      var changed = {};
      for (var i in decoded) {
        if (query[i] !== decoded[i]) changed[i] = [query[i], decoded[i]];
        query[i] = decoded[i];
      }
      var removeList = [];
      for (var i in query) {
        if (!(i in decoded)) {
          changed[i] = [query[i], undefined];
          removeList.push(i);
        }
      }
      removeList.forEach(function(v){
        delete query[v];
      });
      return changed;
    }

    window.onpopstate = function(){
      if (__ignoreQueryChange[window.location.hash]) {
        delete __ignoreQueryChange[window.location.hash];
      } else {
        var changed = parse();
        for (var i in changed) {
          F.Pubsub.publish('HashChanged', changed);
          break;
        }
      }
    };
    parse();

    return query;
  })();

  F.defaultEnv.components.Router = F.Component.extend({
    getComponentName: function(changedQuery, callback) { throw new Error("to be extended"); },
    template: '<div data-role="component" data-name="{{componentName}}" />',
    onHashChanged: function(data) {
      var self = this;
      self.getComponentName(data, function(componentName){
        if (!componentName) return;
        if (self.data && self.data.componentName !== componentName) {
          self.data = { componentName: componentName };
          self.load();
        }
      });
    },
    getData: function(callback) {
      var self = this;
      if (!self.data) {
        self.getComponentName({}, function(componentName){
          self.data = { componentName: componentName };
          callback();
        });
      } else {
        callback();
      }
    }
  });

  F.platform = (function(){
    if (window.location.href.indexOf("http") == 0) {
      return "www";
    }
    var isAndroid = !!(navigator.userAgent.match(/Android/i));
    var isIOS     = !!(navigator.userAgent.match(/iPhone|iPad|iPod/i));

    if (isAndroid) return "android";
    else if (isIOS) return "ios";
    else return "www";
  })();
});

