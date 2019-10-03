var OneByOneForward;
(function () {
  let theWindow = window;
  let subWindows = {};
  theWindow.addEventListener('unload', function (event) {
    for(let id in subWindows) {
      subWindows[id].window.close();
    }
  });
  let msgSend = theWindow.Components.classes['@mozilla.org/messengercompose/send;1'].createInstance(theWindow.Components.interfaces.nsIMsgSend);
  let processMimeMessage = function (mimeMessage, parentContentType, output) {
    if(Array.isArray(mimeMessage.parts) && mimeMessage.parts.length > 0) {
      for(let i = 0, l = mimeMessage.parts.length; i < l; ++i) {
        processMimeMessage(mimeMessage.parts[i], mimeMessage.contentType, output);
      }
      return;
    }
    if(mimeMessage.contentType === 'text/plain' && typeof mimeMessage.body === 'string') {
      output.plainTextBody = mimeMessage.body;
    }
    else if(mimeMessage.contentType === 'text/html' && typeof mimeMessage.body === 'string') {
      output.htmlBody = mimeMessage.body;
    }
    else {
      output.attachments.push({
        contentType: mimeMessage.contentType,
        name: mimeMessage.name,
        size: mimeMessage.size,
        url: mimeMessage.url
      });
    }
  };
  let mimeMessageHandler = function (messageUrl, message, mimeMessage, callingWindowData, onComplete) {
    let email = { plainTextBody: null, htmlBody: null, attachments: [] };
    processMimeMessage(mimeMessage, null, email);
    let msgAccountManager = theWindow.Components.classes['@mozilla.org/messenger/account-manager;1'].getService(theWindow.Components.interfaces.nsIMsgAccountManager);
    let identity = msgAccountManager.getFirstIdentityForServer(message.folder.server);
    // Email content:
    let compFields = theWindow.Components.classes['@mozilla.org/messengercompose/composefields;1'].createInstance(theWindow.Components.interfaces.nsIMsgCompFields);
    compFields.to = callingWindowData.sendTo;
    compFields.cc = callingWindowData.sendCc;
    compFields.bcc = callingWindowData.sendBcc;
    compFields.from = identity.fullAddress;
    compFields.subject = 'Fwd: ' + message.mime2DecodedSubject;
    compFields.characterSet = "UTF-8";
    compFields.references = '';
    if(Array.isArray(mimeMessage['headers']['references']) && mimeMessage['headers']['references'].length == 1) {
      compFields.references += mimeMessage['headers']['references'][0].trim().replace(/\s+/g, '\r\n ') + '\r\n ';
    }
    else if(Array.isArray(mimeMessage['headers']['in-reply-to']) && mimeMessage['headers']['in-reply-to'].length == 1) {
      compFields.references += mimeMessage['headers']['in-reply-to'][0].trim().replace(/\s+/g, '\r\n ') + '\r\n ';
    }
    compFields.references += '<' + message.messageId + '>';
    let formatHtml;
    if(typeof email.htmlBody === 'string') {
      formatHtml = true;
      compFields.body = email.htmlBody;
      compFields.useMultipartAlternative = true;
    }
    else {
      formatHtml = false;
      compFields.body = email.plainTextBody;
    }
    if(callingWindowData.attach === 'original' || callingWindowData.attach === 'both') {
      for(let i = 0; i < email.attachments.length; ++i) {
        let attachment = Components.classes['@mozilla.org/messengercompose/attachment;1'].createInstance(Components.interfaces.nsIMsgAttachment);
        attachment.name = email.attachments[i].name;
        attachment.url = email.attachments[i].url;
        compFields.addAttachment(attachment);
      }
    }
    if(callingWindowData.attach === 'eml' || callingWindowData.attach === 'both') {
      let attachment = Components.classes['@mozilla.org/messengercompose/attachment;1'].createInstance(Components.interfaces.nsIMsgAttachment);
      attachment.name = message.mime2DecodedSubject + '.eml';
      // message.folder.getUriForMsg(message);
      attachment.url = messageUrl;
      compFields.addAttachment(attachment);
    }
    // Email parameters:
    let msgComposeParams = theWindow.Components.classes['@mozilla.org/messengercompose/composeparams;1'].createInstance(theWindow.Components.interfaces.nsIMsgComposeParams);
    msgComposeParams.composeFields = compFields;
    msgComposeParams.identity = identity;
    msgComposeParams.type = theWindow.Components.interfaces.nsIMsgCompType.New;
    msgComposeParams.format = formatHtml ? theWindow.Components.interfaces.nsIMsgCompFormat.HTML : theWindow.Components.interfaces.nsIMsgCompFormat.PlainText;
    callingWindowData.msgCompose = theWindow.Components.classes['@mozilla.org/messengercompose/compose;1'].createInstance(theWindow.Components.interfaces.nsIMsgCompose);
    callingWindowData.msgCompose.initialize(msgComposeParams);
    let account = msgAccountManager.FindAccountForServer(message.folder.server);
    // Track progress:
    let progress = theWindow.Components.classes['@mozilla.org/messenger/progress;1'].createInstance(theWindow.Components.interfaces.nsIMsgProgress);
    let progressListener = {
      onStateChange: function (aWebProgress, aRequest, aStateFlags, aStatus) {
        if(aStateFlags & theWindow.Components.interfaces.nsIWebProgressListener.STATE_START) {
        }
        if(aStateFlags & theWindow.Components.interfaces.nsIWebProgressListener.STATE_STOP) {
          progress.unregisterListener(progressListener);
          onComplete();
        }
      },
      onProgressChange: function(aWebProgress, aRequest, aCurSelfProgress, aMaxSelfProgress, aCurTotalProgress, aMaxTotalProgress) {
      },
      onLocationChange: function(aWebProgress, aRequest, aLocation) {
      },
      onStatusChange: function(aWebProgress, aRequest, aStatus, aMessage) {
      },
      onSecurityChange: function(aWebProgress, aRequest, state) {
      },
      QueryInterface: theWindow.XPCOMUtils.generateQI([
        theWindow.Components.interfaces.nsIWebProgressListener,
        theWindow.Components.interfaces.nsISupports
      ])
    };
    progress.registerListener(progressListener);
    callingWindowData.msgCompose.SendMsg(
      msgSend.nsMsgDeliverNow,
      identity,
      account,
      null,
      progress
    );
  };
  let send = function (callingWindowData, messageUrl, onComplete) {
    let message = theWindow.messenger.msgHdrFromURI(messageUrl);
    theWindow.MsgHdrToMimeMessage(
      message,
      null,
      function (message, mimeMessage) { mimeMessageHandler(messageUrl, message, mimeMessage, callingWindowData, onComplete); },
      true,
      null
    );
  };
  OneByOneForward = {
    launch: function () {
      selectedMessages = theWindow.gFolderDisplay.selectedMessageUris;
      selectedMessages = Array.isArray(selectedMessages) ? selectedMessages.slice() : [];
      if(selectedMessages.length > 0) {
        let subWindow = theWindow.open('chrome://onebyoneforward/content/onebyoneforwardform.xul', '_blank', 'chrome,centerscreen,width=600,height=200');
        let id;
        while(typeof subWindows[(id = theWindow.Math.random().toString(36).substring(2))] === 'object');
        subWindow.getOneByOneForwardId = function () {
          return id;
        };
        subWindows[id] = {
          window: subWindow,
          selectedMessages: selectedMessages,
          inProgress: false,
          interrupted: false
        };
      }
      else {
        theWindow.getOneByOneForwardAlert = function () { return 'No messages are selected!'; };
        let alertWindow = theWindow.open('chrome://onebyoneforward/content/onebyoneforwardalert.xul', '_blank', 'chrome,modal,dialog,centerscreen,width=300,height=100');
      }
    },
    getMessageBody: function (messageUrl) {
      let messageService = theWindow.messenger.messageServiceFromURI(messageUrl);
      let messageStream = theWindow.Components.classes['@mozilla.org/network/sync-stream-listener;1'].createInstance().QueryInterface(Components.interfaces.nsIInputStream);
      let inputStream = theWindow.Components.classes['@mozilla.org/scriptableinputstream;1'].createInstance().QueryInterface(Components.interfaces.nsIScriptableInputStream);
      inputStream.init(messageStream);
      messageService.streamMessage(messageUrl, messageStream, {}, null, false, null);
      let body = '';
      inputStream.available();
      while(inputStream.available()) {
         body += inputStream.read(512);
      }
      messageStream.close();
      inputStream.close();
      return body;
    },
    removeWindow: function (callingWindow) {
      if(typeof subWindows[callingWindow.getOneByOneForwardId()] !== 'object') {
        throw 'OneByOneForward - invalid window!';
      }
      subWindows[callingWindow.getOneByOneForwardId()].interrupted = true;
      delete subWindows[callingWindow.getOneByOneForwardId()];
    },
    sendSelected: function (callingWindow) {
      if(typeof subWindows[callingWindow.getOneByOneForwardId()] !== 'object') {
        throw 'OneByOneForward - invalid window!';
      }
      let callingWindowData = subWindows[callingWindow.getOneByOneForwardId()];
      if(callingWindowData.inProgress) {
        callingWindow.getOneByOneForwardAlert = function () { return 'A bulk forward is already in progress!'; };
        callingWindow.open('chrome://onebyoneforward/content/onebyoneforwardalert.xul', '_blank', 'chrome,modal,dialog,centerscreen,width=300,height=100');
        return;
      }
      callingWindowData.inProgress = true;
      callingWindowData.interrupted = false;
      let disablable = callingWindow.document.getElementsByClassName('onebyoneforward-disablable');
      for(let i = disablable.length - 1; i >= 0; --i) {
        disablable[i].disabled = true;
      }
      callingWindowData.sendTo = callingWindow.document.getElementById('onebyoneforward-to').value;
      callingWindowData.sendCc = callingWindow.document.getElementById('onebyoneforward-cc').value;
      callingWindowData.sendBcc = callingWindow.document.getElementById('onebyoneforward-bcc').value;
      callingWindowData.attach = callingWindow.document.getElementById('onebyoneforward-attach').value;
      if(!(callingWindowData.sendTo || callingWindowData.sendCc || callingWindowData.sendBcc)) {
        callingWindow.getOneByOneForwardAlert = function () { return 'No recipients were specified!'; };
        callingWindow.open('chrome://onebyoneforward/content/onebyoneforwardalert.xul', '_blank', 'chrome,modal,dialog,centerscreen,width=300,height=100');
        for(let i = disablable.length - 1; i >= 0; --i) {
          disablable[i].disabled = false;
        }
        callingWindowData.inProgress = false;
        return;
      }
      callingWindowData.log = callingWindow.document.getElementById('onebyoneforward-log');
      let i = 0;
      let sendTimer = function () {
        if(callingWindowData.interrupted) {
          callingWindowData.inProgress = false;
          return;
        }
        if(i < callingWindowData.selectedMessages.length) {
          let currentMessage = callingWindowData.selectedMessages[i++];
          callingWindowData.log.value = 'Processing ' + i + '/' + callingWindowData.selectedMessages.length + ' ' + currentMessage + '...';
          send(
            callingWindowData,
            currentMessage,
            function () {
              if(callingWindow.closed) {
                callingWindowData.inProgress = false;
                return;
              }
              callingWindow.setTimeout(sendTimer, 250);
            }
          );
        }
        else {
          callingWindowData.inProgress = false;
          callingWindow.close();
        }
      };
      sendTimer();
    }
  };
})();
