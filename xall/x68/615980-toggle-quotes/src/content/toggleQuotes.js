var prefs = Components.classes['@mozilla.org/preferences-service;1'].getService(Components.interfaces.nsIPrefBranch);

var gtoggleQuotesBundle = Components.classes["@mozilla.org/intl/stringbundle;1"].getService(Components.interfaces.nsIStringBundleService);

var _bundle = gtoggleQuotesBundle.createBundle("chrome://toggleQuotes/locale/toggleQuotes.properties");


function toggleQuotes() {
  if (typeof QuoteCollapse != "undefined") {
    var messageDocument = QuoteCollapse._messagePane.contentDocument;
    var bq = messageDocument.getElementsByTagName("blockquote").item(0);
    if ( ! bq ) return;
    var newstate= ! QuoteCollapse._getState(bq);
    QuoteCollapse._setTree(messageDocument, newstate);
  }
  else {
    alert
    (_bundle.GetStringFromName("installAlert"));
  }
}
