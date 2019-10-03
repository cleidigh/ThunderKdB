var EXPORTED_SYMBOLS = ["StopWatch"];

Components.utils.import("resource://gre/modules/Services.jsm");


var StopWatch = function(logging) {
  var self = this;
  self.startTime = 0;

  if(logging == null) {
    self.logging = true;
  }
  else{
    self.logging = logging;
  }

  var pub = {};

  pub.start = function() {
    self.startTime = new Date().getTime();
  }

  pub.stop = function() {
    var end = new Date().getTime();

    return (end - self.startTime);
  }

  pub.log = function(prefix) {
    if(self.logging) {
      Services.console.log(prefix + ' took ' + pub.stop() + 'ms');
    }
  }

  return pub;
}
