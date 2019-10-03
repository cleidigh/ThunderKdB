CopyMessageID = {

1: function () {
  const gClipboardHelper = Components.classes["@mozilla.org/widget/clipboardhelper;1"]
                                     .getService(Components.interfaces.nsIClipboardHelper);
  let hdr = gMessageDisplay.displayedMessage
  let s = hdr.getStringProperty("message-id")
  gClipboardHelper.copyString(s);
 },

}
