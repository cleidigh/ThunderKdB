if (typeof org_mozdev_getpartialmessages == "undefined") {
  var org_mozdev_getpartialmessages = {};
};

org_mozdev_getpartialmessages.wrapper = function(){
  var pub = {};

  pub.log = function(msg) {
//    Services.console.logStringMessage(msg);
  }
  pub.getMessages = function(){
    pub.log(Date() + " GPM: getMessages: start");
    Components.utils.import("resource:///modules/iteratorUtils.jsm");
    const MSG_FLAG_PARTIAL = 0x400;

    var view = gDBView;
    var fldrlocal = view.getFolderForViewIndex(0);
    var messagesEnumerator = fldrlocal.messages;

    var msgWindow = Components.classes["@mozilla.org/messenger/msgwindow;1"]
                      .createInstance(Components.interfaces.nsIMsgWindow);

    pub.log(Date() + " GPM: getMessages: 1");

    var downloadMessages = new Array();
    while (messagesEnumerator.hasMoreElements()) {
      var message = messagesEnumerator.getNext();
      var messageHeader = message.QueryInterface(Components.interfaces.nsIMsgDBHdr);
      if (messageHeader.flags & MSG_FLAG_PARTIAL){
        downloadMessages.push(message);
      }
    }

    pub.log(Date() + " GPM: getMessages: 2 " + downloadMessages);

    if (downloadMessages.length > 0) {
      var messages;
      messages = toXPCOMArray(downloadMessages, Components.interfaces.nsIMutableArray);
      fldrlocal.DownloadMessagesForOffline(messages, msgWindow);
      pub.log(Date() + " GPM: getMessages: 3 ");
    }

    pub.log(Date() + " GPM: getMessages: stop");
  }
  return pub;
}();

org_mozdev_getpartialmessages.log(Date() + " GPM: loaded getpar.js: " + org_mozdev_getpartialmessages);
