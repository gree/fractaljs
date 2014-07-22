F("editor", F.Component.extend({
  KEY: "fractaljs-demo-jsonObject",
  afterRender: function(cb){
    var self = this;
    F.require(["web/json_editor.js", "json_editor.tmpl"], function(data){
      var editor = new JSONEditor(data["json_editor.tmpl"], $('#editor-container'));
      editor.setData(self.jsonObject, null, {fields_editable: true});

      self.$("#btn-save").click(function(){
        var obj = editor.getData();
        localStorage.setItem(self.KEY, JSON.stringify(obj));
      });
      self.$("#btn-reset").click(function(){
        localStorage.removeItem(self.KEY);
        self.load();
      });

      cb();
    });
  },
  getData: function(cb){
    var self = this;
    F.require("web/css/json_editor.css", function(){
      var obj = localStorage.getItem(self.KEY);
      self.jsonObject = obj ? JSON.parse(obj) : { a: "a", b: { c: "c", d: "d"} };
      cb();
    });
  }
}));

