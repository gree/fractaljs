F(function(){
  var namespace = {};
  var PageKey = "page";

  var decodeParam = namespace.decodeParam = function(queryString){
    if (!queryString) return {};
    var match,
    pl     = /\+/g,  // Regex for replacing addition symbol with a space
    search = /([^&=]+)=?([^&]*)/g,
    decode = function (s) { return decodeURIComponent(s.replace(pl, " ")); },
    myQuery = {};

    while (m = search.exec(queryString)) {
      if (!m[2] && !myQuery[PageKey]) {
        m[2] = m[1];
        m[1] = PageKey;
      }
      myQuery[decode(m[1])] = decode(m[2]);
    }
    return myQuery;
  };

  var encodeParam = namespace.encodeParam = function(data) {
    var kvp = [];
    for (var i in data) {
      if (i === PageKey) continue;
      kvp.push([i, data[i]])
    }
    return kvp.map(function(v){
      return encodeURIComponent(v[0]) + "=" + encodeURIComponent(v[1]);
    }).join("&");
  };

  namespace.navigate = function(page, params, silent) {
    var hash = "#" + page + (params ? ("&" + encodeParam(params)) : "");
    if (window.location.hash !== hash) {
      if (silent) {
        history.pushState(hash);
      } else {
        window.location.hash = hash;
      }
    }
  };

  namespace.query = (function(){
    var query = {};

    function parse() {
      queryString = window.location.hash.substring(1);
      var decoded = decodeParam(queryString);
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
      removeList.forEach(function(v){ delete query[v]; });
      return changed;
    }

    window.onpopstate = function(){
      var changed = parse();
      for (var i in changed) {
        F.__.Pubsub.publish('app.query.changed', changed);
        break;
      }
    };
    parse();

    return query;
  })();

  namespace.Router = F.Component.extend({
    getComponentName: function(changedQuery, callback) { throw new Error("to be extended"); },
    template: "{{#name}}<div data-role="component" data-name="{{name}}" />{{/name}}",
    subscribes: {
      "app.query.changed": function(data, from) {
        var self = this;
        self.getComponentName(data, function(componentName){
          if (self.componentName !== componentName) {
            self.load({name: componentName});
          }
        });
      }
    },
    getData: function(callback, param) {
      var self = this;
      if (!self.param.name) {
        self.getComponentName({}, function(componentName){
          callback({name: componentName});
        });
      } else {
        callback({name: self.param.name});
      }
    }
  });

  namespace.platform = (function(){
    if (window.location.href.indexOf("http") == 0) return "www";
    var isAndroid = !!(navigator.userAgent.match(/Android/i));
    var isIOS     = !!(navigator.userAgent.match(/iPhone|iPad|iPod/i));

    if (isAndroid) return "android";
    else if (isIOS) return "ios";
    else return "www";
  })();

  F.app = namespace;
});

