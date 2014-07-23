F("main", F.Component.extend({}));

F("body", F.Components.Router.extend({
  knownPages: {
    start: true,
    doc: true,
    examples: true,
    home: true
  },
  getComponentName: function(changed, cb) {
    var page = F.env.page || "home";
    if (page in this.knownPages) cb(page);
    else cb();
  }
}));

F("MarkDownDoc", F.Component.extend({
  getDocName: function() { return this.docName || this.name; },
  template: '<div class="container">' +
    '<div class="col-md-4">' +
    '<div id="toc" data-role="component" data-name="MDTableContents" data-mdname="{{name}}">' +
    '</div>' +
    '</div>' +
    '<div class="col-md-8" data-role="component" data-name="MDBody" data-mdname="{{name}}">' +
    '</div>' +
    '</div>',
  getData: function(cb) {
    var self = this;
    self.data = { name: self.getDocName() };
    cb();
  },
  onAllLoaded: function(cb) {
    this.$("#toc").affix();
    cb();
  }
}));

F("MDBody", F.Component.extend({
  template: '{{{doc}}}',
  getData: function(cb) {
    var self = this;
    var name = self.$container.data("mdname");
    var md = "docs/" + name + ".md";
    F.require(md, {contentType: "text/plain"}, function(data){
      F.require("//cdnjs.cloudflare.com/ajax/libs/marked/0.3.2/marked.min.js", function(){
        var doc = marked(data);
        self.data = { doc: doc };
        cb();
      });
    });
  }
}));

F("MDTableContents", F.Component.extend({
  template: '<ul>' +
    '{{#items}}' +
    '{{#subToc}}' +
    '{{>myself}}' +
    '{{/subToc}}' +
    '{{^subToc}}' +
    '<li><a href="#{{link}}">{{text}}</li>' +
    '{{/subToc}}' +
    '{{/items}}' +
    '</ul>',
  getData: function(cb) {
    var self = this;
    var name = self.$container.data("mdname");
    var md = "docs/" + name + ".md";
    F.require(md, {contentType: "text/plain"}, function(data){
      F.require("//cdnjs.cloudflare.com/ajax/libs/marked/0.3.2/marked.min.js", function(){
        var tokens = marked.lexer(data);
        var toc = { items: [], parent: null };
        var pToc = toc;
        var currentDepth = -1;
        tokens.forEach(function(v){
          if (v.type == "heading") {
            if (currentDepth === -1) currentDepth = v.depth;
            if (v.depth > currentDepth) {
              var item = { subToc: true, items: [], parent: pToc };
              pToc.items.push(item);
              pToc = item;
            } else if (v.depth < currentDepth) {
              var back = currentDepth - v.depth;
              while(back--) {
                if (pToc.parent) pToc = pToc.parent;
              }
            }
            pToc.items.push({
              subToc: false,
              text: v.text,
              link: function(){
                var text = this.text;
                return text.replace(/[*\s\)\(\.]+/g, "-").toLowerCase();
              }
            })
            currentDepth = v.depth;
          }
        });

        self.data = toc;
        self.partials = { myself: self.template };
        cb();
      });
    });
  }
}));
