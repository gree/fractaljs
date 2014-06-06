
var golden_ratio = (function(){
  var MaxIteration = 10;

  var checkStop = function(component) {
    var $myComp = component.$container; 
    var i = 0;
    while (true) {
      if ($myComp.data("role") == "component") i++;
      $myComp = $myComp.parent();
      if ($myComp.hasClass("box-gr-root")) {
          break;
      }
    }
    return (i>MaxIteration);
  };

  return Fractal.Component.extend({
    getData: function(callback) {
      var self = this;
      var stop = checkStop(this);
      console.log(stop);
      if (stop) {
        self.data = {
          stop: true
        };
        callback({stop: true});
        return;
      }
      var data = {};
      var parent = this.$container.parent();
      var parentWidth = parent.width();
      var parentHeight = parent.height();

      if (parentHeight == parentWidth) {
        self.data = {
          stop: true
        };
        callback({stop: true});
        return;        
      }

      if (parentWidth > parentHeight) {
        data = {
          width1: parentHeight + "px",
          width2: "1px",
          width3: (parentWidth - parentHeight - 1) + "px",
          height1: "100%",
          height2: "100%",
          height3: "100%",
        };
      } else {
        data = {
          width1: "100%",
          width2: "100%",
          width3: "100%",
          height1: parentWidth + "px",
          height2: "1px",
          height3: (parentHeight - parentWidth - 1) + "px",
        };
      }
      data.stop = false;
      self.data = data;
      setTimeout(function(){
        callback();
      }, 500);
    }
  });

})();



