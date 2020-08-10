if ("undefined" == typeof(toggleButtons1)) {
  var toggleButtons1 = {};
};

var prefs = Components.classes['@mozilla.org/preferences-service;1'].getService(Components.interfaces.nsIPrefBranch);
var newbundle = Components.classes["@mozilla.org/intl/stringbundle;1"].getService(Components.interfaces.nsIStringBundleService);
var phb_bundle = newbundle.createBundle("chrome://phoenityButtons/locale/phoenityButtons.properties");

window.addEventListener("load", function load(event){
    window.removeEventListener("load", load, false); //remove listener, no longer needed
    toggleButtons1.init();
},false);

var toggleButtons1 = {
  init: function() {
    var phb_toggleHTML = document.getElementById("phb_toggleHTML");
    if(phb_toggleHTML){
      phb_toggleHTML.addEventListener("load", function(event) { toggleButtons1.checkHTML(event); }, true);
    }
  },

  checkHTML: function() {
    let tooltiptext1 = phb_bundle.GetStringFromName("phb_toggleHTML1");
    let tooltiptext2 = phb_bundle.GetStringFromName("phb_toggleHTML2");
    let tooltiptext3 = phb_bundle.GetStringFromName("phb_toggleHTML3");
    switch(prefs.getIntPref('mailnews.display.html_as')) {
      case 1:
      document.getElementById("phb_toggleHTML").setAttribute("style","-moz-image-region: rect(0px, 576px, 24px, 552px);");
      document.getElementById("phb_toggleHTML").setAttribute("tooltiptext",tooltiptext3);
      break;
      case 3:
      document.getElementById("phb_toggleHTML").setAttribute("style","-moz-image-region: rect(0px, 552px, 24px, 528px);");
      document.getElementById("phb_toggleHTML").setAttribute("tooltiptext",tooltiptext2);
      break;
      default:
      document.getElementById("phb_toggleHTML").setAttribute("style","-moz-image-region: rect(0px, 408px, 24px, 384px);");
      document.getElementById("phb_toggleHTML").setAttribute("tooltiptext",tooltiptext1);
    };
  },

  toggleHTML: function() {
    let tooltiptext1 = phb_bundle.GetStringFromName("phb_toggleHTML1");
    let tooltiptext2 = phb_bundle.GetStringFromName("phb_toggleHTML2");
    let tooltiptext3 = phb_bundle.GetStringFromName("phb_toggleHTML3");
    switch(prefs.getIntPref('mailnews.display.html_as')) {
      case 1: MsgBodyAllowHTML();
      document.getElementById("phb_toggleHTML").setAttribute("style","-moz-image-region: rect(0px, 408px, 24px, 384px);");
      document.getElementById("phb_toggleHTML").setAttribute("tooltiptext",tooltiptext1);
      break;
      case 3: MsgBodyAsPlaintext();
      document.getElementById("phb_toggleHTML").setAttribute("style","-moz-image-region: rect(0px, 576px, 24px, 552px);");
      document.getElementById("phb_toggleHTML").setAttribute("tooltiptext",tooltiptext3);
      break;
      default: MsgBodySanitized();
      document.getElementById("phb_toggleHTML").setAttribute("style","-moz-image-region: rect(0px, 552px, 24px, 528px);");
      document.getElementById("phb_toggleHTML").setAttribute("tooltiptext",tooltiptext2);
    };
  },
};


