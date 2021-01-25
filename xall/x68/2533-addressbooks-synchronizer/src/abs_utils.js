var appstarttime=Math.round(Date.now()/1000);
var syncstate='';
var initialized=false;
var statusWin;
var usesPopup;
var pendingupload=false;

var gStatusbar=null;
var shortstatus;
var gLifeTime=0;//in seconds.
var cleanUp=null;
var gAbort=0;
var gForce=false;
var gMabs=null;
var gTempName;

var donecount=0;

var externalApp=null;
var externalAppHandler=null;

var statusWinTimer = Cc["@mozilla.org/timer;1"].createInstance(Ci.nsITimer);
var lifetimeTimer = Cc["@mozilla.org/timer;1"].createInstance(Ci.nsITimer);

let strings={
  "mab": '',
  "askoverwrite": '',
  "askmodified": '',
	"inprogress": '',
	"upload_title": '',
	"download_title": '',
	"addressbookssync_upload": '',
	"addressbookssync_download": '',
	"cancel_label": '',
	"failed": '',
	"skipped": '',
	"copied": '',
	"notcopied": '',
	"aborted": '',
	"ok": '',
	"loaded": '',
	"nofile": '',
	"goonline": '',
	"unexperr": '',
	"localreaderr": '',
	"illimap": '',
	"protnotavail": '',
	"timeout": '',
	"illcred": '',
	"hostnotfound": '',
	"proxynotfound": '',
	"proxyerr": '',
	"permdenied": '',
	"methodnotallowed": '',
	"notfound": '',
	"loadimap": '',
	"nomessage": '',
	"noattachment": '',
	"upgrade": '',
	"dontclose": '',
	"hiddenwinclosed": '',
	"hiddenwin": '',
	"hiddenwintitle": '',
};

Object.keys(strings).forEach(key=>{
  let msg=extension.localeData.localizeMessage(key);
  strings[key]=msg;
});

/*
 * save mabfile
 */
function saveMabFile(id, path) {
debug(id+' to '+path);
	let mabFileName=Services.prefs.getCharPref(id+'.filename');
	let mabFile = FileUtils.getFile("ProfD", [mabFileName]);
debug('got file '+mabFile.path);
	flushDB(mabFile);
	let file;
	if (!path) {
		file=filepickerfile;
debug('use filepickers path');
	} else {
    file = Cc["@mozilla.org/file/local;1"].
										createInstance(Ci.nsIFile);
    file.initWithPath(path);
debug('use given path');
	}
debug('saving to '+file.path);
	try {
		if (file.exists() && file.isFile()) {
			try {
				file.remove(false); //throws NS_ERROR_FILE_IS_LOCKED
			} catch(e) { debug('remove of '+file.path+' throws: '+e, e); }
		}
		mabFile.copyTo(file.parent, file.leafName);
			//creates directory, if not existing! retains lastModifiedTime !
			//But file creation time is that of the just deleted file!
debug('stored');
		return true;
	} catch(e) {
		debug('mabFile.copyTo throws: '+e, e);
		return false;
	}
}


/*
 * load mabfile
 */
async function loadMab(mabName, filename) {
debug(filename+' as '+mabName);
  let file = Cc["@mozilla.org/file/local;1"].
    createInstance(Ci.nsIFile);
  try{ file.initWithPath( filename ); }
  catch(e) { return 'nofile'; }
	if (!file.exists()) { return 'nofile'; }
  let dir=getAddressBook(mabName);
debug('got book '+dir);
  if (dir) {
debug('book exist, askOverwrite(1)');
    if (!askOverwrite(dir, true)) return null;
  } else {
debug('new book');
  }

	if (filename.match(/^(.*)\.mab$/)) {
debug('Try to convert '+filename+' to sqlite addressbook');
		file=await migrateBook(file, mabName, dir);
		if (!file) return 'notcopied';
	} else {
		let ret;
		if ((ret=replaceAddressBook(mabName, dir, file))) {
			file=null;
			return 'notcopied'; //+ret;
		}
	}
	return '';
}

/*
 * replace AddressBook
 */
function replaceAddressBook(mabName, dir, file)
{
debug('name='+mabName);
  if (!dir) {
		let uri=kDirectoryRoot+mabName;
debug('create '+mabName+' from '+uri);
		let pref=MailServices.ab.newAddressBook(mabName, uri, kJSDirectory);
		//pref=ldap_2.servers.test1
		//dir=getAddressBook(mabName);  //dir=nsIAbDirectory
    dir = MailServices.ab.getDirectoryFromId(pref);
debug('created new book '+dir.dirName+' '+dir.fileName+' '+dir.URI);
	}

  removeCardListObserver(); //remove observers for cards and lists

debug('clear addressbook');
  let ret=clearAddressBook(dir);
  if (ret) return ret;

debug('fill addressbook');
  ret=fillAddressBook(dir, file);
debug('fill addressbook returns: '+ret);

  if (ret) return ret;

debug('Replace done');

//TODO:  dir.lastModifiedDate=appstarttime; //is 0 == 'not modified'
	addCardListObserver();	// add observers for cards and lists
  return '';
}


/*
 * clear an address book
 */
function clearAddressBook(dir)
{
	function collectCardsToDelete(dir) {
      //also finds lists!
debug('collectCardsToDelete');
		let cards=new Array();
		for ( let card of dir.childCards ) {
//debug('card '+card.primaryEmail+' '+card.displayName);
      if (card.isMailList) {
debug('card '+card.displayName+' is a List uri='+card.mailListURI);
        MailServices.ab.deleteAddressBook(card.mailListURI);
      }
			cards.push(card);
		}
debug('cC2D:cards#='+cards.length);
		return cards;
	}

debug('entered');
	try {
		let cards=collectCardsToDelete(dir);
debug('main:cards#='+cards.length);
		dir.deleteCards(cards);  // delete the cards from the to-be synced addressbook
debug('cards deleted');
	} catch(e) {
debug('throws: '+e, e);
		return 'ollectCardsToDelete throws: '+e;
	}

	return '';
} // clearAddressBook

  /*
   * Fill Addressbook from mab file
   */
function fillAddressBook(dir, file)
{
	function cardsAndLists(db, ab) {
		//db: copy from   AddrBookDirectory
		//ab: copy to     nsIAbDirectory
//debug('  copy cards');
		let cards=db.childCards;
//debug('    copyCards: have enumerated the cards in tempDir');
		let count=0;
		while (cards.hasMoreElements()) {
			let card = cards.getNext();
			if (!card.isMailList) { // only non-maillists
				ab.addCard(card);
				count++;
//debug('insert card '+card.primaryEmail);
//debug('.');
			}
		}
//debug('done, copied '+count+' cards');
/*
		if (count==0) { //no cards => corrupt addressbook
debug('rab_ve: Probably corrupt addressbook', true);
//        return 'rab_ve: Probably corrupt addressbook';
			throw(0);
		}
*/

//debug('  recreate maillists');
		try {
			let lists=db.childNodes;
			while (lists.hasMoreElements()) {
				let list=lists.getNext();
//debug('add list: '+list.dirName);
				let newlist=ab.addMailList(list);
				let cards=list.childCards;
				while (cards.hasMoreElements()) {
					let card=cards.getNext();
					newlist.addCard(card);
//debug('    card: '+card.displayName);
				}
			}
		} catch(e) {
debug('recreate maillists throws: '+e, e);
			return 'rab_ve: create cards for lists: '+e;
		}
		return '';
	}	//end of cardsAndLists

debug('copy file to profD');
//source file has to be in ProfD
	let tempbookname;
	try {
		tempbookname=dir.dirPrefId.replace('ldap_2.servers.','')+'_abstemp';   //'abstemp';
		let tempName=tempbookname+'.sqlite';
		let tdir=Services.dirsvc.get('ProfD',  Ci.nsIFile);
		let tempFile=tdir.clone();
		tempFile.appendRelativePath(tempName);
		if (tempFile.exists() && tempFile.isFile()) {
			/*await*/ closeConnectionTo(tempFile);  //just in case close sqlite db
			tempFile.remove(false);
		}
debug('use tempfile: copy '+file.path+' to '+tdir.path+' '+tempName);
		file.copyTo( tdir, tempName );  //this copies the permissions too
		tempFile.permissions=/*0666*/0x1b6; //be sure, file is writable and removable
		file=tempFile;

debug('open the addressbook database file');
		// open the addressbook database file
		var db;
		db = new AddrBookDirectory();
		let uri='jsaddrbook://'+tempName;
		Services.prefs.setCharPref("ldap_2.servers."+tempbookname+".filename", tempName);
		db.init(uri);
debug('opened '+file.path+' -> '+db);
	} catch(e) {
debug('open mabfile: '+file.path+' '+file.permissions+' throws: '+e, e);
		return 'rab_ve: open mabfile: '+file.path+' '+file.permissions+' '+e;
	}

	try {
		cardsAndLists(db, dir);
	} catch(e) {
		if (e===0) return "Corrupt addressbook";
		else {
debug('cardsAndLists throws: '+e, e);
			return 'rab_ve: cardsAndLists: '+e;
		}
	}

	const closeDB = async (file, tempbookname) => {
debug('async close db '+file.path);
		await closeConnectionTo(file);
		Services.prefs.clearUserPref("ldap_2.servers."+tempbookname+".filename");
debug('async remove tempfile '+file.path);
		try { file.remove(false); }
		catch(e) { debug('remove of tempfile '+file.path+' throws: '+e, e); }
	}
	closeDB(file, tempbookname);
	return '';
} // fillAddressBook

  /*
   *  This is, where every up-/download starts!
   */
function showPopup(direction, singlebook, type, force) {
	//singlebook: an id (ldap_2.servers.book), a mabName or ''
	//type: start, final, auto, manual
	//force: if true, upload mabs, even if not changed
debug('started with '+direction+' "'+singlebook+'" '+type+' '+force);

	if (prefs['synctype']=='none') return;
	if (direction=='upload' && prefs['noupload']) return;
	if (!singlebook && syncedAddressbooks((direction=='download')?'down':'up',null).length==0) {
debug('nothing to do');
		if (exiting) theHiddenWin(false);
		return;  //nothing to do
	}

debug('syncstate='+syncstate+' type='+type);
	if (syncstate!='' && !pendingupload) {  // we are already doing an up-/download
debug(syncstate+' in progress');
		if (type=='manual')
			Services.prompt.alert(null, 'AddressbooksSync', strings['inprogress']);
		return;
	}

	usesPopup=
		type=='final' ||     //always at propram exit
		(type=='start' && !prefs['hidepopups'] && !prefs['hideallpopups']) ||
		(type!='final' && type!='start' && !prefs['hideallpopups']);

debug('usesPopup='+usesPopup);
  syncstate=direction;
	gAbort=0;
	if (direction=='upload' && pendingupload) {
debug('doing pending upload');
		upload(singlebook, force);
		return;
	}
	if (prefs['synctype']=='imap' && direction=='upload' && exiting=='close' && !hiddenWin) {
		Services.prompt.alert(null, 'Addressbooks Synchronizer', strings['hiddenwinclosed']);
		return;
	}	
	if (!usesPopup) {
debug('perform without popup');
			if (direction=='download') download(singlebook, force);
			else                       upload(singlebook, force);
//		}
	} else {	//usesPopup
/*
		let args = Cc["@mozilla.org/array;1"]
										.createInstance(Ci.nsIMutableArray);
		let s=Cc["@mozilla.org/supports-string;1"]
				.createInstance(Ci.nsISupportsString);
		s.data=strings[direction+'_title'];
		args.appendElement(s, false);
		let f=Cc["@mozilla.org/supports-string;1"]
				.createInstance(Ci.nsISupportsString);
		f.data=strings['cancel_label'];
		args.appendElement(f, false);
*/
		let off=(exiting && prefs['hideallpopups'])?',left=-10000':'';
		statusWin=Services.ww.openWindow(null, statusURI,
			'_blank', 'chrome,resizable,titlebar=yes'+off, /*args*/null);
debug('opened '+statusWin+' '+statusWin.document);
		//we have a document but it doesn't contains elements

//TODO: probably listen for 'dom-window-destroyed' (see implementation.js)
		statusWinTimer.initWithCallback(()=>{
			statusWin.document.title=strings[direction+'_title'];
			statusWin.document.getElementById('cancel').textContent=strings['cancel_label'];

			let ta=statusWin.document.getElementById('status');	//the textarea
			if (!ta) {
debug('waiting for window to load');
			} else {
debug('initialize popup window '+statusWin.location);
				statusWinTimer.cancel();
				let ta=statusWin.document.getElementById('status');	//the textarea
				ta.textContent='Hallo!';

				let b=statusWin.document.getElementsByTagName('button');	//cancel button
				b[0].addEventListener("click", ()=>{
debug('cancel clicked'); 
					if (direction=='upload') cancelUpload();
					else cancelDownload();
					//gAbort=1;
				});
				statusWin.addEventListener("unload", ()=>{
debug('statusWin unloaded');
					if (direction=='upload') cancelUpload();
					else cancelDownload();
					//gAbort=1;
				});
				if (direction=='upload') upload(singlebook, force);
				else download(singlebook, force);
			}
		}, 500, Ci.nsITimer.TYPE_REPEATING_SLACK);
	}
}

/*
 * flush DB to disk and close
 */
function flushDB(file/*a nsIFile*/, callback) {
	try {
debug('file='+file.path);
		let connection = Services.storage.openDatabase(file);
		connection.executeSimpleSQL("PRAGMA wal_checkpoint");
		new Promise(resolve => {
			connection.asyncClose({
				complete() {
debug('DB '+file.path+' closed');
					if (callback) {
debug('calling callback');
						callback();
					}
					resolve();
				},
			});
		});
	} catch(e) {
		debug('flushDB throws: '+e, e);
	}
debug('returning');
}	// function flushDB

/*
 * return address book data structure associated with description (aka dirName)
 * for search for preference, use 'dir = MailServices.ab.getDirectoryFromId(pref);'
 * TODO: might fail, if called with a mabName and the mabName is in a foreign language!
 *        (see mails with Ivan Kolchagov, to reproduce: change personal address book to bulgarien name)
 */
function getAddressBook(name)
{
//debug(name);
	for (let dir of MailServices.ab.directories) {
//debug('compare "'+name+'" to "'+dir.dirPrefId+'" and "'+dir.fileName+'"');
		if (dir.dirName==name)
			return dir;
	}
	return null;
}	// function getAddressBook

/*
 *	ask for overwrite addressbook
*			returns true to overwrite
 */
function askOverwrite(dir, alwaysask) {
debug(dir.dirName+' alwaysask='+alwaysask);
  var dummy=new Object;
	let name=dir.dirName;
  if (alwaysask) {
    return Services.prompt.confirmEx(null, 'Load '+name,					//returns index of button pressed
        strings['mab']+' "'+name+'":\n'+strings['askoverwrite'],
//          (BUTTON_POS_0) * (BUTTON_TITLE_YES) + (BUTTON_POS_1) * (BUTTON_TITLE_NO) + BUTTON_POS_0_DEFAULT
            (1)            * (3)                + (256)          * (4)               + 0,
            null, null, null, null, dummy
        )==0
  }
  if (appstarttime<getLastModified(dir) &&
      (	prefs['downloadpolicy']=='keep' ||
            prefs['downloadpolicy']=='ask' &&
            Services.prompt.confirmEx(null, 'Download '+name,			//returns index of button pressed
                strings['mab']+' "'+name+'":\n'+strings['askmodified'],
//                  (BUTTON_POS_0) * (BUTTON_TITLE_YES) + (BUTTON_POS_1) * (BUTTON_TITLE_NO) + BUTTON_POS_0_DEFAULT
                    (1)            * (3)                + (256)          * (4)               + 0,
                    null, null, null, null, dummy
                )!=0
       )) {
    return false; //skip
  } else
    return true;  //overwrite
}	//function askOverwrite

/*
 * migrate an old .mab addressbook to .sqlite
 */
async function migrateBook(oldFile, mabname, odir) {
debug(oldFile.path+' as '+mabname);
	let dir=odir;
	if (dir) {
		let ret=clearAddressBook(dir);
		if (ret) return null;
	} else {
		let pref=MailServices.ab.newAddressBook(mabname, '', kJSDirectory);
		dir = MailServices.ab.getDirectoryFromId(pref);
	}
	let uri=dir.URI;
	let newBook = new AddrBookDirectory();
debug('newBook: '+newBook);
	try {
debug('newBook.init: '+uri);
		newBook.init(uri);	//throws error, if file already exists
	} catch(e) {
		debug('newBook.init throws: '+e, e);
		return null;
	}

debug('database');
	let database = Cc["@mozilla.org/addressbook/carddatabase;1"]
			.createInstance(Ci.nsIAddrDatabase);
	database.dbPath = oldFile;
	database.openMDB(oldFile, false);
debug('opened');

  let directory = Cc["@mozilla.org/addressbook/directoryproperty;1"]
																	.createInstance(Ci.nsIAbDirectory);

	let cardMap = new Map();
	for (let card of database.enumerateCards(directory)) {
		if (!card.isMailList) {
			cardMap.set(card.localId, card);
		}
	}
	if (cardMap.size > 0) {
		await newBook._bulkAddCards(cardMap.values());

		for (let card of database.enumerateCards(directory)) {
			if (card.isMailList) {
				let mailList = Cc[
					"@mozilla.org/addressbook/directoryproperty;1"
				].createInstance(Ci.nsIAbDirectory);
				mailList.isMailList = true;
				mailList.dirName = card.displayName;
				mailList.listNickName = card.getProperty("NickName", "");
				mailList.description = card.getProperty("Notes", "");
				mailList = newBook.addMailList(mailList);

				directory.dbRowID = card.localId;
				for (let listCard of database.enumerateListAddresses(directory)) {
					listCard.QueryInterface(Ci.nsIAbCard);
					if (cardMap.has(listCard.localId)) {
						mailList.addCard(cardMap.get(listCard.localId));
					}
				}
			}
		}
	}

	database.closeMDB(false);
	database.forceClosed();

  Services.obs.notifyObservers(null, "addrbook-reload");
//(new) book is shown in addressbookUI but empty, switch to another book and back fixes it
	//refreshAddressbook();	//this has no visible effect
	return oldFile;
}	//function migrateBook

/*
 * returns list of mab to be synced
 */
function syncedAddressbooks(direction, singleBook) {
    //direction: up, down
		//singlebook: an id, a mabName or ''
debug(direction+' "'+singleBook+'"');
	let mabs=new Object();
	let dirs=new Array();

	let found=false;
	for (let dir of MailServices.ab.directories) {
		if (dir.dirType!=kPABDirectory) continue;    // ignore nonMAB/nonSQLITE
			//  LDAP=0, HTML=1, MAB=2, MAPI(Outlook,OSX)=3,JS=101
		let sync=false;
		if (direction=='all') {
			sync=true
		} else if (!singleBook) {
			let prefName = dir.dirPrefId;
			sync = prefs[prefName+'.'+direction];
		} else if (dir.dirPrefId==singleBook || dir.dirName==singleBook) {	//e.g. 'history' or 'Gesammelte Adressen'
			sync=true;
		}
debug('got dir '+dir.dirName+' sync='+sync);
		if (sync) {
			found=true;
			let file = dir.fileName;
			if (mabs[file])
				// this ist a problem with the preferences, defining a book more than once!
				debug('double addressbook '+dir.description+' '+file+')');
			else {
				mabs[file]=true;
				dirs.push(dir);
			}
		}
	} // while
	if (!found && direction=='down' && singleBook) { //its a new addressbook
		dirs.push(singleBook);
	}
	return dirs;
}	//function syncedAddressbooks

/*
 * refresh addressbook window (seems to have no effect)
 */
function refreshAddressbook() {
  // refresh addressbook view
  let windowsEnum = Services.wm.getEnumerator("mail:addressbook");
  while (windowsEnum.hasMoreElements()) {
debug('Found Addressbook Window');
    let w=windowsEnum.getNext();
    let abTree=w.document.getElementById("dirTree");
    if (abTree) { //isn't there a better way?
      try {
/*
        var oi=abTree.view.selection.currentIndex;
        var ni=oi?oi-1:abTree.view.rowCount-1;
        //from abCommon.js
        abTree.view.selection.select(ni); //might throw TypeError, if addressbook is open
        w.ChangeDirectoryByURI(w.GetSelectedDirectory());
        w.gAbResultsTree.focus();
        abTree.view.selection.select(oi);
        w.ChangeDirectoryByURI(w.GetSelectedDirectory());
        w.gAbResultsTree.focus();
*/
        //from chrome\messenger\content\messenger\addressbook\addressbook.js
        let kPersistCollapseMapStorage = "directoryTree.json";
        w.gDirectoryTreeView.init(w.gDirTree, kPersistCollapseMapStorage);
      } catch(e) {
				debug('refreshAddressbook throws: '+e, e);
			}
    } else {
debug('no abTree');
    }
  }
}	//function refreshAddressbook

/*
 * statustxt (for status window)
 */
var lastnewline=0;
var statusText;
function statustxt(aStatus, newline, doalert, longText, addText)
  //newline: 1: start a new line, 2: end a line, 3:both, 0: append to line
  //          -1: Start of new sequence, -2 End of sequence
{
  if (doalert) gLifeTime=5; //show window a little bit longer
                            //this should really be done somehwere else ;-)

  if (newline==-2 && lastnewline==-2) return;

  let now;
	let appStart;
  if (newline==-1) {
    now = timeString();
    appStart = timeString(appstarttime*1000);
    appStart = 'Thunderbird start '+appStart;
    statusText=now+'\n';
    statusText+=appStart+'\n';
  }
  statusText+=longText?longText:aStatus;
  if (addText) statusText+=' ('+addText+') ';
  if (newline&2 || newline<0) statusText+="\n";
	if (newline==1 && lastnewline==-2) statusText+="\n";

  // popup menu
  if (usesPopup) {   //false, if upload on TB exiting
    var status=statusWin.document.getElementById("status");
    if (status) {
      if (newline==-1) status.textContent=(longText?longText:aStatus)+'\n';
      else if (newline==-2) status.textContent+=(longText?longText:aStatus)+'\n';
      else if (newline>=0) {
        status.textContent+=(longText?longText:aStatus);
        if (newline&2) status.textContent += "\n";
        status.scrollTop=status.scrollHeight;
      }
    }
  }

	
	if (newline==-1) shortstatus=aStatus+'  ';
	if (newline==-2) shortstatus+='  '+aStatus;
	if (newline>=0) {
		shortstatus+=aStatus;
		if (newline&2) shortstatus+='  ';
	}
	if (newline==1 && lastnewline==-2) shortstatus=aStatus+'  ';

	if (!gStatusbar) {
		let w=Services.wm.getMostRecentWindow("mail:3pane");
		if (w) gStatusbar=w.document.getElementById("statusText");
debug('have statusbar='+gStatusbar);
	}
//  if (gStatusbar) gStatusbar.value='ABS: '+shortstatus;

/*
  if (newline==-1) {
		let activityMgr = Cc["@mozilla.org/activity-manager;1"].
						getService(Ci.nsIActivityManager);
		let nsActProcess = Components.Constructor(
			"@mozilla.org/activity-process;1",
			"nsIActivityProcess",
			"init"
		);
		let process = new nsActProcess('ABS process', null);
		process.iconClass = "syncMail";
		//process.addSubject(folder);
		// group processes under 'ABS'
		process.contextType = "ABS";
		process.contextDisplayText = 'ABS Process displaytext';
		//process.contextObj = folder.server;
debug('process='+process);
    activityMgr.addActivity(process);
	}
*/
  if (newline==-2) {
    console.log('AddressbooksSynchronizer '+version+': '+statusText, true);

		let activityMgr = Cc["@mozilla.org/activity-manager;1"].
						getService(Ci.nsIActivityManager);
//TODO: erst alten Event löschen?
//    activityMgr.removeActivity(activityId);

		let nsActEvent = Components.Constructor(	//TDOD: could be a global
			"@mozilla.org/activity-event;1",
			"nsIActivityEvent",
			"init"
		);
		let ae=new nsActEvent(shortstatus,	//displayText (header), also shown in statusBar!!
               null,												//initiator (nsIVariant)
               'AddressbooksSynchronizer',	//statusText (info)
               Date.now()-3600000,					// start time (wird nicht gezeigt)
               Date.now()										// completion time
          );
// see  modules/activity/moveCopy.jsm
    ae.iconClass = "syncMail";	//activity.css image.deleteMail{ist-style-image: url(chrome://messenger/skin/activity/syncMailIcon.png);}
		ae.contextType='ABS';
    //ae.contextDisplayText = 'ABS context';
    //ae.contextObj = process.contextObj;
    //ae.addSubject(...);
 		let activityId=activityMgr.addActivity(ae);
debug('activity='+activityId);
	}

  if (/*exiting && */newline==-2) {
debug('exiting write to log');
    var fline='--------------------\nAddressbooksSynchronizer '+version+': '+statusText;
    var flags=0x10|0x08|0x02;
          // 0x02=PR_WRONLY, 0x10=PR_APPEND, 0x08=PR_CREATE_FILE
    try {
			let logFile=FileUtils.getFile("TmpD", ['AddressbookSynchronizer.log']);
			var strm = Cc["@mozilla.org/network/file-output-stream;1"].
				createInstance(Ci.nsIFileOutputStream);
			var os = Cc["@mozilla.org/intl/converter-output-stream;1"].
				createInstance(Ci.nsIConverterOutputStream);
			strm.QueryInterface(Ci.nsIOutputStream);
			strm.QueryInterface(Ci.nsISeekableStream);
			strm.init( logFile, flags, 0x180, 0 );	//0600
			os.init(strm, 'UTF-8', 0, 0x0000);
			os.writeString(fline);
			os.close();
   } catch(e) {
      debug('File write throws: '+e, e);
    }
  }

  lastnewline=newline;
  if (doalert)
    Services.prompt.alert(null, 'Addressbooks Syncronizer',	statusText);
}

/*
 * killMe
 */
function killMe()
{
  //gAbort=0: normales ende
  //gAbort=1: aborted
  //gAbort=2: killed
debug('entered gAbort='+gAbort);

  if (cleanUp) {
    cleanUp();		// is uploadDone() or downloadDone()
    cleanUp=null;
  }
	if (gTempName && gTempName.length && !gAbort) {
    if (!deleteTempFile()) {
debug('lifetimeTimer used wg. deleteTempFile');
			lifetimeTimer.initWithCallback(killMe, 1000, Ci.nsITimer.TYPE_ONE_SHOT);
      return;
    }
  }

debug('gAbort='+gAbort+' syncstate='+syncstate+' gLifeTime='+gLifeTime);
  if (gAbort==1)
    statustxt(strings['aborted'], -2, false);
  else //if (!syncstate) //kommt sonst bei imap 2x (wenn compacting asynchron)
    statustxt(strings['ok'], -2, false);

//  if(gLifeTime>0 && usesPopup && gAbort<2) {
  if(gLifeTime>0 && gAbort<2) {
debug('lifetimeTimer used');
		lifetimeTimer.initWithCallback(killMe, gLifeTime*1000, Ci.nsITimer.TYPE_ONE_SHOT);
    gLifeTime=0;
    return;
  }

/* löschen der Statuszeile eventuell timer gesteuert! */
  if (gStatusbar && !pendingupload) {
    gStatusbar.value='';
		gStatusbar=null;
  }

	if (exiting) {
debug('exiting='+exiting+' hiddenWin='+hiddenWin);
		if (hiddenWin) {
			let hw=hiddenWin;
			hiddenWin=null;
			hw.close();
		}
		statusWin.close();
		if (exiting=='quit') {
debug('exiting(quit), call quit');
			let we = Services.wm.getEnumerator(null);
				//only returns chrome://messenger/content/messenger.xhtml (mail:3pane)
			if (we.hasMoreElements()) {
				let w=we.getNext();
				w.goQuitApplication();
			}
		}
	} else if (pendingupload) {		//if timed upload after timed download
debug('start pending upload');
    showPopup('upload', null, 'auto', false);
  } else {
//	if (gAbort==2)  //test
		if (usesPopup) statusWin.close();
		syncstate=''; //Up-/Download ready
	}
}

/*
 * timestring
 */
function timeString(time) { //time in milliseconds or Date() object
  if (typeof time=="object") time=time.getTime();
//  var d=time?new Date(time):new Date();
  //var s=d.toLocaleString();
  //var s=d.toLocaleFormat('%d.%b.%Y %H:%M:%S');  //deprecated
  var options = {
    year: 'numeric', month: 'short', day: 'numeric',
    hour: 'numeric', minute: 'numeric', second: 'numeric',
    hour12: false
  };
  var s='unknown';
  try {
    s=new Intl.DateTimeFormat(undefined, options).format(time);	//undefined for current locale
  } catch(e) {  }
  return s;
}

/*
 * get lastmodifieddate of dir
 */
function getLastModified(dir) {  //dir=nsIAbDirectory
  if (!dir) return 0;

  let lastModifiedDate=dir.lastModifiedDate;  //set via abs_gAbSessionListener
debug('last modified date of dir '+dir.dirName+': '+lastModifiedDate);
//TODO: via cards?? no, LastModifiedDate is not updated on edit of cards
/* check cards for lastModifiedlime is
 * no longer necessary, since lastModifiedDate always set on dir via Listener
*/
  return lastModifiedDate;
}

/*
 * delete temp file
 */
function deleteTempFile() {
debug('entered');
  let deleted=true;
  gTempName.forEach((filename, index)=>{
    if (!filename) return;  //already deleted
    let tmpFile=FileUtils.File(filename);
debug('delete '+tmpFile.path);
    if (!tmpFile.exists() || !tmpFile.isFile()) return true;
    try {
      tmpFile.remove(false);
debug('file deleted');
      gTempName[index]='';
    } catch(e) {
debug('deleteTempFile throws: '+e, e);
      switch (e.result) {
        case Components.results.NS_ERROR_FILE_ACCESS_DENIED:
        //  after call to replaceAddressBook, an immediate remove
        //  throws an 'access denied'
        // killMe() will try again!
          deleted=false;
          break;
        case Components.results.NS_ERROR_FILE_NOT_FOUND:
          gTempName[index]='';
          break;
        default:
          Services.prompt.alert(null, 'AddressbooksSync', 'deleteTempFile: '+e.message);
          debug('deleteTempFile: '+e.message, e);
          deleted=false;
          break;
      }
    }
  });
  return deleted;
}

/*
 * check if TB is offline
 */
function checkOffline() {
  if (Services.io.offline) {
    let goOnline =  Services.prompt.confirm(null/*window*/, 
        'AddressbooksSynchronizer', strings['goonline']);
    if (goOnline) {
      let offlineManager = Cc["@mozilla.org/messenger/offline-manager;1"]                 
                        .getService(Ci.nsIMsgOfflineManager);
      offlineManager.goOnline(false /* sendUnsentMessages */,
                              false /* playbackOfflineImapOperations */,
                              null/*w.msgWindow*/);
    } else {
      gAbort=2;
      killMe();
      return false;
    }
  }
  return true;
}

/*
 * return URI for remote syncronization
 */
function getSyncURI() {
  let syncprotocol = prefs['protocol'];
  let synchost = prefs['host'];
  let syncuser = prefs['user'];
  let syncpath = prefs['path'];
  if (!synchost && !syncuser || !syncprotocol) return '';
debug('call abspassword');
  let syncpassword = abspassword(syncprotocol, synchost, syncuser, '');
	
  let userpass=encodeURIComponent(syncuser) +(syncpassword?":"+encodeURIComponent(syncpassword):"");
  if (userpass) userpass += "@";
  let uri=syncprotocol + "://" + userpass + synchost + syncpath+'/';
  return uri;
}

/*
 * get or set password
 */
function abspassword(protocol, host, user, pwd) {
	if (!user || !protocol || !host) return '';
	let hostname = protocol+'://'+host;
	let httprealm = 'AddressbooksSynchronizer';

debug('entered');
	let loginManager = Services.logins;

	try {
debug('call findLogins');
//Exception... "User canceled master password entry"  nsresult: "0x80004004 (NS_ERROR_ABORT)"
//wait for notifyObservers("passwordmgr-crypto-login");
debug('isLoggedIn: '+loginManager.isLoggedIn);
		let logins = loginManager.findLogins(hostname, null, httprealm);
debug('findLogins returnes '+logins.length+' entries'); //+JSON.stringify(logins));	//shows password
		for (let i = 0; i < logins.length; i++) {
			if (logins[i].username == user) {
				if (!pwd) return logins[i].password;
				else loginManager.removeLogin(logins[i]);
			}
		}
		if (pwd) {
			var loginInfo = Cc["@mozilla.org/login-manager/loginInfo;1"]
									 .createInstance(Ci.nsILoginInfo);
			loginInfo.init(hostname, null, httprealm, user, pwd, "", "");
			loginManager.addLogin(loginInfo);
		}
	} catch(e) {
		debug('abspassword throws: '+e, e);
	}
	return pwd;
}

/*
 * error numver to string
 */
function errorstr(aError) {
  let error;

  let intErr=0;	//next free: 20
  if (typeof aError == 'string') {
    let err=Number(aError);
    if (!isNaN(err)) aError=err;
  }
  //Errorcodes:
  //    xpcom/base/nsError.h
  //    netwerk/base/public/nsNetError.h
  switch(aError){
  // internal errors
    case -1:
      intErr=1;
      error=strings['unexperr']; // 'unexpected initialization error';
      break;
    case -2:
      intErr=2;
      error=strings['localreaderr']; // 'local mab file read error';  //access denied (also gives unhandled exception), does not exist
      break;
    case -3:
      intErr=3;
      error=strings['illimap'];
      break;
  //Thunderbird network error, see netwerk/base/public/nsNetError.h
    case 0x804b000d:
      //NS_ERROR_CONNECTION_REFUSED 13
      //The connection attempt failed, for example, because no server was listening
      //at specified host:port.
      intErr=4;
      error=strings['protnotavail']; // 'protocol not available';
      break;
    case 0x804b000e:
        //NS_ERROR_NET_TIMEOUT 14
        //The connection was lost due to a timeout error.
      intErr=12;
      error=strings['timeout']; // 'timeout';
      break;
    case 0x804b0011:
      //NS_ERROR_NO_CONTENT 17
      intErr=16;
      error='No content';
        // used, when Firefox is set as 'network.protocol-handler.app.ftp'
        // for FTP. The addressbook is shown in Firefox!
      break;
    case 0x804b0012:
      //NS_ERROR_UNKNOWN_PROTOCOL 18
      // The URI scheme corresponds to an unknown protocol handler.
      intErr=17;
      error='Unknown protocol handler';
      // happens after removing application-handler after NS_ERROR_NO_CONTENT
      break;
    case 0x804b0014:
      //NS_ERROR_NET_RESET 20
      intErr=19;
      error="Network reset"; // i.e. Service not available
      break;
    case 0x804b0015:
      //NS_ERROR_FTP_LOGIN 21
      intErr=10;
      error=strings['illcred']; // illegal credentials';
      break;
    case 0x804b0016:
      //NS_ERROR_FTP_CWD 22
      intErr=15;
      error=strings['nofile'];
      break;
//NS_ERROR_FTP_PASV 23
//NS_ERROR_FTP_PWD 24
//NS_ERROR_FTP_LIST 25
    case 0x804b001e:
      //NS_ERROR_UNKNOWN_HOST 30
      intErr=5;
      error=strings['hostnotfound']; // 'host not found';
      break;
    case 0x804b002a:
      //NS_ERROR_UNKNOWN_PROXY_HOST 42
      intErr=13;
      error=strings['proxynotfound']; // 'proxy not found';
      break;
    case 0x804b0048:
      //NS_ERROR_PROXY_CONNECTION_REFUSED 72
      intErr=14;
      error=strings['proxyerr']; // 'proxy error';
      break;
  //external errors (server error, windows error)
    case 0x80004002:
      /* NS_ERROR_NO_INTERFACE: Returned when a given interface is not supported. */
      intErr=18;
      error='External application handler set';
        //This happens on ftp upload when an external handler is set
      break;
    case 0x80004005:
      /* NS_ERROR_FAILURE: Returned when a function fails */
      intErr=6;
      error=strings['permdenied']; // früher 'fileunavail', file unavailable
        //??? (with FTP: Error 550: File unavailable (e.g., file not found, no access).
        //(with IMAP: wenn der alte Upload mit 'CopyFileMessage' verwendet wird)
      break;
    case 405:
      intErr=7;
      error=strings['methodnotallowed']; // method not allowed';  //method is something like PUT,POST or GET
      break;
    case 404:
      intErr=8;
      error=strings['notfound']; // not found';
      break;
    case 403:
      intErr=9;
      error=strings['permdenied']; // permission denied';
      break;
    case 401:
      intErr=11;
      error=strings['illcred']; // illegal credentials';
      break;
    case 0:
    case 201:
    case 204:
      error=strings['ok'];
      break;
    default:
      let sError;
      if (aError&0xffff0000) {
        if ((aError>>>16)==0x804b)  //TB Netzwerk errors, see xpcom\base\ErrorList.py
											//or https://searchfox.org/mozilla-central/source/__GENERATED__/xpcom/base/ErrorList.h
          sError='TB-'+(aError&0xffff).toString(10);
        else
          sError='0x'+aError.toString(16);
      } else
        sError=aError;
      error='Error '+sError;
      break;
  }
  if (intErr) error+=' ('+intErr+')';
  return error;
}

/*
 *  Read a mab file and return the data
 */
function readMabData(mabFile) {
	if (!mabFile.exists()) return '';

	let fs = Cc['@mozilla.org/network/file-input-stream;1']
					.createInstance(Ci.nsIFileInputStream);
/*
	let ss = Cc['@mozilla.org/scriptableinputstream;1']
					.createInstance(Ci.nsIScriptableInputStream);
*/
	let str='';
	try{
		fs.init(mabFile, 0x01, 0, false);
//      ss.init(fs);
//      str = ss.read(-1);
//      ss.close();
		let bytes;
		while((bytes=fs.available()))
			str += NetUtil.readInputStreamToString(fs, bytes);
			//str += NetUtil.readInputStream(fs, 4096); //this gets an ArrayBuffer, not a string!
		fs.close();
	} catch(e){ debug('throws: '+e, e); }
	return str;
}

/*
 *  Save Data to a mab File
 */
function writeMabData(mabFile, abData, length) {
	try {
		if (mabFile.exists() && mabFile.isFile()) mabFile.remove(false);
		const BinaryOutputStream = Components.Constructor(
			"@mozilla.org/binaryoutputstream;1",
			"nsIBinaryOutputStream",
			"setOutputStream"
		);
		var strm = Cc["@mozilla.org/network/file-output-stream;1"].
			createInstance(Ci.nsIFileOutputStream);
		strm.QueryInterface(Ci.nsIOutputStream);
		//strm.QueryInterface(Ci.nsISeekableStream);
		strm.init( mabFile, 0x20|0x02|0x08, /*0600*/0x180, 0 );
			// 0x02=PR_WRONLY, 0x08=PR_CREATE_FILE, 0x20=PR_TRUNCATE
//      strm.write( abData, abData.length );  //only writes string data (not binary!)
		let bis = new BinaryOutputStream(strm);
		bis.writeBytes(abData, length);
		strm.flush();
		strm.close();
	} catch(e) {
			debug('File write '+mabFile.target+' throws: '+e, e);
			return null;
	}
	return mabFile;
}

/*
 * generate external filename for address book
 */
function getExternalFilename(dir) {
	let externalFilename;
	let pref=prefs[dir.dirPrefId+'.filename'];
	if (typeof pref==='string')
		externalFilename = decodeURIComponent(escape(pref));
	else {
		//else generate filename from addressbook name
		let uri = dir.URI;
		if (uri!=kPersonalAddressbookURI && uri!=kCollectedAddressbookURI)
			externalFilename = dir.dirName+'.sqlite';
		else
			externalFilename = '_tb_'+dir.fileName;
	}
debug('for '+dir.dirName+' returns '+externalFilename);
	return externalFilename;
}

function getOptionsDoc() {
	let w=Services.wm.getMostRecentWindow("mail:3pane");
	let tabmail=w.document.getElementById("tabmail");
debug('tabmail='+tabmail);
	if (!tabmail) return null;
	for (let nativeTabInfo of tabmail.tabInfo) {
debug('	tab='+nativeTabInfo);
		if (nativeTabInfo.browser && nativeTabInfo.browser.contentDocument.location==optionsURI)
			return nativeTabInfo.browser.contentDocument;
	}
	return null;
}

function initialize() {
debug('entered');
	if (initialized) return;
	initialized=true;
	startTimer();
	addCardListObserver();	// add observers for cards and lists
	if (prefs['synctype'] && prefs['autodownload']) {
		downloadOnStart();
	}
	if (openHiddenWin) {
debug('main window available, open hiddenWin if necessary');
		theHiddenWin(prefs['autoupload'] && prefs['synctype']=='imap');
	}
}
function finalize(type) {
	exiting=type;
debug('=================== Exiting type='+type);	//type=quit or close
	usesPopup=true;
	removeCardListObserver();  // remove observers for cards and lists

  let windowsEnum = Services.wm.getEnumerator(null);
  while (windowsEnum.hasMoreElements()) {
    let w=windowsEnum.getNext();
debug('found window '+w.location);
	}

	if (prefs['autoupload']) {
debug('call upload on close');
      //definitely needs a window for remote/imap!
		showPopup('upload', null, 'final', false);
		return true;	//cancel quit
	} else
		return false;
}

/*
var loginObserver = {
	QueryInterface: ChromeUtils.generateQI([
		"nsIObserver",
		"nsISupportsWeakReference",
	]),
  observe: function(aSubject, aTopic, aData) {
debug('loginObserver called aSubject='+aSubject+' aTopic='+aTopic+' aData='+aData);
		Services.obs.removeObserver(this, "passwordmgr-crypto-login");
		//showPopup('download', null, 'start', false);
	}
}
*/
function downloadOnStart() {
debug('call download on start');

//debug('add loginObserver');
//	Services.obs.addObserver(loginObserver, "passwordmgr-crypto-login");	//does not work :-( 

	if (!Services.logins.isLoggedIn					 //masterpassword not yet given
		|| prefs['synctype']=='imap' && !connect() && !gAbort
			) {
if (!Services.logins.isLoggedIn) debug('masterpassword not yet given');
else debug('Not loggedin to imap server');
		lifetimeTimer.initWithCallback(()=>{downloadOnStart();},
								5000, Ci.nsITimer.TYPE_ONE_SHOT);
		return;
	}
	showPopup('download', null, 'start', false);
}

var loadTimer = Cc["@mozilla.org/timer;1"]
                        .createInstance(Ci.nsITimer);
function startTimer() {
debug('entered');
  loadTimer.cancel();
debug('timer canceled prefs='+prefs);
  if (prefs['loadtimer']>0 && (prefs['timeddownload']||prefs['timedupload'])) {
      loadTimer.initWithCallback(timedUpDownload, prefs['loadtimer']*60000,
                Ci.nsITimer.TYPE_REPEATING_SLACK);
debug('timer started every '+prefs['loadtimer']);
	}
  if (prefs['noupload']) disableUpload();

}
var timedUpDownload = {
  notify: function(aTimer)
  {
debug('timer: fired');
		if (!Services.logins.isLoggedIn) //masterpassword not yet given, wait till next time
			return;
    if (prefs['timeddownload']) {
      if (prefs['timedupload']) pendingupload=true;		// do upload after download
      showPopup('download', null, 'auto', false);
    } else if (prefs['timedupload'])
      showPopup('upload', null, 'auto', false);
  },

}

/*
 * disable upload functionality (icons/menuitems/contextmenuitems in main- and addressbookwindow)
 */
function disableUpload() {
//TODO: needs to be a messenger.abs function to be called from options.js
/*
  //Toolbar button in 3Pane window and(!) addressbook window
  var id=document.getElementById('de_ggbs_abs.UploadIcon');
  if (id) id.style.display='none';
  //Context menuitem in addressbook
  id=document.getElementById('de_ggbs_abs.ContextUpload');
  if (id) id.style.display='none';
  //Menuitems in addressbook
  id=document.getElementById('de_ggbs_abs.TaskUploads');
  if (id) id.style.display='none';
  id=document.getElementById('de_ggbs_abs.TaskUpload');
  if (id) id.style.display='none';
*/
}

/*
 * Create or close a hidden Window
 *	This window is needed if upload on exit is selected with imap
 *	and the window is closed (instead of using the quit menuitem/buttons)
 */
function theHiddenWin(on) {
	if (on) {
		if (hiddenWin) try { hiddenWin.close(); } catch(e) {}
debug('hiddenWin: open');
/*
				if (navigator.appVersion.includes("Win")) {
					var OSName="WIN";
				} else if (navigator.appVersion.includes("Mac")) {
					var OSName="OSX";
				} else {
					var OSName="LINUX";
				}
*/
debug('OS='+Services.appinfo.OS);
		let left='left=-1000';
		if (Services.appinfo.OS == "WINNT") {
			left='left=-1000';
		} else if (Services.appinfo.OS == "Linux") {
			left='left=-199';
		} else if (Services.appinfo.OS == "Darwin") {
			left='left=-199';
		}
		let args = Cc["@mozilla.org/supports-string;1"].createInstance(Ci.nsISupportsString);
//without args, TB crashes!!!
		hiddenWin=Services.ww.openWindow(null, 'chrome://messenger/content/messageWindow.xhtml', 'abs',
										'width=200,height=200,'+left, args);	//width=100,height=100,left=-10000 ,left=-199
debug('hiddenWin: opened ');
/*
  		hiddenWin.setTimeout(()=>{hiddenWin.minimize();
debug('hiddenWin: minimized');
			}, 500);					//must be delayed! (100ms is to few!)
*/
	} else {
		if (hiddenWin) {
debug('hiddenWin: close');
			let hw=hiddenWin;
			hiddenWin=null;
			hw.close();
		}
	}
}

/*
 * return a window for function which need one (e.g. atob/btoa)
*/
function findWindow() {
	if (statusWin) return statusWin;
	else if (hiddenWin) return hiddenWin;
	return Services.wm.getMostRecentWindow(null);
}

var debugcache=new Map();
function debug(txt, ln) {
	//if from background or options via messenger.abs.debug: (string, string)
	//else	(string, undefined) or (string, exception)
	let ex;
	if (typeof ln==='string') {
		ex=txt.match('throws:');
	} else {
		ex=typeof ln!=='undefined';
		let e;
		if (ex) e=ln;
		else e = new Error();
		let stack = e.stack.toString().split(/\r\n|\n/);
		ln=stack[ex?0:1].replace(/file:\/\/.*\/(.*:\d+):\d+/, '$1');	//getExternalFilename@file:///D:/sourcen/Mozilla/thunderbird/Extensions/AddressbooksSync_wee/abs_utils.js:1289:6
	}
	if (ex) {
		console.error('ABS: '+ln+' '+txt);
	}

	if (!prefs) {
		var d=new Date();
		var s=d.toLocaleString();
//		debugcache.set(debugcache.size+(ex?':fail':'')+'-'+s, '(cached) '+ln+' '+txt);
		debugcache.set(debugcache.size+'-'+s, '(cached) '+ln+' '+txt);
		return;
	}
	if (!prefs['debug']) {
    debugcache=null;
    return;
  }

	if (exiting) {
		let d=new Date();
		let s=d.toLocaleString();
		let flags=0x10|0x08|0x02;
					// 0x02=PR_WRONLY, 0x10=PR_APPEND, 0x08=PR_CREATE_FILE
		try {
			let logFile=FileUtils.getFile("TmpD", ['AddressbookSynchronizer.log']);
			let strm = Cc["@mozilla.org/network/file-output-stream;1"].
				createInstance(Ci.nsIFileOutputStream);
			let os = Cc["@mozilla.org/intl/converter-output-stream;1"].
				createInstance(Ci.nsIConverterOutputStream);
			strm.QueryInterface(Ci.nsIOutputStream);
			strm.QueryInterface(Ci.nsISeekableStream);
			strm.init( logFile, flags, 0x180, 0 );	//0600
			os.init(strm, 'UTF-8', 0, 0x0000);
			os.writeString(s+': '+ln+' '+txt+"\n");
			os.close();
		} catch(e) {
			this.console.logStringMessage('AddressbooksSynchronizer: '+'File write:\n'+e);
		}
	}

	//if (inconsole) this.console.logStringMessage('AddressbooksSynchronizer: '+txt);
	if (debugcache && debugcache.size) {
console.log('ABS: debug: debugcache.size='+debugcache.size);
		for (let [s, t] of debugcache) {
			console.debug('ABS: '+t);
		}
		debugcache.clear();
	}
	if (!ex)
		console.debug('ABS: '+ln+' '+txt);
}

function doATest(param) {
/*
	for (let [key, val] of Object.entries(param)) {
		debug('windowobject:		'+key+'->'+val);
	}
*/
//crash thunderbird
		debug('try hiddenWin');
		try {
//			let hiddenWin=Services.ww.openWindow(null, 'chrome://messenger/content/messageWindow.xhtml', 'abs',
//										'left=-10000', null);	//width=100,height=100
			//let w=findWindow();
			let args = Cc["@mozilla.org/supports-string;1"].createInstance(Ci.nsISupportsString);
			let hiddenWin=Services.ww.openWindow(
							null,
							'chrome://messenger/content/messageWindow.xhtml',
							'abs',
							'left=-10000',		//width=100,height=100
							args
			);
			debug('got hiddenWin '+hiddenWin);
		} catch(e) { 
			debug('hiddenWin throws '+e);
		}

}
