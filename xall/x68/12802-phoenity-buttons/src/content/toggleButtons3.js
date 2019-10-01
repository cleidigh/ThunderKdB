if ("undefined" == typeof(toggleButtons3)) {
  var toggleButtons3 = {};
};

var prefs = Components.classes['@mozilla.org/preferences-service;1'].getService(Components.interfaces.nsIPrefBranch);

window.addEventListener("load", function load(event){
    window.removeEventListener("load", load, false); //remove listener, no longer needed
    toggleButtons3.init();
},false);

var toggleButtons3 = {
  init: function() {
    var phb_toggleInline = document.getElementById("phb_toggleInline");
    if(phb_toggleInline){
      phb_toggleInline.addEventListener("load", function(event) { toggleButtons3.checkInline(event); }, true);
    }
  },

  checkInline: function() {
    switch(prefs.getBoolPref('mail.inline_attachments')) {
      case true:
      document.getElementById("phb_toggleInline").setAttribute("style","-moz-image-region: rect(0px, 432px, 24px, 408px);");
      break;
      default:
      document.getElementById("phb_toggleInline").setAttribute("style","-moz-image-region: rect(0px, 624px, 24px, 600px);");
    };
  },

  toggleInline: function() {
    gDBView.reloadMessage();
    switch(prefs.getBoolPref('mail.inline_attachments')) {
      case true: prefs.setBoolPref('mail.inline_attachments',false);
      document.getElementById("phb_toggleInline").setAttribute("style","-moz-image-region: rect(0px, 624px, 24px, 600px);");
      break;
      default: prefs.setBoolPref('mail.inline_attachments',true);
      document.getElementById("phb_toggleInline").setAttribute("style","-moz-image-region: rect(0px, 432px, 24px, 408px);");
    };
  },
};

