

var filemail_newMailListener = {
    msgsMoveCopyCompleted: function(aMove, 
                                    aSrcMsgs,
                                    aDestFolder,
                                    aDestMsgs) {   
	 
      const nsMsgFolderFlags = Components.interfaces.nsMsgFolderFlags;
      var ignoreFlags = nsMsgFolderFlags.Trash | nsMsgFolderFlags.SentMail |
                        nsMsgFolderFlags.Drafts | nsMsgFolderFlags.Queue |
                        nsMsgFolderFlags.Templates | nsMsgFolderFlags.Junk |
                         nsMsgFolderFlags.Inbox;               
      if (!(aDestFolder.flags & ignoreFlags)) { // isSpecialFlags does some strange hacks
        for (let msgHdr of fixIterator(aSrcMsgs, Components.interfaces.nsIMsgDBHdr)) {
          let mailfrom = filemail.address_extract(msgHdr.author);
          if (filemail_sqlite.dbIsKnownAuthor(mailfrom)) {
            mailfrom = filemail.address_extract(gFolderDisplay.selectedMessage.recipients);
          }                                
          if (filemail_sqlite.dbSetPath(mailfrom, aDestFolder.URI)) {
            filemail.notify(filemail.strings.getString("update") + " "+ mailfrom , aDestFolder.URI);
          }
        }
      } 
    }
}

var filemail = {
  onLoad: function() {
    // initialization code
    this.initialized = true;
    this.strings = document.getElementById("filemail-strings");
    filemail_sqlite.onLoad();
    var notificationService =
	 Components.classes["@mozilla.org/messenger/msgnotificationservice;1"]
	 .getService(Components.interfaces.nsIMsgFolderNotificationService);
     notificationService.addListener(filemail_newMailListener, notificationService.msgsMoveCopyCompleted); 
  },
  notify: function(title, text) {
    try {
      Components.classes['@mozilla.org/alerts-service;1']
              .getService(Components.interfaces.nsIAlertsService)
              .showAlertNotification(null, title, unescape(text), false, '', null);
    } catch(e) {
      // prevents runtime error on platforms that don't implement nsIAlertsService
    }
  },
  address_extract: function(addresses_toParse) {    
    var addresses_only = {};
    var names_only = {};
    var addresses_and_names = {};
    var headerParser = Components.classes["@mozilla.org/messenger/headerparser;1"].
           getService(Components.interfaces.nsIMsgHeaderParser);
    let numAddress = headerParser.parseHeadersWithArray(addresses_toParse,
            addresses_only, names_only, addresses_and_names);
    if (numAddress > 0) {
      return addresses_only.value[0];    
    }
    return addresses_toParse;
  }, 
  moveMail: function() {
    ChromeUtils.import("resource:///modules/MailUtils.jsm");
    if (gFolderDisplay.selectedCount == 1) {
      let mailfrom = this.address_extract(gFolderDisplay.selectedMessage.author);
      if (filemail_sqlite.dbIsKnownAuthor(mailfrom)) {
        mailfrom = this.address_extract(gFolderDisplay.selectedMessage.recipients);
      }
      let path = filemail_sqlite.dbGetPath(mailfrom);
      if (path) {
        MsgMoveMessage(MailUtils.getExistingFolder(path, false));
        filemail.notify(mailfrom + " " + this.strings.getString("movedto"), path); 
      }
      else {
        filemail.notify(this.strings.getString("unknown"), this.strings.getString("hand"));
      }
    }
    else {
      filemail.notify(this.strings.getString("onemsg"),this.strings.getString("key"));
    }
  },
  invertSender: function() {
    if (gFolderDisplay.selectedCount == 1) {
      let mailfrom = this.address_extract(gFolderDisplay.selectedMessage.author);
      filemail_sqlite.dbSaveKnownAuthor(mailfrom);
    }
  }
};

window.addEventListener("load", function(){filemail.onLoad()}, false);
