const examples = [
  'button', 'markdown'
];

F.component('list', {
  template: require('../template/list.html'),
  getData: function(cb) {
    cb(examples.map(v => {
      return {
        href: "#" + v,
        name: v,
      };
    }));
  }
});
