if ("undefined" == typeof(toggleButtons1)) {
  var toggleButtons1 = {};
};

var prefs = Components.classes['@mozilla.org/preferences-service;1'].getService(Components.interfaces.nsIPrefBranch);

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
    switch(prefs.getIntPref('mailnews.display.html_as')) {
      case 1:
      document.getElementById("phb_toggleHTML").setAttribute("style","-moz-image-region: rect(0px, 576px, 24px, 552px);");
      break;
      case 3:
      document.getElementById("phb_toggleHTML").setAttribute("style","-moz-image-region: rect(0px, 552px, 24px, 528px);");
      break;
      default:
      document.getElementById("phb_toggleHTML").setAttribute("style","-moz-image-region: rect(0px, 408px, 24px, 384px);");
    };
  },

  toggleHTML: function() {
    switch(prefs.getIntPref('mailnews.display.html_as')) {
      case 1: MsgBodyAllowHTML();
      document.getElementById("phb_toggleHTML").setAttribute("style","-moz-image-region: rect(0px, 408px, 24px, 384px);");
      break;
      case 3: MsgBodyAsPlaintext();
      document.getElementById("phb_toggleHTML").setAttribute("style","-moz-image-region: rect(0px, 576px, 24px, 552px);");
      break;
      default: MsgBodySanitized();
      document.getElementById("phb_toggleHTML").setAttribute("style","-moz-image-region: rect(0px, 552px, 24px, 528px);");
    };
  },
};


