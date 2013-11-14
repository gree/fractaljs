var angular_todo = (function(){
  var TodoCtrl = function($scope) {
    $scope.todos = [];
    $scope.markAll = false;
      
    $scope.addTodo = function() {
        if(event.keyCode == 13 && $scope.todoText){
            $scope.todos.push({text:$scope.todoText, done:false});
            $scope.todoText = '';
        }
    };
    $scope.isTodo = function(){
        return $scope.todos.length > 0;  
    }
    $scope.toggleEditMode = function(){
        $(event.target).closest('li').toggleClass('editing');
    };
    $scope.editOnEnter = function(todo){
        if(event.keyCode == 13 && todo.text){
            $scope.toggleEditMode();
        }
    };
      
    $scope.remaining = function() {
      var count = 0;
      angular.forEach($scope.todos, function(todo) {
        count += todo.done ? 0 : 1;
      });
      return count;
    };

    $scope.hasDone = function() {
        return ($scope.todos.length != $scope.remaining());
    }    
      
    $scope.itemText = function() {
        return ($scope.todos.length - $scope.remaining() > 1) ? "items" : "item";     
    };
        
    $scope.toggleMarkAll = function() {
        angular.forEach($scope.todos, function(todo) {
          todo.done =$scope.markAll;
        });
    };
    
    $scope.clear = function() {
      var oldTodos = $scope.todos;
      $scope.todos = [];
      angular.forEach(oldTodos, function(todo) {
        if (!todo.done) $scope.todos.push(todo);
      });
    };
  };

  return Fractal.Component.extend({
    afterRender: function(callback) {
      window.TodoCtrl = TodoCtrl;
      Fractal.require([
        "/html/css/todo.css",
        "https://ajax.googleapis.com/ajax/libs/angularjs/1.1.5/angular.min.js"
      ], function(){
        if (callback) callback();
      });
    }
  });
})();

