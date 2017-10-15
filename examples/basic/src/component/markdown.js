var $ = require('jquery');
var marked = require('marked');

F.component('markdown', {
  template: require('../template/markdown.html'),
  rendered: function() {
    var doc = marked(this.mdData);
    $(this.el).find("#marked").html(doc);
  },
  getData: function(cb) {
    var md = "../../README.md";
    $.get(md, data => {
      this.mdData = data;
      cb({raw: data});
    });
  }
});
