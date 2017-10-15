F.component('app', {
  template: require('./app.html'),
  rendered: function(cb, param) {
    this.subscribe("appSplitter.toggle", () => {
      this.el.querySelector('#appSplitter').right.toggle();
    });
    cb();
  }
});
