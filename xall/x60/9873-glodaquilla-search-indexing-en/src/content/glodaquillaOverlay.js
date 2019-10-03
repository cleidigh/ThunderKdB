/*
 ***** BEGIN LICENSE BLOCK *****
 * This file is part of the application GlodaQuilla by Mesquilla.
 *
 * This application is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * You should have received a copy of the GNU General Public License
 * along with this application.  If not, see <http://www.gnu.org/licenses/>.
 *
 * Software distributed under the License is distributed on an "AS IS" basis,
 * WITHOUT WARRANTY OF ANY KIND, either express or implied. See the License
 * for the specific language governing rights and limitations under the
 * License.
 *
 * The Original Code is Mesquilla code.
 *
 * The Initial Developer of the Original Code is
 * Kent James <rkent@mesquilla.com>
 * Portions created by the Initial Developer are Copyright (C) 2009, 2010
 * the Initial Developer. All Rights Reserved.
 *
 * Contributor(s):  opto (Klaus))
 *
 * ***** END LICENSE BLOCK *****
 */

(function glodaquilla()
{
  // local shorthand for the global reference
  this.glodaquilla = {};
  let self = this.glodaquilla;

  const Cc = Components.classes;
  const Ci = Components.interfaces;
  const Cu = Components.utils;

  Cu.import("resource:///modules/iteratorUtils.jsm");
  Cu.import("resource:///modules/gloda/gloda.js");
  Cu.import("resource:///modules/gloda/datastore.js");
  Cu.import("resource:///modules/gloda/datamodel.js");
  Cu.import("resource:///modules/gloda/indexer.js");
  Cu.import("resource:///modules/gloda/index_msg.js");
  Cu.import("resource://glodaquilla/inheritedPropertiesGrid.jsm");

  // module-level variables
  const glodaquillaStrings = Cc["@mozilla.org/intl/stringbundle;1"]
                             .getService(Ci.nsIStringBundleService)
                             .createBundle("chrome://glodaquilla/locale/glodaquilla.properties");
  let installedVersion = "unknown";
  let rootprefs = Cc["@mozilla.org/preferences-service;1"]
                     .getService(Ci.nsIPrefService)
                     .getBranch("");
  
  // preferences
  self.PREF_EnableInheritedProps = "extensions.glodaquilla.enableInheritedProps";

  // global scope variables
  self.onLoad = function onLoad(e)
  {
    //dump('glodaquilla onLoad\n');
    // enable observer to add custom columns
    let ObserverService = Components.classes["@mozilla.org/observer-service;1"]
                                    .getService(Components.interfaces.nsIObserverService);
    ObserverService.addObserver(self, "MsgCreateDBView", false);
    self.observe(msgWindow.openFolder, "MsgCreateDBView", null);


    // Add inherited folder property if enabled
    let enableInheritedProps = true;
    try {
      enableInheritedProps = rootprefs.getBoolPref(self.PREF_EnableInheritedProps);
    } catch (e) {}
    if (enableInheritedProps)
      InheritedPropertiesGrid.addPropertyObject(self.glodaDoIndex);

    // override the gloda indexer to adjust which folders are indexed
    GlodaFolder.prototype.__defineGetter__("indexingPriority", function getIndexingPriority() {

      let returnValue = this._indexingPriority;
      // Just give the usual value if inherited properties are disabled
      let enableInheritedProps = true;
      try {
       enableInheritedProps = rootprefs.getBoolPref(self.PREF_EnableInheritedProps);
      } catch (e) {}
      if (!enableInheritedProps)
        return returnValue;

      // If we are using inherited properties, we will use the default for
      //  the folder as the base value
      try {
        let msgFolder = this.getXPCOMFolder();
        let defaultPriority = self.getDefaultIndexingPriority(msgFolder);
        let glodaFolder = this;
        let override = msgFolder.getInheritedStringProperty("glodaDoIndex");
        // watchout for nulls
        if (!override)
          override = "";
        let oldOverride = msgFolder.getInheritedStringProperty("glodaquillaDoIndexOld");
        if (!oldOverride)
          oldOverride = "";
        try {
          if (override != oldOverride) {
            // fix gloda's view of the folder
            if (override == "false") {
              // stop doing so
              if (this.indexing)
                GlodaIndexer.killActiveJob();
              // mark all existing messages as deleted
              this._datastore.markMessagesDeletedByFolderID(glodaFolder.id);
              // re-index
              GlodaMsgIndexer.indexingSweepNeeded = true;
            }
            else {
              glodaFolder._dirtyStatus = glodaFolder.kFolderFilthy;
              this._datastore.updateFolderDirtyStatus(glodaFolder)
              GlodaMsgIndexer.indexingSweepNeeded = true;
            }
            msgFolder.setStringProperty("glodaquillaDoIndexOld", override);
          }
        } catch (e) {Cu.reportError(e);} // For reliability, ignore errors
          
        if (override == "false")
          returnValue = this.kIndexingNeverPriority;
        else if (override == "true")
          returnValue =  Math.max(this.kIndexingDefaultPriority, returnValue);
      } catch (e) {Cu.reportError(e);}
      return returnValue;
    });

    let prefs = Cc["@mozilla.org/preferences-service;1"]
                  .getService(Ci.nsIPrefBranch);
    prefs.addObserver(self.PREF_EnableInheritedProps, self, false);

    self.updateVersion();
  },

  self.onUnload = function onUnload(e)
  {
    let prefs = Cc["@mozilla.org/preferences-service;1"]
                  .getService(Ci.nsIPrefBranch);
    prefs.removeObserver(self.PREF_EnableInheritedProps, self);
  };

  self.observe = function observe(aSubject, aTopic, aData)
  {
    if (aTopic == "MsgCreateDBView")
      self.addCustomColumnsHandler();
   
    else if (aTopic == "nsPref:changed")
    { 
      let prefs = aSubject.QueryInterface(Ci.nsIPrefBranch)
      if (aData == self.PREF_EnableInheritedProps)
      {
        try {
          enableInheritedProps = prefs.getBoolPref(self.PREF_EnableInheritedProps);
          if (!enableInheritedProps)
          {
            // this is a new function
            if (typeof InheritedPropertiesGrid.removePropertyObject != "undefined")
              InheritedPropertiesGrid.removePropertyObject(self.glodaDoIndex);
          }
          else
          {
            InheritedPropertiesGrid.addPropertyObject(self.glodaDoIndex);
            self.syncProperties(false);
          } 
        } catch (e) {Cu.reportError(e);}
      }
    }
  };

  /**
   * Synchronize TB 3.1's new indexingPriority folder property with
   *  glodaquilla's glodaDoIndex property.
   *
   * The basic idea is this: We would like people to be able to switch back and
   *  forth between using inherited properties or not. When you enable
   *  inherited properties, then all subfolders of folders with "indexingPriority"
   *  set to kIndexingNeverPriority will inherit.
   *
   * I appears to me that dmose's indexingPriority gets set on each folder, which
   *  makes it unsuitable for use as an inherited property. So I will maintain both
   *  glodaquilla's glodaDoIndex as an inherited property, as well as dmose's
   *  indexingPriority.
   *
   */
  self.syncProperties = function syncProperties(aDoBoth)
  {
    //dump('glodaquilla syncProperties\n');
    // this does nothing on TB 3.0
    if (typeof GlodaDatastore.getDefaultIndexingPriority == "undefined")
      return;
    const accountManager = Cc["@mozilla.org/messenger/account-manager;1"]
                             .getService(Ci.nsIMsgAccountManager);
    const kIndexingDefaultPriority = GlodaFolder.prototype.kIndexingDefaultPriority;
    const kIndexingNeverPriority = GlodaFolder.prototype.kIndexingNeverPriority;
    const kNone = -2;
    const kUnchanged = -3;
    // loop over all folders
    let servers = accountManager.allServers;

    for  (var server of  fixIterator(servers, Ci.nsIMsgIncomingServer))
    {
      let rootFolder = server.rootFolder;
      let allFolders = rootFolder.descendants;
      for  (let folder of  fixIterator(allFolders, Ci.nsIMsgFolder))
      {
        let glodaFolder  = GlodaDatastore._mapFolder(folder);
        indexingPriority = glodaFolder._indexingPriority;
        let glodaDoIndex = folder.getStringProperty("glodaDoIndex");
        if (!glodaDoIndex)
          glodaDoIndex = "";
        let defaultFolderPriority =
            self.getDefaultIndexingPriority(folder);

        let changedGlodaDoIndex = "notchanged";
        let changedIndexingPriority = kUnchanged;
        /**
         * On first run, we will first copy the existing gloda
         *  properties into the new indexingPriority properties.
         *  This is to help maintain similar behavior if glodaquilla
         *  is disabled. But then we will also copy the
         *  indexingPriority property back to glodaquilla, so that
         *  when glodaquilla is first installed, its inherited
         *  properties will also disable any folders that are disabled
         *  by the core.
         */

        // Propagate glodaquilla property to core
        if (glodaDoIndex == "false")
          changedIndexingPriority = kIndexingNeverPriority;
        else if (glodaDoIndex == "")
          changedIndexingPriority = defaultFolderPriority;

        // If glodaDoIndex is Yes but don't inherit, then we want to remove any
        //  inhibiting from the core property.
        if (glodaDoIndex == "true")
        {
          if (defaultFolderPriority != kIndexingNeverPriority)
            changedIndexingPriority = defaultFolderPriority;
          else
            changedIndexingPriority = kIndexingDefaultPriority;
        }

        // Propagate core to glodaquilla
        if (glodaDoIndex == "")
        {
          if (indexingPriority == kIndexingNeverPriority)
            changedGlodaDoIndex = "false";
          else if (indexingPriority == defaultFolderPriority)
            changedGlodaDoIndex = "";
        }
        /* core does not seem to be able to set this
        else if (defaultFolderPriority == kIndexingNeverPriority &&
                 defaultFolderPriority != indexingPriority)
        // core must have enabled indexing of a normally disabled folder
          changedGlodaDoIndex = "true";
        */

        // update properties if needed
        if (changedGlodaDoIndex != "notchanged" &&
            changedGlodaDoIndex != glodaDoIndex)
        {
          folder.setStringProperty("glodaDoIndex", changedGlodaDoIndex);
        }

        // We only update the indexingPriority once, to assist people
        //  migrating from existing glodaQuilla installs
        if (aDoBoth &&
            changedIndexingPriority != kUnchanged &&
            changedIndexingPriority != indexingPriority)
        {
          Gloda.setFolderIndexingPriority(folder, changedIndexingPriority);
          glodaFolder._indexingPriority = changedIndexingPriority;
        }
        /* debug
        if (folder.name == 'bird' && folder instanceof Ci.nsIMsgImapMailFolder)
        {
          dump(folder.name + ': defaultFolderPriority = ' + defaultFolderPriority +
               ' indexingPriority = ' + indexingPriority + '\n');
          dump('glodaDoIndex: ' + glodaDoIndex + ' changedGlodaDoIndex: ' + changedGlodaDoIndex + '\n');
          newIndexingPriority = glodaFolder._indexingPriority;
          dump('newIndexPriority = ' + newIndexingPriority + '\n');
        }
        /**/
      }
    }
  }

  self.columnHandlerGlodaDirty = {
     getCellText:         function(row, col) {
        // get the message's header so that we can extract the field
        var key = gDBView.getKeyAt(row);
        var hdr = gDBView.getFolderForViewIndex(row).GetMessageHeader(key);
        return hdr.getStringProperty("gloda-dirty");
     },
     getSortStringForRow: function(hdr) {
         return null;},
     isString:            function() {return false;}, // will sort using integers
     getCellProperties:   function(row, col, props){},
     getImageSrc:         function(row, col) {return null;},
     getSortLongForRow:   function(hdr) {
       // sort nulls first, by adding 1 to the value
       if (hdr.getStringProperty("gloda-dirty") == null) {return 0;}
       return 1 + parseInt(hdr.getStringProperty("gloda-dirty"));
     },
     getRowProperties:    function(index, properties) {return null;}
  };

  self.columnHandlerOffline = {
    getCellText:         function(row, col) {
      return null;
    },
    getSortStringForRow: function(hdr) {
      var kMsgFlagOffline = 0x0080;
      var isOffline = hdr.flags & kMsgFlagOffline;
      if (!isOffline && hdr.folder.flags & 0x00002001)
        return "1";
      else
        return "0";
    },
    isString:            function() {return true;},
    getCellProperties:   function(row, col, props){},
    getImageSrc:         function(row, col) {
      var key = gDBView.getKeyAt(row);
      var hdr = gDBView.getFolderForViewIndex(row).GetMessageHeader(key);
      var kMsgFlagOffline = 0x0080;
      var isOffline = hdr.flags & kMsgFlagOffline;
      if (!isOffline && hdr.folder.flags & 0x00002001)
        return "chrome://glodaquilla/skin/unclassified.png";
      else
        return "chrome://glodaquilla/skin/good.png";
    },
    getSortLongForRow:   function(hdr) { return null;},
    getRowProperties:    function(index, properties) {return null;},
    cycleCell:           function(row, col) {}
  };

  self.columnHandlerGlodaId = {
    getCellText:         function(row, col) {
      var key = gDBView.getKeyAt(row);
      var hdr = gDBView.getFolderForViewIndex(row).GetMessageHeader(key);
      return hdr.getStringProperty("gloda-id");
    },
    getSortStringForRow: function(hdr) {
      return hdr.getStringProperty("gloda-id");
    },
    isString:            function() {return true;},
    getCellProperties:   function(row, col, props){},
    getImageSrc:         function(row, col) {},
    getSortLongForRow:   function(hdr) { return null;},
    getRowProperties:    function(index, properties) {return null;},
    cycleCell:           function(row, col) {}
  };

  self.addCustomColumnsHandler = function addCustomColumnsHandler() {
    if (gDBView)
    {
      gDBView.addColumnHandler("colOffline", self.columnHandlerOffline);
      gDBView.addColumnHandler("colGlodaId", self.columnHandlerGlodaId);
      gDBView.addColumnHandler("colGlodaDirty", self.columnHandlerGlodaDirty);
    }
  };

  // Inherited property object
  self.glodaDoIndex = {
    defaultValue: function defaultValue(aFolder) {

      // aFolder can be either an nsIMsgIncomingServer or an nsIMsgFolder
      if (aFolder instanceof Ci.nsIMsgIncomingServer)
        return (aFolder.type != "nntp");

      // get the default value from gloda
      let defaultPriority = self.getDefaultIndexingPriority(aFolder);
      return (defaultPriority != GlodaFolder.prototype.kIndexingNeverPriority);
    },
    name: glodaquillaStrings.GetStringFromName("indexInGlobalDatabase"),
    accesskey: glodaquillaStrings.GetStringFromName("indexInGlobalDatabase.accesskey"),
    property: "glodaDoIndex",
    hidefor: "nntp"
  };

  // from utilityOverlay.js
  self.openContentTab = function openContentTab(url)
  {
    let tabmail = document.getElementById("tabmail");
    if (!tabmail) {
      // Try opening new tabs in an existing 3pane window
      let mail3PaneWindow = Components.classes["@mozilla.org/appshell/window-mediator;1"]
                                      .getService(Components.interfaces.nsIWindowMediator)
                                      .getMostRecentWindow("mail:3pane");
      if (mail3PaneWindow) {
        tabmail = mail3PaneWindow.document.getElementById("tabmail");
        mail3PaneWindow.focus();
      }
    }

    if (tabmail)
      tabmail.openTab("contentTab", {contentPage: url});
    else
      window.openDialog("chrome://messenger/content/", "_blank",
                        "chrome,dialog=no,all", null,
                        { tabType: "contentTab",
                          tabParams: {contentPage: url} });
  };

  self.updateVersion = function updateVersion()
  {
    /*
     * When a user first installs Thunderbird 3.1, then we have the opportunity to
     *  synchronize the new folder indexing controls with those of GlodaQuilla. When
     *  installation of this is detected, display a page that gives migration instructions.
     */
    installedTbVersion = rootprefs.getCharPref("extensions.glodaquilla.installedTbVersion");
    if (installedTbVersion != "3.1")
    {
      // See if this is really 3.1 with the new support for indexingPriority
      let isTb31 = (typeof GlodaDatastore.getDefaultIndexingPriority != "undefined");
      if (isTb31)
      {
        // If the user previously had some inherited properties set, then we want
        //  to show them the migration screen. Scan for properties.
        //
        let showMigration = false;
        const accountManager = Cc["@mozilla.org/messenger/account-manager;1"]
                                 .getService(Ci.nsIMsgAccountManager);
        // loop over all folders
        let servers = accountManager.allServers;
        for  (var server of fixIterator(servers, Ci.nsIMsgIncomingServer))
        {
          let rootFolder = server.rootFolder;
          let allFolders = rootFolder.descendants;
          for  (let folder of fixIterator(allFolders, Ci.nsIMsgFolder))
          {
            let glodaDoIndex = folder.getInheritedStringProperty("glodaDoIndex");
            if (glodaDoIndex && glodaDoIndex.length)
            {
              showMigration = true;
              break;
            }
          }
        }
        if (showMigration)
          self.openContentTab('http://mesquilla.com/extensions/glodaquilla/glodaquilla-update-for-thunderbird-3-1/');
        else
          // If the user has not previously used GlodaQuilla's indexing suppression, then
          //  don't enable it.
          rootprefs.setBoolPref(self.PREF_EnableInheritedProps, false);
        self.syncProperties(true);
        rootprefs.setCharPref("extensions.glodaquilla.installedTbVersion", "3.1");
      }
    }
  };

  // copied from gloda to maintain 3.0/3.1 compatibility
  self.getDefaultIndexingPriority = function getDefaultIndexingPriority(aFolder)
  {
    let indexingPriority = GlodaFolder.prototype.kIndexingDefaultPriority;
    // Do not walk into trash/junk folders.
    // Queue folders should also be ignored just because messages should not
    //  spend much time in there.
    // We hate newsgroups, and public IMAP folders are similar.
    // Other user IMAP folders should be ignored because it's not this user's
    //  mail.
    if (aFolder.flags & (Ci.nsMsgFolderFlags.Trash
                         | Ci.nsMsgFolderFlags.Junk
                         | Ci.nsMsgFolderFlags.Queue
                         | Ci.nsMsgFolderFlags.Newsgroup
                         // In unit testing at least folders can be confusingly
                         //  labeled ImapPublic when they should not be.  Or
                         //  at least I don't think they should be.  So they're
                         //  legit for now.
                         //| Ci.nsMsgFolderFlags.ImapPublic
                         //| Ci.nsMsgFolderFlags.ImapOtherUser
                        ))
      indexingPriority = GlodaFolder.prototype.kIndexingNeverPriority;
    else if (aFolder.flags & Ci.nsMsgFolderFlags.Inbox)
      indexingPriority = GlodaFolder.prototype.kIndexingInboxPriority;
    else if (aFolder.flags & Ci.nsMsgFolderFlags.SentMail)
      indexingPriority = GlodaFolder.prototype.kIndexingSentMailPriority;
    else if (aFolder.flags & Ci.nsMsgFolderFlags.Favorite)
      indexingPriority = GlodaFolder.prototype.kIndexingFavoritePriority;
    else if (aFolder.flags & Ci.nsMsgFolderFlags.CheckNew)
      indexingPriority = GlodaFolder.prototype.kIndexingCheckNewPriority;

    return indexingPriority;
  };

})();

window.addEventListener("load", function(e) { glodaquilla.onLoad(e); }, false);
window.addEventListener("unload", function(e) { glodaquilla.onUnload(e); }, false);
