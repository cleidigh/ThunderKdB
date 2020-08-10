if ("undefined" == typeof(toggleButtons2)) {
  var toggleButtons2 = {};
};

var prefs = Components.classes['@mozilla.org/preferences-service;1'].getService(Components.interfaces.nsIPrefBranch);
var newbundle = Components.classes["@mozilla.org/intl/stringbundle;1"].getService(Components.interfaces.nsIStringBundleService);
var phb_bundle = newbundle.createBundle("chrome://phoenityButtons/locale/phoenityButtons.properties");

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
    let tooltiptext1 = phb_bundle.GetStringFromName("phb_toggleSummary1");
    let tooltiptext2 = phb_bundle.GetStringFromName("phb_toggleSummary2");
    switch(prefs.getIntPref('rss.show.summary')) {
      case 0:
      document.getElementById("phb_toggleSummary").setAttribute("style","-moz-image-region: rect(0px, 480px, 24px, 456px);");
      document.getElementById("phb_toggleSummary").setAttribute("tooltiptext",tooltiptext1);
      break;
      case 2:
      document.getElementById("phb_toggleSummary").setAttribute("style","-moz-image-region: rect(0px, 480px, 24px, 456px);");
      document.getElementById("phb_toggleSummary").setAttribute("tooltiptext",tooltiptext2);
      break;
      default:
      document.getElementById("phb_toggleSummary").setAttribute("style","-moz-image-region: rect(0px, 600px, 24px, 576px);");
      document.getElementById("phb_toggleSummary").setAttribute("tooltiptext",tooltiptext2);
    };
  },

  toggleSummary: function() {
    let tooltiptext1 = phb_bundle.GetStringFromName("phb_toggleSummary1");
    let tooltiptext2 = phb_bundle.GetStringFromName("phb_toggleSummary2");
    switch(prefs.getIntPref('rss.show.summary')) {
      case 1: FeedMessageHandler.onSelectPref = 0;
      document.getElementById("phb_toggleSummary").setAttribute("style","-moz-image-region: rect(0px, 480px, 24px, 456px);");
      document.getElementById("phb_toggleSummary").setAttribute("tooltiptext",tooltiptext1);
      break;
      default: FeedMessageHandler.onSelectPref = 1;
      document.getElementById("phb_toggleSummary").setAttribute("style","-moz-image-region: rect(0px, 600px, 24px, 576px);");
      document.getElementById("phb_toggleSummary").setAttribute("tooltiptext",tooltiptext2);
    };
  },
};
