import Pubsub from './pubsub'

function noImpl(name) {
  return function(){
    throw new Error('To be defined: ' + name);
  };
}

export default {
  compile: false,
  render: noImpl('render'),
  dynamicRequire: {
    component: noImpl('dynamicRequire.component'),
    template: noImpl('dynamicRequire.template'),
  },
  Pubsub: Pubsub,
}
