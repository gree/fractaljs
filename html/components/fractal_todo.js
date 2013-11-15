
var fractal_todo = Fractal.Component.extend({
});

var todo_header = Fractal.Component.extend({
  afterRender: function(callback) {
    var self = this;
    self.todos = [];

    var $inputNew = $(self.$container.find('#new-todo')[0]);
    $inputNew.keypress(function(e){
      if (e.keyCode == 13) {
        var value = $(this).val();
        if (value) {
          $(this).val("");
          self.publish("todos.update", {action: "add", value: value});
        }
      }
    });

    callback();
  }
});

var todo_list = (function(){
  var idGen = 0;
  var todoList = {};

  var TODOS = {};
  TODOS.remove = function(idList) {
    for (var i in idList) {
      if (idList[i] in todoList) {
        delete todoList[idList[i]];
      }
    }
  };
  TODOS.add = function(value) {
    var id = ++idGen;
    todoList[id] = value;
  };
  TODOS.update = function(id, value) {
    if (id in todoList) {
      todoList[id] = value;
    }
  };
  TODOS.forView = function(){
    var data = [];
    for (var i in todoList) {
      data.push({id: i, title: todoList[i]});
    }
    return {show: data.length>0, todos: data};
  };

  return Fractal.Component.extend({
    init: function(name, $container){
      var self = this;
      self._super(name, $container);

      self.subscribe("todos.update", function(topic, data){
        if (!self.rendered) return;
        TODOS[data.action](data.value);
        self.load();
        self.publishStatus();
      });
    },
    publishStatus: function() {
      var self = this;
      var all = 0;
      var checked = [];
      self.$toggleSingles.each(function(){
        all++;
        if (this.checked) {
          var id = ($($(this).parent()).parent()).data("id");
          checked.push(id);
        }
      });
      self.publish("toggles.update", {
        all: all,
        checked: checked
      });
    },
    afterRender: function(callback) {
      var self = this;

      var $lis = $(self.$container.find('li'));
      var $views = $(self.$container.find('.view'));
      $views.dblclick(function(){
        var $li = $($(this).parent());
        $li.addClass("editing");
        $li.find(".edit").focus();
      });

      var $edits = $(self.$container.find('.edit'));
      $edits.keypress(function(e){
        if (e.keyCode == 13) {
          var value = $(this).val();
          var $li = $($(this).parent());
          if (!!value) {
            TODOS.update($li.data("id"), value);
          } else {
            TODOS.remove([$li.data("id")]);
          }
          self.load();
          self.publishStatus();
        }
      });

      self.$toggleSingles = $(self.$container.find('.toggle-single'));

      self.$toggleSingles.click(function(){
        var $li = $($($(this).parent()).parent());
        $li.toggleClass("done");
        self.publishStatus();
      });

      $toggleAll = $(self.$container.find('#toggle-all')[0]);
      $toggleAll.click(function(){
        var checked = this.checked;
        self.$toggleSingles.each(function(){ $(this).get(0).checked = checked; });
        $lis.toggleClass("done", checked);
        self.publishStatus();
      });

      callback();
    },
    getData: function(callback) {
      this.data = TODOS.forView();
      callback();
    }
  });
})();

var todo_footer = Fractal.Component.extend({
  init: function(name, $container){
    var self = this;
    self._super(name, $container);

    self.subscribe("toggles.update", function(topic, data){
      if (!self.rendered) return;
      self.footerData = data;
      self.load();
    });
  },
  afterRender: function(callback) {
    var self = this;
    $clearCompleted = $(self.$container.find('#clear-completed')[0]);
    $clearCompleted.click(function(){
      self.publish("todos.update", {action: "remove", value: self.footerData.checked});
    });
    callback();
  },
  getData: function(callback) {
    var self = this;
    if (self.footerData) {
      self.data = {
        show: (self.footerData.all > 0),
        all: self.footerData.all,
        checked: self.footerData.checked.length,
        multiple: self.footerData.checked.length > 1
      };
    } else {
      self.data = {};
    }
    callback();
  },
});

