"use strict";

Components.utils.import("resource://gre/modules/Services.jsm");

/*
if (QuickPasswords.Util.Application == 'Postbox'){ 
  if (typeof XPCOMUtils != 'undefined') {
    XPCOMUtils.defineLazyGetter(this, "NetUtil", function() {
    Components.utils.import("resource://gre/modules/NetUtil.jsm");
    return NetUtil;
    });
  }
  else {
    Components.utils.import("resource://gre/modules/NetUtil.jsm");
  }
}
else {
  Components.utils.import("resource:///modules/MailUtils.js");
}
*/

QuickPasswords.Persist = {
	encrypted : null,
	get Entries() {
		const util = QuickPasswords.Util,
		      prefs = QuickPasswords.Preferences,
		      Cc = Components.classes,
          Ci = Components.interfaces;
		let logins = Services.logins.getAllLogins(),
		    persistedLogins = [],
		    cryptoService = Cc["@mozilla.org/login-manager/crypto/SDR;1"].getService(Ci.nsILoginManagerCrypto),
				isEncrypted = this.encrypted; 
				
		if (prefs.isDebug) debugger;
		
		for (let i=0; i < logins.length; i++) {
			let login = logins[i],
			    PL = {
				    hostname: login.hostname,
						formSubmitURL: login.formSubmitURL,
						httpRealm: login.httpRealm,
						pwd: isEncrypted ? cryptoService.encrypt(login.password) : login.password,
						pwdField: login.passwordField,
						usr: login.username,
						usrField: login.usernameField
					};
			if (!isEncrypted) PL.plainText = true;
			// Query for Optional fields.
			let metaInfo = login.QueryInterface(Ci.nsILoginMetaInfo);
			if (metaInfo) {
				PL.timeCreated         = metaInfo.timeCreated;
				PL.timePasswordChanged = metaInfo.timePasswordChanged;
				PL.timeLastUsed        = metaInfo.timeLastUsed;
				PL.guid = metaInfo.guid;
			}

			persistedLogins.push(PL);
		}
		return persistedLogins;
		//		from docs for nsILoginManager
		/*
		let nsLoginInfo = new Components.Constructor("@mozilla.org/login-manager/loginInfo;1",
		                              Ci.nsILoginInfo,
		                              "init"),
		*/
		// logins wrapper for saving.
	},
	
	set Entries(jRead) {
		const util = QuickPasswords.Util,
		      prefs = QuickPasswords.Preferences,
		      Cc = Components.classes,
          Ci = Components.interfaces,
					Cr = Components.results;
		function newPropertyBag(aProperties) {
			let propertyBag = Cc["@mozilla.org/hash-property-bag;1"].createInstance(Ci.nsIWritablePropertyBag);
			if (aProperties) {
				for (let [name, value] of Iterator(aProperties)) {
					propertyBag.setProperty(name, value);
				}
			}
			return propertyBag.QueryInterface(Ci.nsIPropertyBag)
												.QueryInterface(Ci.nsIPropertyBag2)
												.QueryInterface(Ci.nsIWritablePropertyBag2);
		}
		function isDifferent(newLogin, oldLogin) {
			for (let key in "hostname,formSubmitURL,httpRealm,password,passwordField,username,usernameField".split(',')) {
				if (oldLogin[key] != newLogin[key]) return true;
			}
			return false;
		}
					
		let logins = Services.logins.getAllLogins(),  // nsLoginInfo[]
		    cryptoService = Cc["@mozilla.org/login-manager/crypto/SDR;1"].getService(Ci.nsILoginManagerCrypto),
				srvLoginManager = Cc["@mozilla.org/login-manager;1"].getService(Ci.nsILoginManager),
				LoadSignons_Bak = null,
				isDebugDetail = prefs.isDebugOption('backup');	 // for testing;

		if (isDebugDetail) debugger;
		// suspend all observers to save time. Otherwise the addons box will be constantly updated.
		let observerService = Cc["@mozilla.org/observer-service;1"].getService(Ci.nsIObserverService),
		    observers = [],
		    enumerator = observerService.enumerateObservers('passwordmgr-storage-changed');
		if (LoadSignons) {
			LoadSignons_Bak = LoadSignons;
			// overwrite this global routine from passwordManager.js
			LoadSignons = function LoadSignons() {  return true; }
		}
		while (enumerator.hasMoreElements()) {
      try {
        let observer = enumerator.getNext().QueryInterface(Ci.nsIObserver);
        if (observers.indexOf(observer) == -1) {
          observers.push(observer);
					// unregister from topic
					observerService.removeObserver(observer,'passwordmgr-storage-changed');
        }
      } catch (e) { }
    }
	  try {
			let persistedLogins;
			// wrapper for reading logins
			// this is where we need to do merge etc.
			try {
			  persistedLogins = JSON.parse(jRead);
			}
			catch(ex) {
				let title = "JSON Error",
				    msg = "Could not parse the information retrieved from the file. \n\n" + ex.message;
				util.alert(msg, title);
				throw(ex);
			}
			
			
			let	ctModified = 0,
					ctUnmodified = 0,
					ctNew = 0,
					read = persistedLogins.length,
					addedLogins = [],  // missing logins before restore; the others will be updated in place where appropriate
					failedToAdd = [],
					modifyRemaining = false,
					skipRemaining = false,
					encErr =''; 
			for (let j=0; j<read; j++) {
				let record = persistedLogins[j],
						isChanged = false,
						exists = false,
						userChanged = false,
						login, metaInfo, 
						isEncrypted = (typeof record.plainText == 'undefined' || !record.plainText);
				try { 
					// the decryption may fail! (to do: find out the conditions that can make it fail? 
					// changing / restoring master password?
					// OVERWRITE with plain version
					record.pwd = isEncrypted ? cryptoService.decrypt (record.pwd) : record.pwd;
				}
				catch (ex) {
					if (!encErr) {
						encErr = util.getBundleString('alert.restore.failure.decryption',
   				              'Decryption error. This can be caused by using a different keystore. Try to restore the file key3.db from the original {0} installation.')
												.replace ('{0}', util.Application);
					}
					// Cr.NS_ERROR_FAILURE if it can't decrypt
					record.exception = encErr;
					failedToAdd.push(record);
					continue;
				}
				// first, try the easy way of finding the record.
				if (record.guid)
					for (let i = 0; i < logins.length && !exists; i++) {
						login = logins[i];
						metaInfo = login.QueryInterface(Ci.nsILoginMetaInfo);
						if (metaInfo.guid == record.guid) {
							exists = true;
							if (login.username != record.usr)
								userChanged = true;
							break;
						}
					}
				if (!exists) for (let i = 0; i < logins.length && !exists; i++) {
					login = logins[i];
					metaInfo = login.QueryInterface(Ci.nsILoginMetaInfo);
					// for a match, both formSubmitURL [alternatively hostname / httpRealm] and user have to match
					if (login.username == record.usr) { // match user name - note: changed user names are NOT caught
						// match url
						if (login.hostname && login.hostname == record.hostname) {
							if (login.formSubmitURL) {
								if (login.formSubmitURL == record.formSubmitURL) exists = true;
							}
							else if (!record.formSubmitURL && !record.formSubmitURL) exists = true;
						}
						else if (!login.hostname && !record.hostname) {
						  if (login.formSubmitURL && login.formSubmitURL == record.formSubmitURL)  exists = true;
							if (login.httpRealm && login.httpRealm == record.httpRealm) exists = true;
						}
					}
				}
				if (!exists)
					addedLogins.push(record);
				else {
					let isModified = false, 
					    isEqualTimeStamp = false;
					if (metaInfo) {
						// do we know that it was changed, based on recorded time stamp
						// let's add 2 seconds account for inexplicable cross profile inaccuracies
						if (metaInfo.timePasswordChanged+2000 < record.timePasswordChanged)
							isModified = true;
						else if (metaInfo.timePasswordChanged == record.timePasswordChanged)
							isEqualTimeStamp = true;
					}
					// if same timestamp, let's check if the _essential_ fields have been changed.
					if (!metaInfo || (!isModified && isEqualTimeStamp)) {
						if (login.password != record.pwd
								|| login.passwordField != record.pwdField
								|| login.usernameField != record.usrField)
							isModified = true;
					}
					
					if (isModified) {
						if (isDebugDetail) debugger;
						let newLogin = metaInfo ? metaInfo.clone() : login.clone();
						if (userChanged) newLogin.username = record.usr;
						newLogin.hostname = record.hostname;
						newLogin.formSubmitURL = record.formSubmitURL;
						newLogin.httpRealm = record.httpRealm;
						newLogin.password = record.pwd;
						newLogin.passwordField = record.pwdField;
						newLogin.username = record.usr;
						newLogin.usernameField = record.usrField;
						//  we don't need to ask this if user is different
						let doModify = modifyRemaining;
						if (!modifyRemaining && !skipRemaining) {
							let msgModExisting = util.getBundleString('alert.restore.modifyExisting', 'Modify existing login for user {0} on {1}?')
							                         .replace("{0}", record.usr)
																			 .replace("{1}", record.httpRealm || record.formSubmitURL || record.hostname),
							    msgDontAskAgain = util.getBundleString('alert.restore.modifyExisting.dontAskAgain', 'Do the same with any other modified logins that are found.'),
									prompts = Cc["@mozilla.org/embedcomp/prompt-service;1"].getService(Ci.nsIPromptService),
									flags = prompts.BUTTON_POS_0 * prompts.BUTTON_TITLE_YES +
													prompts.BUTTON_POS_1 * prompts.BUTTON_TITLE_NO,  // Cancel same as No here.
									checkStatus = {value: false},
									answer = prompts.confirmEx( null, "QuickPasswords", msgModExisting, flags, '', '', '', msgDontAskAgain, checkStatus);
							if (answer == 0) doModify = true;
							if (checkStatus.value) {
								if (answer == 0)
									modifyRemaining = true;
								else
									skipRemaining = true;
							}
						}
						if (userChanged || doModify) {
							// does it have modifications of its main fields?
							if (isDifferent(newLogin, login))
								srvLoginManager.modifyLogin(login, newLogin);
							// use nsIPropertyBag or nsIPropertyBag2 to modify meta Info to update date stamps and GUID:
							if (record.timePasswordChanged) {
								/// let pBag = Cc["@mozilla.org/hash-property-bag;1"].createInstance(Ci.nsIWritablePropertyBag2);
								let pBag = newPropertyBag( {
											timeCreated         : record.timeCreated,
											timePasswordChanged : record.timePasswordChanged,
											timeLastUsed        : record.timeLastUsed,
											guid                : record.guid } );
								srvLoginManager.modifyLogin(newLogin, pBag);
							}
							ctModified++;
						}
						else ctUnmodified++;
					}
					else ctUnmodified++;
				}
			}
			// create a constructor for new logins
      if (isDebugDetail) debugger;			
			let nsLoginInfo = new Components.Constructor("@mozilla.org/login-manager/loginInfo;1", Ci.nsILoginInfo, "init");
			for (let i=0; i < addedLogins.length; i++) {
				let record = addedLogins[i];
				try {
					let createdLogin = new nsLoginInfo (
						record.hostname, 
						record.formSubmitURL, 
						record.httpRealm, 
						record.usr, 
						record.pwd, // Note: we have overwritten this with the decrypted password above.
						record.usrField, 
						record.pwdField
					);
					if (isDebugDetail) debugger;
					srvLoginManager.addLogin(createdLogin);
					
					if (record.timePasswordChanged) {
						let pBag = newPropertyBag( {
									timeCreated        : record.timeCreated,
									timePasswordChanged: record.timePasswordChanged,
									timeLastUsed       : record.timeLastUsed,
									guid               : record.guid } );
						srvLoginManager.modifyLogin(createdLogin, pBag);
					}
					ctNew++;
				}
				catch(ex) {
					record.exception = ex.message;
					failedToAdd.push(record);
				}
			}
			
			let msg = util.getBundleString('alert.restore.ready.text',
			               '{0} existing logins changed.\n{1} logins added.\n{2} logins were unchanged or older.')
										 .replace('{0}', ctModified).replace('{1}', ctNew).replace('{2}', ctUnmodified),
					title = util.getBundleString('alert.restore.ready.title', 'QuickPasswords - Logins Restored');
			
			if (failedToAdd.length) {
				let failMsg = util.getBundleString('alert.restore.failures.review', 'Some logins could not be added, do you want to review these?');
				if (util.confirm(msg + "\n" + failMsg, title)) {
					let failsTitle = util.getBundleString('alert.restore.failures.title', 'FAILED LOGINS'),
					    errList = failsTitle + '\n' + Array(failsTitle.length+1).join('=') + '\n';
					for (let x=0; x<failedToAdd.length; x++) {
						let record = failedToAdd[x];
						errList += '\n' + (10000 + x).toString().slice(-4) // 4digit leading zeroes
										+ (record.guid ? ' - ' + record.guid : "")
										+ '\n' + 'hostname = ' + record.hostname
										+ '\n' + 'formSubmitURL = ' + record.formSubmitURL
										+ '\n' + 'httpRealm = ' + record.httpRealm
										+ '\n' + 'username = ' + record.usr
										+ '\n' + 'usernameField = ' + record.usrField
										+ '\n' + 'passwordField = ' + record.pwdField
										+ '\n' + 'error = ' + record.exception
										+ '\n ---------------------------';
					}
					util.copyStringToClipboard(errList);
					util.alert(util.getBundleString('alert.restore.failures.copied','Information was copied to clipboard'));
				}
			}
			else
				util.alert(msg, title);
		}
		catch(ex) {
			if (isDebugDetail) debugger;
			util.logException('set Persist.Entries()', ex);
		}
		finally {
			// restore load routine
			if (LoadSignons_Bak) 
				LoadSignons = LoadSignons_Bak;

			if (observers) {
				// restore all observers and notify of changes!
				for (let i=0; i<observers.length; i++) {
					observerService.addObserver(observers[i], 'passwordmgr-storage-changed', false); // weak?
				}
				observerService.notifyObservers(null, 'passwordmgr-storage-changed', "modifyLogin");
			}
		}
		
	},
	
  // %file(filePath,encoding)%
  // %file(imagePath,altText)%
	// mode = 'read' or 'write'
  getFileName: function getFileName(mode, callbackFunction) {
    const fileType ='json',
					util = QuickPasswords.Util,
		      prefs = QuickPasswords.Preferences,
		      Cc = Components.classes,
          Ci = Components.interfaces,
					//localized text for filePicker filter menu
					strBndlSvc = Cc["@mozilla.org/intl/stringbundle;1"].getService(Ci.nsIStringBundleService),
					bundle = strBndlSvc.createBundle("chrome://quickpasswords/locale/overlay.properties"),
					filterText = bundle.GetStringFromName("fpJSONFile"),
					{OS} = (typeof ChromeUtils.import == "undefined") ?
						Components.utils.import("resource://gre/modules/osfile.jsm", {}) :
						ChromeUtils.import("resource://gre/modules/osfile.jsm", {}),
					isDebugDetail = prefs.isDebugOption('backup');

			function twodigits(num) {
				let ret = (100 + num).toString();
				return ret.substring(1);
			}
			// default file name		
			let tm = new Date(),
			    dateStamp = tm.getFullYear().toString() + '-' + twodigits(tm.getMonth() + 1) + '-' + twodigits(tm.getDate()),
          profileDir = OS.Constants.Path.profileDir,
					defaultFile =  "logins" + dateStamp + ".json",
          path,
					defaultPath = prefs.getStringPref("backup.path");
					
		let fp = Cc['@mozilla.org/filepicker;1'].createInstance(Ci.nsIFilePicker);
		fp.init(window, "", mode == 'read' ? fp.modeOpen : fp.modeSave); // second parameter: prompt
		fp.appendFilter(filterText, "*.json");
		
		if (mode =='write') {
			fp.defaultString = defaultFile;
		}
    
    let fpCallback = function fpCallback_FilePicker(aResult) {
      if (aResult != Ci.nsIFilePicker.returnCancel) {  // returnOk=0 or returnReplace=2
				if (isDebugDetail) debugger;
        if (fp.file) {
          let path = fp.file.path,
					    // workaround for getting folder path for file:
					    folderPath = path.substr(0, path.lastIndexOf('\\'));
					if (!folderPath) folderPath = path.substr(0, path.lastIndexOf('/'));
					prefs.setStringPref("backup.path", folderPath);  // save path for next time
          //localFile = Components.classes["@mozilla.org/file/local;1"].createInstance(Ci.nsILocalFile);
          try {
						// call the function that does something with the file name path
						callbackFunction(fp.file.path);
          }
          catch(ex) {
            util.logException('fpCallback_FilePicker', ex);
          }
        }
      }
    }
    
		if (fp.open) {
			const NSIFILE = Ci.nsILocalFile || Ci.nsIFile;
			let file = Cc["@mozilla.org/file/local;1"].createInstance(NSIFILE);
			defaultPath = defaultPath || OS.Path.join(profileDir, "extensions", "QuickPasswords");
			file.initWithPath(defaultPath);
			fp.displayDirectory = file;
			fp.open(fpCallback);		
		}
		else { // Postbox
		  fpCallback(fp.show());
		}
    
    return true;    
  } ,	
	
	store: function store(path) {
    const util = QuickPasswords.Util,
					prefs = QuickPasswords.Preferences,
					Cc = Components.classes,
					Ci = Components.interfaces,
					isDebugDetail = prefs.isDebugOption('backup'),
					backPath = path + ".bak";
    util.logDebug("QuickPasswords.Persist.store()...");
		
		if (util.Application == 'Postbox') {
			let msg = util.getBundleString('alert.backup.appnotsupported', 'Backup/Restore not supported in {0}')
			Services.prompt.alert(null, 'QuickPasswords.backupPasswords', msg.replace('{0}', util.Application));
			return;
		}
    try {
			const {OS} = (typeof ChromeUtils.import == "undefined") ?
				Components.utils.import("resource://gre/modules/osfile.jsm", {}) :
				ChromeUtils.import("resource://gre/modules/osfile.jsm", {});		

			let mediator = Cc["@mozilla.org/appshell/window-mediator;1"].getService(Ci.nsIWindowMediator),
					managerWin = mediator.getMostRecentWindow('Toolkit:PasswordManager'),
			    promiseBackup;
			// show the animation and lock logins panel to indicate activity 
			// and signal to the user that its going to take some time...
			
			let removeIfExists = function(path) {
  			return OS.File.exists(path)
          .then(exists => exists ? 
				                  ( util.logDebug ('deleting file:\n' + path),  OS.File.remove(path) ) 
												: Promise.resolve());
			};

			QuickPasswords.throbber(true, managerWin);
			
			OS.File.exists(path)
			  .then (exists => (!exists)? Promise.resolve() : 
			    removeIfExists(backPath).then ( 
					  () => { 
							if (isDebugDetail) debugger;
							util.logDebug ('creating backup file:\n' + backPath); 
							return OS.File.move(path, backPath);}
						)
					)
			.then ( 
				function backupSuccess() {
					if (isDebugDetail) debugger;
					let entries = QuickPasswords.Persist.Entries,
							entryCount = entries.length,
							entity = entryCount ? entries : '',
							outString = JSON.stringify(entity, null, '  '); // prettify
					util.logDebug('backupSuccess() \npath = ' + path);
					try {
						// let theArray = new Uint8Array(outString);
						util.logDebug ('Start writeAtomic...');
						let promise = OS.File.writeAtomic(path, outString, { encoding: "utf-8"});
						promise.then(
							function saveSuccess(byteCount) {
								if (isDebugDetail) debugger;
								let msg = util.getBundleString('alert.backup.success', 'Successfully saved {0} logins [{1} bytes] to file');
								msg = msg.replace('{0}',entryCount).replace('{1}',byteCount);
								util.logDebug (msg);
								util.alert(msg);
								QuickPasswords.throbber(false, managerWin);
							},
							function saveReject(fileError) {  // OS.File.Error
								let msg = util.getBundleString('alert.backup.failed', 'An error occured while trying to save the logins:\n') + fileError;
								util.logDebug (msg);
								util.alert(msg);
								QuickPasswords.throbber(false, managerWin);
							}
						);
					}
					catch (ex) {
						if (isDebugDetail) debugger;
						util.logException('QuickPasswords.Persist.store - backupSuccess()', ex);
						QuickPasswords.throbber(false, managerWin);
					}
					
				},
				function backupFailure(fileError) {
					if (isDebugDetail) debugger;
					util.logDebug ('backup chain error:' + fileError);
				}
			);
			
    }
    catch(ex) {
			if (isDebugDetail) debugger;
      util.logException('QuickPasswords.Persist.store()', ex);
			QuickPasswords.throbber(false);
    }
	} ,
	
	readStringFile: function readStringFile(path) {
    // To read content from file
    // const {TextDecoder,OS} = Components.utils.import("resource://gre/modules/osfile.jsm", {});
		
		const {OS} = (typeof ChromeUtils.import == "undefined") ?
			Components.utils.import("resource://gre/modules/osfile.jsm", {}) :
			ChromeUtils.import("resource://gre/modules/osfile.jsm", {});		
		
    let // decoder = new TextDecoder(),        // This decoder can be reused for several reads
        promise = OS.File.read(path, { encoding: "utf-8" }); // Read the complete file as an array - returns Uint8Array 
    return promise;
  } ,
  
	
	load: function load(path) {
    const util = QuickPasswords.Util,
		      prefs = QuickPasswords.Preferences;
    util.logDebug("QuickPasswords.Persist.load():\n" + path);
		
		if (util.Application == 'Postbox') {
			let txt = util.getBundleString('alert.backup.appnotsupported', 'Backup/Restore not supported in {0}');
			Services.prompt.alert(null, 'QuickPasswords.Persist.load',  + txt.replace('{0}',util.Application));			
			return;
		}
		
		let managerWin;
    try {
			// disable logins list
			let mediator = Components.classes["@mozilla.org/appshell/window-mediator;1"].getService(Components.interfaces.nsIWindowMediator);
			managerWin = mediator.getMostRecentWindow('Toolkit:PasswordManager');
			QuickPasswords.throbber(true, managerWin);
			const {OS} = (typeof ChromeUtils.import == "undefined") ?
				Components.utils.import("resource://gre/modules/osfile.jsm", {}) :
				ChromeUtils.import("resource://gre/modules/osfile.jsm", {});		
					
			let	promiseExists = OS.File.exists(path);
			promiseExists.then(
				function onSuccess(exists) {
					if (exists) {
						let promiseRead = QuickPasswords.Persist.readStringFile(path).then (
						  function onSuccess(data) {
								// restoration payload!
								QuickPasswords.Persist.Entries = data;
							},
							function onFailure(ex) {
								util.logDebug ('readStringFile failed!' + ex);
								if (ex.becauseNoSuchFile) {
									// File does not exist);
								}
								else {
									// Some other error
									Services.prompt.alert(null, 'QuickPasswords.Persist.load', 
									  util.getBundleString('alert.restore.readfailed',
									                       'Reading the passwords file failed') + '\n' + ex);
								}     
							}
						);
					}
					else {
						Services.prompt.alert(null, 'QuickPasswords.Persist.load', 
						  util.getBundleString('alert.restore.filemissing',
							                     "This file doesn't exist:") + '\n' + path);
					}
				},
				function onFailure(ex) {
					util.logDebug('exists failed.');
				}
			);
    }
    catch(ex) {
      util.logException('QuickPasswords.Persist.backupPasswords()', ex);
    }		
		finally {
			QuickPasswords.throbber(false, managerWin);
		}		
	} ,
	
	// toggle behavior to unencrypted with SHIFT key
	backupPasswords : function (evt) {
    const util = QuickPasswords.Util,
		      prefs = QuickPasswords.Preferences;
		let isEncrypted = prefs.getBoolPref('backup.pwd.encrypt');
		if (evt.shiftKey) isEncrypted = !isEncrypted;
		if (util.isDebug) debugger;
		if (!QuickPasswords.Manager.isMasterPasswordActive) {
			let msg = util.getBundleString('alert.backup.masterpassword', 'For the backup and restore function you need to set the master password.');
			if (util.confirm(msg))
				QuickPasswords.Manager.createMasterPassword();
			return;
		}
    util.logDebug("QuickPasswords.Persist.backupPasswords()...");
		this.encrypted = isEncrypted;  // store in this session.
		if (isEncrypted) {
			let txtEncryption1 = util.getBundleString('alert.backup.encryption.keystore',
			                                          'Passwords will be encrypted using the {0} keystore.')
																								.replace("{0}", util.Application),
					txtEncryption2 = util.getBundleString('alert.backup.encryption.key3db',
					                                      'It is recommended to backup your current {0} profile or at least the key3.db file in a separate location. You will also need this to migrate logins to a fresh installation.')
																								.replace("{0}", util.Application),
					msg = txtEncryption1.replace("{0}", util.Application) + "\n"
                +	txtEncryption2.replace("{0}", util.Application);
			
			// a bit of red tape
			if (!prefs.getBoolPref('backup.encrypt.dontRemind')
				  &&
				  !util.confirmCheck(msg, 
														 'backup.encrypt.dontRemind', 
														 'alert.backup.dontRemind', 
														 "Don't remind me again.")) 
					return;
		}
		else {
			let txtPlainText = util.getBundleString('alert.backup.encryption.plaintext', 'Are you sure you want to store passwords unencrypted? This is not recommended as it increases the chances of a security breach.');
			if (!util.confirm(txtPlainText)) 
				return;
		}
		QuickPasswords.Persist.getFileName('write', QuickPasswords.Persist.store);
    util.logDebug("QuickPasswords.Persist.backupPasswords() complete.");
	} ,
	
	restorePasswords : function (evt) {
		const util = QuickPasswords.Util,
		      prefs = QuickPasswords.Preferences,
					manager = QuickPasswords.Manager,
		      Cc = Components.classes,
          Ci = Components.interfaces;
		let cryptoService = Cc["@mozilla.org/login-manager/crypto/SDR;1"].getService(Ci.nsILoginManagerCrypto);	
		
		if (util.isDebug) debugger;
		if (!manager.isMasterPasswordActive) {
			let msg = util.getBundleString("alert.backup.masterpassword", "For the backup and restore function you need to set the master password.");
			if (util.confirm(msg))
				manager.createMasterPassword();
			return;
		}
		
		if (!cryptoService.isLoggedIn || cryptoService.uiBusy) {
			if (!manager.loginMaster(false)) {
				return;
			}
		}
		QuickPasswords.Persist.getFileName('read', QuickPasswords.Persist.load);
	}
};
