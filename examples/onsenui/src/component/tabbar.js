F.component('tabbar', {
  template: require('./tabbar.html'),
  rendered: function(cb, param) {
    this.el.querySelector('#appTabbar').addEventListener('init', event => {
      this.loadChildren()
    });
    this.el.querySelector('#appTabbarPage').addEventListener('prechange', function(event) {
      if (event.target.matches('#appTabbar')) {
        event.currentTarget.querySelector('ons-toolbar .center').innerHTML = event.tabItem.getAttribute('label');
      }
    });
    this.el.querySelector('#appTabbarBtn').onclick = () => {
      this.publish("appSplitter.toggle");
    }
    cb();
  }
});
