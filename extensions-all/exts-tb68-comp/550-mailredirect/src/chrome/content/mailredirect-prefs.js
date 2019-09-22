"use strict";

(function() {

var Services, NetUtil, MailServices, AppConstants;
if (typeof ChromeUtils === "object" && typeof ChromeUtils.import === "function") {
  // New way of importing in TB67+
  var { Services } = ChromeUtils.import("resource://gre/modules/Services.jsm");
  var { NetUtil } = ChromeUtils.import("resource://gre/modules/NetUtil.jsm");
  try {
    var { MailServices } = ChromeUtils.import("resource:///modules/MailServices.jsm"); // TB63+
  } catch(ex) {
    var { MailServices } = ChromeUtils.import("resource:///modules/mailServices.js");
  }
  var { AppConstants } = ChromeUtils.import("resource://gre/modules/AppConstants.jsm");
} else {
  var { Services } = Components.utils.import("resource://gre/modules/Services.jsm", null);
  var { NetUtil } = Components.utils.import("resource://gre/modules/NetUtil.jsm", null);
  var { MailServices } = Components.utils.import("resource:///modules/mailServices.js", null); // Gecko 5+ (TB5)
  try {
    var { AppConstants } = Components.utils.import("resource://gre/modules/AppConstants.jsm", null); // Gecko 45+
  } catch(ex) { };
}

const THUNDERBIRD_ID = "{3550f703-e582-4d05-9a08-453d09bdfdc6}";
const SEAMONKEY_ID = "{92650c4d-4b8e-4d2a-b7eb-24ecf4f6b63a}";

const Cc = Components.classes, Ci = Components.interfaces;

window.MailredirectPrefs = {

  mInitialized: false,

  onpaneload: function()
  {
    MailredirectPrefs.init();
    MailredirectPrefs.updateHideMenuitems();
    MailredirectPrefs.updateDefaultMode();
  },

  init: function()
  {
    if (!MailredirectPrefs.mInitialized) {
      var prefService = Cc["@mozilla.org/preferences-service;1"].
                        getService(Ci.nsIPrefService);
      var defaultBranch = prefService.getDefaultBranch("extensions.mailredirect.");
      defaultBranch.setBoolPref("addToForwardAs", true);
      defaultBranch.setBoolPref("hideRedirectMenuitems", false);
      defaultBranch.setIntPref("concurrentConnections", 5);
      defaultBranch.setCharPref("defaultResentTo", "");
      defaultBranch.setCharPref("defaultResentCc", "");
      defaultBranch.setCharPref("defaultResentBcc", "");
      defaultBranch.setCharPref("defaultMode", "addr_to");
      defaultBranch.setBoolPref("debug", false);
      defaultBranch.setIntPref("addresswidget.numRowsShownDefault", 3);
      defaultBranch.setBoolPref("addUserAgent", false);
      defaultBranch.setBoolPref("firstrun.button-contacts", false);
      defaultBranch.setBoolPref("firstrun.unpack-icon", false);

      MailredirectPrefs.mInitialized = true;
    }
  },

  updateHideMenuitems: function()
  {
    var addToForwardAs = document.getElementById("addToForwardAs");
    var hideRedirectMenuitems = document.getElementById("hideRedirectMenuitems");
    hideRedirectMenuitems.disabled = !addToForwardAs.checked;
  },

  updateDefaultMode: function()
  {
    var defaultResendTo = document.getElementById("defaultResendTo");
    var defaultResendCc = document.getElementById("defaultResendCc");
    var defaultResendBcc = document.getElementById("defaultResendBcc");
    var defaultMode = document.getElementById("defaultMode");
    defaultMode.disabled = !(defaultResendTo.value.match(/^\s*$/) &&
                             defaultResendCc.value.match(/^\s*$/) &&
                             defaultResendBcc.value.match(/^\s*$/));
  },

  saveConsoleContent: function()
  {
    const nsIFilePicker = Ci.nsIFilePicker;

    let strbundle = Services.strings.createBundle("chrome://mailredirect/locale/mailredirect-prefs.properties");

    // open filePicker
    let filePicker = Cc["@mozilla.org/filepicker;1"].
                     createInstance(nsIFilePicker);
    filePicker.init(window, strbundle.GetStringFromName("saveFile2"), nsIFilePicker.modeSave);
    filePicker.appendFilters(nsIFilePicker.filterText);
    filePicker.appendFilters(nsIFilePicker.filterAll);
    filePicker.defaultString = "errorconsole.txt";

    let filePickerCallback = function filePickerCallbackDone(aResult) {
      if (aResult === nsIFilePicker.returnOK || aResult === nsIFilePicker.returnReplace) {
        var file;
        try {
          file = filePicker.file.QueryInterface(Ci.nsIFile);
        } catch(ex) {
          // Starting with Gecko 14, `nsILocalFile` inherits all functions and attributes from `nsIFile`
          file = filePicker.file.QueryInterface(Ci.nsILocalFile);
        }

        var fileStream = Cc["@mozilla.org/network/file-output-stream;1"].
                         createInstance(Ci.nsIFileOutputStream);
        fileStream.init(file, -1, -1, null);

        var charset = "UTF-8";
        var converter = Cc["@mozilla.org/intl/converter-output-stream;1"].
                        createInstance(Ci.nsIConverterOutputStream);
        converter.init(fileStream, charset, 0, 0x0000);

        // for every nsIConsoleMessage save it to file
        var consoleService = Cc["@mozilla.org/consoleservice;1"].
                             getService(Ci.nsIConsoleService);
        var messagesArray = {};
        // Retrieve the message array in a compatible way for both Gecko prior
        // to 19 and Gecko 19 or later
        var messagesArray = consoleService.getMessageArray(messagesArray, {}) || messagesArray.value;
        for (var i = 0; i < messagesArray.length; ++i) {
          var m = messagesArray[i].message;
          m = (i+1) + ". " + m.replace(/^\s*[\n]+|[\n]+\s*$/g, "") + "\n";
          converter.writeString(m);
        }
        converter.close();
        fileStream.close();
      }
    }

    try {
      // Gecko 17+: Open the dialog asynchronously
      filePicker.open(filePickerCallback);
    } catch (ex) {
      // Deprecated since Gecko 17: Display the file picker dialog
      if (filePicker.show() !== Ci.nsIFilePicker.returnCancel) {
        filePickerCallback(nsIFilePicker.returnOK);
      }
    }
  },

  sendViaEmail: function()
  {
    try {
      var tempFile = Cc["@mozilla.org/file/directory_service;1"].
                 getService(Ci.nsIProperties).
                 get("TmpD", Ci.nsIFile);
      tempFile.append("errorconsole.txt");
      tempFile.createUnique(Ci.nsIFile.NORMAL_FILE_TYPE, parseInt("0600", 8));
      var fileStream = Cc["@mozilla.org/network/file-output-stream;1"].
                   createInstance(Ci.nsIFileOutputStream);
      fileStream.init(tempFile, -1, -1, 0);

      var charset = "UTF-8";
      var converter = Cc["@mozilla.org/intl/converter-output-stream;1"].
                      createInstance(Ci.nsIConverterOutputStream);
      converter.init(fileStream, charset, 0, 0x0000);

      // for every nsIConsoleMessage save it to file
      var consoleService = Cc["@mozilla.org/consoleservice;1"].
                           getService(Ci.nsIConsoleService);
      var messagesArray = {};
      // Retrieve the message array in a compatible way for both Gecko prior
      // to 19 and Gecko 19 or later
      var messagesArray = consoleService.getMessageArray(messagesArray, {}) || messagesArray.value;
      for (var i = 0; i < messagesArray.length; ++i) {
        var m = messagesArray[i].message;
        m = (i+1) + ". " + m.replace(/^\s*[\n]+|[\n]+\s*$/g, "") + "\n";
        converter.writeString(m);
      }
      converter.close();
      fileStream.close();

      // Set up parameters and fields to use for the compose window.
      let params = Cc["@mozilla.org/messengercompose/composeparams;1"].
                   createInstance(Ci.nsIMsgComposeParams);
      params.type = Ci.nsIMsgCompType.New;
      params.format = Ci.nsIMsgCompFormat.Default;

      let fields = Cc["@mozilla.org/messengercompose/composefields;1"]
                     .createInstance(Ci.nsIMsgCompFields);
      fields.forcePlainText = false;

      let dataTxt = "";
      fields.body = dataTxt;
      // In general we can have non-ASCII characters, and compose's charset
      // detection doesn't seem to work when the HTML part is pure ASCII but the
      // text isn't. So take the easy way out and force UTF-8.
      fields.characterSet = "UTF-8";
      fields.bodyIsAsciiOnly = false;

      let attachment = Cc["@mozilla.org/messengercompose/attachment;1"].
                       createInstance(Ci.nsIMsgAttachment);
      var tempUri = Services.io.newFileURI(tempFile);
      if (tempUri instanceof Ci.nsIFileURL) {
        if (tempUri.file.exists()) {
          attachment.size = tempUri.file.fileSize;
        }
        attachment.url = tempUri.spec;
      } else {
        // resolveURI does all the magic around working out what the
        // attachment is, including web pages, and generating the correct uri.
        let commandLine = Cc["@mozilla.org/toolkit/command-line;1"].
                          createInstance();
        let uri = commandLine.resolveURI(tempFile.path);
        // If uri is for a file and it exists set the attachment size.
        if (uri instanceof Ci.nsIFileURL) {
          if (uri.file.exists()) {
            attachment.size = uri.file.fileSize;
          }
          attachment.url = uri.spec;
        }
      }
      fields.addAttachment(attachment);
      params.composeFields = fields;

      // Our params are set up. Now open a compose window.
      MailServices.compose.OpenComposeWindowWithParams(null, params);
    } catch (ex) {
      Components.utils.reportError(ex);
      let prefsBundle = Services.strings.createBundle("chrome://mailredirect/locale/mailredirect-prefs.properties");
      let errorTitle = prefsBundle.GetStringFromName("tempFileErrorDlogTitle");
      let errorMsg = prefsBundle.GetStringFromName("tempFileErrorDlogMessage");
      Services.prompt.alert(window, errorTitle, errorMsg);
    }
  },

  getPref: function (aPrefName, aIsComplex)
  {
    if (aIsComplex) {
      return Services.prefs.getComplexValue(aPrefName, Ci.nsISupportsString).data;
    }
    switch (Services.prefs.getPrefType(aPrefName)) {
      case Ci.nsIPrefBranch.PREF_BOOL:
        return Services.prefs.getBoolPref(aPrefName);
      case Ci.nsIPrefBranch.PREF_INT:
        return Services.prefs.getIntPref(aPrefName);
      case Ci.nsIPrefBranch.PREF_STRING:
        return Services.prefs.getCharPref(aPrefName);
      default: // includes nsIPrefBranch.PREF_INVALID
        return null;
    }
  },

  unpackIcon: function()
  {
    function copyFile(aURL, aSink) {
      let uri = Services.io.newURI(aURL);
      let channel;
      try {
        // TB68+ (In bug 1529252 the 2 was removed from this service)
        channel = Services.io.newChannelFromURI(uri,
                                                null,
                                                Services.scriptSecurityManager.getSystemPrincipal(),
                                                null,
                                                Components.interfaces.nsILoadInfo.SEC_REQUIRE_SAME_ORIGIN_DATA_INHERITS,
                                                Components.interfaces.nsIContentPolicy.TYPE_OTHER);
      } catch(ex) {
        // TB60
        channel = Services.io.newChannelFromURI2(uri,
                                                   null,
                                                   Services.scriptSecurityManager.getSystemPrincipal(),
                                                   null,
                                                   Components.interfaces.nsILoadInfo.SEC_REQUIRE_SAME_ORIGIN_DATA_INHERITS,
                                                   Components.interfaces.nsIContentPolicy.TYPE_OTHER);
      }

      NetUtil.asyncFetch(channel, function(aInputStream, aResult) {
        if (!Components.isSuccessCode(aResult)) {
          Components.utils.reportError("asyncFetch failed: " + aResult);
          return;
        }
        NetUtil.asyncCopy(aInputStream, aSink, function(aResult) {
          if (!Components.isSuccessCode(aResult)) {
            Components.utils.reportError("NetUtil.asyncCopy failed: " + aResult);
          }
        });
      });
    }

    let firstRunPref = "extensions.mailredirect.firstrun.unpack-icon";
    if (!this.getPref(firstRunPref)) {
      var iconArray;
      var allExist = true;
      var allCopied = true;
      var platform = AppConstants.platform;
      if (platform === "win") {
        iconArray = [ "msgMailRedirectWindow.ico" ];
      } else {
        iconArray = [ "msgMailRedirectWindow.xpm", "msgMailRedirectWindow16.xpm" ];
      }

      for (var i = 0; i < iconArray.length; i++) {
        let iconFilename = iconArray[i];
        let profileIcon = Cc["@mozilla.org/file/directory_service;1"].
                          getService(Ci.nsIProperties).
                          get("ProfD", Ci.nsIFile);
        profileIcon.append("extensions");
        profileIcon.append("{CC3C233D-6668-41bc-AAEB-F3A1D1D594F5}");
        profileIcon.append("chrome");
        profileIcon.append("icons");
        profileIcon.append("default");
        profileIcon.append(iconFilename);

        if (!profileIcon.exists()) {
          // Icon doesn't exist, so extension isn't unpacked
          allExist = false;
          let chromeIcon = Cc["@mozilla.org/file/directory_service;1"].
                           getService(Ci.nsIProperties).
                           get("AChrom", Ci.nsIFile);
          chromeIcon.append("icons");
          chromeIcon.append("default");
          chromeIcon.append(iconFilename);

          if (!chromeIcon.exists()) {
            // Icon doesn't exist in program folder, so copy it
            var file;

            try {
              file = Cc["@mozilla.org/file/local;1"].
                     createInstance(Ci.nsIFile);
              file.initWithFile(chromeIcon);
            } catch(ex) {
              // Starting with Gecko 14, `nsILocalFile` inherits all functions and attributes from `nsIFile`
              file = Cc["@mozilla.org/file/local;1"].
                     createInstance(Ci.nsILocalFile);
              file.initWithFile(chromeIcon);
            }

            var aFileOutputStream = Cc["@mozilla.org/network/file-output-stream;1"].
                                    createInstance(Ci.nsIFileOutputStream);
            try {
              aFileOutputStream.init(file, -1, -1, 0);
              copyFile("chrome://mailredirect-icons/content/default/" + iconFilename, aFileOutputStream);

              if (!chromeIcon.exists()) {
                // Icon still doesn't exist
                Components.utils.reportError(chromeIcon.path + " still doesn't exist");
                allCopied = false;
              }
            } catch(ex) {
              Components.utils.reportError("Error initializing file output stream " + chromeIcon.path + ": " + ex);
              allCopied = false;
            }
          }
        }
      }
      if (!allExist && allCopied) {
        Services.prefs.setBoolPref(firstRunPref, true);
      }
    }
  }
}

var _orgOpenAddonPrefs = window.openAddonPrefs;

window.openAddonPrefs = function() {
  if (arguments[0] === "chrome://mailredirect/content/mailredirect-prefs.xul") {
    var appInfo = Cc["@mozilla.org/xre/app-info;1"].getService(Ci.nsIXULAppInfo);
    var gAppInfoID = appInfo.ID;
    var gAppInfoPlatformVersion = parseInt(appInfo.platformVersion.replace(/\..*/,''));
    if (gAppInfoPlatformVersion < 70) {
      openOptionsDialog("paneRedirect");
    } else {
      openOptionsDialog("paneCompose", "redirectCategory");
    }
  } else {
    var rv = _orgOpenAddonPrefs.apply(window, arguments);
  }
}

})();
