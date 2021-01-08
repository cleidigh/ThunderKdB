/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */

"use strict";

const { XPCOMUtils } = ChromeUtils.import(
  "resource://gre/modules/XPCOMUtils.jsm"
);

XPCOMUtils.defineLazyModuleGetters(this, {
  BrowserSim: "chrome://conversations/content/modules/browserSim.js",
  NetUtil: "resource://gre/modules/NetUtil.jsm",
  Services: "resource://gre/modules/Services.jsm",
});

let wrapper;

function Wrapper(aUrl) {
  this.url = aUrl;
  this.pdfDoc = null;
  this.curPage = -1;
}

Wrapper.prototype = {
  /**
   * The XMLHttpRequest thing doesn't seem to work properly, so use our own
   * little function to get the contents of the attachment into a TypedArray.
   */
  _download() {
    let url = Services.io.newURI(this.url);
    let channel = Services.io.newChannelFromURI(
      url,
      null,
      Services.scriptSecurityManager.getSystemPrincipal(),
      null,
      Ci.nsILoadInfo.SEC_ALLOW_CROSS_ORIGIN_DATA_IS_NULL,
      Ci.nsIContentPolicy.TYPE_OTHER
    );
    let chunks = [];

    return new Promise((resolve) => {
      let listener = {
        onStartRequest(aRequest) {},

        onStopRequest(aRequest, aStatusCode) {
          resolve(chunks);
        },

        onDataAvailable(aRequest, aStream, aOffset, aCount) {
          // Fortunately, we have in Gecko 2.0 a nice wrapper
          let data = NetUtil.readInputStreamToString(aStream, aCount);
          // Now each character of the string is actually to be understood as a byte
          // So charCodeAt is what we want here...
          let array = [];
          for (let i = 0; i < data.length; ++i) {
            array[i] = data.charCodeAt(i);
          }
          // Yay, good to go!
          chunks.push(array);
        },

        QueryInterface: ChromeUtils.generateQI([
          Ci.nsIStreamListener,
          Ci.nsIRequestObserver,
        ]),
      };
      channel.asyncOpen(listener, null);
    });
  },

  async load() {
    let chunks = await this._download();

    let browser = document.getElementById("browser");
    browser.addEventListener(
      "load",
      () => {
        let browserSim = BrowserSim.getBrowser();
        // This section based on https://github.com/erosman/HTML-Internationalization
        // MPL2 License: https://discourse.mozilla.org/t/translating-options-pages/19604/23
        for (const node of browser.contentDocument.querySelectorAll(
          "[data-i18n]"
        )) {
          let [text, attr] = node.dataset.i18n.split("|");
          text = browserSim.i18n.getMessage(text);
          attr
            ? (node[attr] = text)
            : node.appendChild(browser.contentDocument.createTextNode(text));
        }

        let w = browser.contentWindow.wrappedJSObject;
        w.init(Cu.cloneInto({ chunks }, w));
      },
      { once: true, capture: true }
    );
    // Load from a resource:// URL so that it doesn't have chrome privileges.
    browser.loadURI("chrome://conversations/content/pdfviewer/viewer.xhtml", {
      triggeringPrincipal: Services.scriptSecurityManager.getSystemPrincipal(),
    });
  },
};

window.addEventListener("load", function (event) {
  const params = new URL(document.location.href).searchParams;
  document.title = params.get("name");

  wrapper = new Wrapper(params.get("uri"));
  wrapper.load().catch(console.error);
});
