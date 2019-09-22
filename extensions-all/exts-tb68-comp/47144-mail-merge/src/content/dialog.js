"use strict";
var { Services } = ChromeUtils.import("resource://gre/modules/Services.jsm");

window.addEventListener("dialogaccept", function(event) { mailmerge.accept(event); });
window.addEventListener("dialogcancel", function(event) { mailmerge.cancel(event); });
window.addEventListener("dialoghelp", function(event) { mailmerge.help(event); });

var gMsgCompose = window.opener.gMsgCompose;

var mailmergeutils = window.opener.mailmergeutils;

var mailmerge = {
	
	load: function() {
		
		var stringbundle = document.getElementById("mailmerge-stringbundle");
		
		if(window.opener.cardbookRepository) { document.getElementById("mailmerge-general-source").add(mailmerge.option(stringbundle.getString("mailmerge.dialog.source.cardbook"), "Cardbook")); }
		document.getElementById("mailmerge-general-source").add(mailmerge.option(stringbundle.getString("mailmerge.dialog.source.addressbook"), "AddressBook"));
		document.getElementById("mailmerge-general-source").add(mailmerge.option(stringbundle.getString("mailmerge.dialog.source.csv"), "CSV"));
		document.getElementById("mailmerge-general-source").add(mailmerge.option(stringbundle.getString("mailmerge.dialog.source.json"), "JSON"));
		document.getElementById("mailmerge-general-source").add(mailmerge.option(stringbundle.getString("mailmerge.dialog.source.xlsx"), "XLSX"));
		
		document.getElementById("mailmerge-general-delivermode").add(mailmerge.option(stringbundle.getString("mailmerge.dialog.delivermode.saveasdraft"), "SaveAsDraft"));
		document.getElementById("mailmerge-general-delivermode").add(mailmerge.option(stringbundle.getString("mailmerge.dialog.delivermode.sendlater"), "Later"));
		document.getElementById("mailmerge-general-delivermode").add(mailmerge.option(stringbundle.getString("mailmerge.dialog.delivermode.sendnow"), "Now"));
		
		document.getElementById("mailmerge-cardbook-addressbook").add(mailmerge.option(stringbundle.getString("mailmerge.dialog.cardbook.addressbooks"), ""));
		if(window.opener.cardbookRepository) { mailmerge.cardbook(); }
		
		document.getElementById("mailmerge-addressbook-addressbook").add(mailmerge.option(stringbundle.getString("mailmerge.dialog.addressbook.addressbooks"), ""));
		mailmerge.addressbook();
		
		document.getElementById("mailmerge-csv-characterset-select").add(mailmerge.option("utf-8", "utf-8"));
		document.getElementById("mailmerge-csv-characterset-select").add(mailmerge.option("utf-16be", "utf-16be"));
		document.getElementById("mailmerge-csv-characterset-select").add(mailmerge.option("utf-16le", "utf-16le"));
		document.getElementById("mailmerge-csv-characterset-select").add(mailmerge.option("iso-8859-1", "iso-8859-1"));
		document.getElementById("mailmerge-csv-characterset-select").add(mailmerge.option("iso-8859-2", "iso-8859-2"));
		document.getElementById("mailmerge-csv-characterset-select").add(mailmerge.option("iso-8859-3", "iso-8859-3"));
		document.getElementById("mailmerge-csv-characterset-select").add(mailmerge.option("iso-8859-4", "iso-8859-4"));
		document.getElementById("mailmerge-csv-characterset-select").add(mailmerge.option("iso-8859-5", "iso-8859-5"));
		document.getElementById("mailmerge-csv-characterset-select").add(mailmerge.option("iso-8859-6", "iso-8859-6"));
		document.getElementById("mailmerge-csv-characterset-select").add(mailmerge.option("iso-8859-7", "iso-8859-7"));
		document.getElementById("mailmerge-csv-characterset-select").add(mailmerge.option("iso-8859-8", "iso-8859-8"));
		document.getElementById("mailmerge-csv-characterset-select").add(mailmerge.option("iso-8859-9", "iso-8859-9"));
		document.getElementById("mailmerge-csv-characterset-select").add(mailmerge.option("iso-8859-10", "iso-8859-10"));
		document.getElementById("mailmerge-csv-characterset-select").add(mailmerge.option("iso-8859-11", "iso-8859-11"));
		document.getElementById("mailmerge-csv-characterset-select").add(mailmerge.option("iso-8859-12", "iso-8859-12"));
		document.getElementById("mailmerge-csv-characterset-select").add(mailmerge.option("iso-8859-13", "iso-8859-13"));
		document.getElementById("mailmerge-csv-characterset-select").add(mailmerge.option("iso-8859-14", "iso-8859-14"));
		document.getElementById("mailmerge-csv-characterset-select").add(mailmerge.option("iso-8859-15", "iso-8859-15"));
		document.getElementById("mailmerge-csv-characterset-select").add(mailmerge.option("iso-8859-16", "iso-8859-16"));
		document.getElementById("mailmerge-csv-characterset-select").add(mailmerge.option("windows-1250", "windows-1250"));
		document.getElementById("mailmerge-csv-characterset-select").add(mailmerge.option("windows-1251", "windows-1251"));
		document.getElementById("mailmerge-csv-characterset-select").add(mailmerge.option("windows-1252", "windows-1252"));
		document.getElementById("mailmerge-csv-characterset-select").add(mailmerge.option("windows-1253", "windows-1253"));
		document.getElementById("mailmerge-csv-characterset-select").add(mailmerge.option("windows-1254", "windows-1254"));
		document.getElementById("mailmerge-csv-characterset-select").add(mailmerge.option("windows-1255", "windows-1255"));
		document.getElementById("mailmerge-csv-characterset-select").add(mailmerge.option("windows-1256", "windows-1256"));
		document.getElementById("mailmerge-csv-characterset-select").add(mailmerge.option("windows-1257", "windows-1257"));
		document.getElementById("mailmerge-csv-characterset-select").add(mailmerge.option("windows-1258", "windows-1258"));
		document.getElementById("mailmerge-csv-characterset-select").add(mailmerge.option("macintosh", "macintosh"));
		document.getElementById("mailmerge-csv-characterset-select").value = "";
		
		document.getElementById("mailmerge-csv-fielddelimiter").add(mailmerge.option(",", ",", stringbundle.getString("mailmerge.dialog.fielddelimiter.comma")));
		document.getElementById("mailmerge-csv-fielddelimiter").add(mailmerge.option(";", ";", stringbundle.getString("mailmerge.dialog.fielddelimiter.semicolon")));
		document.getElementById("mailmerge-csv-fielddelimiter").add(mailmerge.option(":", ":", stringbundle.getString("mailmerge.dialog.fielddelimiter.colon")));
		document.getElementById("mailmerge-csv-fielddelimiter").add(mailmerge.option("Tab", "\t", stringbundle.getString("mailmerge.dialog.fielddelimiter.tab")));
		
		document.getElementById("mailmerge-csv-textdelimiter").add(mailmerge.option("\"", "\"", stringbundle.getString("mailmerge.dialog.textdelimiter.doublequote")));
		document.getElementById("mailmerge-csv-textdelimiter").add(mailmerge.option("\'", "\'", stringbundle.getString("mailmerge.dialog.textdelimiter.singlequote")));
		document.getElementById("mailmerge-csv-textdelimiter").add(mailmerge.option("", "", stringbundle.getString("mailmerge.dialog.textdelimiter.none")));
		
		document.getElementById("mailmerge-sendlater-recur").add(mailmerge.option(stringbundle.getString("mailmerge.dialog.recur.none"), ""));
		document.getElementById("mailmerge-sendlater-recur").add(mailmerge.option(stringbundle.getString("mailmerge.dialog.recur.minutely"), "minutely"));
		document.getElementById("mailmerge-sendlater-recur").add(mailmerge.option(stringbundle.getString("mailmerge.dialog.recur.daily"), "daily"));
		document.getElementById("mailmerge-sendlater-recur").add(mailmerge.option(stringbundle.getString("mailmerge.dialog.recur.weekly"), "weekly"));
		document.getElementById("mailmerge-sendlater-recur").add(mailmerge.option(stringbundle.getString("mailmerge.dialog.recur.monthly"), "monthly"));
		document.getElementById("mailmerge-sendlater-recur").add(mailmerge.option(stringbundle.getString("mailmerge.dialog.recur.yearly"), "yearly"));
		
		document.getElementById("mailmerge-sendlater-only").add(mailmerge.option(stringbundle.getString("mailmerge.dialog.only.sunday"), "0"));
		document.getElementById("mailmerge-sendlater-only").add(mailmerge.option(stringbundle.getString("mailmerge.dialog.only.monday"), "1"));
		document.getElementById("mailmerge-sendlater-only").add(mailmerge.option(stringbundle.getString("mailmerge.dialog.only.tuesday"), "2"));
		document.getElementById("mailmerge-sendlater-only").add(mailmerge.option(stringbundle.getString("mailmerge.dialog.only.wednesday"), "3"));
		document.getElementById("mailmerge-sendlater-only").add(mailmerge.option(stringbundle.getString("mailmerge.dialog.only.thursday"), "4"));
		document.getElementById("mailmerge-sendlater-only").add(mailmerge.option(stringbundle.getString("mailmerge.dialog.only.friday"), "5"));
		document.getElementById("mailmerge-sendlater-only").add(mailmerge.option(stringbundle.getString("mailmerge.dialog.only.saturday"), "6"));
		
		mailmerge.init();
		
	},
	
	unload: function() {
		
	},
	
	init: function() {
		
		var prefs = Services.prefs.getBranch("extensions.mailmerge.");
		
		document.getElementById("mailmerge-general-source").value = prefs.getStringPref("source");
		document.getElementById("mailmerge-general-delivermode").value = prefs.getStringPref("delivermode");
		document.getElementById("mailmerge-general-attachments").value = prefs.getStringPref("attachments");
		document.getElementById("mailmerge-cardbook-addressbook").value = prefs.getStringPref("cardbook");
		document.getElementById("mailmerge-addressbook-addressbook").value = prefs.getStringPref("addressbook");
		document.getElementById("mailmerge-csv-file").value = prefs.getStringPref("csv");
		document.getElementById("mailmerge-csv-characterset").value = prefs.getStringPref("characterset");
		document.getElementById("mailmerge-csv-fielddelimiter").value = prefs.getStringPref("fielddelimiter");
		document.getElementById("mailmerge-csv-textdelimiter").value = prefs.getStringPref("textdelimiter");
		document.getElementById("mailmerge-json-file").value = prefs.getStringPref("json");
		document.getElementById("mailmerge-xlsx-file").value = prefs.getStringPref("xlsx");
		document.getElementById("mailmerge-xlsx-sheetname").value = prefs.getStringPref("sheetname");
		document.getElementById("mailmerge-batch-start").value = prefs.getStringPref("start");
		document.getElementById("mailmerge-batch-stop").value = prefs.getStringPref("stop");
		document.getElementById("mailmerge-batch-pause").value = prefs.getStringPref("pause");
		document.getElementById("mailmerge-sendlater-at").value = prefs.getStringPref("at");
		document.getElementById("mailmerge-sendlater-recur").value = prefs.getStringPref("recur");
		document.getElementById("mailmerge-sendlater-every").value = prefs.getStringPref("every");
		document.getElementById("mailmerge-sendlater-between").value = prefs.getStringPref("between");
		//document.getElementById("mailmerge-sendlater-only").value = prefs.getStringPref("only");
		
		mailmerge.select();
		
		document.getElementById("mailmerge-general-attachments-checkbox").checked = prefs.getStringPref("attachments");
		document.getElementById("mailmerge-xlsx-sheetname-checkbox").checked = prefs.getStringPref("sheetname");
		document.getElementById("mailmerge-batch-start-checkbox").checked = prefs.getStringPref("start");
		document.getElementById("mailmerge-batch-stop-checkbox").checked = prefs.getStringPref("stop");
		document.getElementById("mailmerge-batch-pause-checkbox").checked = prefs.getStringPref("pause");
		document.getElementById("mailmerge-sendlater-at-checkbox").checked = prefs.getStringPref("at");
		document.getElementById("mailmerge-sendlater-recur-checkbox").checked = prefs.getStringPref("recur");
		document.getElementById("mailmerge-sendlater-every-checkbox").checked = prefs.getStringPref("every");
		document.getElementById("mailmerge-sendlater-between-checkbox").checked = prefs.getStringPref("between");
		document.getElementById("mailmerge-sendlater-only-checkbox").checked = prefs.getStringPref("only");
		
		mailmerge.checkbox();
		
		for(var i = 0; i < 7; i++) {
			
			document.getElementById("mailmerge-sendlater-only").options[i].selected = prefs.getStringPref("only").includes(i);
			
		}
		
	},
	
	accept: function(event) {
		
		/* delivermodewarning start */
		if(document.getElementById("mailmerge-general-delivermode").value == "Now") {
			
			var bundle = document.getElementById("mailmerge-stringbundle");
			var flags = (Services.prompt.BUTTON_TITLE_IS_STRING * Services.prompt.BUTTON_POS_0) + (Services.prompt.BUTTON_TITLE_IS_STRING * Services.prompt.BUTTON_POS_1);
			var check = { value : false };
			
			switch(Services.prompt.confirmEx(
				window,
				bundle.getString("mailmerge.dialog.delivermodewarning.title"),
				bundle.getString("mailmerge.dialog.delivermodewarning.message"),
				flags,
				bundle.getString("mailmerge.dialog.delivermodewarning.send"),
				bundle.getString("mailmerge.dialog.delivermodewarning.cancel"),
				null,
				null,
				check))
			{
				
				case 0:
					
					//prefs.setBoolPref("delivermodewarning", !check.value);
					break;
					
				case 1:
					
					//prefs.setBoolPref("delivermodewarning", !check.value);
					event.stopPropagation();
					event.preventDefault();
					return;
					
				default:;
				
			}
			
		}
		/* delivermodewarning end */
		
		if(mailmergeutils.init(mailmerge.prefs())) {
			
			var prefs = Services.prefs.getBranch("extensions.mailmerge.");
			
			prefs.setStringPref("source", mailmergeutils.prefs.source);
			prefs.setStringPref("delivermode", mailmergeutils.prefs.delivermode);
			prefs.setStringPref("attachments", mailmergeutils.prefs.attachments);
			prefs.setStringPref("cardbook", mailmergeutils.prefs.cardbook);
			prefs.setStringPref("addressbook", mailmergeutils.prefs.addressbook);
			prefs.setStringPref("csv", mailmergeutils.prefs.csv);
			prefs.setStringPref("characterset", mailmergeutils.prefs.characterset);
			prefs.setStringPref("fielddelimiter", mailmergeutils.prefs.fielddelimiter);
			prefs.setStringPref("textdelimiter", mailmergeutils.prefs.textdelimiter);
			prefs.setStringPref("json", mailmergeutils.prefs.json);
			prefs.setStringPref("xlsx", mailmergeutils.prefs.xlsx);
			prefs.setStringPref("sheetname", mailmergeutils.prefs.sheetname);
			prefs.setStringPref("start", mailmergeutils.prefs.start);
			prefs.setStringPref("stop", mailmergeutils.prefs.stop);
			prefs.setStringPref("pause", mailmergeutils.prefs.pause);
			prefs.setStringPref("at", mailmergeutils.prefs.at);
			prefs.setStringPref("recur", mailmergeutils.prefs.recur);
			prefs.setStringPref("every", mailmergeutils.prefs.every);
			prefs.setStringPref("between", mailmergeutils.prefs.between);
			prefs.setStringPref("only", mailmergeutils.prefs.only);
			
			window.arguments[0].accept = true;
			return;
			
		} else {
			
			event.preventDefault();
			return;
			
		}
		
	},
	
	cancel: function(event) {
		
	},
	
	help: function(event) {
		
		window.openDialog("chrome://mailmerge/content/about.xul", "_blank", "chrome,dialog,modal,centerscreen", null);
		
	},
	
	option: function(text, value) {
		
		var option = document.createElementNS('http://www.w3.org/1999/xhtml', 'option');
		
		option.text = text;
		option.value = value;
		
		return option;
		
	},
	
	cardbook: function() {
		
		var accounts = window.opener.cardbookRepository.cardbookAccounts;
		for(var j = 0; j < accounts.length; j++) {
			
			var account = accounts[j];
			if(account[1] && account[5] && account[6] != "SEARCH") {
				
				document.getElementById("mailmerge-cardbook-addressbook").add(mailmerge.option(account[0], account[4]));
				
			}
			
		}
		
	},
	
	addressbook: function() {
		
		var addressbooks = Cc["@mozilla.org/abmanager;1"].getService(Ci.nsIAbManager).directories;
		while(addressbooks.hasMoreElements()) {
			
			try {
				
				var addressbook = addressbooks.getNext();
				addressbook.QueryInterface(Ci.nsIAbDirectory);
				
				addressbook.getCardFromProperty("PrimaryEmail", "", false);
				
				document.getElementById("mailmerge-addressbook-addressbook").add(mailmerge.option(addressbook.dirName, addressbook.uuid));
				
			} catch(e) { console.warn(e); }
			
		}
		
	},
	
	browse: function(target) {
		
		if(target == "CSV") {
			
			var filePicker = Cc["@mozilla.org/filepicker;1"].createInstance(Ci.nsIFilePicker);
			filePicker.init(window, "Mail Merge", Ci.nsIFilePicker.modeOpen);
			filePicker.appendFilter("CSV", "*.csv");
			filePicker.appendFilter("*", "*.*");
			
			filePicker.open(rv => {
				
				if(rv == Ci.nsIFilePicker.returnOK) {
					document.getElementById("mailmerge-csv-file").value = filePicker.file.path;
				}
				
			});
			
		}
		
		if(target == "JSON") {
			
			var filePicker = Cc["@mozilla.org/filepicker;1"].createInstance(Ci.nsIFilePicker);
			filePicker.init(window, "Mail Merge", Ci.nsIFilePicker.modeOpen);
			filePicker.appendFilter("JSON", "*.json");
			filePicker.appendFilter("*", "*.*");
			
			filePicker.open(rv => {
				
				if(rv == Ci.nsIFilePicker.returnOK) {
					document.getElementById("mailmerge-json-file").value = filePicker.file.path;
				}
				
			});
			
		}
		
		if(target == "XLSX") {
			
			var filePicker = Cc["@mozilla.org/filepicker;1"].createInstance(Ci.nsIFilePicker);
			filePicker.init(window, "Mail Merge", Ci.nsIFilePicker.modeOpen);
			filePicker.appendFilter("Spreadsheet", "*.xlsx; *.xls; *.ods; *.csv");
			filePicker.appendFilter("Microsoft Excel", "*.xlsx; *.xls");
			filePicker.appendFilter("LibreOffice", "*.ods");
			filePicker.appendFilter("CSV", "*.csv");
			filePicker.appendFilter("*", "*.*");
			
			filePicker.open(rv => {
				
				if(rv == Ci.nsIFilePicker.returnOK) {
					document.getElementById("mailmerge-xlsx-file").value = filePicker.file.path;
				}
				
			});
			
		}
		
	},
	
	preview: function(target) {
		
		if(target == "CSV") {
			
			var params = {
				
				file: document.getElementById("mailmerge-csv-file").value,
				characterset: document.getElementById("mailmerge-csv-characterset").value,
				fielddelimiter: document.getElementById("mailmerge-csv-fielddelimiter").value,
				textdelimiter: document.getElementById("mailmerge-csv-textdelimiter").value
				
			}
			
			var json = mailmergeutils.csv(params);
			if(Array.isArray(json)) {
				
				var params = { type: "FILE", json: json }
				window.openDialog("chrome://mailmerge/content/preview.xul", "_blank", "chrome,dialog,modal,centerscreen", params);
				
			}
			
		}
		
		if(target == "JSON") {
			
			var params = {
				
				file: document.getElementById("mailmerge-json-file").value
				
			}
			
			var json = mailmergeutils.json(params);
			if(Array.isArray(json)) {
				
				var params = { type: "FILE", json: json }
				window.openDialog("chrome://mailmerge/content/preview.xul", "_blank", "chrome,dialog,modal,centerscreen", params);
				
			}
			
		}
		
		if(target == "XLSX") {
			
			var params = {
				
				file: document.getElementById("mailmerge-xlsx-file").value,
				sheetname: document.getElementById("mailmerge-xlsx-sheetname").value
				
			}
			
			var json = mailmergeutils.xlsx(params);
			if(Array.isArray(json)) {
				
				var params = { type: "FILE", json: json }
				window.openDialog("chrome://mailmerge/content/preview.xul", "_blank", "chrome,dialog,modal,centerscreen", params);
				
			}
			
		}
		
		if(target == "MESSAGE") {
			
			if(mailmergeutils.init(mailmerge.prefs())) {
				
				var params = { type: "MESSAGE" }
				window.openDialog("chrome://mailmerge/content/preview.xul", "_blank", "chrome,dialog,modal,centerscreen", params);
				
			}
			
		}
		
	},
	
	reset: function() {
		
		var prefs = Services.prefs.getBranch("extensions.mailmerge.");
		
		prefs.clearUserPref("source");
		prefs.clearUserPref("delivermode");
		prefs.clearUserPref("attachments");
		prefs.clearUserPref("cardbook");
		prefs.clearUserPref("addressbook");
		prefs.clearUserPref("csv");
		prefs.clearUserPref("characterset");
		prefs.clearUserPref("fielddelimiter");
		prefs.clearUserPref("textdelimiter");
		prefs.clearUserPref("json");
		prefs.clearUserPref("xlsx");
		prefs.clearUserPref("sheetname");
		prefs.clearUserPref("start");
		prefs.clearUserPref("stop");
		prefs.clearUserPref("pause");
		prefs.clearUserPref("at");
		prefs.clearUserPref("recur");
		prefs.clearUserPref("every");
		prefs.clearUserPref("between");
		prefs.clearUserPref("only");
		
		mailmerge.init();
		
	},
	
	select: function() {
		
		document.getElementById('mailmerge-content').style.height = "auto";
		
		document.getElementById("mailmerge-cardbook").hidden = !(document.getElementById("mailmerge-general-source").value == "Cardbook");
		document.getElementById("mailmerge-addressbook").hidden = !(document.getElementById("mailmerge-general-source").value == "AddressBook");
		document.getElementById("mailmerge-csv").hidden = !(document.getElementById("mailmerge-general-source").value == "CSV");
		document.getElementById("mailmerge-json").hidden = !(document.getElementById("mailmerge-general-source").value == "JSON");
		document.getElementById("mailmerge-xlsx").hidden = !(document.getElementById("mailmerge-general-source").value == "XLSX");
		
		document.getElementById("mailmerge-sendlater").hidden = !(document.getElementById("mailmerge-general-delivermode").value == "SaveAsDraft" && window.opener.Sendlater3Util);
		
		window.sizeToContent();
		document.getElementById('mailmerge-content').style.height = Math.min(Math.max(150, document.getElementById('mailmerge-content').clientHeight), screen.availHeight - 150) + "px";
		window.sizeToContent();
		
	},
	
	checkbox: function() {
		
		document.getElementById('mailmerge-general-attachments').disabled = !(document.getElementById('mailmerge-general-attachments-checkbox').checked);
		document.getElementById('mailmerge-xlsx-sheetname').disabled = !(document.getElementById('mailmerge-xlsx-sheetname-checkbox').checked);
		document.getElementById('mailmerge-batch-start').disabled = !(document.getElementById('mailmerge-batch-start-checkbox').checked);
		document.getElementById('mailmerge-batch-stop').disabled = !(document.getElementById('mailmerge-batch-stop-checkbox').checked);
		document.getElementById('mailmerge-batch-pause').disabled = !(document.getElementById('mailmerge-batch-pause-checkbox').checked);
		document.getElementById('mailmerge-sendlater-at').disabled = !(document.getElementById('mailmerge-sendlater-at-checkbox').checked);
		document.getElementById('mailmerge-sendlater-recur').disabled = !(document.getElementById('mailmerge-sendlater-recur-checkbox').checked);
		document.getElementById('mailmerge-sendlater-every').disabled = !(document.getElementById('mailmerge-sendlater-every-checkbox').checked);
		document.getElementById('mailmerge-sendlater-between').disabled = !(document.getElementById('mailmerge-sendlater-between-checkbox').checked);
		document.getElementById('mailmerge-sendlater-only').disabled = !(document.getElementById('mailmerge-sendlater-only-checkbox').checked);
		
	},
	
	prefs: function() {
		
		var prefs = {};
		
		prefs.source = document.getElementById("mailmerge-general-source").value;
		prefs.delivermode = document.getElementById("mailmerge-general-delivermode").value;
		prefs.attachments = (document.getElementById("mailmerge-general-attachments-checkbox").checked) ? document.getElementById("mailmerge-general-attachments").value : "";
		prefs.cardbook = document.getElementById("mailmerge-cardbook-addressbook").value;
		prefs.addressbook = document.getElementById("mailmerge-addressbook-addressbook").value;
		prefs.csv = document.getElementById("mailmerge-csv-file").value;
		prefs.characterset = document.getElementById("mailmerge-csv-characterset").value;
		prefs.fielddelimiter = document.getElementById("mailmerge-csv-fielddelimiter").value;
		prefs.textdelimiter = document.getElementById("mailmerge-csv-textdelimiter").value;
		prefs.json = document.getElementById("mailmerge-json-file").value;
		prefs.xlsx = document.getElementById("mailmerge-xlsx-file").value;
		prefs.sheetname = (document.getElementById("mailmerge-xlsx-sheetname-checkbox").checked) ? document.getElementById("mailmerge-xlsx-sheetname").value : "";
		prefs.start = (document.getElementById("mailmerge-batch-start-checkbox").checked) ? document.getElementById("mailmerge-batch-start").value : "";
		prefs.stop = (document.getElementById("mailmerge-batch-stop-checkbox").checked) ? document.getElementById("mailmerge-batch-stop").value : "";
		prefs.pause = (document.getElementById("mailmerge-batch-pause-checkbox").checked) ? document.getElementById("mailmerge-batch-pause").value : "";
		prefs.at = (document.getElementById("mailmerge-sendlater-at-checkbox").checked) ? document.getElementById("mailmerge-sendlater-at").value : "";
		prefs.recur = (document.getElementById("mailmerge-sendlater-recur-checkbox").checked) ? document.getElementById("mailmerge-sendlater-recur").value : "";
		prefs.every = (document.getElementById("mailmerge-sendlater-every-checkbox").checked) ? document.getElementById("mailmerge-sendlater-every").value : "";
		prefs.between = (document.getElementById("mailmerge-sendlater-between-checkbox").checked) ? document.getElementById("mailmerge-sendlater-between").value : "";
		//prefs.only = (document.getElementById("mailmerge-sendlater-only-checkbox").checked) ? document.getElementById("mailmerge-sendlater-only").value : "";
		
		var only = [];
		if(document.getElementById("mailmerge-sendlater-only-checkbox").checked) {
			
			for(var i = 0; i < 7; i++) {
				
				if(document.getElementById("mailmerge-sendlater-only").options[i].selected) {
					only.push(i);
				}
				
			}
			
		}
		prefs.only = only.join(" ");
		
		return prefs;
		
	}
	
}
