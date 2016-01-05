(function(){
  F.History = (typeof(window.History) === "object") ? window.History : window.history;
  if (!F.History) {
    console.error("history support is not found, I am not fully working");
  }

  var spa = F.spa = {};

  spa.Router = F.ComponentBase.extend({
    template: '{{#name}}<div f-component="{{name}}" />{{/name}}',
    init: function(name, $container, f) {
      var self = this;
      self._super(name, $container, f);
      if (!self.DefaultComponent) {
        throw new Error(self.name + ": DefaultComponent is not defined in subclass");
      }
      self.subscribe("spa.component.changed", function(topic, componentName){
        console.debug(self.name, "received", topic, componentName);
        componentName = componentName || self.DefaultComponent;
        console.debug(self.name, "componentName:", componentName,
                      "self.componentName:", self.componentName);
        if (self.componentName !== componentName) {
          self.componentName = componentName;
          self.load();
        }
      });
      self.componentName = spa.component || self.DefaultComponent;
    },
    getData: function(callback) {
      callback({name: this.componentName});
    },
    allLoaded: function(callback) {
      this.publish(this.name + ".loaded");
      callback();
    }
  });

  (function(){
    var _dec = function(s){ return decodeURIComponent(s.replace(/\+/g, " ")); };

    var decodeParam = spa.decodeParam = function(queryString){
      if (!queryString) return {};
      var a = queryString.split("?");
      var component = a[0];
      var params = {};
      if (a[1]) {
        var parts = a[1].split("&");
        parts.forEach(function(v){
          var kv = v.split("=");
          params[_dec(kv[0])] = kv[1] ? _dec(kv[1]) : null;
        });
      }

      return {
        component: component,
        params: params,
      };
    };

    var encodeParam = spa.encodeParam = function(component, params) {
      queryString = component || "";
      paramString = (function(params) {
        var kvp = [];
        for (var k in params)
          kvp.push([k, params[k] || ""]);

        return kvp.map(function(v){
          return encodeURIComponent(v[0]) + "=" + encodeURIComponent(v[1]);
        }).join("&");
      })(params);

      if (paramString) {
        queryString += "?" + paramString;
      }

      return queryString;
    };

    var query = spa.query = {};

    var parseUrl = function(url) {
      var parts = url.split("#");
      queryString = parts[1];
      var decoded = decodeParam(queryString);
      var params = decoded.params || {};
      var isChanged = false;
      var changed = {};
      for (var k in params) {
        v = params[k];
        if (query[k] !== v) {
          changed[k] = [query[k], v];
          isChanged = true;
        }
        query[k] = v;
      }
      var removeList = [];
      for (var k in query) {
        if (!(k in params)) {
          changed[k] = [query[k], undefined];
          removeList.push(k);
          isChanged = true;
        }
      }
      removeList.forEach(function(v){ delete query[v]; });

      if (spa.component !== decoded.component) {
        spa.component = decoded.component;
        F.Pubsub.publish("spa.component.changed", decoded.component);
      }

      if (isChanged) {
        F.Pubsub.publish("spa.query.changed", changed);
      }
    };

    spa.navigate = function(component, params) {
      var url = "/#" + encodeParam(component, params);
      if (url !== location.href) { // TODO
        parseUrl(url);
        F.History.pushState("", "", url);
      }
    };

    window.onpopstate = function(e, a, b){
      console.debug("popState", e, a, b)
      parseUrl(location.href);
    };

    parseUrl(location.href);
  })();

  spa.platform = (function(){
    if (location.href.indexOf("http") == 0) return "www";
    var isAndroid = !!(navigator.userAgent.match(/Android/i));
    var isIOS     = !!(navigator.userAgent.match(/iPhone|iPad|iPod/i));

    if (isAndroid) return "android";
    else if (isIOS) return "ios";
    else return "www";
  })();

})();

