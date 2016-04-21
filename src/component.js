import Class from './class'
import Config from './config'

const COMPONENT_ATTR = 'f-component'
const RENDERED_ATTR = 'f-rendered'
let knownComponents = {}

function hasClass(el, className) {
  if (el.classList)
    el.classList.contains(className);
  else
    new RegExp('(^| )' + className + '( |$)', 'gi').test(el.className);
}

function addClass(el, className) {
  if (el.classList)
    el.classList.add(className);
  else
    el.className += ' ' + className;
}

export const Component = Class.extend({
  init: function(name, el, parent) {
    this.name = name;
    this.el = el;
    this.complete = false;
    this.subTokens = {};
    if (this.name && !this.template)
      this.template = getTemplate(this.templateName || this.name);
    this.parent = parent;
    this.children = [];
  },
  getData: function(cb, param) {
    cb(this.data || {});
  },
  render: function(data, template, param) {
    this.el.innerHTML = Config.render(template, data);
    this.children.forEach(c => {
      c.destroyed(param);
    });
    this.children = [];
  },
  rendered: function(param){},
  loadChildren: function(cb, param) {
    let els = this.el.querySelectorAll('[' + COMPONENT_ATTR + ']');
    if (!els || !els.length)
      return cb();
    let len = els.length;

    let nbComplete = 0;
    Array.prototype.forEach.call(els, (el, i) => {
      let name = el.getAttribute(COMPONENT_ATTR);
      console.debug("found component:", name);
      let Class = getComponent(name);
      let c = new Class(name, el, this);
      this.children.push(c);
      c.load(param, () => {
        if (++nbComplete === len)
          cb();
      });
    });
  },
  loaded: function(param){},
  destroyed: function(param){
    this.children.forEach(c => {
      c.destroyed(param);
    });
    this.children = [];
    console.debug(this.name, "destroyed");
    for (let topic in this.subTokens)
      Config.Pubsub.unsubscribe(this.subTokens[topic]);
  },
  // main entry
  load: function(param, cb) {
    param = param || {};
    console.time('Component.' + this.name);
    this.complete = false;
    this.getData(data => {
      this.render(data, this.template, param);
      this.rendered(param);
      this.loadChildren(() => {
        this.complete = true;
        console.timeEnd('Component.' + this.name);
        this.loaded(param);
        if (!hasClass(this.el, RENDERED_ATTR))
          addClass(this.el, RENDERED_ATTR);
      }, param)
    }, param)
  },
  // pubsub
  publish: function(topic, data) {
    Config.Pubsub.publish(topic, data, this);
  },
  subscribe: function(topic, cb) {
    this.subTokens[topic] = Config.Pubsub.subscribe(topic, cb, this);
  },
});

export function build(param, cb){
  let c = new Component('', window.document, null);
  c.loadChildren(() => {
    if (cb)
      cb();
  }, param || {});
}

function getTemplate(name) {
  let template = Config.dynamicRequire.template("./" + name + ".html");
  if (template) {
    if (Config.compile)
      template = Config.compile(template);
    return template;
  }
  console.error("Template not found: " + name);
  return "";
}

function getComponent(name) {
  if (name in knownComponents)
    return knownComponents[name];
  let Class = Config.dynamicRequire.component("./" + name);
  if (Class) {
    knownComponents[name] = Class;
    return Class;
  }
  console.error("Component not found: " + name);
  return Component;
}

export function defineComponent(name, props, base) {
  let c = (base || Component).extend(props || {});
  if (name)
    knownComponents[name] = c;
  return c;
}

