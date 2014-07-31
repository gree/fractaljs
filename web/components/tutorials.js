F(function(){
  var tutorials = [
    {
      name: "Basic",
      basePath: "tutorials/basic/",
      files: [
        "index.html",
        "components/hello.js",
        "components/world.js",
        "templates/hello.tmpl",
        "templates/world.tmpl",
      ],
      resultHeight: "50px",
    },
    {
      name: "Nested Components",
      basePath: "tutorials/basic/",
      files: [
        "index2.html",
        "components/hello2.js",
        "components/world.js",
        "templates/hello2.tmpl",
        "templates/world.tmpl",
      ],
      resultHeight: "50px",
    },
    {
      name: "Setting Data",
      basePath: "tutorials/basic/",
      files: [
        "index3.html",
        "components/hello.js",
        "components/world2.js",
        "templates/hello.tmpl",
        "templates/world2.tmpl",
      ],
      resultHeight: "50px",
    },
    {
      name: "Dom Event Handling",
      basePath: "tutorials/dom_event/",
      files: [
        "index.html",
        "components/dom_event.js",
        "templates/dom_event.tmpl",
      ],
      resultHeight: "50px"
    },
    {
      name: "Data From API",
      basePath: "tutorials/github_activities/",
      files: [
        "index.html",
        "components/github_activities.js",
        "templates/github_activities.tmpl",
      ],
      resultHeight: "200px"
    },
    {
      name: "4 and 5",
      basePath: "tutorials/github_zen/",
      files: [
        "index.html",
        "components/github_zen.js",
        "templates/github_zen.tmpl",
      ],
      resultHeight: "50px"
    },
    {
      name: "advanced",
      basePath: "tutorials/github_activities/",
      files: [
        "index2.html",
        "components/main.js",
        "components/menu.js",
        "components/github_activities2.js",
        "components/github_profile.js",
        "templates/main.tmpl",
        "templates/menu.tmpl",
        "templates/github_activities2.tmpl",
        "templates/github_profile.tmpl",
      ],
      resultHeight: "200px"
    }
  ];
  var tutorialByName = {};
  tutorials.forEach(function(v){ tutorialByName[v.name] = v });

  F("tutorials", F.Component.extend({}));

  F("tutorial_sidebar", F.Component.extend({
    getData: function(cb) {
      this.data = {
        encoded: function() { return encodeURIComponent(this.name); },
        items: tutorials
      };
      cb();
    }
  }));

  F("tutorial_body", F.Component.extend({
    init: function(name, $container) {
      var self = this;
      self._super(name, $container);
      self.subscribe(F.TOPIC.ENV_CHANGED, function(topic, data){
        if (data.name) self.load();
      });
    },
    getData: function(cb) {
      var self = this;
      var name = Fractal.env.name || tutorials[0].name;
      var tutorial = tutorialByName[name];
      var basePath = tutorial.basePath || "tutorials/" + name + "/";
      var resultHeight = tutorial.resultHeight;
      var files = tutorial.files.map(function(v){
        var fileName = v.split("/").pop();
        return {
          idName: fileName.replace(/\./g, "-"),
          displayName: fileName,
          url: basePath + v,
          active: fileName.split(".").pop() == "html"
        };
      });
      F.require(files.map(function(v){ return v.url; }), {contentType: "text/plain"}, function(data){
        var lineNos = [];
        for (var i in data) lineNos.push(data[i].split("\n").length);
        files.forEach(function(v){
          v.contents = data[v.url];
          v.rows = Math.min(v.contents.split("\n").length + 1, 20);
        });
        self.data = {
          name: name,
          startUrl: files[0].url,
          files: files,
          resultHeight: resultHeight,
          fileStructure: tutorial.files.join("\n")
        }
        cb();
      });
    }
  }));
});

