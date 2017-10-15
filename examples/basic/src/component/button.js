const $ = require('jquery')
import '../template/button.css'

const message = 'hello world!';

F.component("button", {
  template: require('../template/button.html'),
  init: function(){
    this.data = {
      text: "Click me!",
     };
  },
  rendered: function(cb, param) {
    $(this.el).find('.button').click(e => {
      e.preventDefault();
      alert(message);
    });
    cb();
  },
});
