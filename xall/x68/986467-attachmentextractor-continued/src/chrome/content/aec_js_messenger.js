/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

try {
  if (typeof Cc === "undefined") var Cc = Components.classes;
  if (typeof Ci === "undefined") var Ci = Components.interfaces;
  if (typeof Cr === "undefined") var Cr = Components.results;
} catch (e) {}

var {
  Services
} = ChromeUtils.import("resource://gre/modules/Services.jsm");

var aeMessenger = {

  /* **************** message text saving *********************** */
  // used to save message text in HTML file
  saveMessageToDisk: function(message, file) {
    var messageUri = message.folder.getUriForMsg(message);
    var msgService = aewindow.messenger.messageServiceFromURI(messageUri);
    var saveListener = new aeSaveMsgListener(file, aewindow.messenger, "",
      "doAfterActions(aewindow.progress_tracker.message_states.CLEARTAG)", null,
      aewindow, 0);
    
    messageUri = messageUri + "?header=saveas";

    saveListener.m_channel = Cc["@mozilla.org/network/input-stream-channel;1"]
      .createInstance(Ci.nsIInputStreamChannel);
    
    var url = {};
    url = Cc["@mozilla.org/network/io-service;1"].getService(
      Ci.nsIIOService).newURI(messageUri, null, null);
    aedump("// messageUri: " + messageUri + ", url: " + url.spec + "\n");
    saveListener.m_channel.setURI(url);
    var streamConverterService = Cc["@mozilla.org/streamConverters;1"]
      .getService(Ci.nsIStreamConverterService);
    var convertedListener = streamConverterService.asyncConvertData(
      "message/rfc822", "text/html", saveListener, saveListener.m_channel);
    if (aewindow.currentTask.isExtractEnabled) saveListener.postFunc =
      aewindow.currentTask.currentMessage.postProcessMessage;
    var o = new Object();
    msgService.DisplayMessage(messageUri, convertedListener, 
      aewindow.msgWindow, saveListener, false, o);
    //aedump("//"+msgService.streamMessage(messageUri, saveListener, aewindow.msgWindow, saveListener, false,"saveas").spec+"\n");
  },

  // used in AEMessage.prototype.saveAtt
  saveExternalAttachment: function(uri, file, attachmentindex) {
    aedump = aewindow.aedump;
    //aedump(">> "+uri+"\n");
    uri = Cc["@mozilla.org/network/io-service;1"].getService(
      Ci.nsIIOService).newURI(uri, null, null);
    if (uri.schemeIs(
      "file")) { //make sure file exists or saveUri below fails.
      if (!(uri.QueryInterface(Ci.nsIFileURL).file).exists())
      return null;
    }
    var persist = Cc["@mozilla.org/embedding/browser/nsWebBrowserPersist;1"]
      .createInstance(Ci.nsIWebBrowserPersist);
    persist.progressListener = {
      index: attachmentindex,
      ptracker: aewindow.progress_tracker,
      m_file: file,
      realFileName: file.leafName,
      onProgressChange: function(aWebProgress, aRequest, aCurSelfProgress,
        aMaxSelfProgress, aCurTotalProgress, aMaxTotalProgress) {
        if (this.ptracker) this.ptracker.set_file_progress(
          aCurSelfProgress, aMaxSelfProgress);
      },
      onStateChange: function(aWebProgress, aRequest, aStatus, aMessage) {
        //aedump("// "+aStatus+"\n");
        /*if (aStatus & 0x00000001 && this.ptracker)*/
        if (aStatus & 0x00000010) {
          //if (this.ptracker) this.ptracker.set_file_progress(-1,0);
          this.ptracker = null;
          try {
            this.m_file.moveTo(null, this.realFileName);
          } catch (e) {
            aedump(e);
          }
          if (typeof aewindow === "object") aewindow.currentTask
            .currentMessage.saveAtt_cleanUp(this.index, false);
        }
      },
      onStatusChange: function(aWebProgress, aRequest, aStatus,
      aMessage) {
        /*aedump("// "+aStatus+"\n",3);*/ }
    };
    file.leafName += "~~~";
    persist.saveURI(uri, null, null, null, "", file);
    return persist;
  },

};

// Now only (?) used for function saveMessageToDisk() (message content to a HTML file)
function aeSaveMsgListener(m_file, m_messenger, m_contentType, afterAction, afterActionAttachmentindex,
  aewindow) {
  var aedump = aewindow.aedump;

  var mProgress = 0;
  var mContentLength = -1;
  var mCanceled = false;
  var mInitialized = false;
  var m_outputStream = (m_file) ? Cc[
    "@mozilla.org/network/file-output-stream;1"].createInstance(Ci
    .nsIFileOutputStream) : null;
  this.postFunc = null;
  var storage = "";
  this.m_channel = null;

  if (m_file) {
    var realFileName = m_file.leafName;
    m_file = m_file.clone();
    m_file.leafName += "~~~"; //use temp file.
  }
  //var mTransfer; // not used at the moment. keep because may in the future.
  var that = this;

  this.QueryInterface = function(iid) {
    if ((iid === Ci.nsIStreamListener) ||
      (iid === Ci.nsIUrlListener) ||
      (iid === Ci.nsICancelable) ||
      (iid === Ci.nsISupports) ||
      (iid === Ci.nsIMsgCopyServiceListener) ||
      (iid === Ci.nsIRequestObserver))
      return this;
    throw Cr.NS_NOINTERFACE;
  };

  this.cancel = function(status) {
    aedump("{function:aeSaveMsgListener.Cancel}\n", 2);
    mCanceled = true;
  }

  this.OnStartRunningUrl = function(url) {}

  this.OnStopRunningUrl = function(url, exitCode) {
    aedump("{function:aeSaveMsgListener.OnStopRunningUrl}\n", 2);
    try {
      if (m_outputStream) {
        m_outputStream.flush();
        m_outputStream.close();
      }
      if (exitCode !== 0) {
        if (m_file) m_file.remove(false);
        alert(aewindow.messengerStringBundle.GetStringFromName(
          "saveMessageFailed"));
      }
    } catch (e) {
      aedump(e);
    }
    this.finish();
  }

  this.OnStartCopy = function(v) {
    aedump("{function:OnStartCopy(" + argexpand(arguments) + ")}\n", 4);
  }
  this.OnProgress = function(aProgress, aProgressMax) {
    aedump("{function:OnProgress(" + argexpand(arguments) + ")}\n", 4);
  }
  this.SetMessageKey = function(aKey) {
    aedump("{function:SetMessageKey(" + argexpand(arguments) + ")}\n", 4);
  }
  this.GetMessageId = function(aMessageId) {
    aedump("{function:GetMessageId(" + argexpand(arguments) + ")}\n", 4);
  }
  this.OnStopCopy = function(aStatus) {
    aedump("{function:OnStopCopy(" + argexpand(arguments) + ")}\n", 4);
  }

  // for OSX, sets creator flags on the output file
  function initializeDownload(aRequest, aBytesDownloaded) {
    aedump("{function:aeSaveMsgListener.initializeDownload}\n", 2);
    mInitialized = true;
    if (that.postFunc) aedump("// using a post-save function\n", 4);
    var channel = aRequest.QueryInterface(Ci.nsIChannel);
    if (!channel) return;
    //aedump("// channel contentLength: "+channel.contentLength+"\n",3);

    if (mContentLength === -1) mContentLength = channel.contentLength;
    if (!m_contentType || m_contentType === "") return;

    // if we are saving an appledouble or applesingle attachment, we need to use an Apple File Decoder 
    if (navigator.appVersion.indexOf("Macintosh") !== -1) {
      var mimeinfo = Cc["@mozilla.org/mime;1"].getService(Ci.nsIMIMEService)
        .getFromTypeAndExtension(m_contentType, "");
      if (m_contentType === "application/applefile" || m_contentType ===
        "multipart/appledouble") {
        var appleFileDecoder = Cc["@mozilla.org/applefiledecoder;1"]
          .createInstance(Ci.nsIAppleFileDecoder);
        if (appleFileDecoder) {
          appleFileDecoder.initialize(m_outputStream, m_file);
          m_outputStream = appleFileDecoder;
        }
      } else if (mimeinfo && mimeinfo.macType && mimeinfo.macCreator) {
        // nsILocalFile has been replaced by nsIFile, but nsILocalFileMac seems still to be okay ?
        // var macFile = m_file.QueryInterface(Ci.nsIFileMac);
        var macFile = m_file.QueryInterface(Ci.nsILocalFileMac);
        if (macFile) {
          macFile.setFileCreator(mimeinfo.macCreator);
          macFile.setFileType(mimeinfo.macType);
        }
      }
    }
  }

  // Thunderbird 60:
  // this.onStartRequest = function(request, aSupport) {
  // Thunderbird 68:
  this.onStartRequest = function(request) {
    aedump("{function:aeSaveMsgListener.OnStartRequest}\n", 2);

    if (!m_outputStream) {
      mCanceled = true;
      aedump("AEC: mCanceled=true {function:aeSaveMsgListener.OnStartRequest}\n",2);
      m_messenger.alert(aewindow.messengerStringBundle.GetStringFromName(
        "saveAttachmentFailed"));
    } else {
      m_outputStream.init(m_file, -1, 00600, 0);
      var bufferedStream = Cc["@mozilla.org/network/buffered-output-stream;1"]
        .createInstance(Ci.nsIBufferedOutputStream);
      bufferedStream.init(m_outputStream, 4096);
      m_outputStream = bufferedStream;
    }
  }

  // Thunderbird 60:
  // this.onStopRequest = function(request, aSupport, status) {
  // Thunderbird 68:
  this.onStopRequest = function(request, status) {
    aedump("{function:aeSaveMsgListener.OnStopRequest}\n", 2);
    try { // close down the file stream 
      if (m_outputStream) {
        if (that.postFunc) {
          storage = that.postFunc.apply(null, [storage]);
          m_outputStream.write(storage, storage.length);
        }
        m_outputStream.flush();
        m_outputStream.close();
      }
      /*
    if (mTransfer) {
      mTransfer.onProgressChange(null, null, mContentLength, mContentLength, mContentLength, mContentLength);
      mTransfer.onStateChange(null, null, nsIWebProgressListener.STATE_STOP, 0);
      mTransfer = null; // break any circular dependencies between the progress dialog and use
      }
    */
    } catch (e) {
      aedump(e);
    }
    this.finish();
  }

  this.onDataAvailable = 
    // Thunderbird 60:
    // function(request, aSupport, inStream, srcOffset, count) {
    // Thunderbird 68:
    function(request, inStream, srcOffset, count) {
        //aedump("{function:aeSaveMsgListener.OnDataAvailable}\n",4);
    if (mCanceled) request.cancel(2); // then go cancel our underlying channel too.  
                                      // NS_BINDING_ABORTED =2 apparently.
    if (!mInitialized) initializeDownload(request, count);
    try {
      if (m_outputStream) {
        mProgress += count;
        if (that.postFunc) {
          var sis = Cc["@mozilla.org/scriptableinputstream;1"].createInstance(
            Ci.nsIScriptableInputStream);
          sis.init(inStream);
          storage += sis.read(sis.available());
          var sis = null;
        } else {
          m_outputStream.writeFrom(inStream, inStream.available());
        }
        /*if (aewindow.progress_tracker) aewindow.progress_tracker.set_file_progress(mProgress,mContentLength);*/
        /*
      if (mTransfer) mTransfer.OnProgressChange(null, request, mProgress, mContentLength, mProgress, mContentLength);
    */
      }
    } catch (e) {
      aedump(e);
      this.cancel();
    }
  }

  this.finish = function() {
    aedump("{function:aeSaveMsgListener.finish}\n", 2);

    if (!m_file || !m_file.exists()) return;

    // rename temp file to actual filename.
    // this last part is necessary to rename the saved message HTML file
    // from tmp file to actual filename
      try {
        m_file.moveTo(null, realFileName);
        m_file = null;
      } catch (e) {
        aedump("m_file: " + m_file.leafName + ";realFileName: " +
          realFileName + "; " + e + "\n");
      }

    if (afterAction) {
      aedump("{function:aeSaveMsgListener.finish -- afterAction}\n", 2);

      switch (afterAction) {
        case "doAfterActions(aewindow.progress_tracker.message_states.CLEARTAG)":
          aewindow.currentTask.currentMessage.doAfterActions(aewindow.progress_tracker.message_states.CLEARTAG)
          break;
        case "saveAtt_cleanUp":
          aewindow.currentTask.currentMessage.saveAtt_cleanUp(afterActionAttachmentindex,false)
          break;
      }

      afterAction = null;
    }
  }
}
