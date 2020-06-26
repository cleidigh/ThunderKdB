/*
 Copyright (C) 2011-2017 J-C Prin. (jisse44)

    This program is free software: you can redistribute it and/or modify
    it under the terms of the GNU General Public License as published by
    the Free Software Foundation.

    This program is distributed in the hope that it will be useful,
    but WITHOUT ANY WARRANTY; without even the implied warranty of
    MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
    GNU General Public License for more details.

    You should have received a copy of the GNU General Public License
    along with this program.  If not, see <http://www.gnu.org/licenses/>
*/

var objEditEmailSubject = {

  msgFolder: null,
  msgHeader: null,
  consoleService: Components.classes["@mozilla.org/consoleservice;1"].getService(Components.interfaces.nsIConsoleService),
  extSettings: Components.classes["@mozilla.org/preferences-service;1"].getService(Components.interfaces.nsIPrefBranch),

  initDialog: function() {

    document.addEventListener("dialogaccept", function() {objEditEmailSubject.exitDialog(false)}); // This replaces ondialogaccept in XUL.
    document.addEventListener("dialogcancel", function() {objEditEmailSubject.exitDialog(true)}); // This replaces ondialogcancel in XUL.

    objEditEmailSubject.consoleService.logStringMessage("editEmailSubject start");
    document.getElementById("editEmailSubjectInput").value = window.arguments[0].subject;
    if (document.getElementById("editEmailSubjectOld")!= null) document.getElementById("editEmailSubjectOld").value = window.arguments[0].oldSubject;
  },

  exitDialog: function(cancel) {

    window.arguments[0].cancel = cancel;
    if (cancel) return true;

    window.arguments[0].subject = document.getElementById("editEmailSubjectInput").value;

    return true;
  },

  getOrigDate: function() {

    var dateOrig = "";
    try {
      var str_message = objEditEmailSubject.listener.text;
      if (str_message.indexOf("Date:") > -1) dateOrig = str_message.split("\nDate:")[1].split("\n")[0];
      else if (str_message.indexOf("date:") > -1) dateOrig = str_message.split("\ndate:")[1].split("\n")[0];
      dateOrig = dateOrig.replace(/ +$/,"");
      dateOrig = dateOrig.replace(/^ +/,"");
    }
    catch(e) {}
    return dateOrig;
  },

  getOrigSubject: function() {

    var subjectOrig = "";
    try {
      var str_message = objEditEmailSubject.listener.text;
      subjectOrig = str_message.split("\X-editEmailSubject-OriginalSubject:")[1].split("\n")[0];
      subjectOrig = subjectOrig.replace(/ +$/,"");
      subjectOrig = subjectOrig.replace(/^ +/,"");
    }
    catch(e) {}
    return subjectOrig;
  },

  edit: function() {

    // local style
    if (objEditEmailSubject.extSettings.getBoolPref("extensions.editEmailSubject.localOnly")) {

      //var msg = gDBView.hdrForFirstSelectedMessage;
      //objEditEmailSubject.msgHeader = msg.QueryInterface(Components.interfaces.nsIMsgDBHdr);
      objEditEmailSubject.msgHeader = gDBView.hdrForFirstSelectedMessage;

      var newMsgHeader = {};
      newMsgHeader.subject = objEditEmailSubject.msgHeader.mime2DecodedSubject;

      window.openDialog("chrome://editEmailSubject/content/editEmailSubjectPopup.xul","","chrome,modal,centerscreen,resizable ",newMsgHeader);

      if (newMsgHeader.cancel) return;

      objEditEmailSubject.msgHeader.subject = unescape(encodeURIComponent(newMsgHeader.subject));
    }
    else {  // IMAP style
      var msgUri = gFolderDisplay.selectedMessageUris[0];
      var mms = messenger.messageServiceFromURI(msgUri).QueryInterface(Components.interfaces.nsIMsgMessageService);

      objEditEmailSubject.msgHeader = mms.messageURIToMsgHdr(msgUri);
      objEditEmailSubject.msgFolder = objEditEmailSubject.msgHeader.folder;
      mms.streamMessage(msgUri, objEditEmailSubject.listener, null, null, false, null);
    }
  },

  cleanNR: function(data) {

    var newData = data.replace(/\r/g, "");  //for RFC2822

    newData = newData.replace(/\n/g, "\r\n");

    return newData;
  },

  listener: {

    QueryInterface: function(iid)  {

                  if (iid.equals(Components.interfaces.nsIStreamListener) ||
                      iid.equals(Components.interfaces.nsISupports))
                   return this;

                  throw Components.results.NS_NOINTERFACE;
                  return 0;
          },

    onStartRequest: function (aRequest) { // aContext argument removed.
      objEditEmailSubject.listener.text = "";
    },

    onStopRequest: function (aRequest, aStatusCode) { // aContext argument removed.

      var isImap = (objEditEmailSubject.msgFolder.server.type == "imap") ? true: false;
      var date = objEditEmailSubject.getOrigDate();
      var originalSubject = objEditEmailSubject.msgHeader.mime2DecodedSubject;
      var newMsgHeader = {};

      if (objEditEmailSubject.msgHeader.flags & 0x0010) originalSubject = "Re: " + originalSubject;
      newMsgHeader.subject = originalSubject;
      newMsgHeader.date = date;
      
      // Author, Recipients & Reply-To headers are not edited in this extension so these are commented out.
      
      //newMsgHeader.replyto = objEditEmailSubject.msgHeader.getStringProperty("replyTo");
      //newMsgHeader.author = objEditEmailSubject.msgHeader.mime2DecodedAuthor;
      //newMsgHeader.recipients = objEditEmailSubject.msgHeader.mime2DecodedRecipients;

      var text = objEditEmailSubject.listener.text;
      if (text.indexOf("X-editEmailSubject:") < 0) window.openDialog("chrome://editEmailSubject/content/editEmailSubjectPopup.xul","","chrome,modal,centerscreen,resizable",newMsgHeader);
      else {
        newMsgHeader.oldSubject = objEditEmailSubject.getOrigSubject();
        window.openDialog("chrome://editEmailSubject/content/editEmailSubjectPopup2.xul","","chrome,modal,centerscreen,resizable",newMsgHeader);
      }

      if (newMsgHeader.cancel) return;

      var newSubject = unescape(encodeURIComponent(newMsgHeader.subject));
      
      // Author, Recipients & Reply-To headers are not edited in this extension so these are commented out.
      
      //var newAuthor = unescape(encodeURIComponent(newMsgHeader.author));
      //var newRecipients = unescape(encodeURIComponent(newMsgHeader.recipients));

      //var newReplyto = "";
      //if (newMsgHeader.replyto) newReplyto = unescape(encodeURIComponent(newMsgHeader.replyto));
      //else newReplyto = null;

      var data = objEditEmailSubject.cleanNR(objEditEmailSubject.listener.text);
      var headerEnd = data.search(/\r\n\r\n/);
      var headers = data.substring(0,headerEnd);

      while(headers.match(/\r\nSubject: .*\r\n\s+/))
        headers = headers.replace(/(\r\nSubject: .*)(\r\n\s+)/, "$1 ");
      
      // From & To headers are not edited in this extension so these are commented out.

      //while(headers.match(/\r\nFrom: .*\r\n\s+/))
        //headers = headers.replace(/(\r\nFrom: .*)(\r\n\s+)/, "$1 ");

      //while(headers.match(/\r\nTo: .*\r\n\s+/))
        //headers = headers.replace(/(\r\nTo: .*)(\r\n\s+)/, "$1 ");

      if (headers.indexOf("\nSubject:") > -1) headers = headers.replace(/\nSubject: .*\r\n/, "\nSubject: " + newSubject + "\r\n");
      else if (headers.indexOf("\nsubject:") > -1) headers = headers.replace(/\nsubject: *.*\r\n/, "\nsubject: " + newSubject+ "\r\n");
      else headers = headers + ("\r\nSubject: " + newSubject);
      
      // From & To headers are not edited in this extension so these are commented out.

      //if (headers.indexOf("From:") > -1) headers = headers.replace(/\nFrom: .*\r\n/, "\nFrom: " + newAuthor + "\r\n");
      //else if (headers.indexOf("\nfrom:") > -1) headers = headers.replace(/\nfrom: *.*\r\n/, "\nfrom: " + newAuthor + "\r\n");
      //else headers = headers + ("\r\nFrom: " + newAuthor);

      //if (headers.indexOf("To:") > -1) headers = headers.replace(/\nTo: .*\r\n/, "\nTo: " + newRecipients + "\r\n");
      //else if (headers.indexOf("\nto:") > -1) headers = headers.replace(/\nto: *.*\r\n/, "\nto: " + newRecipients + "\r\n");
      //else headers = headers + ("\r\nTo: " + newRecipients);

      if (headers.indexOf("Date:") > -1) headers = headers.replace(/\nDate: .*\r\n/, "\nDate: " + newMsgHeader.date + "\r\n");
      else if (headers.indexOf("\ndate:") > -1) headers = headers.replace(/\ndate: *.*\r\n/, "\ndate: " + newMsgHeader.date + "\r\n");
      else headers = headers + ("\r\nDate: " + newMsgHeader.date);
      
      // Message-ID, References & Reply-To headers are not edited in this extension so these are commented out.
      // Message-ID & References also need to be commented out to prevent Message-ID and References being overwritten with <undefined>.

      //if (headers.indexOf("\nMessage-ID:") > -1) headers = headers.replace(/\nMessage-ID: *.*\r\n/, "\nMessage-ID: " + newMsgHeader.mid + "\r\n");
      //else if (newMsgHeader.mid) headers = headers + ("\r\nMessage-ID: " + newMsgHeader.mid);

      //if (headers.indexOf("\nReferences:") > -1) headers = headers.replace(/\nReferences: *.*\r\n/, "\nReferences: " + newMsgHeader.ref + "\r\n");
      //else if (newMsgHeader.ref) headers = headers + ("\r\nReferences: " + newMsgHeader.ref);

      //if (newReplyto) {
        //if (headers.indexOf("Reply-To:") > -1) headers = headers.replace(/\nReply\-To: .*\r\n/, "\nReply-To: " + newMsgHeader.replyto + "\r\n");
        //else if (headers.indexOf("reply-to:") > -1) headers = headers.replace(/\nreply\-to: *.*\r\n/, "\nreply-to: " + newMsgHeader.replyto + "\r\n");
        //else headers = headers + ("\r\nReply-To: " + newMsgHeader.replyto);
      //}

      /* Hack to prevent blank line into headers and binary attachments broken. Thanks to Achim Czasch for fix */
      headers = headers.replace(/\r\r/,"\r");

      data = headers + data.substring(headerEnd);

      data = data.replace(/^From - .+\r\n/, "");
      data = data.replace(/X-Mozilla-Status.+\r\n/, "");
      data = data.replace(/X-Mozilla-Status2.+\r\n/, "");
      data = data.replace(/X-Mozilla-Keys.+\r\n/, "");

      var now = new Date;
      var editEmailSubjectHead = "X-editEmailSubject: " + now.toString();
      editEmailSubjectHead = editEmailSubjectHead.replace(/\(.+\)/, "");
      editEmailSubjectHead = editEmailSubjectHead.substring(0,75);

      var editEmailSubjectOriginal = "X-editEmailSubject-OriginalSubject: " + objEditEmailSubject.msgHeader.mime2DecodedSubject;
      editEmailSubjectOriginal = editEmailSubjectOriginal.replace(/\(.+\)/, "");

      if (data.indexOf("\nX-editEmailSubject: ") < 0) data = data.replace("\r\n\r\n","\r\n" + editEmailSubjectHead + "\r\n" + editEmailSubjectOriginal + "\r\n\r\n");
      else data = data.replace(/\nX-editEmailSubject: .+\r\n/,"\n" + editEmailSubjectHead + "\r\n");

      if (isImap) {
        objEditEmailSubject.consoleService.logStringMessage("isImap");
        // Some IMAP provider (for ex. GMAIL) doesn't register changes in source if the main headers
        // are not different from an existing message. To work around this limit, the "Date" field is
        // modified, if necessary, adding a second to the time (or decreasing a second if second are 59)
        var newDate = date.replace(/(\d{2}):(\d{2}):(\d{2})/, function (str, p1, p2, p3) {
          var seconds = parseInt(p3) + 1;
          if (seconds > 59) seconds = 58;
          if (seconds < 10) seconds = "0" + seconds.toString();
          return p1 + ":" + p2 + ":" + seconds});
        data = data.replace(date,newDate);
      }

      var tempFile = Components.classes["@mozilla.org/file/directory_service;1"].getService(Components.interfaces.nsIProperties).get("TmpD", Components.interfaces.nsIFile);
      tempFile.append("EMS.eml");
      tempFile.createUnique(0,0664);

      var foStream = Components.classes["@mozilla.org/network/file-output-stream;1"].createInstance(Components.interfaces.nsIFileOutputStream);
      foStream.init(tempFile, 2, 0x200, false);
      foStream.write(data,data.length);
      foStream.close();

      var flags = objEditEmailSubject.msgHeader.flags;
      var keys = objEditEmailSubject.msgHeader.getStringProperty("keywords");

      objEditEmailSubject.list = Components.classes["@mozilla.org/array;1"].createInstance(Components.interfaces.nsIMutableArray);
      objEditEmailSubject.list.appendElement(objEditEmailSubject.msgHeader, false);

      var fileSpec = Components.classes["@mozilla.org/file/local;1"].createInstance(Components.interfaces.nsIFile);
      fileSpec.initWithPath(tempFile.path);
      var folderCopy = objEditEmailSubject.msgHeader.folder;
      var extService = Components.classes['@mozilla.org/uriloader/external-helper-app-service;1'].getService(Components.interfaces.nsPIExternalAppLauncher);
      extService.deleteTemporaryFileOnExit(fileSpec);

      var copyMess = Components.classes["@mozilla.org/messenger/messagecopyservice;1"].getService(Components.interfaces.nsIMsgCopyService);
      copyMess.CopyFileMessage(fileSpec, folderCopy, null, false, flags, keys, objEditEmailSubject.copyListener, msgWindow);

      //folderCopy.copyFileMessage(fileSpec, null, false, flags, keys, null, objEditEmailSubject.copyListener);

    },

    onDataAvailable: function (aRequest, aInputStream, aOffset, aCount) { // aContext argument removed, aInputstream is now 2nd argument.

      var scriptInStream = Components.classes["@mozilla.org/scriptableinputstream;1"].createInstance().QueryInterface(Components.interfaces.nsIScriptableInputStream);
      scriptInStream.init(aInputStream);
      objEditEmailSubject.listener.text += scriptInStream.read(scriptInStream.available());
    }
  },

  copyListener: {

    QueryInterface: function(iid) {

      if (iid.equals(Components.interfaces.nsIMsgCopyServiceListener) ||
      iid.equals(Components.interfaces.nsISupports))
      return this;

      throw Components.results.NS_NOINTERFACE;
      return 0;
    },

    GetMessageId: function (messageId) {},
    OnProgress: function (progress, progressMax) {},
    OnStartCopy: function () {},
    OnStopCopy: function (status) {},

    SetMessageKey: function (key) {

      if (objEditEmailSubject.msgFolder.server.type == "imap" || objEditEmailSubject.msgFolder.server.type == "news") {
        Components.classes["@mozilla.org/messenger/services/session;1"].getService(Components.interfaces.nsIMsgMailSession).AddFolderListener(objEditEmailSubject.folderListener, Components.interfaces.nsIFolderListener.all);
        objEditEmailSubject.folderListener.key = key;
        objEditEmailSubject.folderListener.URI = objEditEmailSubject.msgFolder.URI;
      }
      else setTimeout(function() {objEditEmailSubject.postActions(key);}, 500);
    }
  },

  postActions: function(key) {

    gDBView.selectMsgByKey(key);
    var msgHeader = objEditEmailSubject.msgFolder.GetMessageHeader(key);

    if (msgHeader.flags & 2) objEditEmailSubject.msgFolder.addMessageDispositionState(msgHeader,0);
          if (msgHeader.flags & 4096) objEditEmailSubject.msgFolder.addMessageDispositionState(msgHeader,1);

    objEditEmailSubject.msgFolder.deleteMessages(objEditEmailSubject.list,null,true,true,null,false);
  },

  folderListener: {

    OnItemAdded: function(parentItem, item, view) {

      try {
        var msgHeader = item.QueryInterface(Components.interfaces.nsIMsgDBHdr);
      }
      catch(e) {
                 return;
      }
      if (objEditEmailSubject.folderListener.key == msgHeader.messageKey && objEditEmailSubject.folderListener.URI == msgHeader.folder.URI) {
        objEditEmailSubject.postActions(objEditEmailSubject.folderListener.key);
        Components.classes["@mozilla.org/messenger/services/session;1"].getService(Components.interfaces.nsIMsgMailSession).RemoveFolderListener(objEditEmailSubject.folderListener);
      }
    },

    OnItemRemoved: function(parentItem, item, view) {},
    OnItemPropertyChanged: function(item, property, oldValue, newValue) {},
    OnItemIntPropertyChanged: function(item, property, oldValue, newValue) {},
    OnItemBoolPropertyChanged: function(item, property, oldValue, newValue) {},
    OnItemUnicharPropertyChanged: function(item, property, oldValue, newValue){},
    OnItemPropertyFlagChanged: function(item, property, oldFlag, newFlag) {},
    OnItemEvent: function(folder, event) {}
  },

  showSettings : function() {
    window.openDialog("chrome://editEmailSubject/content/editEmailSubjectSettings.xul", "chrome");
  }
};
