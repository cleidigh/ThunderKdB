window.windowUtils.allowScriptsToClose();
let params=window.arguments[0];
let prefs=window.arguments[1];
let strings=window.arguments[2];
debug('params: '+JSON.stringify(params));

var finish=false;
var lasturi=null;

let initpopup = function() {
debug('initpopup');
	finish=false;
	window.document.title=strings['copysent2choose_label'];

	let cb=document.getElementById('movemessage');
	cb.hidden=!params.allowMove;
	cb.checked=params.allowMove&&prefs.movemessage;
	cb.setAttribute('label',strings['moveoriginal_label']);

	let m_d=document.getElementById('default://');
		if (m_d) m_d.setAttribute('accesskey',prefs.accesskey_default||'%');
	let m_s=document.getElementById('sent://');
		if (m_s) m_s.setAttribute('accesskey',prefs.accesskey_sent||'!');
	let m_nc=document.getElementById('nocopy://');
		m_nc.setAttribute('accesskey',prefs.accesskey_nocopy||'-');
	m_nc.setAttribute('label',strings['copysent2current_nocopy']);

	let box=document.getElementById('copyMenuBox');
	box.setAttribute('label',params.defLabel);
	let menu=document.getElementById('copyMenuPopup');
	menu.focus();
	let def=menu.firstChild;
	def.label  = params.defLabel;
	def.id     = params.defFolder;
	let sent=document.getElementById('sent://');
	if (!prefs[params.account+'_sentalso'] && params.sentFolder!=params.defFolder) {
		sent.label  = params.sentLabel;
		sent.id     = params.sentFolder;
		sent.hidden=false;
	} else if (params.defFolder==params.sentFolder &&
						params.curFolder && params.curFolder!=params.sentFolder) {
		sent.label  = params.curLabel;
		sent.id     = params.curFolder;
		sent.hidden=false;
	} else
		sent.hidden=true;

	setTimeout(popup, 100);
}

let popup = function() {
debug('popup');
	let popup=document.getElementById('copyMenuPopup');
	popup.focus();
	popup.openPopup(popup, 'after_start', -1, -1, false, false);
	let w=popup.clientWidth;
debug('resize width to '+w);
	if (w>200) window.resizeTo(w, null);	//200 as set on openDialog
	let mis=popup.getElementsByTagName('menuitem');
	for (let mi of mis) {	//only my items, others are inside menupopup
	debug('a menuitem '+mi.id);
		mi.addEventListener("DOMMenuItemActive", active);
	}
}

//Since TB45, using the arrow keys in the menu immediately fires the command event
//a keypress listener (https://developer.mozilla.org/en-US/docs/Archive/Mozilla/XUL/PopupGuide/PopupKeys
// does not work. The workaround is to use the lasturi. Fortunately the DOMMenuItemActive
// fires after the command event
let picked = function(event) {
debug('picked (=oncommand) finish='+finish);
	if (finish) return; //For some reason, after chooser closes, this fires again
debug('picked selected='+event.target.selected);
	var uri=event.target.id;
debug('picked uri='+uri);
	if (!uri) {	//not one of my own items
		lasturi='';
		if (event.target.getAttribute('IsServer')=='true') {
debug('picked some server, ignored');
			return; //some non-folder (e.g. 'Last folders') clicked
		} else if (!event.target._folder) {
debug('picked some non-folder, ignored');
			return; //some non-folder (e.g. 'Last folders') clicked
		}
		uri=event.target._folder.URI;
debug('picked uri from folder='+uri);
	} else {
debug('picked '+uri);
		if (uri!=lasturi) {
debug('pick ignored since lasturi was '+lasturi);
			lasturi=uri;
			return;
		}
	}
debug('returning '+uri);
	finish=true;
	params.targeturi=uri;
	params.move=document.getElementById('movemessage').checked;
	window.close();
}

let active = function(event) {
debug('active');
	let uri=event.target.id;
	if (!uri) {
		if (!event.target._folder) {
			lasturi='';
debug('active some non-folder');
			return; //some non-folder (e.g. 'Last folders') clicked
		}
		uri=event.target._folder.URI;
	}
debug('active '+uri);
	lasturi=uri;
}

let shown = function(target) {
debug('popup shown');
}

function debug(txt) {
	if (prefs.debug) console.log('CS2C: '+txt);
}
