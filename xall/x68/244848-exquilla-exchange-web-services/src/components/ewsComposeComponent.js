/*
 ***** BEGIN LICENSE BLOCK *****
 * This file is part of ExQuilla by Mesquilla.
 *
 * Copyright 2016 R. Kent James
 *
 * All Rights Reserved
 *
 * ***** END LICENSE BLOCK *****
 */

const { classes: Cc, Constructor: CC, interfaces: Ci, utils: Cu, Exception: CE, results: Cr, } = Components;
var { XPCOMUtils } = ChromeUtils.import("resource://gre/modules/XPCOMUtils.jsm");
ChromeUtils.defineModuleGetter(this, "JSAccountUtils", "resource://exquilla/JSAccountUtils.jsm");
ChromeUtils.defineModuleGetter(this, "MailServices",
  "resource:///modules/MailServices.jsm");
ChromeUtils.defineModuleGetter(this, "MailUtils",
  "resource:///modules/MailUtils.jsm");

ChromeUtils.defineModuleGetter(this, "JaBaseCompose",
                               "resource://exquilla/JaBaseCompose.jsm");

var _log = null;
ChromeUtils.defineModuleGetter(this, "Utils",
  "resource://exquilla/ewsUtils.jsm");
XPCOMUtils.defineLazyGetter(this, "log", () => {
  if (!_log) _log = Utils.configureLogging("compose");
  return _log;
});

// Extend the base properties.
EwsCompose.Properties = {
  __proto__: JaBaseCompose.Properties,

  // This contractID is tested, but in actual practice we use this
  // component to override the standard skink compose contractID
  // @mozilla.org/messengercompose/compose;1
  contractID: "@mesquilla.com/ewscompose;1",
  classID: Components.ID("{E5724CCB-9CC2-4030-88FC-37813137B8BA}"),

  // Add an additional interface only needed by this custom class.
  extraInterfaces: [],
}

// Main class.
var global = this;
function EwsCompose(aDelegator, aBaseInterfaces) {
  if (typeof (safeGetJS) == "undefined")
    Utils.importLocally(global);

  log.debug("New EwsCompose");
  // Superclass constructor
  JaBaseCompose.call(this, aDelegator, aBaseInterfaces);

  // instance variables
  this._from = null;
  // comma separated list of recipients
  this._mailbox = null;
  this._listener = null;
  this._deliverMode = 'SaveOnly';

}

// Extend the base class methods.
EwsCompose.prototype = {
  // Typical boilerplate to include in all implementations.
  __proto__: JaBaseCompose.prototype,

  // InterfaceRequestor override, needed if extraInterfaces.
  getInterface: function(iid) {
    for (let iface of EwsCompose.Properties.extraInterfaces) {
      if (iid.equals(iface)) {
        return this;
      }
    }
    return this.QueryInterface(iid);
  },

  // getters and setters
  set from(newval)              { this._from = newval; },
  get from()                    { return this._from; },
  set mailbox(newval)           { this._mailbox = newval; },
  get mailbox()                 { return this._mailbox; },
  set listener(newval)          { this._listener = newval; },
  get listener()                { return this._listener; },
  set deliverMode(newval)       { this._deliverMode = newval; },
  get deliverMode()             { return this._deliverMode; },
  set skinkCompose(newval)      { this._skinkCompose = newval;},
  get skinkCompose()            { return this._skinkCompose; },

  // nsIMsgCompose overrides
  CloseWindow(recycleIt)
  {
    // In order to prevent leaks, we need to remove the jsParent reference.
    log.debug("Closing compose window");
    try {
      this.cppBase.QueryInterface(Ci.nsIMsgCompose).CloseWindow(recycleIt);
    }
    catch (ex) {
      log.info("could not close compose window (expected in testing)");
    }
  },

  sendMsgToServer(msgType, identity, accountKey)
  {
    // Because we are overriding the send function for ALL sends, I am going to be
    //  cautious, and use the standard compose send method if anything fails
   try
   {
    log.config("sendMsgToServer");

    // Testing
    if (msgType >= 100)
    {
      log.warning("Testing ewsCompose");
      this.sendMsgToEwsServer(msgType, identity, accountKey, null);
      return;
    }
    // determine if we should use EWS sending or native SMTP sending
    /* currentAccountKey is unreliable
       (see https://bugzilla.mozilla.org/show_bug.cgi?id=449482#c16)
       so I have to decide whether to switch to ews processing depending on the
       destination of this message
    */
    let incomingServer = null;
    let destinationURI = null;
    if (accountKey && accountKey.length)
    {
      incomingServer = MailServices.accounts
                                   .getAccount(accountKey)
                                   .incomingServer;
    }
    else
    {
      if (msgType == Ci.nsIMsgCompDeliverMode.SaveAsDraft ||
          msgType == Ci.nsIMsgCompDeliverMode.AutoSaveAsDraft)
        destinationURI = identity.draftFolder;
      else if (msgType == Ci.nsIMsgCompDeliverMode.SaveAsTemplate)
        destinationURI = identity.stationeryFolder;
      if (destinationURI)
        log.config('destinationURI is ' + destinationURI);
    }

    if (!incomingServer && destinationURI)
    {
      let folder = MailUtils.getExistingFolder(destinationURI);
      if (folder)
        incomingServer = folder.server;
    }

    log.debug("identity.smtpServerKey is " + identity.smtpServerKey);

    // Normally these keys are for the smtp services, but keys for ews accounts are
    //  actually accountManager keys.
    let outgoing = null;
    if (identity.smtpServerKey)
    {
      try {
        outgoing = MailServices.accounts.getIncomingServer(identity.smtpServerKey);
      } catch (e) {}
    }
    let ewsServer = safeGetJS(outgoing, "EwsIncomingServer");
    if (ewsServer)
    {
      log.config("Should send using EWS");
      this.sendMsgToEwsServer(msgType, identity, accountKey, ewsServer.nativeMailbox);
      return;
    }
  } catch(e) {log.error(e);} // logs error without throwing, so falls through to normal send

  log.config("Sending using standard compose send");
  this.cppBase.QueryInterface(Ci.nsIMsgCompose)
              .sendMsgToServer(msgType, identity, accountKey);
  },

  // ews version of nsMsgCompose::Send
  sendMsgToEwsServer(deliverMode, identity, accountKey, mailbox)
  { try {

    log.config("Send EWS message to fullName: " + identity.fullName +
               " email: " + identity.email +
               " mode: " + deliverMode);

    // use the mesquilla extended nsMsgSend object
    let ewsSend = Cc["@mesquilla.com/ewssend;1"]
                    .createInstance(Ci.nsIMsgSend);

    // wrappedJSObject does not work in the delegator, so we
    // force access by defining interfaceRequestor as an extra
    // interface, which then calls into the js object.
    ewsSend = safeGetJS(ewsSend);
    this.messageSend = ewsSend.delegator;
    // FIXME: straighten out the definitions of all of these terms
    ewsSend.mailbox = mailbox;
    ewsSend.ewsCompose = this;

    if (deliverMode >= 100) { // testing
      deliverMode -= 100;
      ewsSend._isTesting = true;
    }

    let cppBase = this.cppBase;
    let baseMsgCompose = cppBase.QueryInterface(Ci.nsIMsgCompose);
    let compFields = baseMsgCompose.compFields;

    // clear saved message id if sending, so we don't send out the same message-id.
    if (deliverMode == Ci.nsIMsgCompDeliverMode.Now ||
        deliverMode == Ci.nsIMsgCompDeliverMode.Later ||
        deliverMode == Ci.nsIMsgCompDeliverMode.Background)
      compFields.messageId = "";

    if (!(compFields && identity))
     throw CE("missing compFields or identity", Cr.NS_ERROR_UNEXPECTED);

    let headerParser = Cc["@mozilla.org/messenger/headerparser;1"]
                         .getService(Ci.nsIMsgHeaderParser);
    let sender =  headerParser.makeMimeAddress(identity.fullName, identity.email);
    compFields.from = sender.length ? sender : identity.email;
    compFields.organization = identity.organization;

    // right now, AutoSaveAsDraft is identical to SaveAsDraft as
    // far as the msg send code is concerned. This way, we don't have
    // to add an nsMsgDeliverMode for autosaveasdraft, and add cases for
    // it in the msg send code.
    if (deliverMode == Ci.nsIMsgCompDeliverMode.AutoSaveAsDraft)
      deliverMode = Ci.nsIMsgCompDeliverMode.SaveAsDraft;

    let sendListener = this.getSendListener(deliverMode);
    if (cppBase.progress)
    {
      let progressListener = safeQueryInterface(sendListener, Ci.nsIWebProgressListener);
      if (progressListener)
        cppBase.progress.registerListener(progressListener);
    }

    // Prevent a crash from empty body, see bug 1377228. Can't be simply a blank because of a trim!
    let sendBody = cppBase.bodyRaw || "\n";
    ewsSend.createAndSendMessage(cppBase.composeHTML ? cppBase.editor : null, // nsIEditor
                                 identity,                // nsIMsgIdentity
                                 accountKey,
                                 compFields,              // nsIMsgCompFields
                                 false,                   // isDigest
                                 false,                   // dontDeliver
                                 deliverMode,             // nsMsgDeliverMode
                                 null,                    // msgToReplace
                                 cppBase.composeHTML ? "text/html" : "text/plain",
                                 sendBody,                // body ACString
                                 null,                    // nsIArray aAttachments
                                 null,                    // nsIArray aPreloadedAttachments
                                 cppBase.domWindow,       // nsIDOMWindow
                                 cppBase.progress,        // nsIMsgProgress
                                 sendListener,            // nsIMsgSendListener
                                 "",                      // password
                                 cppBase.originalMsgURI,
                                 cppBase.type             // MSG_ComposeType
                                 );
  } catch (e) {re(e);}},

  // former msqSgCompose::GetSendListener
  getSendListener(deliverMode)
  {
    // Create the listener for the send operation...
    let composeSendListener = Cc["@mozilla.org/messengercompose/composesendlistener;1"]
                                .createInstance(Ci.nsIMsgComposeSendListener);

    composeSendListener.setMsgCompose(this.delegator);
    composeSendListener.setDeliverMode(deliverMode);
    return composeSendListener.QueryInterface(Ci.nsIMsgSendListener);
  },
}

// Constructor
function EwsComposeConstructor() {
}

// Constructor prototype (not instance prototype).
EwsComposeConstructor.prototype = {
  classID: EwsCompose.Properties.classID,
  _xpcom_factory: JSAccountUtils.jaFactory(EwsCompose.Properties, EwsCompose),
}

var NSGetFactory = XPCOMUtils.generateNSGetFactory([EwsComposeConstructor]);
var EXPORTED_SYMBOLS = ["NSGetFactory"];
