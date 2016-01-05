(function(){
  var m = F.m = {};

  m.Page = F.ComponentBase.extend({
    template: '{{#name}}<div f-component="{{name}}" />{{/name}}',
    init: function(componentName, $container, f) {
      var self = this;
      self._super("m-page", $container, f);
      self.componentName = componentName;
    },
    getData: function(callback) {
      callback({name: this.componentName});
    },
  });

  var MAX_TRANS_TYPE = 1000;
  var TRANS = m.TRANS = {
    NO_ANIMATION: MAX_TRANS_TYPE + 1,
    SCALE_DOWN_SCALE_UP: 1,
    MOVE_TO_LEFT_FROM_RIGHT: 2,
    SCALE_DOWN_FROM_TOP: 3,

    MOVE_TO_RIGHT_FROM_LEFT: MAX_TRANS_TYPE - 2,
    MOVE_TO_TOP_SCALE_UP: MAX_TRANS_TYPE - 3,
  };

  (function(){
    var STATE = {
      DEFAULT: 0,
      CURRENT_IN_TRANSITION: 1,
      NEXT_IN_TRANSITION: 2,
    };
    var animEndEventName = "webkitAnimationEnd";

    F.m.Component = F.ComponentBase.extend({
      template: '<div class="f-perspective" id="f-pages-{{name}}" />',
      init: function(name, $container, f) {
        var self = this;
        self._super(name, $container, f);
        self.flag = STATE.DEFAULT;
        self.history = [];
      },
      lock: function() {
        var self = this;
        if (self.flag !== STATE.DEFAULT) return false;
        self.__unlocker = setTimeout(function(){
          console.debug("unlocked by timeout");
          self.flag = STATE.DEFAULT;
          self.__unlocker = null;
        }, 1000);
        return true;
      },
      unlock: function() {
        this.flag = STATE.DEFAULT;
        if (this.__unlocker)
          clearTimeout(this.__unlocker);
      },
      push: function(component, param, trans, callback) {
        var self = this;
        if (!self.lock()) {
          if (callback) callback();
          return;
        }
        var current = self.history.length;
        var next = current + 1;
        var nbPages = self.$(".f-page").length;
        if (next == nbPages) {
          self.addPage(component);
        }

        var state = {
          component: component,
          param: param,
          trans: trans,
        };
        self.history.push(state)
        self.trans(current, next, state, function($outpage, $inpage){
          if (callback) callback($outpage, $inpage);
          self.unlock();
        });
      },
      pop: function(param, callback) {
        var self = this;
        param = param || {};
        if (self.history.length === 0) return;
        if (!self.lock()) {
          if (callback) callback();
          return;
        }

        var current = self.history.length;
        var next = current - 1;
        var state = self.history.pop();
        // param.load = false;
        param.trans = MAX_TRANS_TYPE - state.trans;

        self.trans(current, next, param, function($outpage, $inpage){
          if (callback) callback($outpage, $inpage);
          self.unlock();
        });
      },
      trans: function(current, next, param, callback) {
        var self = this;

        var $pages = self.$(".f-page");
        var $currPage = $pages.eq(current);
        var $nextPage = $pages.eq(next).addClass('f-page-current');
        if (param.load) {
          var pageName = getPageName(self.name, next);
          console.log(self.name, "load page", next, pageName);
          self.subscribe(F.TOPIC.COMPONENT_LOADED_MYSELF, function(topic, data){
            if (data.name == pageName) {
              self.unsubscribe(F.TOPIC.COMPONENT_LOADED_MYSELF);
              __startTransition();
            }
          });
          self.publish(pageName + ".load", param.component);
        } else {
          __startTransition();
        }

        function __startTransition(){
          if (param.trans == TRANS.NO_ANIMATION) {
            onEndAnimation($currPage, $nextPage);
            return;
          }
          var outClass = '', inClass = '';
          param.trans = param.trans || 0;
          // TODO make this list configurable
          switch( param.trans ) {
            case TRANS.MOVE_TO_LEFT_FROM_RIGHT:
              outClass = 'pt-page-moveToLeft';
              inClass = 'pt-page-moveFromRight';
              break;
            case TRANS.SCALE_DOWN_FROM_TOP:
              outClass = 'pt-page-scaleDown';
              inClass = 'pt-page-moveFromTop pt-page-ontop';
              break;
            case TRANS.MOVE_TO_RIGHT_FROM_LEFT:
              outClass = 'pt-page-moveToRight';
              inClass = 'pt-page-moveFromLeft';
              break;
            case TRANS.MOVE_TO_TOP_SCALE_UP:
              outClass = 'pt-page-moveToTop pt-page-ontop';
              inClass = 'pt-page-scaleUp';
              break;
            case TRANS.SCALE_DOWN_SCALE_UP:
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

          $outpage.attr('class', 'f-page');
          $inpage.attr('class', 'f-page f-page-current');

          if (callback) callback($outpage, $inpage);
        }
      },
      addPage: function(pageComponentName){
        var self = this;
        var $page = $('<div class="f-page f-page-current">');
        self.$('#f-pages-' + self.name).append($page);
        var component = new m.Page(pageComponentName, $page, self.f);
        component.load({m: self});
      },
      allLoaded: function(callback) {
        var self = this;
        self.addPage(self.DefaultPage);
        callback();
      },
      getData: function(callback) {
        var self = this;
        callback({
          name: self.name,
        });
      }
    });

  })();

})();
