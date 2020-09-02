/*
 * The content of this file is licensed. You may obtain a copy of
 * the license at https://github.com/thsmi/sieve/ or request it via
 * email from the author.
 *
 * Do not remove or change this comment.
 *
 * The initial author of the code is:
 *   Thomas Schmid <schmid-thomas@gmx.net>
 */

(function (exports) {

  "use strict";

  /* global ExtensionCommon */
  /* global Components */

  const Cc = Components.classes;
  const Ci = Components.interfaces;

  /**
   * Implements a webextension api for sieve session and connection management.
   */
  class UrlLinkShellApi extends ExtensionCommon.ExtensionAPI {
    /**
     * @inheritdoc
     */
    getAPI() {

      return {
        urllink: {
          shell: {

            async openExternal(url) {
              const uri = Cc["@mozilla.org/network/io-service;1"]
                .getService(Ci.nsIIOService)
                .newURI(url, null, null);


              await Cc["@mozilla.org/uriloader/external-protocol-service;1"]
                .getService(Ci.nsIExternalProtocolService)
                .loadURI(uri);

            }
          }
        }
      };
    }
  }

  exports.UrlLinkShellApi = UrlLinkShellApi;

})(this);
