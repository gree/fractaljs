import {Component, build, registerComponent} from './component'
import Pubsub from './pubsub'

function createComponent(name, def) {
  registerComponent(name, class extends Component {
    constructor(name, el, parent) {
      super(name, el, parent);
      if (def.template) {
        this.template = def.template;
      }
      if (def.init) {
        def.init.bind(this)();
      }
      if (def.getData) {
        this.getData = def.getData.bind(this);
      }
      if (def.rendered) {
        this.rendered = def.rendered.bind(this);
      }
    }
  });
}

window.onpopstate = function () {
  Pubsub.publish("onpopstate", location.hash);
};

export default {
  build: build,
  component: createComponent,
}
