import {defineComponent, build} from './component'
import Config from './config'

export default {
  init: function(templateEngine, dynamicRequire, pubsub) {
    // template engine
    if (templateEngine) {
      if (templateEngine.compile)
        Config.compile = templateEngine.compile;
      Config.render = templateEngine.render;
    }
    // dynamic require
    if (dynamicRequire) {
      ['component', 'template'].forEach(v => {
        if (v in dynamicRequire)
          Config.dynamicRequire[v] = dynamicRequire[v];
      });
    }
    // pubsub
    if (pubsub) {
      ['publish', 'subscribe', 'unsubscribe'].forEach(v => {
        if (v in pubsub)
          Config.Pubsub[v] = pubsub[v];
      });
    }
  },
  build: build,
  Pubsub: Config.Pubsub,
  component: defineComponent,
}

