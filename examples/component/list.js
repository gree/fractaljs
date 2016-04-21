let template = require('../template/list.html');

let examples = [
  "markdown",
  "button",
];

export default F.component('list', {
  template: template,
  data: examples.map(v => {
    return { href: "#" + v, name: v }
  }),
});

