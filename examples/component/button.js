var $ = require('jquery')
require('../template/button.css')

const message = 'hello world!';

export default F.component("button", {
  template: require('../template/button.html'),
  data: {
    text: "Click me!",
  },
  rendered: function(param) {
    $(this.el).find('.button').click(e => {
      e.preventDefault();
      alert(message);
    });
  },
});

