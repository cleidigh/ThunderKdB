const { ExtensionCommon } = ChromeUtils.import("resource://gre/modules/ExtensionCommon.jsm");
const { Services } = ChromeUtils.import("resource://gre/modules/Services.jsm");
const { AddonManager } = ChromeUtils.import("resource://gre/modules/AddonManager.jsm");
const { MailServices }=ChromeUtils.import("resource:///modules/MailServices.jsm");
const { MailUtils }=ChromeUtils.import("resource:///modules/MailUtils.jsm");
const { FileUtils }=ChromeUtils.import("resource://gre/modules/FileUtils.jsm");
const { NetUtil } = ChromeUtils.import("resource://gre/modules/NetUtil.jsm");
const { ExtensionSupport } = ChromeUtils.import("resource:///modules/ExtensionSupport.jsm");
//const { ActivityManager } = ChromeUtils.import("resource:///modules/ActivityManager.jsm");	//this prevents TB from loading!
//const { ActivityProcess, ActivityEvent, ActivityWarning } = ChromeUtils.import("resource:///modules/Activity.jsm");

var {Cc: classes, Ci: interfaces} = Components;

/*
// ChromeUtils.import() works in experiments for core resource urls as it did
// in legacy add-ons. However, chrome:// urls that point to add-on resources no
// longer work, as the "chrome.manifest" file is no longer supported, which
// defined the root path for each add-on. Instead, ChromeUtils.import() needs
// a moz-extension:// url, which can access any resource in an add-on:
//
// moz-extension://<Add-On-UUID>/path/to/modue.jsm
//
// The add-on UUID is a random identifier generated on install for each add-on.
// The extension object of the WebExtension has a getURL() method, to get the
// required url:
//
// let mozExtensionUrl = extension.getURL("path/to/module.jsm");
//
// You can get the extension object from the context parameter passed to
// getAPI() of the WebExtension experiment implementation:
//
// let extension = context.extension;
//
// or you can generate the extension object from a given add-on ID as shown in
// the example below. This allows you to import JSM without context, for example
// inside another JSM.
//
var { ExtensionParent } = ChromeUtils.import("resource://gre/modules/ExtensionParent.jsm");
var extension = ExtensionParent.GlobalManager.getExtension("addressbookssync@ggbs.de");
//	This currently (TB74b2) does not work when used inside .xpi
//var { absModule } = ChromeUtils.import(extension.getURL("content/addressbookssync.jsm"));
//	use something like (see below and bug https://bugzilla.mozilla.org/show_bug.cgi?id=1621580)
//	context.extension.rootURI.resolve("./modules/myModule.jsm")
*/
const kPersonalAddressbookURI = "jsaddrbook://abook.sqlite";
const kCollectedAddressbookURI = "jsaddrbook://history.sqlite";
const kPABDirectory = 101;
const kJSDirectory = 101;
const kDirectoryRoot = "jsaddrbook://";

var extension;
var version;
var appVersion;
var prefs;
var filepickerpath;
var filepickerfile;
var statusURI;
var scriptsLoaded;
var optionsURI;
var optionsWin;
var hiddenWin=null;
var openHiddenWin=false;
var exiting='';		//'quit' or 'close'
var gFire=null;
var chromeHandle=null;

debug('entered');
try {
var abs = class extends ExtensionCommon.ExtensionAPI {
  onStartup() {
debug('entered');
  }

  onShutdown(isAppShutdown) {
debug('onShutdown isAppShutdown='+isAppShutdown+' unregistering window listener');
    ExtensionSupport.unregisterWindowListener("AddressbooksSynchronizer");
    if (isAppShutdown) return;
    // Looks like we got uninstalled. Maybe a new version will be installed
    // now. Due to new versions not taking effect
    // (https://bugzilla.mozilla.org/show_bug.cgi?id=1634348)
    // we invalidate the startup cache. That's the same effect as starting
    // with -purgecaches (or deleting the startupCache directory from the
    // profile).
    //gg: also called on 'disable add-on'
    Services.obs.notifyObservers(null, "startupcache-invalidate");
  }

  getAPI(context) {
debug('getApi entered');	//more than once!
    extension=context.extension;

    // To be notified of the extension going away, call callOnClose with any object that has a
    // close function, such as this one.
    context.callOnClose(this);
		this.getAddon();

    let e10s=Services.prefs.getBoolPref("browser.tabs.remote.autostart", false);
debug('e10s is '+(e10s?'enabled':'not enabled'));
		if (!chromeHandle && e10s) registerChromeUrl(context, [ ["content", "addressbookssync", "content/"] ]);

/*
 		let uri=context.extension.rootURI.resolve("content/addressbookssync.jsm");
// if unpacked: uri=file:///D:/sourcen/Mozilla/thunderbird/Extensions/ShowInOut_wee/showInOut.jsm
// if packed:   uri=jar:file:///C:/gg/INI/Thunderbird7x/extensions/showInOut@ggbs.de.xpi!/showInOut.jsm
		var { absModule } = ChromeUtils.import(uri);
*/

//debug('My URI: '+window.location);	//window is not defined
//moz-extension://1eb49a87-7593-4a1f-b05a-aa4abc1c7bc8/_generated_background_page.html
		optionsURI=extension.baseURL+'abs_options.html';
debug('optionsURI='+optionsURI);
//moz-extension://1eb49a87-7593-4a1f-b05a-aa4abc1c7bc8/abs_options.html

		if (!e10s) {
			//TB<=85 or e10s disabled (browser.tabs.remote.autostart==false)
			statusURI=extension.rootURI.resolve("./abs_status.html");
//file:///D:/sourcen/Mozilla/thunderbird/Extensions/AddressbooksSync_wee/abs_status.html
		} else {
			//TB>=86 and e10s enabled (browser.tabs.remote.autostart==true)
			statusURI='chrome://addressbookssync/content/abs_status.html';		// with registerChromeUrl
		}
debug('statusURI='+statusURI);

		if (typeof scriptsLoaded=='undefined') {
			debug('loading scripts');
			let utilsURI=extension.rootURI.resolve("./abs_utils.js");
				Services.scriptloader.loadSubScript(utilsURI);
			let uploadURI=extension.rootURI.resolve("./abs_upload.js");
				Services.scriptloader.loadSubScript(uploadURI);
			let downloadURI=extension.rootURI.resolve("./abs_download.js");
				Services.scriptloader.loadSubScript(downloadURI);
			let imapURI=extension.rootURI.resolve("./abs_imap.js");
				Services.scriptloader.loadSubScript(imapURI);
			let nsURI=extension.rootURI.resolve("./abs_networkservice.js");
				Services.scriptloader.loadSubScript(nsURI);
			let listenersURI=extension.rootURI.resolve("./abs_listeners.js");
				Services.scriptloader.loadSubScript(listenersURI);
			scriptsLoaded=true;
		}

    return {
      abs: {
        migratePrefs: async function() {
debug('entered');
          registerListener();

          let mig=new Object;
          let b=Services.prefs.getBranch("extensions.addressbookssync.");
          let prefs=b.getChildList("");
          let count=prefs.length;
          if (count) {  // else: fresh install or already migrated
            prefs.forEach(pref=>{
							if (pref=='version') return;
							if (pref.match(/^places/)) return;
              let t=b.getPrefType(pref);

              let v;
              if (t == 32/*PREF_STRING*/) 		v=b.getCharPref(pref, null);
              else if (t == 128/*PREF_BOOL*/) v=b.getBoolPref(pref, null);
              else                        		v=b.getIntPref(pref, null);  //PREF_INT==32
              if (v || v===false) {   //exclude null, '' and 0
                mig[pref]=v;
              }
            });
            b.deleteBranch("");     // migrated!

						//migrate imapfolder
						let imf=mig['imapfolder'];
						if (imf) {
							let accounts=MailServices.accounts.accounts;
							let ac = accounts.length;
							for (let i = 0; i < ac; i++) {
								let account = accounts[i]; //.queryElementAt(i, Ci.nsIMsgAccount);
								let key = account.key;
								let server = account.incomingServer;
								let rootFolder=server.rootMsgFolder;		//nsIMsgFolder
								if (imf.match(rootFolder.URI)) {
									mig['imapfolderAccount']=key;
									let path=imf.replace(rootFolder.URI, '');
									mig['imapfolderPath']=path;
									// its too early for MailUtils.getExistingFolder to find a folder :-(
									let f=MailUtils.getExistingFolder(imf);
									mig['imapfolderName']=server.prettyName+':'+(f?f.prettyName:path.replace(/.*\//,''));
									delete mig['imapfolder'];
								}
							}
						}

						//remove unused addressbooks preferences and replace .mab to .sqlite in .filename
						for (let [key, val] of Object.entries(mig)) {
							let p=key.match(/^(ldap_2\.servers\..*)\.(down|up|filename)$/);
							if (p) {
								let uid=Services.prefs.getCharPref(p[1]+'.uid', null);
//debug('pref book: '+p[1]+' '+p[2]+'->'+val+'  --> '+uid);
								//if (uid) mig['book.'+uid+'.'+p[2]]=val;
								if (uid===null) delete mig[key];
								else if (p[2]=='filename') mig[key]=val.replace(/\.mab/, '.sqlite');
							}
						}

						if (typeof mig['usepost']==='undefined') mig['usepost']=false;
						if (typeof mig['notimecheck']==='undefined') mig['notimecheck']=false;

						// remove description
						b=Services.prefs.getBranch("extensions.addressbookssync@ggbs.de.");
            b.deleteBranch("");

            //disable auto functions since addressbooks format has changed
						mig['autoupload']=false;
						mig['autodownload']=false;
						mig['loadtimer']=0;

            //show warning(s) in options page
            mig['upgraded']='';
            if (mig['synctype']=='remote' && (mig['protocol']=='ftp' || mig['protocol']=='http')) {
              //show warning about insecure connection
              let uristring=mig['protocol']+'://'+mig['host']+mig['path'];
              let sb=Services.strings.createBundle(
                "chrome://messenger/locale/accountCreation.properties"
              );
              let msg=sb.formatStringFromName(
                "cleartext_warning", [uristring, ]);
              mig['upgraded']=msg;
            }
debug('upgraded='+mig['upgraded']);
						//Services.prompt.alert(null, "Addressbooks Synchronizer", strings['upgrade']);

          }
          return mig;
        },
        uids2ids: async function() {
debug('entered prefs='+prefs);
try {
					let u2i=new Object;
					let u2f=new Object;
					for (let dir of MailServices.ab.directories) {
//debug('uids2ids: '+dir.UID+' -> '+dir.dirPrefId);
						u2i[dir.UID]=dir.dirPrefId;
						if (typeof prefs!=='undefined') u2f[dir.UID]=getExternalFilename(dir);
								//if called from background we have no prefs yet, but we don't need u2f there
					}
					return [u2i, u2f];
} catch(e) {console.log('throws: '+e, e);}
				},
				setPrefs: function(theprefs, changedPref) {
debug('entered changedPref='+changedPref);
          let [tb, version]=changedPref.split(':');
          if (version) {
            appVersion=version.replace(/^(\d+\.\d+)(\..*)?$/, '$1');
debug('use appVersion '+appVersion);
            changedPref='';
          }
          prefs=theprefs;
          let cPrefs=initialize();		//only on first call!
          if (changedPref=='loadtimer' || changedPref=='timeddownload' || changedPref=='timedupload')
            startTimer();
          else if (changedPref=='synctype' || changedPref=='autoupload' || changedPref=='noupload')
            theHiddenWin(prefs['synctype']=='imap' && prefs['autoupload']);
          return cPrefs;
        },
				filePicker: async function(prompt, type, filters, defaultpath) {
debug('entered');
          filepickerpath=null;
          const nsIFilePicker = Ci.nsIFilePicker;
          let filePicker = Cc["@mozilla.org/filepicker;1"].
                              createInstance(nsIFilePicker);

          let m3p=Services.wm.getMostRecentWindow("mail:3pane");
          let mode=type=='path'?nsIFilePicker.modeGetFolder:
                    (type=='file'?nsIFilePicker.modeOpen:nsIFilePicker.modeSave);
          filePicker.init(m3p, prompt, mode);
          if (filters) {
            for (let [filter, text] of Object.entries(filters)) {
              filePicker.appendFilter( text, filter );
              if (appVersion>=82) break;  //no '.mab' anymore
            }
          }
          if (defaultpath) filePicker.defaultString = defaultpath;

          filePicker.open(rv => {
            if (rv == nsIFilePicker.returnCancel ) filepickerpath='';
            else { filepickerfile=filePicker.file; filepickerpath=filepickerfile.path; }
            if (gFire) {
debug('filepicker: notify options window');
              gFire.async({path: filepickerpath, type: type});
            } else {
debug('filepicker: options window has vanished');
            }
          })
				},
				saveMabFile: function(id, newPath) {
					let ret=saveMabFile(id, newPath);
debug('returning '+ret);
					return ret;
				},
				loadMab: async function(mabName, filename) {
					let ret=await loadMab(mabName, filename);
debug('returning '+ret);
					return ret;
				},
				showPopup: async function(direction, singlebook, type, force) {
					let ret=showPopup(direction, singlebook, type, force);
					return ret;
				},
        splitURI: function(uristring) {
          let uri=null;
          try {
            uri=Services.io.newURI(uristring);
//'https:/www.' automatically adds a second /
//missing ':' throws NS_ERROR_MALFORMED_URI
//httpx:// throws NS_ERROR_FAILURE
//TB89 with ftp disabled: does NOT throw an error
debug(JSON.stringify(uri));
debug(uristring+' -> '+uri.scheme+' '+uri.hostPort+' '+uri.filePath);
            if (uri.scheme=='ftp') {
              if (!Services.prefs.getBoolPref("network.ftp.enabled", false)) {
                let sb=Services.strings.createBundle(
                  "chrome://messenger/locale/accountCreationUtil.properties"
                );
                let msg=sb.GetStringFromName('url_parsing.error');  //URL not recognized
                Services.prompt.alert(null, "Addressbooks Synchronizer", msg);
                return null;
              } else {
                let ans=Services.prompt.confirm(null, "Addressbooks Synchronizer", strings['ftpwarn']);
                if (!ans) return null;
              }
            }
            if (uri.scheme=='ftp' || uri.scheme=='http') {
              let sb=Services.strings.createBundle(
                "chrome://messenger/locale/accountCreation.properties"
              );
              let msg=sb.formatStringFromName(
                "cleartext_warning", [uristring, ]);
              let ans=Services.prompt.confirm(null, "Addressbooks Synchronizer", msg);
              if (!ans) return null;

            } else if (uri.scheme!='https') {
              let sb=Services.strings.createBundle(
                "chrome://messenger/locale/accountCreationUtil.properties"
              );
              let msg=sb.GetStringFromName('url_scheme.error'); //URL scheme not allowed (e.g. file:)
              Services.prompt.alert(null, "Addressbooks Synchronizer", msg);
              return null;
            }
            return {protocol: uri.scheme, host: uri.hostPort, path: uri.filePath};
          } catch(e) {
debug(e);
          }
debug(uristring+' -> illegal uri');
          let sb=Services.strings.createBundle(
            "chrome://messenger/locale/accountCreationUtil.properties"
          );
          let msg=sb.GetStringFromName('url_parsing.error');  //URL not recognized
          Services.prompt.alert(null, "Addressbooks Synchronizer", msg);
          return null;
        },
				abspassword: async function(protocol, host, user, pwd) {
					return abspassword(protocol, host, user, pwd);
				},
        onFilePicker: new ExtensionCommon.EventManager({
          context,
          name: "abs.onFilePicker",
          register(fire) {
debug('onFilePicker register');
            gFire=fire;
            return function() {
debug('onFilePicker unregister');
              gFire=null;
            };
          },
        }).api(),
        debug: async function(txt, ln) {
					debug(txt, ln);
				},
        doATest: async function(param) {
					doATest(param);
				}
			}
    }
  }
  close() {
    // This function is called if the extension is disabled or removed, or Thunderbird closes.
    // We registered it with callOnClose, above.
debug("closing");
  }
  async getAddon() {
    let addOn=await AddonManager.getAddonByID("addressbookssync@ggbs.de");
    let console = Services.console;
    let app = Services.appinfo;
    console.logStringMessage('AddressbooksSynchronizer: '+addOn.version+' on '+app.name+' '+app.version+' on '+app.OS);
		version=addOn.version;
		appVersion=app.version.replace(/^(\d+\.\d+)(\..*)?$/, '$1');
debug('appVersion='+appVersion);
  }

};
function registerListener() {
debug('registering window listener');
  ExtensionSupport.registerWindowListener("AddressbooksSynchronizer", {
  /*
    chromeURLs: [
      "chrome://messenger/content/messenger.xhtml",
  //		"moz-extension://1eb49a87-7593-4a1f-b05a-aa4abc1c7bc8/abs_status.html",	//this does not work
  //		"file:///D:/sourcen/Mozilla/thunderbird/Extensions/AddressbooksSync_wee/abs_status.html", //this also does not work
    ],
  */
    onLoadWindow: function(w) {
debug(''+w.document.location);
  //		initialize();		//on first window only (via var initialized)	//now in getAPI
      if (w==hiddenWin) {
debug('hiddenWin loaded');		// fires before openWindow() returns!!
       hiddenWin.document.getElementById('messagepane').docShell.document.body.textContent=
          strings['hiddenwin'];
       hiddenWin.document.title=strings['hiddenwintitle'];
  		hiddenWin.setTimeout(()=>{
				hiddenWin.minimize();								//must be delayed!
debug('hiddenWin: minimized');
			}, 100);
     } else if (w.document.location=='chrome://messenger/content/messenger.xhtml') {
debug('load hiddenWin if necessary');
				if (!prefs) {
debug('delay open hiddenWin until prefs available');
					openHiddenWin=true;
				} else if(!hiddenWin)	{
					theHiddenWin(prefs['synctype']=='imap' && prefs['autoupload']);
				}
      } else if (w.document.location=='chrome://messenger/content/addressbook/addressbook.xhtml') {
debug('Addressbook loaded, try adding menu items');
        let tm=w.document.getElementById('taskPopup');
        let sep=w.document.getElementById('prefSep');
debug('Addressbook '+tm+' '+sep);
        let up=sep.previousSibling.cloneNode();
        up.label=strings['upload_title'];
        up.removeAttribute('accesskey');
        up.setAttribute('oncommand', "Services.obs.notifyObservers(null, 'abs_upload', '');");
        let down=sep.previousSibling.cloneNode();
        down.label=strings['download_title'];
        down.removeAttribute('accesskey');
        down.setAttribute('oncommand', "Services.obs.notifyObservers(null, 'abs_download', '');");
        tm.insertBefore(down, sep);
        tm.insertBefore(up, sep);

        let dtc=w.document.getElementById('dirTreeContext');
  //onpopupshowing="updateDirTreeContext();"
        let ops=dtc.getAttribute('onpopupshowing');
debug('dirTreeContext onpopupshowing='+ops);
        dtc.setAttribute('onpopupshowing', ops+`
  let sd=getSelectedDirectory();let iml=sd?sd.isMailList:true;
  document.querySelectorAll("[class=abs]").forEach(e => {e.disabled = iml; });
  `);
  /*
    document.getElementById('dirTreeContext-abs-upload').disabled=iml;
    document.getElementById('dirTreeContext-abs-download').disabled=iml;
  */
        let d=w.document.getElementById('dirTreeContext-delete');
        let sep2=d.previousSibling.cloneNode();
        let ups=d.cloneNode();
        ups.id='dirTreeContext-abs-upload';
        ups.className='abs';
        ups.label=strings['addressbookssync_upload'];
        ups.removeAttribute('accesskey');
        ups.removeAttribute('command');
        ups.setAttribute('oncommand', "Services.obs.notifyObservers(null, 'abs_upload', GetDirectoryFromURI(getSelectedDirectoryURI()).dirName);");
        let downs=d.cloneNode();
        downs.id='dirTreeContext-abs-download';
        downs.className='abs';
        downs.label=strings['addressbookssync_download'];
        downs.removeAttribute('accesskey');
        downs.removeAttribute('command');
        downs.setAttribute('oncommand', "Services.obs.notifyObservers(null, 'abs_download', GetDirectoryFromURI(getSelectedDirectoryURI()).dirName);");
        dtc.insertBefore(ups, d);
        dtc.insertBefore(downs, d);
        dtc.insertBefore(sep2, d);
        
      }
    },
    onUnloadWindow: function(w) {
  //does not fire on hiddenWin
debug(''+w.document.location);
			if (w.document.location=="chrome://global/content/commonDialog.xhtml")
				return;		// might be the dialog for asking the master password
      let we = Services.wm.getEnumerator(null);	
      let c=0;
      while (we.hasMoreElements()) {
        let w=we.getNext();
debug('found '+w.document.location);
        if (w==hiddenWin)
  //			if (w.location=='chrome://messenger/content/messageWindow.xhtml' &&
  //							w.document.getElementById('mail-toolbar-menubar2').clientHeight==0)
          debug('skip counting hiddenWin')
        else
          c++;
      }
debug('found '+c+' windows');
      if (!exiting && c==0) {
debug('calling finalize(close)');
        finalize('close');
      }
    }
  });
}; //end function register()

/*
 *	This does not work, only fires on window open with a location of about:blank for all windows
 */
var closecount=0;
var observer = {
  observe: function(aSubject, aTopic, aData) {
try {
    switch (aTopic) {
			case "domwindowopened":
debug('window '+aTopic+' '+aSubject.location);	//about:blank
				break;
			case "domwindowclosed":
debug('window '+aTopic+' '+aSubject.location);
						//chrome://extensions/content/dummy.xhtml if messenger.xhtml closes :-((
				let w=aSubject;
				if (w==hiddenWin) {
//				if (!exiting && w.location=='chrome://messenger/content/messageWindow.xhtml' &&
//							w.document.getElementById('mail-toolbar-menubar2').clientHeight==0) {
debug('hiddenWin closed');
					//if the hiddenWin was closed, this test does not work yet!
					//if (hiddenWin && hiddenWin.document.getElementById('messagepane').docShell===null) {
					//... }
					//alert is shown before hiddenWin vanishes!
					Services.prompt.alert(null, 'Addressbooks Synchronizer', strings['dontclose']);
					hiddenWin=null;
				}
				break;
			case "quit-application-requested":
//				if (aSubject instanceof Ci.nsISupportsPRBool) {
					if (!closecount) {
						closecount++;
						aSubject.QueryInterface(Ci.nsISupportsPRBool);
						aSubject.data=finalize('quit');			// cancel quit request if necessary
debug('quit-application-requested: cancel quit and call finalize(quit)');
					} else {
debug('quit-application-requested: now quit');
						aSubject.data=false;		// now allow quit
					}
//				}
				break;
			case "quit-application-granted":
debug(aTopic);
				break;
			case "toplevel-window-ready":
debug(aTopic+' '+aSubject.location);
				break;
			case "dom-window-destroyed":
				//despite the name, this also fires on load with the window as aSubject
//dom-window-destroyed file:///D:/sourcen/Mozilla/thunderbird/Extensions/AddressbooksSync_wee/abs_status.html
//dom-window-destroyed moz-extension://1eb49a87-7593-4a1f-b05a-aa4abc1c7bc8/abs_options.html
if (aSubject.location!='') debug(aTopic+' '+aSubject.location);

				break;
			case "xul-window-registered":
debug(aTopic+' '+aSubject.docShell.domWindow.location);
				break;
			case "mail-unloading-messenger":
debug(aTopic+' '+aSubject.docShell.domWindow.location);
//				if (!exiting)
//					finalize('close');
				break;

/* notifies from addressbook window */
			case "abs_upload":
debug(aTopic+' '+aData);
				if (!aData) showPopup('upload', '', 'manual', true);
				else {
					//let dir=GetDirectoryFromURI(aData);
					showPopup('upload', aData, 'manual', true);
				}
				break;
			case "abs_download":
debug(aTopic+' '+aData);
				if (!aData) showPopup('download', '', 'manual', true);
				else {
					//let dir=GetDirectoryFromURI(aData);
					showPopup('download', aData, 'manual', true);
				}
				break;


			default:
debug(aTopic+' '+aSubject+' '+aData);
				break;
		}
} catch(e) { debug('throws: '+e,e); }
  }
}

function registerChromeUrl(context, chromeData) {
debug('registerChromeUrl');
	const aomStartup = Cc["@mozilla.org/addons/addon-manager-startup;1"].getService(Ci.amIAddonManagerStartup);
	const manifestURI = Services.io.newURI(
		"manifest.json",
		null,
		context.extension.rootURI
	);
	chromeHandle = aomStartup.registerChrome(manifestURI, chromeData);         
debug('registerChromeUrl chromeHandle='+chromeHandle);
}


let obs=Services.obs;
obs.addObserver(observer,"quit-application-requested", false);	//does not fire if mail:3pane window is closed
obs.addObserver(observer,"quit-application-granted", false);
obs.addObserver(observer,"quit-application", false);
obs.addObserver(observer,"domwindowopened", false);
obs.addObserver(observer,"domwindowclosed", false);
obs.addObserver(observer,"dom-window-destroyed", false);
//obs.addObserver(observer,"xul-window-destroyed", false);
obs.addObserver(observer,"toplevel-window-ready", false);	//about:blank
obs.addObserver(observer,"xul-window-registered", false);
obs.addObserver(observer,"xul-window-visible", false);
obs.addObserver(observer,"mail-unloading-messenger", false);	//if mail:3pane unloads

//notifies from menuentries in addressbook window
obs.addObserver(observer,"abs_upload", false);
obs.addObserver(observer,"abs_download", false);
} catch(e) {
	debug('throws: '+e, e);
}

