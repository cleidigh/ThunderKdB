if ("undefined" == typeof(toggleButtons2)) {
  var toggleButtons2 = {};
};

var prefs = Components.classes['@mozilla.org/preferences-service;1'].getService(Components.interfaces.nsIPrefBranch);

window.addEventListener("load", function load(event){
    window.removeEventListener("load", load, false); //remove listener, no longer needed
    toggleButtons2.init();
},false);

var toggleButtons2 = {
  init: function() {
    var phb_toggleSummary = document.getElementById("phb_toggleSummary");
    if(phb_toggleSummary){
      phb_toggleSummary.addEventListener("load", function(event) { toggleButtons2.checkSummary(event); }, true);
    }
  },

  checkSummary: function() {
    switch(prefs.getIntPref('rss.show.summary')) {
      case 0:
      document.getElementById("phb_toggleSummary").setAttribute("style","-moz-image-region: rect(0px, 480px, 24px, 456px);");
      break;
      case 2:
      document.getElementById("phb_toggleSummary").setAttribute("style","-moz-image-region: rect(0px, 480px, 24px, 456px);");
      break;
      default:
      document.getElementById("phb_toggleSummary").setAttribute("style","-moz-image-region: rect(0px, 600px, 24px, 576px);");
    };
  },

  toggleSummary: function() {
    switch(prefs.getIntPref('rss.show.summary')) {
      case 1: FeedMessageHandler.onSelectPref = 0;
      document.getElementById("phb_toggleSummary").setAttribute("style","-moz-image-region: rect(0px, 480px, 24px, 456px);");
      break;
      default: FeedMessageHandler.onSelectPref = 1;
      document.getElementById("phb_toggleSummary").setAttribute("style","-moz-image-region: rect(0px, 600px, 24px, 576px);");
    };
  },
};
