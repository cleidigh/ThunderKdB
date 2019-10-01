var newChannelFromURI = "newChannelFromURI2" in Services.io ? "newChannelFromURI2" : "newChannelFromURI"; // COMPAT for TB 60 (bug 1529252)

/// Properties used when creating the component factory.
var gMessageServiceProperties = {
  contractID: "@mozilla.org/messenger/messageservice;1?type=",
  classDescription: "Message Service",
  classID: Components.ID("{f6287146-4754-4b30-aaa9-42128bfcee43}"),
};

function MessageService() {
}

MessageService.prototype = {
  QueryInterface: QIUtils.generateQI([Ci.nsIMsgMessageFetchPartService, Ci.nsIMsgMessageService]),
  // nsIMsgMessageFetchPartService
  /**
   * Fetches a single attachment rather than the entire message.
   * This is only used when saving an attachment.
   * (Opening an attachment automatically hooks up a stream converter.)
   * @param aURI             {nsIURI}         The URI of the attachment
   * @param aMessageURI      {String}         Unused
   * @param aDisplayConsumer {nsISupports}    The save attachment listener
   * @param aMsgWindow       {nsIMsgWindow}
   * @param aUrlListener     {nsIUrlListener} Also the save listener
   * @returns                {nsIURI}         Unused
   */
  fetchMimePart: function(aURI, aMessageURI, aDisplayConsumer, aMsgWindow, aUrlListener) {
    try {
      if (aUrlListener && aURI instanceof Ci.nsIMsgMailNewsUrl) {
        aURI.RegisterListener(aUrlListener);
      }
      let channel = Services.io[newChannelFromURI](aURI, null, Services.scriptSecurityManager.getSystemPrincipal(), null, Ci.nsILoadInfo.SEC_ALLOW_CROSS_ORIGIN_DATA_IS_NULL, Ci.nsIContentPolicy.TYPE_OTHER);
      channel.asyncOpen(aDisplayConsumer, null);
      return aURI;
    } catch (ex) {
      logError(ex);
      throw ex;
    }
  },
  // nsIMsgMessageService
  // Most of these are stubbed out for now until we need them.
  /**
   * Called when a folder from another server wants to copy a message.
   * @param aSrcURI       {String}            The URI of the message
   * @param aCopyListener {nsIStreamListener} The listener for the data
   * @param aMoveMessage  {Boolean} Unused?
   * @param aUrlListener  {nsIUrlListener}    Unused
   * @param aMsgWindow    {nsIMsgWindow}
   * @param aURL          {aURI}              Unused outparam
   */
  CopyMessage: function(aSrcURI, aCopyListener, aMoveMessage, aUrlListener, aMsgWindow, aURL) {
    try {
      let uri = Services.io.newURI(aSrcURI);
      uri.QueryInterface(Ci.nsIMsgMailNewsUrl).msgWindow = aMsgWindow;
      uri.QueryInterface(Ci.msgIJaUrl).setUrlType(aMoveMessage);
      let channel = Services.io[newChannelFromURI](uri, null, Services.scriptSecurityManager.getSystemPrincipal(), null, Ci.nsILoadInfo.SEC_ALLOW_CROSS_ORIGIN_DATA_IS_NULL, Ci.nsIContentPolicy.TYPE_OTHER);
      channel.asyncOpen(aCopyListener, null);
    } catch (ex) {
      logError(ex);
      throw ex;
    }
  },
  /// Not used.
  CopyMessages: function(aNumKeys, aKeys, aSrcFolder, aCopyListener, aMoveMessage, aUrlListener, aMsgWindow) {
    throw Cr.NS_ERROR_NOT_IMPLEMENTED;
  },
  /**
   * Used to display a message in the message pane. Also would be used for the
   * attachment saving and message saving as text or HTML code but we probably
   * never get there because CreateStartupUrl hard codes the server types.
   * @param aMessageURI      {String}       Returned from generateMessageURI
   * @param aDisplayConsumer {nsISupports}  The content window nsIDocShell
   * @param aMsgWindow       {nsIMsgWindow}
   * @param aUrlListener     {null}         Unused
   * @param aCharsetOverride {null}         Unused
   * @param aURI             {nsIURI}       Unused outparam
   */
  DisplayMessage: function(aMessageURI, aDisplayConsumer, aMsgWindow, aUrlListener, aCharsetOverride, aURI) {
    if (aDisplayConsumer instanceof Ci.nsIDocShell) {
      // Let the protocol know that we want a synthesised message.
      if (!/&header=/.test(aMessageURI)) {
        aMessageURI += "&header=display";
      }
      try {
        let uri = Services.io.newURI(aMessageURI).QueryInterface(Ci.nsIMsgMailNewsUrl);
        uri.msgWindow = aMsgWindow;
        if (uri.loadURI.length == 3) { // COMPAT for TB 60
          uri.loadURI(aDisplayConsumer, null, Ci.nsIWebNavigation.LOAD_FLAGS_NONE);
          return;
        }
        uri.loadURI(aDisplayConsumer, Ci.nsIWebNavigation.LOAD_FLAGS_NONE);
      } catch (ex) {
        logError(ex);
        throw ex;
      }
    } else if (aDisplayConsumer instanceof Ci.nsIStreamListener) {
      try {
        let uri = Services.io.newURI(aMessageURI).QueryInterface(Ci.nsIMsgMailNewsUrl);
        uri.msgWindow = aMsgWindow;
        let channel = Services.io[newChannelFromURI](uri, null, Services.scriptSecurityManager.getSystemPrincipal(), null, Ci.nsILoadInfo.SEC_ALLOW_CROSS_ORIGIN_DATA_IS_NULL, Ci.nsIContentPolicy.TYPE_OTHER);
        channel.asyncOpen(aDisplayConsumer, null);
      } catch (ex) {
        logError(ex);
        throw ex;
      }
    } else {
      throw Cr.NS_NOINTERFACE;
    }
  },
  /**
   * Used to open an attachment. In SeaMonkey, will open the attachment in the
   * browser if it's a MIME type that it can handle. Otherwise, will trigger
   * opening the attachment with a helper application in the normal way.
   * @param aContentType     {String}       The content type of the attachment
   * @param aFileName        {String}       The name of the attachment
   * @param aUrl             {String}       The Gecko URI including the part
   * @param aMessageURI      {nsIURI}       The generated message URI
   * @param aDisplayConsumer {nsISupports}  The content window nsIDocShell
   * @param aMsgWindow       {nsIMsgWindow}
   * @param aUrlListener     {null}         Unused
   */
  openAttachment: function(aContentType, aFileName, aUrl, aMessageUri, aDisplayConsumer, aMsgWindow, aUrlListener) {
    try {
      let uri = Services.io.newURI(aUrl).QueryInterface(Ci.nsIMsgMailNewsUrl);
      uri.msgWindow = aMsgWindow;
      if (uri.loadURI.length == 3) { // COMPAT for TB 60
        uri.loadURI(aDisplayConsumer, null, Ci.nsIWebNavigation.LOAD_FLAGS_IS_LINK);
        return;
      }
      uri.loadURI(aDisplayConsumer, Ci.nsIWebNavigation.LOAD_FLAGS_IS_LINK);
    } catch (ex) {
      logError(ex);
      throw ex;
    }
  },
  /**
   * Used to save a message, rather than an attachment. If saving as template,
   * this saves to a temporary file which is then copied to the template
   * folder. If the target folder is a local folder, then aEnvelope will be
   * true to indicate that the bonus local headers need to be added, and
   * aCanonical will be false to require native line endings instead of CRLF.
   * I don't actually think that makes any difference though.
   * @param aMessageURI  {String}         Returned from generateMessageURI
   * @param aFile        {nsIFile}        Ths destination file
   * @param aEnvelope    {Boolean}        Save as template to local folder
   * @param aUrlListener {nsIUrlListener}
   * @param aURL         {nsIURI}         Unused outparam
   * @param aCanonical   {Boolean}        Save as template to IMAP folder
   * @param aMsgWindow   {nsIMsgWindow}
   */
  SaveMessageToDisk: function(aMessageURI, aFile, aEnvelope, aUrlListener, aURL, aCanonical, aMsgWindow) {
    try {
      let uri = Services.io.newURI(aMessageURI).QueryInterface(Ci.nsIMsgMailNewsUrl);
      uri.msgWindow = aMsgWindow;
      uri.QueryInterface(Ci.nsIMsgMessageUrl).canonicalLineEnding = aCanonical;
      let listener = uri.getSaveAsListener(aEnvelope, aFile);
      let channel = Services.io[newChannelFromURI](uri, null, Services.scriptSecurityManager.getSystemPrincipal(), null, Ci.nsILoadInfo.SEC_ALLOW_CROSS_ORIGIN_DATA_IS_NULL, Ci.nsIContentPolicy.TYPE_OTHER);
      channel.asyncOpen(listener, null);
    } catch (ex) {
      logError(ex);
      throw ex;
    }
  },
  /**
   * Used to convert the result of a URI from getUriForMsg (which I think
   * dated back to the days when message URIs were registered with RDF) into
   * a real URL that can be loaded by Gecko's networking code.
   * @param aMessageURI {String}       a URI from getUriForMsg
   * @param aURL        {nsIURI}       a Gecko-ready nsIURI
   * @param aMsgWindow  {nsIMsgWindow} Unused
   */
  GetUrlForUri: function(aMessageURI, aURL, aMsgWindow) {
    try {
      aURL.value = Services.io.newURI(aMessageURI);
    } catch (ex) {
      logError(ex);
      throw ex;
    }
  },
  /**
   * Called by the print engine for print and print preview.
   * @param aMessageURI      {String}       Returned from generateMessageURI
   * @param aDisplayConsumer {nsISupports}  The content window nsIDocShell
   * @param aMsgWindow       {nsIMsgWindow} Unused
   * @param aUrlListener     {null}         Unused
   * @param aURI             {nsIURI}       Unused outparam
   */
  DisplayMessageForPrinting: function(aMessageURI, aDisplayConsumer, aMsgWindow, aUrlListener, aURL) {
    this.DisplayMessage(aMessageURI + "&header=print", aDisplayConsumer, aMsgWindow, aUrlListener, null, aURL);
  },
  /// Used for online searching.
  Search: function(aSearchSession, aMsgWindow, aMsgFolder, aSearchUri) {
    throw Cr.NS_ERROR_NOT_IMPLEMENTED;
  },
  /**
   * Used in a couple of miscellaneous places, such as conversation view.
   * @param aMessageURI       {String}         Returned from generateMessageURI
   * @param aConsumer         {nsISupports}    Always an nsIStreamListener
   * @param aMsgWindow        {nsIMsgWindow}
   * @param aUrlListener      {nsIUrlListener} Unused
   * @param aConvertData      {Boolean}        Unused - see protocolhandler.js
   * @param aAdditionalHeader {String}         Appended to aMessageURI
   * @param aLocalOnly        {Boolean}        Ignored // XXX TODO
   * @returns                 {nsIURI}         Unused
   */
  streamMessage: function(aMessageURI, aConsumer, aMsgWindow, aUrlListener, aConvertData, aAdditionalHeader, aLocalOnly) {
    if (aAdditionalHeader) {
      aMessageURI += "&header=" + aAdditionalHeader;
    }
    this.DisplayMessage(aMessageURI, aConsumer, aMsgWindow, aUrlListener, null, null);
  },
  /// Unused.
  streamHeaders: function(aMessageURI, aConsumer, aUrlListener, aLocalOnly) {
    throw Cr.NS_ERROR_NOT_IMPLEMENTED;
  },
  /// Used if required by protocol-specific handlers.
  /// OWL currently doesn't use the memory cache.
  isMsgInMemCache: function(aUrl, aFolder) {
    throw Cr.NS_ERROR_NOT_IMPLEMENTED;
  },
  /**
   * Retrieves the nsIMsgHdr that was passed to getUriForMsg.
   * @param aUri {String}    a URI from getUriForMsg
   * @returns    {nsIMsgHdr} The nsIMsgHdr passed to getUriForMsg
   * @throws     {Exception} If the URI is invalid
   */
  messageURIToMsgHdr: function(aUri) {
    // nsMsgCompose::RememberQueuedDisposition rolls its own URI instead of
    // calling .generateMessageURI(key) or .msgDatabase.GetMsgHdrForKey(key)...
    aUri = aUri.replace(/-message(.*)#/, "$1?key="); // COMPAT for TB 60 (bug 1492905)
    try {
      let uri = Services.io.newURI(aUri);
      let folder = uri.QueryInterface(Ci.nsIMsgMailNewsUrl).folder;
      return folder.GetMessageHeader(parseInt(uri.query.match(/key=(\d+)/)[1]));
    } catch (ex) {
      logError(ex);
      throw ex;
    }
  },
};

gMessageServiceProperties.factory = XPCOMUtils._getFactory(MessageService);
gModules.push(gMessageServiceProperties);
