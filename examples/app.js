/* jshint newcap: false */
/* global F */
(function() {
  'use strict';
  var App = F.App.extend({
    init: function(){
      this.PREFIX = {
        component: 'components/',
        template: 'templates/'
      };
    },
  });
  var app = new App();
  app.start();
})();

