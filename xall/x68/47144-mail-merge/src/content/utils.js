"use strict";

var mailmergeutils = {
	
	template: function() {
		
		mailmergeutils.template.identity = gMsgCompose.identity;
		
		mailmergeutils.template.format = window.DetermineHTMLAction(window.DetermineConvertibility());
		
		mailmergeutils.template.from = gMsgCompose.compFields.from;
		mailmergeutils.template.to = gMsgCompose.compFields.to;
		mailmergeutils.template.cc = gMsgCompose.compFields.cc;
		mailmergeutils.template.bcc = gMsgCompose.compFields.bcc;
		mailmergeutils.template.reply = gMsgCompose.compFields.replyTo;
		mailmergeutils.template.subject = gMsgCompose.compFields.subject;
		mailmergeutils.template.body = gMsgCompose.compFields.body;
		
		mailmergeutils.template.attachments = [];
		
		var attachments = gMsgCompose.compFields.attachments;
		while(attachments.hasMoreElements()) {
			
			try {
				
				var attachment = attachments.getNext();
				attachment.QueryInterface(Ci.nsIMsgAttachment);
				
				mailmergeutils.template.attachments.push(attachment);
				
			} catch(e) { console.warn(e); }
			
		}
		
	},
	
	init: function(prefs) {
		
		/* prefs start */
		mailmergeutils.prefs = prefs;
		/* prefs end */
		
		/* objects start */
		mailmergeutils.objects = [];
		/* objects end */
		
		/* source start */
		switch(mailmergeutils.prefs.source) {
			
			case "Cardbook":
				
				var objects = mailmergeutils.cardbook();
				if(!Array.isArray(objects)) { return false; }
				
				mailmergeutils.objects = objects;
				break;
				
			case "AddressBook":
				
				var objects = mailmergeutils.addressbook();
				if(!Array.isArray(objects)) { return false; }
				
				mailmergeutils.objects = objects;
				break;
				
			case "CSV":
				
				var params = {
					
					file: mailmergeutils.prefs.csv,
					characterset: mailmergeutils.prefs.characterset,
					fielddelimiter: mailmergeutils.prefs.fielddelimiter,
					textdelimiter: mailmergeutils.prefs.textdelimiter
					
				}
				
				var json = mailmergeutils.csv(params);
				if(!Array.isArray(json)) { return false; }
				
				var objects = mailmergeutils.array(json);
				if(!Array.isArray(objects)) { return false; }
				
				mailmergeutils.objects = objects;
				break;
				
			case "JSON":
				
				var params = {
					
					file: mailmergeutils.prefs.json
					
				}
				
				var json = mailmergeutils.json(params);
				if(!Array.isArray(json)) { return false; }
				
				var objects = mailmergeutils.array(json);
				if(!Array.isArray(objects)) { return false; }
				
				mailmergeutils.objects = objects;
				break;
				
			case "XLSX":
				
				var params = {
					
					file: mailmergeutils.prefs.xlsx,
					sheetname: mailmergeutils.prefs.sheetname
					
				}
				
				var json = mailmergeutils.xlsx(params);
				if(!Array.isArray(json)) { return false; }
				
				var objects = mailmergeutils.array(json);
				if(!Array.isArray(objects)) { return false; }
				
				mailmergeutils.objects = objects;
				break;
				
			default:;
			
		}
		/* source end */
		
		/* stop start */
		var stop = (mailmergeutils.prefs.stop == "") ? mailmergeutils.objects.length : mailmergeutils.prefs.stop;
		mailmergeutils.objects.splice(stop);
		/* stop end */
		
		/* start start */
		var start = (mailmergeutils.prefs.start == "") ? 1 : mailmergeutils.prefs.start;
		mailmergeutils.objects.splice(0, start - 1);
		/* start end */
		
		return true;
		
	},
	
	cardbook: function() {
		
		var objects = [];
		
		/* to start */
		var to = mailmergeutils.template.to;
		to = jsmime.headerparser.decodeRFC2047Words(to);
		to = gMsgCompose.compFields.splitRecipients(to, false, {});
		/* to end */
		
		/* array start */
		for(var i = 0; i < to.length; i++) {
			
			if(to[i].includes("{{") && to[i].includes("}}")) {
				
				/* cardbook start */
				try {
					
					var accounts = window.cardbookRepository.cardbookAccounts;
					for(var j = 0; j < accounts.length; j++) {
						
						var account = accounts[j];
						if(account[1] && account[5] && account[6] != "SEARCH") {
							
							if(mailmergeutils.prefs.cardbook && mailmergeutils.prefs.cardbook != account[4]) { continue; }
							
							var cards = (window.cardbookRepository.cardbookDisplayCards[account[4]].cards || window.cardbookRepository.cardbookDisplayCards[account[4]]);
							for(var k = 0; k < cards.length; k++) {
								
								var recipient = to[i];
								recipient = recipient.replace(new RegExp(' <>', 'g'), '');
								recipient = mailmergeutils.substitute(recipient, cards[k]);
								
								if(recipient.includes("@")) {
									
									objects.push({ to: recipient, object: cards[k] });
									
								}
								
							}
							
						}
						
					}
					
				} catch(e) {
					
					mailmergeutils.error(e);
					return false;
					
				}
				/* cardbook end */
				
			}
			
			if(to[i].includes("@")) {
				
				var objPattern = new RegExp("\\s*(?:(.*) <(.*)>|(.*))\\s*", "g");
				var arrMatches = objPattern.exec(to[i]);
				arrMatches = (arrMatches[2] || arrMatches[3]);
				
				/* cardbook start */
				try {
					
					var accounts = window.cardbookRepository.cardbookAccounts;
					for(var j = 0; j < accounts.length; j++) {
						
						var account = accounts[j];
						if(account[1] && account[5] && account[6] != "SEARCH") {
							
							if(mailmergeutils.prefs.cardbook && mailmergeutils.prefs.cardbook != account[4]) { continue; }
							
							var cards = (window.cardbookRepository.cardbookDisplayCards[account[4]].cards || window.cardbookRepository.cardbookDisplayCards[account[4]]);
							var card = cards.filter(function(element) { for(var i = 0; i < element.email.length; i++) { if(element.email[i][0][0].toLowerCase() == arrMatches.toLowerCase()) { return true; } } })[0];
							if(card) { break; }
							
						}
						
					}
					
				} catch(e) {
					
					mailmergeutils.error(e);
					return false;
					
				}
				/* cardbook end */
				
				objects.push({ to: to[i], object: card });
				
			}
			
		}
		/* array end */
		
		return objects;
		
	},
	
	addressbook: function() {
		
		var objects = [];
		
		/* to start */
		var to = mailmergeutils.template.to;
		to = jsmime.headerparser.decodeRFC2047Words(to);
		to = gMsgCompose.compFields.splitRecipients(to, false, {});
		/* to end */
		
		/* array start */
		for(var i = 0; i < to.length; i++) {
			
			if(to[i].includes("{{") && to[i].includes("}}")) {
				
				/* addressbook start */
				try {
					
					var addressbooks = Cc["@mozilla.org/abmanager;1"].getService(Ci.nsIAbManager).directories;
					while(addressbooks.hasMoreElements()) {
						
						try {
							
							var addressbook = addressbooks.getNext();
							addressbook.QueryInterface(Ci.nsIAbDirectory);
							
							if(mailmergeutils.prefs.addressbook && mailmergeutils.prefs.addressbook != addressbook.uuid) { continue; }
							
							var cards = addressbook.childCards;
							while(cards.hasMoreElements()) {
								
								var card = cards.getNext();
								card.QueryInterface(Ci.nsIAbCard);
								
								if(card.isMailList) { continue; }
								
								var recipient = to[i];
								recipient = recipient.replace(new RegExp(' <>', 'g'), '');
								recipient = mailmergeutils.substitute(recipient, card);
								
								if(recipient.includes("@")) {
									
									objects.push({ to: recipient, object: card });
									
								}
								
							}
							
						} catch(e) { console.warn(e); }
						
					}
					
				} catch(e) {
					
					mailmergeutils.error(e);
					return false;
					
				}
				/* addressbook end */
				
			}
			
			if(to[i].includes("@")) {
				
				var objPattern = new RegExp("\\s*(?:(.*) <(.*)>|(.*))\\s*", "g");
				var arrMatches = objPattern.exec(to[i]);
				arrMatches = (arrMatches[2] || arrMatches[3]);
				
				/* addressbook start */
				try {
					
					var addressbooks = Cc["@mozilla.org/abmanager;1"].getService(Ci.nsIAbManager).directories;
					while(addressbooks.hasMoreElements()) {
						
						try {
							
							var addressbook = addressbooks.getNext();
							addressbook.QueryInterface(Ci.nsIAbDirectory);
							
							if(mailmergeutils.prefs.addressbook && mailmergeutils.prefs.addressbook != addressbook.uuid) { continue; }
							
							var card = addressbook.getCardFromProperty("PrimaryEmail", arrMatches, false);
							if(card) { break; }
							
						} catch(e) { console.warn(e); }
						
					}
					
				} catch(e) {
					
					mailmergeutils.error(e);
					return false;
					
				}
				/* addressbook end */
				
				objects.push({ to: to[i], object: card });
				
			}
			
		}
		/* array end */
		
		return objects;
		
	},
	
	csv: function(params) {
		
		/* file start */
		try {
			
			/* compatibility start */
			params.file = params.file.trim().replace(/^file\:\/\//g, '');
			/* compatibility end */
			
			var file = Cc["@mozilla.org/file/local;1"].createInstance(Ci.nsIFile);
			file.initWithPath(params.file);
			
			var fileInputStream = Cc["@mozilla.org/network/file-input-stream;1"].createInstance(Ci.nsIFileInputStream);
			fileInputStream.init(file, -1, 0, 0);
			
			var converterInputStream = Cc["@mozilla.org/intl/converter-input-stream;1"].createInstance(Ci.nsIConverterInputStream);
			converterInputStream.init(fileInputStream, params.characterset, 0, 0);
			
			var bytes = "", string = {};
			while(converterInputStream.readString(4096, string) != 0) {
				bytes += string.value;
			}
			
		} catch(e) {
			
			mailmergeutils.error(e);
			return false;
			
		}
		/* file end */
		
		/* csv start */
		try {
			
			var json = mailmergeutils.parse(bytes, params.fielddelimiter, params.textdelimiter);
			
		} catch(e) {
			
			mailmergeutils.error(e);
			return false;
			
		}
		/* csv end */
		
		return json;
		
	},
	
	json: function(params) {
		
		/* file start */
		try {
			
			/* compatibility start */
			params.file = params.file.trim().replace(/^file\:\/\//g, '');
			/* compatibility end */
			
			var file = Cc["@mozilla.org/file/local;1"].createInstance(Ci.nsIFile);
			file.initWithPath(params.file);
			
			var fileInputStream = Cc["@mozilla.org/network/file-input-stream;1"].createInstance(Ci.nsIFileInputStream);
			fileInputStream.init(file, -1, 0, 0);
			
			var converterInputStream = Cc["@mozilla.org/intl/converter-input-stream;1"].createInstance(Ci.nsIConverterInputStream);
			converterInputStream.init(fileInputStream, "utf-8", 0, 0);
			
			var bytes = "", string = {};
			while(converterInputStream.readString(4096, string) != 0) {
				bytes += string.value;
			}
			
		} catch(e) {
			
			mailmergeutils.error(e);
			return false;
			
		}
		/* file end */
		
		/* json start */
		try {
			
			var json = JSON.parse(bytes);
			json = (Array.isArray(json)) ? json : [[]];
			
		} catch(e) {
			
			mailmergeutils.error(e);
			return false;
			
		}
		/* json end */
		
		return json;
		
	},
	
	xlsx: function(params) {
		
		/* file start */
		try {
			
			/* compatibility start */
			params.file = params.file.trim().replace(/^file\:\/\//g, '');
			/* compatibility end */
			
			var file = Cc["@mozilla.org/file/local;1"].createInstance(Ci.nsIFile);
			file.initWithPath(params.file);
			
			var fileInputStream = Cc["@mozilla.org/network/file-input-stream;1"].createInstance(Ci.nsIFileInputStream);
			fileInputStream.init(file, -1, -1, false);
			
			var binaryInputStream = Cc["@mozilla.org/binaryinputstream;1"].createInstance(Ci.nsIBinaryInputStream);
			binaryInputStream.setInputStream(fileInputStream);
			
			var bytes = binaryInputStream.readBytes(binaryInputStream.available());
			
		} catch(e) {
			
			mailmergeutils.error(e);
			return false;
			
		}
		/* file end */
		
		/* xlsx start */
		try {
			
			Services.scriptloader.loadSubScript("chrome://mailmerge/content/xlsx.core.min.js");
			
			var workbook = XLSX.read(bytes, { type: "binary" });
			var sheet = workbook.Sheets[(params.sheetname || workbook.SheetNames[0])];
			var json = XLSX.utils.sheet_to_json(sheet, { header: 1 });
			
		} catch(e) {
			
			mailmergeutils.error(e);
			return false;
			
		}
		/* xlsx end */
		
		return json;
		
	},
	
	array: function(json) {
		
		var objects = [];
		
		/* array start */
		for(var i = 1; i < json.length; i++) {
			
			/* object start */
			var object = [];
			for(var j = 0; j < json[0].length; j++) {
				
				if(json[0][j] == "") { continue; }
				object[json[0][j]] = (json[i][j] === undefined || json[i][j] === null) ? "" : json[i][j].toString();
				
			}
			/* object end */
			
			/* to start */
			var to = mailmergeutils.template.to;
			to = jsmime.headerparser.decodeRFC2047Words(to);
			to = mailmergeutils.substitute(to, object);
			/* to end */
			
			if(to.includes("@")) {
				
				objects.push({ to: to, object: object });
				
			}
			
		}
		/* array end */
		
		return objects;
		
	},
	
	parse: function(string, fielddelimiter, textdelimiter) {
		
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
		
		var objPattern = new RegExp("(\r\n|\r|\n|" + fielddelimiter + "|^)(?:[" + textdelimiter + "]([^" + textdelimiter + "]*(?:[" + textdelimiter + "][" + textdelimiter + "][^" + textdelimiter + "]*)*)[" + textdelimiter + "]|([^" + fielddelimiter + textdelimiter + "\r\n]*))", "g");
		
		var arrData = [], arrMatches = [];
		while(arrMatches = objPattern.exec(string)) {
			
			var strMatchedValue = "";
			
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
		for(var row = 0; row < arrData[0].length; row++) {
			
			arrData[0][row] = arrData[0][row].replace(new RegExp('[{]', 'g'), '');
			arrData[0][row] = arrData[0][row].replace(new RegExp('[|]', 'g'), '');
			arrData[0][row] = arrData[0][row].replace(new RegExp('[}]', 'g'), '');
			
		}
		/* compatibility end */
		
		return arrData;
		
	},
	
	compose: function(index) {
		
		if(!mailmergeutils.objects[index]) { return false; }
		
		/* object start */
		var object = mailmergeutils.objects[index].object;
		/* object end */
		
		/* compfields start */
		var compFields = Cc["@mozilla.org/messengercompose/composefields;1"].createInstance(Ci.nsIMsgCompFields);
		/* compfields end */
		
		/* composeparams start */
		var composeParams = Cc["@mozilla.org/messengercompose/composeparams;1"].createInstance(Ci.nsIMsgComposeParams);
		composeParams.type = Ci.nsIMsgCompType.New;
		composeParams.format = (gMsgCompose.composeHTML) ? Ci.nsIMsgCompFormat.HTML : Ci.nsIMsgCompFormat.PlainText;
		composeParams.identity = mailmergeutils.template.identity;
		composeParams.composeFields = compFields;
		/* composeparams end */
		
		/* compose start */
		var compose = Cc["@mozilla.org/messengercompose/compose;1"].createInstance(Ci.nsIMsgCompose);
		compose.initialize(composeParams);
		/* compose end */
		
		/* format start */
		var format = mailmergeutils.template.format;
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
		/* format end */
		
		/* from start */
		try {
			
			var from = mailmergeutils.template.from;
			from = jsmime.headerparser.decodeRFC2047Words(from);
			from = from.replace(new RegExp('<"', 'g'), '<');
			from = from.replace(new RegExp('">', 'g'), '>');
			from = mailmergeutils.substitute(from, object);
			from = MailServices.headerParser.makeFromDisplayAddress(from);
			from = MailServices.headerParser.makeMimeHeader(from, from.length);
			compFields.from = from;
			
		} catch(e) { console.warn(e); }
		/* from end */
		
		/* to start */
		try {
			
			var to = mailmergeutils.objects[index].to;
			to = jsmime.headerparser.decodeRFC2047Words(to);
			to = to.replace(new RegExp('<"', 'g'), '<');
			to = to.replace(new RegExp('">', 'g'), '>');
			to = mailmergeutils.substitute(to, object);
			to = MailServices.headerParser.makeFromDisplayAddress(to);
			to = MailServices.headerParser.makeMimeHeader(to, to.length);
			compFields.to = to;
			
		} catch(e) { console.warn(e); }
		/* to end */
		
		/* cc start */
		try {
			
			var cc = mailmergeutils.template.cc;
			cc = jsmime.headerparser.decodeRFC2047Words(cc);
			cc = cc.replace(new RegExp('<"', 'g'), '<');
			cc = cc.replace(new RegExp('">', 'g'), '>');
			cc = mailmergeutils.substitute(cc, object);
			cc = MailServices.headerParser.makeFromDisplayAddress(cc);
			cc = MailServices.headerParser.makeMimeHeader(cc, cc.length);
			compFields.cc = cc;
			
		} catch(e) { console.warn(e); }
		/* cc end */
		
		/* bcc start */
		try {
			
			var bcc = mailmergeutils.template.bcc;
			bcc = jsmime.headerparser.decodeRFC2047Words(bcc);
			bcc = bcc.replace(new RegExp('<"', 'g'), '<');
			bcc = bcc.replace(new RegExp('">', 'g'), '>');
			bcc = mailmergeutils.substitute(bcc, object);
			bcc = MailServices.headerParser.makeFromDisplayAddress(bcc);
			bcc = MailServices.headerParser.makeMimeHeader(bcc, bcc.length);
			compFields.bcc = bcc;
			
		} catch(e) { console.warn(e); }
		/* bcc end */
		
		/* reply start */
		try {
			
			var reply = mailmergeutils.template.reply;
			reply = jsmime.headerparser.decodeRFC2047Words(reply);
			reply = reply.replace(new RegExp('<"', 'g'), '<');
			reply = reply.replace(new RegExp('">', 'g'), '>');
			reply = mailmergeutils.substitute(reply, object);
			reply = MailServices.headerParser.makeFromDisplayAddress(reply);
			reply = MailServices.headerParser.makeMimeHeader(reply, reply.length);
			compFields.replyTo = reply;
			
		} catch(e) { console.warn(e); }
		/* reply end */
		
		/* subject start */
		try {
			
			var subject = mailmergeutils.template.subject;
			subject = mailmergeutils.substitute(subject, object);
			compFields.subject = subject;
			
		} catch(e) { console.warn(e); }
		/* subject end */
		
		/* body start */
		try {
			
			var body = mailmergeutils.template.body;
			body = body.replace(new RegExp('%7B', 'g'), '{');
			body = body.replace(new RegExp('%7C', 'g'), '|');
			body = body.replace(new RegExp('%7D', 'g'), '}');
			body = mailmergeutils.substitute(body, object);
			compFields.body = body;
			
		} catch(e) { console.warn(e); }
		/* body end */
		
		/* attachments start */
		var attachments = mailmergeutils.template.attachments;
		for(var i = 0; i < attachments.length; i++) {
			
			try {
				
				compFields.addAttachment(attachments[i]);
				
			} catch(e) { console.warn(e); }
			
		}
		/* attachments end */
		
		/* attachments start */
		var attachments = mailmergeutils.prefs.attachments;
		attachments = mailmergeutils.substitute(attachments, object);
		attachments = attachments.replace(/(\r\n|\r|\n)/g, "\n").split("\n");
		for(var i = 0; i < attachments.length; i++) {
			
			try {
				
				/* compatibility start */
				attachments[i] = attachments[i].trim().replace(/^file\:\/\//g, '');
				/* compatibility end */
				
				if(attachments[i] == "") { continue; }
				
				var file = Cc["@mozilla.org/file/local;1"].createInstance(Ci.nsIFile);
				file.initWithPath(attachments[i]);
				
				if(!file.exists() || !file.isFile()) { continue; }
				
				var attachment = Cc["@mozilla.org/messengercompose/attachment;1"].createInstance(Ci.nsIMsgAttachment);
				attachment.url = Services.io.getProtocolHandler("file").QueryInterface(Ci.nsIFileProtocolHandler).getURLSpecFromFile(file);
				attachment.name = gMsgCompose.AttachmentPrettyName(attachment.url, null);
				attachment.size = file.fileSize;
				
				compFields.addAttachment(attachment);
				
			} catch(e) { console.warn(e); }
			
		}
		/* attachments end */
		
		/* sendlater start */
		var at = mailmergeutils.prefs.at;
		at = mailmergeutils.substitute(at, object);
		if(mailmergeutils.prefs.delivermode == "SaveAsDraft" && window.Sendlater3Util && at) {
			
			try {
				
				var recur = mailmergeutils.prefs.recur;
				if(recur == "") {
					recur = "none";
				}
				if(recur == "monthly") {
					recur = "monthly" + " " + sl3dateparse.DateParse(at).getDate();
				}
				if(recur == "yearly") {
					recur = "yearly" + " " + sl3dateparse.DateParse(at).getMonth() + " " + sl3dateparse.DateParse(at).getDate();
				}
				
				var every = mailmergeutils.prefs.every;
				if(every) {
					every = " " + "/" + " " + parseInt(every);
				}
				
				var between = mailmergeutils.prefs.between;
				if(between) {
					between = " " + "between" + " " + between.replace(/:/g, '').replace(/-/g, ' ').replace(/  /g, ' ');
				}
				
				var only = mailmergeutils.prefs.only;
				if(only) {
					only = " " + "on" + " " + only;
				}
				
				try {
					
					compFields.setHeader("X-Send-Later-Uuid", window.Sendlater3Util.getInstanceUuid());
					compFields.setHeader("X-Send-Later-At", window.Sendlater3Util.FormatDateTime(sl3dateparse.DateParse(at), true));
					compFields.setHeader("X-Send-Later-Recur", recur + every + between + only);
					
				} catch(e) { console.warn(e); }
				
			} catch(e) {
				
				mailmergeutils.error(e);
				return false;
				
			}
			
		}
		/* sendlater end */
		
		/* customheaders start */
		try {
			
			var header = Services.prefs.getStringPref("mail.compose.other.header").split(",");
			for(var i = 0; i < header.length; i++) {
				
				if(gMsgCompose.compFields.hasHeader(header[i])) {
					compFields.setHeader(header[i], mailmergeutils.substitute(gMsgCompose.compFields.getHeader(header[i]), object));
				}
				
			}
			
		} catch(e) { console.warn(e); }
		/* customheaders end */
		
		/* compfields start */
		compFields.attachVCard = gMsgCompose.compFields.attachVCard;
		compFields.characterSet = gMsgCompose.compFields.characterSet;
		compFields.contentLanguage = gMsgCompose.compFields.contentLanguage;
		compFields.DSN = gMsgCompose.compFields.DSN;
		compFields.organization = gMsgCompose.compFields.organization;
		compFields.priority = gMsgCompose.compFields.priority;
		compFields.returnReceipt = gMsgCompose.compFields.returnReceipt;
		try { compFields.securityInfo = gMsgCompose.compFields.securityInfo; } catch(e) { /* Thunderbird 60 */ }
		try { compFields.composeSecure = gMsgCompose.compFields.composeSecure; } catch(e) { /* Thunderbird 68 */ }
		/* compfields end */
		
		return compose;
		
	},
	
	pause: function(index) {
		
		if(!mailmergeutils.objects[index]) { return false; }
		
		/* object start */
		var object = mailmergeutils.objects[index].object;
		/* object end */
		
		/* pause start */
		var pause = mailmergeutils.prefs.pause;
		pause = mailmergeutils.substitute(pause, object);
		pause = pause.split("-").sort();
		pause[0] = (parseInt(pause[0]) || "");
		pause[1] = (parseInt(pause[1]) || "");
		pause = (pause[0] == "") ? 50 : Math.floor(Math.random() * ((pause[1] || pause[0]) - pause[0] + 1) + pause[0]) * 1000;
		/* pause end */
		
		return pause;
		
	},
	
	substitute: function(string, object) {
		
		if(!string || !string.includes("{{") || !string.includes("}}")) { return string; }
		
		//var objPattern = new RegExp("(?:[{][{]([^|{}]*)[}][}])", "g");
		//var objPattern = new RegExp("(?:[{][{]([^|{}]*)[}][}]|[{][{]([^|{}]*)[|]([^|{}]*)[|]([^|{}]*)[}][}])", "g");
		//var objPattern = new RegExp("(?:[{][{]([^|{}]*)[}][}]|[{][{]([^|{}]*)[|]([^|{}]*)[|]([^|{}]*)[}][}]|[{][{]([^|{}]*)[|]([^|{}]*)[|]([^|{}]*)[|]([^|{}]*)[}][}])", "g");
		//var objPattern = new RegExp("(?:[{][{]([^|{}]*)[}][}]|[{][{]([^|{}]*)[|]([^|{}]*)[|]([^|{}]*)[}][}]|[{][{]([^|{}]*)[|]([^|{}]*)[|]([^|{}]*)[|]([^|{}]*)[}][}]|[{][{]([^|{}]*)[|]([^|{}]*)[|]([^|{}]*)[|]([^|{}]*)[|]([^|{}]*)[}][}])", "g");
		var objPattern = new RegExp("(?:[{][{]([^|{}]*)[}][}]|[{][{]([^|{}]*)[|]([^|{}]*)[|]([^|{}]*)[}][}]|[{][{]([^|{}]*)[|]([^|{}]*)[|]([^|{}]*)[|]([^|{}]*)[}][}]|[{][{]([^|{}]*)[|]([^|{}]*)[|]([^|{}]*)[|]([^|{}]*)[|]([^|{}]*)[}][}]|[{][{]([^{}]*)[}][}])", "g");
		
		var arrMatches = objPattern.exec(string);
		if(!arrMatches) { return string; }
		
		/* workaround start */
		for(var i = 1; i < arrMatches.length; i++) {
			
			if(!arrMatches[i]) { continue; }
			arrMatches[i] = arrMatches[i].replace(new RegExp('\n(  )*', 'g'), ' ');
			
		}
		/* workaround end */
		
		if(arrMatches[1]) {
			
			/* {{name}} */
			string = string.replace(arrMatches[0], mailmergeutils.switch(arrMatches[1], object));
			return mailmergeutils.substitute(string, object);
			
		}
		
		if(arrMatches[2]) {
			
			/* {{name|if|then}} */
			string = (mailmergeutils.switch(arrMatches[2], object) == arrMatches[3]) ? string.replace(arrMatches[0], arrMatches[4]) : string.replace(arrMatches[0], "");
			return mailmergeutils.substitute(string, object);
			
		}
		
		if(arrMatches[5]) {
			
			/* {{name|if|then|else}} */
			string = (mailmergeutils.switch(arrMatches[5], object) == arrMatches[6]) ? string.replace(arrMatches[0], arrMatches[7]) : string.replace(arrMatches[0], arrMatches[8]);
			return mailmergeutils.substitute(string, object);
			
		}
		
		if(arrMatches[9]) {
			
			if(arrMatches[10] == "*") {
				
				/* {{name|*|if|then|else}} */
				string = (mailmergeutils.switch(arrMatches[9], object).includes(arrMatches[11])) ? string.replace(arrMatches[0], arrMatches[12]) : string.replace(arrMatches[0], arrMatches[13]);
				return mailmergeutils.substitute(string, object);
				
			}
			
			if(arrMatches[10] == "^") {
				
				/* {{name|^|if|then|else}} */
				string = (mailmergeutils.switch(arrMatches[9], object).startsWith(arrMatches[11])) ? string.replace(arrMatches[0], arrMatches[12]) : string.replace(arrMatches[0], arrMatches[13]);
				return mailmergeutils.substitute(string, object);
				
			}
			
			if(arrMatches[10] == "$") {
				
				/* {{name|$|if|then|else}} */
				string = (mailmergeutils.switch(arrMatches[9], object).endsWith(arrMatches[11])) ? string.replace(arrMatches[0], arrMatches[12]) : string.replace(arrMatches[0], arrMatches[13]);
				return mailmergeutils.substitute(string, object);
				
			}
			
		}
		
		if(arrMatches[9]) {
			
			if(arrMatches[10] == "==") {
				
				/* {{name|==|if|then|else}} */
				string = (parseFloat(mailmergeutils.switch(arrMatches[9], object).replace(",",".")) == parseFloat(arrMatches[11].replace(",","."))) ? string.replace(arrMatches[0], arrMatches[12]) : string.replace(arrMatches[0], arrMatches[13]);
				return mailmergeutils.substitute(string, object);
				
			}
			
			if(arrMatches[10] == ">" || arrMatches[10] == "&gt;") {
				
				/* {{name|>|if|then|else}} */
				string = (parseFloat(mailmergeutils.switch(arrMatches[9], object).replace(",",".")) > parseFloat(arrMatches[11].replace(",","."))) ? string.replace(arrMatches[0], arrMatches[12]) : string.replace(arrMatches[0], arrMatches[13]);
				return mailmergeutils.substitute(string, object);
				
			}
			
			if(arrMatches[10] == ">=" || arrMatches[10] == "&gt;=") {
				
				/* {{name|>=|if|then|else}} */
				string = (parseFloat(mailmergeutils.switch(arrMatches[9], object).replace(",",".")) >= parseFloat(arrMatches[11].replace(",","."))) ? string.replace(arrMatches[0], arrMatches[12]) : string.replace(arrMatches[0], arrMatches[13]);
				return mailmergeutils.substitute(string, object);
				
			}
			
			if(arrMatches[10] == "<" || arrMatches[10] == "&lt;") {
				
				/* {{name|<|if|then|else}} */
				string = (parseFloat(mailmergeutils.switch(arrMatches[9], object).replace(",",".")) < parseFloat(arrMatches[11].replace(",","."))) ? string.replace(arrMatches[0], arrMatches[12]) : string.replace(arrMatches[0], arrMatches[13]);
				return mailmergeutils.substitute(string, object);
				
			}
			
			if(arrMatches[10] == "<=" || arrMatches[10] == "&lt;=") {
				
				/* {{name|<=|if|then|else}} */
				string = (parseFloat(mailmergeutils.switch(arrMatches[9], object).replace(",",".")) <= parseFloat(arrMatches[11].replace(",","."))) ? string.replace(arrMatches[0], arrMatches[12]) : string.replace(arrMatches[0], arrMatches[13]);
				return mailmergeutils.substitute(string, object);
				
			}
			
		}
		
		string = string.replace(arrMatches[0], "");
		return mailmergeutils.substitute(string, object);
		
	},
	
	switch: function(string, object) {
		
		if(!object) { return ""; }
		
		switch(mailmergeutils.prefs.source) {
			
			case "Cardbook":
				return mailmergeutils.split(string, object);
				
			case "AddressBook":
				return object.getProperty(string, "");
				
			case "CSV":
			case "JSON":
			case "XLSX":
				return (object[string] || "");
				
			default:;
			
		}
		
	},
	
	split: function(string, object) {
		
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
		
	},
	
	error: function(object) {
		
		console.error("Mail Merge: Error", object);
		Services.prompt.alert(window, "Mail Merge: Error", object);
		
	}
	
}
