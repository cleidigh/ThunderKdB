var prefs = Components.classes['@mozilla.org/preferences-service;1'].getService(Components.interfaces.nsIPrefBranch);

var gtoggleQuotesBundle = Components.classes["@mozilla.org/intl/stringbundle;1"].getService(Components.interfaces.nsIStringBundleService);

var _bundle = gtoggleQuotesBundle.createBundle("chrome://toggleQuotes/locale/toggleQuotes.properties");

function toggleQuotes() {
  if (typeof QuoteCollapse != "undefined") {
    var messageDocument = QuoteCollapse._messagePane.contentDocument;
    bq = messageDocument.getElementsByTagName("blockquote").item(0);
  if( ! bq ) return;
    var newstate= ! QuoteCollapse._getState(bq);
    QuoteCollapse._setTree(messageDocument, newstate);
  }
  else {
    alert
    (_bundle.GetStringFromName("installAlert"));
  }
}

function checkPhoenityShredder() {
  if (prefs.getCharPref('general.skins.selectedSkin') == "PhoenityShredder") {
    document.getElementById("mail-toolbar-menubar2").setAttribute("shredder","true");
    document.getElementById("mail-bar3").setAttribute("shredder","true");
    document.getElementById("tabs-toolbar").setAttribute("shredder","true");
  } else {
    document.getElementById("mail-toolbar-menubar2").setAttribute("shredder","false");
    document.getElementById("mail-bar3").setAttribute("shredder","false");
    document.getElementById("tabs-toolbar").setAttribute("shredder","false");
  }
}
