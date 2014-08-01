(function( window ) {
	'use strict';

	// Your starting point. Enjoy the ride!
  var App = Fractal.App.extend({
    init: function(){
      this.PREFIX = {
        component: "components/",
        template: "templates/",
      };
      this.REQUIRE_LIST = [ "js/util.js" ];
    },
  });

  var app = new App();
  app.start();

})( window );
