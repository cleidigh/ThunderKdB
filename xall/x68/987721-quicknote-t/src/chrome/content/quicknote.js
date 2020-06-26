////////////////////////////////////////////////////////////////////////////
// quicknote.js
// Main implementation file for QuickNote	<http://quicknote.mozdev.org/>
//
// Author: Jed Brown (quicknote@jedbrown.net)
// Additional code taken from Cdn's Chrome Edit extension.
// Contributors:
//	 Nickolay Ponomarev (asqueella@gmail.com)
//	 Leung WC
//	 Leszek(teo)Życzkowski (leszekz@gmail.com)
//	 Internauta1024
//	 Toshi_
////////////////////////////////////////////////////////////////////////////

var QN_stringBundle;

const QNqn = {

	qn_find1l : 0,
	qn_findtab : 0,
	QN_Document: null,
	QN_charsLeft: Array(6 + 1),
	QN_noteLength: Array(6 + 1),
	prompts: Components.classes["@mozilla.org/embedcomp/prompt-service;1"]
								.getService(Components.interfaces.nsIPromptService),

	qnprint : function(n) {
		if (n == 0) {
			n = QNqn.QN_Document.getElementById("qntabs").selectedIndex + 1;
		}
		var PSSVC = Components.classes["@mozilla.org/gfx/printsettings-service;1"].getService(Components.interfaces.nsIPrintSettingsService);
		var pss = Components.classes["@mozilla.org/gfx/printsettings-service;1"].getService(Components.interfaces.nsIPrintSettingsService);
		var tx = document.getElementById("Pad"+n).value;
		var txsl = tx.substring(document.getElementById("Pad"+n).selectionStart, document.getElementById("Pad"+n).selectionEnd);
		if (txsl.length > 0) tx = txsl;
		tx = tx.replace(/</g,"<<!---->");
		tx = tx.replace(/\t/g,"&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;");
		tx = tx.replace(/  /g,"&nbsp;&nbsp;");
		tx = tx.replace(/&nbsp  /g,"&nbsp;&nbsp;");
		tx = tx.replace(/\n/g,'<br />'); //html
		//tx = tx.replace(/\n/g,'&#10;'); //xml
		var qnp = window.openDialog("chrome://quicknote/content/qnprint.html", "QN Print","chrome,centerscreen");
		qnp.addEventListener("load", function(e) {
			//console.log('印刷ページ作成開始');
			//console.log(qnp);
			var div = qnp.document.getElementsByTagName("div")[0];
			var parser = new DOMParser();
			var doc = parser.parseFromString(tx, 'text/html');
			for (let node of doc.all[2].childNodes) {
				if (node.nodeName == "#text") div.appendChild(document.createTextNode(node.textContent));
				else if (node.nodeName != "#comment" ) div.appendChild(document.createElement(node.localName));
			}
			//console.log('印刷ページ作成終了');
			//console.log(qnp);
			div.style.fontName = QN_globalvar.qnprefs.getCharPref("fontname" + n);
			if (QN_globalvar.qnprefs.getIntPref("printfontsizeonevalue", 12) == 0) {
				div.style.fontSize = QN_globalvar.qnprefs.getIntPref("fontsize" + n, 12) + "px ";
			} else {
				div.style.fontSize = QN_globalvar.qnprefs.getIntPref("printfontsize") + "px";
			}
			var webBrowserPrint = window.getInterface(Components.interfaces.nsIInterfaceRequestor).getInterface(Components.interfaces.nsIWebBrowserPrint);
			var printSettings = PrintUtils.getPrintSettings();
			if (printSettings.headerStrLeft == "&U") printSettings.headerStrLeft = "QuickNote";
			if (printSettings.headerStrCenter == "&U") printSettings.headerStrCenter = "QuickNote";
			if (printSettings.headerStrRight == "&U") printSettings.headerStrRight = "QuickNote";
			if (printSettings.footerStrLeft == "&U") printSettings.footerStrLeft = "QuickNote";
			if (printSettings.footerStrCenter == "&U") printSettings.footerStrCenter = "QuickNote";
			if (printSettings.footerStrRight == "&U") printSettings.footerStrRight = "QuickNote";
			PSSVC.savePrintSettingsToPrefs(printSettings, true, printSettings.kInitSaveHeaderLeft);
			PSSVC.savePrintSettingsToPrefs(printSettings, true, printSettings.kInitSaveHeaderCenter);
			PSSVC.savePrintSettingsToPrefs(printSettings, true, printSettings.kInitSaveHeaderRight);
			PSSVC.savePrintSettingsToPrefs(printSettings, true, printSettings.kInitSaveFooterLeft);
			PSSVC.savePrintSettingsToPrefs(printSettings, true, printSettings.kInitSaveFooterCenter);
			PSSVC.savePrintSettingsToPrefs(printSettings, true, printSettings.kInitSaveFooterRight);
			//console.log('印刷処理開始');
			//console.log(qnp);
			qnp.print();
			//console.log('印刷処理終了');
			//console.log(qnp);
			//console.log('ウィンドウクローズ開始');
			//console.log(qnp);
			qnp.close();
			//console.log('ウィンドウクローズ終了');
			//console.log(qnp);
			if (printSettings.headerStrRight == "QuickNote") printSettings.headerStrRight = "&U";
			if (printSettings.headerStrCenter == "QuickNote") printSettings.headerStrCenter = "&U";
			if (printSettings.headerStrRight == "QuickNote") printSettings.headerStrRight = "&U";
			if (printSettings.footerStrLeft == "QuickNote") printSettings.footerStrLeft = "&U";
			if (printSettings.footerStrCenter == "QuickNote") printSettings.footerStrCenter = "&U";
			if (printSettings.footerStrRight == "QuickNote") printSettings.footerStrRight = "&U";
			PSSVC.savePrintSettingsToPrefs(printSettings, true, printSettings.kInitSaveHeaderLeft);
			PSSVC.savePrintSettingsToPrefs(printSettings, true, printSettings.kInitSaveHeaderCenter);
			PSSVC.savePrintSettingsToPrefs(printSettings, true, printSettings.kInitSaveHeaderRight);
			PSSVC.savePrintSettingsToPrefs(printSettings, true, printSettings.kInitSaveFooterLeft);
			PSSVC.savePrintSettingsToPrefs(printSettings, true, printSettings.kInitSaveFooterCenter);
			PSSVC.savePrintSettingsToPrefs(printSettings, true, printSettings.kInitSaveFooterRight);
		});
		/*const promise = new Promise((resolve, reject) => {
			qnp.addEventListener("load", function(e) {
				console.log('印刷ページ作成開始');
				console.log(qnp);
				var div = qnp.document.getElementsByTagName("div")[0];
				//var div = qnp.document.getElementById("content");
				var parser = new DOMParser();
				var doc = parser.parseFromString(tx, 'text/html');
				for (let node of doc.all[2].childNodes) { // text/html = 2, text/xml = 1
					if (node.nodeName == "#text") div.appendChild(document.createTextNode(node.textContent));
					else if (node.nodeName != "#comment" ) div.appendChild(document.createElement(node.localName));
				}
				console.log('印刷ページ作成終了');
				console.log(qnp);
				div.style.fontName = QN_globalvar.qnprefs.getCharPref("fontname" + n);
				if (QN_globalvar.qnprefs.getIntPref("printfontsizeonevalue", 12) == 0) {
					div.style.fontSize = QN_globalvar.qnprefs.getIntPref("fontsize" + n, 12) + "px ";
				} else {
					div.style.fontSize = QN_globalvar.qnprefs.getIntPref("printfontsize") + "px";
				}
				var webBrowserPrint = window.getInterface(Components.interfaces.nsIInterfaceRequestor).getInterface(Components.interfaces.nsIWebBrowserPrint);
				var printSettings = PrintUtils.getPrintSettings();
				if (printSettings.headerStrLeft == "&U") printSettings.headerStrLeft = "QuickNote";
				if (printSettings.headerStrCenter == "&U") printSettings.headerStrCenter = "QuickNote";
				if (printSettings.headerStrRight == "&U") printSettings.headerStrRight = "QuickNote";
				if (printSettings.footerStrLeft == "&U") printSettings.footerStrLeft = "QuickNote";
				if (printSettings.footerStrCenter == "&U") printSettings.footerStrCenter = "QuickNote";
				if (printSettings.footerStrRight == "&U") printSettings.footerStrRight = "QuickNote";
				PSSVC.savePrintSettingsToPrefs(printSettings, true, printSettings.kInitSaveHeaderLeft);
				PSSVC.savePrintSettingsToPrefs(printSettings, true, printSettings.kInitSaveHeaderCenter);
				PSSVC.savePrintSettingsToPrefs(printSettings, true, printSettings.kInitSaveHeaderRight);
				PSSVC.savePrintSettingsToPrefs(printSettings, true, printSettings.kInitSaveFooterLeft);
				PSSVC.savePrintSettingsToPrefs(printSettings, true, printSettings.kInitSaveFooterCenter);
				PSSVC.savePrintSettingsToPrefs(printSettings, true, printSettings.kInitSaveFooterRight);
				resolve();
			});
		});
		promise.then(() => {
			console.log('印刷処理開始');
			console.log(qnp);
			qnp.print();
			console.log('印刷処理終了');
			console.log(qnp);
			console.log('ウィンドウクローズ開始');
			console.log(qnp);
			qnp.close();
			console.log('ウィンドウクローズ終了');
			console.log(qnp);
			if (printSettings.headerStrRight == "QuickNote") printSettings.headerStrRight = "&U";
			if (printSettings.headerStrCenter == "QuickNote") printSettings.headerStrCenter = "&U";
			if (printSettings.headerStrRight == "QuickNote") printSettings.headerStrRight = "&U";
			if (printSettings.footerStrLeft == "QuickNote") printSettings.footerStrLeft = "&U";
			if (printSettings.footerStrCenter == "QuickNote") printSettings.footerStrCenter = "&U";
			if (printSettings.footerStrRight == "QuickNote") printSettings.footerStrRight = "&U";
			PSSVC.savePrintSettingsToPrefs(printSettings, true, printSettings.kInitSaveHeaderLeft);
			PSSVC.savePrintSettingsToPrefs(printSettings, true, printSettings.kInitSaveHeaderCenter);
			PSSVC.savePrintSettingsToPrefs(printSettings, true, printSettings.kInitSaveHeaderRight);
			PSSVC.savePrintSettingsToPrefs(printSettings, true, printSettings.kInitSaveFooterLeft);
			PSSVC.savePrintSettingsToPrefs(printSettings, true, printSettings.kInitSaveFooterCenter);
			PSSVC.savePrintSettingsToPrefs(printSettings, true, printSettings.kInitSaveFooterRight);
		});*/
},

	qnfind : function(n){
	var tx=document.getElementById("Pad"+n).value;
	if(QNqn.qn_findtab!=n){QNqn.qn_find1l=0}
		var find1=document.getElementById("qnfind"+n).value;
		if (find1 != "") {
			var search_arr = [];
			var str = document.getElementById("Pad"+n).value;
			var str2;
			document.getElementById("Pad"+n);
			var regexp = new RegExp(find1,"gi");
			var match_arr = str.match(regexp);
			search_arr[0] = str.search(regexp);
			if (match_arr != null) {
				for(let i=1; i < match_arr.length; i++) {
					str2 = str.slice(search_arr[search_arr.length-1] + find1.length);
					search_arr[i] = str2.search(regexp) + (str.length-str2.length);
				}
				if (search_arr.length > 0 && QNqn.qn_find1l > 0) {
					if (QNqn.qn_find1l > search_arr.length - 1) QNqn.qn_find1l = 0;
					document.getElementById("Pad"+n).focus();
					document.getElementById("Pad"+n).setSelectionRange(search_arr[QNqn.qn_find1l], search_arr[QNqn.qn_find1l] + find1.length);
					QNqn.qn_find1l = QNqn.qn_find1l + 1;
					document.getElementById("qnfind"+n).value = "";
					document.getElementById("qnfind"+n).value = find1;
				}
				if (search_arr.length>0&&QNqn.qn_find1l == 0) {
					document.getElementById("Pad"+n).focus();
					document.getElementById("Pad"+n).setSelectionRange(search_arr[0], search_arr[0] + find1.length);
					QNqn.qn_find1l = QNqn.qn_find1l+1;
					document.getElementById("qnfind"+n).value = "";
					document.getElementById("qnfind"+n).value = find1;
				}
			}
		}
		QNqn.qn_findtab = n;
	},
	qnonfocus : function(){
		if (document.getElementById("tabpanels").currentIndex + 1 > QN_globalvar.qnprefs.getIntPref("numtabs")) {
			document.getElementById("qntabs").selectedIndex = 0;
			document.getElementById("Pad1").focus();
		}
		if (QN_globalvar.qnprefs.getIntPref("autosave", 0) == "-1") {
			if (QN_globalvar.qnprefs.getBoolPref("sendtext") == true) {
				window.document.getElementById("save"+QN_globalvar.qnprefs.getIntPref("totabint")).disabled = false;
			}
		}
		var i;
		for(i=1; i<=6; i++){
			if(!QN_globalvar.qnprefs.getBoolPref("showclearbutton", false)) { window.document.getElementById("clear"+i).hidden = true;}
			else{window.document.getElementById("clear"+i).hidden = false;}
			if(!QN_globalvar.qnprefs.getBoolPref("showprintbutton", false)) { window.document.getElementById("print"+i).hidden = true;}
			else{window.document.getElementById("print"+i).hidden = false;}
			if(!QN_globalvar.qnprefs.getBoolPref("showsavebutton", false)) {window.document.getElementById("save"+i).hidden = true;}
			else{window.document.getElementById("save"+i).hidden = false;}
			if(!QN_globalvar.qnprefs.getBoolPref("showsaveasbutton", false)) {window.document.getElementById("save-as"+i).hidden = true;}
			else{window.document.getElementById("save-as"+i).hidden = false;}
			document.getElementById("Pad" + i).setAttribute("style","font: " +
				QN_globalvar.qnprefs.getIntPref("fontsize"+i, 12) + "px " +
				QN_globalvar.qnprefs.getCharPref("fontname"+i, "Georgia") + "; " +
				"color:" + QN_globalvar.qnprefs.getCharPref("fontcolor"+i, "#000") + "; " +
				"-moz-appearance: none; background-color: " +
				QN_globalvar.qnprefs.getCharPref("bgcolortab"+i, "Wheat") + "; " +
				QN_globalvar.qnprefs.getCharPref("userstyle"+i, ""));
			document.getElementById("buttonbox" + i).style.backgroundColor = QN_globalvar.qnprefs.getCharPref("bgcolortab" + i, "");
			document.getElementById("Tab"+i).collapsed = false;
		}
		for(i=QN_globalvar.qnprefs.getIntPref("numtabs")+1; i<=6; i++)
			document.getElementById("Tab"+i).collapsed = true;

		if (!QN_globalvar.qnprefs.getBoolPref("showqnbutton", false)) { window.document.getElementById("qnoptions").hidden = true; }
		else { window.document.getElementById("qnoptions").hidden = false; }
	},

////////////////////////////////////////////////////////////////////////////////
// OnLoad
//
// Desc: Starts everyting (loading, Tab Labels, caught text, etc.)
// Parameters: Pad to copy the selection (via arguments[0])
// Returns: nothing
////////////////////////////////////////////////////////////////////////////////

	OnLoad : function() {
		QNqn.setupDocument(document);
		var i;
		for(i=1; i<=6; i++)
			QNqn.loadNote(i);
		var textRecipent = null;
		try {
			if(("arguments" in window) && (0 in window.arguments) )
				textRecipent = QNqn.catchText(window.arguments[0]);
			else
				textRecipent = QNqn.catchText();
		} catch(e) {
			Components.utils.reportError(e);
		}

		if(!textRecipent) {
			var lastTab = QN_globalvar.qnprefs.getIntPref("lasttabopen");
			document.getElementById("qntabs").selectedIndex = lastTab - 1;
			var thePadId = "Pad" + lastTab;
			var thePad = document.getElementById(thePadId);
			thePad.focus();
		}

		setTimeout(function() {
			for (let i = 1; i <= 6; i++) {
				let textbox = document.getElementById('Pad' + i);
				//let inputbox = document.getAnonymousElementByAttribute(textbox, 'class', 'textbox-input-box');
				//let spellcheckenabled = textbox.getAttribute('spellcheckenabled') == 'true';
				//inputbox.spellCheckerUI.enabled = spellcheckenabled;
			}
		}, 100)
		QNqn.qnonfocus();
	},

	setupDocument : function(aDoc) {
		QNqn.QN_Document = aDoc;
		Components.utils.import("resource://gre/modules/Services.jsm");
		QN_stringBundle = Services.strings.createBundle("chrome://quicknote/locale/quicknote.properties");
	},

	closeWindow : function() {
		window.close();
	},

	getTextareaText : function(Note) {
		return QNqn.QN_Document.getElementById('Pad'+Note).value;
	},

	setTextareaText : function(Text, Note) {
		QNqn.QN_Document.getElementById('Pad'+Note).value = Text;
		QNqn.QN_Document.getElementById('Pad'+Note).editor.transactionManager.clear();
	},

	// applies visual customizations for a tab (bgcolor, fonts, tab names etc.)
	applyCustomizations : function(Note) {
		QNqn.renameTab(Note);
	},

////////////////////////////////////////////////////////////////////////////////
// loadNote()
//
// Desc: This function decides whether to load user defined files or create
//			 new quicknote[1-4].txt in the profile chrome directory.
// Params: Note - which note to load (1..6)
////////////////////////////////////////////////////////////////////////////////
	loadNote : function(Note) {
		var userTabpath;
		try {
			userTabpath = QN_globalvar.qnprefs.getComplexValue("tab"+Note+"path",Components.interfaces.nsIPrefLocalizedString).data;
		}
		catch(e){}
		if (!userTabpath)
			QNqn.setDefaultFile(Note);
		else
			QNqn.loadAFile(userTabpath, Note);
		QNqn.applyCustomizations(Note);
		if (QN_globalvar.qnprefs.getBoolPref("cursorposstart", false)) {
			for(i=1; i<=6; i++) {
				document.getElementById("Pad"+i).setSelectionRange(0,0);
			}
		}
	},

////////////////////////////////////////////////////////////////////////////////
// setDefaultFile()
//
// Desc: Used for loading the default Profile Notes, sets the dir and calls
//			 loadFromFile() to actually load the files.
// Parameters:
//		Note: Where it is headed to (1..6)
////////////////////////////////////////////////////////////////////////////////
	setDefaultFile : function(Note) {//!! review/cleanup
		var targetNodeID = "Pad" + Note;
		var fileName = "quicknote" + Note + ".txt";
		var f = DirIO.get('UChrm');
		f.append(fileName);

		if(f.exists())
		{
			QNqn.loadFromFile(f,Note);
			var qns = Components.classes["@mozilla.org/pref-localizedstring;1"].createInstance(Components.interfaces.nsIPrefLocalizedString);
			qns.data = f.path;
			QN_globalvar.qnprefs.setComplexValue("tab"+Note+"path",Components.interfaces.nsIPrefLocalizedString, qns);
//			getQNPrefs().set("tabpath", f.path, Note);
		} else if(!f.exists())
		{
		 FileIO.create(f);
			if (f.exists()) {
				QNqn.loadFromFile(f,Note);
				var qns = Components.classes["@mozilla.org/pref-localizedstring;1"].createInstance(Components.interfaces.nsIPrefLocalizedString);
				qns.data = f.path;
				QN_globalvar.qnprefs.setComplexValue("tab"+Note+"path",Components.interfaces.nsIPrefLocalizedString, qns);
			} else {
				var textAlert =
					QN_stringBundle.formatStringFromName("qnerr.cantCreate", [f.path], [f.path].length)+'\n'+
					QN_stringBundle.GetStringFromName("qnerr.cantCreate.hint");
				QNqn.setTextareaText(textAlert, targetNodeID);
			}
		}
	},

////////////////////////////////////////////////////////////////////////////////
// loadAFile
//
// Desc: Loads userdefined files (set in prefs)
// Parameters:
//		userFileName: The name and location of the file to load.
//		Note: Where it is headed to (1..6)
// Returns: true or false
////////////////////////////////////////////////////////////////////////////////
	loadAFile : function(userFileName, Note) {
		var textAlert;
		if(!userFileName) {
			textAlert = QN_stringBundle.GetStringFromName("qnerr.noFile");
			QNqn.setTextareaText(textAlert, Note);
			return false;
		}

		var f = FileIO.open(userFileName);

		if (f.exists()) { 
			QNqn.loadFromFile(f, Note);
		} else {
			textAlert =
				QN_stringBundle.formatStringFromName("qnerr.invalidFile", [f.path], [f.path].length)+'\n'+
				QN_stringBundle.GetStringFromName("qnerr.invalidFile.hint");
			QNqn.setTextareaText(textAlert, Note);
		}
		return true;
	},

////////////////////////////////////////////////////////////////////////////////
// loadFromFile
// Desc: Actually loads the file thanks to many people, including JSLib team,
//			 MonkeeSage, Leung WC, asqueella, ...
// Parameters:
//		f: nsIFile
//		Note: where the file should be loaded to (1..6)
// Returns: true if file saved, false otherwise
////////////////////////////////////////////////////////////////////////////////
	loadFromFile : function(f,Note) {
		var charset = QN_globalvar.qnprefs.getCharPref("charset", "UTF-8");
		QNqn.QN_charsLeft[Note] = QN_globalvar.qnprefs.getIntPref("autosave", 0);
		try {
			var stuff = FileIO.read(f, charset);
			QNqn.setTextareaText(stuff,Note);
			QNqn.QN_noteLength[Note] = QNqn.QN_Document.getElementById("Pad"+Note).textLength;
		} catch(e) {
			var textAlert =
				QN_stringBundle.formatStringFromName("qnerr.failedLoadFile", [f.path], [f.path].length)+'\n'+
				QN_stringBundle.formatStringFromName("qnerr.failedLoadFile.hint", [charset], [charset].length);
			QNqn.setTextareaText(textAlert,Note);
		}
	},

////////////////////////////////////////////////////////////////////////////////
// renameCurrentTab
//
// Desc: Rename the current Tab
// Sets prefs quicknote.tab1name, .tab2name, etc.
////////////////////////////////////////////////////////////////////////////////
	renameCurrentTab : function() {
		var Note = QNqn.QN_Document.getElementById("qntabs").selectedIndex+1;//current note number
		var Name
		try{Name = QN_globalvar.qnprefs.getComplexValue("tab"+Note+"name",Components.interfaces.nsIPrefLocalizedString).data}
		catch(e){Name =QN_stringBundle.GetStringFromName("default.notetitle")+" &"+Note}
		var currentTabName = Name;
		var displayName = QNqn.parseTabName(currentTabName)[0];
		var promptText = QN_stringBundle.formatStringFromName("qn.tabRenamePrompt", [displayName], [displayName].length);
		var check = {value: false};
		var input = {value: displayName};
		var result = QNqn.prompts.prompt(null, "QuickNote", promptText, input, null, check);
		if(result=true&&input.value !="") { // Set up new name
			var qns = Components.classes["@mozilla.org/pref-localizedstring;1"].createInstance(Components.interfaces.nsIPrefLocalizedString);
			qns.data = input.value;
			QN_globalvar.qnprefs.setComplexValue("tab"+Note+"name",Components.interfaces.nsIPrefLocalizedString, qns);
			QNqn.renameTab(Note);
		}
	},

	parseTabName : function(aName) {
		var a = RegExp("^(([^&]|&&[^&])*)" + "&([^&]|&&)" + "(.*)").exec(aName);
		var accesskey, label;
								//			2			 1					3					 4
		if(a) {
			if(a[3] == '&&') a[3] = '&';
			if(!a[1]) a[1] = "";
			if(!a[4]) a[4] = "";

			accesskey = a[3];
			label = a[1] + a[3] + a[4];
		} else {
			label = aName;
			accesskey = "";
	}
		label = label.replace(/&&/g, "&");
		return [label, accesskey];
	},

	renameTab : function(Note) {
		var Name
		try{Name = QN_globalvar.qnprefs.getComplexValue("tab"+Note+"name",Components.interfaces.nsIPrefLocalizedString).data}
		catch(e){Name =QN_stringBundle.GetStringFromName("default.notetitle")+" &"+Note}
		var tab = QNqn.QN_Document.getElementById("Tab"+Note);

		var a = QNqn.parseTabName(Name);
		if(!a[1]) a[1]=Note;
	
		for(var i=1; i<=6; i++) {
			var t = QNqn.QN_Document.getElementById("Tab"+i)
			if(t.getAttribute("accesskey") == a[1]) {
				if(i < Note)
					tab.removeAttribute("accesskey");
				else if(i > Note)
					t.removeAttribute("accesskey");
			}
		}

		tab.setAttribute("accesskey",a[1]);
		tab.label = a[0];
	},

	currentNote : function()
	{
		return QNqn.QN_Document.getElementById("qntabs").selectedIndex+1;//selIndex is 0-based!
	},

////////////////////////////////////////////////////////////////////////////////
// saveCurrent
//
// Desc: Saves the active pad to a corresponding file through a call to saveNote
//			 Used for Ctrl+S ('Save Current Note') handling.
////////////////////////////////////////////////////////////////////////////////
	saveCurrent : function()
	{
		QNqn.saveNote(QNqn.QN_Document.getElementById("qntabs").selectedIndex+1);
	},

////////////////////////////////////////////////////////////////////////////////
// saveAll
// Desc: Saves all tabs using SaveNote
////////////////////////////////////////////////////////////////////////////////
	saveAll : function()
	{
		for(var i=1; i<=6; i++)
			QNqn.saveNote(i);
	},

////////////////////////////////////////////////////////////////////////////////
// saveNote
//
// Desc: Saves a note. Utilized the saveAFile function for actual saving
// Parameters: Note - the number of the note to be save (1..6)
// Returns: nothing
////////////////////////////////////////////////////////////////////////////////
	saveNote : function(i) {
		if(QN_globalvar.qnprefs.getIntPref("autosave", 0)=="-1"){
				QNqn.QN_Document.getElementById("save"+i).setAttribute("disabled", true)
				QN_globalvar.qnprefs.setBoolPref("sendtext",false)
		}
		var fName
		try{fName =	QN_globalvar.qnprefs.getComplexValue("tab"+i+"path",Components.interfaces.nsIPrefLocalizedString).data}
		catch(e){}
		if(!fName){QNqn.setDefaultFile(i)}
		var p = QNqn.saveAFile(fName, i);
		if(p) {
			QNqn.QN_charsLeft[i = QN_globalvar.qnprefs.getIntPref("autosave", 0)];
		}
	},

////////////////////////////////////////////////////////////////////////////////
// autoSave()
//
// Desc: Auto-save on close function.
//			 Saves all the [modified] files via saveNote().
//			 Also saves the active tab information.
////////////////////////////////////////////////////////////////////////////////
	autoSave : function() {
		if(QN_globalvar.qnprefs.getIntPref("autosave", 0) == "-1") {
			QN_globalvar.qnprefs.setBoolPref("sendtext",false);
			if (QN_globalvar.qnprefs.getBoolPref("closestate") == false) {
				QNqn.onClose();
			}
		}
		QN_globalvar.qnprefs.setBoolPref("closestate", false);
		QN_globalvar.qnprefs.setIntPref("lasttabopen", QNqn.QN_Document.getElementById("qntabs").selectedIndex+1); //note that selIndex is 0-based.

		if (QN_globalvar.qnprefs.getIntPref("autosave", 0) < 0) return;

		for (let i = 1; i <= 6; i++) {
			QNqn.saveNote(i);
			let textbox = document.getElementById('Pad' + i);
			//let inputbox = document.getAnonymousElementByAttribute(textbox, 'class', 'textbox-input-box');
			//textbox.setAttribute('spellcheckenabled', inputbox.spellCheckerUI.enabled);
		}
	},

////////////////////////////////////////////////////////////////////////////////
// onClose()
//	used when 'no autosave' option is selected
//	shows a dialog to let user select the notes he wishes to save
////////////////////////////////////////////////////////////////////////////////
	onClose : function(){
		if (QN_globalvar.qnprefs.getIntPref("autosave", 0) == "-1") {
			 QN_globalvar.qnprefs.setBoolPref("sendtext",false)
			 QN_globalvar.qnprefs.setBoolPref("closestate",true)
		}

		var autosave = QN_globalvar.qnprefs.getIntPref("autosave", 0);

		if (autosave < 0) {
			var re = {};
			var Show = Array(7);
			var Save = Array(7);
			var Changed = false;
			var i;

			var numberOfTabs = QN_globalvar.qnprefs.getIntPref("numtabs");
			for(i=1; i<=numberOfTabs; i++)		Show[i] = true;
			for(i=numberOfTabs+1; i<=6; i++)	Show[i] = false;

			var tabNames = [""];
			for(i=1; i<=6; i++)
			{
				Save[i] = !QNqn.QN_Document.getElementById('save'+i).hasAttribute('disabled');
				Changed = Changed || Save[i];
			}
			if(!Changed) return true;

			window.openDialog("chrome://quicknote/content/qnconfirmsave.xhtml",
				"qnconfirmsave","chrome,modal,centerscreen",re,Show,tabNames,Save);
			if(!re.val)
				return false;
			else {
				for(i=1; i<=6; i++)
					if(Save[i])
						QNqn.saveNote(i);
			}

		}					 QN_globalvar.qnprefs.setBoolPref("sendtext",false)
		return true;
	},

	onInput : function(Note) {
		var thePad = QNqn.QN_Document.getElementById("Pad" + Note);
		if(QN_globalvar.qnprefs.getIntPref("autosave", 0) > 0)
		{
			var deltaLen = Math.abs(QNqn.QN_noteLength[Note]-thePad.textLength);
			QNqn.QN_charsLeft[Note] = QNqn.QN_charsLeft[Note] - Math.max(deltaLen,1);
			if(QNqn.QN_charsLeft[Note] <= 0)
				QNqn.saveNote(Note);
			else
				QNqn.QN_Document.getElementById('save' + Note).removeAttribute('disabled');
		} else
			QNqn.QN_Document.getElementById('save' + Note).removeAttribute('disabled');
		QNqn.QN_noteLength[Note] = thePad.textLength;
	},

	chooseqntab : function(event) {
	var ct=document.getElementById("tabpanels").selectedIndex+1
		if(event.keyCode==13){
			if(document.getElementById("Pad"+ct).value.substring(document.getElementById("Pad"+ct).selectionStart,document.getElementById("Pad"+ct).selectionEnd).toLowerCase() == document.getElementById("qnfind"+ct).value.toLowerCase() && document.getElementById("qnfind"+ct).value!=""){
				 event.preventDefault()
				 QNqn.qnfind(ct)
			 }
		}
		if(event.ctrlKey==true&&event.which==102||event.keyCode==114){
				if(document.getElementById("qnfind"+ct).hidden==false){
					document.getElementById("qnfind"+ct).value=""
					document.getElementById("qnfind"+ct).hidden=true
				}
				else{
					document.getElementById("qnfind"+ct).hidden=false
					document.getElementById("qnfind"+ct).focus()
				}
				event.preventDefault()
		}
		var keyqn=String.fromCharCode(event.which)
		var keyqnwith=false
		if(navigator.platform=="Win32" && event.altKey==true){keyqnwith=true}
		if(navigator.platform=="Linux i686" && event.ctrlKey==true){keyqnwith=true}
		if(navigator.platform=="MacPPC" && event.metaKey==true){keyqnwith=true}
		if(keyqnwith==true&&keyqn>0&&keyqn<QN_globalvar.qnprefs.getIntPref("numtabs")+1){
			document.getElementById("qntabs").selectedIndex=keyqn-1
			document.getElementById("Pad"+keyqn).focus()
		}
	},

////////////////////////////////////////////////////////////////////////////////
// clearNote
// Desc: Clear a Note. Used when user want clear all note content.
////////////////////////////////////////////////////////////////////////////////
	qnClearNote : function(Note) {
		QNqn.QN_Document.getElementById("Pad" + Note).value=""
		QNqn.QN_Document.getElementById('save' + Note).removeAttribute('disabled')
	},

////////////////////////////////////////////////////////////////////////////////
// saveNoteAs
// Desc: Saves a Note to a user-defined location via saveAFile().
// Utilized saveAFile for actual saving.
//
// Parameters: Note: What to save (number, 1..6)
// Returns: true if list saved, false otherwise
//
// Originally Modeled after the SaveAs code from Tagzilla.mozdev.org!
////////////////////////////////////////////////////////////////////////////////
	saveNoteAs : function(Note) {
		var promptText = QN_stringBundle.formatStringFromName("qn.saveAsPrompt", [Note], [Note].length);
		var fName = QNqn.txtFilePicker(promptText, 1);
		if(fName == null)
			return false;

		var isSaved = QNqn.saveAFile(fName, Note);
		return isSaved;
	},

////////////////////////////////////////////////////////////////////////////////
// saveAFile
// Desc: Actually does the filesaving thanks to JSLib
// Parameters:
//		aUrl: string name of file to save, in platform-specific or file:// format
//		Note: where the data is to save (1..6)
// Returns: true if file saved, false otherwise
////////////////////////////////////////////////////////////////////////////////
	saveAFile : function(aUrl, Note) {
		var aFile = aUrl;
		if(aUrl.substring(0,7) == "file://") {
			var fUtils = new FileUtils();
			aFile = fUtils.urlToPath(aUrl);
		}

		var f = FileIO.open(aFile);
		if(!f) {
			var alertText = QN_stringBundle.formatStringFromName("qnerr.cantOpenw", [aFile], [aFile].length);
				QNqn.prompts.alert(null,"QuickNote",alertText);
			return false;
		}

		var p;
		var data = QNqn.getTextareaText(Note);
		if(data)
			p = FileIO.write(f,data,'w',QN_globalvar.qnprefs.getCharPref("charset", "UTF-8"));
		else
			p = FileIO.unlink(f) && FileIO.create(f);
		return p;
	},

////////////////////////////////////////////////////////////////////////////////
// catchText
//
// Desc: Catch text sent via context menu. Append it to the note specified with
//			 tabtosendto.
// Parameters: QuickNote window; text to catch
// Returns: the pab-id which got the text; null when no text to catch.
// ?? make it return true/false ?? the return value is only tested against null...
///////////////////////////////////////////////////////////////////////////////
	catchText : function(aText) {

		var target = QN_globalvar.qnprefs.getIntPref("totabint", 1);
		var result = null;

		if(!aText) {
			try {
				aText =	QN_globalvar.qnprefs.getComplexValue("senttext",Components.interfaces.nsIPrefLocalizedString).data;
			} catch(e) {}
			var qns = Components.classes["@mozilla.org/pref-localizedstring;1"].createInstance(Components.interfaces.nsIPrefLocalizedString);
			qns.data = "";
			QN_globalvar.qnprefs.setComplexValue("senttext",Components.interfaces.nsIPrefLocalizedString, qns);
//			pref.clear("senttext");
		}

		if(aText) {
			QN_globalvar.qnprefs.setIntPref("lasttabopen", target);
			var Pad = QNqn.QN_Document.getElementById("Pad" + target);

		if(Pad=="[object XPCNativeWrapper [object XULElement]]"){
			if(QN_globalvar.qnprefs.getBoolPref("cursorposstart")){
				Pad.wrappedJSObject.value = aText + "\n" + "\n" + Pad.wrappedJSObject.value;Pad.setSelectionRange(aText.length, aText.length)
		}else{
			Pad.wrappedJSObject.value = Pad.wrappedJSObject.value + "\n" + "\n" + aText;Pad.setSelectionRange(Pad.textLength, Pad.textLength)
			}
		}else{
			if(QN_globalvar.qnprefs.getBoolPref("cursorposstart")){
				Pad.value = aText + "\n" + "\n" + Pad.value;Pad.setSelectionRange(aText.length, aText.length)
			}else{
				Pad.value = Pad.value + "\n" + "\n" + aText;Pad.setSelectionRange(Pad.textLength, Pad.textLength)
			}
		}

		if(QN_globalvar.qnprefs.getIntPref("autosave", 0) >= 0)
			QNqn.saveNote(target);
			QNqn.QN_Document.getElementById("qntabs").selectedIndex = target-1;
			Pad.focus();

			result = "Pad" + target;
		}
		return null;
	},

////////////////////////////////////////////////////////////////////////////////
// txtFilePicker
//
// Parameters:
//	aTitle: title to go on file picker window
//	aSave: 1 if picking file to save/overwrite, 0 if picking file to load
// No longer used. --> aStart: directory to start from No longer used.
// (kept as a resource)		This must be an nsIFile.	new Dir("foo") in jslib/io/dir.js will
//					do the trick, but you have to do it yourself.
// Returns:
//	Name of file picked, in URL format, or null if cancelled
// Original taken and modified from Tagzilla.mozdev.org!
////////////////////////////////////////////////////////////////////////////////
	txtFilePicker : function(aTitle, aSave) {
		var retVal = null;
		try {
			const nsIFilePicker = Components.interfaces.nsIFilePicker;
			var fp = Components.classes["@mozilla.org/filepicker;1"].createInstance(nsIFilePicker);
			fp.init(window, aTitle, (aSave ? nsIFilePicker.modeSave : nsIFilePicker.modeOpen));
			fp.appendFilters(nsIFilePicker.filterAll | nsIFilePicker.filterText);

			var result=fp.show();
			if (result == nsIFilePicker.returnOK || result == nsIFilePicker.returnReplace)
				retVal=fp.file.path;
		}
		catch (e) {
		}
		return retVal;
	},

// insert some text into current note at cursor position
	QN_insertText : function(aText) {
		var command = "cmd_insertText";
		try {
			var controller = QNqn.QN_Document.commandDispatcher.getControllerForCommand(command);
			if (controller && controller.isCommandEnabled(command)) {
				controller = controller.QueryInterface(Components.interfaces.nsICommandController);
				var params = Components.classes["@mozilla.org/embedcomp/command-params;1"];
				params = params.createInstance(Components.interfaces.nsICommandParams);
				params.setStringValue("state_data", aText);
				controller.doCommandWithParams(command, params);
			}
		}
		catch (e) {
			dump(QN_stringBundle.GetStringFromName("qnerr.insertText"));
			dump(e+"\n")
		}
	},

// insert current date/time into current note using QN_insertText()
	insertDateTime : function() {
		var dateTimeStr = new Date().toLocaleString();
		QNqn.QN_insertText(dateTimeStr);
	},

// here we process the TAB key (insert '\t' char ven VK_TAB is pressed)
	onKeyPress : function(event) {
		var modifiers = (event.ctrlKey?1:0) | (event.altKey?2:0) | (event.shiftKey?4:0);

		if((event.keyCode == event.DOM_VK_TAB) && (event.ctrlKey))
			QNqn.QN_insertText("\t");
		else
			return true;
		return false;
	},

	hideSelf : function() {
		// find out if QN is opened in tab, sidebar or a floating window
		var parent = QNqn.QN_Document.defaultView.parent;
		var loc = parent.location;
		if(loc == "chrome://quicknote/content/quicknote.xhtml") // floating window
			window.blur();
		else 
			return true;
		return false;
	},

	//Testing Print functions -Jed
	Print : function() {
		//floating window
		var re = [];
		window.openDialog("chrome://quicknote/content/qnprint.html", "QN Print","chrome,modal,centerscreen",re,QNqn.getTextareaText(1), QNqn.getTextareaText(2), QNqn.getTextareaText(3), QNqn.getTextareaText(4), QNqn.getTextareaText(5), QNqn.getTextareaText(6));
	},
	////////////////////////////////////////////////////////////////////////////////
	// EnumQNWindows(aCallbackFunction)
	// Desc: looks for open QuickNote windows - one floating window, all the
	//			 instances in sidebar and in tab. For each found window calls
	//							aCallbackFunction(document, type);
	//
	// (document is the XULDocument object, with document.location ==
	//					 'chrome://quicknote/content/quicknote.xul';
	//	type		 is 0 if the enumerated instance is in sidebar,
	//							1 if it is in a floating window,
	//							2 if it is in a tab)
	//			 Further enumeration can be cancelled by returning false from the
	//			 callback function.
	//
	// Returns: false,	if the enumeration was cancelled from callback function,
	//					true,	 otherwise.
	EnumQNWindows : function(aCallbackFunction)
	{
		var qndoc = this.FindQNFloat();
		if(qndoc)
			if(!aCallbackFunction(qndoc, 1))
				return false;

		var windowmanager = Components.classes['@mozilla.org/appshell/window-mediator;1'].getService();
		windowmanager = windowmanager.QueryInterface(Components.interfaces.nsIWindowMediator);

		// Cycle through browser windows looking for QN sidebars & tabs
		var enumerator = windowmanager.getEnumerator('navigator:browser');
		while(enumerator.hasMoreElements())
		{
			var win = enumerator.getNext();
			win = win.QueryInterface(Components.interfaces.nsIDOMWindow);
			var doc = win.document;

			qndoc = this.FindQNSidebar(doc);
			if(qndoc)
				if(!aCallbackFunction(qndoc, 0))
					return false;

			qndoc = this.FindQNTab(doc);
			if(qndoc)
				if(!aCallbackFunction(qndoc, 2))
					return false;
		}
		return true;
	},

	FindQNFloat : function()
	{
		var windowmanager = Components.classes['@mozilla.org/appshell/window-mediator;1'].getService();
		windowmanager = windowmanager.QueryInterface(Components.interfaces.nsIWindowMediator);

		var win = windowmanager.getMostRecentWindow('quicknote:mainwindow');
		if(win) {
			win = win.getInterface(Ci.nsIDOMWindow);
			if(win)
				return win.document;
		}
		return null;
	},

	FindQNSidebar : function(aDoc)
	{
		if(QN_globalvar.qnprefs.getIntPref("autosave", 0)=="-1"){
			QN_globalvar.qnprefs.setBoolPref("sendtext",true)
	 }
		var sidebarBox = aDoc.getElementById('sidebar-box');
		var sidebar,qndoc;
		// Firefox
		if(sidebarBox.getAttribute('sidebarcommand') == 'viewQuickNoteSidebar') {
			sidebar = aDoc.getElementById('sidebar');
			qndoc = sidebar.contentDocument;
			return qndoc;
		}

		// Seamonkey
		if(!this._sidebar_is_hidden(aDoc))
		{
			var sidebarPanels = aDoc.getElementById('sidebar-panels');
			var currentPanel = sidebarPanels.getAttribute('last-selected-panel');
			if(currentPanel.indexOf('chrome://quicknote/content/quicknote.xhtml') >-1)
			{
				sidebar = aDoc.getElementById(currentPanel);
				if(sidebar && (sidebar.localName != 'vbox'))
					sidebar = sidebar.nextSibling;
				if(sidebar) {
					var browser = sidebar.firstChild;
					while(browser) {
						if((browser.localName=='browser') && !browser.hasAttribute('hidden'))
							break;
						browser = browser.nextSibling;
					}
					if(browser) {
						qndoc = browser.contentDocument;
						return qndoc;
					}
				}
			}
		}
		return null;
	},

	FindQNTab : function(aDoc)
	{
		var browser = aDoc.getElementById('content');
		//var tempTab = browser.mTabContainer.firstChild;
		var tempTab = browser.tabs[0];
		var index = 0;
		while (tempTab) {
			if (browser.browsers[index].contentDocument.location=="chrome://quicknote/content/quicknote.xhtml") {
				var qndoc= browser.browsers[index].contentDocument; //qn.xhtml doc.
					return qndoc;
			}
			index ++;
			tempTab = tempTab.nextSibling;
		}
		return null;
//QNqn.QN_Document.getElementById("save"+QN_globalvar.qnprefs.getIntPref("totabint")).disabled=false
	},

	// Helper function for QuickNote_EnumQNWindows [on Seamonkey]
	// copied from Mozilla's sidebarOverlay.js + added a check against Firefox
	_sidebar_is_hidden : function (aDoc) {
		var sidebar_title = aDoc.getElementById('sidebar-title-box');
		if(!sidebar_title) return true;
		var sidebar_box = aDoc.getElementById('sidebar-box');
		return sidebar_box.getAttribute('hidden') == 'true' ||
					 sidebar_title.getAttribute('hidden') == 'true';
	}

};
