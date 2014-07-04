Fractal(function(){
  var DEFAULT_PAGE_COUNT = 6;
  var MAX_TRANS_TYPE = 1000;
  TRANS_TYPE = {
    NO_ANIMATION: 0,
    // for switcher
    SCALE_DOWN_SCALE_UP: 500,

    // trans for next
    MOVE_TO_LEFT_FROM_RIGHT: 2,
    SCALE_DOWN_FROM_TOP: 3,

    // trans for prev (the opposite of next)
    MOVE_TO_RIGHT_FROM_LEFT: MAX_TRANS_TYPE - 2,
    MOVE_TO_TOP_SCALE_UP: MAX_TRANS_TYPE - 3,

    MAX: MAX_TRANS_TYPE,
  };
  var animEndEventName = "webkitAnimationEnd";
  var pageClass = "Fractal.Page";
  var getPageName = function(parentName, id){ return pageClass + "." + parentName + "." + id; };

  Fractal(pageClass, Fractal.Component.extend({
    template: '{{#name}}<div data-role="component" data-name="{{name}}"></div>{{/name}}',
    init: function(name, $container) {
      var self = this;
      self._super(name, $container);
      var pageName = getPageName(self.$container.data("parent"), self.$container.data("id"));
      self.subscribe(pageName + ".load", function(topic, data){
        self.componentName = data.name;
        self.load(data.data);
      });
    },
    getData: function(callback) {
      this.data = {};
      if (this.componentName) this.data.name = this.componentName;
      callback();
    }
  }));

  Fractal.TOPIC.HISTORY = {};
  Fractal.TOPIC.HISTORY.UPDATED = "history.updated";
  Fractal.TOPIC.HISTORY.BACK = "history.back";

  var History = function(){ this.stack = []; };
  History.push = function(data){
    this.stack.push(data);
  };
  History.length = function() { return this.stack.length; };
  History.pop = function() { this.stack.pop(); };
  History.get = function() { return this.stack[this.stack.length - 1]; };

  Fractal.History = History;

  Fractal("PageTrans", Fractal.Component.extend({
    init: function(name, $container) {
      var self = this;
      self._super(name, $container);
      self.__lock = false;
      self.pageCount = DEFAULT_PAGE_COUNT;
      self.current = 0;
      self.endCurrPage = false;
      self.endNextPage = false;

      self.subscribe(name + ".next", function(topic, data){
        self.next(data);
      });
      self.subscribe(name + ".prev", function(topic, data){
        self.prev(data);
      });
    },
    lock: function() {
      var self = this;
      if (self.__lock) return false;
      self.__lock = true;
      self.__unlocker = setTimeout(function(){
        console.warn("unlocked by unlocker");
        self.__lock = false;
        self.__unlocker = null;
      }, 1500);
      return true;
    },
    unlock: function() {
      if (this.__unlocker) clearTimeout(this.__unlocker);
      this.__lock = false;
    },
    next: function(param, callback) {
      var self = this;
      if (!self.lock()) {
        if (callback) callback();
        return;
      }
      var current = self.current;
      var next = self.current + 1;
      if (next == self.pageCount) next = 0;

      self.__trans(current, next, param, function($outpage, $inpage){
        if (callback) callback($outpage, $inpage);
        self.unlock();
      });
    },
    prev: function(param, callback) {
      var self = this;
      if (!self.lock()) {
        if (callback) callback();
        return;
      }
      var current = self.current;
      var next = self.current - 1;
      if (next < 0) next = self.pageCount - 1;

      self.__trans(current, next, param, function($outpage, $inpage){
        if (callback) callback($outpage, $inpage);
        self.unlock();
      });
    },
    loadPage: function(pageId, param, callback) {
      var self = this;
      self.subscribe(Fractal.TOPIC.COMPONENT_LOADED_CHILDREN, function(topic, data){
        if (data.name === param.name) {
          self.unsubscribe(Fractal.TOPIC.COMPONENT_LOADED_CHILDREN);
          if (callback) callback();
        }
      });
      var name = getPageName(self.name, pageId);
      self.publish(name + ".load", param);
    },
    __trans: function(current, next, param, callback) {
      var self = this;
      if (!param.component.name || param.component.name === self.currentComponentName) {
        if (callback) callback();
        return;
      }

      var $currPage = self.$pages.eq( current );
      var $nextPage = self.$pages.eq( next ); // .addClass( 'pt-page-current' );

      if (param.load) self.loadPage(next, param.component, __startTransition);
      else __startTransition();

      function __startTransition(){
        var trans = param.trans || self.getDefaultTrans() || TRANS_TYPE.NO_ANIMATION;
        if (trans == TRANS_TYPE.NO_ANIMATION) {
          onEndAnimation($currPage, $nextPage);
          return;
        }
        var outClass = '', inClass = '';
        switch(trans) {
        case TRANS_TYPE.MOVE_TO_LEFT_FROM_RIGHT:
          outClass = 'pt-page-moveToLeft';
          inClass = 'pt-page-moveFromRight';
          break;
        case TRANS_TYPE.SCALE_DOWN_FROM_TOP:
          outClass = 'pt-page-scaleDown';
          inClass = 'pt-page-moveFromTop pt-page-ontop';
          break;
        case TRANS_TYPE.MOVE_TO_RIGHT_FROM_LEFT:
          outClass = 'pt-page-moveToRight';
          inClass = 'pt-page-moveFromLeft';
          break;
        case TRANS_TYPE.MOVE_TO_TOP_SCALE_UP:
          outClass = 'pt-page-moveToTop pt-page-ontop';
          inClass = 'pt-page-scaleUp';
          break;
        case TRANS_TYPE.SCALE_DOWN_SCALE_UP:
          outClass = 'pt-page-scaleDownCenter';
          inClass = 'pt-page-scaleUpCenter pt-page-delay400';
          break;
        };

        $currPage.addClass( outClass ).on( "webkitAnimationEnd", function() {
          $currPage.off( animEndEventName );
          self.endCurrPage = true;
          if( self.endNextPage ) {
            onEndAnimation( $currPage, $nextPage );
          }
        } );

        $nextPage.addClass( inClass ).on( "webkitAnimationEnd", function() {
          $nextPage.off( animEndEventName );
          self.endNextPage = true;
          if( self.endCurrPage ) {
            onEndAnimation( $currPage, $nextPage );
          }
        } );
      }

      function onEndAnimation( $outpage, $inpage ) {
        self.endCurrPage = false;
        self.endNextPage = false;

        $outpage.attr( 'class', $outpage.data( 'originalClassList' ) );
        $inpage.attr( 'class', $inpage.data( 'originalClassList' ) + ' pt-page-current' );
        if (callback) callback($outpage, $inpage);
        self.currentComponentName = param.component.name;
        self.current = next;
      }
    },
    afterRender: function(callback) {
      var self = this;
      self.$pages = self.$container.find( 'div.pt-page' );
      self.$pages.each( function() {
        var $page = $( this );
        $page.data( 'originalClassList', $page.attr( 'class' ) );
      } );
      self.$pages.eq(self.current).addClass('pt-page-current');

      callback();
    },
    template: '<div class="pt-perspective">' +
      '{{#pages}}' +
      '<div class="pt-page" data-role="component" data-name="{{name}}"' +
      ' data-parent="{{parent}}" data-id="{{_id}}"></div>' +
      '{{/pages}}' +
      '</div>',
    getData: function(callback) {
      var self = this;
      var pages = [];
      for (var i=0; i<self.pageCount; i++) {
        pages.push({ name: pageClass, parent: self.name, _id: i });
      }
      self.data = { pages: pages };
      callback();
    },
    onAllLoaded: function(callback){
      var page = this.getFirstPage();
      if (page) this.loadPage(0, {name: page}, callback);
    },
    getDefaultPage: function(){ throw new Error("to be extended"); },
    getFirstPage: function(){ throw new Error("to be extended"); }
  }));

  Fractal.TRANS_TYPE = TRANS_TYPE;

  Fractal("Switcher", Fractal.Components.PageTrans.extend({
    init: function(name, $container) {
      var self = this;
      this._super(name, $container);
      this.pageCount = 2; // current, next
    },
    switch: function(name, param, callback) {
      param = param || {};
      var transParam = {
        load: true,
        trans: param.trans || TRANS_TYPE.SCALE_DOWN_SCALE_UP,
        component: {
          name: name,
          data: param.data
        }
      };
      this.next(transParam, function($outpage, $inpage){
        if ($outpage) $outpage.empty();
      });
    },
  }));

  Fractal("Cross", Fractal.Components.PageTrans.extend({
    init: function(name, $container) {
      var self = this;
      self._super(name, $container);
      self.pageCount = 5; // center, up, down, left, right
    },
    show: function(name, param, callback) {
      var self = this;
      if (self.current != 0) {
        console.warn("center is not current, stop showing item");
        if (callback) callback();
        return;
      }
      var transaram = {
        load: true,
        trans: param.trans || TRANS_TYPE.MOVE_TO_LEFT_FROM_RIGHT,
        component: {
          name: name,
          data: param.data
        }
      };
      self.next(transParam, function($outpage, $inpage){
        if (callback) callback();
      });
    },
  }));
});

