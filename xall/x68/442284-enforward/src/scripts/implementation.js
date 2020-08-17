var {
  ExtensionCommon
} = ChromeUtils.import("resource://gre/modules/ExtensionCommon.jsm");

var {
  Services
} = ChromeUtils.import("resource://gre/modules/Services.jsm");

var {
  ExtensionParent
} = ChromeUtils.import("resource://gre/modules/ExtensionParent.jsm");
var extension = ExtensionParent.GlobalManager.getExtension("{C83FDE78-4980-4a97-B91A-47A4B98761A7}");

var {
  gENForwardUtils,
  gENFPreferences
} = ChromeUtils.import(extension.rootURI.resolve("modules/utils.jsm"));

var {
  toXPCOMArray,
  fixIterator
} = ChromeUtils.import("resource:///modules/iteratorUtils.jsm");

var {
  MsgHdrToMimeMessage
} = ChromeUtils.import("resource:///modules/gloda/MimeMessage.jsm");

var {
  MailUtils
} = ChromeUtils.import("resource:///modules/MailUtils.jsm");

var {
  MailServices
} = ChromeUtils.import("resource:///modules/MailServices.jsm");

//It is needed to new XMLSerializer in this Experiments scope
Components.utils.importGlobalProperties(["XMLSerializer"]);


//Define API
var enForwardApi = class extends ExtensionCommon.ExtensionAPI {
  getAPI(context) {
    context.callOnClose(this);

    return {
      enForwardApi: {
        init: async function () {
          let rw = Services.wm.getMostRecentWindow("mail:3pane");
          if (rw) {
            gENFPreferences.init();
            gENForward.init(rw);
          } else {
            console.log("[ENF] Cannot init gENForward.");
          }
        },

        forwardMessages: async function (isOnenote, isReminder) {
          gENForward.forwardSelectedMsgs(isOnenote, isReminder);
        },

        abortForward: async function () {
          gENForward.abortForward();
        },

        updateNoteInfo: async function (noteInfoConf, index) {
          gENForward.resumeFromBeforeSendEvent(noteInfoConf, index);
        },

        getNoteInfoForSelectedMessages: async function (onenote) {
          let remInfo = {
            enable: false,
            date: ""
          };
          let noteInfo = gENForward.getNoteInfoForSelectedMessages(onenote);
          return noteInfo;
        },

        setIntPref: async function (prefstr, value) {
          gENFPreferences.setIntPref(prefstr, value);
        },

        setBoolPref: async function (prefstr, value) {
          gENFPreferences.setBoolPref(prefstr, value);
        },

        setCharPref: async function (prefstr, value) {
          gENFPreferences.setUnicharPref(prefstr, value);
        },

        setMonitoredPrefs: async function (monitoredPrefs) {
          gENFPreferences.setMonitoredPrefs(monitoredPrefs);
        },

        onBeforeSend: new ExtensionCommon.EventManager({
          context,
          name: "enForwardApi.onBeforeSend",
          register(fire) {
            gENForward.registerListener("beforesend", fire);

            return function () {
              gENForward.removeListener("beforesend");
            };
          }
        }).api(),

        onSendComplete: new ExtensionCommon.EventManager({
          context,
          name: "enForwardApi.onSendComplete",
          register(fire) {
            gENForward.registerListener("sendcomplete", fire);

            return function () {
              gENForward.removeListener("sendcomplete");
            };
          }
        }).api(),

        onPrefChanged: new ExtensionCommon.EventManager({
          context,
          name: "enForwardApi.onPrefChanged",
          register(fire) {
            gENFPreferences.registerListener("prefchanged", fire);

            return function () {
              gENFPreferences.removeListener("prefchanged");
            };
          }
        }).api()
      }
    };
  }

  close() {
    gENForward.finalize();
    Cu.unload(extension.rootURI.resolve("modules/utils.jsm"));
    Services.obs.notifyObservers(null, "startupcache-invalidate", null);
  }
};


var gENForward = {
  email: null,
  msgCompFields: null,
  msgSend: null,
  mimeConverter: null,
  dirService: null,
  tagService: null,
  accountManager: null,
  hdrParser: null,
  mailSession: null,
  smtpService: null,
  noteInfo: null,
  id: null,
  isGmailIMAP: false,
  account: null,
  accountName: "",
  totalMsgs: 0,
  sentMsgs: 0,
  locked: false,
  filterAttachWS: {},
  wrapLength: 0,
  requests: [],
  window: null,
  callbacks: [],

  registerListener: function (eventName, fire) {
    this.callbacks[eventName] = fire;
  },

  removeListener: function (eventName) {
    this.callbacks[eventName] = undefined;
  },

  getNoteInfoForSelectedMessages: function (onenote) {
    var remInfo = {
      enable: false,
      date: ""
    };
    var noteInfo = gENForward.createNoteInfo(this.window.gFolderDisplay.selectedMessages, false, remInfo, onenote);
    var noteInfoConf = [];
    for (var i = 0; i < noteInfo.length; i++) {
      var info = noteInfo[i];
      var infoConf = {
        title: info.title,
        notebook: info.notebook,
        tags: info.tags,
        append: info.append,
        reminder: info.reminder,
        reminderDate: info.reminderDate,
        canceled: info.canceled,
        onenote: info.onenote
      };
      noteInfoConf.push(infoConf);
    }

    return noteInfoConf;
  },

  fireBeforeSendEvent: function (req, index) {
    if (this.callbacks["beforesend"]) {
      var noteInfo = req.noteInfo;
      var noteInfoConf = [];
      for (var i = 0; i < noteInfo.length; i++) {
        var info = noteInfo[i];
        var infoConf = {
          title: info.title,
          notebook: info.notebook,
          tags: info.tags,
          append: info.append,
          reminder: info.reminder,
          reminderDate: info.reminderDate,
          canceled: info.canceled,
          onenote: info.onenote
        };
        noteInfoConf.push(infoConf);
      }
      this.callbacks["beforesend"].async(noteInfoConf, index);
    } else {
      this.resumeFromBeforeSendEvent(req.noteInfo, index);
    }
  },

  fireSendCompleteEvent: function (succeeded, sentNum, totalNum) {
    if (this.callbacks["sendcomplete"]) {
      this.callbacks["sendcomplete"].async(succeeded, sentNum, totalNum);
    }
  },

  resumeFromBeforeSendEvent: function (noteInfoConf, index) {
    var req = this.requests[index];
    var noteInfo = req.noteInfo;
    var cnt = 0;
    for (var i = 0; i < noteInfo.length; i++) {
      var info = noteInfo[i];
      info.title = noteInfoConf[i].title;
      info.notebook = noteInfoConf[i].notebook;
      info.tags = noteInfoConf[i].tags;
      info.append = noteInfoConf[i].append;
      info.reminder = noteInfoConf[i].reminder;
      info.reminderDate = noteInfoConf[i].reminderDate;
      info.canceled = noteInfoConf[i].canceled;
      info.onenote = noteInfoConf[i].onenote;
      if (!info.canceled) cnt++;
    }
    req.totalMsgs = cnt;
    this.doNextRequest();
  },

  init: function (aWindow) {
    this.window = aWindow;
    this.mimeConverter = Components.classes["@mozilla.org/messenger/mimeconverter;1"]
      .getService(Components.interfaces.nsIMimeConverter);
    this.dirService = Components.classes["@mozilla.org/file/directory_service;1"]
      .getService(Components.interfaces.nsIProperties);
    this.tagService = Components.classes["@mozilla.org/messenger/tagservice;1"]
      .getService(Components.interfaces.nsIMsgTagService);
    this.accountManager = Components.classes["@mozilla.org/messenger/account-manager;1"]
      .getService(Components.interfaces.nsIMsgAccountManager);
    this.hdrParser = Components.classes["@mozilla.org/messenger/headerparser;1"]
      .getService(Components.interfaces.nsIMsgHeaderParser);
    this.mailSession = Components.classes["@mozilla.org/messenger/services/session;1"]
      .getService(Components.interfaces.nsIMsgMailSession);
    this.smtpService = Components.classes["@mozilla.org/messengercompose/smtp;1"]
      .getService(Components.interfaces.nsISmtpService);

    if (this.window) {
      var that = this;
      var filterFunc = {
        id: "{C83FDE78-4980-4a97-B91A-47A4B98761A7}",
        name: "Forward to Evernote",

        apply: function (aMsgHdrs, aActionValue, aListener, aType, aMsgWindow) {
          var msgs = [];
          for (var x of fixIterator(aMsgHdrs, Components.interfaces.nsIMsgDBHdr)) {
            msgs.push(x);
          }
          that.forwardMsgsByFilter(msgs);
        },

        isValidForType: function (type, scope) {
          return true;
        },

        validateActionValue: function (value, folder, type) {
          return null;
        },

        allowDuplicates: false,
        needsBody: true
      };

      var filterFuncON = {
        id: "{C83FDE78-4980-4a97-B91A-47A4B98761A7-ON}",
        name: "Forward to " + gENFPreferences.copyUnicharPref("onenote_service_name", "OneNote"),

        apply: function (aMsgHdrs, aActionValue, aListener, aType, aMsgWindow) {
          var msgs = [];
          for (var x of fixIterator(aMsgHdrs, Components.interfaces.nsIMsgDBHdr)) {
            msgs.push(x);
          }
          that.forwardMsgsByFilterON(msgs);
        },

        isValidForType: function (type, scope) {
          return true;
        },

        validateActionValue: function (value, folder, type) {
          return null;
        },

        allowDuplicates: false,
        needsBody: true
      };

      var filterService = Components.classes["@mozilla.org/messenger/services/filters;1"]
        .getService(Components.interfaces.nsIMsgFilterService);
      filterService.addCustomAction(filterFunc);
      filterService.addCustomAction(filterFuncON);
    }
  },


  finalize: function () {
    var tmpDir = this.dirService.get("TmpD", Components.interfaces.nsIFile);
    tmpDir.append("EnForward");
    try {
      tmpDir.remove(true);
    } catch (e) {}
  },

  emptyQueue: function () {
    this.noteInfo = [];
    this.requests = [];
  },

  selectionToHTML: function () {
    var sel = this.window.GetMessagePaneFrame().getSelection();
    var selCnt = sel ? sel.rangeCount : 0;

    if (selCnt < 1) {
      return "";
    }

    var xmlStr = "";
    var xmlSerializer = new XMLSerializer();
    for (var i = 0; i < selCnt; i++) {
      var snode = sel.getRangeAt(i).cloneContents();
      xmlStr += "<p>" + xmlSerializer.serializeToString(snode) + "</p>";
    }

    if (!/<br/ig.test(xmlStr)) xmlStr = xmlStr.replace(/\n/g, "<br/>");
    var ret = '<!DOCTYPE HTML PUBLIC "-//W3C//DTD HTML 4.01 Transitional//EN">' +
      '<head>' +
      '<meta http-equiv="content-type" content="text/html;charset=UTF-8">' +
      '</head>' +
      '<body><div>' +
      xmlStr +
      '</div></body>' +
      '</html>'
    return ret;
  },

  confirmENEmail: function () {
    this.email = gENFPreferences.copyUnicharPref("email", "");
    if (!this.email) {
      this.window.alert("Please input your Evernote email address in EnForward settings.");
      
      //Notify error to MX.
      this.window.document.getElementById("statusText").setAttribute("value", "No Evernote email address. Canceled.");
      this.fireSendCompleteEvent(false, 0, 0);
      return false;
    }

    return true;
  },

  forwardMsgsByFilterON: function (msgs) {
    this.forwardMsgsByFilter(msgs, true);
  },

  forwardMsgsByFilter: function (msgs, onenote) {
    var req = {
      account: null,
      accountName: null,
      id: null,
      noteInfo: null,
      isGmailIMAP: false,
      onenote: onenote,
      totalMsgs: 0
    };

    if (!this.fillAccountInfo(msgs[0].folder.rootFolder.server, req, onenote)) {
      //Nnotify error to MX.
      this.fireSendCompleteEvent(false, 0, 0);
      return;
    }

    req.noteInfo = this.createNoteInfo(msgs, false, {
      date: "",
      enable: false
    }, onenote);
    req.totalMsgs = req.noteInfo.length;

    this.registerRequest(req);
    this.doNextRequest();
  },

  forwardSelectedMsgsON: function () {
    this.forwardSelectedMsgs(true);
  },

  forwardSelectedMsgs: function (onenote, reminder) {
    if (this.window.gFolderDisplay.selectedMessages.length == 0) {
      this.window.document.getElementById("statusText").setAttribute("value", "No messages are selected. Canceled.");
      //notify error to MX.
      this.fireSendCompleteEvent(false, 0, 0);
      return;
    }

    var req = {
      account: null,
      accountName: null,
      id: null,
      noteInfo: null,
      isGmailIMAP: false,
      onenote: onenote,
      totalMsgs: 0
    };

    var remInfo = {
      enable: reminder,
      date: ""
    };
    req.noteInfo = this.createNoteInfo(this.window.gFolderDisplay.selectedMessages, false, remInfo, onenote);

    req.totalMsgs = req.noteInfo.length;
    if (req.totalMsgs > 0) {
      req.noteInfo[0].selection = this.selectionToHTML();
    }

    var index = this.registerRequest(req);
    this.fireBeforeSendEvent(req, index);
    //this.doNextRequest();
  },

  fillAccountInfo: function (server, req, onenote) {
    var idPref = onenote ? gENFPreferences.copyUnicharPref("onenote_forward_id", "/") :
      gENFPreferences.copyUnicharPref("forward_id", "auto");
    req.accountName = server.prettyName ? server.prettyName : "";

    if (idPref != "auto") {
      var accAndId = idPref.split("/");
      if (accAndId[0] && accAndId[1]) {
        req.account = this.accountManager.getAccount(accAndId[0]);
        req.id = this.accountManager.getIdentity(accAndId[1]);
      } else { //pref error
        req.account = "";
        req.id = "";
      }
    } else if (server && (server.type == "imap" || server.type == "pop3")) { //auto
      //Return value of getIdentityForServer is changed to array from TB78
      //req.id = MailUtils.getIdentityForServer(server);
      req.id = MailUtils.getIdentityForServer(server)[0];
      req.account = this.accountManager.FindAccountForServer(server);
    } else { //use default identity
      req.id = this.accountManager.defaultAccount.defaultIdentity;
      req.account = this.accountManager.defaultAccount;
    }

    if (!req.id) {
      this.window.document.getElementById("statusText").setAttribute("value", "Could not find outgoing server setting.");
      return false;
    }

    req.isGmailIMAP = server && server.type == "imap" && this.isGmailSMTPServer(req.id);

    return true;
  },

  registerRequest: function (req) {
    this.requests.push(req);
    return this.requests.length - 1;
  },

  doNextRequest: function () {
    if (this.locked) return;

    var req = this.requests.shift();
    if (!req) return;

    if (req.onenote) {
      this.email = gENFPreferences.copyUnicharPref("onenote_email", "me@onenote.com");
    } else if (!this.confirmENEmail()) {
      this.emptyQueue();
      this.fireSendCompleteEvent(false, 0, 0);
      return;
    }

    this.isGmailIMAP = req.isGmailIMAP;
    this.totalMsgs = req.totalMsgs;
    this.sentMsgs = 0;
    this.noteInfo = req.noteInfo;
    //Use default 72
    //this.wrapLength = gENFPreferences.getIntPref("mailnews.wraplength", 72);
    this.wrapLength = 72;
    this.window.document.getElementById("statusText").setAttribute("value", "");
    this.forwardNextMsg();
  },

  forwardNextMsg: function () {
    var info = this.noteInfo.shift();
    if (info) {
      if (info.canceled) {
        this.forwardNextMsg();
      } else {
        try {
          var req = {};
          var server = info.msgHdr.folder.rootFolder.server;
          if (this.fillAccountInfo(server, req, info.onenote)) {
            this.account = req.account;
            this.accountName = req.accountName;
            this.id = req.id;
            this.forwardMsg(info);
          } else {
            console.log("Goto next\n")
            this.forwardNextMsg();
          }
        } catch (e) {
          console.log("[ENF]Error in forwarding:\n")
          console.log(e + "\n");
          console.log("Goto next\n")
          this.forwardNextMsg();
        }
      }
    } else {
      this.doNextRequest();
    }
  },

  createNoteInfo: function (selectedMsgs, append, reminder, onenote) {
    var noteInfo = [];
    var titlePref = onenote ? gENFPreferences.copyUnicharPref("onenote_title", "%S") :
      gENFPreferences.copyUnicharPref("title", "%S");
    var notebookPref = onenote ? "" :
      gENFPreferences.copyUnicharPref("notebook", "");
    var defaultTagsPref = onenote ? "" :
      gENFPreferences.copyUnicharPref("tags", "");
    if (!onenote && gENFPreferences.getBoolPref("use_folder_name", false)) { //old pref
      notebookPref = "%F";
    }
    var len = selectedMsgs.length;
    for (var i = 0; i < len; i++) {
      var msgHdr = selectedMsgs[i];
      var defaultTags = "";
      var tags = !onenote && gENFPreferences.getBoolPref("add_msg_tags", false) ? this.getTagsForMsg(msgHdr) : [];
      if (defaultTagsPref) {
        defaultTags = this.expandMetaCharacters(defaultTagsPref, msgHdr, true, onenote);
        tags = tags.concat(defaultTags.split(/\s*,\s*/));
      }

      var title = this.expandMetaCharacters(titlePref, msgHdr, true, onenote);
      var notebook = this.expandMetaCharacters(notebookPref, msgHdr, true, onenote);
      var info = {
        msgHdr: msgHdr,
        title: title,
        mimeEncodedTitle: "",
        notebook: notebook,
        tags: tags,
        append: append,
        reminder: reminder.enable,
        reminderDate: reminder.date,
        delAttachments: [],
        fwdAttachments: [],
        selection: "",
        onenote: onenote,
        canceled: false
      };

      noteInfo.push(info);
    }

    return noteInfo;
  },

  isGmailSMTPServer: function (id) {
    var smtpServerKey = id.smtpServerKey ? id.smtpServerKey : this.smtpService.defaultServer.key;
    //Get hostname without legacy pref
    //    var hostname = gENFPreferences.copyUnicharPref("mail.smtpserver." + smtpServerKey + ".hostname", "");
    var server = MailServices.smtp.getServerByKey(smtpServerKey);
    var hostname = server.hostname;
    return hostname == "smtp.gmail.com" || hostname == "smtp.googlemail.com";
  },

  forwardMsg: function (info) {
    var msgHdr = info.msgHdr;

    if (info.onenote || gENForwardUtils.checkLimitExpires() || gENForwardUtils.checkSentTimes()) {
      this.msgCompFields = Components.classes["@mozilla.org/messengercompose/composefields;1"]
        .createInstance(Components.interfaces.nsIMsgCompFields);
      this.msgCompFields.from = this.id.email;
      this.msgCompFields.to = this.email;

      var saveSentPref = info.onenote ? "onenote_save_sent" : "save_sent";
      if (!gENFPreferences.getBoolPref(saveSentPref, true) || this.isGmailIMAP) {
        this.msgCompFields.fcc = "nocopy://";
        this.msgCompFields.fcc2 = "nocopy://";
      }

      var noteStr = info.notebook ? "@" + info.notebook : "";
      var tagsStr = info.tags && info.tags.length > 0 ? this.getTagsString(info.tags) : "";
      var remStr = info.reminder ? "!" + info.reminderDate : ""

      var subject = info.title;
      if (info.append) {
        subject = subject + " " + "+";
      } else {
        subject = subject + " " + remStr + " " + noteStr + tagsStr;
      }

      var mimeEncodedSubject = this.encode(subject, 9, 72, null);
      info.mimeEncodedTitle = mimeEncodedSubject;
      this.msgCompFields.subject = mimeEncodedSubject;
      try {
        this.listAttachmentsAndFwd(info);
      } catch (e) {
        console.log(e);
      }
      return true;
    } else { //sent times error
      this.window.document.getElementById("statusText").setAttribute("value", "You cannot send note anymore today. Canceled.");
      this.emptyQueue();
      this.fireSendCompleteEvent(false, 0, 0);
      return false;
    }
  },

  getTagsForMsg: function (msgHdr) {
    var curKeys = msgHdr.getStringProperty("keywords");
    var ignoredTags = gENFPreferences.copyUnicharPref("ignored_tags", "").split(" ");

    if (msgHdr.label) {
      curKeys += " $label" + msgHdr.label;
    }
    var keys = curKeys ? curKeys.split(" ") : [];
    var tags = [];
    var len = keys.length;
    for (var i = 0; i < len; i++) {
      var key = keys[i];
      var tagName = "";
      try {
        tagName = this.tagService.getTagForKey(key);
      } catch (e) {
        tagName = null;
        console.log("Unknow tag key: " + key + "\n");
      }
      if (tagName && ignoredTags.indexOf(key) < 0) {
        tags.push(tagName);
      }
    }

    return tags;
  },

  encode: function (str, offset, len, charset) {
    if (!charset) charset = "UTF-8";
    var estr = this.mimeConverter.encodeMimePartIIStr_UTF8(str, false, charset, offset, len);
    return estr;
  },

  decode: function (str) {
    return this.mimeConverter.decodeMimeHeader(str, null, false, true);
  },

  saveSentDone: function () {
    var sent = 0;
    if (gENForwardUtils.checkLimitExpires(true)) {
      sent = 1;
      var date = gENForwardUtils.localDateToEnDate(new Date());
      var today = date.getFullYear() + "-" + (date.getMonth() + 1) + "-" + date.getDate();
      gENFPreferences.setUnicharPref("sent_date", today);
    } else {
      sent = gENFPreferences.getIntPref("sent_times", 0) + 1;
    }
    gENFPreferences.setIntPref("sent_times", sent);
  },

  getTagsString: function (tags) {
    var len = tags.length;
    var str = "";
    for (var i = 0; i < len; i++) {
      if (tags[i]) str = str + " #" + tags[i];
    }

    return str;
  },

  createHeaderString: function (info) {
    var id = (new Date()).valueOf();
    var messageId = id + "." + this.msgCompFields.from;
    var boundary = "--------------ENF" + id;
    var str = "Message-ID: " + messageId + "\r\n" +
      "Date: " + (new Date()).toString() + "\r\n" +
      "From: " + this.msgCompFields.from + "\r\n" +
      "MIME-Version: 1.0\r\n" +
      "To: " + this.msgCompFields.to + "\r\n" +
      "Subject: " + info.mimeEncodedTitle + "\r\n" +
      "Content-Type: multipart/mixed;\r\n" +
      ' boundary="' + boundary + '"' + "\r\n" +
      "\r\n" +
      "This is a multi-part message in MIME format.\r\n"
    return [str, boundary];
  },

  composeAsAttachment: function (info) {
    var msgHdr = info.msgHdr;
    var uri = msgHdr.folder.getUriForMsg(msgHdr);
    var msgFile = this.createTempFile();

    var messageService = this.window.messenger.messageServiceFromURI(uri);
    var messageStream = Components.classes["@mozilla.org/network/sync-stream-listener;1"].
    createInstance().QueryInterface(Components.interfaces.nsIInputStream);
    var inputStream = Components.classes["@mozilla.org/scriptableinputstream;1"].
    createInstance().QueryInterface(Components.interfaces.nsIScriptableInputStream);

    var os = Components.classes['@mozilla.org/network/file-output-stream;1'].
    createInstance(Components.interfaces.nsIFileOutputStream);
    os.init(msgFile, 2, 0x200, false); // open as "write only"

    var mailHdr = this.createHeaderString(info);
    os.write(mailHdr[0], mailHdr[0].length);

    //Empty body
    var bodyStr = "--" + mailHdr[1] + "\r\n" //boundary
      +
      "Content-Type: text/plain; charset=UTF-8\r\n" +
      "Content-Transfer-Encoding: 8bit\r\n\r\n";
    os.write(bodyStr, bodyStr.length);

    //Header text
    if (gENFPreferences.getBoolPref("add_header", false)) {
      var escape = !gENFPreferences.getBoolPref("header_use_html", false);
      var tmpFileStr = gENFPreferences.copyUnicharPref("header_text", "")
      var tmpHTMLStr = this.text2html(tmpFileStr, escape);
      var hdrBodyStr = this.expandMetaCharacters(tmpHTMLStr,
        msgHdr, false, info.fwdAttachments, info.delAttachments, true, info.onenote);

      if (hdrBodyStr.length > 0) {
        var hdrStr = "--" + mailHdr[1] + "\r\n" //boundary
          +
          "Content-Type: text/html; charset=UTF-8;\r\n" +
          ' name="ENFHeader.html"' + "\r\n" +
          "Content-Transfer-Encoding: base64\r\n" +
          "Content-Disposition: attachment;\r\n" +
          ' filename="ENFHeader.html"' + "\r\n" +
          "\r\n";
        os.write(hdrStr, hdrStr.length);
        hdrBodyStr = this.utf8ToBase64(hdrBodyStr);
        os.write(hdrBodyStr, hdrBodyStr.length);
      }
    }

    //Message to be forwarded
    if (info.selection) {
      var msgHdrStr = "\r\n" + "--" + mailHdr[1] + "\r\n" //boundary
        +
        "Content-Type: text/html; charset=UTF-8;\r\n" +
        ' name="ENFMessage.html"' + "\r\n" +
        "Content-Transfer-Encoding: base64\r\n" +
        "Content-Disposition: attachment;\r\n" +
        ' filename="ENFMessage.html"' + "\r\n" +
        "\r\n";
      os.write(msgHdrStr, msgHdrStr.length);
      var selStr = this.utf8ToBase64(info.selection);
      os.write(selStr, selStr.length);
    } else {
      var msgHdrStr = "\r\n" + "--" + mailHdr[1] + "\r\n" //boundary
        +
        "Content-Type: message/rfc822;\r\n" +
        ' name="ENFMessage.eml"' + "\r\n" +
        "Content-Transfer-Encoding: 8bit\r\n" +
        "Content-Disposition: attachment;\r\n" +
        ' filename="ENFMessage.eml"' + "\r\n" +
        "\r\n";
      os.write(msgHdrStr, msgHdrStr.length);
      inputStream.init(messageStream);
      messageService.streamMessage(uri, messageStream, this.window.msgWindow, null, false, null);
      if (!inputStream.available()) {
        messageStream.close();
        inputStream.close();
        os.close();
        alert("Cannot load message file.");
        return;
      }

      this.initFilterAttachWS();

      //check delAttachments is empty or not
      var filter = false;
      var key = "";
      for (key in info.delAttachments) {
        filter = true;
        break;
      }

      while (inputStream.available()) {
        var readData = inputStream.read(512);
        this.filterAndWrite(os, readData, info, filter);
      }

      //flush
      if (filter) {
        this.filterAndWrite(os, "", info, filter);
      }
      messageStream.close();
      inputStream.close();
    }
    //Footer text
    if (gENFPreferences.getBoolPref("add_footer", false)) {
      var escape = !gENFPreferences.getBoolPref("footer_use_html", false);
      var tmpFileStr = gENFPreferences.copyUnicharPref("footer_text", "")
      var ftrBodyStr = this.expandMetaCharacters(this.text2html(tmpFileStr, escape),
        msgHdr, false, info.fwdAttachments, info.delAttachments, true, info.onenote);
      if (ftrBodyStr.length > 0) {
        var ftrStr = "\r\n" + "--" + mailHdr[1] + "\r\n" //boundary
          +
          "Content-Type: text/html; charset=UTF-8;\r\n" +
          ' name="ENFFooter.html"' + "\r\n" +
          "Content-Transfer-Encoding: base64\r\n" +
          "Content-Disposition: attachment;\r\n" +
          ' filename="ENFFooter.html"' + "\r\n" +
          "\r\n";
        os.write(ftrStr, ftrStr.length);
        ftrBodyStr = this.utf8ToBase64(ftrBodyStr);
        os.write(ftrBodyStr, ftrBodyStr.length);
      }
    }

    var endLine = "\r\n" + "--" + mailHdr[1] + "--\r\n";
    os.write(endLine, endLine.length);
    os.close();

    return msgFile;
  },

  composeAsInline: function (info) {
    var msgHdr = info.msgHdr;
    var uri = msgHdr.folder.getUriForMsg(msgHdr);
    var msgFile = this.createTempFile();

    var messageService = this.window.messenger.messageServiceFromURI(uri);
    var messageStream = Components.classes["@mozilla.org/network/sync-stream-listener;1"].
    createInstance().QueryInterface(Components.interfaces.nsIInputStream);
    var inputStream = Components.classes["@mozilla.org/scriptableinputstream;1"].
    createInstance().QueryInterface(Components.interfaces.nsIScriptableInputStream);
    inputStream.init(messageStream);
    messageService.streamMessage(uri, messageStream, this.window.msgWindow, null, false, null);
    var os = Components.classes['@mozilla.org/network/file-output-stream;1'].
    createInstance(Components.interfaces.nsIFileOutputStream);
    os.init(msgFile, 2, 0x200, false); // open as "write only"

    var data = "";
    var eohInfo = null;

    //setup attachments filter
    //check delAttachments is empty or not
    var filter = false;
    var key = "";
    for (key in info.delAttachments) {
      filter = true;
      break;
    }
    this.initFilterAttachWS();

    while (inputStream.available()) {
      data += inputStream.read(512);
      if (!eohInfo) {
        eohInfo = this.findEndOfHeader(data);
        if (!eohInfo) continue; //loop while end of header(\r\n\r\n) is found

        var hdr = data.substring(0, eohInfo.index - (eohInfo.retcode.length * 2)).split(eohInfo.retcode);
        if (data.length > eohInfo.index) data = data.substring(eohInfo.index, data.length);
        else data = "";

        var line = "";
        var ignored = false;
        var writeFrom = false;
        var writeTo = false;
        while (line = hdr.shift()) {
          if ((ignored && /^\s+/.test(line))) continue;
          if (ignored = this.isIgnoredHdr(line)) continue;
          if (/^from:/i.test(line)) {
            line = "From: " + this.msgCompFields.from;
            writeFrom = true;
            ignored = true;
          } else if (/^to:/i.test(line)) {
            line = "To: " + this.msgCompFields.to;
            writeTo = true;
            ignored = true;
          } else if (/^subject:/i.test(line)) {
            line = "Subject: " + info.mimeEncodedTitle;
            ignored = true;
          }

          //write line
          line = hdr.length > 0 ? line + "\r\n" : line;
          this.filterAndWrite(os, line, info, filter);
        }
        if (!writeFrom) {
          line = "\r\n" + "From: " + this.msgCompFields.from;
          this.filterAndWrite(os, line, info, filter);
        }
        if (!writeTo) {
          line = "\r\n" + "To: " + this.msgCompFields.to;
          this.filterAndWrite(os, line, info, filter);
        }

        line = "\r\n\r\n";
        this.filterAndWrite(os, line + data, info, filter);
        data = "";
      } else { //now in the message body
        this.filterAndWrite(os, data, info, filter);
        data = "";
      }
    }

    //flush attachments filter
    if (filter) {
      this.filterAndWrite(os, "", info, filter);
    }

    messageStream.close();
    inputStream.close();
    os.close();

    return msgFile;
  },

  filterAndWrite: function (os, data, info, filter) {
    var writeData = this.filterAttachments(data, info, filter);
    if (writeData) os.write(writeData, writeData.length);
  },

  isIgnoredHdr: function (line) {
    var ignored = /^>*from \S+ /i.test(line) ||
      /^bcc: /i.test(line) ||
      /^cc: /i.test(line) ||
      /^fcc: /i.test(line) ||
      /^content-length: /i.test(line) ||
      /^lines: /i.test(line) ||
      /^status: /i.test(line) ||
      /^x-.+: /i.test(line) ||
      /^return-path: /i.test(line) ||
      /^delivered-to: /i.test(line) ||
      /^authentication-results: /i.test(line) ||
      /^message-id: /i.test(line) ||
      /^(?:in-)*reply-to: /i.test(line) ||
      /^bounce-to: /i.test(line) ||
      /^DKIM-Signature: /i.test(line) ||
      /^DomainKey-Signature: /i.test(line) ||
      /^received(?:-.+)*: /i.test(line);

    return ignored;
  },

  findEndOfHeader: function (data) {
    var candidates = ["\r\n", "\n\r", "\n", "\r"];
    var headerEnd = -1;
    var ret = null;
    for (var i = 0; i < candidates.length; i++) {
      var candidate = candidates[i];
      headerEnd = data.indexOf(candidate + candidate);
      if (headerEnd != -1) {
        ret = {
          index: headerEnd + (candidate.length * 2),
          retcode: candidate
        };
        break;
      }
    }

    return ret;
  },

  sendMsgFile: function (info) {
    var msgHdr = info.msgHdr;
    var msgFile = null;
    var appName = info.onenote ? "OneNote" : "Evernote";
    if (!info.onenote && gENFPreferences.getIntPref("forward_mode", 0) == 0) {
      console.log("[ENF] Forward by Attachment mode\n");
      msgFile = this.composeAsAttachment(info);
    } else {
      console.log("[ENF] Forward by Inline mode\n");
      msgFile = this.composeAsInline(info);
    }

    var previewMode = gENFPreferences.getBoolPref("preview_mode", false);

    this.msgSend = Components.classes["@mozilla.org/messengercompose/send;1"]
      .createInstance(Components.interfaces.nsIMsgSend);

    var that = this;
    //nsIMsgSendListener
    var sendListener = {
      QueryInterface: function (iid) {
        if (iid.equals(Components.interfaces.nsIMsgSendListener) ||
          iid.equals(Components.interfaces.nsISupportsWeakReference) ||
          iid.equals(Components.interfaces.nsISupports)) return this;
        else throw Components.results.NS_NOINTERFACE;
      },
      onStartSending: function (aMsgID, aMsgSize) {
        that.sentMsgs += 1;
        that.window.document.getElementById("statusText").setAttribute("value", "Sending note to " + appName + " ... " + "[" + that.sentMsgs + "/" + that.totalMsgs + "]");
      },

      onProgress: function (aMsgID, aProgress, aProgressMax) {},

      onStatus: function (aMsgID, aMsg) {},

      onStopSending: function (aMsgID, aStatus, aMsg, returnFileSpec) {
        console.log("Sending complete");
        if (that.statusInterval) that.window.clearInterval(that.statusInterval);
        var succeeded = false;
        if (aStatus) { //error
          succeeded = false;
          that.window.document.getElementById("statusText").setAttribute("value", "Failed to send note.");
        } else {
          succeeded = true;
          that.window.document.getElementById("statusText").setAttribute("value", "Forwarding to " + appName + " ... done.");
          if (!info.onenote) that.saveSentDone();
          var markFwdPref = info.onenote ? "onenote_mark_as_forwarded" : "mark_as_forwarded"
          if (gENFPreferences.getBoolPref(markFwdPref, true)) {
            msgHdr.flags = msgHdr.flags | Components.interfaces.nsMsgMessageFlags.Forwarded;
          }
        }

        //Notify to MX script
        that.fireSendCompleteEvent(succeeded, that.sentMsgs, that.totalMsgs);
        
        //Add/remove tag
        var postTagsPref = info.onenote ? "onenote_post_tags" : "post_tags"
        var tags = gENFPreferences.copyUnicharPref(postTagsPref, "");
        if (tags) that.toggleMessageTags(msgHdr, tags, true);

        var postTagsRmPref = info.onenote ? "onenote_post_tags_rm" : "post_tags_rm"
        var rmtags = gENFPreferences.copyUnicharPref(postTagsRmPref, "");
        if (rmtags) that.toggleMessageTags(msgHdr, rmtags, false);

        var delOrgPref = info.onenote ? "onenote_del_org_msg" : "del_org_msg";
        if (gENFPreferences.getBoolPref(delOrgPref, false)) {
          that.deleteOriginalMessage(msgHdr);
        }

        //do next
        var sendIntPref = info.onenote ? "onenote_send_interval" : "send_interval"
        var waitSec = gENFPreferences.getIntPref(sendIntPref, 1);
        if (that.sentMsgs != that.totalMsgs) {
          if (waitSec > 0) {
            that.window.document.getElementById("statusText").setAttribute("value", "Waiting " + waitSec + " seconds ...");
          } else {
            waitSec = 1;
          }
          that.window.setTimeout(
            function () {
              that.forwardNextMsg();
            },
            waitSec * 1000
          );
        } else {
          that.window.setTimeout(
            function () {
              that.locked = false;
              that.forwardNextMsg();
            },
            waitSec * 1000
          );
        }
      },

      onGetDraftFolderURI: function (aFolderURI) {},

      onSendNotPerformed: function (aMsgID, aStatus) {}
    };

    //nsIMsgStatusFeedback and nsIWebProgressListener
    var feedback = {
      QueryInterface: function (iid) {
        if (iid.equals(Components.interfaces.nsIMsgStatusFeedback) ||
          iid.equals(Components.interfaces.nsIWebProgressListener) ||
          iid.equals(Components.interfaces.nsISupportsWeakReference) ||
          iid.equals(Components.interfaces.nsISupports)) return this;
        else throw Components.results.NS_NOINTERFACE;
      },

      //nsIMsgStatusFeedback
      showStatusString: function (statusText) {
        that.window.document.getElementById("statusText").setAttribute("value", statusText + "[" + that.sentMsgs + "/" + that.totalMsgs + "]");
      },

      startMeteors: function () {},

      stopMeteors: function () {},

      showProgress: function (percentage) {},

      setStatusString: function (aStatus) {},

      setWrappedStatusFeedback: function (aStatusFeedback) {},

      //nsIWebProgressListener
      onStateChange: function (aWebProgress, aRequest, aStateFlags, aStatus) {},

      onProgressChange: function (aWebProgress, aRequest, aCurSelfProgress, aMaxSelfProgress, aCurTotalProgress, aMaxTotalProgress) {},

      onLocationChange: function (aWebProgress, aRequest, aLocation) {},

      onStatusChange: function (aWebProgress, aRequest, aStatus, aMessage) {},

      onSecurityChange: function (aWebProgress, aRequest, state) {}
    };

    var deliverMode = previewMode ?
      this.msgSend.nsMsgQueueForLater :
      this.msgSend.nsMsgDeliverNow;

    if (!gENForwardUtils.checkMsgSize(msgFile)) { //file size error
      this.sentMsgs += 1;
      alert("Note size exceeds the limit. Canceled.");
      sendListener.onStopSending(null, "FILESIZE_ERROR", "", null);
    } else {
      this.locked = true;
      this.msgSend.sendMessageFile(
        this.id, // in nsIMsgIdentity       aUserIdentity,
        this.account.key, // char* accountKey,
        //id.key,          // char* accountKey,
        this.msgCompFields, // in nsIMsgCompFields     fields,
        msgFile, // in nsIFile          sendIFile,
        false, // in PRBool               deleteSendFileOnCompletion,
        false, // in PRBool               digest_p,
        //				 this.msgSend.nsMsgDeliverNow,         // in nsMsgDeliverMode     mode,
        deliverMode, // in nsMsgDeliverMode     mode,
        null, // in nsIMsgDBHdr          msgToReplace,
        sendListener, // in nsIMsgSendListener   aListener,
        feedback, // in nsIMsgStatusFeedback aStatusFeedback,
        "" // in string               password
      );

      if (previewMode) {
        sendListener.onStartSending(null, 0);
        sendListener.onStopSending(null, 0, null, null);
      }
    }
  },

  //tags is a tags string joined with a space
  toggleMessageTags: function (msgHdr, tags, add) {
    if (!tags) return;

    var mArray = Components.classes["@mozilla.org/array;1"].createInstance(Components.interfaces.nsIMutableArray);
    mArray.clear();
    mArray.appendElement(msgHdr);

    if (add) {
      msgHdr.folder.addKeywordsToMessages(mArray, tags);
    } else {
      msgHdr.folder.removeKeywordsFromMessages(mArray, tags);
    }

    this.window.OnTagsChange();
  },

  deleteOriginalMessage: function (msgHdr) {
    //delete original message
    var folder = msgHdr.folder;
    var deleteStorage = false;
    var delHdrs = Components.classes["@mozilla.org/array;1"]
      .createInstance(Components.interfaces.nsIMutableArray);
    delHdrs.appendElement(msgHdr, false);
    delHdrs.QueryInterface(Components.interfaces.nsIArray);
    folder.deleteMessages(delHdrs, this.window.msgWindow, deleteStorage, true, null, false);
  },

  initFilterAttachWS: function () {
    this.filterAttachWS.stat = "flush";
    this.filterAttachWS.boundary = "";
    this.filterAttachWS.buf = "";
    this.filterAttachWS.prev = "";
    this.filterAttachWS.inContentType = false;
    this.filterAttachWS.name = "";
    this.filterAttachWS.definedBoundaries = [];
  },

  filterAttachments: function (data, info, filter) {
    var lines = (this.filterAttachWS.prev + data).split("\r\n");
    var ret = "";
    var len = lines.length - 1;

    if (len < 1) {
      return lines[0]; //end of file. flush buffer.
    } else {
      this.filterAttachWS.prev = lines[len]; //last one line becomes prev
    }

    for (var i = 0; i < len; i++) {
      var line = lines[i];
      //invalidate s/mime signature
      line = line.replace("multipart/signed", "multipart/mixed");

      if (!filter) { //don't filter but invalidate s/mime
        ret = ret + line + "\r\n";
        continue;
      }

      if (this.filterAttachWS.inContentType && (line == "" || /^\S+/.test(line))) {
        this.filterAttachWS.inContentType = false;
        if (this.filterAttachWS.name) {
          this.filterAttachWS.name = this.mimeConverter.decodeMimeHeader(this.filterAttachWS.name, null, false, true);
          if (info.delAttachments[this.filterAttachWS.name]) {
            this.filterAttachWS.stat = "skip";
            this.filterAttachWS.buf = "";
          }
          this.filterAttachWS.name = "";
        }

      }

      if (/^\-\-\S/.test(line)) { //boundary
        if (this.filterAttachWS.definedBoundaries[line]) { //filters out non-boundary such as -->, --<spc>
          if (this.filterAttachWS.stat != "skip" || line.indexOf(this.filterAttachWS.boundary) == 0) {
            this.filterAttachWS.boundary = line;
            this.filterAttachWS.stat = "boundary";
          }
        }
      } else if (this.filterAttachWS.inContentType || (!this.filterAttachWS.name && /^Content-Type: /i.test(line))) {
        var idx = line.indexOf("name=");
        this.filterAttachWS.inContentType = true;
        if (idx > 0) {
          this.filterAttachWS.name = line.substring(idx + 5).replace(/\"/g, "");
        } else if (this.filterAttachWS.name) {
          this.filterAttachWS.name += "\r\n" + line.replace(/\"/g, "");
        }

        idx = line.indexOf("boundary=");
        if (idx > 0) {
          var boundary = line.substring(idx + 9).replace(/\"/g, "");
          this.filterAttachWS.definedBoundaries["--" + boundary] = true; //start of section
          this.filterAttachWS.definedBoundaries["--" + boundary + "--"] = true; //end of section
        }
      } else if (this.filterAttachWS.stat == "buffer" && line == "") {
        this.filterAttachWS.stat = "flush";
      }

      switch (this.filterAttachWS.stat) {
        case "boundary":
          ret = ret + line + "\r\n";
          this.filterAttachWS.stat = "buffer";
          break;
        case "buffer":
          this.filterAttachWS.buf = this.filterAttachWS.buf + line + "\r\n";
          break;
        case "skip":
          break; //nothing is done
        case "flush":
          ret = ret + this.filterAttachWS.buf + line + "\r\n";
          this.filterAttachWS.buf = "";
          break;
        default:
      }
    }

    return ret;
  },

  text2html: function (str, escape) {
    var ret = escape ? this.escapeHTMLMetaCharacter(str) : str;
    ret = ret.split("\n").join("<br>");
    ret = '<!DOCTYPE HTML PUBLIC "-//W3C//DTD HTML 4.01 Transitional//EN">' +
      '<head>' +
      '<meta http-equiv="content-type" content="text/html;charset=UTF-8">' +
      '</head>' +
      '<body><div>' +
      ret +
      '</div></body>' +
      '</html>'
    return ret;
  },

  createAddressesString: function (addrsStr, isFullName, provideLink, wrap) {
    var addrs = [];
    var wrapLen = wrap ? this.wrapLength : 0;
    var cols = 0;

    //parseHeaderWithArray is removed from TB71
    //this.hdrParser.parseHeadersWithArray(addrsStr, addresses, names, fullNames, count);
    var addresses = this.hdrParser.parseEncodedHeader(addrsStr);
    for (var addr of addresses) {
      var email = addr.email;
      var name = addr.name;
      var fullname = addr.toString();

      if (isFullName) {
        name = fullname;
      } else if (!name) {
        name = email.split("@")[0];
      }

      var htmlBR = "";
      if (wrapLen > 0 && cols + name.length > wrapLen) { //wrap
        htmlBR = "<BR>";
        cols = name.length;
      } else {
        cols = cols + name.length + 2; //2 means , and space
      }

      if (provideLink) {
        addrs.push(htmlBR + '<a href="' + 'mailto:' + email + '">' + this.escapeHTMLMetaCharacter(name) + '</a>');
      } else {
        addrs.push(htmlBR + name);
      }

    }
    return addrs.join(", ");
  },

  escapeHTMLMetaCharacter: function (str) {
    return str.replace(/["&'<>]/gm,
      function (c) {
        return {
          '"': '&quot;',
          '&': '&amp;',
          '\'': '&#39;',
          '<': '&lt;',
          '>': '&gt;'
        } [c];
      }
    );
  },

  expandMetaCharacters: function (str, msgHdr, isTitle, fwdAtts, delAtts, escape, onenote) {
    var sub = msgHdr.mime2DecodedSubject;
    var app = onenote ? "onenote_" : "";
    if (isTitle) {
      if (gENFPreferences.getBoolPref(app + "rm_mltag", false)) {
        sub = sub.replace(/^(?:\[[^\]]+\]|\([^\)]+\))+/i, "");
      }
      if (gENFPreferences.getBoolPref(app + "rm_re_fwd", false)) {
        sub = sub.replace(/^(?:\s*re:\s*|\s*fwd:\s*|\s*fw:\s*)+/i, "");
      } else if (msgHdr.flags & Components.interfaces.nsMsgMessageFlags.HasRe) {
        sub = "Re: " + sub;
      }
    }

    var provideLink = !onenote && !isTitle && gENFPreferences.getBoolPref("mailto_link", false);

    //Inside createAddresses... hdrParser reads encoded string and outs decoded string so here no mime decode is needed
    //var author = this.createAddressesString(msgHdr.mime2DecodedAuthor, true, provideLink, false);
    var author = this.createAddressesString(msgHdr.author, true, provideLink, false);

    //var authorName = this.createAddressesString(msgHdr.mime2DecodedAuthor, false, provideLink, false);
    var authorName = this.createAddressesString(msgHdr.author, false, provideLink, false);

    //    var toList = this.createAddressesString(this.decode(msgHdr.recipients), true, provideLink, !isTitle);
    var toList = this.createAddressesString(msgHdr.recipients, true, provideLink, !isTitle);

    //    var ccList = this.createAddressesString(this.decode(msgHdr.ccList), true, provideLink, !isTitle);
    var ccList = this.createAddressesString(msgHdr.ccList, true, provideLink, !isTitle);

    //    var toNames = this.createAddressesString(this.decode(msgHdr.recipients), false, provideLink, !isTitle);
    var toNames = this.createAddressesString(msgHdr.recipients, false, provideLink, !isTitle);

    //    var ccNames = this.createAddressesString(this.decode(msgHdr.ccList), false, provideLink, !isTitle);
    var ccNames = this.createAddressesString(msgHdr.ccList, false, provideLink, !isTitle);

    var folderName = msgHdr.folder.prettyName;

    var date = new Date();
    date.setTime(msgHdr.dateInSeconds * 1000);
    var y = date.getYear() + 1900;
    var mon = date.getMonth() + 1;
    if (mon < 10) mon = "0" + mon;
    var d = date.getDate();
    if (d < 10) d = "0" + d;
    var h = date.getHours();
    if (h < 10) h = "0" + h;
    var m = date.getMinutes();
    if (m < 10) m = "0" + m;
    var s = date.getSeconds();
    if (s < 10) s = "0" + s;

    var accountName = this.accountName;

    if (escape) {
      sub = this.escapeHTMLMetaCharacter(sub);
      folderName = folderName ? this.escapeHTMLMetaCharacter(folderName) : "";
      accountName = accountName ? this.escapeHTMLMetaCharacter(accountName) : "";
    }

    str = str.replace(/\%S/gm, sub);
    str = str.replace(/\%F/gm, folderName);
    str = str.replace(/\%N/gm, accountName);

    str = str.replace(/\%A/gm, author);
    str = str.replace(/\%T/gm, toList);
    str = str.replace(/\%C/gm, ccList);

    str = str.replace(/\%a/gm, authorName);
    str = str.replace(/\%t/gm, toNames);
    str = str.replace(/\%c/gm, ccNames);

    str = str.replace(/\%Y/gm, y);
    str = str.replace(/\%M/gm, mon);
    str = str.replace(/\%D/gm, d);

    str = str.replace(/\%h/gm, h);
    str = str.replace(/\%m/gm, m);
    str = str.replace(/\%s/gm, s);

    if (fwdAtts) {
      var name = "";
      var cols = 0;
      var atts = [];
      for (name in fwdAtts) {
        var att = fwdAtts[name];
        if (att && !att.del) {
          var htmlBR = "";
          if (this.wrapLength > 0 && cols + name.length > this.wrapLength) { //wrap
            htmlBR = "<BR>";
            cols = name.length;
          } else {
            cols = cols + name.length + 2; //2 means , and space
          }
          atts.push(htmlBR + this.escapeHTMLMetaCharacter(name));
        }
      }

      var attsStr = atts.join(", ");
      str = str.replace(/\%r/gm, attsStr);
    }

    if (delAtts) {
      var name = "";
      var cols = 0;
      var atts = [];
      for (name in delAtts) {
        var att = delAtts[name];
        if (att && att.del) {
          var htmlBR = "";
          if (this.wrapLength > 0 && cols + name.length > this.wrapLength) { //wrap
            htmlBR = "<BR>";
            cols = name.length;
          } else {
            cols = cols + name.length + 2; //2 means , and space
          }
          atts.push(htmlBR + this.escapeHTMLMetaCharacter(name));
        }
      }
      var attsStr = atts.join(", ");
      str = str.replace(/\%R/gm, attsStr);
    }

    if (isTitle && !onenote) {
      str = str.replace(/\@/g, "_");
      str = str.replace(/\#/g, "_");
      str = str.replace(/\s\!/g, "_");
    }

    return str;
  },

  createAddressNamesStr: function (listStr) {
    if (!listStr) return "";
    //parseHeadersWithArray is removed from TB71
    //this.hdrParser.parseHeadersWithArray(listStr, addresses, names, fullNames, count);
    var addresses = this.hdrParser.parseEncodedHeader(listStr);
    var nameList = [];
    for (var addr of addresses) {
      var email = addr.email;
      var name = addr.name;
      if (name) {
        nameList.push(name);
      } else {
        nameList.push(email.split("@")[0]);
      }
    }

    return nameList.join(", ");
  },

  createTempFile: function () {
    var tmpDir = this.dirService.get("TmpD", Components.interfaces.nsIFile);
    tmpDir.append("EnForward");
    tmpDir.append("enforward.tmp");
    tmpDir.createUnique(Components.interfaces.nsIFile.NORMAL_FILE_TYPE, 0o666);
    return tmpDir;
  },

  abortForward: function () {
    this.totalMsgs = 0;
    this.sentMsgs = 0;
    this.noteInfo = [];

    var locked = this.locked;
    this.locked = false;
    try {
      if (locked) this.msgSend.abort();
    } catch (e) {
      console.log(e);
    }

    this.fireSendCompleteEvent(false, 0, 0);
    this.window.document.getElementById("statusText").setAttribute("value", "Forwarding was aborted.");
  },

  utf8ToBase64: function (str) {
    var b64 = this.window.btoa(unescape(encodeURIComponent(str)));
    var ret = "";
    var start = 0;
    var len = b64.length;
    for (; start + 76 < len; start += 76) {
      ret += b64.substr(start, 76) + "\r\n";
    }

    if (start < len) ret += b64.substr(start) + "\r\n";

    return ret;
  },

  base64ToUtf8: function (str) {
    return decodeURIComponent(escape(this.window.atob(str)));
  },

  listAttachmentsAndFwd: function (info) {
    var msgHdr = info.msgHdr;
    if (!(msgHdr.flags & Components.interfaces.nsMsgMessageFlags.Attachment)) {
      this.sendMsgFile(info);
    } else {
      var msgHdr = info.msgHdr;
      var that = this;
      var mimeCallback = function (msgHdr, mimeMsg) {
        var atts = mimeMsg.allAttachments;
        var delAttachments = [];
        var fwdAttachments = [];
        var app = info.onenote ? "onenote_" : ""
        var fwdMode = gENFPreferences.getIntPref(app + "attachments_forward_mode", 0);

        if (fwdMode == 1) { //remove all
          for (var i = 0; i < atts.length; i++) {
            var att = atts[i];
            delAttachments[att.name] = {
              size: att.size,
              del: true
            };
          }
        } else if (fwdMode == 0 || fwdMode == 2) { //foward all or ask
          for (var i = 0; i < atts.length; i++) {
            //filters out "Part 1.2"-like / deleted attachments.
            var att = atts[i];
            if (!att.isRealAttachment || att.contentType == ("text/x-moz-deleted") || att.url.indexOf("file://") == 0) {
              delAttachments[att.name] = {
                size: att.size,
                del: true
              };
            } else {
              fwdAttachments[att.name] = {
                size: att.size,
                del: false
              };
            }
          }
        } else if (fwdMode == 3 || fwdMode == 4) { //filter
          var extFilter = gENFPreferences.copyUnicharPref(app + "attachments_ext_filter", "");
          extFilter = extFilter.split(/\s*,\s*/);
          var sizeFilter = gENFPreferences.getIntPref(app + "attachments_size_filter", 0);
          for (var i = 0; i < atts.length; i++) {
            var att = atts[i];
            var del = false;
            if (!att.isRealAttachment || att.contentType == ("text/x-moz-deleted") || att.url.indexOf("file://") == 0) {
              del = true;
            } else if (fwdMode == 3) {
              del = extFilter.indexOf(att.name.split(".").pop()) > -1 || (sizeFilter > 0 && sizeFilter * 1024 * 1024 <= att.size);
            } else if (fwdMode == 4) {
              del = extFilter.indexOf(att.name.split(".").pop()) > -1 && (sizeFilter > 0 && sizeFilter * 1024 * 1024 <= att.size);
            }

            if (del) {
              delAttachments[att.name] = {
                size: att.size,
                del: true
              };
            } else {
              fwdAttachments[att.name] = {
                size: att.size,
                del: false
              };
            }
          }
        }

        if (fwdMode == 2) {
          //XXX: Ask me option is not implemented so far
          //XXX: need to be implemented as popup if attachments confirmation is needed.
          console.log("Ask me option for attachments forwarding is disabled in MX.");
          /*
          var callback = {
            attachments: fwdAttachments,
            canceled: false
          };
          //check fwdAttachments is empty or not
          var confirm = false;
          var key = "";
          for (key in fwdAttachments) {
            confirm = true;
            break;
          }

          if (confirm) {
            window.openDialog("chrome://enforward/content/ENFDelAttach.xul", "enforward-delattach", "chrome,modal,dialog,centerscreen", callback);
          }

          if (callback.canceled) {
            that.abortForward();
          } else {
            var name = "";
            for (name in callback.attachments) {
              var att = callback.attachments[name];
              if (att.del) {
                delAttachments[name] = att;
                delete fwdAttachments[name];
              }
            }
            info.delAttachments = delAttachments;
            info.fwdAttachments = fwdAttachments;
            that.sendMsgFile(info);
          }
          */
        } else {
          info.delAttachments = delAttachments;
          info.fwdAttachments = fwdAttachments;
          that.sendMsgFile(info);
        }
      };
      MsgHdrToMimeMessage(msgHdr, null, mimeCallback);
    }
  }
};
