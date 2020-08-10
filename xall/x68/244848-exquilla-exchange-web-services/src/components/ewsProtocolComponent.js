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

// Implements soap request, transitioning from msqEwsProtocol.cpp

const { classes: Cc, Constructor: CC, interfaces: Ci, utils: Cu, Exception: CE, results: Cr, } = Components;
var { XPCOMUtils } = ChromeUtils.import("resource://gre/modules/XPCOMUtils.jsm");
ChromeUtils.defineModuleGetter(this, "Utils",
  "resource://exquilla/ewsUtils.jsm");
ChromeUtils.defineModuleGetter(this, "Services",
  "resource://gre/modules/Services.jsm");
ChromeUtils.defineModuleGetter(this, "MailServices",
  "resource:///modules/MailServices.jsm");

Cu.importGlobalProperties(["DOMParser"]);
var _log = null;
XPCOMUtils.defineLazyGetter(this, "log", () => {
  if (!_log) _log = Utils.configureLogging("base");
  return _log;
});

// Protocol types
const EPT_BODY = 0;              // just need the body, no attachments or headers
const EPT_EWSATTACHMENT = 1;     // attachment content using EWS
const EPT_HEADERS = 2;           // forward message, headers only
const EPT_FULLMESSAGE = 3;
const EPT_BODYHEADERS = 4;       // Body and headers
const EPT_MIMECONTENT = 5;       // Get raw mime content from EWS
const EPT_SAVEMESSAGE = 6;       // Save message as a mime file
const EPT_FILTER = 7;            // Use raw internet headers (for filtering or spam detection)
const EPT_MIMEMESSAGE = 8;       // Use raw MIME processed through a MIME converter
const EPT_MIMEATTACHMENT = 9;    // Attachment using MIME processing
const EPT_PRINT = 10;            // header=print

// States for the protocol listener
const PT_INITIAL = 0;
const PT_WAIT_BODY = 1;
const PT_WAIT_ATTACHMENT = 2;
const PT_WAIT_ATTACHMENT_EMBEDDED = 3;
const PT_WAIT_MIME = 4;
const PT_ERROR = 5;

const ATTACHMENT_QUERY = "part=1.";

// utility functions

function createAttachmentSpec(nativeAttachment, attachmentIndex, messageSpec)
{
  let attachmentSpec = "";
  let attachmentName = nativeAttachment.name;

  if (!nativeAttachment.isFileAttachment)
  {
    log.config("Found item attachment, treating as .eml");
    attachmentName += ".eml";
  }

  // purge the existing query, and replace it with the attachment query and number
  let attachmentURL = messageSpec;
  let queryStart = messageSpec.indexOf('?');
  if (queryStart != -1)
    attachmentURL = messageSpec.substr(0, queryStart);

  let keyStr = getQueryVariable("number", messageSpec);
  // the body is the 1st part, the 0th attachment is the 2nd part
  attachmentURL += `?part=1.${(attachmentIndex + 2)}` +
                   `&number=${keyStr}` +
                   `&type=${nativeAttachment.contentType}` +
                   `&filename=${encodeURIComponent(attachmentName)}`;
  return attachmentURL;
}

// Constructor
function EwsProtocolConstructor() {
}

// Main class.
var global = this;
function EwsProtocol() {
  if (typeof (safeGetJS) == "undefined")
    Utils.importLocally(global);
// Typical boilerplate to include in all implementations.

  // Object delegating method calls to the appropriate XPCOM object.
  // Weak because it owns us.
  this._loadFlags = 0;
  this._contentDisposition = Ci.nsIChannel.DISPOSITION_INLINE;
  // attachment ids of embedded attachments needed to download
  this._embeddedAttachmentIds = [];
  this._downloadingEmbeddedContent = false;
  this._loadGroup = null;
  this._loadFlags = 0;
  this._channelListener = null;
  this._originalURI = null;
  this._notificationCallbacks = null;
  this._owner = null;
  this._contentDispositionFilename = null;
  this._contentDispositionHeader = null;
}

EwsProtocol.Properties = {

  baseInterfaces:     [ Ci.nsIChannel,
                        Ci.nsIRequest,
                        Ci.nsIMsgHeaderSink,
                        Ci.nsIStreamListener,
                        Ci.nsIRequestObserver,
                        Ci.nsITimerCallback,
                        Ci.nsIPrivateBrowsingChannel,
                        Ci.nsISupports,
                        ],

  classDescription:   "ExQuilla Protocol",
};

EwsProtocol.prototype = {
  // Used to access an instance as JS, bypassing XPCOM.
  get wrappedJSObject() {
    return this;
  },
  QueryInterface: ChromeUtils.generateQI(EwsProtocol.Properties.baseInterfaces),
  classID:        Components.ID("{27554DDD-EB22-45fd-B836-F8B8F5E9D61B}"),

  // Used to access an instance as JS, bypassing XPCOM.
  get wrappedJSObject() {
    return this;
  },

  // Implementation in JS  (if any) of methods in XPCOM interfaces.

  // nsIRequest

  get name() {
    if (this._URI)
      return this._URI.spec;
    return "";
  },
  isPending() { return !!this._channelListener;},
  get status() { return Cr.NS_OK;},
  cancel(a) { this._canceled = true; return Cr.NS_OK;}, // called by nsMessengerContentHandler
  suspend() { return Cr.NS_ERROR_NOT_IMPLEMENTED;},
  resume() { return Cr.NS_ERROR_NOT_IMPLEMENTED;},
  get loadGroup() { return this._loadGroup;},
  set loadGroup(a) { this._loadGroup = a;},
  get loadFlags() { return this._loadFlags;},
  set loadFlags(a) { this._loadFlags = a;},
  getTRRMode() { return Ci.nsIRequest.TRR_DEFAULT_MODE;},
  setTRRMode() { throw Cr.NS_ERROR_NOT_IMPLEMENTED;},

  // nsIChannel

  get originalURI() { return this._originalURI || this._URI;},
  set originalURI(a) { this._originalURI = a;},

  get URI() { return this._URI; },
  setURI(a) { this._URI = a; },

  get owner() { return this._owner;},
  set owner(a) { this._owner = a;},

  get notificationCallbacks() { return this._notificationCallbacks;},
  set notificationCallbacks(a) { this._notificationCallbacks = a;},

  get securityInfo() { return null;},

  get contentType() {
    if (!this._contentType)
      return "text/plain; charset=UTF-8";
    return this._contentType;
  },
  set contentType(a) {
    this._contentType =
      Services.netUtils.parseRequestContentType(a, {}, {});
  },

  get contentCharset() { return "UTF-8";},
  set contentCharset(a) { 
    if (a != "UTF-8")
      log.config("Trying to set character set to " + a);
  },

  get contentLength() { return this._contentLength;},
  set contentLength(a) { this._contentLength = a;},

  open() {
    let streamListener = Cc["@mozilla.org/network/sync-stream-listener;1"]
                           .createInstance(Ci.nsISyncStreamListener);
    let stream = streamListener.inputStream;
    this.asyncOpen(streamListener, null);
    let n = stream.available;
    return stream;
  },

  _canceled: false,
  get canceled() { return this._canceled;},

  get contentDisposition() { return this._contentDisposition;},
  set contentDisposition(a) { this._contentDisposition = a;},

  get contentDispositionFilename() { return this._contentDispositionFilename;},
  set contentDispositionFilename(a) { this._contentDispositionFilename = a;},

  get contentDispositionHeader() { return this._contentDispositionHeader;},

  get loadInfo() { return this._loadInfo;},
  set loadInfo(a) { this._loadInfo = a;},

  // EwsEventListener implementation

  onEvent(aItem, aEvent, aData, aResult)
  {
    let attachment;
    let resultText = ""; // setting this implies an error
    let mailnewsUrl = (this._URI instanceof Ci.nsIMsgMailNewsUrl) ? this._URI : null;
    let haveStartRequest = false;
    try { // no indent

    // machine fault handling
    if (aEvent == ("MachineError"))
    {
      log.info("ewsProtocol.onEvent machine error");
      let ewsServer = safeGetJS(mailnewsUrl.server, "EwsIncomingServer");
      ewsServer.processFault(aItem, aEvent, aData, aResult);
      return;
    }

    if (aEvent == ("Notify"))
    {
      do // error handling loop
      {
        // this is the startup.
        if (!this._item) {
          resultText = ("Missing item");
          break;
        }
        log.debug("Protocol event Notify: Mime Protocol Type is " + this._protocolType);
        let properties = this._item.properties;
        if (!properties)
        {
          log.info("property list missing from item");
          let folderId = this._item.folderId;
          if (!folderId)
          {
            // We get here as a result of bug 1123, which created dirty items but with
            //  no folder id. I'll try to fix that here by forcing a resync.
            if (!mailnewsUrl) {
              resultText = "Missing mailnewsURL";
              break;
            }
            let ewsFolder = safeGetJS(mailnewsUrl.folder, "EwsMsgFolder");
            if (!ewsFolder) {
              resultText = ("Could not get msgFolder");
              break;
            }
            folderId = ewsFolder.folderId;
            if (!folderId) {
              resultText = "Could not get folderId";
              break;
            }
            // Why can't I just set the folderId? That must be better than
            //  possible repeated resyncs!
            this._item.folderId = folderId;
            log.warn("Item had null folderId, so we set it from the URL");
          }

          if (folderId)
          {
            this._item.raiseFlags(this._item.Dirty);
            this._item.persist();
            log.error("Setting item dirty and aborting protocol");
          }
          // otherwise what to do? We have an irrecoverably bad item
          else
            log.error("item is bad and we cannot fix it");
          resultText = "Aborted protocol, missing folderId";
          break; // to exit protocol
        }

        switch (this._protocolType)
        {
          case EPT_BODY:
          case EPT_FULLMESSAGE:
          case EPT_BODYHEADERS:
          case EPT_PRINT:
          case EPT_FILTER:
            this._state =  PT_WAIT_BODY;
            return this._mailbox.getItemBody(this._item, this);

          case EPT_MIMECONTENT:
          case EPT_SAVEMESSAGE:
          case EPT_MIMEMESSAGE:
          case EPT_MIMEATTACHMENT:
          {
            if (this._protocolType == EPT_MIMEATTACHMENT)
            {
              // get the type from the spec
              this.contentType = getQueryVariable("type", this._URI.spec);
            }
            else
              this.contentType = "message/rfc822";

            this._state = PT_WAIT_MIME;
            // Do we need to get MIME content?
            if (!this._item.mimeContent)
            {
              this._mailbox.getItemMimeContent(this._item, this);
              return;
            }

            this.onEvent(null, "FakeStartMachine", null, Cr.NS_OK);
            this.onEvent(null, "FakeStopMachine", null, Cr.NS_OK);
            return;
          }

          case EPT_EWSATTACHMENT:
          {
            //
            // Attachment Handling
            //

            // get the attachment sequence number
            let part = getQueryVariable("part", this._URI.spec);
            // query looks like part=1.3 for attachment 1;
            let attachmentNumber = parseInt(part.substr(2), 10);
            if (isNaN(attachmentNumber) || attachmentNumber < 2) {
              resultText = "Failed to parse attachment number";
              break;
            }
            attachmentNumber -= 2;

            let attachment = this._item.getAttachmentByIndex(attachmentNumber);
            if (!attachment) {
              resultText = "Could not get expected attachment";
              break;
            }

            this._state = PT_WAIT_ATTACHMENT;
            // If the attachment has already been downloaded, then we can use the cached copy
            if (attachment.downloaded)
            {
              // Setting this seems to mess up fake email Calendar item attachment opening, but
              //  not setting it messes up open attachments on Ubuntu. Let me revert to setting
              //  and then fix any fallout for Itip messages in Calendar.
              this.contentType = attachment.contentType;

              log.debug("attachment already downloaded with contentType " + attachment.contentType);
              this.onEvent(null, "FakeStartMachine", null, Cr.NS_OK);
              this.onEvent(null, "FakeStopMachine", attachment, Cr.NS_OK);
              return;
            }

            // the soap request will create a unique file if needed
            this._mailbox.getAttachmentContent(attachment, this);
            return;
          }

          default:
            resultText = "Unimplemented or unknown protocol type";
            break;
        } // end of protocol type switch
      } while (false); // end of error loop
    } // end of Notify state

    else if (aEvent == ("StopMachine") || aEvent == ("FakeStopMachine"))
    {
      do {
        if (aResult != Cr.NS_OK) {
          resultText = "SOAP call failed to get body";
          break;
        }
        if (!this._item) {
          resultText = "Native item not initialized";
          break;
        }

        switch (this._state)
        {
          case PT_WAIT_BODY:
          {
            let fakeHeaders = "MIME-Version: 1.0\r\n";
            let body = this._item.body;

            // I had hoped to rewrite the spec right here, but unfortunately content policy is blocking
            //  my exquilla spec from being loaded in the doc shell. (See my bug 764987). So what I have
            //  to do is to download embedded content before I can return with the body.
            let flags = this._item.flags;
            let outputHtml = (flags & this._item.BodyIsHtml);
            if (outputHtml)
            {
              let [changed, rewrite] = this._rewriteCid(body, this._item);
              if (changed)
                body = rewrite;
              if (this._embeddedAttachmentIds.length && !this._downloadingEmbeddedContent)
              {
                this._downloadingEmbeddedContent = true;
                this._state = PT_WAIT_ATTACHMENT_EMBEDDED;
                this.onEvent(aItem, "FakeStopMachine", aData, Cr.NS_OK);
                return;
              }
              this.contentType = "text/html";
            }
            else
            {
              this.contentType = "text/plain; charset=UTF-8";
            }

            this.onStartRequest(this);
            haveStartRequest = true;

            let properties = this._item.properties;
            if (!properties) {
              resultText = "Could not get item properties";
              break;
            }

            // header handling

            if (this._protocolType == EPT_HEADERS ||
                this._protocolType == EPT_FULLMESSAGE ||
                this._protocolType == EPT_BODYHEADERS ||
                this._protocolType == EPT_PRINT ||
                this._protocolType == EPT_FILTER)
            {
              if (this._protocolType == EPT_FILTER)
              {
                // We will output the raw internet headers
                let headersArray = properties.getPropertyLists("InternetMessageHeaders/InternetMessageHeader");
                // Internet headers are always missing for Sent Items
                for (let headerPL of headersArray || [])
                {
                  let name = headerPL.getAString("$attributes/HeaderName");
                  let value = headerPL.getAString("$value");
                  // We will not output content- headers, since we will be outputting
                  //  the content ourselves in our own format
                  if (name.toLowerCase().indexOf("content-") != -1)
                  {
                    continue;
                  }
                  fakeHeaders += name + ": " + value + "\r\n";
                }
              }
              else
              {
                // We will generate headers from the native properties
                fakeHeaders += plToHeaders(properties);
              }
            }

            // We'll have to insert these headers into a simulated RS822 message
            let boundaryID;
            let hasAttachments = properties.getBoolean("HasAttachments");
            let showAttachments = hasAttachments && !this._msgHeaderSink &&
                                                    (this._protocolType == EPT_FULLMESSAGE ||
                                                     this._protocolType == EPT_FILTER ||
                                                     this._protocolType == EPT_PRINT ||
                                                     this._protocolType == EPT_BODYHEADERS);
            if (showAttachments)
            {
              // attachment handling
              // setup as multipart/mixed
              boundaryID = generateRandomString(48);
              fakeHeaders += 'Content-Type: multipart/mixed;\r\n boundary="'
                             + boundaryID
                             + '"\r\n' // end of header
                             + '\r\n'  // end of headers
                             + '--' + boundaryID + '\r\n';
            }

            // output the body (including simulated headers)
            fakeHeaders += "Content-Type: " +
                           (outputHtml ? "text/html" : "text/plain") +
                           "; charset=UTF-8\r\n\r\n";

            if (this._protocolType == EPT_FULLMESSAGE ||
                this._protocolType == EPT_BODY ||
                this._protocolType == EPT_BODYHEADERS ||
                this._protocolType == EPT_PRINT ||
                this._protocolType == EPT_FILTER)
            {
              fakeHeaders += body + "\r\n";
            }

            if (showAttachments)
            {
              // We'll output attachments to the fake header
              fakeHeaders += this._processAttachments(properties, boundaryID);
            }

            let inputStream = inputStreamFromString(fakeHeaders);
            this.onDataAvailable(this, inputStream, 0, inputStream.available());
            inputStream.close();
            break;
          }

          case PT_WAIT_ATTACHMENT_EMBEDDED:
          {
            let attachmentId;
            while ( (attachmentId = this._embeddedAttachmentIds.shift()) )
            { // loop to continue after error
              let attachment = this._item.getAttachmentById(attachmentId);
              if (!attachment)
              {
                log.warn("Native attachment claimed an embedded attachment exists, but could not find it");
                continue;
              }
              this._mailbox.getAttachmentContent(attachment, this);
              return;
            }
            this._state = PT_WAIT_BODY;
            this.onEvent(aItem, "FakeStopMachine", aData, Cr.NS_OK);
            return;
          }

          case PT_WAIT_MIME:
          {
            // This is the kickoff to a message copy. A failed copy init only rears its ugly head as an error return here.
            let isOk = true;
            try {
              this.onStartRequest(this);
            } catch (e) {log.warn(e); isOk = false;}
            haveStartRequest = true;
            if (!isOk) {
              resultText = "OnStartRequest returned failure, maybe we failed trying to begin a copy";
              break;
            }
            let mimeContent = this._item.mimeContent;
            if (!mimeContent) {
              resultText = "mime content is empty";
              break;
            }
            switch (this._protocolType)
            {
              // process mime content if required
              case EPT_MIMECONTENT:
              case EPT_MIMEMESSAGE:
              case EPT_MIMEATTACHMENT:
              {
                let inputStream = inputStreamFromString(mimeContent);
                this.onDataAvailable(this, inputStream, 0, inputStream.available());
                inputStream.close();
                break; // from switch
              }

              case EPT_SAVEMESSAGE:
              {
                let messageUrl = this._URI.QueryInterface(Ci.nsIMsgMessageUrl);
                let file = messageUrl.messageFile;
                if (!file) {
                  resultText = ("File not set");
                  break;
                }
                if (!file.exists())
                {
                  file.create(Ci.nsIFile.NORMAL_FILE_TYPE, parseInt("600", 8));
                }
                if (!file.exists()) {
                  resultText = "Message file could not be created";
                  break;
                }

                // create output stream:
                let stream = Cc["@mozilla.org/network/file-output-stream;1"]
                                .createInstance(Ci.nsIFileOutputStream);
                stream.init(file, -1, 0o600, 0);
                utfStringToStream(mimeContent, stream);
                stream.close();
                // this silliness is because Windows nsILocalFile caches its file size
                // so if an output stream writes to it, it will still return the original
                // cached size.
                file = file.clone();
                messageUrl.messageFile = file;
                // TODO: listener calls ?
                break; // from switch
              }

              default:
              {
                resultText = "Unexpected protocol state";
                break;
              }
            } // end of mProtocolState switch
            break; // to done
          }

          case PT_WAIT_ATTACHMENT:
          {
            let attachment = aData.EwsNativeAttachment;
            if (!attachment) {
              resultText = "Attachment missing from response";
              break;
            }

            // Setting this seems to mess up fake email Calendar item attachment opening, but
            //  not setting it messes up open attachments on Ubuntu. Let me revert to setting

            //  and then fix any fallout for Itip messages in Calendar.
            this.contentType = attachment.contentType;

            // The attachment is stored in a file. Stream that file to the channel listener.
            let attachmentFile = Services.io.newURI(attachment.fileURL, null, null)
                                         .QueryInterface(Ci.nsIFileURL)
                                         .file;

            if (!attachmentFile.exists() || !attachmentFile.fileSize) {
              resultText = "Attachment file does not exist or is empty";
              break;
            }
            this.contentLength = attachmentFile.fileSize;

            // if we are set up as a channel, we should notify our channel listener that we are starting...
            // so pass in ourself as the channel and not the underlying socket or file channel the protocol
            // happens to be using.
            //
            // It's tacky to do this so late, but we must have the content type set correctly before
            //  we do this. Got attachments though we could do it earlier if we wanted
            //
            if (!haveStartRequest) {
              this.onStartRequest(this);
              haveStartRequest = true;
            }

            let fstream = Cc["@mozilla.org/network/file-input-stream;1"]
                            .createInstance(Ci.nsIFileInputStream);
            fstream.init(attachmentFile, -1, 0, 0);

            this.onDataAvailable(this, fstream, 0, fstream.available());
            fstream.close();

            break;
          }
        } // end of protocol type loop
      } while (false); // end of error management loop

      // Only get here if all done (possibly with an error)
      if (!haveStartRequest)
        this.onStartRequest(this);
      this.onStopRequest(this, resultText ? Cr.NS_ERROR_FAILURE : Cr.NS_OK);
    } // end of StopMachine state

    return;
      /**/
    } catch (e) {
      if (!resultText)
        resultText = "Error thrown in ews protocol event listener: ";
      resultText += se(e);
    }

    // We should only end up here if we are all done (possibly with an error)
    if (resultText)
      log.warn(resultText);
    if (!haveStartRequest)
      this.onStartRequest(this);
    this.onStopRequest(this, resultText ? Cr.NS_ERROR_FAILURE : Cr.NS_OK);
    return;

  },

  // nsIMsgHeaderSink implementation

  processHeaders(aHeaderNames, aHeaderValues, dontCollectAddress) {
    if (this._msgHeaderSink)
      this._msgHeaderSink.processHeaders(aHeaderNames, aHeaderValues, dontCollectAddress);
  },

  handleAttachment(contentType, url, displayName, uri, aNotDownloaded) {
    if (this._msgHeaderSink)
      this._msgHeaderSink.handleAttachment(contentType, url, displayName, uri, false);
  },

  addAttachmentField(field, value) {
    throw Cr.NS_ERROR_NOT_IMPLEMENTED;
  },

  onEndAllAttachments() {
    if (this._msgHeaderSink)
    {
      if (this._protocolType != EPT_MIMEMESSAGE)
      {
        // process headers from the native message
        let resultText = "";
        do
        {
          if (!this._item) {
            resultText = "Missing item";
            break;
          }
          let properties = this._item.properties;
          if (!properties) {
            resultText = "Item has no properties";
            break;
          }
          this._processAttachments(properties, "");
        } while (false);
        if (resultText)
          log.error("protocol Error In Get Body: " + resultText);
      }
      this._msgHeaderSink.onEndAllAttachments();
    }
  },

  onEndMsgHeaders(url) {
    if (this._msgHeaderSink)
      this._msgHeaderSink.onEndMsgHeaders(url);
  },

  onEndMsgDownload(url) {
    if (this._msgHeaderSink)
      this._msgHeaderSink.onEndMsgDownload(url);
  },

  get securityInfo() { return null;},

  set securityInfo(a) {
    if (this._msgHeaderSink)
      this._msgHeaderSink.securityInfo = a;
  },

  onMsgHasRemoteContent(aMsgHdr, aContentURI) {
    if (this._msgHeaderSink)
      this._msgHeaderSink.onMsgHasRemoteContent(aMsgHdr, aContentURI);
  },

  get dummyMsgHeader() {
    if (this._msgHeaderSink)
      return this._msgHeaderSink.dummyMsgHeader;
    return null;
  },

  get properties() {
    if (this._msgHeaderSink)
      return this._msgHeaderSink.properties;
    return null;
  },

  resetProperties() {},

  // nsIStreamListener

  onDataAvailable(aRequest, aInputStream, aOffset, aCount) {
    if (this._channelListener)
      this._channelListener.onDataAvailable(aRequest, aInputStream, aOffset, aCount);
  },

  // nsIRequestObserver

  onStartRequest(aRequest)
  {
    if (this._URI instanceof Ci.nsIMsgMailNewsUrl) {
      this._URI.SetUrlState(true, Cr.NS_OK);
      if (this._loadGroup)
        this._loadGroup.addRequest(this, null);
    }

    // failed copies result in an error rv from nsCopyMessageStreamListener::OnStopRequest so propogate
    if (this._channelListener) {
      try { // we are seeing this throw, trying to understand.
        this._channelListener.onStartRequest(aRequest);
      } catch (e) {
        log.warn("Error in onStartRequest: " + e);
      }
    }
  },

  onStopRequest(aRequest, aStatusCode)
  {
    if (this._channelListener)
      this._channelListener.onStopRequest(aRequest, aStatusCode);
    if (this._URI instanceof Ci.nsIMsgMailNewsUrl)
    {
      this._URI.SetUrlState(false, aStatusCode);
      if (this._loadGroup)
        this._loadGroup.removeRequest(this, null, aStatusCode);
    }
    else
      dl("this._URI not nsIMsgMailNewsUrl");
  },

  // nsIPrivateBrowsingChannel

  // This exists solely to get around a crashing issue. When we try to open
  // an external app using an exquilla url, nsExternalAppHandler::CreateTransfer() tries
  // to add that url to history - but that no longer works because the url
  // does not implement serializable. imap gets around this by being hard-wired
  // in nsNavHistory, we have no such possibility. Not sure of the side effects though.

  setPrivate(a) {}, //we always return private
  get isChannelPrivate() { return true;},
  
  // EwsEventListener,

  // nsITimerCallback,
  notify(a) { return this.onEvent(null, "Notify", null, Cr.NS_OK);},

// void asyncOpen (in nsIStreamListener aListener);
  asyncOpen(aListener) {
    let contentSecManager = Cc["@mozilla.org/contentsecuritymanager;1"]
                              .getService(Ci.nsIContentSecurityManager);
    let listener = this._loadInfo ? contentSecManager.performSecurityCheck(this, aListener) : aListener;
    let url = this._URI;
    if (!(url instanceof Ci.nsIMsgMailNewsUrl))
      throw CE("url is not a mailnews url");
    url instanceof Ci.nsIInterfaceRequestor;

    let spec = url.spec;
    log.config("ewsProtocol.asyncOpen spec is " + spec);

    // There is no clearly defined method to figure out precisely what we should do,
    //  because we are trying to get around myriad issues in the base code. First I'll
    //  collect all of the information that might be helpful in determining this.

    // We will always want to run our messages though mime, but not attachments. If the listener is not
    //  already a mime listener, then add a new stream converter.

    // We will lookup the mailbox using the skink url method to get the server
    let ewsServer = safeGetJS(url.server, "EwsIncomingServer");
    this._mailbox = ewsServer.nativeMailbox;

    // do we have an attachment query?
    let attachmentRequestOffset = spec.indexOf(ATTACHMENT_QUERY);

    let headerQuery = getQueryVariable("header", spec) || "";
    let typeQuery = getQueryVariable("type", spec) || "";

    // what is the value of the fetchCompleteMessage query (with fetchEwsMessage as sub)?
    let fetchCompleteQuery = getQueryVariable("fetchEwsMessage", spec) || "";

    // is the listener a mime converter?
    let mimeStreamConverter = (aListener instanceof Ci.nsIMimeStreamConverter) ? aListener : null;

    let mimeType = Ci.nsMimeOutput.nsMimeUnknown;
    if (mimeStreamConverter)
    {
      let mimeTypeObject = {};
      mimeStreamConverter.GetMimeOutputType(mimeTypeObject);
      mimeType = mimeTypeObject.value;
      log.debug("Mime type from stream converter: " + mimeType);
    }
    else
      log.debug("No mime stream converter found");

    let messageFile = (url instanceof Ci.nsIMsgMessageUrl) ? url.messageFile : null;

    let ewsUrl = safeGetJS(url, "EwsUrl");
    if (!ewsUrl)
      throw CE("url is not an ews url");

    let itemId = ewsUrl.itemId;
    if (!itemId)
      throw CE("Missing EWS itemId", Cr.NS_ERROR_NOT_INITIALIZED);
    this._item = this._mailbox.getItem(itemId);

    let itemClass = this._item.itemClass;

    // Now determine the type

    // viewsource uses an empty query with no mime converter
    this.protocolType  = EPT_MIMECONTENT;
    if (attachmentRequestOffset != -1)
    {
      // let libmime handle encrypted attachments
      if (itemClass.startsWith("IPM.Note.SMIME"))
        this.protocolType  = EPT_MIMEATTACHMENT;
      else
      {
        this.protocolType  = EPT_EWSATTACHMENT;
         // We need to force message/rfc882 to open externally so that
         //   messages as attachment work correctly
         if (typeQuery == "message/rfc822")
           this.contentDisposition = Ci.nsIChannel.DISPOSITION_ATTACHMENT;
      }
    }
    // For meetings, we are using the raw MIME to make sure we pickup the text/calendar
    else if (itemClass.startsWith("IPM.Schedule.Meeting."))
      this.protocolType  = EPT_MIMEMESSAGE;
    // SMIME message will also use libmime processing from the mime content
    else if (itemClass.startsWith("IPM.Note.SMIME"))
      this.protocolType  = EPT_MIMEMESSAGE;
    else if (mimeType == Ci.nsMimeOutput.nsMimeMessageBodyQuoting)
      this.protocolType  = EPT_BODYHEADERS;
    else if (mimeType == Ci.nsMimeOutput.nsMimeMessageDraftOrTemplate)
      this.protocolType  = EPT_BODYHEADERS;
    else if (mimeType == Ci.nsMimeOutput.nsMimeMessageEditorTemplate)
      this.protocolType  = EPT_BODYHEADERS;
    else if (messageFile)
      this.protocolType  = EPT_SAVEMESSAGE;
    else if (headerQuery.indexOf("filter") != -1)
      this.protocolType  = EPT_FILTER;
    else if (headerQuery.indexOf("src") != -1)
      this.protocolType  = EPT_MIMECONTENT;
    else if (headerQuery.indexOf("print") != -1)
      this.protocolType  = EPT_PRINT;
    // Forward as attachment seems to use this
    else if (fetchCompleteQuery == "true")
      this.protocolType  = EPT_MIMECONTENT;
    else if ( (typeQuery.indexOf("application/x-message-display") != -1) ||
              (typeQuery.indexOf("application/exquilla-message-display") != -1))
      this.protocolType  = EPT_BODYHEADERS;
    else if (headerQuery)
      this.protocolType  = EPT_BODYHEADERS;

  log.config("msqEwsProtocol.asyncOpen spec= " + spec +
            " mimeType= " + mimeType +
            " protocolType= " + this.protocolType );

  if (!(this.protocolType  == EPT_EWSATTACHMENT)
        && !(this.protocolType  == EPT_MIMECONTENT)
        && !(this.protocolType  == EPT_SAVEMESSAGE)
        && !mimeStreamConverter
     )
    {
      // add a mime converter
      let streamConverter = Cc["@mozilla.org/streamConverters;1"]
                              .getService(Ci.nsIStreamConverterService);
      // (we are the channel)
      let conversionListener =
        streamConverter.asyncConvertData("message/rfc822", "*/*", listener, this);
      this.setChannelListener(conversionListener);
    }
    else
    {
      this.setChannelListener(listener);
    }

    // try to insert outselves to catch the mime output
    if (this.msgHeaderSink)
    {
      // we'll intercept header sink requests
      url.msgHeaderSink = this;
    }

    // Now implement the request. We do this all in the event listener, both to
    //  avoid code duplication as well as subtle bugs from implementing callbacks
    //  before the initial return from this method.
    Services.tm.mainThread.dispatch(this.notify.bind(this), Ci.nsIEventTarget.DISPATCH_NORMAL);
  },

  // msqISgProtocol,
  setChannelListener(a) {
    this._channelListener = a;
  },

  get msgHeaderSink() {
    if (!this._msgHeaderSink)
    {
      let msgurl = this._URI;
      if (msgurl instanceof Ci.nsIMsgMailNewsUrl)
      {
        this._msgHeaderSink = msgurl.msgHeaderSink;
        if (!this._msgHeaderSink)  // if the url is not overriding the header sink, then just get the one from the msg window
        {
          try {
            let msgWindow = msgurl.msgWindow;
            if (msgWindow)
              this._msgHeaderSink = msgWindow.msgHeaderSink;
          } catch (e) {} // core C++ throws for null window
        }
      }
    }
    if (this._msgHeaderSink === this)
    {
      // yikes, this may be us! Don't use that!
      this._msgHeaderSink = null;
    }

    return this._msgHeaderSink;
  },
  set msgHeaderSink(a) {
    this._msgHeaderSink = a;
  },

  // non-xpcom local
  get protocolType() {
    return this._protocolType;
  },
  set protocolType(a) {
    this._protocolType = a;
  },

  // convert any images with cid: references to data: uris.
  _rewriteCid(aBody, aItem)
  {
    log.debug("ewsProtocol rewriteCid");
    let parser = new DOMParser();

    let parsedDocument = parser.parseFromString(aBody, "text/html");

    let rewrite = "";
    let changed = this._elementRewriteCid(parsedDocument.documentElement, aItem);
    if (changed)
    {
      log.debug("elementRewriteCid changed something");
      // html serializer
      let serializer = Cu.createDocumentEncoder("text/html");
      serializer.init(parsedDocument, "text/html", Ci.nsIDocumentEncoder.OutputRaw);
      rewrite = serializer.encodeToString();
    }
    return [changed, rewrite];
  },

  _elementRewriteCid(aElement, aItem)
  {
    let changed = false;
    // If this is an IMG element, then check the src
    if (aElement.localName == "img")
    {
      let image = aElement;
      // check if we need to rewrite the source
      let src = aElement.getAttribute("src");

      // look for cid: protocol
      if (src && src.toLowerCase().startsWith("cid:"))
      {
        let contentId = src.substr(4);
        log.debug("found cid protocol with contentId " + contentId);

        let attachmentCount = aItem.attachmentCount;
        for (let i = 0; i < attachmentCount; i++)
        {
          let attachment = aItem.getAttachmentByIndex(i);
          if (!attachment)
            continue;
          let attContentId = attachment.contentId;
          if(attContentId)
          {
            if (attContentId == contentId)
            {
              log.debug("Attachment #" + i + " matches contentId " + attContentId);
              // This is what I would like to do:
              //nsCOMPtr<nsIMsgMailNewsUrl> mailnewsUrl(do_QueryInterface(mUrl));
              //if (!mailnewsUrl)
              //{
              //  EWS_LOG_WARNING("Not mailnewsUrl");
              //  return NS_ERROR_UNEXPECTED;
              //}
              //nsCAutoString messageSpec;
              //mailnewsUrl->GetSpec(messageSpec);
              //nsCString attachmentSpec;
              //CreateAttachmentSpec(attachment, i, messageSpec, attachmentSpec);
              //EWS_LOG_DEBUG_TEXT8("Attachment URL is", attachmentSpec.get());
              //image->SetSrc(NS_ConvertUTF8toUTF16(attachmentSpec));
              // but because of bug 764987 I have to do this:
              if (!attachment.downloaded)
              {
                log.debug("attachment not downloaded, queuing");
                this._embeddedAttachmentIds.push(attachment.attachmentId);
              }
              else
              {
                log.debug("attachment file found, converting to data: URL");
                let resultText = "";
                do { // error handling loop
                  // get the file content, and convert into a data uri (which seems to be
                  //  the only thing that will pass security checks.)

                  let dataSpec = "data:" + attachment.contentType + ";base64,";

                  // The attachment is stored in a file. Stream that file to memory.
                  let attachmentFileURL = attachment.fileURL;
                  if (!attachmentFileURL) {
                    resultText = "Attachment file not initialized";
                    break;
                  }
                  log.config("Attachment file URL is " + attachmentFileURL);
                  let file = Services.io.newURI(attachmentFileURL, null, null)
                                     .QueryInterface(Ci.nsIFileURL)
                                     .file;

                  if (!file || !file.exists) {
                    resultText = "Attachment file does not exist";
                    break;
                  }

                  let fstream = Cc["@mozilla.org/network/file-input-stream;1"]
                                  .createInstance(Ci.nsIFileInputStream);
                  fstream.init(file, -1, 0, 0);
                  let bstream = Cc["@mozilla.org/binaryinputstream;1"]
                                  .createInstance(Ci.nsIBinaryInputStream);
                  bstream.setInputStream(fstream);
                  let data = bstream.readBytes(bstream.available());
                  bstream.close();
                  dataSpec += btoa(data);
                  image.src = dataSpec;
                } while (false);
                if (resultText)
                  log.warn("Error getting embedded attachment: " + resultText);
                else
                 changed = true;
              }
              break;
            }
          }
        }
      }
    }

    let children = aElement.children;
    for (let child of children)
    {
      changed = this._elementRewriteCid(child, aItem) || changed;
    }
    return changed;
  },

  _processAttachments(properties, boundaryID)
  {
    let result = "";
    if (!this._item) {
      log.warn("Missing native item");
      return result;
    }

    let itemClass = this._item.itemClass;
    log.config("Ews Protocol processAttachments for item with class" + itemClass);

    let mailnewsUrl = this._URI.QueryInterface(Ci.nsIMsgMailNewsUrl);
    let messageSpec = mailnewsUrl.spec;

    let hasAttachments = properties.getBoolean("HasAttachments");
    while (hasAttachments) // break on error or done
    {
      for (let i = 0; i < this._item.attachmentCount; i++)
      {
        let nativeAttachment = this._item.getAttachmentByIndex(i);
        if (!nativeAttachment)
        {
          log.warn("Could not get attachment");
          continue;
        }

        let attachmentName = getSanitizedFolderName(nativeAttachment.name);
        let contentType = nativeAttachment.contentType;

        if (!nativeAttachment.isFileAttachment)
        {
          log.debug("Found item attachment with content type " + contentType);
          attachmentName += ".eml";
          // TODO - figure out how to detect other item types
        }
        else
          log.debug("Found file attachment with content type " + contentType);

        if (!this._msgHeaderSink)
        {
          // create a header for the attachment simulating a detached attachment
          // adapted from FeedItem.js convertToAttachment
          let attachmentHeader = "--" + boundaryID + "\r\n";

          attachmentHeader += 'Content-Type: ' + contentType +
                              '; name="' + attachmentName + '"\r\n';

          attachmentHeader += 'Content-Disposition: attachment; '+
                              'filename="' + attachmentName + '"\r\n\r\n';

          log.debug("attachment fake MIME is " + attachmentHeader);
          result += attachmentHeader;
        }
        else
        {
          let attachmentURL = createAttachmentSpec(nativeAttachment, i, messageSpec);

          //printf("forwarding attachment <%s> directly to header sink\n", attachmentURL.get());
          // forward the attachment information to the header sink
          // Note that the last parameter is actually isExternalAttachment, which should be
          //  TRUE only if this is a file URL
          log.debug("mHeaderSink HandleAttachment with url " + attachmentURL);
          this._msgHeaderSink.handleAttachment
            (contentType, attachmentURL, attachmentName, messageSpec, false);

          // Get the file size, if it is downloaded
          let attachmentSize = -1;
          do
          { // break to continue without getting the (optional) attachment size.
            let attachmentFileURL = nativeAttachment.fileURL;
            if (!attachmentFileURL)
              break;

            let attachmentFile;
            try {
              attachmentFile = Services.io.newURI(attachmentFileURL, null, null)
                                       .QueryInterface(Ci.nsIFileURL)
                                       .file;
            } catch(e) {}

            if (!attachmentFile || !attachmentFile.exists())
              break;
            attachmentSize = attachmentFile.fileSize;
          } while (false);

          if (attachmentSize < 0)
          {
            //  not downloaded and know nothing.
            // try to get from EWS (works Exchange 2010 and later)
            attachmentSize = nativeAttachment.size;
            log.debug("Attachment size from EWS is " + attachmentSize);
          }

          let sizeText = "" + attachmentSize;
          this._msgHeaderSink.addAttachmentField("X-Mozilla-PartSize", sizeText);
          this._msgHeaderSink.addAttachmentField("X-Mozilla-PartDownloaded", attachmentSize < 0 ? "0" : "1");
        }
      }

      if (!this._msgHeaderSink) {
        // output the end-of-message boundary
        result += "--" + boundaryID + "--";
      }
      break;
    }
    return result;
  },

};

var NSGetFactory = XPCOMUtils.generateNSGetFactory([EwsProtocol]);
var EXPORTED_SYMBOLS = ["NSGetFactory"];
