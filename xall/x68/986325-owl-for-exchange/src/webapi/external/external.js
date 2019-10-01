var {Services} = ChromeUtils.import("resource://gre/modules/Services.jsm");

var {ExtensionError} = ExtensionUtils;

this.external = class extends ExtensionAPI {
  getAPI(context) {
    return {
      external: {
        openLink: function(aUrl) {
          let uri;
          try {
            uri = Services.io.newURI(aUrl)
          } catch (ex) {
            throw new ExtensionError(aUrl + " is not a valid URL.");
          }
          Cc["@mozilla.org/uriloader/external-protocol-service;1"].getService(Ci.nsIExternalProtocolService).loadURI(uri);
        },
      }
    };
  }
};
