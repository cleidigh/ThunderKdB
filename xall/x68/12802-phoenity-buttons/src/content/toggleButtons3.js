if ("undefined" == typeof(toggleButtons3)) {
  var toggleButtons3 = {};
};

var prefs = Components.classes['@mozilla.org/preferences-service;1'].getService(Components.interfaces.nsIPrefBranch);
var newbundle = Components.classes["@mozilla.org/intl/stringbundle;1"].getService(Components.interfaces.nsIStringBundleService);
var phb_bundle = newbundle.createBundle("chrome://phoenityButtons/locale/phoenityButtons.properties");

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
    let tooltiptext1 = phb_bundle.GetStringFromName("phb_toggleInline1");
    let tooltiptext2 = phb_bundle.GetStringFromName("phb_toggleInline2");
    switch(prefs.getBoolPref('mail.inline_attachments')) {
      case true:
      document.getElementById("phb_toggleInline").setAttribute("style","-moz-image-region: rect(0px, 432px, 24px, 408px);");
      document.getElementById("phb_toggleInline").setAttribute("tooltiptext",tooltiptext2);
      break;
      default:
      document.getElementById("phb_toggleInline").setAttribute("style","-moz-image-region: rect(0px, 624px, 24px, 600px);");
      document.getElementById("phb_toggleInline").setAttribute("tooltiptext",tooltiptext1);
    };
  },

  toggleInline: function() {
    let tooltiptext1 = phb_bundle.GetStringFromName("phb_toggleInline1");
    let tooltiptext2 = phb_bundle.GetStringFromName("phb_toggleInline2");
    gDBView.reloadMessage();
    switch(prefs.getBoolPref('mail.inline_attachments')) {
      case true: prefs.setBoolPref('mail.inline_attachments',false);
      document.getElementById("phb_toggleInline").setAttribute("style","-moz-image-region: rect(0px, 624px, 24px, 600px);");
      document.getElementById("phb_toggleInline").setAttribute("tooltiptext",tooltiptext1);
      break;
      default: prefs.setBoolPref('mail.inline_attachments',true);
      document.getElementById("phb_toggleInline").setAttribute("style","-moz-image-region: rect(0px, 432px, 24px, 408px);");
      document.getElementById("phb_toggleInline").setAttribute("tooltiptext",tooltiptext2);
    };
  },
};

