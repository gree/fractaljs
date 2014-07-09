(function( window ) {
	'use strict';

  var App = Fractal.App.extend({
    init: function(){
      this.PREFIX = {
        component: "components/",
        template: "templates/",
      };
      this.REQUIRE_LIST = [
        "//netdna.bootstrapcdn.com/bootstrap/3.1.1/css/bootstrap.min.css",
        "//netdna.bootstrapcdn.com/bootstrap/3.1.1/js/bootstrap.min.js",
        "//maxcdn.bootstrapcdn.com/font-awesome/4.1.0/css/font-awesome.min.css",
        // "css/components-right.css",
        // "css/pagetrans.css",
        "css/fractal.mobile.css",
        "css/animations.css",
        "css/app.css",
      ];
    },
  });
  var app = new App();
  app.start();

})( window );

