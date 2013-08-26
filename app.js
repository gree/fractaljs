var express = require('express');
var app = express();

var port = 8765;

app.configure(function () {
  app.use(express.methodOverride());
  app.use(express.bodyParser());
  app.use(express.cookieParser());
  app.use(app.router);
  app.use(express.static(__dirname));
  app.use(express.directory(__dirname));
});

app.listen(port);
