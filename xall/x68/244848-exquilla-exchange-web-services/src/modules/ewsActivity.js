/* -*- Mode: Java; tab-width: 2; indent-tabs-mode: nil; c-basic-offset: 2 -*- */
/* ***** BEGIN LICENSE BLOCK *****
 * Version: MPL 1.1/GPL 2.0/LGPL 2.1
 *
 * The contents of this file are subject to the Mozilla Public License Version
 * 1.1 (the "License"); you may not use this file except in compliance with
 * the License. You may obtain a copy of the License at
 * http://www.mozilla.org/MPL/
 *
 * Software distributed under the License is distributed on an "AS IS" basis,
 * WITHOUT WARRANTY OF ANY KIND, either express or implied. See the License
 * for the specific language governing rights and limitations under the
 * License.
 *
 * The Original Code is Thunderbird Activity Manager.
 *
 * The Initial Developer of the Original Code is
 * Mozilla Messaging.
 * Portions created by the Initial Developer are Copyright (C) 2010
 * the Initial Developer. All Rights Reserved.
 *
 * Contributor(s):
 *   David Bienvenu <bienvenu@mozillamessaging.com>
 *   R. Kent James <rkent@mesquilla.com>
 *
 * Alternatively, the contents of this file may be used under the terms of
 * either the GNU General Public License Version 2 or later (the "GPL"), or
 * the GNU Lesser General Public License Version 2.1 or later (the "LGPL"),
 * in which case the provisions of the GPL or the LGPL are applicable instead
 * of those above. If you wish to allow use of your version of this file only
 * under the terms of either the GPL or the LGPL, and not to allow others to
 * use your version of this file under the terms of the MPL, indicate your
 * decision by deleting the provisions above and replace them with the notice
 * and other provisions required by the GPL or the LGPL. If you do not delete
 * the provisions above, a recipient may use your version of this file under
 * the terms of any one of the MPL, the GPL or the LGPL.
 *
 * ***** END LICENSE BLOCK ***** */

const EXPORTED_SYMBOLS = ['ewsActivityModule'];
var Cu = Components.utils;
var { XPCOMUtils } = ChromeUtils.import("resource://gre/modules/XPCOMUtils.jsm");
var { Utils } = ChromeUtils.import("resource://exquilla/ewsUtils.jsm");
Utils.importLocally(this);
var _log = null;
XPCOMUtils.defineLazyGetter(this, "log", () => {
  if (!_log) _log = Utils.configureLogging("activity");
  return _log;
});

const nsActProcess = Components.Constructor("@mozilla.org/activity-process;1",
                                            "nsIActivityProcess", "init");
const nsActEvent = Components.Constructor("@mozilla.org/activity-event;1",
                                          "nsIActivityEvent", "init");
const nsActWarning = Components.Constructor("@mozilla.org/activity-warning;1",
                                            "nsIActivityWarning", "init");

var { XPCOMUtils } = ChromeUtils.import("resource://gre/modules/XPCOMUtils.jsm");
var { PluralForm } = ChromeUtils.import("resource://gre/modules/PluralForm.jsm");

// This module provides a link between the ews service code and the activity
// manager.
var ewsActivityModule =
{
  // hash table of most recent download items per folder
  _mostRecentActivityForFolder: {},
  // hash table of prev download items per folder, so we can
  // coalesce consecutive no new message events.
  _prevActivityForFolder: {},

  _log: null,
  get log() {
    if (!this._log) this._log = Utils.configureLogging("base");
    return this._log;
  },

  get activityMgr() {
    delete this.activityMgr;
    return this.activityMgr = Cc["@mozilla.org/activity-manager;1"]
                                .getService(Ci.nsIActivityManager);
  },

  get bundle() {
    delete this.bundle;
    let bundleSvc = Cc["@mozilla.org/intl/stringbundle;1"]
                      .getService(Ci.nsIStringBundleService);

    return this.bundle = bundleSvc
      .createBundle("chrome://messenger/locale/activity.properties");
  },

  get ewsBundle() {
    delete this.ewsBundle;
    let bundleSvc = Cc["@mozilla.org/intl/stringbundle;1"]
                      .getService(Ci.nsIStringBundleService);
    try {
      return this.ewsBundle = bundleSvc
        .createBundle("chrome://exquilla/locale/exquilla.properties");
    }
    catch (e) {
      // maybe we are doing xpcshell tests
      dl('could not get string bundle exquilla.properties');
      return null;
    }
  },
  
  getString: function(stringName) {
    try {
      return this.bundle.GetStringFromName(stringName)
    } catch (e) {
      this.log.error("error trying to get a string called: " + stringName);
      return '';
    }
  },

  getEwsString: function(stringName) {
    try {
      return this.ewsBundle.GetStringFromName(stringName)
    } catch (e) {
      // this happens in tests
      //this.log.warn("error trying to get a string called: " + stringName);
      return '';
    }
  },

  onDownloadStarted : function(aFolder) {
    if (!isMailFolder(aFolder)) return;

    let displayText;
    try { // TB 52
      displayText = this.bundle
                          .formatStringFromName("pop3EventStartDisplayText",
                                               [aFolder.displayName], 1);
    } catch (ex) { // TB 60
      displayText =
        this.bundle.formatStringFromName("pop3EventStartDisplayText2",
                                         ["ExQuilla", // account name
                                          aFolder.prettyName], 2);   // folder name
    }
    // remember the prev activity for this folder, if any.
    this._prevActivityForFolder[aFolder.folderURI] =
      this._mostRecentActivityForFolder[aFolder.folderURI];
    let statusText = aFolder.displayName;

    // create an activity event
    let event = new nsActEvent(displayText,
                               aFolder.folderURI,
                               statusText,
                               Date.now(),  // start time
                               Date.now()); // completion time

    event.iconClass = "syncMail";

    let downloadItem = {};
    downloadItem.eventID = this.activityMgr.addActivity(event);
    this._mostRecentActivityForFolder[aFolder.folderURI] = downloadItem;
  },

  onDownloadProgress : function(aFolder, aNumMsgsDownloaded, aTotalMsgs) {
    this.log.debug("onDownloadProgress(" + aNumMsgsDownloaded + "," + aTotalMsgs + ")");
    let folderName = '';
    if (aFolder instanceof Ci.nsIMsgFolder)
    {
      folderName = aFolder.name + '(' + aFolder.server.prettyName + '): ';
      let str = this.getEwsString("ewsUpdatedStatusText");
      if (!str)
        str = this.getString("pop3EventStatusText");

      let displayText = PluralForm.get(aNumMsgsDownloaded, str);
      displayText = displayText.replace("#1", aNumMsgsDownloaded);
      if (this.statusTextElement)
        this.statusTextElement.setAttribute("label", folderName + displayText);
    }
  },

  onDownloadCompleted : function(aFolder, aNumMsgsDownloaded) {
    this.log.debug("onDownloadCompleted(" + aNumMsgsDownloaded + ")");
    if (!isMailFolder(aFolder)) return;
    this._DownloadCompleted(aFolder, aNumMsgsDownloaded, true);
  },

  onDownloadAborted: function(aFolder) {
    if (!isMailFolder(aFolder)) return;
    this._DownloadCompleted(aFolder, 0, false);
  },

  onCopyStarted: function onCopyStarted(aFolder, aNumberOfMessages, aIsMove) {
    if (aFolder instanceof Ci.nsIMsgFolder)
    { try {
      let folderName = aFolder.name + '(' + aFolder.server.prettyName + '): ';
      let displayText = aIsMove ? PluralForm.get(aNumberOfMessages, this.getEwsString("MovingMessages")) :
                                  PluralForm.get(aNumberOfMessages, this.getEwsString("CopyingMessages"));
      displayText = displayText.replace("#1", aNumberOfMessages);
      dl(displayText);
      if (this.statusTextElement)
        this.statusTextElement.setAttribute("label", folderName + displayText);
      else
        dl('Warning: statusTextElement not set in ewsActivity.onCopyStarted');
    } catch(e) {dl(e);}}
  },

  showStatus: function showStatus(aMessage) {
    if (this.statusTextElement)
      this.statusTextElement.setAttribute("label", aMessage);
  },

  showFailed: function showFailed() {
    if (this.statusTextElement)
      this.statusTextElement.setAttribute("label", this.getString("failed"));
  },

  statusTextElement: null,   // This is set in js, and used to directly output progress

  _DownloadCompleted : function(aFolder, aNumMsgsDownloaded, aSuccess) {

    if (this._mostRecentActivityForFolder[aFolder.folderURI])
      this.activityMgr.removeActivity(this._mostRecentActivityForFolder[aFolder.folderURI].eventID);

    let displayText;
    if (!aSuccess)
    {
      displayText = this.ewsBundle.formatStringFromName("folderUnavailable",
                                                        [aFolder.displayName], 1);
    }
    else if (aNumMsgsDownloaded > 0)
    {
      let str = this.getEwsString("ewsUpdatedStatusText");
      if (!str)
        str = this.getString("pop3EventStatusText");
      displayText = PluralForm.get(aNumMsgsDownloaded, str);
      displayText = displayText.replace("#1", aNumMsgsDownloaded);
    }
    else
      displayText = this.getString("pop3EventStatusTextNoMsgs");

    let statusText = aFolder.folderURI;

    // create an activity event
    let event = new nsActEvent(displayText,
                               aFolder.folderURI,
                               statusText,
                               Date.now(),  // start time
                               Date.now()); // completion time

    event.iconClass = "syncMail";

    let downloadItem = {numMsgsDownloaded: aNumMsgsDownloaded};
    this._mostRecentActivityForFolder[aFolder.folderURI] = downloadItem;
    downloadItem.eventID = this.activityMgr.addActivity(event);
    if (!aNumMsgsDownloaded) {
      // if we didn't download any messages this time, and the prev event
      // for this folder also didn't download any messages, remove the
      // prev event from the activity manager.
      let prevItem = this._prevActivityForFolder[aFolder.folderURI];
      if (prevItem != undefined && !prevItem.numMsgsDownloaded)
        this.activityMgr.removeActivity(prevItem.eventID);
    }
  },

};

// helper functions
function isMailFolder(aFolder)
{
  return (/^IPF\.Note/.test(aFolder.folderClass));
}
