var sidebar = Fractal.Component.extend({
  afterRender: function(callback) {
    var self = this;
    $('.btn-sidebar_link').click(function(){
      $('.btn-sidebar_link').removeClass("active");
      $(this).addClass("active");
      alert($(this).text() + " clicked!");
    });
    callback();
  },
  getData: function(callback) {
    var self = this;
    self.data = {
      item_list: [
        "Cras justo odio",
        "Dapibus ac facilisis in",
        "Morbi leo risus",
        "Porta ac consectetur ac",
        "Vestibulum at eros"
      ]
    };
    callback();
  }
});

