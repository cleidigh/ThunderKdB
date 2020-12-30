/*
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

"use strict";

var EXPORTED_SYMBOLS = ["EnigmailWindows"];

const EnigmailLog = ChromeUtils.import("chrome://enigmail/content/modules/log.jsm").EnigmailLog;
const EnigmailCore = ChromeUtils.import("chrome://enigmail/content/modules/core.jsm").EnigmailCore;
const EnigmailLocale = ChromeUtils.import("chrome://enigmail/content/modules/locale.jsm").EnigmailLocale;
const EnigmailKeyRing = ChromeUtils.import("chrome://enigmail/content/modules/keyRing.jsm").EnigmailKeyRing;
const EnigmailRules = ChromeUtils.import("chrome://enigmail/content/modules/rules.jsm").EnigmailRules;
const EnigmailApp = ChromeUtils.import("chrome://enigmail/content/modules/app.jsm").EnigmailApp;
const EnigmailPEPAdapter = ChromeUtils.import("chrome://enigmail/content/modules/pEpAdapter.jsm").EnigmailPEPAdapter;
const EnigmailCompat = ChromeUtils.import("chrome://enigmail/content/modules/compat.jsm").EnigmailCompat;
const EnigmailStdlib = ChromeUtils.import("chrome://enigmail/content/modules/stdlib.jsm").EnigmailStdlib;
const Services = ChromeUtils.import("resource://gre/modules/Services.jsm").Services;
const AppConstants = ChromeUtils.import("resource://gre/modules/AppConstants.jsm").AppConstants;

const APPSHELL_MEDIATOR_CONTRACTID = "@mozilla.org/appshell/window-mediator;1";
const APPSHSVC_CONTRACTID = "@mozilla.org/appshell/appShellService;1";

const LOCAL_FILE_CONTRACTID = "@mozilla.org/file/local;1";
const IOSERVICE_CONTRACTID = "@mozilla.org/network/io-service;1";

var gPepUpgradeDisplayed = false;

var EnigmailWindows = {
  /**
   * Display the OpenPGP setup wizard window
   *
   * win      : nsIWindow - the parent window
   * skipIntro: Boolean   - optional, if true, skip the introduction page
   *
   * no return value
   */
  openSetupWizard: function(win, setupType) {
    EnigmailLog.DEBUG("windows.jsm: openSetupWizard()\n");

    if (!EnigmailStdlib.hasConfiguredAccounts()) {
      EnigmailLog.DEBUG("windows.jsm: openSetupWizard: no configured accounts\n");
      return;
    }

    win.open("chrome://enigmail/content/ui/setupWizard2.xul",
      "", "chrome,centerscreen,resizable");
  },

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
      if (thisWin.location.href.search(/\/messenger.xul$/) > 0) {
        bestFit = thisWin;
      }
      if (!bestFit && thisWin.location.href.search(/\/messengercompose.xul$/) > 0) {
        bestFit = thisWin;
      }
    }

    if (!bestFit) {
      winEnum = windowManager.getEnumerator(null);
      bestFit = winEnum.getNext();
    }

    return bestFit;
  },

  /**
   * Iterate through the frames of a window and return the first frame with a
   * matching name.
   *
   * @win:       nsIWindow - XUL window to search
   * @frameName: String    - name of the frame to seach
   *
   * @return:    the frame object or null if not found
   */
  getFrame: function(win, frameName) {
    EnigmailLog.DEBUG("windows.jsm: getFrame: name=" + frameName + "\n");
    for (var j = 0; j < win.frames.length; j++) {
      if (win.frames[j].name == frameName) {
        return win.frames[j];
      }
    }
    return null;
  },

  getMostRecentWindow: function() {
    var windowManager = Cc[APPSHELL_MEDIATOR_CONTRACTID].getService(Ci.nsIWindowMediator);
    return windowManager.getMostRecentWindow(null);
  },


  /**
   * Display the key help window
   *
   * @source - |string| containing the name of the file to display
   *
   * no return value
   */

  openHelpWindow: function(source) {
    EnigmailWindows.openWin("enigmail:help",
      "chrome://enigmail/content/ui/enigmailHelp.xul?src=" + source,
      "centerscreen,resizable");
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
   * no return value
   */
  openGnuPGUpdate: function() {
    EnigmailWindows.openMailTab("chrome://enigmail/content/ui/updateGnuPG.html");
  },

  /**
   * Open the Enigmail Documentation page in a new window
   *
   * no return value
   */
  openEnigmailDocu: function(parent) {
    if (!parent) {
      parent = this.getMostRecentWindow();
    }

    parent.open("https://enigmail.net/faq/docu.php", "", "chrome,width=600,height=500,resizable");
  },

  /**
   * Display the Per-Recipient Rules editor window
   *
   * no return value
   */
  openRulesEditor: function() {
    EnigmailWindows.openWin("enigmail:rulesEditor",
      "chrome://enigmail/content/ui/enigmailRulesEditor.xul",
      "dialog,centerscreen,resizable");
  },

  /**
   * Display the OpenPGP key manager window
   *
   * no return value
   */
  openKeyManager: function(win) {
    EnigmailCore.getService(win);

    EnigmailWindows.openWin("enigmail:KeyManager",
      "chrome://enigmail/content/ui/enigmailKeyManager.xul",
      "resizable");
  },

  /**
   * Display the OpenPGP key manager window
   *
   * no return value
   */
  openImportSettings: function(win) {
    EnigmailCore.getService(win);

    EnigmailWindows.openWin("",
      "chrome://enigmail/content/ui/importSettings.xul",
      "chrome,dialog,centerscreen,resizable,modal");
  },

  /**
   * If the Key Manager is open, dispatch an event to tell the key
   * manager to refresh the displayed keys
   */

  keyManReloadKeys: function() {
    let windowManager = Cc[APPSHELL_MEDIATOR_CONTRACTID].getService(Ci.nsIWindowMediator);
    const winName = "enigmail:KeyManager";
    const spec = "chrome://enigmail/content/ui/enigmailKeygen.xul";

    let winEnum = windowManager.getEnumerator(null);
    let recentWin = null;
    while (winEnum.hasMoreElements() && !recentWin) {
      let thisWin = winEnum.getNext();
      if (thisWin.location.href == spec) {
        recentWin = thisWin;
        break;
      }
      if (thisWin.name && thisWin.name == winName) {
        let evt = new thisWin.Event("reload-keycache", {
          "bubbles": true,
          "cancelable": false
        });
        thisWin.dispatchEvent(evt);
        break;
      }
    }
  },

  /**
   * Display the key creation window
   *
   * no return value
   */
  openKeyGen: function() {
    EnigmailWindows.openWin("enigmail:generateKey",
      "chrome://enigmail/content/ui/enigmailKeygen.xul",
      "chrome,resizable=yes");
  },

  /**
   * Display the card details window
   *
   * no return value
   */
  openCardDetails: function() {
    EnigmailWindows.openWin("enigmail:cardDetails",
      "chrome://enigmail/content/ui/enigmailCardDetails.xul",
      "centerscreen");
  },


  /**
   * Display the console log window
   *
   * @win       - |object| holding the parent window for the dialog
   *
   * no return value
   */
  openConsoleWindow: function() {
    EnigmailWindows.openWin("enigmail:console",
      "chrome://enigmail/content/ui/enigmailConsole.xul",
      "resizable,centerscreen");
  },

  /**
   * Display the window for the debug log file
   *
   * @win       - |object| holding the parent window for the dialog
   *
   * no return value
   */
  openDebugLog: function(win) {
    EnigmailWindows.openWin("enigmail:logFile",
      "chrome://enigmail/content/ui/enigmailViewFile.xul?viewLog=1&title=" + escape(EnigmailLocale.getString("debugLog.title")),
      "centerscreen");
  },

  /**
   * Display the preferences dialog
   *
   * @win       - |object| holding the parent window for the dialog
   * @showBasic - |boolean| true if only the 1st page of the preferences window
   *              should be displayed / false otherwise
   * @selectTab - |string| ID of the tab element (in XUL) to display when opening
   *
   * no return value
   */
  openPrefWindow: function(win, showBasic, selectTab) {
    EnigmailLog.DEBUG("windows.js: openPrefWindow\n");

    EnigmailCore.getService(win, true); // true: starting preferences dialog

    let url;

    if (EnigmailPEPAdapter.usingPep()) {
      url = "chrome://enigmail/content/ui/pref-pep.xul";
    }
    else {
      url = "chrome://enigmail/content/ui/pref-enigmail.xul";
    }
    win.openDialog(url,
      "_blank", "chrome,resizable=yes", {
        'showBasic': showBasic,
        'clientType': 'thunderbird',
        'selectTab': selectTab
      });
  },

  /**
   * Display the dialog for creating a new per-recipient rule
   *
   * @win          - |object| holding the parent window for the dialog
   * @emailAddress - |string| containing the email address for the rule
   *
   * @return       - always true
   */
  createNewRule: function(win, emailAddress) {
    // make sure the rules database is loaded
    const enigmailSvc = EnigmailCore.getService(win);
    if (!enigmailSvc) {
      return false;
    }

    // open rule dialog
    EnigmailRules.getRulesData({});

    const inputObj = {
      toAddress: "{" + emailAddress + "}",
      options: "",
      command: "add"
    };
    win.openDialog("chrome://enigmail/content/ui/enigmailSingleRcptSettings.xul", "",
      "dialog,modal,centerscreen,resizable", inputObj, {});
    return true;
  },

  /**
   * Display the dialog for changing the expiry date of one or several keys
   *
   * @win        - |object| holding the parent window for the dialog
   * @userIdArr  - |array| of |strings| containing the User IDs
   * @keyIdArr   - |array| of |strings| containing the key IDs (eg. "0x12345678") to change
   *
   * @return  Boolean - true if expiry date was changed; false otherwise
   */
  editKeyExpiry: function(win, userIdArr, keyIdArr) {
    const inputObj = {
      keyId: keyIdArr,
      userId: userIdArr
    };
    const resultObj = {
      refresh: false
    };
    win.openDialog("chrome://enigmail/content/ui/enigmailEditKeyExpiryDlg.xul", "",
      "dialog,modal,centerscreen,resizable", inputObj, resultObj);
    return resultObj.refresh;
  },

  /**
   * Display the dialog for changing key trust of one or several keys
   *
   * @win        - |object| holding the parent window for the dialog
   * @userIdArr  - |array| of |strings| containing the User IDs
   * @keyIdArr   - |array| of |strings| containing the key IDs (eg. "0x12345678") to change
   *
   * @return  Boolean - true if key trust was changed; false otherwise
   */
  editKeyTrust: function(win, userIdArr, keyIdArr) {
    const inputObj = {
      keyId: keyIdArr,
      userId: userIdArr
    };
    const resultObj = {
      refresh: false
    };
    win.openDialog("chrome://enigmail/content/ui/enigmailEditKeyTrustDlg.xul", "",
      "dialog,modal,centerscreen,resizable", inputObj, resultObj);
    return resultObj.refresh;
  },


  /**
   * Display the dialog for signing a key
   *
   * @win        - |object| holding the parent window for the dialog
   * @userId     - |string| containing the User ID (for displaing in the dialog only)
   * @keyId      - |string| containing the key ID (eg. "0x12345678")
   *
   * @return  Boolean - true if key was signed; false otherwise
   */
  signKey: function(win, userId, keyId) {
    const inputObj = {
      keyId: keyId,
      userId: userId
    };
    const resultObj = {
      refresh: false
    };
    win.openDialog("chrome://enigmail/content/ui/enigmailSignKeyDlg.xul", "",
      "dialog,modal,centerscreen,resizable", inputObj, resultObj);
    return resultObj.refresh;
  },

  /**
   * Display the photo ID associated with a key
   *
   * @win        - |object| holding the parent window for the dialog
   * @keyId      - |string| containing the key ID (eg. "0x12345678")
   * @userId     - |string| containing the User ID (for displaing in the dialog only)
   * @photoNumber - |number| UAT entry in the squence of appearance in the key listing, starting with 0
   * no return value
   */
  showPhoto: function(win, keyId, userId, photoNumber) {
    const enigmailSvc = EnigmailCore.getService(win);
    if (enigmailSvc) {
      if (!photoNumber) photoNumber = 0;
      let keyObj = EnigmailKeyRing.getKeyById(keyId);
      if (!keyObj) {
        EnigmailWindows.alert(win, EnigmailLocale.getString("noPhotoAvailable"));
      }

      let photoFile = keyObj.getPhotoFile(photoNumber);

      if (photoFile) {
        if (!(photoFile.isFile() && photoFile.isReadable())) {
          EnigmailWindows.alert(win, EnigmailLocale.getString("error.photoPathNotReadable", photoFile.path));
        }
        else {
          const photoUri = Cc[IOSERVICE_CONTRACTID].getService(Ci.nsIIOService).
          newFileURI(photoFile).spec;
          const argsObj = {
            photoUri: photoUri,
            userId: userId,
            keyId: keyId
          };

          win.openDialog("chrome://enigmail/content/ui/enigmailDispPhoto.xul",
            photoUri,
            "chrome,modal,resizable,dialog,centerscreen",
            argsObj);
          try {
            // delete the photo file
            photoFile.remove(false);
          }
          catch (ex) {}
        }
      }
      else {
        EnigmailWindows.alert(win, EnigmailLocale.getString("noPhotoAvailable"));
      }
    }
  },

  /**
   * Display the OpenPGP Key Details window
   *
   * @win        - |object| holding the parent window for the dialog
   * @keyId      - |string| containing the key ID (eg. "0x12345678")
   * @refresh    - |boolean| if true, cache is cleared and the key data is loaded from GnuPG
   *
   * @return  Boolean - true:  keylist needs to be refreshed
   *                  - false: no need to refresh keylist
   */
  openKeyDetails: function(win, keyId, refresh) {
    const keyListObj = {};

    if (!win) {
      win = this.getBestParentWin();
    }

    keyId = keyId.replace(/^0x/, "");

    if (refresh) {
      EnigmailKeyRing.clearCache();
    }

    const inputObj = {
      keyId: keyId
    };
    const resultObj = {
      refresh: false
    };
    win.openDialog("chrome://enigmail/content/ui/keyDetailsDlg.xul", "",
      "dialog,modal,centerscreen,resizable", inputObj, resultObj);
    if (resultObj.refresh) {
      EnigmailKeyRing.clearCache();
    }

    return resultObj.refresh;
  },

  /**
   * Display the dialog to search and/or download key(s) from a keyserver
   *
   * @win        - |object| holding the parent window for the dialog
   * @inputObj   - |object| with member searchList (|string| containing the keys to search)
   * @resultObj  - |object| with member importedKeys (|number| containing the number of imporeted keys)
   *
   * no return value
   */
  downloadKeys: function(win, inputObj, resultObj) {
    EnigmailLog.DEBUG("windows.jsm: downloadKeys: searchList=" + inputObj.searchList + "\n");

    resultObj.importedKeys = 0;

    const ioService = Cc[IOSERVICE_CONTRACTID].getService(Ci.nsIIOService);
    if (ioService && ioService.offline) {
      EnigmailWindows.alert(win, EnigmailLocale.getString("needOnline"));
      return;
    }

    let valueObj = {};
    if (inputObj.searchList) {
      valueObj = {
        keyId: "<" + inputObj.searchList.join("> <") + ">"
      };
    }

    const keysrvObj = {};

    if (inputObj.searchList && inputObj.autoKeyServer) {
      keysrvObj.value = inputObj.autoKeyServer;
    }
    else {
      win.openDialog("chrome://enigmail/content/ui/enigmailKeyserverDlg.xul",
        "", "dialog,modal,centerscreen", valueObj, keysrvObj);
    }

    if (!keysrvObj.value) {
      return;
    }

    inputObj.keyserver = keysrvObj.value;

    if (!inputObj.searchList) {
      const searchval = keysrvObj.email.
      replace(/^(\s*)(.*)/, "$2").
      replace(/\s+$/, ""); // trim spaces
      // special handling to convert fingerprints with spaces into fingerprint without spaces
      if (searchval.length == 49 && searchval.match(/^[0-9a-fA-F ]*$/) &&
        searchval[4] == ' ' && searchval[9] == ' ' && searchval[14] == ' ' &&
        searchval[19] == ' ' && searchval[24] == ' ' && searchval[29] == ' ' &&
        searchval[34] == ' ' && searchval[39] == ' ' && searchval[44] == ' ') {
        inputObj.searchList = ["0x" + searchval.replace(/ /g, "")];
      }
      else if (searchval.length == 40 && searchval.match(/^[0-9a-fA-F ]*$/)) {
        inputObj.searchList = ["0x" + searchval];
      }
      else if (searchval.length == 8 && searchval.match(/^[0-9a-fA-F]*$/)) {
        // special handling to add the required leading 0x when searching for keys
        inputObj.searchList = ["0x" + searchval];
      }
      else if (searchval.length == 16 && searchval.match(/^[0-9a-fA-F]*$/)) {
        inputObj.searchList = ["0x" + searchval];
      }
      else {
        inputObj.searchList = searchval.split(/[,; ]+/);
      }
    }

    win.openDialog("chrome://enigmail/content/ui/enigmailSearchKey.xul",
      "", "dialog,modal,centerscreen", inputObj, resultObj);
  },

  /**
   * Open the Trustwords dialog for a specific pair of keys
   *
   * @param win:          Object - nsIWindow
   * @param emailAddress: String - Email address of peer to verify
   * @param headerData:   either: Object - nsIMsgHdr object for the message (to identify the ideal own identity)
   *                      or:     String - own email address to compare with
   *
   * @return: Promise (resolve() case of success; rejection otherwise).
   */
  verifyPepTrustWords: function(win, emailAddress, headerData) {
    return new Promise((resolve, reject) => {
      EnigmailPEPAdapter.prepareTrustWordsDlg(emailAddress, headerData).
      then(function _ok(inputObj) {
        win.openDialog("chrome://enigmail/content/ui/pepTrustWords.xul",
          "", "dialog,modal,centerscreen", inputObj);
        resolve();
      }).
      catch(function _err(errorMsg) {
        switch (errorMsg) {
          case "cannotVerifyOwnId":
            EnigmailWindows.alert(win, EnigmailLocale.getString("pepTrustWords.cannotVerifyOwnId"));
            break;
          case "cannotFindKey":
            EnigmailWindows.alert(win, EnigmailLocale.getString("pepTrustWords.cannotFindKey", emailAddress));
            break;
          default:
            EnigmailWindows.alert(win, EnigmailLocale.getString("pepTrustWords.generalFailure", emailAddress));
            break;
        }
        reject();
      });
    });
  },

  pepHandshake: function(window, direction, myself, peers) {
    let inputObj = {
      myself: myself,
      peers: peers,
      direction: direction
    };

    window.openDialog("chrome://enigmail/content/ui/pepHandshake.xul",
      "", "dialog,modal,centerscreen", inputObj);

  },


  /**
   * Display Autocrypt Setup Passwd dialog.
   *
   * @param dlgMode:       String - dialog mode: "input" / "display"
   * @param passwdType:    String - type of password ("numeric9x4" / "generic")
   * @param password:      String - password or initial two digits of password
   *
   * @return String entered password (in input mode) or NULL
   */
  autocryptSetupPasswd: function(window, dlgMode, passwdType = "numeric9x4", password) {
    if (!window) {
      window = this.getBestParentWin();
    }

    let inputObj = {
      password: null,
      passwdType: passwdType,
      dlgMode: dlgMode
    };

    if (password) inputObj.initialPasswd = password;

    window.openDialog("chrome://enigmail/content/ui/autocryptSetupPasswd.xul",
      "", "dialog,modal,centerscreen", inputObj);

    return inputObj.password;
  },

  /**
   * Display dialog to initiate the Autocrypt Setup Message.
   *
   */
  inititateAcSetupMessage: function(window) {
    if (!window) {
      window = this.getBestParentWin();
    }

    window.openDialog("chrome://enigmail/content/ui/autocryptInitiateBackup.xul",
      "", "dialog,centerscreen");
  },

  /**
   * Open a URL in a tab on the main window. The URL can either be a web page
   * (e.g. https://enigmail.net/ or a chrome document (e.g. chrome://enigmail/content/ui/x.xul))
   *
   * @param aURL:    String - the URL to open
   * @param winName: String - name of the window; used to identify if it is already open
   */
  openMailTab: function(aURL, windowName) {
    if (!EnigmailCompat.isPostbox()) {
      let tabs = EnigmailStdlib.getMail3Pane().document.getElementById("tabmail");

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
    }
    else {
      EnigmailWindows.openWin(windowName,
        aURL, "resizable,centerscreen");
    }
  },

  shutdown: function(reason) {
    EnigmailLog.DEBUG("windows.jsm: shutdown()\n");

    let tabs = EnigmailStdlib.getMail3Pane().document.getElementById("tabmail");

    for (let i = tabs.tabInfo.length - 1; i >= 0; i--) {
      if ("openedUrl" in tabs.tabInfo[i] && tabs.tabInfo[i].openedUrl.startsWith("chrome://enigmail/")) {
        tabs.closeTab(tabs.tabInfo[i]);
      }
    }
  },

  openPepUpgradeInfo: function() {
    if (gPepUpgradeDisplayed) return; // only show dialog once per session
    gPepUpgradeDisplayed = true;
    let locale = Cc["@mozilla.org/intl/localeservice;1"].getService(Ci.mozILocaleService).appLocalesAsBCP47;
    if (locale && locale.length > 0) {
      locale = locale[0].substr(0, 2);
    }
    else {
      locale = "en";
    }

    let platform = AppConstants.platform.replace(/[ \t].*$/, "");
    const URL="https://pep.software/thunderbird/%p?lang=%l";

    let url = URL.replace("%p", platform).replace("%l", locale);
    openExternalUrl(url);
  }
};



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
