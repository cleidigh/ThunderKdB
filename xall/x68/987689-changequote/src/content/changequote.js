// Global variables 
var CQprefs = Components.classes["@mozilla.org/preferences-service;1"].
    		getService(Components.interfaces.nsIPrefBranch);
var CQinlineImages = 0;

var CQmsgComposeType = Components.interfaces.nsIMsgCompType;
var CQmsgComposeFormat = Components.interfaces.nsIMsgCompFormat;

var {MailUtils} = ChromeUtils.import("resource:///modules/MailUtils.jsm");
// values for "changequote.headers.type":
// 0 = extended headers
// 1 = standard headers
// 2 = customized headers via user.js file
//
// values for "changequote.headers.date_long_format":
// 0 = long, in locale time and in locale 
// 1 = long, in locale time and in english
// 2 = long, from the original message header
// 3 = custom

var CQmailformat;
var CQdate;
var CQuse_date_long;

var CQstrBundleService = Components.classes["@mozilla.org/intl/stringbundle;1"].
	getService(Components.interfaces.nsIStringBundleService);
var CQbundle = CQstrBundleService.createBundle("chrome://messenger/locale/mime.properties")

function CQGetFirstSelectedMessage() {
	// TB3 has not GetFirstSelectedMessage function
	if ( typeof GetFirstSelectedMessage  == "undefined" )
		 var msgs = gFolderDisplay.selectedMessageUris[0];
	else
		var msgs = GetFirstSelectedMessage();
	return msgs;	
}

function CQnoReplyTo(event) {
	event.stopPropagation();
	CQprefs.setBoolPref("changequote.headers.ignore_reply_to", true);
	MsgReplyMessage(event);
}

function isNews() {
	try {
		if (typeof GetLoadedMsgFolder == "undefined")
			var typeserver = gFolderDisplay.displayedFolder.server.type;
		else
			var typeserver = GetLoadedMsgFolder().server.type;
	}
	catch(e) {
		var typeserver = "unknown";
	}
	if (typeserver == "nntp") 
		return true;
	else
		return false;
}

function CQcomposeMessage(compType, format, isNNTP) {
	var CQheaders_type = CQprefs.getIntPref("changequote.headers.type");
	var CQdateformat = CQprefs.getIntPref("changequote.headers.date_long_format");
	var CQheaders_news = CQprefs.getBoolPref("changequote.set.headers.news");
	CQuse_date_long = false;

	if (typeof GetLoadedMsgFolder == "undefined")
		var loadedFolder = gFolderDisplay.displayedFolder; 
	else
		var loadedFolder = GetLoadedMsgFolder();
	// Avoid the multiple reply, just the first mail is loaded in the messageArray
	var messageArray =  [CQGetFirstSelectedMessage()]; 
	
	if (format < 0 || CQdateformat == 2 || CQdateformat == 4)
		CQparseheader(messageArray[0]);

	if (format < 0) {
		if (CQmailformat > 0)
			format = CQmailformat;
		else  
			format = CQprefs.getIntPref("changequote.replyformat.format");
	}	

	var id = CQgetCurrentIdentity();
	
	if (isNNTP) {
		if (CQheaders_news)
			loadHeader(messageArray[0], true, isNNTP,false);
		else
	 		standardHeader(messageArray[0]);
	 }
	 else {
		if (CQheaders_type == 0) {
			CQuse_date_long = CQprefs.getBoolPref("changequote.headers.date_long");
			loadHeader(messageArray[0],false, isNNTP,false);
		}
		else if (CQheaders_type == 1)
			standardHeader(messageArray[0]);
		else 
			loadHeader(messageArray[0], true, isNNTP,false);
	}
	closeWindowOrMarkReadAfterReply(messageArray[0]);
	ComposeMessage(compType, format, loadedFolder, messageArray);
}

function CQgetCurrentIdentity() {
	var identity = null;
	var server = null;
	var hintForIdentity = null;
	try {
		var emailuri =  CQGetFirstSelectedMessage(); 
		var CQmessenger = Components.classes["@mozilla.org/messenger;1"].createInstance();
		CQmessenger = CQmessenger.QueryInterface(Components.interfaces.nsIMessenger);
		// Get the header in the form of nsIMsgDBHdr
		var hdr = CQmessenger.messageServiceFromURI(emailuri).messageURIToMsgHdr(emailuri);
		hintForIdentity = hdr.recipients + hdr.ccList;
		var accountKey = hdr.accountKey;
		if (accountKey.length > 0)   {
			var account = accountManager.getAccount(accountKey);
			if (account)
				server = account.incomingServer;
		}
	}
	catch(e) {}
	if (server && !identity) 
		identity = MailUtils.getIdentityForServer(server, hintForIdentity);
	if (!identity)  {
		var allIdentities = accountManager.allIdentities;
		identity = MailUtils.getBestIdentity(allIdentities, hintForIdentity);
	}	
	return identity;
}

function CQaddListener() {
	if (document.getElementById("hdrReplyDropdown")) 
		document.getElementById("hdrReplyDropdown").addEventListener("popupshowing", CQsetReverseLabelHRD, true);
	if (document.getElementById("hdrReplyToSenderDropdown")) 
		document.getElementById("hdrReplyToSenderDropdown").addEventListener("popupshowing", CQsetReverseLabelHRD, true);
	if (document.getElementById("hdrReplyAllDropdown")) 
		document.getElementById("hdrReplyAllDropdown").addEventListener("popupshowing", CQsetReverseLabelAllHRD, true);
}

function CQsetReverseLabelHRD() {
	var identity = CQgetCurrentIdentity();
	try {
          if (! identity.autoQuote) {
		if (document.getElementById("replyhtml_reversequote_hrd1")) {
			document.getElementById("replyhtml_reversequote_hrd1").setAttribute("collapsed", "true");
			document.getElementById("replytext_reversequote_hrd1").setAttribute("collapsed", "true"); 
		}
		if (document.getElementById("replyhtml_reversequote_hrd2")) {
			document.getElementById("replyhtml_reversequote_hrd2").removeAttribute("collapsed");
			document.getElementById("replytext_reversequote_hrd2").removeAttribute("collapsed");	
		}
		if (document.getElementById("replyhtml_reversequote_hrd3")) {
			document.getElementById("replyhtml_reversequote_hrd3").setAttribute("collapsed", "true");
			document.getElementById("replytext_reversequote_hrd3").setAttribute("collapsed", "true"); 
		}
		if (document.getElementById("replyhtml_reversequote_hrd4")) {
			document.getElementById("replyhtml_reversequote_hrd4").removeAttribute("collapsed");
			document.getElementById("replytext_reversequote_hrd4").removeAttribute("collapsed");
		}
		if (document.getElementById("replyhtml_reversequote_hrd5")) {
			document.getElementById("replyhtml_reversequote_hrd5").setAttribute("collapsed", "true");
			document.getElementById("replytext_reversequote_hrd5").setAttribute("collapsed", "true"); 
		}
		if (document.getElementById("replyhtml_reversequote_hrd6")) {
			document.getElementById("replyhtml_reversequote_hrd6").removeAttribute("collapsed");
			document.getElementById("replytext_reversequote_hrd6").removeAttribute("collapsed");	
		}
	  }
	  else {
		if (document.getElementById("replyhtml_reversequote_hrd1")) {
			document.getElementById("replyhtml_reversequote_hrd1").removeAttribute("collapsed");
			document.getElementById("replytext_reversequote_hrd1").removeAttribute("collapsed");
		}
		if (document.getElementById("replyhtml_reversequote_hrd2")) {
			document.getElementById("replyhtml_reversequote_hrd2").setAttribute("collapsed", "true");
			document.getElementById("replytext_reversequote_hrd2").setAttribute("collapsed", "true");
		}
		if (document.getElementById("replyhtml_reversequote_hrd3")) {
			document.getElementById("replyhtml_reversequote_hrd3").removeAttribute("collapsed");
			document.getElementById("replytext_reversequote_hrd3").removeAttribute("collapsed");
		}
		if (document.getElementById("replyhtml_reversequote_hrd4")) {
			document.getElementById("replyhtml_reversequote_hrd4").setAttribute("collapsed", "true");
			document.getElementById("replytext_reversequote_hrd4").setAttribute("collapsed", "true");
		}
		if (document.getElementById("replyhtml_reversequote_hrd5")) {
			document.getElementById("replyhtml_reversequote_hrd5").removeAttribute("collapsed");
			document.getElementById("replytext_reversequote_hrd5").removeAttribute("collapsed");
		}
		if (document.getElementById("replyhtml_reversequote_hrd6")) {
			document.getElementById("replyhtml_reversequote_hrd6").setAttribute("collapsed", "true");
			document.getElementById("replytext_reversequote_hrd6").setAttribute("collapsed", "true");
		}
	  }
	}
	catch(e) {}
}

function CQsetReverseLabelAllHRD() {
	var identity = CQgetCurrentIdentity();
	try {
          if (! identity.autoQuote) {
		if (document.getElementById("replyhtmlALL_reversequote_hrd1")) {
			document.getElementById("replyhtmlALL_reversequote_hrd1").setAttribute("collapsed", "true");
			document.getElementById("replytextALL_reversequote_hrd1").setAttribute("collapsed", "true"); 
		}
		if (document.getElementById("replyhtmlALL_reversequote_hrd2")) {
			document.getElementById("replyhtmlALL_reversequote_hrd2").removeAttribute("collapsed");
			document.getElementById("replytextALL_reversequote_hrd2").removeAttribute("collapsed"); 
		}
		if (document.getElementById("replyhtmlALL_reversequote_hrd3")) {
			document.getElementById("replyhtmlALL_reversequote_hrd3").setAttribute("collapsed", "true");
			document.getElementById("replytextALL_reversequote_hrd3").setAttribute("collapsed", "true"); 
		}
		if (document.getElementById("replyhtmlALL_reversequote_hrd4")) {
			document.getElementById("replyhtmlALL_reversequote_hrd4").removeAttribute("collapsed");
			document.getElementById("replytextALL_reversequote_hrd4").removeAttribute("collapsed"); 
		}
	  }	
	  else { 
		if (document.getElementById("replyhtmlALL_reversequote_hrd1")) {
			document.getElementById("replyhtmlALL_reversequote_hrd1").removeAttribute("collapsed");
			document.getElementById("replytextALL_reversequote_hrd1").removeAttribute("collapsed");
		}
		if (document.getElementById("replyhtmlALL_reversequote_hrd2")) {
			document.getElementById("replyhtmlALL_reversequote_hrd2").setAttribute("collapsed", "true");
			document.getElementById("replytextALL_reversequote_hrd2").setAttribute("collapsed", "true");
		}
		if (document.getElementById("replyhtmlALL_reversequote_hrd3")) {
			document.getElementById("replyhtmlALL_reversequote_hrd3").removeAttribute("collapsed");
			document.getElementById("replytextALL_reversequote_hrd3").removeAttribute("collapsed");
		}
		if (document.getElementById("replyhtmlALL_reversequote_hrd4")) {
			document.getElementById("replyhtmlALL_reversequote_hrd4").setAttribute("collapsed", "true");
			document.getElementById("replytextALL_reversequote_hrd4").setAttribute("collapsed", "true");
		}
	  }
	}
	catch(e) {}
}

function CQsetReverseLabel() {
	var identity = CQgetCurrentIdentity();
	if (! identity.autoQuote) {
		document.getElementById("replyhtml_reversequote1").setAttribute("collapsed", "true");
		document.getElementById("replytext_reversequote1").setAttribute("collapsed", "true"); 
		document.getElementById("replyhtml_reversequote2").removeAttribute("collapsed");
		document.getElementById("replytext_reversequote2").removeAttribute("collapsed");	
	}
	else {
		document.getElementById("replyhtml_reversequote2").setAttribute("collapsed", "true");
		document.getElementById("replytext_reversequote2").setAttribute("collapsed", "true");
		document.getElementById("replyhtml_reversequote1").removeAttribute("collapsed");
		document.getElementById("replytext_reversequote1").removeAttribute("collapsed");
	}
}


function CQsetReverseLabelALL() {
	var identity = CQgetCurrentIdentity();
	if (! identity.autoQuote) {
		document.getElementById("replyhtmlALL_reversequote1").setAttribute("collapsed", "true");
		document.getElementById("replytextALL_reversequote1").setAttribute("collapsed", "true"); 
		document.getElementById("replyhtmlALL_reversequote2").removeAttribute("collapsed");
		document.getElementById("replytextALL_reversequote2").removeAttribute("collapsed");	
	}
	else {
		document.getElementById("replyhtmlALL_reversequote2").setAttribute("collapsed", "true");
		document.getElementById("replytextALL_reversequote2").setAttribute("collapsed", "true");
		document.getElementById("replyhtmlALL_reversequote1").removeAttribute("collapsed");
		document.getElementById("replytextALL_reversequote1").removeAttribute("collapsed");		
	}
}


function reverseAutoQuote() {
	var identity = CQgetCurrentIdentity();
	var prefName = "mail.identity."+identity.key+".auto_quote";
	if (identity.autoQuote)
		CQprefs.setBoolPref( prefName , false );
	else
		CQprefs.setBoolPref( prefName , true );
	var id = identity.key.toString();
	CQprefs.setCharPref("changequote.auto_quote.reverse_key", id);
}
	

function replyHTML(event,reversequote) {
	event.stopPropagation();
	var isNNTP = isNews();
	if (isNNTP)
		var compType = CQmsgComposeType.ReplyToGroup;
	else
		var compType = CQmsgComposeType.ReplyToSender;
	if (reversequote)
		reverseAutoQuote();
	CQcomposeMessage(compType,1,isNNTP);
}

function replyText(event,reversequote) {
	event.stopPropagation();
	var isNNTP = isNews();
	if (isNNTP)
		var compType = CQmsgComposeType.ReplyToGroup;
	else
		var compType = CQmsgComposeType.ReplyToSender;
	if (reversequote)
		reverseAutoQuote();
	CQcomposeMessage(compType,2,isNNTP);
}

function replyAllHTML(event,reversequote) {
	event.stopPropagation();
	var isNNTP = isNews();
	if (reversequote)
		reverseAutoQuote();
	CQcomposeMessage(CQmsgComposeType.ReplyAll,1,isNNTP);
}

function replyAllText(event,reversequote) {
	event.stopPropagation();
	var isNNTP = isNews();
	if (reversequote)
		reverseAutoQuote();
	CQcomposeMessage(CQmsgComposeType.ReplyAll,2,isNNTP);
}

// Overwrite the original functions of reply and quote

if (String.trim && typeof MsgReplyToListMessageORIG == "undefined" && typeof MsgReplyToListMessage != "undefined") {
	var MsgReplyToListMessageORIG = MsgReplyToListMessage;
	MsgReplyToListMessage = function(event) {
		var messageArray =  [CQGetFirstSelectedMessage()];
		var CQheaders_news = CQprefs.getBoolPref("changequote.set.headers.news");
		if (CQheaders_news)
			loadHeader(messageArray[0], true, true,false);
		else
	 		standardHeader(messageArray[0]);
		MsgReplyToListMessageORIG.apply(this,arguments);
	};
}



function MsgReplySender(event) {
	
	var CQreplyformat = CQprefs.getBoolPref("changequote.replyformat.enable");
	// Choose the format of reply: clone the format of the mail?
	if (CQreplyformat) 
		CQcomposeMessage(CQmsgComposeType.ReplyToSender,-1,false);
	else {
		// So no - usual behaviour of TB
		if (event && event.shiftKey)
			CQcomposeMessage(CQmsgComposeType.ReplyToSender,CQmsgComposeFormat.OppositeOfDefault,false);
		else
			CQcomposeMessage(CQmsgComposeType.ReplyToSender,CQmsgComposeFormat.Default,false);
	}
}

function MsgReplyToAllMessage(event){
	
	var CQreplyformat = CQprefs.getBoolPref("changequote.replyformat.enable");	
	if (CQreplyformat) 
		CQcomposeMessage(CQmsgComposeType.ReplyAll,-1,false);	
	else {
		// So no - usual behaviour of TB
		if (event && event.shiftKey)
			CQcomposeMessage(CQmsgComposeType.ReplyAll,CQmsgComposeFormat.OppositeOfDefault,false);
		else
			CQcomposeMessage(CQmsgComposeType.ReplyAll,CQmsgComposeFormat.Default,false);
	}
}

function QuoteSelectedMessage() {
	var CQheaders_type = CQprefs.getIntPref("changequote.headers.type");
	var CQdateformat = CQprefs.getIntPref("changequote.headers.date_long_format");
	CQuse_date_long = CQprefs.getBoolPref("changequote.headers.date_long");
	var selectedURIs = GetSelectedMessages();
	if (selectedURIs) {
		for (i=0; i<selectedURIs.length; i++) {
			var uri = selectedURIs[i];
			if (CQdateformat == 2)
				CQparseheader(uri);
			if (CQheaders_type  == 0) 
				loadHeader(uri,false,false,true);
			else if (CQheaders_type  == 1)
				standardHeader(null);
			else
				loadHeader(uri,true,false,true);
			gMsgCompose.quoteMessage(uri);
		}
	}
}

function MsgReplyGroup(event) {
	if (event && event.shiftKey)
		CQcomposeMessage(CQmsgComposeType.ReplyToGroup,CQmsgComposeFormat.OppositeOfDefault,true);
	else
		CQcomposeMessage(CQmsgComposeType.ReplyToGroup,CQmsgComposeFormat.Default,true);
		
	// if (CQinlineImages == 1)
	//	 preRestoreInline();
}

// This function is used to parse the message header, to get the "Content-type" and the "Date"
// I'd have prefered to do it with nsImessenger.streamMessage and a listener, but in this way
// it's impossible to get the "Content-type" of the body message when it is multipart/mixed
// (i.e. with attachments). And so, unfortunately, I can't use it...

function CQparseheader(emailuri) {
	var scriptableStream=Components.classes["@mozilla.org/scriptableinputstream;1"]
	    .getService(Components.interfaces.nsIScriptableInputStream);

	try {
		if (emailuri.substring(0,4) == "file") {
			// This is used when the original message is an eml file, saved and opened
			var ioService=Components.classes["@mozilla.org/network/io-service;1"]
				.getService(Components.interfaces.nsIIOService);
			var channel=ioService.newChannel(emailuri,null,null);
			var input=channel.open();
			scriptableStream.init(input);
			var str_message=scriptableStream.read(10000);
			scriptableStream.close();
			input.close();
		} 	
		else  {
			// This is for message stored in TB
			// Objects that are required by getOfflineFileStream
			var obj1 = new Object;
			var obj2 = new Object;
			var CQmessenger = Components.classes["@mozilla.org/messenger;1"].createInstance();
			CQmessenger = CQmessenger.QueryInterface(Components.interfaces.nsIMessenger);
			// Get the header in the form of nsIMsgDBHdr
			var hdr = CQmessenger.messageServiceFromURI(emailuri).messageURIToMsgHdr(emailuri);
			// We get the nsIMsgFolder from hdr
			var ourfolder = hdr.folder;
			// Open the stream, to read the folder starting from this message
			try {
				ourfolder = ourfolder.getOfflineFileStream(hdr.messageKey,obj1,obj2);
			}
			catch(e) {
				// error in reading the streaming, this happens with IMAP message, without offline use
				CQmailformat = 0;
				CQdate = "-1";
				return;
			}
			scriptableStream.init(ourfolder);
			var str_message =scriptableStream.read(10000);
			scriptableStream.close();
			ourfolder.close();
		}
	}
	catch(e) {
		// Error in scanning the source, it happens with eml attachments
		CQmailformat = 0;
		return;
	}
	// "str" variable has the first 10000 bytes of the mail, sufficient to get all the headers we need
	var lowerStr = str_message.toLowerCase();

	// Split the header at "Content-type"
	var firstSplit = lowerStr.split("\ncontent-type:");
	var ctype;
	// We parse all the parts, to find the right one ("text/plain", "text/html" or "text/alternative")
	for (i=1;i<firstSplit.length;i++) {
		ctype = firstSplit[i].split("\n")[0];
		if (ctype.indexOf("plain") > -1) {
			CQmailformat = 2; // plain
			break;
		}
		else if (ctype.indexOf("alternative") > -1) {
			CQmailformat = 0; // alternative
			break;
		}
		else if (ctype.indexOf("html") > -1) {
			CQmailformat = 1; // html
			break;
		}
	}
	// Find the original date
	try {
		var dateOrig = lowerStr.split("\ndate:")[1].split("\n")[0];
		dateOrig = dateOrig.replace(/ +$/,"");
		CQdate = dateOrig.replace(/^ +/,"");
	}
	catch(e) {
		CQdate = "-1";
	}
}

// Read the headers and load them in the prefs
function loadHeader(email, custom, isNNTP,cite) {
	var CQmessenger = Components.classes["@mozilla.org/messenger;1"].createInstance();
	CQmessenger = CQmessenger.QueryInterface(Components.interfaces.nsIMessenger);
	var str = Components.classes["@mozilla.org/supports-string;1"].createInstance(Components.interfaces.nsISupportsString);
	var hdr = null;
	var headerDate =  null;
	// If the message is an eml file opened in the window message, or an eml attachment
	// we get the header from the window
	if (email.substring(0,4) == "file" || email.indexOf("x-message-display") > -1) {
		if ( currentHeaderData["from"])
			var sender = currentHeaderData["from"].headerValue;
		else
			var sender = "";
		if (currentHeaderData["to"])
			var recipient = currentHeaderData["to"].headerValue;
		else
			var recipient = "";
		if ( currentHeaderData["subject"])
			var subject = currentHeaderData["subject"].headerValue;
		else
			var subject =  "";
		if ( currentHeaderData["cc"])
			var cclist = currentHeaderData["cc"].headerValue;
		else 
			var cclist = "";
		if ( currentHeaderData["date"]) {
			headerDate = currentHeaderData["date"].headerValue;
			// If the date field is in short format (just the hour, for today mails), we complete it
			if (headerDate.length < 10) {
				var dateobj = new Date();
				var today = dateobj.getTime();
				headerDate = convertPRTimeToString(today*1000)+" "+headerDate;
			}
		}
	}
	// Otherwise we get the header in the form of nsIMsgDBHdr
	else {
		hdr = CQmessenger.messageServiceFromURI(email).messageURIToMsgHdr(email);
		// Get the subject, the recepients and the author in decoded form
		var subject = hdr.mime2DecodedSubject;
		if (! subject)
			subject="";
		var sender = hdr.mime2DecodedAuthor;
		var recipient = hdr.mime2DecodedRecipients;
		if (! recipient)
			recipient="";
		// Has the message the reply flag?
		if (hdr.flags & 0x0010) 
			subject="Re: "+subject;
		var cclist = hdr.ccList;
	}
		
	// Delete the escape char reverse slash and the quote chars
	sender = sender.replace(/\\/g, "");
	sender = sender.replace(/\"/g, "");
	recipient = recipient.replace(/\\/g, "");
	recipient = recipient.replace(/\"/g, "");
	
	if (custom)
		var realnewhdr = getCustomizedHeader(sender,recipient,cclist,subject,hdr,headerDate,isNNTP);
	else if (isNNTP)
		standardHeader(email);
	else if (CQprefs.getBoolPref("changequote.headers.english")) 
		var realnewhdr = getClassicEnglishHeader(sender,recipient,cclist,subject,hdr,headerDate);
	// French locale has some specific details: some labels have already
	// colons and a user told me that french uses a space before colons
	// French locale test
	else if ( CQbundle.GetStringFromID(1012) == "Pour\u00a0:") 
		var realnewhdr = getClassicFrenchHeader(sender,recipient,cclist,subject,hdr,headerDate)
	else
		var realnewhdr = getClassicLocalizedHeader(sender,recipient,cclist,subject,hdr,headerDate)
	// Fix for bug https://bugzilla.mozilla.org/show_bug.cgi?id=334053
	realnewhdr = realnewhdr.replace(/%/g, "%'");

	if (cite) // no HTML support for cite
		realnewhdr = realnewhdr.replace(/\[\[.+?\]\]/g,"");
	else {
		realnewhdr = realnewhdr.replace(/\[\[/g, "([[)");
		realnewhdr = realnewhdr.replace(/\]\]/g, "(]])");
	}	

	CQprefs.setIntPref("mailnews.reply_header_type", 1);
	
	if (CQprefs.getPrefType("mailnews.reply_header_authorwrotesingle") > 0) {
		if (custom && ! CQprefs.getBoolPref("changequote.headers.add_newline", ""))
			str.data = realnewhdr;
		else
			str.data = realnewhdr+"\n";
        CQprefs.setStringPref("mailnews.reply_header_authorwrotesingle", str);
	}
	else {
		if (custom && ! CQprefs.getBoolPref("changequote.headers.add_newline", ""))
			CQprefs.setCharPref("mailnews.reply_header_colon", "");
		else
			CQprefs.setCharPref("mailnews.reply_header_colon", "\n");
		str.data = realnewhdr;
        CQprefs.setStringPref("mailnews.reply_header_authorwrotesingle", str);
	}

	closeWindowOrMarkReadAfterReply(email);
}

// Function decoding the ccList from the rfc2047/rfc2231 encoding
function ccListDecoded(cc) {
	try {
		var mime2DecodedService = Components.classes["@mozilla.org/network/mime-hdrparam;1"].getService(Components.interfaces.nsIMIMEHeaderParam);
		// we need to replace the spaces with something else and then restore the spaces
		// because mime2DecodedService.getParameter stops its work at the first blank char
		cc = cc.replace(/ /g, "###");
		var ccDecoded = mime2DecodedService.getParameter(cc, null, "", false, {value: null});
		return ccDecoded.replace(/###/g, " ");
	}
	catch(e) {
		// Illegal headers in CC can make fail the function mime2DecodedService.getParameter
		return cc.replace(/###/g, " ");
	}
}	

function d2h(d) {
	var hD="0123456789ABCDEF";
	var h = hD.substr(d&15,1);
	while(d>15) {d>>=4;h=hD.substr(d&15,1)+h;}
	return h;
}

// Reset the headers to the standard
function standardHeader(msguri) {
	if (CQprefs.prefHasUserValue("mailnews.reply_header_type"))
	        CQprefs.clearUserPref("mailnews.reply_header_type");
	if (CQprefs.prefHasUserValue("mailnews.reply_header_authorwrote"))
   	     CQprefs.clearUserPref("mailnews.reply_header_authorwrote");
	if (CQprefs.prefHasUserValue("mailnews.reply_header_ondate"))
      		CQprefs.clearUserPref("mailnews.reply_header_ondate");
	if (CQprefs.prefHasUserValue("mailnews.reply_header_separator"))
        	CQprefs.clearUserPref("mailnews.reply_header_separator");
	if (CQprefs.prefHasUserValue("mailnews.reply_header_colon"))
        	CQprefs.clearUserPref("mailnews.reply_header_colon");
	if (CQprefs.prefHasUserValue("mailnews.reply_header_authorwrotesingle"))
   	     CQprefs.clearUserPref("mailnews.reply_header_authorwrotesingle");
	if (msguri)
		closeWindowOrMarkReadAfterReply(msguri);
}


function closeWindowOrMarkReadAfterReply(msguri) {
	if (! msguri) 
		return;
	try {
		if (CQprefs.getBoolPref("changequote.window.close_after_reply")) {
			var winurl = document.location.href;
                        if (winurl == "chrome://messenger/content/messageWindow.xul")
				setTimeout(function(){window.close();}, 1500);
		}
		if (CQprefs.getBoolPref("changequote.message.markread_after_reply")) {
			MarkSelectedMessagesRead(true);		
		}
	}
	catch(e) {}
}

function getClassicEnglishHeader(sender,recipient,cclist,subject,hdr,headerDate) {
	var tags = CQgetBtags();
	var newhdr ="-------- Original Message  --------\n";
	var senderhdr = tags[0]+"From: "+tags[1]+sender+"\n";
	var recipienthdr = tags[0]+"To: "+tags[1]+recipient;
	var cclabel = tags[0]+"Cc: "+tags[1];
	if (CQprefs.getBoolPref("changequote.headers.withcc") && cclist.length >0) 
		recipienthdr = recipienthdr + "\n" + cclabel + ccListDecoded(cclist);
	var subjectlabel = tags[0]+"Subject: "+tags[1];
	var realnewhdr = newhdr + subjectlabel + subject+ "\n" + senderhdr + recipienthdr+"\n";
	var datestring = CQgetDate(hdr,headerDate);
	var newdate = tags[0]+"Date: "+tags[1] + datestring;
	return realnewhdr+newdate;
}

function getClassicFrenchHeader(sender,recipient,cclist,subject,hdr,headerDate) {
	var tags = CQgetBtags();
	var newhdr = CQbundle.GetStringFromID(1041) + "\n";
	var senderhdr = tags[0]+CQbundle.GetStringFromID(1009) + " : " +tags[1]+sender+"\n";
	var recipienthdr = tags[0]+CQbundle.GetStringFromID(1012) +  " "+tags[1]+recipient;
	var cclabel =  tags[0]+CQbundle.GetStringFromID(1013) + " "+tags[1];
	if (CQprefs.getBoolPref("changequote.headers.withcc") && cclist.length >0) 
		recipienthdr = recipienthdr + "\n" + cclabel + ccListDecoded(cclist);
	var datelabel =   tags[0]+CQbundle.GetStringFromID(1007) + " : "+tags[1];
	var subjectlabel =  tags[0]+CQbundle.GetStringFromID(1000)+ " : "+tags[1];
	var realnewhdr = newhdr + subjectlabel + subject+ "\n" + senderhdr + recipienthdr+"\n";
	var datestring = CQgetDate(hdr,headerDate);
	var newdate = datelabel + datestring;
	return realnewhdr+newdate;
}

function CQgetBtags() {
	var tagArr = [];
	if (CQprefs.getBoolPref("changequote.headers.label_bold")) {
		tagArr.push("[[b]]");
		tagArr.push("[[/b]]");
	}
	else {
		tagArr.push("");
		tagArr.push("");
	}	
	return tagArr;
}

function getClassicLocalizedHeader(sender,recipient,cclist,subject,hdr,headerDate) {
	var tags = CQgetBtags();
	var newhdr = CQbundle.GetStringFromID(1041) + "\n";
	var senderhdr = tags[0]+CQbundle.GetStringFromID(1009) + ": " +tags[1]+sender+"\n";
	var recipienthdr = tags[0]+CQbundle.GetStringFromID(1012) +  ": "+tags[1]+recipient;
	var cclabel = tags[0]+CQbundle.GetStringFromID(1013) + ": "+tags[1];
	if (CQprefs.getBoolPref("changequote.headers.withcc") && cclist.length >0) 
		recipienthdr = recipienthdr + "\n" + cclabel + ccListDecoded(cclist);
	var datelabel =  tags[0]+CQbundle.GetStringFromID(1007) + ": "+tags[1];
	var subjectlabel = tags[0]+CQbundle.GetStringFromID(1000)+ ": "+tags[1];
	var realnewhdr = newhdr + subjectlabel + subject+ "\n" + senderhdr + recipienthdr+"\n";
	var datestring = CQgetDate(hdr,headerDate);
	var newdate = datelabel + datestring;
	return realnewhdr+newdate;
}

function CQgetDate(hdr,headerDate) {
	if (headerDate) {
		headerDate = headerDate.replace(/ +$/, "");
		return headerDate;
	}
	var date = new Date(hdr.date/1000);
	if (CQuse_date_long) {
		var dateLongFormat = CQprefs.getIntPref("changequote.headers.date_long_format");
		if (dateLongFormat == 2 && CQdate != "-1")
			var datestring = CQdate;
		else if (dateLongFormat == 1 || CQdate == "-1") 		
			var datestring = date.toString();
		else if (dateLongFormat == 3) 
			var datestring = decodeCustomizedDate(date);
		else if (dateLongFormat == 4 && CQdate != "-1") 
			var datestring = decodeCustomizedDateSender(CQdate);
		else 
			var datestring = date.toLocaleString();
		if (CQprefs.getBoolPref("changequote.headers.capitalize_date"))
			datestring = CQcapitalize(datestring);
		datestring = datestring.replace(/ +$/, "");
		return datestring;
	}
	else {
       var formDate = new Services.intl.DateTimeFormat().format(date)
	   formDate = formDate.replace(/ +$/, "");
	   return formDate;
	}
}

// Assume date is of format "mon, 6 aug 2018 20:19:19 +0100"
function decodeCustomizedDateSender(date) {
	// Sometimes date has several spaces between day string and day number
	date = date.replace(/ +/, " ");
	var d = parseInt(date.match(/\d\d?/));
	var e = d<10 ? " "+d : d;
	d = d<10 ? "0"+d : d;
	var D = date.substring(0,3);
	// Sometimes date is of format "6 aug 2018 20:19:19 +0100":
	// Set missing day offset
	var mdo = 0;
	if (D.match(/\w{3}/) == null)
		mdo = -1;
	var M = date.split(" ")[2 + mdo];
	switch(M) {
		case "jan":
			var m = "01";
			break; 
		case "feb":
			var m = "02";
			break; 
		case "mar":
			var m = "03";
			break; 
		case "apr":
			var m = "04";
			break; 
		case "may":
			var m = "05";
			break; 
		case "jun":
			var m = "06";
			break; 
		case "jul":
			var m = "07";
			break; 
		case "aug":
			var m = "08";
			break; 
		case "sep":
			var m = "09";
			break;
		case "oct":
			var m = "10";
			break;  
		case "nov":
			var m = "11";
			break;
		case "dec":
			var m = "12";
			break;  
		default:
			var m = " ";
	}
	M = M.substring(0,1).toUpperCase()+M.substring(1);
	var Y = date.split(" ")[3 + mdo];
	if (mdo != 0) {
		var tmpDate = new Date(Y+"-"+m+"-"+d);
		var days = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"];
		date = days[tmpDate.getDay()] + ", " + date;
	}
	var i = date.split(" ")[4].split(":")[1];
	var s = date.split(" ")[4].split(":")[2];
	var H = date.split(" ")[4].split(":")[0];
	var h = H>12 ? H-12 : H;
	var a = H>12 ? "pm" : "am";
	var A = H>12 ? "PM" : "AM";
	var z = date.split(" ")[5];
	z = z.substring(0,5);
	var str = CQprefs.getCharPref("changequote.headers.dateSender_custom_format");
	str = str.replace("%d", d);
	str = str.replace("%D", D);
	str = str.replace("%m", m);
	str = str.replace("%M", M);
	str = str.replace("%y", Y);
	str = str.replace("%Y", Y);
	str = str.replace("%i", i);
	str = str.replace("%s", s);
	str = str.replace("%H", H);
	str = str.replace("%h", h);
	str = str.replace("%A", A);
	str = str.replace("%a", a);
	str = str.replace("%e", e);
	str = str.replace("%z", z);
	return str;
}


function decodeCustomizedDate(date) {
	var d = date.getDate();
	var e = d<10 ? " "+d : d;
	d = d<10 ? "0"+d : d;
	var m = date.getMonth()+1;
	m = m<10 ? "0"+m : m;
	var y = date.getYear()-100;
	y = y<10 ? "0"+y : y;
	var D = date.toString().split(" ")[0];
	var M = date.toString().split(" ")[1];
	var Y = date.getFullYear();
	var i = date.getMinutes();
	i = i<10 ? "0"+i : i;
	var s = date.getSeconds();
	s = s<10 ? "0"+s : s;
	var H = date.getHours();
	var h = H>12 ? H-12 : H;
	var a = H>12 ? "pm" : "am";
	var A = H>12 ? "PM" : "AM";
	var z = date.toString().split(" ")[5];
	z = z.replace(/[a-zA-Z]+/, "");
	z = z.substring(0,5);
	var str = CQprefs.getCharPref("changequote.headers.date_custom_format");
	H = H<10 ? "0"+H : H;
	h = h<10 ? "0"+h : h;
	str = str.replace("%d", d);
	str = str.replace("%D", D);
	str = str.replace("%m", m);
	str = str.replace("%M", M);
	str = str.replace("%y", Y);
	str = str.replace("%Y", Y);
	str = str.replace("%i", i);
	str = str.replace("%s", s);
	str = str.replace("%H", H);
	str = str.replace("%h", h);
	str = str.replace("%A", A);
	str = str.replace("%a", a);
	str = str.replace("%e", e);
	str = str.replace("%z", z);
	return str;
}

function getCustomizedHeader(sender,recipient,cclist,subject,hdr,headerDate,isNNTP) {
	if (isNNTP)
		var ch = CQprefs.getStringPref("changequote.headers.news.customized");
	else
		var ch = CQprefs.getStringPref("changequote.headers.customized");
	if (cclist == "")
		cclist ="§§§§";
	else
		cclist = ccListDecoded(cclist);
	if (subject == "")
		subject ="§§§§";
	if (sender == "")
		sender ="§§§§";
	if (recipient == "")
		recipient ="§§§§";

	ch = ch.replace("%%1", sender);
	ch = ch.replace("%%2", recipient);
	ch = ch.replace("%%3", cclist);
	ch = ch.replace("%%4", subject);
	CQuse_date_long = CQprefs.getBoolPref("changequote.headers.date_long");
	var msgDate = CQgetDate(hdr,headerDate);
	ch = ch.replace("%%5", msgDate);
	var sender_nomail = sender.replace(/<.+>/, "");
	sender_nomail = sender_nomail.replace(/ +$/, "");
	ch = ch.replace("%%6", sender_nomail);
	var sender_mail = sender.replace(/.+</,"");
	sender_mail = sender_mail.replace(">","");
	ch = ch.replace("%%7", sender_mail);
	var recipient_nomail = recipient.replace(/<.+?>/g, "");
	recipient_nomail =  recipient_nomail.replace(/ +$/, "");
	ch = ch.replace("%%8", recipient_nomail);
	 var cclist_nomail = cclist.replace(/<.+?>/g,  "");
	cclist_nomail =  cclist_nomail.replace(/ +$/, "");
	ch = ch.replace("%%9", cclist_nomail);

	 if (cclist == "§§§§" ||  subject == "§§§§" || recipient == "§§§§" || sender == "§§§§") {
                ch = ch.replace(/\{\{[^\{\}]*§§§§[^\{\}]*\}\}/g, "§§§§");
                ch = ch.replace(/(\n§§§§\n)*§§§§$/g, "");
                ch = ch.replace(/\n§§§§\n/g, "\n");
                ch = ch.replace(/§§§§/g, "");
        }

        ch = ch.replace(/\{\{/g, "");
        ch = ch.replace(/\}\}/g, "");
	return ch;
}

function CQcapitalize(val) {
        var newVal = "";
        val = val.split(' ');
        for(var c=0; c < val.length; c++) {
                newVal += val[c].substring(0,1).toUpperCase() + val[c].substring(1,val[c].length) + ' ';
        }
        return newVal;
}


	
