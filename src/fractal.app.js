(function(){
  if (!window.Fractal) {
    throw new Error("include fractal.js first");
  }

  var App = (function(){
    function setup(config, callback) {
      if (config.SOURCE_ROOT) Fractal.SOURCE_ROOT = config.SOURCE_ROOT;
      if (config.API_ROOT) Fractal.API_ROOT = config.API_ROOT;
      if (config.PREFIX) {
        for (var i in config.PREFIX) {
          Fractal.PREFIX[i] = config.PREFIX[i];
        }
      }
      if (config.MY_APP_CACHE && config.MY_APP_CACHE.enabled) {
        var root = config.VERSIONS.ROOT || Fractal.SOURCE_ROOT;
        AppManager.init(root, config.MY_APP_CACHE.versions, function(){
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

    function init(startPoint, callback){
      Fractal.require(startPoint, function(config){
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
    }

    return {
      start: function(url){
        function onDeviceReady(callback){
          init(url, callback);
        }

        if (Fractal.platform == "www") {
          onDeviceReady();
        } else {
          Fractal.require("phonegap.js", function(){
            document.addEventListener("deviceready", function(){
              onDeviceReady(function(){
                navigator.splashscreen.hide();
              });
            }, false);
          });
        }
	    }
    };
  })();

  window.Fractal.App = App;
})();

