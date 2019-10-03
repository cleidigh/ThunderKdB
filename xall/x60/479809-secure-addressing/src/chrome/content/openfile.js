/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

ChromeUtils.import("resource://gre/modules/Services.jsm");
ChromeUtils.import("resource://gre/modules/XPCOMUtils.jsm");
//Components.utils.import("resource://gre/modules/Services.jsm");

const Ci = Components.interfaces;
const Cu = Components.utils;
   
function openAll() {
    var gMessenger = Components.classes["@mozilla.org/messenger;1"].createInstance(Ci.nsIMessenger);
    var gIOService = Components.classes["@mozilla.org/network/io-service;1"].getService(Components.interfaces.nsIIOService);
    let bucket = window.arguments[2];
    let nattach = bucket.getRowCount();
    try{
        for(let i = 0; i < nattach; i++) {
            let item = bucket.getItemAtIndex(i);
            let attachmentUrl = item.attachment.url;
            let messagePrefix = /^mailbox-message:|^imap-message:|^news-message:/i;
            if (messagePrefix.test(attachmentUrl))
            {
              // we must be dealing with a forwarded attachment, treat this special
              let msgHdr = gMessenger.messageServiceFromURI(attachmentUrl).messageURIToMsgHdr(attachmentUrl);
              if (msgHdr)
                MailUtils.openMessageInNewWindow(msgHdr);
            }
            else
            {
              // Turn the URL into a nsIURI object then open it.
              let uri = Services.io.newURI(attachmentUrl);
              if (uri)
              {
                let channel = Services.io.newChannelFromURI2(uri,
                                                             null,
                                                             Services.scriptSecurityManager.getSystemPrincipal(),
                                                             null,
                                                             Ci.nsILoadInfo.SEC_ALLOW_CROSS_ORIGIN_DATA_IS_NULL,
                                                             Ci.nsIContentPolicy.TYPE_OTHER);
                if (channel)
                {
                  let uriLoader = Cc["@mozilla.org/uriloader;1"].getService(Ci.nsIURILoader);
                  uriLoader.openURI(channel, true, new nsAttachmentOpener());
                }
              }
            }
        } // if one attachment selected
    } catch(e) {
        err("error in openall " + e);
    } 
}

function nsAttachmentOpener()
{
}

nsAttachmentOpener.prototype =
{
  QueryInterface: function(iid)
  {
    if (iid.equals(Ci.nsIURIContentListener) ||
        iid.equals(Ci.nsIInterfaceRequestor) ||
        iid.equals(Ci.nsISupports))
        return this;
    throw Cr.NS_NOINTERFACE;
  },

  onStartURIOpen: function(uri)
  {
    return false;
  },

  doContent: function(contentType, isContentPreferred, request, contentHandler)
  {
    // If we came here to display an attached message, make sure we provide a type.
    if (/[?&]part=/i.test(request.URI.query)) {
      let newQuery = request.URI.query + "&type=message/rfc822";
      request.URI = request.URI.mutate().setQuery(newQuery).finalize();
    }
    let newHandler = Cc["@mozilla.org/uriloader/content-handler;1?type=application/x-message-display"]
                       .createInstance(Ci.nsIContentHandler);
    newHandler.handleContent("application/x-message-display", this, request);
    return true;
  },

  isPreferred: function(contentType, desiredContentType)
  {
    if (contentType == "message/rfc822")
      return true;
    return false;
  },

  canHandleContent: function(contentType, isContentPreferred, desiredContentType)
  {
    return false;
  },
  getInterface: function(iid)
  {
    if (iid.equals(Ci.nsIDOMWindow)) {
      return window;
    } else if (iid.equals(Ci.nsIDocShell)) {
      return window.QueryInterface(Ci.nsIInterfaceRequestor)
                   .getInterface(Ci.nsIWebNavigation)
                   .QueryInterface(Ci.nsIDocShell);
    } else {
      return this.QueryInterface(iid);
    }
  },

  loadCookie: null,
  parentContentListener: null
}

