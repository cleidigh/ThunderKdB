//////////////////////////////////////////////////
///
///  Joins partial messages
///
///  Copyright (c) 2007-2010 Munekazu SHINKAI
///  Copyright (c) 2013 Paulius Zaleckas
///			<paulius.zaleckas@gmail.com>
///
///  This software is provided 'as-is', without any express or implied
///  warranty. In no event will the authors be held liable for any damages
///  arising from the use of this software.
///
///  Permission is granted to anyone to use this software for any purpose,
///  including commercial applications, and to alter it and redistribute it
///  freely, subject to the following restrictions:
///
///   1. The origin of this software must not be misrepresented; you must not
///   claim that you wrote the original software. If you use this software
///   in a product, an acknowledgment in the product documentation would be
///   appreciated but is not required.
///
///   2. Altered source versions must be plainly marked as such, and must not be
///   misrepresented as being the original software.
///
///   3. This notice may not be removed or altered from any source
///   distribution.
///
//////////////////////////////////////////////////

const nsIAP = Components.interfaces.nsIActivityProcess;
const nsIAE = Components.interfaces.nsIActivityEvent;
const nsIAM = Components.interfaces.nsIActivityManager;

//////////////////////////////////////////////////
///  Displays debug info on console.
///  To enable debug you have to set following variables:
///    browser.dom.window.dump.enabled = true
///    extensions.join-ng.debug = true
//////////////////////////////////////////////////
function MyDump( sMsg )
{
	if ( Services.prefs.getBoolPref("extensions.join-ng.debug") == true ) {
		dump(sMsg);
	}
}


var Join = {
	mIsMIME: false,

	PartMsgInfo : function ( number, total, id, uri )
	{
		this.id = id;
		this.number = number;
		this.total = total;
		this.uri = uri;
	},

	//////////////////////////////////////////////////
	///  Sort by PartMsgInfo
	///  Return 1 if needs sorting, else -1.
	//////////////////////////////////////////////////
	SortPartMsgInfo : function ( oLeft, oRight )
	{
		if ( Number(oLeft.number) > Number(oRight.number) ) {
			return 1;
		}
		else {
			return -1;
		}
	},

	Main : function ()
	{
		try {
			this.Join();
		}
		catch ( e ) {
			MyDump("!!!! Exception: " + e + "\n");
		}

		return 0;
	},

	MessagesBasicCheck : function (oMsgInfoLst, nMsgCnt)
	{
		MyDump("------------------------------\n");
		MyDump("## Check messages\n");

		// Check if we have all the messages
		var nTotal = oMsgInfoLst[nMsgCnt - 1].total;
		if (nMsgCnt != nTotal) {
			MyDump("The number of selected messages doesn't match the 'total' ... abort\n");
			MyDump("==============================\n");

			var sErrMsg = document.getElementById('JoinNGBundle').getString('UnmatchTotal');
			var sErrDtl = "nMsgCnt=" + nMsgCnt + "\n" +
			              "nTotal=" + nTotal;
			throw sErrMsg + "\n\n" + sErrDtl;
		}

		// Check if messages numbers are sequential
		var nMsgIdx;
		for (nMsgIdx = 0; nMsgIdx < nMsgCnt; nMsgIdx++) {
			if (Number(oMsgInfoLst[nMsgIdx].number) != (nMsgIdx + 1)) {
				MyDump("Message sequence No." + nMsgIdx + " does not match real No." + oMsgInfoLst[nMsgIdx].number + "\n");
				MyDump("==============================\n");

				var sErrMsg = document.getElementById('JoinNGBundle').getString('UnmatchMessageSeq');
				throw sErrMsg;
			}
		}

		// Check if all messages have the same Message-ID
		var sId = oMsgInfoLst[0].id;
		MyDump("<List cnt=" + nMsgCnt + ">\n");
		for ( nMsgIdx = 1; nMsgIdx < nMsgCnt; nMsgIdx++ ) {
			if ( oMsgInfoLst[nMsgIdx].id != sId ) {
				MyDump("Message No." + nMsgIdx + ": Invalid Message-ID ... abort\n");
				MyDump("==============================\n");

				var sErrMsg = document.getElementById('JoinNGBundle').getString('UnmatchMessageID');
				var sErrDtl = "nMsgIdx=" + nMsgIdx + "\n" +
				              "sId=" + sId + "\n" +
				              "oMsgInfoLst[nMsgIdx].id=" + oMsgInfoLst[nMsgIdx].id;
				throw sErrMsg + "\n\n" + sErrDtl;
			}

			MyDump("Message No." + nMsgIdx + ": OK\n");
		}
	},

	ProcessMIME : function (sMsgUriLst, nMsgCnt)
	{
		var oMsgInfoLst = new Array(nMsgCnt);
		var nMsgIdx;

		// Get required info from all selected messages headers
		MyDump("<List cnt=" + nMsgCnt + ">\n");
		for ( nMsgIdx = 0; nMsgIdx < nMsgCnt; nMsgIdx++ ) {
			var sMsgUri = sMsgUriLst[nMsgIdx];
			var sMsgData = this.GetHeader(sMsgUri);
			var sMsgHead = this.FormHeader(sMsgData);

			// Get Content-Type field (case insensitive)
			var sMsgType = '';
			try {
				sMsgType = sMsgHead.match(/Content-Type: *(.+)/i)[1];
			}
			catch ( e ) {
				MyDump("Message No." + nMsgIdx + ": " + e + " ... abort\n");
				MyDump("==============================\n");

				return null;
			}

			// Check if Content-Type is message/partial (case insensitive)
			if ( ! sMsgType.match(/^message\/partial/i) ) {
				MyDump("Message No." + nMsgIdx + ": Content-Type isn't 'message/partial' ... abort\n");
				MyDump("==============================\n");

				var sErrMsg = document.getElementById('JoinNGBundle').getString('NotPartialMessage');
				var sErrDtl = "nMsgIdx=" + nMsgIdx + "\n" +
				              "sMsgType=" + sMsgType;
				throw sErrMsg + "\n\n" + sErrDtl;
			}

			// Get message/partial fields info (case insensitive)
			// support values not only in double quotes
			oMsgInfoLst[nMsgIdx] = new this.PartMsgInfo();
			try {
				oMsgInfoLst[nMsgIdx].number = sMsgType.match(/number=([0-9]+)/i)[1];

				// total is optional parameter in not last messages
				// MessagesBasicCheck() will check if it was correct in last message.
				var oTotRes = sMsgType.match(/total=([0-9]+)/i);
				if (oTotRes[0])
					oMsgInfoLst[nMsgIdx].total = oTotRes[1];
				else
					oMsgInfoLst[nMsgIdx].total = 0;

				var oREResLst = sMsgType.match(/id=\"([^\"]+)\"|id=([^ \(\)<>@,;:\\\"\/\[\]\?=]+)(\(null\))?[;$]/i);
				if (oREResLst[1])
					oMsgInfoLst[nMsgIdx].id = oREResLst[1];
				else
					oMsgInfoLst[nMsgIdx].id = oREResLst[2];

				oMsgInfoLst[nMsgIdx].uri = sMsgUri;
			}
			catch ( e ) {
				MyDump("Message No." + nMsgIdx + ": " + e + " ... abort\n");
				MyDump("==============================\n");

				var sErrMsg = document.getElementById('JoinNGBundle').getString('MissingParameter');
				var sErrDtl = "nMsgIdx=" + nMsgIdx + "\n" +
				              "sMsgType=" + sMsgType;
				throw sErrMsg + "\n\n" + e + "\n" + sErrDtl;
			}

			MyDump("Message No." + nMsgIdx + ": " +
			       "number=" + oMsgInfoLst[nMsgIdx].number + ", " +
			       "total=" + oMsgInfoLst[nMsgIdx].total + ", " +
			       "id=" + oMsgInfoLst[nMsgIdx].id + "\n");
		}


		MyDump("------------------------------\n");
		MyDump("## Sort messages\n");

		oMsgInfoLst.sort(this.SortPartMsgInfo);

		var oMsgSortedUriLst = new Array(nMsgCnt);
		MyDump("<List cnt=" + nMsgCnt + ">\n");
		for ( nMsgIdx = 0; nMsgIdx < nMsgCnt; nMsgIdx++ ) {
			MyDump("Message No." + nMsgIdx + ": " +
			       "number=" + oMsgInfoLst[nMsgIdx].number + ", " +
			       "total=" + oMsgInfoLst[nMsgIdx].total + ", " +
			       "id=" + oMsgInfoLst[nMsgIdx].id + "\n");
			oMsgSortedUriLst[nMsgIdx] = oMsgInfoLst[nMsgIdx].uri;
		}

		this.MessagesBasicCheck(oMsgInfoLst, nMsgCnt);

		this.mIsMIME = true;

		return oMsgSortedUriLst;
	},

	/**
	 * http://www.freesoft.org/CIE/RFC/1521/24.htm
	 */
	GenerateMIMEHeader : function (sFirstMsgUri)
	{
		// Get old message header from the first message
		// Each line is split into sOrigMsgHeadLst list
		var sMsgData = this.GetHeader(sFirstMsgUri);
		var sMsgHead = this.FormHeader(sMsgData);
		var sOrigMsgHeadLst = sMsgHead.split("\n");

		// Get the encapslated message header of the first message
		// Each element of sEncMsgHeadLst is divided into array
		var sMsgBody = this.GetBody(this.GetMessage(sFirstMsgUri));
		var sEncMsgHead = this.FormHeader(sMsgBody);
		var sEncMsgHeadLst = sEncMsgHead.split("\n");

		// Merge headers
		var sTbHead = '';
		var nMsgHeadIdx;
		var sSpecialHeaders = /^Content-|^Message-ID|^Encrypted|^MIME-Version/i;

		// copy everything except special headers
		for (nMsgHeadIdx = 0; nMsgHeadIdx < sOrigMsgHeadLst.length; nMsgHeadIdx++)
			if (!sSpecialHeaders.test(sOrigMsgHeadLst[nMsgHeadIdx]))
				sTbHead += this.DecodeCrlf(sOrigMsgHeadLst[nMsgHeadIdx]) + "\n";

		// append special headers from enclosed header
		for (nMsgHeadIdx = 0; nMsgHeadIdx < sEncMsgHeadLst.length; nMsgHeadIdx++)
			if (sSpecialHeaders.test(sEncMsgHeadLst[nMsgHeadIdx])) 
				sTbHead += this.DecodeCrlf(sEncMsgHeadLst[nMsgHeadIdx]) + "\n";

		return sTbHead;
	},

	ProcessOldOE : function (sMsgUriLst, nMsgCnt)
	{
		var oMsgInfoLst = new Array(nMsgCnt);
		var nMsgIdx;

		// Get required info from all selected messages headers
		MyDump("<List cnt=" + nMsgCnt + ">\n");
		for ( nMsgIdx = 0; nMsgIdx < nMsgCnt; nMsgIdx++ ) {
			var msgUri = sMsgUriLst[nMsgIdx];
			var msgHdr = messenger.msgHdrFromURI(msgUri);
			oMsgInfoLst[nMsgIdx] = new this.PartMsgInfo();

			oMsgInfoLst[nMsgIdx].uri = msgUri;

			try {
				var msgNumbers = msgHdr.subject.match(/(.*)\[(\d+)\/(\d+)\]$/);
				oMsgInfoLst[nMsgIdx].id = msgNumbers[1];
				oMsgInfoLst[nMsgIdx].number = msgNumbers[2];
				oMsgInfoLst[nMsgIdx].total = msgNumbers[3];
			}
			catch (e) {
				return null;
			}
		}

		MyDump("------------------------------\n");
		MyDump("## Sort messages\n");

		oMsgInfoLst.sort(this.SortPartMsgInfo);

		var oMsgSortedUriLst = new Array(nMsgCnt);
		MyDump("<List cnt=" + nMsgCnt + ">\n");
		for ( nMsgIdx = 0; nMsgIdx < nMsgCnt; nMsgIdx++ ) {
			MyDump("Message No." + nMsgIdx + ": " +
			       "number=" + oMsgInfoLst[nMsgIdx].number + ", " +
			       "total=" + oMsgInfoLst[nMsgIdx].total + ", " +
			       "id=" + oMsgInfoLst[nMsgIdx].id + "\n");
			oMsgSortedUriLst[nMsgIdx] = oMsgInfoLst[nMsgIdx].uri;
		}

		this.MessagesBasicCheck(oMsgInfoLst, nMsgCnt);

		/*
		 * First message must have "begin" and the last one "end"
		 */
		var sMsgData = this.GetMessage(oMsgInfoLst[0].uri);
		var sMsgBody = this.GetBody(sMsgData);
		if (sMsgBody.match(/^begin \d\d\d /) == -1)
			return null;

		sMsgData = this.GetMessage(oMsgInfoLst[nMsgCnt - 1].uri);
		sMsgBody = this.GetBody(sMsgData);
		if (sMsgBody.match(/^end$/) == -1)
			return null;

		this.mIsMIME = false;

		return oMsgSortedUriLst;
	},

	GenerateOldOEHeader : function (sFirstMsgUri)
	{
		return this.GetHeader(sFirstMsgUri);
	},

	GenerateHeader : function (sFirstMsgUri, oMsgFolder)
	{
		var sTbHead;

		if (this.mIsMIME)
			sTbHead = this.GenerateMIMEHeader(sFirstMsgUri);
		else
			sTbHead = this.GenerateOldOEHeader(sFirstMsgUri);

		// Try to improve subject by removing [1/99] ant the end of it
		sTbHead = sTbHead.replace(/(^Subject: [\s\S]*)\s*\[\d+\/\d+\]$/m, "$1");

		// X-Account-Key
		if (sTbHead.indexOf("X-Account-Key") < 0) {
			let oAccountMng = Components.classes["@mozilla.org/messenger/account-manager;1"].getService()
			                  .QueryInterface(Components.interfaces.nsIMsgAccountManager);
			let oAccount = oAccountMng.FindAccountForServer(oMsgFolder.server);
			sTbHead = "X-Account-Key: " + oAccount.key + "\n" + sTbHead;
		}

		// X-Mozilla-Status and X-Mozilla-Status2
		if (sTbHead.indexOf("X-Mozilla-Status") < 0) {
			sTbHead = "X-Mozilla-Status: 0000\n" +
			          "X-Mozilla-Status2: 00000000\n" +
				  sTbHead;
		}

		// From
		if (sTbHead.indexOf("From - ") < 0) {
			let oNow = new Date;
			sTbHead = "From - " + oNow.toString() + "\n" + sTbHead;
		}

		return sTbHead;
	},

	GetLocalFolder : function ()
	{
		// Current folder we are in
		var oMsgFolder = gFolderDisplay.displayedFolder;

		// We can't create messages in IMAP, newsgroup or messanger folders
		if ( (oMsgFolder.server.type == "imap") || (oMsgFolder.server.type == "nntp") || (oMsgFolder.server.type == "im") ) {
			// Get localized folder name
			var sFolderName = Services.prefs.getComplexValue("extensions.join-ng.folder", Components.interfaces.nsIPrefLocalizedString).data;
			// We should be able to store messages in "Local Folders/Joined"
			var acctMgr = Components.classes["@mozilla.org/messenger/account-manager;1"].getService(Components.interfaces.nsIMsgAccountManager);
			let localMsgFolder = acctMgr.localFoldersServer.rootMsgFolder;
			// Create "Joined" folder if there is no such folder yet
			if (!localMsgFolder.containsChildNamed(sFolderName))
				localMsgFolder.createSubfolder(sFolderName, null);
			oMsgFolder = localMsgFolder.getChildNamed(sFolderName);
		}

		return oMsgFolder;
	},

	//////////////////////////////////////////////////
	///  Return 0. On error return -1.
	//////////////////////////////////////////////////
	Join : function ()
	{
		let gActivityManager = Components.classes["@mozilla.org/activity-manager;1"].getService(nsIAM);
		let joinProcess = Components.classes["@mozilla.org/activity-process;1"].createInstance(nsIAP);

		MyDump("==============================\n");
		MyDump("## Start join process\n");

		joinProcess.init(document.getElementById('JoinNGBundle').getString('JoinInProgress'), null);
		joinProcess.contextType = "account";     // group this activity by account
		joinProcess.contextObj = gFolderDisplay.displayedFolder.server;  // account in question

		gActivityManager.addActivity(joinProcess);

		joinProcess.setProgress(document.getElementById('JoinNGBundle').getString('JoinInProgress'), 0, 0);

		MyDump("------------------------------\n");
		MyDump("## Get selected messages\n");

		// Get URIs of selected messages
		var sMsgUriLst = gFolderDisplay.selectedMessageUris;

		// Abort if less than 2 messages selected
		if ( ( ! sMsgUriLst ) || ( sMsgUriLst.length < 2 ) ) {
			MyDump("Too few messages ... abort\n");
			MyDump("==============================\n");

			var sErrMsg = document.getElementById('JoinNGBundle').getString('TooFewMessages');
			alert(sErrMsg);
			joinProcess.state = Components.interfaces.nsIActivityProcess.STATE_CANCELED;
			gActivityManager.removeActivity(joinProcess.id);
			return -1;
		}

		MyDump("------------------------------\n");
		MyDump("## Get message infomation\n");

		var nMsgCnt = sMsgUriLst.length;

		try {
			var sMsgSortedUriLst = this.ProcessMIME(sMsgUriLst, nMsgCnt);
			if (sMsgSortedUriLst == null) {
				// Maybe this message is from old OE and has no MIME info?
				sMsgSortedUriLst = this.ProcessOldOE(sMsgUriLst, nMsgCnt);
				if (sMsgSortedUriLst == null) {
					var sErrMsg = document.getElementById('JoinNGBundle').getString('InvalidMessages');
					alert(sErrMsg);
					joinProcess.state = Components.interfaces.nsIActivityProcess.STATE_CANCELED;
					gActivityManager.removeActivity(joinProcess.id);
					return -1;
				}
			}
		}
		catch (e) {
			alert(e);
			joinProcess.state = Components.interfaces.nsIActivityProcess.STATE_CANCELED;
			gActivityManager.removeActivity(joinProcess.id);
			return -1;
		}

		MyDump("------------------------------\n");
		MyDump("## Join messages\n");

		var sMsgBody = '';

		MyDump("<List cnt=" + nMsgCnt + ">\n");
		var nMsgIdx;
		for ( nMsgIdx = 0; nMsgIdx < nMsgCnt; nMsgIdx++ ) {
			// Get the message URI
			var sMsgUri = sMsgSortedUriLst[nMsgIdx];
			var msgHdr = messenger.msgHdrFromURI(sMsgUri);

			// Get message body by URI
			var sMsgData = this.GetMessage(sMsgUri);
			// First MIME message has encapsulated header. Remove it.
			if (this.mIsMIME && nMsgIdx == 0)
				sMsgData = this.GetBody(sMsgData);
			sMsgBody += this.GetBody(sMsgData) + "\n";

			// Mark joined messages as read
			msgHdr.markRead(true);

			MyDump("Message No." + nMsgIdx + ": done\n");
		}

		MyDump("------------------------------\n");
		MyDump("## Add new message\n");

		// Current folder we are in
		var oMsgFolder = this.GetLocalFolder();
		var oMsgLocalFolder = oMsgFolder.QueryInterface(Components.interfaces.nsIMsgLocalMailFolder);

		// Thunderbird message header
		var sTbHead = this.GenerateHeader(sMsgSortedUriLst[0], oMsgFolder);

		// add Thunderbird header to the message body
		sMsgBody = sTbHead + "\n\n" + sMsgBody + "\n";

		var oMsgHead = oMsgLocalFolder.addMessage(sMsgBody);

		// Mark new joined message as unread
		oMsgHead.markRead(false);

		MyDump("------------------------------\n");
		MyDump("## It's done, Hooray!\n");
		MyDump("==============================\n");

		joinProcess.state = Components.interfaces.nsIActivityProcess.STATE_COMPLETED;
		gActivityManager.removeActivity(joinProcess.id);

		var joinEvent = Components.classes["@mozilla.org/activity-event;1"].createInstance(nsIAE);
		var sSubject = sTbHead.match(/^Subject: (.*)/m)[1];
 
		// Localization is omitted, initiator is omitted
		joinEvent.init(document.getElementById('JoinNGBundle').getString('JoinedMessage') + " " + sSubject,
			       null,
			       null,
			       joinProcess.startTime,  // start time
			       Date.now());        // completion time
 
		joinEvent.contextType = joinProcess.contextType; // optional
		joinEvent.contextObj = joinProcess.contextObj;   // optional

		gActivityManager.addActivity(joinEvent);

		return 0;
	},


	//////////////////////////////////////////////////
	///  Returns empty string on failure
	//////////////////////////////////////////////////
	GetBody : function ( sMsgData )
	{
		// Get location of first empty line
		var nMsgSplitter = sMsgData.search(/\r?\n\r?\n/);

		// Abort if no empty line
		if ( nMsgSplitter == -1 ) {
			return '';
		}

		// Get string below this empty line
		var sMsgBody = sMsgData.substr(nMsgSplitter);

		return sMsgBody.trim();
	},


	FormHeader : function ( sMsgData )
	{
		// Split data at each new-line
		var sLineDataLst = sMsgData.split(/\r?\n/);

		var sLineIdx = 0;
		var sLineCnt = sLineDataLst.length;
		var sMsgHead = '';
		for ( sLineIdx = 0; sLineIdx < sLineCnt; sLineIdx++ ) {
			var sLineData = sLineDataLst[sLineIdx];
			// if it is empty line - end of header
			if ( sLineData == '' ) {
				break;
			}

			// don't add new-line at the first line
			if ( sMsgHead != '' ) {
				// if parameter one-line add new-line, if multi-line add <CRLF>
				if ( sLineData.match("^[a-zA-Z0-9-]+: *.+") ) {
					sMsgHead += "\n";
				}
				else {
					sMsgHead += '<CRLF>';
				}
			}

			sMsgHead += sLineData;
		}

		return sMsgHead;
	},


	//////////////////////////////////////////////////
	///  Get message header from message URI
	///  (Arguments)
	///  sMsgUri:String Message URI.
	///  (Return)
	///  :String Return message header. If aborted by errors, return empty string.
	//////////////////////////////////////////////////
	GetHeader : function ( sMsgUri )
	{
		// Kind of "boilerplate code"
		var oMsgStream = Components.classes["@mozilla.org/network/sync-stream-listener;1"].createInstance();
		var oInStream = oMsgStream.QueryInterface(Components.interfaces.nsIInputStream);

		// Kind of "boilerplate code"
		var oScrIn = Components.classes["@mozilla.org/scriptableinputstream;1"].createInstance();
		var oScrInStream = oScrIn.QueryInterface(Components.interfaces.nsIScriptableInputStream);
		oScrInStream.init(oInStream);

		// Kind of "boilerplate code"
		var oMsgServ = messenger.messageServiceFromURI(sMsgUri);
		try {
			oMsgServ.streamMessage(sMsgUri, oMsgStream, msgWindow, null, false, null);
		}
		catch ( e ) {
			return '';
		}

		// Get message data
		var sMsgHead = '';
		oScrInStream.available();
		while ( oScrInStream.available() ) {
			sMsgHead += oScrInStream.read(1000);

			// Return string splited at first empty line
			var nSpilitter = sMsgHead.search(/\r?\n\r?\n/);
			if ( nSpilitter != -1 ) {
				sMsgHead = sMsgHead.substr(0, nSpilitter);
				break;
			}
		}

		return sMsgHead;
	},

	GetMessage : function ( sMsgUri )
	{
		// Kind of "boilerplate code"
		var oMsgStream = Components.classes["@mozilla.org/network/sync-stream-listener;1"].createInstance();
		var oInStream = oMsgStream.QueryInterface(Components.interfaces.nsIInputStream);

		// Kind of "boilerplate code"
		var oScrIn = Components.classes["@mozilla.org/scriptableinputstream;1"].createInstance();
		var oScrInStream = oScrIn.QueryInterface(Components.interfaces.nsIScriptableInputStream);
		oScrInStream.init(oInStream);

		// Kind of "boilerplate code"
		var oMsgServ = messenger.messageServiceFromURI(sMsgUri);
		try {
			oMsgServ.streamMessage(sMsgUri, oMsgStream, msgWindow, null, false, null);
		}
		catch ( e ) {
			return '';
		}

		// Get message data
		var sMsgData = '';
		oScrInStream.available();

		while ( oScrInStream.available() ) {
			sMsgData += oScrInStream.read(1000);
		}

		return sMsgData;
	},

	DecodeCrlf : function ( sText )
	{
		return sText.replace(/<CRLF>/g, "\n");
	},
}
