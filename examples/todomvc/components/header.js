F("header", F.Component.extend({
  afterRender: function(callback) {
    var self = this;
    var $input = self.$("#new-todo");
    $input.keydown(function(event){
      if (event.keyCode == "13") { // 13: enter
        var value = $input.val().trim();
        if (value) GetStore().insert({ completed: false, value: value });
        $input.val("");
      }
    });
    callback();
  }
}));
