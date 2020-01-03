
if(!reminderfox)			var	reminderfox = {};
if(!reminderfox.userIO)		reminderfox.userIO = {};

	/**
	* DragNDrop
	* -----------------------------------------------
	* 	D&D was not working with FX due to old functions.
	* 	Changed to Gecko 1.9.2 concept
	*
	* Test required    ??
	* Test passed      OK
	*
	* 	Firefox / Thunderbird:
	* 	======================
	* ??	- Subscription:
	* ??	- Link:
	* ??		-- adds reminder with subject/notes/url
	* ??	- Text
	* ??		-- adds reminder with first 40chars to summaryG
	* 			   all text goes to notes
	* ??		-- a first 'http://' link will be parsed to reminder.url
	*
	* ??	- OS file
	* ??	  -- adds reminder if file contains ICS data
	*
	* 	Thunderbird Extras (other should work, tests required):
	* 	====================
	* ??	- Link:
	* ??		-- add reminder with subject/notes/url
	* ??		-- message header data used for reminder
	* ??		-- works with data from web page, msg header skipped
	* ??	- Message:
	* ??		-- works with d&d from 3pane,
	* ??		-- reads ICS from body and attachment(s)
	* ??	- Message Attachment:
	* ??		-- works with one or multiple selected attachments
	* ??		-- PDF,JPG etc are skipped, a reminder is build like 'message'
	* ??	- TB/AB contact
	* ??		-- adds reminder for a TB/AB card, allows to open contact from
	* 			   Reminderfox contact
	*
	* @param {Object} event
	*/
	reminderfox.userIO.go = function(event){

		reminderfox.util.JS.dispatch('iCalMail');
		reminderfox.util.JS.dispatch('mail');

		var logInfo = "";
		var eventData = "";

		var details = reminderfox.util.selectionDetails();

		logInfo = "OSfile  'Import iCal data' from external data source /applications";
		//-------------------------------------------------------
		if (event.dataTransfer.types.contains("text/x-moz-url") &&
			event.dataTransfer.getData("text/x-moz-url").indexOf('file://') == 0) {

			eventData = event.dataTransfer.getData("text/x-moz-url");

			var filePath = reminderfox.util.urlToPath(eventData);
			var icsData = reminderfox.util.readInFileContents(filePath);
			reminderfox.userIO.readICSdata (icsData, details);
			return;
		}


		// --- messenger part ----------
		if (reminderfox.util.messenger()) {

			logInfo = "messenger/AB  'Add Reminder for card'";
			//-------------------------------------------------------
			if (event.dataTransfer.types.contains("moz/abcard")) {
				reminderfox.util.JS.dispatch('addReminder4Contact', 'Reminder');
				return;
			}


			logInfo = " 'Add Reminder' for Message or Attachmment(s) (IMAP, POP/LOCAL, NEWS)";
			//-------------------------------------------------------
			if (event.dataTransfer.types.contains("text/x-moz-message") ||
				event.dataTransfer.types.contains("application/x-moz-file-promise")) {

//event.dataTransfer.getData("application/x-moz-file-promise-url")
//$[1] = [string] "mailbox:///media/DATA/_Mozilla/TB_gW/mailFolder/local/Drafts.sbd/rmFX_UserIO? ..
//           number=60466?fileName=MSG + 1(1*ICS).eml"
//$[0] =  .. number=78459?fileName=MSG_ICS.eml"
//$[0] =  .. number=60466&part=1.2&filename=BAHN_Fahrplan_20130719%281b%29.ics"
//$[0] =  .. number=86186&part=1.2&filename=TestEvent-a.ics"

				var fileName = event.dataTransfer.getData("application/x-moz-file-promise-url");

				var fileType = {};
				fileType.id = "reminderfox-mail-ICS_Msg";  // "reminderfox-mail-AddReminder"  //
				if (fileName.indexOf('part=') != -1) fileType.id = "reminderfox-mail-ICS_Item";

				reminderfox.iCal.addReminder4Message (fileType);
				return;
			}
		}


		logInfo = "FX/TB LINK or 'Subscribe' from a URL with an .ics file containing iCal data";
		//-------------------------------------------------------
		if (event.dataTransfer.types.contains("text/uri-list")) {

			logInfo = "URL link  with ICS/webcal (Subscription)";
			//-------------------------------------------------------
			if (event.dataTransfer.getData("text/x-moz-url")) {

				details.url         = event.dataTransfer.getData("text/x-moz-url-data");
				details.summary     = event.dataTransfer.getData("text/x-moz-url-desc");

				logInfo = logInfo + details.summary;
				reminderfox.userIO.downloadICSdata(details, logInfo);
				return;
			}

			logInfo = "FX/TB a 'normal' Link";
			//-------------------------------------------------------
				details.url = event.dataTransfer.getData("text/x-moz-url-data");
				details.summary = event.dataTransfer.getData("text/x-moz-url-desc");

				reminderfox.userIO.defaultMode(details, logInfo);
				return;
		}

		if (event.dataTransfer.types.contains("application/x-moz-file")) {
			details = {};
		}


		logInfo = "'Text' - check for http://  -- set first to 'reminder.url'";
		//-------------------------------------------------------
		var parser = new DOMParser(); var html = parser.parseFromString(eventData, "text/html");
		var htmlLinks = html.links;

		if (htmlLinks.length > 0) {
	//		for (var n = 0; n < nLinks; n++) {
				details.url = htmlLinks[0].href;
				details.summary =  htmlLinks[0].text;

				if ((details.url.toLowerCase().indexOf(".ics") == (details.url.length - 4))) {
					setTimeout(function() {reminderfox.userIO.downloadICSdata(details, logInfo);},0);
				} else {
					details.infos.notes = event.dataTransfer.getData("text/plain");
					reminderfox.userIO.defaultMode(details, logInfo);
				}
	//		}
			return;
		}
		details.infos.notes = event.dataTransfer.getData("text/plain");

		reminderfox.userIO.defaultMode(details, logInfo);
	};


/**
 * userIO.defaultMode    adds a Reminder/Todo with ADD/EDIT dialog
 *
 * @param {Object} details
 */
reminderfox.userIO.defaultMode = function (details, logInfo) {
//~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
	reminderfox.util.JS.dispatch('tag');
	reminderfox.util.Logger('ALERT', logInfo);

	var newDate = new Date();
	newDate.setDate(newDate.getDate());  // default to using today's date for reminder
	var reminderId =reminderfox.core.generateUniqueReminderId( newDate);

	var summary = ('summary' in details) ? details.summary : "";
	var newReminderToBeAdded = new reminderfox.core.ReminderFoxEvent(reminderId, newDate, summary);


	if ((details.infos.text ) && (details.infos.text != "")) {
		newReminderToBeAdded.notes = details.infos.text;
	}
	if ((details.infos.messageId != "") && (details.infos.messageId )) {
		newReminderToBeAdded.messageID = details.infos.messageId;
	}
	if ((details.url != "") && (details.url)) {
		newReminderToBeAdded.url = details.url;
	}

	var rv = reminderfox.core.addReminderHeadlessly( newReminderToBeAdded);

	logInfo = " .userIO.defaultMode   return from core.addReminderHeadlessly    rv : " + rv;
//	reminderfox.util.Logger('ALERT', logInfo)

	if (reminderfox.util.messenger()) {
		if (rv && details.infos.messageId != "") {reminderfox.tagging.msg("Reminderfox", true, "#993399");}
	}
	return rv;
};


/**
 * userIO.importReminder with categories
 *
 * @param {Object} reminder array
 * @param {Object} todos array
 * @param {String} category/ies
 */
reminderfox.userIO.importReminderWithCategories = function (importReminders, importTodos, categories, newer) {
//~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
	reminderfox.util.JS.dispatch('tag');

	var newDate = new Date();
	newDate.setDate( newDate.getDate());  // default to using today's date for reminder

	var existingEvents = reminderfox.core.getReminderEvents();
	var existingTodos = reminderfox.core.getReminderTodos();

	var imported = {};
	imported.events = reminderfox.core.mergeEvents(existingEvents, importReminders, categories, newer);
	imported.todos = reminderfox.core.mergeTodos(existingTodos, importTodos, categories, newer);

	reminderfox.core.reminderFoxEvents = existingEvents;
	reminderfox.core.reminderFoxTodosArray = existingTodos;

	reminderfox.core.importRemindersUpdateAll(false, null);

	// imported.events/imported.todos has the number of reminders imported,
	// use them to show on the rmFxImportHandling dialog
	return imported;
};


/**
 *  Add/Subscribe reminder for current selected message
 * called from TB context menu
 *
 * id="reminderfox-mail-AddReminder"
 * id="reminderfox-mail-thread_AddReminder"
 */
reminderfox.userIO.addReminder4Email = function (xthis) {
//~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
	try {
		document.getElementById('threadPaneContext').hidePopup();
	} catch (e) {}
	try {
		document.getElementById('messagePaneContext').hidePopup();
	} catch (e) {}

	var contextMenusEnabled = reminderfox.core.getPreferenceValue(reminderfox.consts.ENABLE_CONTEXT_MENUS, true);
	var details = {};
	if (contextMenusEnabled == false) {
		details.infos = {};
		details.infos.subject = "";
		details.summary = "";
	} else {

		details = reminderfox.util.selectionDetails();

		details.summary = details.infos.subject;

//0001: details.url  = [string] "http://sports.yahoo.com/nfl/teams/buf/ical.ics"
// webcal://www.tirol.fr/index.php?option=com_jevents&task=icals.export&format=ical&catids=0&years=0&k=254a061439c8e2a966a94aaa2683f74d

		if (details.url)  {
			reminderfox.userIO.downloadICSdata(details, " userIO.addReminder4Email   #1: subscribeOrAddReminder");
			return;
		}
	}
	var logInfo = " userIO.addReminder4Email   #2: contextMenusEnabled : " + contextMenusEnabled;
	reminderfox.userIO.defaultMode (details, logInfo);
};


/**
 *    Add Reminder w Context/Toolbar Menu
 * 2014-02  need to respect Options/FX setting not to use the page infos but
 * let the user open the "Add Event/Todo" dialog
 *
 */
reminderfox.userIO.addReminder4WebPage = function(){
//~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
	var details;

	var contextMenusEnabled = reminderfox.core.getPreferenceValue(reminderfox.consts.ENABLE_CONTEXT_MENUS, true);
	if (contextMenusEnabled == false) {
		details = {};
		details.infos = {};
		details.infos.subject = "";
		details.summary = "";
	} else {
		details = reminderfox.util.selectionDetails();

		if (details.url) {
			if ((details.url.indexOf(".ics") != -1) ||
				(details.url.indexOf("ical") != -1) ||
				(details.url.toLowerCase().indexOf('webcal:') == 0)) {

				reminderfox.userIO.downloadICSdata(details, " userIO.addReminder4WebPage  --> subscribeOrAddReminder");
				return;
			}
		}
	}

	var logInfo = " userIO.addReminder4WebPage  --> defaultMode";
	reminderfox.userIO.defaultMode (details, logInfo);
};


//          *** Subscription / Add Reminder ****
//reminderfox.userIO.icsOrwebcalURL = null;
//reminderfox.userIO.icsOrwebcalURLname = null;
reminderfox.userIO.details = null;


/**
 *  Download from a remote system the ICS data file
 *  Used with 'Remote Server' and
 *  supports a URL download link (ICS/webcal) with context menu and D&D
 *  to Foxy/bow to 'Subscribe' or 'add reminders', load ICS data async
 *  and passes to rmFxImportHandling dialog
 * Link examples:
 *    http://dl.erweiterungen.de/kalenderdateien/Feiertage_2006-2010_DE.ics
 *    webcal://sports.yahoo.com/nfl/teams/pit/ical.ics
 *
 *  @since	2013-07-15 rework (using http requester)
 *  @since  2015-10  also used for Remote Server (http/https) downloading, subscription, ..
 *
 *  @param	{array}  details.url, .user/pw, .callnext
 *      .callnext  used as second 'callback'
 *  @param  {string}  logInfo string for tracing
  */
reminderfox.userIO.downloadICSdata = function (details, logInfo) {
//~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
	window.setCursor('wait');

	reminderfox.util.Logger('userIO', logInfo);

	var url0 = details.url.toUpperCase();
	if (url0  && url0.length > 0) {
		var webcalIndex = url0.indexOf( "WEBCAL://");	// handle webcal address
		if ( webcalIndex != -1) {
			details.url = "http://" + details.url.substring(webcalIndex + 9);
		}
	}

	reminderfox.util.JS.dispatch('http');
		this.method       = "GET";
		this.urlstr       = details.url;

		this.body         = '';
		this.contentType  = 'text/xml';
		this.headers      = null;

		this.username     = ('user' in details) ? details.user : "";
		this.password     = ('password' in details) ? details.password : "";

		this.timeout      = 30;
		this.id           = new Date().getTime();

		this.callback     = "getICS";
		this.onError      = "getICS";
		this.callnext     =  ('callnext' in details) ? details.callnext : null;

		this.details      = details;

	reminderfox.HTTP.request(this);
};

/**
 * HTTP Get request callback
 */
reminderfox.userIO.getICS = function (status, xml, text, headers, statusText, call) {
//~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
	window.setCursor('auto');
	var statustxtString = statusText + "  (" + status + ")";
	var msg;

	if (status>=200 && status<300) {
		var timeStamp = +reminderfox.core.getICSXLastmodifiedFromString(text);
		call.details.timeStamp = ((timeStamp > 1) ? timeStamp : "--");

		var logInfo = ("[.userIO.getICS]   callback  status:" + statustxtString +
			"\n  getICSXLastmodified  >" + (timeStamp) + "<  text.length   >" + text.length + "<");
		reminderfox.util.Logger('userIO', logInfo);

		if (call.callnext != null) {
			call[call.callnext](text, call);
			return;
		}

		reminderfox.userIO.readICSdata (text, call);

	} else {  // ERROR Handling
		if (status == 0) {
			msg = "url >>" + call.urlstr + "<<   user >>" + call.username + "<<";
			statusText = "No answer from requested page, check login details. ";

		} else {
			// do some formatting with 'text' .. expected 'text' could be http type
			var parser = new DOMParser();
			var aText = parser.parseFromString(text, "text/html");
			msg = aText.body.textContent.replace(/\n /g,'\n').replace(/\n \n/g,'\n').replace(/n\n/g,'\n').replace(/\n\n\n/g,'\n');
		}

		reminderfox.util.PromptAlert (statusText + "  (" + status + ")" +
		 /* + "\n user  >>" + call.user + "<<   pw >>" + call.password + "<<"  */
			"\n\n" + msg + "\n\nHTTP callback error [.userIO.getICS]");
	}
};

/*
 * Read Reminders/Todos from a string (previously read from stream/file)
 * and opens a dialog
 *  -- multiple reminders/todos:  on the 'rmFxImportHandling' dialog,
 *  -- single reminder/todo:      on the ADD/EDIT dialog
 */
reminderfox.userIO.readICSdata = function (icsData, call) {
//~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
	let reminderEvents = [];
	let reminderTodosArr = [];
	reminderfox.core.readInRemindersAndTodosICSFromString(reminderEvents, reminderTodosArr, icsData, false /*ignoreExtraInfo*/);

	let eventLen = reminderEvents.length;

	let todoLen = 0;
	for(var list in reminderTodosArr ) {
		let cList = reminderTodosArr[list];
		todoLen += cList.length;
	}


	let logInfo = " read in of   #reminderEvents : " + eventLen + "  #Todos : " + todoLen;
//console.log("rmRX   .userIO.readICSdat", logInfo);

	// if no reminders/todos are read, do nothing
	if ((eventLen == 0) && (todoLen == 0)) {
		return;
	}

	if ((eventLen > 1) || (todoLen > 1)) {
		let xulData = {
			reminders      : reminderEvents,
			todos          : reminderTodosArr,
			details        : call.details
		};
		window.openDialog('chrome://reminderFox/content/utils/rmFxImportHandling.xul',
			'reminderFox-importSubscribeReminders', 'modal, centerscreen', xulData);
	}
	else {
		if (eventLen == 1) {
			reminderfox.core.addReminderHeadlessly( reminderEvents[0], true);
		} else {
			let key = Object.keys(reminderTodosArr)[0];
			reminderfox.core.addReminderHeadlessly( (reminderTodosArr)[key][0], true, true);

//			reminderfox.userIO.defaultMode(reminderfox.userIO.details, logInfo);
		}
	}
};


/*
 * @info   updated 2015-09-29 to use http Requests
 *
 * @param   .getSubscription(subsName, subscribedCal)   the pw is read from FX/TN PWmanager
 *       normal return: text string;
 *       error  return:
 */
reminderfox.userIO.getSubscription = function (subsName, subscribedCal) {
// --------------------------------------------------------------------------
// sync 'em up
// var statusTxt = document.getElementById("reminderFox-network-status");

	var subscriptions = reminderfox.core.getSubscriptions();
	var url = subscriptions[subsName];
	if (url != null && url.length > 0) {
		reminderfox.core.statusSet(reminderfox.string("rf.options.customlist.subscribe.retrieve.title") +
			" " + url);
		var webcalIndex = url.indexOf("webcal://"); // handle webcal address
		if (webcalIndex != -1) {
			url = "http://" + url.substring("webcal://".length);
		}

		this.ID = new Date().getTime();

		this.method       = 'GET';
		this.contentType  = 'text/xml';

		this.body         = '';
		this.headers      = null;

		this.urlstr       = url;
		this.username     = "";
		this.password     = "";

		this.timeout      = 30;

		this.callback     = "subscribedICS";
		this.onError      = 'subscribedICS';

		reminderfox.HTTP.request(this);
	}
};


reminderfox.userIO.subscribedICS = function (status, xml, text, headers, statusText, call) {
//------------------------------------------------------------------------------
		var statustxtString = statusText + "  (" + status + ")  ";
		var msg;

		if (status === 0 || (status >= 200 && status < 300)) {

			reminderEvents = new Array();
			reminderTodos = new Array();
			var originalExtraInfos = reminderfox.core.reminderFox_reminderFoxExtraInfo;

			reminderfox.core.readInRemindersAndTodosICSFromString(reminderEvents, reminderTodos, text, originalExtraInfos);

			//reminderfox.util.Logger('subscribe', ' dnLoaded  status:' + statustxtString + " timeStamp " + timeStamp
			// + "\n >> reminders; " + reminderEvents.length + "  todos " + reminderTodos.length + "\n  <<");

			var tabName = reminderfox.tabInfo.tabName;
			var tabID = reminderfox.tabInfo.tabID;
			var index = tabID.indexOf(':');
			name = tabID.substring(index + 1, tabID.length);

			var subscribedCalArr = getSubscribedCalendars();		//TODO   Check version of dnLoaded ICS data
			//if (subscribedCalArr[name] == null) {
				subscribedCalArr[name] = new Array();
			//}
			subscribedCalArr[name] = reminderEvents;

			reminderfox.calendar.ui.selectDay();

			selectCalendarSync = false;
			// remove all of the calendar items and re-add them
			removeAllListItems(true, false);
			calendarReminderArray = null; // null out in case reminder columns are sorted
			fillList(true, false);
			selectCalendarSync = true;

			msg = (name + "  downLoaded " + statustxtString);

		} else {
			msg = ("general Downloading : ERROR  " + statustxtString);
			reminderfox.util.Logger('userIO', msg);
		}
		reminderfox.core.statusSet(msg);
	};


/*
 * Get Remote Calendar from 'Remote Server' like http://icalx.com
 *  -- was  downloadReminders()  using old /network
 *     replaced with httprequest    gW 2015-10
 */
reminderfox.userIO.getRemoteCalendar = function (mode) {
// --------------------------------------------------------------------------
//   check if on Options
	if (mode == true)
		reminderFox_saveNetworkOptions();

	// Check if unsaved Reminders (Main Dailog should not be open, if yes, skip)
	if (reminderfox.core.checkModified()) {
		reminderfox.util.PromptAlert ("Unsaved Reminders. \n\nDownload from Remote Server stopped!");
		return;
	}

	var details = {};
	var proto = reminderfox.core.getPreferenceValue(reminderfox.consts.NETWORK.PROTOCOL, reminderfox.consts.NETWORK.PROTOCOL_DEFAULT);
	details.url = proto + "://" + reminderfox._prefsBRANCH.getCharPref(reminderfox.consts.NETWORK.ADDRESS);
	details.user = reminderfox._prefsBRANCH.getCharPref(reminderfox.consts.NETWORK.USERNAME);
	details.password = "";

	reminderfox.util.Logger('ALERT', "userIO.getRemoteCalendar   url >>" + details.url + "<<     uname >>" + details.user + "<<");

	details.summary = details.url;
	details.callnext = "replaceICSdata";

	reminderfox.userIO.downloadICSdata (details, "  .userIO.getRemoteCalendar");
};


/*
 *   (next) callback from .userIO.getRemoteCalendar
 */
reminderfox.userIO.replaceICSdata = function (text, call) {
// --------------------------------------------------------------------------

	var reminderEvents = new Array();
	var reminderTodos = new Array();
	var originalExtraInfos = reminderfox.core.reminderFox_reminderFoxExtraInfo;
	reminderfox.core.readInRemindersAndTodosICSFromString(reminderEvents, reminderTodos, text, false); /*ignoreExtraInfo*/

	// check to see if any todos in remote file...
	var hasTodos = false;
	for(var n in reminderTodos ) {
		var reminderFoxTodos = reminderTodos[n];
		if(reminderFoxTodos.length > 0) {
			hasTodos = true;
			break;
		}
	}

	// safety check: if there are no events and no todo's in the remote file,
	// we will assume that this an error condition and will
	// NOT overwrite the local reminders
	// (this happens frequently with icalx.com where the remote file gets cleared)
	if(reminderEvents.length == 0 && !hasTodos) {

		reminderfox.util.PromptAlert( "FAILED: Remote file with timestamp " +
			call.details.timeStamp + " has no events or todo's..." +
			"\n\n [ .userIO.replaceICSdata ] ");

		reminderfox.core.reminderFox_reminderFoxExtraInfo = originalExtraInfos;
		// switch back to original extra info
		// WE DON'T WANT TO OVERWRITE LOCAL IF NO REMOTE...
	} else {
		// Overwrite
		reminderfox.core.reminderFoxEvents = reminderEvents;
		reminderfox.core.reminderFoxTodosArray = reminderTodos;
		reminderfox.core.importRemindersUpdateAll(true, call.details.timeStamp);
	}
};


/*
 * Send local ICS data/ Calendar to  'Remote Server' like http://icalx.com
 *  -- was  uploadReminders()  using old /network
 *     replaced with httprequest    gW 2015-10
 */
reminderfox.userIO.putRemoteCalendar = function () {
//------------------------------------------------------------------
	//reminderFox_saveNetworkOptions();

	// get text string from current ICS data file
	var _reminderEvents = reminderfox.core.getReminderEvents();
	var _todosArray = reminderfox.core.getReminderTodos();
	this.body =  reminderfox.core.constructReminderOutput(_reminderEvents, _todosArray, true);

	this.method       = "PUT";
	this.callback     = 'putRemoteCal';
	this.onError      = 'putRemoteCal';

	var proto = reminderfox.core.getPreferenceValue(reminderfox.consts.NETWORK.PROTOCOL, reminderfox.consts.NETWORK.PROTOCOL_DEFAULT);
	this.urlstr = proto + "://" + reminderfox._prefsBRANCH.getCharPref(reminderfox.consts.NETWORK.ADDRESS);

	this.contentType  = 'text/xml';
	this.headers      = null;

	this.username     = reminderfox._prefsBRANCH.getCharPref(reminderfox.consts.NETWORK.USERNAME);
	this.password     = "";

	this.timeout      = 30;
	this.id           = new Date().getTime();


   var msg = "  Remote Calendar   (" + this.callback + ")" +
		"\n  call.urlstr: " + this.urlstr +
		"\n  url >>" + this.urlstr + "<<     user name >>" + this.username + "<<" +
		"\n  ContentType: " + this.contentType + "   Content length: " + this.body.length;
	reminderfox.util.Logger('userIO',  " .userIO.putRemoteCalendar   " + msg);

	reminderfox.HTTP.request(this);
};


reminderfox.userIO.putRemoteCal = function (status, xml, text, headers, statusText, call) {
	var statustxtString = statusText + "  (" + status + ")  ";
	var msg;

	if (status === 0 || (status >= 200 && status < 300)) {
			var parser = new DOMParser();
			var aText = parser.parseFromString(text, "text/html");
			msg = aText.body.textContent.replace(/\n /g,'\n').replace(/\n \n/g,'\n').replace(/n\n/g,'\n').replace(/\n\n\n/g,'\n');
	} else {
		msg = ("general Networking  ERROR " );
	}
	reminderfox.util.PromptAlert (statustxtString  + "\n" + msg);
};
