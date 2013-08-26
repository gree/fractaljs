var shared_data = Fractal.Component.extend({
  afterRender: function() {
    var self = this;

    Fractal.subscribe(Fractal.TOPIC.DATA_UPDATED, self.update);

  },

  update: function(message, dataName) {
    if (dataName == "SHARED") {
      var viewData = Fractal.data[dataName];
      $('#random_text_another').text(viewData.text);
    }
  }
});


