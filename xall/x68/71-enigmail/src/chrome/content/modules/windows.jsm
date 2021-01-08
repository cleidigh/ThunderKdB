/*
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

"use strict";

var EXPORTED_SYMBOLS = ["EnigmailWindows"];

const EnigmailLog = ChromeUtils.import("chrome://enigmail/content/modules/log.jsm").EnigmailLog;
const EnigmailPrefs = ChromeUtils.import("chrome://enigmail/content/modules/prefs.jsm").EnigmailPrefs;
const Services = ChromeUtils.import("resource://gre/modules/Services.jsm").Services;

const APPSHELL_MEDIATOR_CONTRACTID = "@mozilla.org/appshell/window-mediator;1";
const APPSHSVC_CONTRACTID = "@mozilla.org/appshell/appShellService;1";

const LOCAL_FILE_CONTRACTID = "@mozilla.org/file/local;1";
const IOSERVICE_CONTRACTID = "@mozilla.org/network/io-service;1";

var EnigmailWindows = {
  /**
   * Open a window, or focus it if it is already open
   *
   * @winName   : String - name of the window; used to identify if it is already open
   * @spec      : String - window URL (e.g. chrome://enigmail/content/ui/test.xul)
   * @winOptions: String - window options as defined in nsIWindow.open
   * @optObj    : any    - an Object, Array, String, etc. that is passed as parameter
   *                       to the window
   */
  openWin: function(winName, spec, winOptions, optObj) {
    var windowManager = Cc[APPSHELL_MEDIATOR_CONTRACTID].getService(Ci.nsIWindowMediator);

    var winEnum = windowManager.getEnumerator(null);
    var recentWin = null;
    while (winEnum.hasMoreElements() && !recentWin) {
      var thisWin = winEnum.getNext();
      if (thisWin.location.href == spec) {
        recentWin = thisWin;
        break;
      }
      if (winName && thisWin.name && thisWin.name == winName) {
        thisWin.focus();
        break;
      }

    }

    if (recentWin) {
      recentWin.focus();
    }
    else {
      var appShellSvc = Cc[APPSHSVC_CONTRACTID].getService(Ci.nsIAppShellService);
      var domWin = appShellSvc.hiddenDOMWindow;
      try {
        domWin.open(spec, winName, "chrome," + winOptions, optObj);
      }
      catch (ex) {
        domWin = windowManager.getMostRecentWindow(null);
        domWin.open(spec, winName, "chrome," + winOptions, optObj);
      }
    }
  },

  /**
   * Determine the best possible window to serve as parent window for dialogs.
   *
   * @return: nsIWindow object
   */
  getBestParentWin: function() {
    var windowManager = Cc[APPSHELL_MEDIATOR_CONTRACTID].getService(Ci.nsIWindowMediator);

    var bestFit = null;
    var winEnum = windowManager.getEnumerator(null);

    while (winEnum.hasMoreElements()) {
      var thisWin = winEnum.getNext();
      if (thisWin.location.href.search(/\/messenger.xhtml$/) > 0) {
        bestFit = thisWin;
      }
      if (!bestFit && thisWin.location.href.search(/\/messengercompose.xhtml$/) > 0) {
        bestFit = thisWin;
      }
    }

    if (!bestFit) {
      winEnum = windowManager.getEnumerator(null);
      bestFit = winEnum.getNext();
    }

    return bestFit;
  },


  getMostRecentWindow: function() {
    var windowManager = Cc[APPSHELL_MEDIATOR_CONTRACTID].getService(Ci.nsIWindowMediator);
    return windowManager.getMostRecentWindow(null);
  },

  /**
   * Display the "About Enigmail" window
   *
   * no return value
   */
  openAboutWindow: function() {
    EnigmailWindows.openMailTab("chrome://enigmail/content/ui/aboutEnigmail.html");
  },

  /**
   * Display the "About Enigmail" window
   *
   * @param {Boolean} displayWizard: display the Migration wizard, regardless of pEp settings
   *
   * no return value
   */
  openUpdateInfo: function(displayWizard = false) {
    let appShellSvc = Cc["@mozilla.org/appshell/appShellService;1"].getService(Ci.nsIAppShellService);
    let platform = appShellSvc.hiddenDOMWindow.navigator.platform.replace(/[ \t].*$/, "");
    let locale = Cc["@mozilla.org/intl/localeservice;1"].getService(Ci.mozILocaleService).appLocalesAsBCP47;
    if (locale && locale.length > 0) {
      locale = locale[0].substr(0, 2);
    }
    else {
      locale = "en";
    }

    if ((!displayWizard) && (EnigmailPrefs.getPref("juniorMode") === 2)) {
      const URL="https://pep.software/thunderbird/%p?lang=%l";

      let url = URL.replace("%p", platform).replace("%l", locale);
      openExternalUrl(url);
    }
    else
      EnigmailWindows.openMailTab("chrome://enigmail/content/ui/upgradeInfo.html");
  },


  closeUpdateInfo: function() {
    EnigmailWindows.closeMailTab("chrome://enigmail/content/ui/upgradeInfo.html");
  },

  /**
   * Open a URL in a tab on the main window. The URL can either be a web page
   * (e.g. https://enigmail.net/ or a chrome document (e.g. chrome://enigmail/content/ui/x.xul))
   *
   * @param aURL:    String - the URL to open
   */
  openMailTab: function(aURL) {
    let tabs = getMail3Pane().document.getElementById("tabmail");

    for (let i = 0; i < tabs.tabInfo.length; i++) {
      if ("openedUrl" in tabs.tabInfo[i] && tabs.tabInfo[i].openedUrl.startsWith(aURL)) {
        tabs.switchToTab(i);
        return;
      }
    }

    let gotTab = tabs.openTab("chromeTab", {
      chromePage: aURL
    });
    gotTab.openedUrl = aURL;
  },

  closeMailTab: function(aURL) {
    let tabs = getMail3Pane().document.getElementById("tabmail");
    for (let i = 0; i < tabs.tabInfo.length; i++) {
      if ("openedUrl" in tabs.tabInfo[i] && tabs.tabInfo[i].openedUrl.startsWith(aURL)) {
        tabs.closeTab(i);
        return;
      }
    }
  },

  shutdown: function(reason) {
    EnigmailLog.DEBUG("windows.jsm: shutdown()\n");

    let tabs = getMail3Pane().document.getElementById("tabmail");

    for (let i = tabs.tabInfo.length - 1; i >= 0; i--) {
      if ("openedUrl" in tabs.tabInfo[i] && tabs.tabInfo[i].openedUrl.startsWith("chrome://enigmail/")) {
        tabs.closeTab(tabs.tabInfo[i]);
      }
    }
  }
};


function getMail3Pane() {
  return Cc["@mozilla.org/appshell/window-mediator;1"]
    .getService(Ci.nsIWindowMediator)
    .getMostRecentWindow("mail:3pane");
}


function openExternalUrl(href) {
  if (!href) {
    return;
  }

  let uri = null;
  try {
    const nsISSM = Ci.nsIScriptSecurityManager;
    const secMan = Cc["@mozilla.org/scriptsecuritymanager;1"].getService(
      nsISSM
    );

    uri = Services.io.newURI(href);

    let principal = secMan.createNullPrincipal({});
    try {
      secMan.checkLoadURIWithPrincipal(
        principal,
        uri,
        nsISSM.DISALLOW_INHERIT_PRINCIPAL
      );
    }
    catch (ex) {
      var msg =
        "Error: Cannot open a " +
        uri.scheme +
        ": link using the text-link binding.";
      Cu.reportError(msg);
      return;
    }

    const cID = "@mozilla.org/uriloader/external-protocol-service;1";
    const nsIEPS = Ci.nsIExternalProtocolService;
    var protocolSvc = Cc[cID].getService(nsIEPS);

    // if the scheme is not an exposed protocol, then opening this link
    // should be deferred to the system's external protocol handler
    if (!protocolSvc.isExposedProtocol(uri.scheme)) {
      protocolSvc.loadURI(uri);
      return;
    }
  }
  catch (ex) {
    Cu.reportError(ex);
  }

  href = uri ? uri.spec : href;

  // Try handing off the link to the host application, e.g. for
  // opening it in a tabbed browser.
  var linkHandled = Cc["@mozilla.org/supports-PRBool;1"].createInstance(
    Ci.nsISupportsPRBool
  );
  linkHandled.data = false;
  let data = {
    href
  };
  Services.obs.notifyObservers(
    linkHandled,
    "handle-xul-text-link",
    JSON.stringify(data)
  );
  if (linkHandled.data) {
    return;
  }

  // otherwise, fall back to opening the anchor directly
  let win = window;
  if (window.isChromeWindow) {
    while (win.opener && !win.opener.closed) {
      win = win.opener;
    }
  }
  win.open(href, "_blank", "noopener");
}
