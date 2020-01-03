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
 * The Original Code is AddressbooksSynchronizer.
 *
 * The Initial Developer of the Original Code is Günter Gersdorf.
 * Portions created by the Initial Developer are Copyright (C) 2006
 * the Initial Developer. All Rights Reserved.
 *
 * Contributor(s):
 *  Günter Gersdorf <G.Gersdorf@ggbs.de>
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

var EXPORTED_SYMBOLS = ["addressbooksSync"];

var { Services } = ChromeUtils.import("resource://gre/modules/Services.jsm");
var { MailServices } = ChromeUtils.import("resource:///modules/MailServices.jsm");

function addressbooksSync()
{   //Module constructor: called on module load!
  /* global variables */
  this.mVersion       = null; // Version of this add-on
  this.mCount         = null;
  this.mAppStarttime  = null; //in seconds (the javascript Date object is in milliseconds)
  this.mState         = null;
  this.mExiting       = false;
  this.mLastWindow    = null;
  this.mUsesPopup     = false;
  this.mForceUpload   = null; //force upload after upgrading addressbookssync or activating of  automatic upload
  this.mForceDownload = null; //force download after upgrading addressbookssync
  this.mForceSingleUL = new Object(); //force upload of single books, after selecting them for sync
  this.mStatusText    = null;
  this.mPendingUpload = false;

  /* preferences */
  this.mCheckLastModTime  = null;
  this.mSyncType          = null;
  this.mAutoUpload        = null;
  this.mAutoDownload      = null;
  this.mHidePopups        = null;
  this.mHideAllPopups     = null;
  this.mNoUpload          = null;
  this.mSeparateUpDown    = null;
  this.mTimedDownload     = null;
  this.mTimedUpload       = null;
  this.mLoadTimer         = null;
  this.mDownloadPolicy    = null;
  this.mSyncPolicy        = null;
  this.mProtocol          = null;
  this.mHost              = null;
  this.mUser              = null;
  this.mPath              = null;
  this.mUsepost           = null;
  this.mLocalpath         = null;
  this.mDelayAutoDownload = null;
  this.mImapFolder        = null;
  this.mImapUseDraft      = null;
  this.mDelayABCreate     = null;
  this.mNoExternalAppSet  = null;
  this.mDebug             = null;

  this.mPrefBranch    = Services.prefs.getBranch("extensions.addressbookssync.");
  if (this.mPrefBranch)
  {
    this.mPrefBranch.addObserver("", this, false);
  }

  this.abmanager=MailServices.ab;

  this.directoryService = Services.dirsvc;

  this.console          = Services.console;
  this.promptService    = Services.prompt;
  this.wWatcher         = Services.ww;
  this.wMediator        = Services.wm;

  this.loadTimer = Cc["@mozilla.org/timer;1"].createInstance(Ci.nsITimer);

  this.strings          = Services.strings
                            .createBundle('chrome://addressbookssync/locale/addressbookssync.properties');

  var loader = Services.scriptloader;

  // from "chrome://messenger/content/addressbook/abCommon.js"
  //should be const
  this.kPersonalAddressbookURI = "moz-abmdbdirectory://abook.mab";
  this.kCollectedAddressbookURI = "moz-abmdbdirectory://history.mab";
  this.kPABDirectory = 2; // defined in nsDirPrefs.h
  this.kMDBDirectoryRoot = "moz-abmdbdirectory://";  // see public/nsIAbMDBDirectory.idl:

  //loader.loadSubScript ('chrome://addressbookssync/content/Utils.js', addressbooksSync.prototype);

  this.mNT=false;
//  this.initialize();
}

addressbooksSync.prototype =
{
/************* global variables **************************/
  get version () {
    return this.mVersion;
  },
  get NT () {
    return this.mNT;
  },

  get count () {
    if (this.mCount == null)  this.mCount  = 0;
    return this.mCount;
  },
  set count (aCount) {
    this.mCount = aCount;
  }
,
  get appstarttime () {
    if (this.mAppStarttime == null)  this.mAppStarttime  = Math.round(Date.now()/1000);
    return this.mAppStarttime;
  },
  set appstarttime (aAppStarttime) {
    //if (this.mAppStarttime==null) this.initialize(); else
    if (aAppStarttime>0) this.mAppStarttime = aAppStarttime;
    return this.mAppStarttime;
  }
,
  get state () {
    if (this.mState == null)  this.mState  = '';
    return this.mState;
  },
  set state (aState) {
    if (this.mState == null)  this.mState  = '';
    if (aState=='')
      this.mState='';
    else if (this.mState=='')  // else Up-/Download in Progress!
      this.mState = aState;
  }
,
  get exiting () {
    return this.mExiting;
  },
  set exiting (aExiting) {
    this.mExiting = aExiting;
  }
,
  get lastWindow () {
    return this.mLastWindow;
  },
  set lastWindow (aLastWindow) {
    this.mLastWindow = aLastWindow;
  }
,
  get usesPopup () {
    return this.mUsesPopup;
  },
  set usesPopup (aUsesPopup) {
    this.mUsesPopup = aUsesPopup;
  }
,
  get forceUpload () {
    if (this.mForceUpload == null) {
      this.mForceUpload = false;
      var x=this.checkLastModTime;
    }
    return this.mForceUpload;
  },
  set forceUpload (aForceUpload) {
    this.mForceUpload = aForceUpload;
  }
,
  get forceDownload () {
    if (this.mForceDownload == null) {
      this.mForceDownload = false;
      var x=this.checkLastModTime;  //?
    }
    return this.mForceDownload;
  },
  set forceDownload (aForceDownload) {
    this.mForceDownload = aForceDownload;
  }
,
  forceUploadOf: function(aBook, aSet)
  {
    this.mForceSingleUL[aBook]=aSet;
//    return this.mForceSingleUL.hasOwnProperty(aBook) && this.mForceSingleUL[aBook];
    return this.mForceSingleUL[aBook];
  }
,
  forcedUploadOf: function(aBook)
  {
    return this.mForceSingleUL.hasOwnProperty(aBook) && this.mForceSingleUL[aBook];
  }
,
  get statusText () {
    if (this.mStatusText == null)  this.mStatusText  = '';
    return this.mStatusText;
  },
  set statusText (aStatusText) {
    if (this.mStatusText == null)  this.mStatusText  = '';
    if (aStatusText==null)
      this.mStatusText='';
    else
      this.mStatusText += aStatusText;
  }
,
  get pendingupload () {
    var val=this.mPendingUpload;
    this.mPendingUpload=false;
    return val;
  },
  set pendingupload (aPendingUpload) {
    this.mPendingUpload = aPendingUpload;
  }
,
  get allBooks () {
    return this.abmanager.directories;
  }
,
/************* preferences **************************/
  get checkLastModTime ()
  {
    if (this.mCheckLastModTime == null)
      try {
        this.mCheckLastModTime  = this.mPrefBranch.getBoolPref("checkLastModTime");
      } catch (e) {
        // if this preferences is not set, we are upgrading AddressbooksSync
        // => do a first upload of all books with timestamp!!
        this.checkLastModTime  = true;
        this.forceUpload = true;
        this.forceDownload = true;
        // set the 'upload always' flag
      }
    return this.mCheckLastModTime;
  }
,
  set checkLastModTime (aCheckLastModTime)
  {
    this.mPrefBranch.setBoolPref("checkLastModTime", aCheckLastModTime);
    this.mCheckLastModTime = aCheckLastModTime;
    return;
  }
,
  get synctype () {
    if (this.mSyncType==null) {
      try { this.mSyncType = this.mPrefBranch.getCharPref("synctype"); }
        catch(e) { this.mSyncType = 'none'; }
      if (this.mSyncType!='none' && this.mSyncType!='local'&&
          this.mSyncType!='remote' && this.mSyncType!='imap')
        this.mSyncType='none';
    }
    return this.mSyncType;
  },
  set synctype (aSyncType) {
    this.mPrefBranch.setCharPref("synctype", aSyncType);
    this.mSyncType = aSyncType;
  }
,
  get autoupload () {
    if (this.noupload) return false;
    if (this.mAutoUpload==null) {
      try { this.mAutoUpload = this.mPrefBranch.getBoolPref("autoupload"); }
        catch(e) { this.mAutoUpload = false; }
    }
    return this.mAutoUpload;
  },
  set autoupload (aAutoUpload) {
    if (this.noupload) return;
    this.mPrefBranch.setBoolPref("autoupload", aAutoUpload);
    this.mAutoUpload = aAutoUpload;
  }
,
  get autodownload () {
    if (this.mAutoDownload==null) {
      try { this.mAutoDownload = this.mPrefBranch.getBoolPref("autodownload"); }
        catch(e) { this.mAutoDownload = false; }
    }
    return this.mAutoDownload;
  },
  set autodownload (aAutoDownload) {
    this.mPrefBranch.setBoolPref("autodownload", aAutoDownload);
    this.mAutoDownload = aAutoDownload;
  }
,
  get hidepopups () {
    if (this.mHidePopups==null) {
      try { this.mHidePopups = this.mPrefBranch.getBoolPref("hidepopups"); }
        catch(e) { this.mHidePopups = false; }
    }
    return this.mHidePopups;
  },
  set hidepopups (aHidePopups) {
    this.mPrefBranch.setBoolPref("hidepopups", aHidePopups);
    this.mHidePopups = aHidePopups;
  }
,
 get hideallpopups () {
    if (this.mHideAllPopups==null) {
      try { this.mHideAllPopups = this.mPrefBranch.getBoolPref("hideallpopups"); }
        catch(e) { this.mHideAllPopups = false; }
    }
    return this.mHideAllPopups;
  },
  set hideallpopups (aHideAllPopups) {
    this.mPrefBranch.setBoolPref("hideallpopups", aHideAllPopups);
    this.mHideAllPopups = aHideAllPopups;
  }
,
  get noupload () {
    if (this.mNoUpload==null) {
      try { this.mNoUpload = this.mPrefBranch.getBoolPref("noupload"); }
        catch(e) { this.mNoUpload = false; }
    }
    return this.mNoUpload;
  },
  set noupload (aNoUpload) {
    this.mPrefBranch.setBoolPref("noupload", aNoUpload);
    this.mNoUpload = aNoUpload;
  }
,
  get separateupdown () {
    if (this.noupload) return false;
    if (this.mSeparateUpDown==null) {
      try { this.mSeparateUpDown = this.mPrefBranch.getBoolPref("separateupdown"); }
        catch(e) { this.mSeparateUpDown = false; }
    }
    return this.mSeparateUpDown;
  },
  set separateupdown (aSeparateUpDown) {
    if (this.noupload) return;
    this.mPrefBranch.setBoolPref("separateupdown", aSeparateUpDown);
    this.mSeparateUpDown = aSeparateUpDown;
  }
,
  get timeddownload () {
    if (this.mTimedDownload==null) {
      try { this.mTimedDownload = this.mPrefBranch.getBoolPref("timeddownload"); }
        catch(e) { this.mTimedDownload = false; }
    }
    return this.mTimedDownload;
  },
  set timeddownload (aTimedDownload) {
    this.mPrefBranch.setBoolPref("timeddownload", aTimedDownload);
    this.mTimedDownload = aTimedDownload;
  }
,
  get timedupload () {
    if (this.mTimedUpload==null) {
      try { this.mTimedUpload = this.mPrefBranch.getBoolPref("timedupload"); }
        catch(e) { this.mTimedUpload = false; }
    }
    return this.mTimedUpload;
  },
  set timedupload (aTimedUpload) {
    this.mPrefBranch.setBoolPref("timedupload", aTimedUpload);
    this.mTimedUpload = aTimedUpload;
  }
,
  get loadtimer () {
    if (this.mLoadTimer==null) {
      try { this.mLoadTimer = this.mPrefBranch.getIntPref("loadtimer"); }
        catch(e) { this.mLoadTimer = 0; }
    }
    return this.mLoadTimer;
  },
  set loadtimer (aLoadTimer) {
    if (this.mLoadTimer != aLoadTimer)
      this.mPrefBranch.setIntPref("loadtimer", aLoadTimer);
    this.mLoadTimer = aLoadTimer;
    this.loadTimer.cancel();
    if (aLoadTimer && (this.timeddownload||this.timedupload))
      this.loadTimer.initWithCallback(this, aLoadTimer*60000, Ci.nsITimer.TYPE_REPEATING_SLACK);
  }
,
  get downloadpolicy () {
    if (this.mDownloadPolicy==null) {
      try { this.mDownloadPolicy = this.mPrefBranch.getCharPref("downloadpolicy"); }
        catch(e) { this.mDownloadPolicy = 'ask'; }
      if (this.mDownloadPolicy!='ask' && this.mDownloadPolicy!='overwrite' &&
          this.mDownloadPolicy!='keep')
        this.mDownloadPolicy!='ask'
    }
    return this.mDownloadPolicy;
  },
  set downloadpolicy (aDownloadPolicy) {
    this.mPrefBranch.setCharPref("downloadpolicy", aDownloadPolicy);
    this.mDownloadPolicy = aDownloadPolicy;
  }
,
  get syncpolicy () {
    if (this.mSyncPolicy==null) {
      try { this.mSyncPolicy = this.mPrefBranch.getCharPref("syncpolicy"); }
        catch(e) { this.mSyncPolicy = 'entry'; }
      if (this.mSyncPolicy!='entry' && this.mSyncPolicy!='file')
        this.mSyncPolicy!='entry'
    }
    return this.mSyncPolicy;
  },
  set syncpolicy (aSyncPolicy) {
    this.mPrefBranch.setCharPref("syncpolicy", aSyncPolicy);
    this.mSyncPolicy = aSyncPolicy;
  }
,
  get protocol () {
    if (this.mProtocol==null) {
      try { this.mProtocol = this.mPrefBranch.getCharPref("protocol"); }
        catch(e) { this.mProtocol = ''; }
    }
    return this.mProtocol;
  },
  set protocol (aProtocol) {
    this.mPrefBranch.setCharPref("protocol", aProtocol);
    this.mProtocol = aProtocol;
  }
,
  get host () {
    if (this.mHost==null) {
      try { this.mHost = this.mPrefBranch.getCharPref("host"); }
        catch(e) { this.mHost = ''; }
    }
    return this.mHost;
  },
  set host (aHost) {
    this.mPrefBranch.setCharPref("host", aHost);
    this.mHost = aHost;
  }
,
  get user () {
    if (this.mUser==null) {
      try { this.mUser = decodeURIComponent(escape(this.mPrefBranch.getCharPref("user"))); }
        catch(e) { this.mUser = ''; }
    }
    return this.mUser;
  },
  set user (aUser) {
    this.mPrefBranch.setCharPref("user", unescape(encodeURIComponent(aUser)));
    this.mUser = aUser;
  }
,
  get path () {
    if (this.mPath==null) {
      try { this.mPath = decodeURIComponent(escape(this.mPrefBranch.getCharPref("path"))); }
        catch(e) { this.mPath = ''; }
    }
    return this.mPath;
  },
  set path (aPath) {
    this.mPrefBranch.setCharPref("path", unescape(encodeURIComponent(aPath)));
    this.mPath = aPath;
  }
,
  get usepost () {
    if (this.mUsepost==null) {
      try { this.mUsepost = this.mPrefBranch.getBoolPref("usepost"); }
        catch(e) { this.mUsepost = false; }
    }
    return this.mUsepost;
  },
  set usepost (aUsepost) {
    this.mPrefBranch.setBoolPref("usepost", aUsepost);
    this.mUsepost = aUsepost;
  }
,
  get localpath () {
    if (this.mLocalpath==null) {
      try { this.mLocalpath = decodeURIComponent(escape(this.mPrefBranch.getCharPref("localpath"))); }
        catch(e) { this.mLocalpath = ''; }
    }
    return this.mLocalpath;
  },
  set localpath (aLocalpath) {
    this.mPrefBranch.setCharPref("localpath", unescape(encodeURIComponent(aLocalpath)));
    this.mLocalpath = aLocalpath;
  }
,
  get delayautodownload () {
    if (this.mDelayAutoDownload==null) {
      try { this.mDelayAutoDownload = this.mPrefBranch.getIntPref("delayautodownload"); }
        catch(e) { this.mDelayAutoDownload = 1; }
    }
    return this.mDelayAutoDownload;
  },
  set delayautodownload (aDelayAutoDownload) {
    this.mPrefBranch.setIntPref("delayautodownload", aDelayAutoDownload);
    this.mDelayAutoDownload = aDelayAutoDownload;
  }
,
  get imapfolder () {
    if (this.mImapFolder==null) {
      try { this.mImapFolder = decodeURIComponent(escape(this.mPrefBranch.getCharPref("imapfolder"))); }
        catch(e) { this.mImapFolder = ''; }
    }
    return this.mImapFolder;
  },
  set imapfolder (aImapFolder) {
    this.mPrefBranch.setCharPref("imapfolder", unescape(encodeURIComponent(aImapFolder)));
    this.mImapFolder = aImapFolder;
  }
,
  get imapusedraft () {
    if (this.mImapUseDraft==null) {
      try { this.mImapUseDraft = this.mPrefBranch.getBoolPref("imapusedraft"); }
        catch(e) { this.mImapUseDraft = false; }
    }
    return this.mImapUseDraft;
  },
  set imapusedraft (aImapUseDraft) {
    this.mPrefBranch.setBoolPref("imapusedraft", aImapUseDraft);
    this.mImapUseDraft = aImapUseDraft;
  }
,
  get delayabcreate () {
    if (this.mDelayABCreate==null) {
      try { this.mDelayABCreate = this.mPrefBranch.getIntPref("delayabcreate"); }
        catch(e) { this.mDelayABCreate = 1000; }
    }
    return this.mDelayABCreate;
  },
  set delayabcreate (aDelayABCreate) {
    this.mPrefBranch.setIntPref("delayabcreate", aDelayABCreate);
    this.mDelayABCreate = aDelayABCreate;
  }
,
  get noexternalappset () {
    if (this.mNoExternalAppSet==null) {
      try { this.mNoExternalAppSet = this.mPrefBranch.getBoolPref("noexternalappset"); }
        catch(e) { this.mNoExternalAppSet = false; }
    }
    return this.mNoExternalAppSet;
  },
  set noexternalappset (aNoExternalAppSet) {
    this.mPrefBranch.setBoolPref("noexternalappset", aNoExternalAppSet);
    this.mNoExternalAppSet = aNoExternalAppSet;
  }
,
  get dodebug () {
    if (this.mDebug==null) {
      try { this.mDebug = this.mPrefBranch.getBoolPref("debug"); }
        catch(e) { this.mDebug = false; }
    }
    return this.mDebug;
  }
,

/************ my functions *******************************/
  notify: function(aTimer)
  {
    if (this.mTimedDownload) {
      if (this.mTimedUpload) this.mPendingUpload=true;
      this.showPopup('download', null, 'auto', false);
    } else if (this.mTimedUpload)
      this.showPopup('upload', null, 'auto', false);
  },


/************* system functions **************************/
  observe: function(aSubject, aTopic, aData)
  {
    switch (aTopic)
    {
      case "nsPref:changed":
//dump('pref changed '+aSubject+' '+aData+'\n');
//aSubject ist ein nsIPrefBranch(2), aData ist die Preference
        if (aData=='checkLastModTime')  this.mCheckLastModTime  = null;
        else if (aData=='synctype')          this.mSyncType          = null;
        else if (aData=='autoupload')        this.mAutoUpload        = null;
        else if (aData=='autodownload')      this.mAutoDownload      = null;
        else if (aData=='hidepopups')        this.mHidePopups        = null;
        else if (aData=='hideallpopups')     this.mHideAllPopups     = null;
        else if (aData=='noupload')          this.mNoUpload          = null;
        else if (aData=='separateupdown')    this.mSeparateUpDown    = null;
        else if (aData=='timeddownload')     this.mTimedDownload     = null;
        else if (aData=='timedupload')       this.mTimedUpload       = null;
        else if (aData=='loadtimer')         this.mLoadTimer         = null;
        else if (aData=='downloadpolicy')    this.mDownloadPolicy    = null;
        else if (aData=='syncpolicy')        this.mSyncPolicy        = null;
        else if (aData=='protocol')          this.mProtocol          = null;
        else if (aData=='host')              this.mHost              = null;
        else if (aData=='user')              this.mUser              = null;
        else if (aData=='path')              this.mPath              = null;
        else if (aData=='usepost')           this.mUsepost           = null;
        else if (aData=='localpath')         this.mLocalpath         = null;
        else if (aData=='delayautodownload') this.mDelayAutoDownload = null;
        else if (aData=='imapfolder')        this.mImapFolder        = null;
        else if (aData=='imapusedraft')      this.mImapUseDraft      = null;
        else if (aData=='delayabcreate')     this.mDelayABCreate     = null;
        else if (aData=='noexternalappset')  this.mNoExternalAppSet  = null;
        break;

/*UNLOAD TEST
      case "quit-application-requested":
        //fires only, if shutdown is requested, not if the last window closes
        aSubject.QueryInterface(Ci.nsISupportsPRBool);
        aSubject.data = false;  //true inhibits exiting!
        this.debug('###'+aTopic+' '+aData+' returning false');
        break;

      case "quit-application-granted":
        //Its impossible to open the upload window! But why?
//        this.finalize();
      case "quit-application":
      case "quit-application-requested:
      case "quit-application-granted:
      case "xpcom-shutdown":
        var ws=this.wMediator.getEnumerator('mail:3pane');
        var c=0;
        while (ws.hasMoreElements()) {
          ws.getNext();
          c++;
        }
this.debug(aTopic+' '+aData+' #windows='+c+' exiting='+this.exiting);
        break;
*/

/*UNLOAD*/
//If TB finishes via closing of last (main-)window via x-Icon or menu File/Close
// neither quit-application-requested nor quit-application-granted fires in time
//  => finalize() on last window close in donwindowclosed
//If TB finishes via exiting (menu File/Exit) or some kind of restart,
// both quit-application-requested and quit-application-granted fires
// but finalize() in domwindowclosed shows wired behaviour in imap upload
// (eg. permission denied)

//see https://developer.mozilla.org/en-US/docs/Mozilla/Tech/XPCOM/Observer_Notifications
      case "quit-application-requested":
// does not fire
this.debug('abs: observer: '+aTopic);
        if (!this.exiting && this.synctype=='imap') {
/*
this.debug(aTopic+': delaying shutdown');
          aSubject.QueryInterface(Ci.nsISupportsPRBool);
          aSubject.data = false;  //true inhibits exiting!
*/
           this.lastWindow=null; //minimize all windows
this.debug(aTopic+': finalize');
          if (!this.exiting) this.finalize();
        }
        break;

      case "quit-application-granted":
// fires, when the very last window closes
this.debug('abs: observer: '+aTopic);
/*
        //fires only, if TB closes via menu File/Exit.
        // does not fire if closing window via menu File/close or the close 'x'
        //if it fires, fires before windows closes and domwindowclosed is called
        var ws=this.wMediator.getEnumerator('mail:3pane');
        var w=null;
        if (ws.hasMoreElements()) {
          w=ws.getNext();
        }
        //save window
        this.lastWindow=w;
this.debug(aTopic+' '+aData+' window='+w);
*/
        break;

      case "domwindowclosed":
        // fires on every window close
        //var main = Services.wm.getMostRecentWindow("mail:3pane");
        var ws=this.wMediator.getEnumerator('mail:3pane');
        var c=0;
        while (ws.hasMoreElements()) {
          ws.getNext();
          c++;
        }
        this.debug(aTopic+' '+aSubject+' #windows='+c+' exiting='+this.exiting+' synctype='+this.synctype);
        if (!this.exiting) {
          var ws=this.wMediator.getEnumerator('mail:3pane');
          if (!ws.hasMoreElements()) {
            this.lastWindow=aSubject;
            this.finalize();
          }
        }
        break;
    }
  },

////////////////////////////////////////////////////////
//was Utils.js
  doTest: function() {
    this.promptService.alert(null,'Test', 'doTest');
  },

  initialize: function() {

    //this.doTest();
    var console = Services.console;
  //console.logStringMessage('ABS: initializing '+test);

    this.mVersion='';

    //this.mAppStarttime = Math.round(Date.now()/1000);
    var ast=this.appstarttime;  //This should initialize the value
    var d=new Date(ast*1000);
    var s=d.toLocaleString();

    this.debug('App Start############################################## '+s);

    var getAddon = async function(abs) {
      var { AddonManager }=ChromeUtils.import("resource://gre/modules/AddonManager.jsm");
      let addOn=await AddonManager.getAddonByID("addressbookssync@ggbs.de");
      var console = Services.console;
      var app = Services.appinfo;
      //console.logStringMessage('AddressbooksSynchronizer: '+addOn.version+' on '+app.name+' '+app.version);
      abs.debug(addOn.version+' on '+app.name+' '+app.version, true);
      abs.mVersion=addOn.version;
      abs.mPrefBranch.setCharPref('version',abs.mVersion);
    }
    getAddon(this);

    this.update();  //Falls was zu updaten ist

    try { this.mNT = this.mPrefBranch.getBoolPref("NT"); } catch(e) { this.mNT = false; }

      //Used if !imap upload
    var observerService = Services.obs;
    observerService.addObserver(this,"quit-application-requested", false);
    observerService.addObserver(this,"quit-application-granted", false);
    observerService.addObserver(this,"domwindowclosed", false);
    //für true muß observer nsIWeakReference unterstützen
  },

  finalize: function() {
    this.exiting=true;
    this.removeListener();  // remove the listener
  this.debug('finalize: autoupload='+this.autoupload);
    if (this.autoupload) {
  //this.dump('onUnload autouploading:'+window.location);
  this.debug('finalize: last window "'+this.lastWindow+'"');
      var app = Components.classes["@mozilla.org/toolkit/app-startup;1"].
          getService(Components.interfaces.nsIAppStartup);
      //definitely needs a window for remote/imap! (Also for local, or message to file fails)
      this.showPopup('upload', null, 'final', false);
  //this.dump('finalize popup shown:'+window.location);
  this.debug('finalize: finalized');
    }
  },

  update: function() {
  // if something has to be updated (e.g. preferences)
  },


  /*
   * returns list of mab to be synced
   */
  syncedAddressbooks: function(direction, singleBook)
  {   //direction: up, down, all
    var mabs=new Object();
    var mabsArray=Components.classes["@mozilla.org/array;1"]
           .createInstance(Components.interfaces.nsIMutableArray);

    var cn = this.allBooks;
    var found=false;
    while( cn.hasMoreElements() )
    {
      var dir = cn.getNext().QueryInterface(Components.interfaces.nsIAbDirectory);
      if (dir.dirType==this.kPABDirectory            // ignore ldap-addressbooks (dirType!=2)
            && this.getDB(dir)) {  // ignore non-Mozilla (eg. MACOs) books  //TODO: is there a better way?
        var sync=false;
        if (direction=='all')
          sync=true
        else if (singleBook && dir.fileName==singleBook)
          sync=true;
        else if (!singleBook) {
          var prefName = dir.dirPrefId;
          try { sync = this.mPrefBranch.getBoolPref(prefName+'.'+direction); }
            catch(e) { sync=false; }
        }
        if (sync) {
          found=true;
          var file = dir.fileName;
          if (mabs[file])
            // this ist a problem with the preferences, defining a book more than once!
            this.dump('allBooks returned double addressbook '+dir.fileName+'('+file+')');
          else {
            mabs[file]=true;
  //          mabsArray.AppendElement(dir);
            mabsArray.appendElement(dir, false);
          }
        }
      }
    } // while
    if (!found && direction=='down' && singleBook) { //its a new addressbook
      var sb=Components.classes["@mozilla.org/supports-string;1"]
          .createInstance(Components.interfaces.nsISupportsString);
      sb.data=singleBook;
  //    mabsArray.AppendElement(sb);
      mabsArray.appendElement(sb, false);
    }
    return mabsArray;
  },

  /*
   * return address book data structure associated with filename or description (=address book name)
   * TODO: might fail, if called with a mabName and the mabName is in a foreign language!
   *        (see mails with Ivan Kolchagov, to reproduce: change personal address book to bulgarien name)
   * called with a probably non-unique description only on manual downloads
   *   (LoadMab, DownloadMab) from options dialog
   */
  getAddressBook: function( name )
  {
    var cp=name.indexOf('ldap_2.servers.')==0;
    var cn = this.allBooks;
    while( cn.hasMoreElements() )
    {
      var dir = cn.getNext().QueryInterface(Components.interfaces.nsIAbDirectory);
      var prefName = dir.dirPrefId;  //ldap_2.servers.xxx
      var description=dir.dirName;
      var filename;
      try {filename=dir.fileName;} catch(e) { filename='';} //might be 'not initialized'
  //this.dump('getAddressbook: compare '+name+' to '+prefName+', '+filename+', '+description);
      if( prefName == name || !cp && (filename == name || description == name)) {
          return dir;
      }
    } // while
    return null;
  }, // getAddressBook

  /*
   * create new address book
   */
  createAddressBook: function(name, fileName)
  {
    var uri=this.kMDBDirectoryRoot+fileName;
    try {
  this.dump(name+' create "'+name+'" from '+uri);
  //    this.directory.createDirectoryByURI(name, uri);
      var rooturi="moz-abdirectory://";
      this.abmanager.getDirectory(rooturi).createDirectoryByURI(name, uri);
      //for type see nsDirPrefs.h, PABDirectory=2
      //this ignores the uri
  //    this.abmanager.newAddressBook(name, uri, 2/*type*/ /*,prefName*/);
    } catch (e) {
      this.promptService.alert(null, 'AddressbooksSync', 'createAddressBook('+name+','+fileName+')\n'+e);
      return null;
    }
    var dir=this.getAddressBook(fileName);
    var tCards=dir.childCards;
    if (!tCards.hasMoreElements()) {
      this.promptService.alert(null, 'AddressbooksSync', 'createAddressBook('+name+','+fileName+'), addressbook is corrupt\n');
    }
    dir.lastModifiedDate=this.mAppStarttime; //set to 'not modified'
    return dir;
  }, // createAddressBook

  /*
   * delete an address book
   */
  deleteAddressBook: function(dir)
  {
    // Move focus away from the to be deleted addressbook
      // this has to be done in the AddressBook window :-((
  //  try {  SetAbView(this.kPersonalAddressbookURI, false);} catch(e) {   this.promptService.alert(null,'ERROR', e);}

  //  dir=dir.QueryInterface(Components.interfaces.nsIAbDirectory);
    try {
      var prefName = dir.dirPrefId;
      var mabFile=dir.fileName;
      var URI=dir.URI;
      if (URI==this.kPersonalAddressbookURI ||
          URI==this.kCollectedAddressbookURI)
        return false;

  this.dump('deleting '+URI);
  //    this.directory.deleteDirectory(dir);
      this.abmanager.deleteAddressBook(URI);
        //prefName='ldap_2.servers.name' mit name='history', 'pab' oder eigener
      Services.prefs.clearUserPref( prefName+'.position' );  // sometimes remains!?
      Services.prefs.deleteBranch( prefName );

      var nsIMabFile = this.getDir('ProfD');
      nsIMabFile.appendRelativePath( mabFile );
      if (nsIMabFile.exists() && nsIMabFile.isFile())
        nsIMabFile.remove(false);
  this.dump('Old mabfile '+nsIMabFile.path+' removed');

      return true;
    } catch (e) {
  this.promptService.alert(null, 'ERROR', 'deleteAddressBook('+dir.dirName+')\n'+e);
      return false;
    }
  }, // deleteAddressBook

  /*
   * get DB for addressbook
   */
  getDB: function(dir) {
    try {
      var curDB;
  /*
      var directory = this.abmanager.getDirectory(dir.URI);
      var MDB=directory.QueryInterface(Components.interfaces.nsIAbMDBDirectory);
  */
      if (!(dir instanceof Components.interfaces.nsIAbMDBDirectory)) {
  //this.dump('abs: getDB: addressbook is not a Mozilla addressbook (e.g. LDAP/MACOS)');
        return null;
      }
      var MDB=dir.QueryInterface(Components.interfaces.nsIAbMDBDirectory);
  //this.dump('MDB: '+MDB+' '+MDB.database+' '+MDB.databaseFile);
      curDB=MDB.database; //nsIAddrDatabase
      return curDB;
    } catch(e) {
  this.dump('abs: getDB: '+e);
      return null;
    }
  },

  /*
   * remove Listeners from addressbook
   */
  /*
  removeListeners: function(dir, db) {
  // remove listeners, db is a nsIAddrDatabase
  //not good, won't be reactivated!
    try {
      var mailLists=dir.addressLists;
      var count=mailLists.length;
      for (var i=0; i<count; i++) {
        var list=mailLists.queryElementAt (i, Components.interfaces.nsIAddrDBListener);
        try { db.removeListener(list); }
        catch(e) {this.dump('db.remListener on list '+e, true);} //exception, wenn kein listener existiert
      }
    } catch(e) {
      this.dump('removeListeners: '+e);
    }
    try { db.removeListener(dir.QueryInterface(Components.interfaces.nsIAddrDBListener)); }
    catch(e) { this.dump('db.remListener on dir '+e, true); } //exception, wenn kein listener existiert
  this.dump(count+' listeners removed');
  },
  */

  /*
   * clear an address book
   */
  clearAddressBook: function(dir)
  {
    function deleteLists(ab, abs) {
  abs.dump('  delete Lists');
      var mdb=ab.QueryInterface(Components.interfaces.nsIAbMDBDirectory);
      var lists=ab.addressLists;
  //abs.dump('v');
      var count=lists.length;
      for (var i=count-1; i>=0; i--){ //backwards!
        try {
          var list=lists.queryElementAt(i, Components.interfaces.nsIAbCard);
          var card=list.QueryInterface(Components.interfaces.nsIAbCard);
  //abs.dump('  card '+card.primaryEmail);
  //abs.dump('.');
          mdb.removeEmailAddressAt(i);
        } catch(e) {
          var list=lists.queryElementAt(i, Components.interfaces.nsIAbDirectory);
          deleteLists(list, abs);
          list=list.QueryInterface(Components.interfaces.nsIAbMDBDirectory);
          //noscript: list.removeElementsFromAddressList()
  //abs.dump('+');
          ab.deleteDirectory(list);
        }
      }
  //abs.dump('^');
    }

    function collectCardsToDelete(ab, abs) {
  abs.dump('  collect cards to delete');
      var cardsE=ab.childCards;
      var cards;
      // cardsE is a nsISimpleEnumerator
      cards = Components.classes["@mozilla.org/array;1"].
        createInstance(Components.interfaces.nsIMutableArray);
      while( cardsE.hasMoreElements() ) {
  //abs.dump('save card '+card.primaryEmail);
  //abs.dump('.');
        cards.appendElement(cardsE.getNext(), false);
      }
      cards=cards.QueryInterface(Components.interfaces.nsIArray);
      return cards;
    }

    //////////////////
    var curDB=this.getDB(dir);
    //this.removeListeners(dir, curDB);
    deleteLists(dir, this);
  //de_ggbs_this.abs.dumpDir(dir, 'Lists Deleted:');

    try {
      var cards=collectCardsToDelete(dir, this);
  this.dump('  start deleting cards');
      dir.deleteCards(cards);  // delete the cards from the to-be synced addressbook
  this.dump('  cards deleted');
  //this.dumpDir(dir, 'Cards deleted:');
      cards = null;
    } catch(e) {
      return 'rab_ve: clear addressbook: '+e;
    }


  // The cards are not deleted immediately, they are put on a deletedCards Table
  // This table can't be purge programmatically, they are automatically purged
  // iff more than 50 Cards are in the table and only cards are purged that are
  // older than 6 month :-(((
  // Therefore I set the LastModifiedDate attribute on the deleted cards to an
  // appropriate date (1.1.2000) so they will be deleted later on

    return '';
  }, // clearAddressBook

  /*
   * Fill Addressbook from mab file
   */
  fillAddressBook: function(dir, file)
  {
    function copyCards(db, ab, abs) {
  abs.dump('  copy cards');
  abs.dump('    '+db+' '+ab);
      var tCards=db.enumerateCards(ab);
  abs.dump('    copyCards: have enumerated the cards in tempDir');
      var count=0;
      while(tCards.hasMoreElements()) {
        var tCard = tCards.getNext().QueryInterface(Components.interfaces.nsIAbCard);
        if (!tCard.isMailList) { // only non-maillists
          ab.dropCard(tCard, true); //true is necessary or tb crashes soon after
          count++;
  abs.dump('insert card '+tCard.primaryEmail);
  //abs.dump('.');
        }
      }
      tCards=null;
      if (count==0) { //no cards => corrupt addressbook
        throw(0);
      }
  abs.dump('done');
  //abs.dumpDir(dir, 'Cards copied:');
    }

    function recreateMaillists(ab, db, abs) {
  abs.dump('  recreate maillists');
      var mailLists=ab.childNodes;
      try  {
        while (mailLists.hasMoreElements()) {
  //abs.dump('+');
          var mailList=mailLists.getNext().QueryInterface(Components.interfaces.nsIAbDirectory);
  //abs.dump(' recreate '+mailList.dirName+'');
          ab.deleteDirectory(mailList);
          ab.addMailList(mailList);
        }
      } catch(e) {
  abs.dump('rab_ve: create cards for lists: '+e, true);
        return 'rab_ve: create cards for lists: '+e;
      }
      mailLists=null;
  //abs.dumpDir(dir, 'Recreated maillists:');
      return '';
    }

    var curDB=this.getDB(dir);
    //this.removeListeners(dir, curDB);

  this.dump('  open the addressbook database file');
    try {
    // open the addressbook database file
      var db=Components.classes["@mozilla.org/addressbook/carddatabase;1"].
        getService(Components.interfaces.nsIAddrDatabase);
      if (!file.isWritable()) { //e.g. a readonly filesystem
        var ds=Services.dirsvc;
        var tdir=ds.get('TmpD',  Components.interfaces.nsIFile)
          .QueryInterface(Components.interfaces.nsIFile);
        var tempFile=tdir.clone().QueryInterface(Components.interfaces.nsIFile);
        var tempName='abstemp.mab';
        tempFile.appendRelativePath(tempName);
        if (tempFile.exists() && tempFile.isFile()) { tempFile.remove(false); }
          //can't use .copyTo as this also copies the permissions  
          // and i can't change them because that throws an error (at least on windows)
        //file.copyTo( tdir, tempName );  //this copies the permissions too
        //tempFile.permission=/*0666*/0x1b6;
        this.writeMabData(tempFile, this.readMabData(file, ''));
        file=tempFile;
      }
      var tempDB=db.open(file, true, false) // Shows a message and throws error if file is readonly
        .QueryInterface(Components.interfaces.nsIAddrDatabase);
  this.dump('    opened '+file.path+' -> '+tempDB);
    } catch(e) {
      return 'rab_ve: open mabfile: '+file.path+' '+file.permissions+' '+e;
    }

    try {
      copyCards(tempDB, dir, this);
    } catch(e) {
      if (e===0) return "Corrupt addressbook";
      else return 'rab_ve: copy cards: '+e;
    }

    try {
      var msg;
      tempDB.getMailingListsFromDB(dir);
      msg=recreateMaillists(dir, curDB, this);
      if (msg) this.promptService.alert(null, 'ERROR', msg);
    } catch(e) {
      this.promptService.alert(null, 'ERROR', 'rab_ve: recreate Maillists: '+e);
      return 'rab_ve: recreate Maillists: '+e;
    }
    tempDB.forceClosed();  //!!!
    curDB.close(true);
  //  try { if (tempFile) tempFile.remove(false); } catch(e) { return 'rab_ve: remove Tempfile: '+e; }
    return '';
  }, // fillAddressBook

  /*
   * Fill Addressbook from LDIF file
   */
  LDIFAddressBook: function(dir, file) {
  this.dump('LDIF: started! '+dir.URI+' '+file.path);

    var selLocIsHome = true;
    var importService = Components.classes["@mozilla.org/import/import-service;1"].
        getService(Components.interfaces.nsIImportService);

      // the index is the 'list-index' of the ldif entry in the 'moduleList' listbox
      // of the import dialog of the addressbook (see chrome\messenger\content\messenger\importDialog.js)
      // 1 up to TB3.2, 2 since TB5, 3 since TB52
    var index=3;
    var name = importService.GetModuleName('addressbook', index);
    while (!name.match(/ldif/i)) {
      index-=1;
      name = importService.GetModuleName('addressbook', index);
    }
    var module = importService.GetModule('addressbook', index);
  this.dump('LDIF: use module '+name);

    var observerService=Services.obs;

    var ldifimport = module.GetImportInterface( "addressbook").
        QueryInterface( Components.interfaces.nsIImportGeneric);
    if (ldifimport == null) {
  this.dump('LDIF: No import interface');
      var str=Components.classes["@mozilla.org/supports-string;1"].createInstance().
        QueryInterface( Components.interfaces.nsISupportsString);
      str.data='No import interface';
      observerService.notifyObservers(str, "LDIFcomplete", "failed");
      return false;
    }

  this.dump('LDIF: Have ldifimport');
    ldifimport.SetData("addressLocation", file);

    var map = ldifimport.GetData( "fieldMap");
    if (map != null) {
  this.dump('LDIF: Not a LDIF file!');
      var str=Components.classes["@mozilla.org/supports-string;1"].createInstance().
        QueryInterface( Components.interfaces.nsISupportsString);
      str.data='Not a LDIF file';
      observerService.notifyObservers(str, "LDIFcomplete", "failed");
      return false;
    }
  this.dump('LDIF: have map');
    var abURIStr = Components.classes["@mozilla.org/supports-cstring;1"].createInstance().
        QueryInterface( Components.interfaces.nsISupportsCString);
    abURIStr.data=dir.URI;
    ldifimport.SetData("addressDestination", abURIStr);
  this.dump('LDIF: set addressDestination to '+abURIStr);
  //else: created jedesmal ein neues AB mit Namen des LDIF Files

    var cont=LDIFAddressBookCont;
    if (ldifimport.WantsProgress()) {
  this.dump('LDIF: wants Progress');
      if (ldifimport.BeginImport( cont.successStr, cont.errorStr, selLocIsHome)) {
  this.dump('LDIF: start timer');
        cont.ldifimport=ldifimport;
        cont.observerService=observerService;
        cont.abs=this;
        var timer = Components.classes["@mozilla.org/timer;1"].
            createInstance(Components.interfaces.nsITimer);
        timer.initWithCallback(cont, 100, Components.interfaces.nsITimer.TYPE_REPEATING_SLACK);
  this.dump('LDIF: timer started');
      } else {
        observerService.notifyObservers(cont.errorStr, "LDIFcomplete", "failed");
      }
    } else {  //TB6 (or earlier?)
  this.dump('LDIF: not wants Progress');
      if (ldifimport.BeginImport( cont.successStr, cont.errorStr, selLocIsHome))
        observerService.notifyObservers(cont.successStr, "LDIFcomplete", "success");
      else
        observerService.notifyObservers(cont.errorStr, "LDIFcomplete", "failed");
    }
    return true;
  },
  LDIFAddressBookCont: {
    successStr: Components.classes["@mozilla.org/supports-string;1"].createInstance().
        QueryInterface( Components.interfaces.nsISupportsString),
    errorStr: Components.classes["@mozilla.org/supports-string;1"].createInstance().
        QueryInterface( Components.interfaces.nsISupportsString),
    ldifimport: null,
    observerService: null,
    importSuccess: false,
    abs: null,

    notify: function(timer)
    {
  this.abs.dump('LDIF: timer called');
      let clear = true;
      let pcnt;

      if (this.ldifimport) {
  this.abs.dump('LDIF: continueImport: have interface');

        if (!this.ldifimport.ContinueImport()) {
  this.abs.dump('LDIF: continueImport: not continue');
          this.importSuccess = false;
          timer.cancel();
  this.abs.dump('LDIF: Import failed: '+this.errorStr);
          this.observerService.notifyObservers(this.errorStr, "LDIFcomplete", "failed");
        }
        else if ((pcnt = this.ldifimport.GetProgress()) < 100) {
  this.abs.dump('LDIF: continueImport: GetProgress='+pcnt);
          clear = false;
        }
        else {
          timer.cancel();
          this.importSuccess = true;
  this.abs.dump('LDIF: finished: '+this.successStr);
  //       this.abs.promptService.alert(null, 'INFO', 'LDIF: Import finished: '+this.successStr);
          this.observerService.notifyObservers(this.successStr, "LDIFcomplete", "success");
        }
      }
      if (clear) {
        this.ldifimport = null;
      }
    }
  },
  /**/

  /*
   * generate external filename for address book
   */
  externalFilename: function(dir) {
    var externalFilename;
    var prefName = dir.dirPrefId;
    try { externalFilename = decodeURIComponent(escape(this.mPrefBranch.getCharPref(prefName+'.filename'))); }
      //if filename already set, take that
    catch(e) {
      //else generate filename from addressbook name
      var uri = dir.URI;
      if (uri!=this.kPersonalAddressbookURI && uri!=this.kCollectedAddressbookURI)
        externalFilename = dir.dirName+'.mab';
      else
        externalFilename = '_tb_'+dir.fileName;
    }
  this.dump('externalFilename: returns '+externalFilename);
    return externalFilename;
  },
  setExternalFilename: function(dir, externalFilename) {
    var prefName = dir.dirPrefId;
    if (!externalFilename)
      this.mPrefBranch.clearUserPref(prefName+'.filename', externalFilename);
    else
      this.mPrefBranch.setCharPref(prefName+'.filename', unescape(encodeURIComponent(externalFilename)));
  //this.dump('set external filename '+dir.dirName+'->'+externalFilename);
  this.dump('setExternalFilename: set '+externalFilename);
    return externalFilename;
  },

  addListener: function() {
    var addrbookSession;
    this.sessionListener.abs=this;
    this.sessionListener.dodebug=this.dodebug;
  //this.dump('abs: addListener');
    this.abmanager.addAddressBookListener(
      this.sessionListener,
  //      Components.interfaces.nsIAbListener.itemAdded ||
  //      Components.interfaces.nsIAbListener.directoryItemRemoved ||
  //      Components.interfaces.nsIAbListener.directoryRemoved ||
  //      Components.interfaces.nsIAbListener.itemChanged ||
        Components.interfaces.nsIAbListener.all);
  },

  removeListener: function() {
  //this.dump('abs: removeListener');
    this.abmanager.removeAddressBookListener(this.sessionListener);
  },

  sessionListener: {
    abs: null,
    dodebug: false,

    // these functions are called for the main dir and every list (which has been shown
    // in the addressbookwindows) even if item are not part of the list
  //After book has been downloaded vie replace by entry, these functions
  //are no longer called for dir (only for lists)
    onItemAdded: function(parentDir, item) {
      try {
        var dir=parentDir.QueryInterface(Components.interfaces.nsIAbDirectory);
  //this.dump('dir.URI: '+dir.URI); //moz-abmdbdirectory://abook.mab
        if (item instanceof Components.interfaces.nsIAbCard) {
          var card=item.QueryInterface(Components.interfaces.nsIAbCard);
          //card might be a list
          var now=Math.round(Date.now()/1000);
  this.abs.dump('item added parent='+dir.dirName+' email='+card.primaryEmail);
  //this.abs.dump('     lmd of dir,card set from '+dir.lastModifiedDate+','+card.getCardValue('LastModifiedDate')+' to '+now);
  this.abs.dump('     lmd of dir,card set from '+dir.lastModifiedDate+','+card.getProperty('LastModifiedDate','???')+' to '+now);
          dir.lastModifiedDate=now;
          //card.setProperty('LastModifiedDate',now);
        }
      } catch(e) { this.abs.dump('abs Listener (item added '+item+'): '+e); }
    },
    onItemRemoved: function(parentDir, item) {
      // if a list is removed, this is called twice, with a nsIAbCard than with nsIAbDirectory
      try {
        var now=Math.round(Date.now()/1000);
  this.abs.dump('remove item time='+now);
        var dir=parentDir.QueryInterface(Components.interfaces.nsIAbDirectory);
        if (item instanceof Components.interfaces.nsIAbCard) {
  var card=item.QueryInterface(Components.interfaces.nsIAbCard);
  this.abs.dump('card removed parent='+dir.dirName+' email='+card.primaryEmail);
  this.abs.dump('     lmd of dir set from '+dir.lastModifiedDate+' to '+now);
          dir.lastModifiedDate=now;
        } else if (item instanceof Components.interfaces.nsIAbDirectory) {
          var list=item.QueryInterface(Components.interfaces.nsIAbDirectory);
          if (!list.dirName) {
  this.abs.dump('book removed');  // complete book has been removed
          } else {
  this.abs.dump('list removed parent='+dir.dirName+' list='+list.dirName);
            // hhm, wie unterscheide ich, ob es nur ein löschen der Liste
            // ist, oder ein löschen des ganzen Buches?
            // Vielleicht ist es auch egal?
  this.abs.dump('     lmd of dir set from '+dir.lastModifiedDate+' to '+now);
            dir.lastModifiedDate=now;
          }
        } else {
  this.abs.dump('??? removed parent='+dir.dirName);
        }
      } catch(e) { this.abs.dump('abs Listener (item deleted): '+e); }
    },
    onItemPropertyChanged: function(item, property, oldValue, newValue) {
      try{
        var now=Math.round(Date.now()/1000);
  this.abs.dump('property change time='+now);
        //property, oldValue and newValue are always null
        if (item instanceof Components.interfaces.nsIAbCard) {
          var card=item.QueryInterface(Components.interfaces.nsIAbCard);
          //property and values always null
  this.abs.dump('card changed '+card.primaryEmail);
  //this.abs.dump('  directoryId: '+card.directoryId+' localId: '+card.localId);  //ldap_2.servers.pab&Personal
  this.abs.dump('     lmd of card is '+card.getProperty('LastModifiedDate','???'));
          // lastModifiedDate of card has changed, but not for the directoy :-(
          var dir=this.abs.getAddressBook(card.directoryId.replace(/&.*$/,''));
          if (dir) {
  this.abs.dump('     lmd of dir set from '+dir.lastModifiedDate+' to '+now);
            dir.lastModifiedDate=now;
          } else this.abs.dump('ABS: Card change, but no directory found for '+card.directoryId);
        } else if (item instanceof Components.interfaces.nsIAbDirectory) {
          var dir=item.QueryInterface(Components.interfaces.nsIAbDirectory);
          //property='DirName'
  this.abs.dump('dir changed '+dir.dirName+' '+property+': '+oldValue+'->'+newValue);
          if (dir.isMailList) {
  this.abs.dump('  dir is MailList: '+dir.URI);   //moz-abmdbdirectory://abook.mab/MailList3
            dir=this.abs.abmanager.getDirectory(dir.URI.replace(/\/[^\/]*$/,''));
  this.abs.dump('     lmd of dir set from '+dir.lastModifiedDate+' to '+now);
            dir.lastModifiedDate=now;
          }
        } else {
  this.abs.dump('??? changed item='+item);
        }
      } catch(e) { this.abs.dump('abs Listener (item changed): '+e); }
    }
  },

  getDir: function(special) {
  /*
    var profileFolder = directoryService.get(special,  Components.interfaces.nsIFile);
    var profileDir = profileFolder.QueryInterface(Components.interfaces.nsIFile);
    var nsIMabFile = profileDir.clone().QueryInterface(Components.interfaces.nsIFile);
  */
    var dir = this.directoryService.get(special,  Components.interfaces.nsIFile)
      .QueryInterface(Components.interfaces.nsIFile);
  //  return dir.clone().QueryInterface(Components.interfaces.nsIFile);
    return dir;
  },

  /*
   *  Read a mab file and return the data
   */
  readMabData: function(nsIMabFile, addLastMod)
  {
    if (!nsIMabFile.exists()) return '';

    //IOUtils.js: loadFileToString(file)
    var fs = Components.classes['@mozilla.org/network/file-input-stream;1']
            .createInstance(Components.interfaces.nsIFileInputStream);
    var ss = Components.classes['@mozilla.org/scriptableinputstream;1']
            .createInstance(Components.interfaces.nsIScriptableInputStream);
    var str='';
    try{
      fs.init(nsIMabFile, 0x01, 0, false);
      ss.init(fs);
      str = ss.read(-1);
      ss.close();
      fs.close();
    } catch(e){ this.promptService.alert(null, 'readMabData', 'readMabData:\n'+e); }
  //    return str;
    if (addLastMod) {
      var lmt=new Date(nsIMabFile.lastModifiedTime);
      return str.replace(/-->[^\r\n]*/,'--> '+lmt);//append to the // <!-- <mdb:mork:z v="1.4"/> -->
    } else
      return str;
  },

  /*
   *  Save Data to a mab File
   */
  writeMabData: function(nsIMabFile, abData)
  {
    try {
      if (nsIMabFile.exists() && nsIMabFile.isFile()) nsIMabFile.remove(false);
      var strm = Components.classes["@mozilla.org/network/file-output-stream;1"].
        createInstance(Components.interfaces.nsIFileOutputStream);
      strm.QueryInterface(Components.interfaces.nsIOutputStream);
      strm.QueryInterface(Components.interfaces.nsISeekableStream);
      strm.init( nsIMabFile, 0x20|0x02|0x08, /*0600*/0x180, 0 );
        // 0x02=PR_WRONLY, 0x08=PR_CREATE_FILE, 0x20=PR_TRUNCATE
      strm.write( abData, abData.length );
      strm.flush();
      strm.close();
    } catch(e) {
        this.promptService.alert(null, 'writeMabData', 'File write error of '+nsIMabFile.target+'\n'+e);
        return null;
    }
    return nsIMabFile;
  },

  /*
   *  This is, where every up-/download starts!
   */
  showPopup: function(direction, singlebook, type, force)
  {
    //singlebook: a mabFile or null
    //type: start, final, auto, manual
    //force: if true, upload mabs, even if not changed
    var abs;
    if ('syncedAddressbooks' in this)
      abs=this;     //the normal case
    else
      //in TB64, if showPopup is called at app start, 'this' ist a '[object ChromeWindow]'
      // (chrome://messenger/content/messenger.xul)
      abs=this.de_ggbs_abs.gABS;
  abs.debug('showPopup direction='+direction+' singlebook='+singlebook+' type='+type+' force='+force);

    if (abs.synctype=='none') return;
    if (direction=='upload' && abs.noupload) return;
    if (!singlebook && abs.syncedAddressbooks((direction=='download')?'down':'up',null).length==0)
      return;  //nothing to do

  //TODO: possible race condition!
    if (abs.state!='') {  // we are already doing an up-/download
      if (type=='manual')
        abs.promptService.alert(null, 'showPopup', abs.strings.GetStringFromName('inprogress'));
      return;
    }

    abs.usesPopup=
      type=='final' ||     //always at propram exit
      (type=='start' && !abs.hidepopups && !abs.hideallpopups) ||
      (type!='final' && type!='start' && !abs.hideallpopups);

    abs.state=direction;

  abs.debug('showPopup usesPopup='+abs.usesPopup);
    if (!abs.usesPopup) {
      var windowsEnum = abs.wMediator.getEnumerator(null);  //enumerate all windows //"mail:3pane");
      while (windowsEnum.hasMoreElements()) {
        var w=windowsEnum.getNext();
        if (w.de_ggbs_abs.upload) break;
        w=null;
      }
      if (!w) {
  abs.debug('showPopup: no Window!');
        abs.promptService.alert(null, 'showPopup', 'no window to perform up-/download!');
        abs.state='';
      } else{
  abs.debug('showPopup: show');
        if (direction=='download') w.de_ggbs_abs.download(singlebook, force);    //in download.js
        else                       w.de_ggbs_abs.upload(singlebook, force);      //in upload.js
      }
    } else {
  /*
      var w=window.openDialog("chrome://addressbookssync/content/"+direction+".xul","_blank",
        'chrome,resizable,titlebar=no', singlebook, force);
  */
      var args = Components.classes["@mozilla.org/array;1"]
                      .createInstance(Components.interfaces.nsIMutableArray);
      var s=Components.classes["@mozilla.org/supports-string;1"]
          .createInstance(Components.interfaces.nsISupportsString);
      s.data=singlebook;
      args.appendElement(s, false);
      var f=Components.classes["@mozilla.org/supports-string;1"]
          .createInstance(Components.interfaces.nsISupportsString);
      f.data=force?'true':'false';
      args.appendElement(f, false);
      var modal='';
      if (abs.exiting && abs.synctype=='imap') {
        modal=',modal';
  /*
        if (abs.lastWindow) abs.lastWindow.minimize();
        var windowsEnum = abs.wMediator.getEnumerator(null);  //enumerate all windows //"mail:3pane");
        while (windowsEnum.hasMoreElements()) {
          var w=windowsEnum.getNext();
          w.minimize();
        }
  */
        abs.debug('showPopup: openmodal');
      }
      var w=abs.wWatcher.openWindow(null, "chrome://addressbookssync/content/"+direction+".xul",
        '_blank', 'chrome,resizable,titlebar=no'+modal, args);
      //if adding more arguments: update in call to upload() and download() above
      //    AND in upload.xul and download.xul!!
  abs.debug('showPopup: opened '+w);
    }
  },

  debug: function(text, inconsole) {
    if (!this.dodebug) return;
    var d=new Date();
    var s=d.toLocaleString();
    var flags=0x10|0x08|0x02;
          // 0x02=PR_WRONLY, 0x10=PR_APPEND, 0x08=PR_CREATE_FILE
    try {
      var logFile = this.getDir('TmpD');
      logFile.appendRelativePath( 'AddressbookSynchronizer.log' );
      var strm = Components.classes["@mozilla.org/network/file-output-stream;1"].
        createInstance(Components.interfaces.nsIFileOutputStream);
      var os = Components.classes["@mozilla.org/intl/converter-output-stream;1"].
        createInstance(Components.interfaces.nsIConverterOutputStream);
      strm.QueryInterface(Components.interfaces.nsIOutputStream);
      strm.QueryInterface(Components.interfaces.nsISeekableStream);
      strm.init( logFile, flags, /*0600*/0x180, 0 );
  //    strm.write( text, text.length );
      os.init(strm, 'UTF-8', 0, 0x0000);
      os.writeString(s+': '+text+"\n");
      os.close();
  //    strm.flush();
  //    strm.close();
    } catch(e) {
      this.console.logStringMessage('AddressbooksSynchronizer: '+'File write:\n'+e);
    }
    if (inconsole) this.console.logStringMessage('AddressbooksSynchronizer: '+text);
  },

  dump: function(text, always) {
    if (always || this.dodebug)
      this.console.logStringMessage('ABS: '+text);
  }
//////////////////////////////////////////////
}
