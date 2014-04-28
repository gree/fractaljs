(function(){
  if (!window.Fractal) {
    throw new Error("include fractal.js first");
  }

  Fractal.Page = Fractal.Component.extend({
    init: function(name, $container) {
      var self = this;
      self._super(name, $container);

      self.subscribe(name + ".load", function(topic, data){
        console.log(self.name, "load event", data);
        self.component_name = data.name;
        if (data.data) {
          for (var i in data.data) {
            Fractal.env[i] = data.data[i];
          }
        }
        self.load();
      });
    },
    __getTemplate: function(callback) {
      this.templateContents = '{{#component_name}}<div data-role="component" data-name="{{component_name}}"></div>{{/component_name}}';
      callback();
    },
    getData: function(callback) {
      this.data = {};
      if (this.component_name) {
        this.data.component_name = this.component_name;
      }
      callback();
    }
  });

  Fractal.PageTransition = (function(){
    var DEFAULT_PAGE_COUNT = 6;
    var MAX_TRANS_TYPE = 1000;
    var TRANS_TYPE = {
      NO_ANIMATION: 0,
      // for switcher
      SCALE_DOWN_SCALE_UP: 1,

      // trans for next
      MOVE_TO_LEFT_FROM_RIGHT: 2,
      SCALE_DOWN_FROM_TOP: 3,

      // trans for prev (the opposite of next)
      MOVE_TO_RIGHT_FROM_LEFT: MAX_TRANS_TYPE - 2,
      MOVE_TO_TOP_SCALE_UP: MAX_TRANS_TYPE - 3,
    };

    var animEndEventName = "webkitAnimationEnd";

    var Component = Fractal.Component.extend({
      init: function(name, $container) {
        var self = this;
        self._super(name, $container);
        self.__lock = false;
        self.stack = [];
        self.pageCount = DEFAULT_PAGE_COUNT;
        self.current = 0;
        self.endCurrPage = false;
        self.endNextPage = false;

        self.subscribe(name + ".nextPage", function(topic, data){
          self.next(data);
        });

        self.subscribe(name + ".prevPage", function(topic, data){
          self.prev();
        });
      },
      getPageName: function(num) {
        var prefix = "Fractal.Page." + this.name + ".";
        return prefix + num;
      },
      lock: function() {
        var self = this;
        if (self.__lock) return false;
        self.__lock = true;
        self.__unlocker = setTimeout(function(){
          console.log("unlocked by unlocker");
          self.__lock = false;
          self.__unlocker = null;
        }, 1500);
        return true;
      },
      unlock: function() {
        this.__lock = false;
        if (this.__unlocker)
          clearTimeout(this.__unlocker);
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

        self.trans(current, next, param, function($outpage, $inpage){
          self.current = next;
          if (!param.forget) {
            self.stack.push(param);
            self.publish("Fractal.PageTransition.Stack.Updated", {
              name: self.name,
              depth: self.stack.length
            });
          }
          if (callback) callback($outpage, $inpage);
          self.unlock();
        });
      },
      prev: function(callback) {
        var self = this;
        if (self.stack.length == 0) {
          if (callback) callback();
          return;
        }

        if (!self.lock()) {
          if (callback) callback();
          return;
        }

        var param = self.stack.pop();
        if (!param) {
          if (callback) callback();
          return;
        }
        self.publish("Fractal.PageTransition.Stack.Updated", {
          name: self.name,
          depth: self.stack.length
        });

        param.load = false;
        param.trans = MAX_TRANS_TYPE - param.trans;

        var current = self.current;
        var next = self.current - 1;
        if (next < 0) next = self.pageCount - 1;

        self.trans(current, next, param, function($outpage, $inpage){
          self.current = next;
          if (callback) callback($outpage, $inpage);
          self.unlock();
        });
      },
      trans: function(current, next, param, callback) {
        var self = this;

        var $currPage = self.$pages.eq( current );
        var $nextPage = self.$pages.eq( next ).addClass( 'fractal-page-current' );

        if (param.load) {
          self.subscribe(Fractal.TOPIC.COMPONENT_LOADED_CHILDREN, function(topic, data){
            if (data.name == param.component.name) {
              self.unsubscribe(Fractal.TOPIC.COMPONENT_LOADED_CHILDREN);
              __startTransition();
            }
          });
          var name = self.getPageName(next);
          self.publish(name + ".load", param.component);
        } else {
          __startTransition();
        }

        function __startTransition(){
          if (param.trans == TRANS_TYPE.NO_ANIMATION) {
            onEndAnimation($currPage, $nextPage);
            return;
          }
          var outClass = '', inClass = '';
          param.trans = param.trans || 0;
          // TODO make this list configurable
          switch( param.trans ) {
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

          console.log(self.name, "__startTransition", outClass, inClass);
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
          $inpage.attr( 'class', $inpage.data( 'originalClassList' ) + ' fractal-page-current' );
          
          if (callback) callback($outpage, $inpage);
        }
      },
      unload: function() {
        this.stack = [];
        this.publish("Fractal.PageTransition.Stack.Updated", {
          name: self.name,
          depth: 0
        });
        this._super();
      },
      afterRender: function(callback) {
        var self = this;
        self.$pages = self.$container.find( 'div.fractal-page' );
        self.$pages.each( function() {
          var $page = $( this );
          $page.data( 'originalClassList', $page.attr( 'class' ) );
        } );
        self.$pages.eq(self.current).addClass('fractal-page-current');

        callback();
      },
      __getTemplate: function(callback) {
        this.templateContents =
          '<div class="fractal-perspective">' +
          '  {{#pages}}' +
          '  <div class="fractal-page" data-role="component" data-name="{{.}}"></div>' +
          '  {{/pages}}' +
          '</div>';
        callback();
      },
      getData: function(callback) {
        var self = this;
        var pages = [];
        for (var i=0; i<self.pageCount; i++) {
          var name = self.getPageName(i);
          pages.push(name);
          if (!(name in window)) {
            window[name] = Fractal.Page.extend({});
          }
        }
        self.data = { pages: pages };
        callback();
      }
    });

    var Switcher = Component.extend({
      init: function(name, $container) {
        var self = this;
        this._super(name, $container);
        this.pageCount = 2;

        self.subscribe(self.name + ".switch", function(topic, data){
          self.switch(data.name, data.data);
        });
      },
      switch: function(name, data, callback) {
        console.log("switch", this.name, name);
        var param = {
          forget: true,
          load: true,
          trans: TRANS_TYPE.SCALE_DOWN_SCALE_UP,
          component: {
            name: name,
            data: data
          }
        };
        this.next(param, function($outpage, $inpage){
          if ($outpage) $outpage.empty();
        });
      },
      prev: function(){} // no "prev"
    });

    var ItemList = Component.extend({
      init: function(name, $container) {
        var self = this;
        self._super(name, $container);
        self.pageCount = 5;

        self.subscribe(name + ".show", function(topic, data){
          self.show(data);
        });
      },
      show: function(data, callback) {
        var self = this;
        if (self.current != 0) {
          console.error("list is not current component, stop showing item");
          if (callback) callback();
          return;
        }
        var componentName = data.itemName || self.itemName;
        if (!componentName) {
          throw new Error(self.name + " missing component name");
        }
        var param = {
          load: true,
          trans: data.trans || TRANS_TYPE.MOVE_TO_LEFT_FROM_RIGHT,
          component: {
            name: componentName,
            data: data
          }
        };
        self.next(param, function($outpage, $inpage){
          if (callback) callback();
        });
      },
      onAllLoaded: function(callback){
        var self = this;
        if (!self.listName) {
          throw new Error(self.name + " set listName before afterRender");
        }
        var param = {
          load: true,
          trans: TRANS_TYPE.NO_ANIMATION,
          component: { name: self.listName }
        };
        self.trans(0, 0, param, function($outpage, $inpage){
          callback();
        });
      }
    });

    return {
      TYPE: TRANS_TYPE,
      Component: Component,
      Switcher: Switcher,
      ItemList: ItemList
    };
  })();

})();

