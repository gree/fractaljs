var JSONEditor = (function(){
  var JSONEditor = function(template, $container){
    this.template = template;
    this.compiledTemplate = Hogan.compile(this.template);
    this.$container = $container;
  };

  var proto = JSONEditor.prototype;

  proto.getData = function(){
    return this.fromEditor();
  };

  proto.setData = function(data, fieldDefs, options){
    this.fieldDefs = !!fieldDefs ? JSON.parse(JSON.stringify(fieldDefs)) : {};
    this.options = options || {};
    this.load(data);
  };

  proto.getValue = function(path) {
    var $input = $($(".je-field[data-path='" + path + "']").find('.je-input')[0]);
    return $input.val();
  }

  proto.setValue = function(path, value) {
    var $input = $($(".je-field[data-path='" + path + "']").find('.je-input')[0]);
    try { $input.val(value); } catch (e) { };
  }


  proto.load = function(data){
    var editorData = this.toEditor(data);
    var content = this.compiledTemplate.render(editorData, { json_editor: this.template });
    this.$container.html(content);
    this.setEvent();
  };

  proto.setEvent = function(){
    var self = this;
    self.$container.find(".je-input").change(function(e) {
      if (self.onValueChanged) {
        var data = self.fromEditor();
        self.onValueChanged(data);
      }
    });
    $('.je-btn-remove-field').click(function(){
      $(this).closest(".je-field").remove();
      if (self.onFieldChanged) {
        var data = self.fromEditor();
        self.onFieldChanged(data);
      }
    });
    $('.je-btn-add-field').click(function(){
      var data = self.fromEditor();
      var key = $(this).closest(".je-field").find('.je-input-add-key').val();
      if (!key) return;
      var path = $(this).closest(".je-object").data("path");
      var parts = path.split("/");
      var myData = data;
      for (var i in parts) {
        if (parts[i] && parts[i] in myData) {
          myData = myData[parts[i]];
        }
      }
      if (key in myData) {
        alert("duplicate key");
        return;
      }
      var myPath = (path == "/") ? (path + key) : (path + "/" + key);
      if (!(myPath in self.fieldDefs)) {
        value = "";
      } else {
        var def = self.fieldDefs[myPath];
        if (def.type == "object") {
          value = {};
        } else if (def.type == "select") {
          value = def.options[0];
        } else {
          value = "";
        }
      }
      myData[key] = value;
      self.load(data);
      if (self.onFieldChanged) {
        self.onFieldChanged(data);
      }
    });
  };

  proto.fromEditor = function($objectContainer){
    var self = this;
    var data = {};
    $objectContainer = $objectContainer || $(this.$container.find(".je-object")[0]);
    $objectContainer.find('.je-field').each(function(){
      var $field = $(this);
      var path = $field.data("path");
      if (!path) return true;
      var parts = path.split("/");
      var obj = data;
      var len = parts.length;
      for (var i=0; i<len-1; i++) {
        if (!parts[i]) continue;
        if (!(parts[i] in obj)) obj[parts[i]] = {};
        obj = obj[parts[i]]
      }
      var $input = $($field.find(".je-input")[0]);
      var value = $input.val();

      if (path in self.fieldDefs) {
        var def = self.fieldDefs[path];
        if (def.type == "object") {
          if (!value) {
            value = {};
            obj[parts[len-1]] = value;
          }
        } else {
          if (def.type !== "string") {
            try{
              value = JSON.parse('{"value": ' + value + '}').value;
            } catch(e) {}
          }
          obj[parts[len-1]] = value;
        }
      }
    });
    return data;
  };

  proto.toEditor = function(data, path) {
    path = path || "";
    var result = {
      path: path || "/",
      fields: [],
      fields_editable: this.options.fields_editable,
      is_root: !path,
      is_obj: true,
    };
    for (var i in data) {
      var myPath = path + "/" + i;
      if (!(myPath in this.fieldDefs)) this.fieldDefs[myPath] = {};
      var def = this.fieldDefs[myPath];
      if (!def.type) def.type = typeof(data[i]);
      var field = null;
      if (def.type == "object") {
        field = this.toEditor(data[i], myPath);
        field.attrs = def.attrs;
        field.key = def.display_key || i;
        field.removable = this.options.fields_editable && (!def.require);
      } else {
        field = {};
        field.attrs = def.attrs;
        field.key = def.display_key || i;
        field.is_obj = false;
        field.path = myPath;
        field.removable = this.options.fields_editable && (!def.require);

        if (def["form-type"] == "select") {
          var options = def["form-options"].map(function(v){
            return {
              selected: v == data[i],
              value: v,
              key: v
            };
          });
          field.select_value = {
            options: options,
            attrs: def.attrs
          };
        } else if (def.type == "boolean") {
          field.select_value = {
            options: [
              { value: true, key: true, selected: !!data[i] },
              { value: false, key: false, selected: !data[i] },
            ],
            attrs: def.attrs
          };
        } else {
          field.single_value = {
            value: data[i],
            attrs: def.attrs
          };
        }
      }
      result.fields.push(field);
    }

    return result;
  };

  return JSONEditor;
})();

