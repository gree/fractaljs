var fs = require("fs");
var system = require('system');

var args = system.args;
var options = {};
for (var i = 0; i < args.length - 1; i++) {
  var key, val;
  if (args[i].indexOf("-") === 0) {
    key = args[i].replace(/(^-+)/, "");
    if (key === "console") {
      options[key] = true;
    } else {
      val = args[++i];
      if (key === "concurrency") val = parseInt(val);
      options[key] = val;
    }
  }
}

if (options["concurrency"] && options["concurrency"] > 10)
  options["concurrency"] = 10;

["baseUrl", "wwwDir"].forEach(function(v) {
  if (options[v]) {
    var str = options[v];
    options[v] = (str.substr(-1) === '/') ? str.substr(0, str.length - 1) : str;
  }
});

var startUrl = options["startUrl"];
var baseUrl = options["baseUrl"];
if (startUrl.indexOf(baseUrl) !== 0) {
  startUrl = baseUrl + startUrl;
  delete options["startUrl"];
}

var Builder = (function(){
  var workerIdSeq = 0;
  var Worker = function(options) {
    var self = this;
    self.id = workerIdSeq++;
    self.logPrefix = "[worker." + +self.id + "]";
    self.options = options;

    self.page = require('webpage').create();
    self.page.settings.userAgent = "fractaljs-site-builder";
    if (self.options.console) {
      self.page.onConsoleMessage = function(msg, lineNum, sourceId) {
        console.log(self.logPrefix, "CONSOLE:", msg);
      };
    }
    self.page.onCallback = function() {
      console.log(self.logPrefix, "onCallback");
      self.status = "loaded";
      self.fractaljsInited = true;
      self.process();
    };

    self.fractaljsInited = false;
    self.callback = null;
  };

  Worker.prototype = {
    process: function() {
      var self = this;
      console.log(self.logPrefix, "page loaded:", self.page.url);
      var tasks = self.page.evaluate(function(baseUrl){
        $("script").each(function(k, v){
          if (v.src.indexOf(baseUrl + "/components/") === 0) {
            $(v).remove();
          }
        });
        var tasks = [];
        $("a").each(function(k, v){
          var buildLink = $(v).data("build-link");
          if (buildLink) {
            tasks.push([buildLink, v.href]);
          }
        });
        return tasks;
      }, self.options.baseUrl);

      if (self.path) {
        console.log(self.logPrefix, "generate:",
                    self.page.url.replace(self.options.baseUrl, ""), "->", self.path);
        fs.write(self.path, self.page.content, "w");
      }

      clearInterval(self.ping);
      self.callback(true, tasks);
    },
    add: function(task, cb) {
      var self = this;
      var url = task[0];
      var path = task[1];
      self.ping = setTimeout(function(){
        self.page.close();
        cb(false);
      }, 5000);
      self.status = "added";
      self.path = path;
      self.callback = cb;
      console.log(self.logPrefix, "add", url, "inited", self.fractaljsInited);
      if (self.fractaljsInited) {
        self.page.open(url);
        setTimeout(function(){
          self.page.evaluate(function(){
            var __waitLoaded = function(cb){
              var allLoaded = (function(){
                for (var k in F.all) {
                  if (!F.all[k].rendered) {
                    console.log("not rendered", F.all[k].name, k);
                    return false;
                  }
                }
                return true;
              })();
              if (allLoaded) {
                cb();
              } else {
                setTimeout(function(){ __waitLoaded(cb); }, 10);
              }
            };
            console.log("waiting page load ...");
            __waitLoaded(function(){
              console.log("page loaded");
              window.callPhantom();
            });
          });
        }, 50);
      } else {
        self.page.open(url, function(status){
          if (status !== "success") {
            throw new Error("Failed getting url: " + url + " status: " + status);
          }
          self.status = "opened" + self.page.content;
          self.page.evaluate(function(){
            var __waitInit = function(cb){
              if (window.F && window.F.app) {
                cb();
              } else {
                setTimeout(function(){ __waitInit(cb); }, 10);
              }
            };
            console.log("waiting fractaljs init ...");
            __waitInit(function(){
              console.log("fractaljs inited");
              var token = F.Pubsub.subscribe("f.build.done", self, function(topic){
                window.callPhantom();
                F.Pubsub.unsubscribe("f.build.done", token);
              });
              setTimeout(function(){ F.buildStatic(); }, 10);
            });
          });
        });
      }
    },
  };

  var Builder = function(options) {
    var self = this;
    self.logPrefix = "[builder]";
    self.options = {
      concurrency: 30,
      baseUrl: "http://127.0.0.1:8800",
      wwwDir: fs.workingDirectory + "/../www",
    };
    for (var i in options) {
      self.options[i] = options[i];
    }
    console.log(self.logPrefix, "options:");
    for (k in options) {
      console.log(self.logPrefix, "  ", k, options[k]);
    }

    self.knownLinks = {};
    self.queue = [];
    self.nbProcessing = 0;
    self.workers = [];
    for (var i = 0; i < self.options.concurrency; i++) {
      self.workers.push(new Worker(self.options));
    }
  };

  Builder.prototype = {
    start: function(url, path, cb) {
      var self = this;
      console.log(self.logPrefix, "start " + url + " ...");
      self.queue.push([url, path]);
      self.consume(cb);
    },
    consume: function(cb){
      var self = this;
      var total = 0;
      for (var i = 0; i<self.options.concurrency; i++) {
        var task = self.queue.shift();
        if (!task) break;
        total++;
        self.workers[i].add(task, function(err, moreTasks, worker){
          total--;
          var cnt = 0;
          moreTasks.forEach(function(v){
            var url = v[0];
            if (url.indexOf(self.options.baseUrl) !== 0) {
              if (url.indexOf("/") !== 0) url = "/" + url;
              url = self.options.baseUrl + url;
            }
            var wwwPath = v[1];
            wwwPath = wwwPath.replace(self.options.baseUrl, "");
            if (wwwPath.indexOf("/") !== 0) wwwPath = "/" + wwwPath;
            wwwPath = wwwPath.split("#")[0];
            wwwPath = wwwPath.split("?")[0];
            var localPath = self.options.wwwDir + wwwPath;

            var task = [url, localPath];
            if (!(url in self.knownLinks)) {
              self.knownLinks[url] = true;
              cnt++;
              if (cnt > 10) return;
              console.log(self.logPrefix, "enqueue:", url);
              self.queue.push(task);
            }
          });
          console.log(self.logPrefix, "new links:", cnt,
                      "pending", total, "queue", self.queue.length);
          if (total === 0) {
            if (self.queue.length === 0) {
              cb();
            } else {
              self.consume(cb);
            }
          }
        });
      }
    }
  };

  return Builder;
})();

var builder = new Builder(options);
builder.start(startUrl, wwwDir + "/start.html", function(){
  setTimeout(function(){
    console.log("[main] done");
    phantom.exit();
  }, 50);
});

