
(function () {
  'use strict';

  function DebugLog() {};
  var proto = DebugLog.prototype;

  var __DEBUG = false;
  proto.start = function() {
    console.log("DebugLog started");
    __DEBUG = true;
    this.realConsoleLog = console.log;
    console.log = this.__log;
  };

  proto.stop = function() {
    __DEBUG = false;
    console.log = this.realConsoleLog;
  };

  proto.__log = (function(undefined) {
    var Log = Error; // does this do anything?  proper inheritance...?
    Log.prototype.write = function (args) {

      var suffix = {
          "@": (this.lineNumber
              ? this.fileName + ':' + this.lineNumber + ":1"
              : extractLineNumberFromStack(this.stack)
          )
        };
      
      args = args.concat([suffix]);

      if (window.DebugLog.realConsoleLog.apply) {
        window.DebugLog.realConsoleLog.apply(console, args);        
      }
      else {
        window.DebugLog.realConsoleLog(args);
      }
    };
    var extractLineNumberFromStack = function (stack) {
      var line = stack.split('\n')[3];
      // fix for various display text
      line = ( line.indexOf(' (') >= 0
        ? line.split(' (')[1].substring(0, line.length - 1)
        : line.split('at ')[1]
        );
      return line;
    };
    
    return function (params) {
      if (typeof __DEBUG === typeof undefined || !__DEBUG) return;
      Log().write(Array.prototype.slice.call(arguments, 0));
    };
    
  })();


  if (typeof define === 'function' && define.amd) {
    define(function () {
      return new DebugLog();
    });
  }
  else if (typeof module === 'object' && module.exports){
    module.exports = new DebugLog();
  }
  else {
    this.DebugLog = new DebugLog();
  }
}.call(this));

