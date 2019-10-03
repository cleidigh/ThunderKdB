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


//loadSubScript (in wstring url[, targetObj]);

const Ci = Components.interfaces, Cc = Components.classes, Cr = Components.results;

const MY_CID            = Components.ID("{82057672-19A9-47E3-BB7f-0F08A28CE014}");
Components.utils.import("resource://gre/modules/XPCOMUtils.jsm");
Components.utils.import("resource://gre/modules/Services.jsm");
Components.utils.import("resource:///modules/mailServices.js");

function addressbooksSync()
{
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

  loader.loadSubScript ('chrome://addressbookssync/content/Utils.js', addressbooksSync.prototype);

  this.mNT=false;
  this.initialize();
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
    if (this.mAppStarttime==null) this.initialize();
    else if (aAppStarttime>0) this.mAppStarttime = aAppStarttime;
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
//dump('abs-observer: '+aTopic+'\n');
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

      case "quit-application-requested":
this.debug(aTopic);
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

/*
      case "quit-application-granted":
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
        break;
*/

      case "domwindowclosed":
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
  }
,

    classID: MY_CID,
    QueryInterface: 
         XPCOMUtils.generateQI([Components.interfaces.de_ggbs_AddressbooksSync])
}

const NSGetFactory = XPCOMUtils.generateNSGetFactory([addressbooksSync]);
