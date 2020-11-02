"use strict";
var { Services } = ChromeUtils.import("resource://gre/modules/Services.jsm");
var { MailServices } = ChromeUtils.import("resource:///modules/MailServices.jsm");
var { AddonManager } = ChromeUtils.import("resource://gre/modules/AddonManager.jsm");
var { jsmime } = ChromeUtils.import("resource:///modules/jsmime.jsm");

function load(win) {
	
	this.win = win;
	
}

function unload(win) {
	
}

function template() {
	
	win.mailmergeutils.template.identity = win.gMsgCompose.identity;
	
	win.mailmergeutils.template.format = win.DetermineHTMLAction(win.DetermineConvertibility());
	
	win.mailmergeutils.template.from = win.gMsgCompose.compFields.from;
	win.mailmergeutils.template.to = win.gMsgCompose.compFields.to;
	win.mailmergeutils.template.cc = win.gMsgCompose.compFields.cc;
	win.mailmergeutils.template.bcc = win.gMsgCompose.compFields.bcc;
	win.mailmergeutils.template.reply = win.gMsgCompose.compFields.replyTo;
	win.mailmergeutils.template.subject = win.gMsgCompose.compFields.subject;
	win.mailmergeutils.template.body = win.gMsgCompose.compFields.body;
	
	win.mailmergeutils.template.attachments = [];
	
	let attachments = win.gMsgCompose.compFields.attachments;
	while(attachments.hasMoreElements()) {
		
		try {
			
			let attachment = attachments.getNext();
			attachment.QueryInterface(Ci.nsIMsgAttachment);
			
			win.mailmergeutils.template.attachments.push(attachment);
			
		} catch(e) { console.warn(e); }
		
	}
	
	AddonManager.getAddonByID("cardbook@vigneau.philippe").then(addon => {
		win.mailmergeutils.template.cardbook = (addon && addon.isActive) ? true : false;
	});
	
	AddonManager.getAddonByID("sendlater3@kamens.us").then(addon => {
		win.mailmergeutils.template.sendlater = (addon && addon.isActive) ? true : false;
	});
	
}

function init(prefs) {
	
	/* prefs start */
	win.mailmergeutils.prefs = prefs;
	/* prefs end */
	
	/* objects start */
	win.mailmergeutils.objects = [];
	/* objects end */
	
	/* source start */
	let params, json, objects;
	switch(win.mailmergeutils.prefs.source) {
		
		case "Cardbook":
			
			objects = win.mailmergeutils.cardbook();
			if(!Array.isArray(objects)) { return false; }
			
			win.mailmergeutils.objects = objects;
			break;
			
		case "AddressBook":
			
			objects = win.mailmergeutils.addressbook();
			if(!Array.isArray(objects)) { return false; }
			
			win.mailmergeutils.objects = objects;
			break;
			
		case "CSV":
			
			params = {
				
				file: win.mailmergeutils.prefs.csv,
				characterset: win.mailmergeutils.prefs.characterset,
				fielddelimiter: win.mailmergeutils.prefs.fielddelimiter,
				textdelimiter: win.mailmergeutils.prefs.textdelimiter
				
			}
			
			json = win.mailmergeutils.csv(params);
			if(!Array.isArray(json)) { return false; }
			
			objects = win.mailmergeutils.array(json);
			if(!Array.isArray(objects)) { return false; }
			
			win.mailmergeutils.objects = objects;
			break;
			
		case "JSON":
			
			params = {
				
				file: win.mailmergeutils.prefs.json
				
			}
			
			json = win.mailmergeutils.json(params);
			if(!Array.isArray(json)) { return false; }
			
			objects = win.mailmergeutils.array(json);
			if(!Array.isArray(objects)) { return false; }
			
			win.mailmergeutils.objects = objects;
			break;
			
		case "XLSX":
			
			params = {
				
				file: win.mailmergeutils.prefs.xlsx,
				sheetname: win.mailmergeutils.prefs.sheetname
				
			}
			
			json = win.mailmergeutils.xlsx(params);
			if(!Array.isArray(json)) { return false; }
			
			objects = win.mailmergeutils.array(json);
			if(!Array.isArray(objects)) { return false; }
			
			win.mailmergeutils.objects = objects;
			break;
			
		default:;
		
	}
	/* source end */
	
	/* stop start */
	let stop = (win.mailmergeutils.prefs.stop == "") ? win.mailmergeutils.objects.length : win.mailmergeutils.prefs.stop;
	win.mailmergeutils.objects.splice(stop);
	/* stop end */
	
	/* start start */
	let start = (win.mailmergeutils.prefs.start == "") ? 1 : win.mailmergeutils.prefs.start;
	win.mailmergeutils.objects.splice(0, start - 1);
	/* start end */
	
	return true;
	
}

function cardbook() {
	
	let objects = [];
	
	/* to start */
	let to = win.mailmergeutils.template.to;
	to = jsmime.headerparser.decodeRFC2047Words(to);
	to = win.gMsgCompose.compFields.splitRecipients(to, false, {});
	/* to end */
	
	/* array start */
	for(let i = 0; i < to.length; i++) {
		
		if(to[i].includes("{{") && to[i].includes("}}")) {
			
			/* cardbook start */
			try {
				
				let accounts = win.cardbookRepository.cardbookAccounts;
				for(let j = 0; j < accounts.length; j++) {
					
					let account = accounts[j];
					if(account[1] && account[5] && account[6] != "SEARCH") {
						
						if(win.mailmergeutils.prefs.cardbook && win.mailmergeutils.prefs.cardbook != account[4]) { continue; }
						
						let cards = (win.cardbookRepository.cardbookDisplayCards[account[4]].cards || win.cardbookRepository.cardbookDisplayCards[account[4]]);
						for(let k = 0; k < cards.length; k++) {
							
							let recipient = to[i];
							recipient = recipient.replace(new RegExp(' <>', 'g'), '');
							recipient = win.mailmergeutils.substitute(recipient, cards[k]);
							
							if(recipient.includes("@")) {
								
								objects.push({ to: recipient, object: cards[k] });
								
							}
							
						}
						
					}
					
				}
				
			} catch(e) {
				
				win.mailmergeutils.error(e);
				return false;
				
			}
			/* cardbook end */
			
		}
		
		if(to[i].includes("@")) {
			
			let objPattern = new RegExp("\\s*(?:(.*) <(.*)>|(.*))\\s*", "g");
			let arrMatches = objPattern.exec(to[i]);
			arrMatches = (arrMatches[2] || arrMatches[3]);
			
			let card;
			
			/* cardbook start */
			try {
				
				let accounts = win.cardbookRepository.cardbookAccounts;
				for(let j = 0; j < accounts.length; j++) {
					
					let account = accounts[j];
					if(account[1] && account[5] && account[6] != "SEARCH") {
						
						if(win.mailmergeutils.prefs.cardbook && win.mailmergeutils.prefs.cardbook != account[4]) { continue; }
						
						let cards = (win.cardbookRepository.cardbookDisplayCards[account[4]].cards || win.cardbookRepository.cardbookDisplayCards[account[4]]);
						
						card = cards.filter(function(element) { for(let i = 0; i < element.email.length; i++) { if(element.email[i][0][0].toLowerCase() == arrMatches.toLowerCase()) { return true; } } })[0];
						if(card) { break; }
						
					}
					
				}
				
			} catch(e) {
				
				win.mailmergeutils.error(e);
				return false;
				
			}
			/* cardbook end */
			
			objects.push({ to: to[i], object: card });
			
		}
		
	}
	/* array end */
	
	return objects;
	
}

function addressbook() {
	
	let objects = [];
	
	/* to start */
	let to = win.mailmergeutils.template.to;
	to = jsmime.headerparser.decodeRFC2047Words(to);
	to = win.gMsgCompose.compFields.splitRecipients(to, false, {});
	/* to end */
	
	/* array start */
	for(let i = 0; i < to.length; i++) {
		
		if(to[i].includes("{{") && to[i].includes("}}")) {
			
			/* addressbook start */
			try {
				
				let addressbooks = Cc["@mozilla.org/abmanager;1"].getService(Ci.nsIAbManager).directories;
				while(addressbooks.hasMoreElements()) {
					
					try {
						
						let addressbook = addressbooks.getNext();
						addressbook.QueryInterface(Ci.nsIAbDirectory);
						
						if(win.mailmergeutils.prefs.addressbook && win.mailmergeutils.prefs.addressbook != addressbook.uuid) { continue; }
						
						let cards = addressbook.childCards;
						while(cards.hasMoreElements()) {
							
							let card = cards.getNext();
							card.QueryInterface(Ci.nsIAbCard);
							
							if(card.isMailList) { continue; }
							
							let recipient = to[i];
							recipient = recipient.replace(new RegExp(' <>', 'g'), '');
							recipient = win.mailmergeutils.substitute(recipient, card);
							
							if(recipient.includes("@")) {
								
								objects.push({ to: recipient, object: card });
								
							}
							
						}
						
					} catch(e) { console.warn(e); }
					
				}
				
			} catch(e) {
				
				win.mailmergeutils.error(e);
				return false;
				
			}
			/* addressbook end */
			
		}
		
		if(to[i].includes("@")) {
			
			let objPattern = new RegExp("\\s*(?:(.*) <(.*)>|(.*))\\s*", "g");
			let arrMatches = objPattern.exec(to[i]);
			arrMatches = (arrMatches[2] || arrMatches[3]);
			
			let card;
			
			/* addressbook start */
			try {
				
				let addressbooks = Cc["@mozilla.org/abmanager;1"].getService(Ci.nsIAbManager).directories;
				while(addressbooks.hasMoreElements()) {
					
					try {
						
						let addressbook = addressbooks.getNext();
						addressbook.QueryInterface(Ci.nsIAbDirectory);
						
						if(win.mailmergeutils.prefs.addressbook && win.mailmergeutils.prefs.addressbook != addressbook.uuid) { continue; }
						
						card = addressbook.getCardFromProperty("PrimaryEmail", arrMatches, false);
						if(card) { break; }
						
					} catch(e) { console.warn(e); }
					
				}
				
			} catch(e) {
				
				win.mailmergeutils.error(e);
				return false;
				
			}
			/* addressbook end */
			
			objects.push({ to: to[i], object: card });
			
		}
		
	}
	/* array end */
	
	return objects;
	
}

function csv(params) {
	
	let json, bytes = "";
	
	/* file start */
	try {
		
		/* compatibility start */
		params.file = params.file.trim().replace(/^file\:\/\//g, '');
		/* compatibility end */
		
		let file = Cc["@mozilla.org/file/local;1"].createInstance(Ci.nsIFile);
		file.initWithPath(params.file);
		
		let fileInputStream = Cc["@mozilla.org/network/file-input-stream;1"].createInstance(Ci.nsIFileInputStream);
		fileInputStream.init(file, -1, 0, 0);
		
		let converterInputStream = Cc["@mozilla.org/intl/converter-input-stream;1"].createInstance(Ci.nsIConverterInputStream);
		converterInputStream.init(fileInputStream, params.characterset, 0, 0);
		
		let string = {};
		while(converterInputStream.readString(4096, string) != 0) {
			bytes += string.value;
		}
		
	} catch(e) {
		
		win.mailmergeutils.error(e);
		return false;
		
	}
	/* file end */
	
	/* csv start */
	try {
		
		json = win.mailmergeutils.parse(bytes, params.fielddelimiter, params.textdelimiter);
		
	} catch(e) {
		
		win.mailmergeutils.error(e);
		return false;
		
	}
	/* csv end */
	
	return json;
	
}

function json(params) {
	
	let json, bytes = "";
	
	/* file start */
	try {
		
		/* compatibility start */
		params.file = params.file.trim().replace(/^file\:\/\//g, '');
		/* compatibility end */
		
		let file = Cc["@mozilla.org/file/local;1"].createInstance(Ci.nsIFile);
		file.initWithPath(params.file);
		
		let fileInputStream = Cc["@mozilla.org/network/file-input-stream;1"].createInstance(Ci.nsIFileInputStream);
		fileInputStream.init(file, -1, 0, 0);
		
		let converterInputStream = Cc["@mozilla.org/intl/converter-input-stream;1"].createInstance(Ci.nsIConverterInputStream);
		converterInputStream.init(fileInputStream, "utf-8", 0, 0);
		
		let string = {};
		while(converterInputStream.readString(4096, string) != 0) {
			bytes += string.value;
		}
		
	} catch(e) {
		
		win.mailmergeutils.error(e);
		return false;
		
	}
	/* file end */
	
	/* json start */
	try {
		
		json = JSON.parse(bytes);
		json = (Array.isArray(json)) ? json : [[]];
		
	} catch(e) {
		
		win.mailmergeutils.error(e);
		return false;
		
	}
	/* json end */
	
	return json;
	
}

function xlsx(params) {
	
	let json, bytes = "";
	
	/* file start */
	try {
		
		/* compatibility start */
		params.file = params.file.trim().replace(/^file\:\/\//g, '');
		/* compatibility end */
		
		let file = Cc["@mozilla.org/file/local;1"].createInstance(Ci.nsIFile);
		file.initWithPath(params.file);
		
		let fileInputStream = Cc["@mozilla.org/network/file-input-stream;1"].createInstance(Ci.nsIFileInputStream);
		fileInputStream.init(file, -1, -1, false);
		
		let binaryInputStream = Cc["@mozilla.org/binaryinputstream;1"].createInstance(Ci.nsIBinaryInputStream);
		binaryInputStream.setInputStream(fileInputStream);
		
		bytes = binaryInputStream.readBytes(binaryInputStream.available());
		
	} catch(e) {
		
		win.mailmergeutils.error(e);
		return false;
		
	}
	/* file end */
	
	/* xlsx start */
	try {
		
		Services.scriptloader.loadSubScript("chrome://mailmerge/content/xlsx.core.min.js");
		
		let workbook = XLSX.read(bytes, { type: "binary" });
		let sheet = workbook.Sheets[(params.sheetname || workbook.SheetNames[0])];
		json = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: "", raw: false });
		
	} catch(e) {
		
		win.mailmergeutils.error(e);
		return false;
		
	}
	/* xlsx end */
	
	return json;
	
}

function array(json) {
	
	let objects = [];
	
	/* array start */
	for(let i = 1; i < json.length; i++) {
		
		/* object start */
		let object = [];
		for(let j = 0; j < json[0].length; j++) {
			
			if(json[0][j] == "") { continue; }
			object[json[0][j]] = (json[i][j] === undefined || json[i][j] === null) ? "" : json[i][j].toString();
			
		}
		/* object end */
		
		/* to start */
		let to = win.mailmergeutils.template.to;
		to = jsmime.headerparser.decodeRFC2047Words(to);
		to = win.mailmergeutils.substitute(to, object);
		/* to end */
		
		if(to.includes("@")) {
			
			objects.push({ to: to, object: object });
			
		}
		
	}
	/* array end */
	
	return objects;
	
}

function parse(string, fielddelimiter, textdelimiter) {
	
	/*
		Thanks to Ben Nadel
		http://www.bennadel.com/
	*/
	
	/*
		/(^|,|\r\n|\r|\n)(?:["]([^"]*(?:["]["][^"]*)*)["]|([^,"\r\n]*))/g
		/(^|,|\r\n|\r|\n)(?:[']([^']*(?:[']['][^']*)*)[']|([^,'\r\n]*))/g
		
		/(^|;|\r\n|\r|\n)(?:["]([^"]*(?:["]["][^"]*)*)["]|([^;"\r\n]*))/g
		/(^|;|\r\n|\r|\n)(?:[']([^']*(?:[']['][^']*)*)[']|([^;'\r\n]*))/g
		
		/(^|:|\r\n|\r|\n)(?:["]([^"]*(?:["]["][^"]*)*)["]|([^:"\r\n]*))/g
		/(^|:|\r\n|\r|\n)(?:[']([^']*(?:[']['][^']*)*)[']|([^:'\r\n]*))/g
	*/
	
	/* compatibility start */
	if(string == "") { return [[]]; }
	/* compatibility end */
	
	let objPattern = new RegExp("(\r\n|\r|\n|" + fielddelimiter + "|^)(?:[" + textdelimiter + "]([^" + textdelimiter + "]*(?:[" + textdelimiter + "][" + textdelimiter + "][^" + textdelimiter + "]*)*)[" + textdelimiter + "]|([^" + fielddelimiter + textdelimiter + "\r\n]*))", "g");
	
	let arrData = [], arrMatches = [];
	while(arrMatches = objPattern.exec(string)) {
		
		let strMatchedValue = "";
		
		if(arrMatches[1] == fielddelimiter && arrMatches.index == 0) {
			arrData.push([]);
			arrData[arrData.length - 1].push(strMatchedValue);
		}
		
		if(arrMatches[1] != fielddelimiter) {
			arrData.push([]);
		}
		
		if(arrMatches[2]) {
			strMatchedValue = arrMatches[2].replace(new RegExp(textdelimiter + textdelimiter, "g"), textdelimiter);
		}
		
		if(arrMatches[3]) {
			strMatchedValue = arrMatches[3];
		}
		
		arrData[arrData.length - 1].push(strMatchedValue);
		
	}
	
	/* compatibility start */
	for(let row = 0; row < arrData[0].length; row++) {
		
		arrData[0][row] = arrData[0][row].replace(new RegExp('[{]', 'g'), '');
		arrData[0][row] = arrData[0][row].replace(new RegExp('[|]', 'g'), '');
		arrData[0][row] = arrData[0][row].replace(new RegExp('[}]', 'g'), '');
		
	}
	/* compatibility end */
	
	return arrData;
	
}

function compose(index) {
	
	if(!win.mailmergeutils.objects[index]) { return false; }
	
	/* object start */
	let object = win.mailmergeutils.objects[index].object;
	/* object end */
	
	/* compfields start */
	let compFields = Cc["@mozilla.org/messengercompose/composefields;1"].createInstance(Ci.nsIMsgCompFields);
	/* compfields end */
	
	/* composeparams start */
	let composeParams = Cc["@mozilla.org/messengercompose/composeparams;1"].createInstance(Ci.nsIMsgComposeParams);
	composeParams.type = Ci.nsIMsgCompType.New;
	composeParams.format = (win.gMsgCompose.composeHTML) ? Ci.nsIMsgCompFormat.HTML : Ci.nsIMsgCompFormat.PlainText;
	composeParams.identity = win.mailmergeutils.template.identity;
	composeParams.composeFields = compFields;
	/* composeparams end */
	
	/* compose start */
	let compose = Cc["@mozilla.org/messengercompose/compose;1"].createInstance(Ci.nsIMsgCompose);
	compose.initialize(composeParams);
	/* compose end */
	
	/* format start */
	try {
		
		let format = win.mailmergeutils.template.format;
		switch(format) {
			
			case Ci.nsIMsgCompSendFormat.Both:
				
				compFields.forcePlainText = false;
				compFields.useMultipartAlternative = true;
				break;
				
			case Ci.nsIMsgCompSendFormat.HTML:
				
				compFields.forcePlainText = false;
				compFields.useMultipartAlternative = false;
				break;
				
			case Ci.nsIMsgCompSendFormat.PlainText:
				
				compFields.forcePlainText = true;
				compFields.useMultipartAlternative = false;
				break;
				
			default:;
			
		}
		
	} catch(e) { console.warn(e); }
	/* format end */
	
	/* from start */
	try {
		
		let from = win.mailmergeutils.template.from;
		from = jsmime.headerparser.decodeRFC2047Words(from);
		from = from.replace(new RegExp('<"', 'g'), '<');
		from = from.replace(new RegExp('">', 'g'), '>');
		from = win.mailmergeutils.substitute(from, object);
		from = MailServices.headerParser.makeFromDisplayAddress(from);
		from = MailServices.headerParser.makeMimeHeader(from, from.length);
		compFields.from = from;
		
	} catch(e) { console.warn(e); }
	/* from end */
	
	/* to start */
	try {
		
		let to = win.mailmergeutils.objects[index].to;
		to = jsmime.headerparser.decodeRFC2047Words(to);
		to = to.replace(new RegExp('<"', 'g'), '<');
		to = to.replace(new RegExp('">', 'g'), '>');
		to = win.mailmergeutils.substitute(to, object);
		to = MailServices.headerParser.makeFromDisplayAddress(to);
		to = MailServices.headerParser.makeMimeHeader(to, to.length);
		compFields.to = to;
		
	} catch(e) { console.warn(e); }
	/* to end */
	
	/* cc start */
	try {
		
		let cc = win.mailmergeutils.template.cc;
		cc = jsmime.headerparser.decodeRFC2047Words(cc);
		cc = cc.replace(new RegExp('<"', 'g'), '<');
		cc = cc.replace(new RegExp('">', 'g'), '>');
		cc = win.mailmergeutils.substitute(cc, object);
		cc = MailServices.headerParser.makeFromDisplayAddress(cc);
		cc = MailServices.headerParser.makeMimeHeader(cc, cc.length);
		compFields.cc = cc;
		
	} catch(e) { console.warn(e); }
	/* cc end */
	
	/* bcc start */
	try {
		
		let bcc = win.mailmergeutils.template.bcc;
		bcc = jsmime.headerparser.decodeRFC2047Words(bcc);
		bcc = bcc.replace(new RegExp('<"', 'g'), '<');
		bcc = bcc.replace(new RegExp('">', 'g'), '>');
		bcc = win.mailmergeutils.substitute(bcc, object);
		bcc = MailServices.headerParser.makeFromDisplayAddress(bcc);
		bcc = MailServices.headerParser.makeMimeHeader(bcc, bcc.length);
		compFields.bcc = bcc;
		
	} catch(e) { console.warn(e); }
	/* bcc end */
	
	/* reply start */
	try {
		
		let reply = win.mailmergeutils.template.reply;
		reply = jsmime.headerparser.decodeRFC2047Words(reply);
		reply = reply.replace(new RegExp('<"', 'g'), '<');
		reply = reply.replace(new RegExp('">', 'g'), '>');
		reply = win.mailmergeutils.substitute(reply, object);
		reply = MailServices.headerParser.makeFromDisplayAddress(reply);
		reply = MailServices.headerParser.makeMimeHeader(reply, reply.length);
		compFields.replyTo = reply;
		
	} catch(e) { console.warn(e); }
	/* reply end */
	
	/* subject start */
	try {
		
		let subject = win.mailmergeutils.template.subject;
		subject = win.mailmergeutils.substitute(subject, object);
		compFields.subject = subject;
		
	} catch(e) { console.warn(e); }
	/* subject end */
	
	/* body start */
	try {
		
		let body = win.mailmergeutils.template.body;
		body = body.replace(new RegExp('%7B', 'g'), '{');
		body = body.replace(new RegExp('%7C', 'g'), '|');
		body = body.replace(new RegExp('%7D', 'g'), '}');
		body = win.mailmergeutils.substitute(body, object);
		compFields.body = body;
		
	} catch(e) { console.warn(e); }
	/* body end */
	
	/* attachments start */
	try {
		
		let attachments = win.mailmergeutils.template.attachments;
		for(let i = 0; i < attachments.length; i++) {
			
			try {
				
				compFields.addAttachment(attachments[i]);
				
			} catch(e) { console.warn(e); }
			
		}
		
	} catch(e) { console.warn(e); }
	/* attachments end */
	
	/* attachments start */
	try {
		
		let attachments = win.mailmergeutils.prefs.attachments;
		attachments = win.mailmergeutils.substitute(attachments, object);
		attachments = attachments.replace(/(\r\n|\r|\n)/g, "\n").split("\n");
		for(let i = 0; i < attachments.length; i++) {
			
			try {
				
				/* compatibility start */
				attachments[i] = attachments[i].trim().replace(/^file\:\/\//g, '');
				/* compatibility end */
				
				if(attachments[i] == "") { continue; }
				
				let file = Cc["@mozilla.org/file/local;1"].createInstance(Ci.nsIFile);
				file.initWithPath(attachments[i]);
				
				if(!file.exists() || !file.isFile()) { continue; }
				
				let attachment = Cc["@mozilla.org/messengercompose/attachment;1"].createInstance(Ci.nsIMsgAttachment);
				attachment.url = Services.io.getProtocolHandler("file").QueryInterface(Ci.nsIFileProtocolHandler).getURLSpecFromFile(file);
				attachment.name = win.gMsgCompose.AttachmentPrettyName(attachment.url, null);
				attachment.size = file.fileSize;
				
				compFields.addAttachment(attachment);
				
			} catch(e) { console.warn(e); }
			
		}
		
	} catch(e) { console.warn(e); }
	/* attachments end */
	
	/* sendlater start */
	try {
		
		let at = win.mailmergeutils.prefs.at;
		at = win.mailmergeutils.substitute(at, object);
		if(win.mailmergeutils.prefs.delivermode == "SaveAsDraft" && win.mailmergeutils.template.sendlater && at) {
			
			try {
				
				let date = new Date(at);
				
				let recur = win.mailmergeutils.prefs.recur;
				if(recur == "") {
					recur = "none";
				}
				if(recur == "monthly") {
					recur = "monthly" + " " + date.getDate();
				}
				if(recur == "yearly") {
					recur = "yearly" + " " + date.getMonth() + " " + date.getDate();
				}
				
				let every = win.mailmergeutils.prefs.every;
				if(every) {
					every = " " + "/" + " " + parseInt(every);
				}
				
				let between = win.mailmergeutils.prefs.between;
				if(between) {
					between = " " + "between" + " " + between.replace(/:/g, '').replace(/-/g, ' ').replace(/  /g, ' ');
				}
				
				let only = win.mailmergeutils.prefs.only;
				if(only) {
					only = " " + "on" + " " + only;
				}
				
				try {
					
					compFields.setHeader("X-Send-Later-At", date.toUTCString());
					compFields.setHeader("X-Send-Later-Recur", recur + every + between + only);
					
				} catch(e) { console.warn(e); }
				
			} catch(e) {
				
				win.mailmergeutils.error(e);
				return false;
				
			}
			
		}
		
	} catch(e) { console.warn(e); }
	/* sendlater end */
	
	/* customheaders start */
	try {
		
		let header = Services.prefs.getStringPref("mail.compose.other.header").split(",");
		for(let i = 0; i < header.length; i++) {
			
			if(win.gMsgCompose.compFields.hasHeader(header[i])) {
				compFields.setHeader(header[i], win.mailmergeutils.substitute(win.gMsgCompose.compFields.getHeader(header[i]), object));
			}
			
		}
		
	} catch(e) { console.warn(e); }
	/* customheaders end */
	
	/* compfields start */
	compFields.attachVCard = win.gMsgCompose.compFields.attachVCard;
	compFields.characterSet = win.gMsgCompose.compFields.characterSet;
	compFields.contentLanguage = win.gMsgCompose.compFields.contentLanguage;
	compFields.DSN = win.gMsgCompose.compFields.DSN;
	compFields.organization = win.gMsgCompose.compFields.organization;
	compFields.priority = win.gMsgCompose.compFields.priority;
	compFields.returnReceipt = win.gMsgCompose.compFields.returnReceipt;
	try { compFields.securityInfo = win.gMsgCompose.compFields.securityInfo; } catch(e) { /* Thunderbird 60 */ }
	try { compFields.composeSecure = win.gMsgCompose.compFields.composeSecure; } catch(e) { /* Thunderbird 68 */ }
	/* compfields end */
	
	return compose;
	
}

function pause(index) {
	
	if(!win.mailmergeutils.objects[index]) { return false; }
	
	/* object start */
	let object = win.mailmergeutils.objects[index].object;
	/* object end */
	
	/* pause start */
	let pause = win.mailmergeutils.prefs.pause;
	pause = win.mailmergeutils.substitute(pause, object);
	pause = pause.split("-").sort();
	pause[0] = (parseInt(pause[0]) || "");
	pause[1] = (parseInt(pause[1]) || "");
	pause = (pause[0] == "") ? 50 : Math.floor(Math.random() * ((pause[1] || pause[0]) - pause[0] + 1) + pause[0]) * 1000;
	/* pause end */
	
	return pause;
	
}

function substitute(string, object) {
	
	if(!string || !string.includes("{{") || !string.includes("}}")) { return string; }
	
	//let objPattern = new RegExp("(?:[{][{]([^|{}]*)[}][}])", "g");
	//let objPattern = new RegExp("(?:[{][{]([^|{}]*)[}][}]|[{][{]([^|{}]*)[|]([^|{}]*)[|]([^|{}]*)[}][}])", "g");
	//let objPattern = new RegExp("(?:[{][{]([^|{}]*)[}][}]|[{][{]([^|{}]*)[|]([^|{}]*)[|]([^|{}]*)[}][}]|[{][{]([^|{}]*)[|]([^|{}]*)[|]([^|{}]*)[|]([^|{}]*)[}][}])", "g");
	//let objPattern = new RegExp("(?:[{][{]([^|{}]*)[}][}]|[{][{]([^|{}]*)[|]([^|{}]*)[|]([^|{}]*)[}][}]|[{][{]([^|{}]*)[|]([^|{}]*)[|]([^|{}]*)[|]([^|{}]*)[}][}]|[{][{]([^|{}]*)[|]([^|{}]*)[|]([^|{}]*)[|]([^|{}]*)[|]([^|{}]*)[}][}])", "g");
	let objPattern = new RegExp("(?:[{][{]([^|{}]*)[}][}]|[{][{]([^|{}]*)[|]([^|{}]*)[|]([^|{}]*)[}][}]|[{][{]([^|{}]*)[|]([^|{}]*)[|]([^|{}]*)[|]([^|{}]*)[}][}]|[{][{]([^|{}]*)[|]([^|{}]*)[|]([^|{}]*)[|]([^|{}]*)[|]([^|{}]*)[}][}]|[{][{]([^{}]*)[}][}])", "g");
	
	let arrMatches = objPattern.exec(string);
	if(!arrMatches) { return string; }
	
	/* workaround start */
	for(let i = 1; i < arrMatches.length; i++) {
		
		if(!arrMatches[i]) { continue; }
		arrMatches[i] = arrMatches[i].replace(new RegExp('\n(  )*', 'g'), ' ');
		
	}
	/* workaround end */
	
	if(arrMatches[1]) {
		
		/* {{name}} */
		string = string.replace(arrMatches[0], win.mailmergeutils.source(arrMatches[1], object));
		return win.mailmergeutils.substitute(string, object);
		
	}
	
	if(arrMatches[2]) {
		
		/* {{name|if|then}} */
		string = (win.mailmergeutils.source(arrMatches[2], object) == arrMatches[3]) ? string.replace(arrMatches[0], arrMatches[4]) : string.replace(arrMatches[0], "");
		return win.mailmergeutils.substitute(string, object);
		
	}
	
	if(arrMatches[5]) {
		
		/* {{name|if|then|else}} */
		string = (win.mailmergeutils.source(arrMatches[5], object) == arrMatches[6]) ? string.replace(arrMatches[0], arrMatches[7]) : string.replace(arrMatches[0], arrMatches[8]);
		return win.mailmergeutils.substitute(string, object);
		
	}
	
	if(arrMatches[9]) {
		
		if(arrMatches[10] == "*") {
			
			/* {{name|*|if|then|else}} */
			string = (win.mailmergeutils.source(arrMatches[9], object).includes(arrMatches[11])) ? string.replace(arrMatches[0], arrMatches[12]) : string.replace(arrMatches[0], arrMatches[13]);
			return win.mailmergeutils.substitute(string, object);
			
		}
		
		if(arrMatches[10] == "^") {
			
			/* {{name|^|if|then|else}} */
			string = (win.mailmergeutils.source(arrMatches[9], object).startsWith(arrMatches[11])) ? string.replace(arrMatches[0], arrMatches[12]) : string.replace(arrMatches[0], arrMatches[13]);
			return win.mailmergeutils.substitute(string, object);
			
		}
		
		if(arrMatches[10] == "$") {
			
			/* {{name|$|if|then|else}} */
			string = (win.mailmergeutils.source(arrMatches[9], object).endsWith(arrMatches[11])) ? string.replace(arrMatches[0], arrMatches[12]) : string.replace(arrMatches[0], arrMatches[13]);
			return win.mailmergeutils.substitute(string, object);
			
		}
		
	}
	
	if(arrMatches[9]) {
		
		if(arrMatches[10] == "==") {
			
			/* {{name|==|if|then|else}} */
			string = (parseFloat(win.mailmergeutils.source(arrMatches[9], object).replace(",",".")) == parseFloat(arrMatches[11].replace(",","."))) ? string.replace(arrMatches[0], arrMatches[12]) : string.replace(arrMatches[0], arrMatches[13]);
			return win.mailmergeutils.substitute(string, object);
			
		}
		
		if(arrMatches[10] == ">" || arrMatches[10] == "&gt;") {
			
			/* {{name|>|if|then|else}} */
			string = (parseFloat(win.mailmergeutils.source(arrMatches[9], object).replace(",",".")) > parseFloat(arrMatches[11].replace(",","."))) ? string.replace(arrMatches[0], arrMatches[12]) : string.replace(arrMatches[0], arrMatches[13]);
			return win.mailmergeutils.substitute(string, object);
			
		}
		
		if(arrMatches[10] == ">=" || arrMatches[10] == "&gt;=") {
			
			/* {{name|>=|if|then|else}} */
			string = (parseFloat(win.mailmergeutils.source(arrMatches[9], object).replace(",",".")) >= parseFloat(arrMatches[11].replace(",","."))) ? string.replace(arrMatches[0], arrMatches[12]) : string.replace(arrMatches[0], arrMatches[13]);
			return win.mailmergeutils.substitute(string, object);
			
		}
		
		if(arrMatches[10] == "<" || arrMatches[10] == "&lt;") {
			
			/* {{name|<|if|then|else}} */
			string = (parseFloat(win.mailmergeutils.source(arrMatches[9], object).replace(",",".")) < parseFloat(arrMatches[11].replace(",","."))) ? string.replace(arrMatches[0], arrMatches[12]) : string.replace(arrMatches[0], arrMatches[13]);
			return win.mailmergeutils.substitute(string, object);
			
		}
		
		if(arrMatches[10] == "<=" || arrMatches[10] == "&lt;=") {
			
			/* {{name|<=|if|then|else}} */
			string = (parseFloat(win.mailmergeutils.source(arrMatches[9], object).replace(",",".")) <= parseFloat(arrMatches[11].replace(",","."))) ? string.replace(arrMatches[0], arrMatches[12]) : string.replace(arrMatches[0], arrMatches[13]);
			return win.mailmergeutils.substitute(string, object);
			
		}
		
	}
	
	string = string.replace(arrMatches[0], "");
	return win.mailmergeutils.substitute(string, object);
	
}

function source(string, object) {
	
	if(!object) { return ""; }
	
	switch(win.mailmergeutils.prefs.source) {
		
		case "Cardbook":
			return win.mailmergeutils.split(string, object);
			
		case "AddressBook":
			return object.getProperty(string, "");
			
		case "CSV":
		case "JSON":
		case "XLSX":
			return (object[string] || "");
			
		default:;
		
	}
	
}

function split(string, object) {
	
	string = string.split("#");
	string[0] = (string[0] || "");
	string[1] = (string[1] || "");
	string[2] = (string[2] || 0);
	
	switch(string[0]) {
		
		case "adr":
		case "email":
		case "impp":
		case "tel":
		case "url":
			
			object = (object[string[0]] || "");
			object = object.filter(function(element) { return (string[1]) ? (element[1].some(function(element) { return (element.replace(/TYPE=/i,'').toUpperCase() == string[1].replace(/TYPE=/i,'').toUpperCase()); })) : true; });
			return (object[string[2]]) ? object[string[2]][0] : "";
			
		case "adrpostoffice":
			
			object = (object["adr"] || "");
			object = object.filter(function(element) { return (string[1]) ? (element[1].some(function(element) { return (element.replace(/TYPE=/i,'').toUpperCase() == string[1].replace(/TYPE=/i,'').toUpperCase()); })) : true; });
			return (object[string[2]]) ? object[string[2]][0][0] : "";
			
		case "adrextended":
			
			object = (object["adr"] || "");
			object = object.filter(function(element) { return (string[1]) ? (element[1].some(function(element) { return (element.replace(/TYPE=/i,'').toUpperCase() == string[1].replace(/TYPE=/i,'').toUpperCase()); })) : true; });
			return (object[string[2]]) ? object[string[2]][0][1] : "";
			
		case "adrstreet":
			
			object = (object["adr"] || "");
			object = object.filter(function(element) { return (string[1]) ? (element[1].some(function(element) { return (element.replace(/TYPE=/i,'').toUpperCase() == string[1].replace(/TYPE=/i,'').toUpperCase()); })) : true; });
			return (object[string[2]]) ? object[string[2]][0][2] : "";
			
		case "adrlocality":
			
			object = (object["adr"] || "");
			object = object.filter(function(element) { return (string[1]) ? (element[1].some(function(element) { return (element.replace(/TYPE=/i,'').toUpperCase() == string[1].replace(/TYPE=/i,'').toUpperCase()); })) : true; });
			return (object[string[2]]) ? object[string[2]][0][3] : "";
			
		case "adrregion":
			
			object = (object["adr"] || "");
			object = object.filter(function(element) { return (string[1]) ? (element[1].some(function(element) { return (element.replace(/TYPE=/i,'').toUpperCase() == string[1].replace(/TYPE=/i,'').toUpperCase()); })) : true; });
			return (object[string[2]]) ? object[string[2]][0][4] : "";
			
		case "adrpostalcode":
			
			object = (object["adr"] || "");
			object = object.filter(function(element) { return (string[1]) ? (element[1].some(function(element) { return (element.replace(/TYPE=/i,'').toUpperCase() == string[1].replace(/TYPE=/i,'').toUpperCase()); })) : true; });
			return (object[string[2]]) ? object[string[2]][0][5] : "";
			
		case "adrcountry":
			
			object = (object["adr"] || "");
			object = object.filter(function(element) { return (string[1]) ? (element[1].some(function(element) { return (element.replace(/TYPE=/i,'').toUpperCase() == string[1].replace(/TYPE=/i,'').toUpperCase()); })) : true; });
			return (object[string[2]]) ? object[string[2]][0][6] : "";
			
		case "others":
			
			object = (object[string[0]] || "");
			object = object.filter(function(element) { return (string[1]) ? (element.split(":")[0].toUpperCase() == string[1].toUpperCase()) : true; });
			return (object[string[2]]) ? object[string[2]].split(":")[1] : "";
			
		case "photo":
		case "logo":
		case "sound":
			
			object = (object[string[0]] || "");
			return (object.localURI || "");
			
		default:
			return (object[string[0]] || "");
		
	}
	
}

function error(object) {
	
	console.error("Mail Merge: Error", object);
	Services.prompt.alert(win, "Mail Merge: Error", object);
	
}
