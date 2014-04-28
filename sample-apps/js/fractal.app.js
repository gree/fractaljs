(function(){
  if (!window.Fractal) {
    console.error("please include fractal.js before");
  }

  var AppManager = (function(){
    var OutDatedList = {};

    var AppManager = {};
    AppManager.LocalResource = (function(){
      var prefix = "Fractal.App.";
      var prefixResource = prefix + "Resource.";
      var keyIndex = prefix + "Index";

      var setIndex = function(locals) {
        window.localStorage.setItem(keyIndex, JSON.stringify(locals));
      };

      return {
        getIndex: function() {
          return JSON.parse(window.localStorage.getItem(keyIndex)) || {};
        },
        update: function(resourceId, data, version) {
          console.info("LocalResource update: " + resourceId);
          var locals = this.getIndex();
          locals[resourceId] = version
          setIndex(locals);
          window.localStorage.setItem(prefixResource + resourceId, data);
        },
        get: function(resourceId) {
          return window.localStorage.getItem(prefixResource + resourceId);
        },
        remove: function(resourceId) {
          window.localStorage.removeItem(prefixResource + resourceId);    
        }
      };
    })();

    AppManager.Client = (function(){
      var AddElement = function(element) {
        var container = document.getElementsByTagName("body")[0];
        container.appendChild(element);
      };

      return Fractal.Client.extend({
        _get: function(resourceId, callback) {
          var self = this;
          var url = (resourceId.indexOf("http") == 0 ? "" : AppManager.RESOURCE_ROOT) + resourceId;
          if (resourceId in OutDatedList) {
            self.ajaxGet(url, null, function(err, data){
              if (err) {
                callback(false);
                return;
              }
              AppManager.LocalResource.update(resourceId, data, OutDatedList[resourceId]);
              delete OutDatedList[resourceId];
              callback(true);
            });
          } else {
            callback(true);
          }
        },
        getJS: function(resourceId, callback) {
          this._get(resourceId, function(success){
            console.log("app.getJS " + resourceId + " " + success);
            if (!success) {
              callback(false);
              return;
            }
            var data = AppManager.LocalResource.get(resourceId);
            var el = document.createElement("script");
            el.innerHTML = data;
            AddElement(el);
            callback(true);
          });
        },
        // // disable:
        // // because there may be relative paths inside css file
        // // better to include css by using <style> tag
        // getCSS: function(resourceId, callback) {
        //   this._get(resourceId, function(success){
        //     if (!success) {
        //       callback(false);
        //       return;
        //     }
        //     var data = AppManager.LocalResource.get(resourceId);
        //     var el = document.createElement("style");
        //     el.innerHTML = data;
        //     AddElement(el);
        //     callback(true);
        //   });
        // },
        getTemplate: function(resourceId, callback) {
          this._get(resourceId, function(success){
            if (!success) {
              callback(true, null);
              return;
            }
            var data = AppManager.LocalResource.get(resourceId);
            callback(false, data);
          });
        }
      });
    })();

    AppManager.init = function(root, api, callback){
      AppManager.RESOURCE_ROOT = root;
      var versionQuery = (api.indexOf("http") == 0) ? api : (root + api);
      console.log("AppManager.init: " + root + " " + api + " " + versionQuery);
      Fractal.require([versionQuery], function(data){
        var remotes = data[versionQuery];
        if (!remotes) {
          console.info("versions not available, using default Fractal.Client");
          callback();
        } else {
          Fractal.client = new AppManager.Client();

          var locals = AppManager.LocalResource.getIndex();
          for (var i in remotes) {
            if (!(i in locals) || locals[i] != remotes[i]) {
              OutDatedList[i] = remotes[i];
            }
          }
          for (var i in locals) {
            if (!(i in remotes)) {
              AppManager.LocalResource.remove(i);
            }
          }
          callback();
        }
      }, true);
    };

    return AppManager;
  })();

  var App = (function(){
    function setup(config, callback) {
      if (config.SERVICE_ROOT) Fractal.SERVICE_ROOT = config.SERVICE_ROOT;
      if (config.PREFIX) {
        for (var i in config.PREFIX) {
          Fractal.PREFIX[i] = config.PREFIX[i];
        }
      }
      console.log("SERVICE_ROOT: " + Fractal.SERVICE_ROOT);
      if (config.VERSIONS && config.VERSIONS.enabled) {
        var root = config.VERSIONS.ROOT || Fractal.SERVICE_ROOT;
        AppManager.init(root, config.VERSIONS.API, function(){
          callback();
        });
      } else {
        callback();
      }
    }

    function build(callback){
      Fractal.construct(function(){
        if (callback) callback();
      });
    }

    var App = {};
    App.init = function(startPoint, callback){
      Fractal.require([startPoint], function(data){
        var config = data[START_POINT];
        setup(config, function(){
          if (config.REQUIRE_LIST) {
            Fractal.require(config.REQUIRE_LIST, function(){
              build(callback);
            });
          } else {
            build(callback);
          }
        });
      });
    };

    return App;

  })();

  window.Fractal.App = App;
})();

