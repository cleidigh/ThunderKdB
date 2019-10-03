// Original codes to read and write message data to a folder are from Header Tools Lite, made by Paolo "Kaosmos".
// See: https://addons.mozilla.org/thunderbird/addon/header-tools-lite/
(function(aGlobal) {
  const Cc = Components.classes;
  const Ci = Components.interfaces;
  const Cu = Components.utils;
  const Cr = Components.results;
  const Prefs = Cc['@mozilla.org/preferences-service;1'].getService(Ci.nsIPrefBranch);
  const { Promise } = Cu.import('resource://gre/modules/Promise.jsm', {});

  var RescueConflictingAlt = {
    log : function(...aArgs) {
      if (!Prefs.getBoolPref('extensions.rescue-conflicting-alternatives@clear-code.com.debug'))
        return;
      aArgs.unshift('rescue-conflicting-alternatives: ');
      console.log(...aArgs);
    },

    tryUpdateCurrentMessage : function() {
      this.log('tryUpdateCurrentMessage');
      var context = {};
      return this.shouldApply(context)
        .then((aShouldApply) => {
          this.log('aShouldApply: ', aShouldApply);
          if (!aShouldApply)
            return;
          return this.updateCurrentMessage(context);
        })
        .catch((aError) => this.log(aError));
    },

    get selectedMessageURI() {
      return gFolderDisplay.selectedMessageUris[0];
    },

    ensureCurrentMessagePrepared : function(aContext) {
      if (aContext && aContext.headers)
        return Promise.resolve(aContext);

      aContext = aContext || {};
      let loader = new StreamMessageLoader(this.selectedMessageURI, aContext);
      return loader.loadHeaders();
    },

    ensureCurrentMessageLoaded : function(aContext) {
      if (aContext && aContext.message)
        return Promise.resolve(aContext);

      aContext = aContext || {};
      let loader = new StreamMessageLoader(this.selectedMessageURI, aContext);
      return loader.loadAll()
        .then((aContext) => {
          aContext.message = this.prepareMessage(aContext.message, aContext.hdr.Charset);
          return aContext;
        });
    },

    SCANNED_KEY : 'rescue-conflicting-alternatives-scanned',

    shouldApply : function(aContext) {
      return this.ensureCurrentMessagePrepared(aContext)
        .then((aContext) => {
          try {
            this.log(this.SCANNED_KEY+' = '+aContext.hdr.getStringProperty(this.SCANNED_KEY));
            if (aContext.hdr.getStringProperty(this.SCANNED_KEY) == 'true') {
              this.log('already scanned');
              return false;
            }
          }
          catch(e) {
          }

          this.log(aContext.headers);
          if (!this.MULTIPART_ALTERNATIVE_MATCHER.test(aContext.headers)) {
            this.log('not alternative');
            return false;
          }

          return this.ensureCurrentMessageLoaded(aContext)
            .then((aContext) => {
              aContext.hdr.setStringProperty(this.SCANNED_KEY, 'true')
              var bodies = this.collectSameTypeBodies(aContext.message);
              this.log('found bodies: ', bodies);
              if (Object.keys(bodies).every((aType) => {
                    return bodies[aType].length < 2;
                  }))
                return false; // only one body for each type

              aContext.bodies = bodies;
              return true;
            });
        });
    },

    MULTIPART_ALTERNATIVE_MATCHER : /^(Content-Type:\s*)multipart\/alternative(;\s*boundary=(['"]?)([^\s]+)\3)/im,

    collectSameTypeBodies : function(aMessage) {
      var bodiesWithTypes = {};

      var header = aMessage.split('\r\n\r\n')[0];
      var boundaryMatch = header.match(this.MULTIPART_ALTERNATIVE_MATCHER);
      this.log('boundaryMatch: ', boundaryMatch);
      if (!boundaryMatch)
        return bodiesWithTypes;

      var boundary = '--' + boundaryMatch[4];
      var lastPart = [];
      var checkPart = (function(aPart) {
        this.log('checkPart: ', aPart);
        var header = aPart.split('\r\n\r\n')[0];
        if (/^Content-Type:[^\r]+(\r\n [^\r]+)*name=.+/im.test(header) ||
            /^Content-Disposition:\s*attachment[^\r]+(\r\n [^\r]+)*filename.+/im.test(header))
          return; // ignore regular attachments

        var typeMatch = header.match(/^Content-Type:\s*([^\s]+)\s*/im);
        if (typeMatch) {
          let type = typeMatch[1];
          bodiesWithTypes[type] = bodiesWithTypes[type] || [];
          bodiesWithTypes[type].push(aPart);
        }
      }).bind(this);
      var inPreAlternativeParts = true;
      aMessage.split('\r\n').forEach((aLine) => {
        if (aLine != boundary) {
          lastPart.push(aLine)
          return;
        }
        if (inPreAlternativeParts) {
          inPreAlternativeParts = false;
        }
        else {
          checkPart(lastPart.join('\r\n'));
        }
        lastPart = [];
      });
      checkPart(lastPart.join('\r\n'));
      return bodiesWithTypes;
    },

    updateCurrentMessage : function(aContext) {
      this.log('updateCurrentMessage: ', aContext);
      return this.ensureCurrentMessageLoaded(aContext)
        .then((aContext) => {
          var message = aContext.message;
          message = this.cleanupMozHeaders(message);

          var updatedMessage = this.fixMultiplePlaintextBodies(message, aContext.bodies);
          if (updatedMessage == message)
            return;

          message = updatedMessage;
          message = this.markAsApplied(message);
          message = this.incrementDate(message, aContext.folder);

          var file = this.saveToTempFile(message);
          var replacer = new MessageReplacer(aContext);
          return replacer.replaceFromFile(file)
            .then((aContext) => {
              this.restoreState(aContext);
            });
        });
    },

    prepareMessage : function(aMessage, aCharset) {
      var converter = Cc['@mozilla.org/intl/scriptableunicodeconverter'].createInstance(Ci.nsIScriptableUnicodeConverter);
      var message = aMessage;
      if (aCharset) {
        converter.charset = aCharset;
        // hdr.Charset will not work with multipart messages, so we must try to extract the charset manually
      }
      else {
        try {
          let messageCut = aMessage.substring(aMessage.indexOf('charset=')+8, aMessage.indexOf('charset=')+35);
          let mailCharset = messageCut.match(/[^\s]+/).toString();
          mailCharset = mailCharset.replace(/\"/g, '');
          mailCharset = mailCharset.replace(/\'/g, '');
          converter.charset = mailCharset;
        }
        catch(e) {
          converter.charset = 'UTF-8';
        }
      }
      try {
        aMessage = converter.ConvertToUnicode(aMessage);
      }
      catch(e) {}
      aMessage = this.cleanCRLF(aMessage);
      try {
        aMessage = converter.ConvertFromUnicode(aMessage);
      }
      catch(e) {}
      return aMessage;
    },

    cleanCRLF : function(data) {
      /* This function forces all newline as CRLF; this is useful for some reasons
      1) this will make the message RFC2822 compliant
      2) this will fix some problems with IMAP servers that don't accept mixed newlines
      3) this will make easier to use regexps
      */
      var newData = data.replace(/\r/g, '');
      newData = newData.replace(/\n/g, '\r\n');
      return newData;
    },

    cleanupMozHeaders : function(aMessage) {
      // strips off some useless headers
      aMessage = aMessage.replace(/^From - .+\r\n/, '');
      aMessage = aMessage.replace(/X-Mozilla-Status.+\r\n/, '');
      aMessage = aMessage.replace(/X-Mozilla-Status2.+\r\n/, '');
      aMessage = aMessage.replace(/X-Mozilla-Keys.+\r\n/, '');
      return aMessage;
    },

    fixMultiplePlaintextBodies : function(aMessage, aBodies) {
      var allBodies = aBodies || this.collectSameTypeBodies(aMessage);
      Object.keys(allBodies).forEach((aType) => {
        var bodies = allBodies[aType];
        bodies.slice(1).forEach((aBody, aIndex) => {
          this.log('fixup body, before: ', aBody);
          var name = 'extra-body.' + (aIndex + 1) + '.txt';
          var updatedBody = aBody.replace(/^(Content-Type:\s*)([^\s]+)/im, '$1$2; name=' + name);
          updatedBody = 'Content-Disposition: attachment; filename=' + name + '\r\n' + updatedBody;
          this.log('fixup body, after: ', updatedBody);
          aMessage = aMessage.replace(aBody, updatedBody);
        });
      });
      // convert to regular multipart message
      aMessage = aMessage.replace(this.MULTIPART_ALTERNATIVE_MATCHER, '$1multipart/mixed$2');
      return aMessage;
    },

    markAsApplied : function(aMessage) {
      if (!Prefs.getBoolPref('extensions.rescue-conflicting-alternatives@clear-code.com.add_htl_header'))
        return aMessage;

      let now = new Date();
      let line = 'X-RescueConflictingAlt: applied - '+now.toString();
      line = line.replace(/\(.+\)/, '');
      line = line.substring(0, 75);
      if (aMessage.indexOf('\nX-RescueConflictingAlt: ') < 0)
        return aMessage.replace('\r\n\r\n','\r\n'+line+'\r\n\r\n');
      else
        return aMessage.replace(/\nX-RescueConflictingAlt: .+\r\n/,'\n'+line+'\r\n');
    },

    incrementDate : function(aMessage, aFolder) {
      let isImap = aFolder.server.type == 'imap';
      if (!isImap || !Prefs.getBoolPref('extensions.rescue-conflicting-alternatives@clear-code.com.use_imap_fix'))
        return aMessage;

      let date = this.getOrigDate(aMessage);
      // Some IMAP provider (for ex. GMAIL) doesn't register changes in sorce if the main headers
      // are not different from an existing message. To work around this limit, the "Date" field is
      // modified, if necessary, adding a second to the time (or decreasing a second if second are 59)
      let newDate = date.replace(/(\d{2}):(\d{2}):(\d{2})/, function (str, p1, p2, p3) {
        var z = parseInt(p3) + 1;
        if (z > 59) z = 58;
        if (z < 10) z = '0'+z.toString();
        return p1+':'+p2+':'+z
      });
      return aMessage.replace(date, newDate);
    },

    // parses headers to find the original Date header, not present in nsImsgDbHdr
    getOrigDate : function(aText) {
      var dateOrig = '';
      var splitted = null;
      try {
        var str_message = aText;
        // This is the end of the headers
        var end = str_message.search(/\r?\n\r?\n/);
        if (str_message.indexOf('\nDate') > -1 && str_message.indexOf('\nDate') < end) {
          splitted =str_message.split('\nDate:');
        }
        else if (str_message.indexOf('\ndate') > -1 && str_message.indexOf('\ndate') < end) {
          splitted =str_message.split('\ndate:');
        }
        if (splitted) {
          dateOrig = splitted[1].split('\n')[0];
          dateOrig = dateOrig.replace(/ +$/, '');
          dateOrig = dateOrig.replace(/^ +/, '');
        }
      }
      catch(e) {}
      return dateOrig;
    },

    saveToTempFile : function(aMessage) {
      // creates the temporary file, where the modified message body will be stored
      var tempFile = Cc['@mozilla.org/file/directory_service;1'].getService(Ci.nsIProperties).get('TmpD', Ci.nsIFile);
      tempFile.append('HT.eml');
      tempFile.createUnique(0, 0600);
      var foStream = Cc['@mozilla.org/network/file-output-stream;1'].createInstance(Ci.nsIFileOutputStream);
      foStream.init(tempFile, 2, 0x200, false); // open as "write only"
      foStream.write(aMessage, aMessage.length);
      foStream.close();
      return tempFile;
    },

    restoreState : function(aContext) {
      gDBView.selectMsgByKey(aContext.key); // select message with modified headers/source
      var hdr = aContext.folder.GetMessageHeader(aContext.key);
      if (hdr.flags & 2) {
        aContext.folder.addMessageDispositionState(hdr, 0); //set replied if necessary
      }
      if (hdr.flags & 4096) {
        aContext.folder.addMessageDispositionState(hdr, 1); //set fowarded if necessary
      }
    },

    // message listener
    onStartHeaders: function() {},
    onEndHeaders: function() {
      this.log('onEndHeaders');
      this.tryUpdateCurrentMessage();
    },
    onEndAttachments: function () {}
  };

  // appends "hdr", "folder", and "message" to the context
  function StreamMessageLoader(aURI, aContext) {
    this.URI = aURI;
    this.context = aContext || {};
  }
  StreamMessageLoader.prototype = {
    get messengerService() {
      if (this._messengerService)
        return this._messengerService;
      return this._messengerService = messenger.messageServiceFromURI(this.URI).QueryInterface(Ci.nsIMsgMessageService);
    },

    prepare : function() {
      this.context.hdr = this.messengerService.messageURIToMsgHdr(this.URI);
      this.context.folder = this.context.hdr.folder;
      return Promise.resolve(this.context);
    },

    loadHeaders : function() {
      return this.prepare().then((aContext) => {
        return new Promise((aResolve, aReject) => {
          this._resolverHeaders = aResolve;
          this._rejectorHeaders = aReject;
          this.messengerService.streamHeaders(this.URI, this, null, null, false, null);
        });
      });
    },

    loadAll : function() {
      return this.prepare().then((aContext) => {
        return new Promise((aResolve, aReject) => {
          this._resolverAll = aResolve;
          this._rejectorAll = aReject;
          this.messengerService.streamMessage(this.URI, this, null, null, false, null);
        });
      });
    },

    // streamMessage listener
    QueryInterface : function(iid)  {
      if (iid.equals(Ci.nsIStreamListener) ||
          iid.equals(Ci.nsISupports))
        return this;

      throw Components.results.NS_NOINTERFACE;
    },

    onStartRequest : function (aRequest, aContext) {
      if (this._resolverHeaders)
        this.context.headers = '';
      if (this._resolverAll)
        this.context.message = '';
    },

    onStopRequest : function (aRequest, aContext, aStatusCode) {
      RescueConflictingAlt.log('StreamMessageLoader.onStopRequest\n------\n' + this.context.message);
      if (this._resolverHeaders) {
        this._resolverHeaders(this.context);
        delete this._resolverHeaders;
        delete this._rejectorHeaders;
      }
      if (this._resolverAll) {
        this._resolverAll(this.context);
        delete this._resolverAll;
        delete this._rejectorAll;
      }
    },

    onDataAvailable : function (aRequest, aContext, aInputStream, aOffset, aCount) {
      var scriptStream = Cc['@mozilla.org/scriptableinputstream;1'].createInstance().QueryInterface(Ci.nsIScriptableInputStream);
      scriptStream.init(aInputStream);
      var data = scriptStream.read(scriptStream.available());
      if (this._resolverHeaders)
        this.context.headers += data;
      if (this._resolverAll)
        this.context.message += data;
    }
  };

  function MessageReplacer(aContext) {
    this.context = aContext || {};
  }
  MessageReplacer.prototype = {
    replaceFromFile : function(aFile) {
      let flags = this.context.hdr.flags;
      let keys = this.context.hdr.getStringProperty('keywords');

      // this is interesting: nsIMsgFolder.copyFileMessage seems to have a bug on Windows, when
      // the nsIFile has been already used by foStream (because of Windows lock system?), so we
      // must initialize another nsIFile object, pointing to the temporary file
      let fileSpec = Cc['@mozilla.org/file/local;1'].createInstance(Ci.nsIFile);
      fileSpec.initWithPath(aFile.path);

      let extService = Cc['@mozilla.org/uriloader/external-helper-app-service;1'].getService(Ci.nsPIExternalAppLauncher)
      extService.deleteTemporaryFileOnExit(fileSpec); // function's name says all!!!

      return new Promise((aResolve, aReject) => {
        this._resolver = aResolve;
        this._rejector = aReject;
        this._replaced = false;
        this._readyToFinish = false;
        let cs = Cc['@mozilla.org/messenger/messagecopyservice;1'].getService(Ci.nsIMsgCopyService);
        cs.CopyFileMessage(fileSpec, this.context.hdr.folder, null, false, flags, keys, this, msgWindow);
      });
    },

    tryResolve : function() {
      if (!this._replaced || !this._readyToFinish)
        return;
      this._resolver(this.context);
    },

    // copyFileMessage listener
    QueryInterface : function(iid) {
      if (iid.equals(Ci.nsIMsgCopyServiceListener) ||
          iid.equals(Components.interfaces.nsISupports))
        return this;

      throw Components.results.NS_NOINTERFACE;
    },
    GetMessageId: function (messageId) {},
    OnProgress: function (progress, progressMax) {},
    OnStartCopy: function () {},
    OnStopCopy: function (status) {
      if (status == 0) { // copy done
        let hdrs = Cc['@mozilla.org/array;1'].createInstance(Ci.nsIMutableArray);
        hdrs.appendElement(this.context.hdr, false);
        let noTrash = !Prefs.getBoolPref('extensions.rescue-conflicting-alternatives@clear-code.com.putOriginalInTrash');
        this.context.folder.deleteMessages(hdrs, null, noTrash, true, null, false);

        this._replaced = true;
        this.tryResolve();
      }
    },
    SetMessageKey: function (key) {
      this.context.key = key;
      // at this point, the message is already stored in local folders, but not yet in remote folders,
      // so for remote folders we use a folderListener
      if (this.context.folder.server.type == 'imap' || this.context.folder.server.type == 'news') {
        let watcher = new RemoteFolderWatcher(this.context);
        watcher.waitUntilAdded().then(() => {
          this._readyToFinish = true;
          this.tryResolve();
        });
      }
      else {
        setTimeout(() => {
          this._readyToFinish = true;
          this.tryResolve();
        }, 500);
      }
    }
  };

  // used just for remote folders
  function RemoteFolderWatcher(aContext) {
    this.context = aContext || {};
  }
  RemoteFolderWatcher.prototype = {
    waitUntilAdded : function() {
      return new Promise((aResolve, aReject) => {
        this._resolver = aResolve;
        this._rejector = aReject;
        Cc['@mozilla.org/messenger/services/session;1'].getService(Ci.nsIMsgMailSession).AddFolderListener(this, Ci.nsIFolderListener.all);
      });
    },

    // folder listener
    OnItemAdded: function(parentItem, item, view) {
      try {
        var hdr = item.QueryInterface(Ci.nsIMsgDBHdr);
      }
      catch(e) {
        return;
      }
      if (this.context.key == hdr.messageKey &&
          this.context.folder.URI == hdr.folder.URI) {
        this._resolver(this.context);
        // we don't need anymore the folderListener
        Cc['@mozilla.org/messenger/services/session;1'].getService(Ci.nsIMsgMailSession).RemoveFolderListener(this);
      }
    },
    OnItemRemoved: function(parentItem, item, view) {},
    OnItemPropertyChanged: function(item, property, oldValue, newValue) {},
    OnItemIntPropertyChanged: function(item, property, oldValue, newValue) {},
    OnItemBoolPropertyChanged: function(item, property, oldValue, newValue) {},
    OnItemUnicharPropertyChanged: function(item, property, oldValue, newValue){},
    OnItemPropertyFlagChanged: function(item, property, oldFlag, newFlag) {},
    OnItemEvent: function(folder, event) {}
  };

  aGlobal.RescueConflictingAlt = RescueConflictingAlt;

  window.addEventListener('DOMContentLoaded', function onDOMContentLoaded(aEvent) {
    gMessageListeners.push(RescueConflictingAlt);
    window.removeEventListener(aEvent.type, onDOMContentLoaded, false);
    RescueConflictingAlt.log('initialized');
  }, false);
})(this);
