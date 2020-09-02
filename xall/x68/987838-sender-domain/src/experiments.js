"use strict";
var { Services } = ChromeUtils.import("resource://gre/modules/Services.jsm");
var { ExtensionSupport } = ChromeUtils.import('resource:///modules/ExtensionSupport.jsm');
var { ExtensionParent } = ChromeUtils.import('resource://gre/modules/ExtensionParent.jsm');
var { MailServices } = ChromeUtils.import("resource:///modules/MailServices.jsm");

const EXTENSION_NAME = "senderdomain@rcruzs00";
var extension = ExtensionParent.GlobalManager.getExtension(EXTENSION_NAME);


var SenderDomain = class extends ExtensionCommon.ExtensionAPI {
  onShutdown(isAppShutdown) {
    if (isAppShutdown) return;
    Services.obs.notifyObservers(null, "startupcache-invalidate");
  }

  onStartup() {}

  getAPI(context) {
    context.callOnClose(this);
    return {
      SenderDomain: {
        addWindowListener(dummy) {
          ExtensionSupport.registerWindowListener(EXTENSION_NAME, {
            chromeURLs: ["chrome://messenger/content/messenger.xul",
                         "chrome://messenger/content/messenger.xhtml"],
            onLoadWindow: paint,
            onUnloadWindow: unpaint,
          });
        }
      }
    }
  }

  close() {
    ExtensionSupport.unregisterWindowListener(EXTENSION_NAME);
    for (let win of Services.wm.getEnumerator("mail:3pane")) {
      unpaint(win);
    }
  }

};


function paint(win) {
  win.SenderDomain = {};
  Services.scriptloader.loadSubScript(extension.getURL("customcol_domain.js"), win.SenderDomain);
  win.SenderDomain.SenderDomain_DomainHdrView.init(win, false);
  win.SenderDomain.SenderDomain_DomainReverseHdrView.init(win, true);
}

function unpaint(win) {
  win.SenderDomain.SenderDomain_DomainHdrView.destroy();
  win.SenderDomain.SenderDomain_DomainReverseHdrView.destroy();
  delete win.SenderDomain;
}
