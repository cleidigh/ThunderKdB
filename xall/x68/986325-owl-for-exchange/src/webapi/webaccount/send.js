var gSendObserver = {
  observe: function(aSubject, aTopic, aData) {
    if (aTopic == "mail-set-sender") {
      let msgCompose = aSubject.QueryInterface(Ci.nsIMsgCompose);
      let [accountKey, deliverMode, identityKey] = aData.split(",");
      /* we only intercept actual delivery. Drafts/Templates works anyway. */
      if (deliverMode != Ci.nsIMsgCompDeliverMode.Now) {
        return;
      }
      let identity = MailServices.accounts.getIdentity(identityKey);
      if (identity.smtpServerKey) { // outgoing server was overridden
        return;
      }
      let incomingServer = MailServices.accounts.getAccount(accountKey).incomingServer;
      if (!gSchemeOptions.has(incomingServer.type)) {
        return;
      }
      let sentFolderSelection = gSchemeOptions.get(incomingServer.type).sentFolderSelection || "SameServer";
      /* fcc2 not supported yet */
      if (msgCompose.compFields.fcc && msgCompose.compFields.fcc2) {
        return;
      }
      if (msgCompose.compFields.fcc || msgCompose.compFields.fcc2) {
        let folder = MailServices.folderLookup.getFolderForURL(msgCompose.compFields.fcc || msgCompose.compFields.fcc2);
        if (folder.server != incomingServer || !folder.getStringProperty("FolderId")) {
          return;
        }
        if (sentFolderSelection == "SetByServer" && folder.getStringProperty("FolderType") != "SentMail") {
          return;
        }
      }
      /* XXX don't have a good way of getting the account from nsMsgSend */
      gSendProperties.incomingServer = incomingServer;
      msgCompose.messageSend = Cc["@mozilla.org/messenger/jasend;1"].createInstance(Ci.nsIMsgSend);
    }
  },
};
Services.obs.addObserver(gSendObserver, "mail-set-sender");

function ToMailboxObjects(aHeader)
{
  // parseEncodedHeader returns XPConnect objects but we want a plain JS object
  return MailServices.headerParser.parseEncodedHeader(aHeader, "UTF-8").map(({name, email}) => ({name, email}));
}

function ToEWSRecipients(aHeader)
{
  return MailServices.headerParser.parseEncodedHeader(aHeader, "UTF-8").map(({name, email}) => ({Name: name, EmailAddress: email}));
}

/// Object used by the jsaccount mechanism to create the component factory.
var gSendProperties = {
  baseContractID: "@mozilla.org/jacppsenddelegator;1",
  baseInterfaces: [
    Ci.nsISupportsWeakReference,
    Ci.nsIMsgOperationListener,
    Ci.nsIMsgSend,
    Ci.msgIOverride,
  ],
  contractID: "@mozilla.org/messenger/jasend;1",
  classDescription: "Send",
  classID: Components.ID("{893400ba-1b7a-411d-8535-07c8e284ebd8}"),
};

function Send(aDelegator, aBaseInterfaces) {
  this.delegator = Cu.getWeakReference(aDelegator);
  this.cppBase = aDelegator.cppBase;
  for (let i of aBaseInterfaces) {
    this.cppBase instanceof i;
  }
  // XXX TODO
}

Send.prototype = {
  _JsPrototypeToDelegate: true,
  /// nsISupports
  QueryInterface: ChromeUtils.generateQI(gSendProperties.baseInterfaces),
  /// nsIMsgSend
  gatherMimeAttachments: function() {
    // This causes the send process to be interrupted and call us back via
    // notifyListenerOnStopSending() below.
    this.cppBase.dontDeliver = true;
    this.cppBase.gatherMimeAttachments();
  },
  notifyListenerOnStopSending: async function(aMsgID, aStatus, aMsg, aFile) {
    if (!Components.isSuccessCode(aStatus)) {
      this.cppBase.notifyListenerOnStopSending(aMsgID, aStatus, aMsg, aFile);
      return;
    }
    let strongThis = this.delegator.get();
    let msgWindow = this.cppBase.getProgress().msgWindow;
    try {
      let incomingServer = gSendProperties.incomingServer;
      let compFields = this.cppBase.sendCompFields;
      try {
        let collectNewAddresses = Services.prefs.getBoolPref("mail.collect_email_address_outgoing");
        let addressCollector = Cc["@mozilla.org/addressbook/services/addressCollector;1"].getService(Ci.nsIAbAddressCollector);
        for (let field of ["to", "cc", "bcc"]) {
          addressCollector.collectAddress(compFields[field], collectNewAddresses, Ci.nsIAbPreferMailFormat.unknown);
        }
      } catch (ex) {
        ReportException(ex, msgWindow);
      }
      let content = await readFileAsync(aFile);
      let bcc = ToMailboxObjects(compFields.bcc);
      let deliveryReceipt = compFields.DSN;
      let message = await CallExtension(incomingServer, "ComposeMessageFromMime", { content, bcc, deliveryReceipt }, msgWindow);
      if (this.cppBase.sendReport) {
        this.cppBase.sendReport.currentProcess = Ci.nsIMsgSendReport.process_SMTP;
      }
      this.cppBase.notifyListenerOnStartSending(null, null);
      let sentFolder = null;
      let save = "";
      if (compFields.fcc) {
        sentFolder = MailServices.folderLookup.getFolderForURL(compFields.fcc);
        save = sentFolder.getStringProperty("FolderId");
      } else if (compFields.fcc2) {
        sentFolder = MailServices.folderLookup.getFolderForURL(compFields.fcc2);
        save = sentFolder.getStringProperty("FolderId");
      }
      await CallExtension(incomingServer, "SendMessage", { message, save }, msgWindow);
      this.cppBase.notifyListenerOnStopSending(null, Cr.NS_OK, null, null);
      // XXX TODO Update the Sent Items folder
      this.cppBase.notifyListenerOnStopCopy(Cr.NS_OK);
      if (!sentFolder) {
        sentFolder = incomingServer.rootFolder.getFolderWithFlags(Ci.nsMsgFolderFlags.SentMail);
      }
      if (sentFolder) {
        // Let's wait 5 seconds for the mail to reach the Sent folder.
        runLater(function() {
          // Don't pass in msgWindow, it's probably destroyed by now.
          sentFolder.updateFolder(null);
        }, logError, 5000);
      }
    } catch (ex) {
      ReportException(ex, msgWindow);
      this.cppBase.fail(Cr.NS_ERROR_FAILURE, ex.message);
      this.cppBase.notifyListenerOnStopSending(null, Cr.NS_ERROR_FAILURE, null, null);
    }
  },
  // XXX TODO
};

gSendProperties.factory = JSAccountUtils.jaFactory(gSendProperties, Send);
RegisterFactory(gSendProperties, true);
