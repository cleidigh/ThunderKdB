// This Source Code Form is subject to the terms of the Mozilla Public
// License, v. 2.0. If a copy of the MPL was not distributed with this
// file, You can obtain one at http://mozilla.org/MPL/2.0/.
//
// Copyright 2017 Jonathan Kamens.

// https://developer.mozilla.org/en-US/docs/Extensions/bootstrap.js
// Also, lots of code here cribbed from
// https://developer.mozilla.org/en-US/Add-ons/How_to_convert_an_overlay_extension_to_restartless

var { ExtensionCommon } = ChromeUtils.import("resource://gre/modules/ExtensionCommon.jsm");
var { ExtensionParent } = ChromeUtils.import("resource://gre/modules/ExtensionParent.jsm");
var {Services} = ChromeUtils.import("resource://gre/modules/Services.jsm");
var extension = ExtensionParent.GlobalManager.getExtension("remote-content-by-folder@kamens.us");
var { ExtensionSupport } = ChromeUtils.import("resource:///modules/ExtensionSupport.jsm");

//const {Log4Moz} = ChromeUtils.import("resource:///modules/gloda/log4moz.js");

// From nsMsgContentPolicy.cpp
const kNoRemoteContentPolicy = 0, kBlockRemoteContent = 1,
      kAllowRemoteContent = 2;
const contentPolicyProperty = "remoteContentPolicy";

prefBranch = Services.prefs;
prefPrefix = "extensions.remote-content-by-folder";
allowPref = prefPrefix + ".allow_regexp";
blockPref = prefPrefix + ".block_regexp";
blockFirstPref = prefPrefix + ".block_first";



var rcmbf_bgrndAPI = class extends ExtensionCommon.ExtensionAPI
{
    getAPI(context)
        {
               return{
                rcmbf_bgrndAPI:
                            {
                                onLoad: function()
                                 {
                                    var {DefaultPreferencesLoader} = ChromeUtils.import(extension.rootURI.resolve("/content/defaultPreferencesLoader.jsm"));
                                    var loader = new DefaultPreferencesLoader();
                                    loader.parseUri(extension.rootURI.resolve("/content/prefs.js"));
                                    initLogging();
                                    addNewMessageListener();
                                    Services.obs.addObserver(WindowObserver, "mail-startup-done", false);
                                    forEachOpenWindow(loadIntoWindow);
                                }


                            }
                    };
        }
};





function checkRegexp(msgHdr, prefName, setValue) {
    var regexp = prefBranch.getCharPref(prefName);
    if (regexp != "") {
        try {
            regexpObj = new RegExp(regexp);
        }
        catch (ex) {
            console.error("Invalid regexp: \"" + regexp + "\"");
        }
        console.debug("Testing " + prefName + " regexp \"" + regexp +
                     "\" against folder name \"" + msgHdr.folder.name + "\"");
        if (regexpObj.test(msgHdr.folder.name)) {
            console.debug(prefName + " regexp \"" + regexp +
                         "\" matched folder name \"" + msgHdr.folder.name +
                         "\"");
            msgHdr.setUint32Property(contentPolicyProperty, setValue);
            return true;
        }
        console.debug(prefName + " regexp \"" + regexp +
                     "\" didn't match folder name \"" + msgHdr.folder.name +
                     "\"");
        return false;
    }
    console.debug(prefName + " is empty, not testing");
    return false;
}

newMessageListener = {
    itemDeleted: function(item) {},
    itemMoveCopyCompleted: function(move, srcitems, destfolder) {},
    folderRenamed: function(oldName, newName) {},
    itemEvent: function(item, event, data) {},

    msgAdded: function(aMsgHdr) {
        try {
            var current = aMsgHdr.getUint32Property(contentPolicyProperty);
            if (current != kNoRemoteContentPolicy) {
                console.debug("Property " + contentPolicyProperty +
                             " on message " + aMsgHdr + " set to " + current +
                             ", not modifying");
                return;
            }
        }
        catch (ex) {}
        var blockFirst = prefBranch.getBoolPref(blockFirstPref);
        if (blockFirst)
            if (checkRegexp(aMsgHdr, blockPref, kBlockRemoteContent))
                return;
        if (checkRegexp(aMsgHdr, allowPref, kAllowRemoteContent))
            return;
        if (! blockFirst)
            if (checkRegexp(aMsgHdr, blockPref, kBlockRemoteContent))
                return;
    }
};
function addNewMessageListener() {
    var notificationService = Components
        .classes["@mozilla.org/messenger/msgnotificationservice;1"]
        .getService(Components.interfaces
                    .nsIMsgFolderNotificationService);
    notificationService.addListener(newMessageListener,
                                    notificationService.msgAdded);
};
function removeNewMessageListener() {
    var notificationService = Components
        .classes["@mozilla.org/messenger/msgnotificationservice;1"]
        .getService(Components.interfaces
                    .nsIMsgFolderNotificationService);
    notificationService.removeListener(newMessageListener);
};

function initLogging() {
    try {
      //  delete Log4Moz.repository._loggers[prefPrefix];
    }
    catch (ex) {}
   /* logger = Log4Moz.getConfiguredLogger(prefPrefix,
                                         Log4Moz.Level.Trace,
                                         Log4Moz.Level.Info,
                                         Log4Moz.Level.Debug);  */
    observer = { observe: initLogging }
    Services.prefs.addObserver(prefPrefix + ".logging.console", observer,
                               false);
    Services.prefs.addObserver(prefPrefix + ".logging.dump", observer, false);
    console.debug("Initialized logging for Remote Content By Folder");
}

function forEachOpenWindow(todo) { // Apply a function to all open windows
  for (let window of Services.wm.getEnumerator("mail:3pane")) {
    if (window.document.readyState != "complete")
      continue;
    todo(window);
  }
}

var WindowObserver = {
    observe: function(aSubject, aTopic, aData) {
        var window = aSubject;
        var document = window.document;
        if (document.documentElement.getAttribute("windowtype") ==
            "mail:3pane") {
            loadIntoWindow(window);
        }
    },
};

function loadIntoWindow(window) {
}
