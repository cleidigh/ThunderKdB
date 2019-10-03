// ++ IMPORTANT NOTICE --
//
// +++++++       This file is UTF-8.
// +++++++       Please adjust you text editor prior to saving any changes!
//
// ++ IMPORTANT NOTICE --

//https://developer.mozilla.org/en/nsIAbCard%2f%2fThunderbird3

// if(!reminderfox) var reminderfox = {};
if (!reminderfox.abCard) reminderfox.abCard = {};


/**
 *   Add a Reminder for a selected 'Contact' of the TB / ADDRESSBOOK
 *
 *  //gW - Guenter Wahl ...    vers. 01. August 2007 15:03
 *
 * The ABcard items added to the output (reminder.notes) are
 * configured with a 'reminderfox.abCard.items'-string
 * which is read from/written to the 'rmFx.abCardItems' TB-prefs.
 *
 * Valid items are all addressbook/card items, but only the following
 * have a 'locale' entry. For the others their item name is displayed.
 */
/*
		- LabelContact
			- DisplayName
			- NickName
			- PrimaryEmail
			- SecondEmail
			- ScreenName

		- LabelHome
			- HomeAddress

		- LabelWork
			- WorkAddress

		- LabelPhone
			- CellularNumber
			- FaxNumber
			- PagerNumber

		- LabelOther
			- Costom1 .. 4


	'reminderfox.abCard.items'-string interpretation:

		!item				generates 'nameString' tab 'dataOfNameString'
		item				generates 'dataOfNameString' only
		item,[!]item		items separated with comma are generated as
							data output on same line separated by space
		;					delimiter for generating a CR for the output
		//					an entry beginning with // is treated as comment
							which is not written to the output

		- Items containing a substring of 'Label' are interpreted as header lines.

		- Items with a leading 'X' are skipped for output.
		  This is a easy way to skip them, but hold them at the
		  standard place in the default 'reminderfox.abCard.items'-String.

		- The 'Category' items need not to be added to the
		  interpretation string, it's added to rmFx-field 'Categories'

		- 'Custom1..4'-item labels
			With the extension "MoreColsForAddressBook"
				https://nic-nac-project.org/~kaosmos/morecols-en.html
			installed, the 'labels' can be set individually and are
			stored in the prefs.js parameters
			"morecols.custom"+num+".label"  (num= 1...4)
			Those settings are read if xpi is installed.

*/

reminderfox.abCard.itemsUS = "// US version;"
				+ "LabelContact;"
					+ "!DisplayName;"
					+ "X!LastName,XFirstName;"
					+ "!PrimaryEmail,XSecondEmail;"

				+ "LabelPhone;"
					+ "!HomePhone,!FaxNumber;"
					+ "!WorkPhone;"
					+ "!CellularNumber;"

				+ "LabelHome;"
					+ "HomeAddress,HomeAddress2;"
					+ "HomeCity,HomeState,HomeZipCode;"
					+ "HomeCountry;"

				+ "LabelWork;"
					+ "JobTitle;"
					+ "Company,Department;"
					+ "WorkAddress,WorkAddress2;"
					+ "WorkCity,WorkState,WorkZipCode;"
					+ "WorkCountry;"

				+ "LabelOther;"
					+ "!Custom1,!Custom2;"
					+ "!Custom3;!Custom4;"
				//	+ "!AnniversaryYear,AnniversaryMonth,AnniversaryDay;"
					+ "X!BirthYear,XBirthMonth,XBirthDay;"

				;  // semikolon terminates 'reminderfox.abCard.items' !


	reminderfox.abCard.itemsEU = "// European version;"
					+ "LabelContact;"
						+ "!DisplayName;"
						+ "!LastName,FirstName;"
						+ "!PrimaryEmail,SecondEmail;"

					+ "LabelPhone;"
						+ "!HomePhone,!FaxNumber;"
						+ "!WorkPhone;"
						+ "!CellularNumber;"

					+ "LabelHome;"
						+ "!HomeAddress,HomeAddress2;"
						+ "!HomeZipCode,HomeCity;"
						+ "!HomeCountry,!HomeState;"

					+ "LabelWork;"
						+ "JobTitle;"
						+ "!Company,Department;"
						+ "!WorkAddress,WorkAddress2;"
						+ "!WorkCity,WorkZipCode;"
						+ "!WorkCountry,!WorkState;"

					+ "LabelOther;"
						+ "!Custom1,!Custom2;"
						+ "!Custom3;!Custom4;"
					//	+ "!AnniversaryYear,AnniversaryMonth,AnniversaryDay;"
						+ "X!BirthYear,XBirthMonth,XBirthDay;"

					;  // semikolon terminates 'reminderfox.abCard.items' !

reminderfox.abCard.items = null; // this contain the active cardItem set
reminderfox.abCard.prop = "rf.contacts.";

reminderfox.abCard.errMsg = "addContact2Reminder Warning!";
reminderfox.abCard.errMsg1 = "Item naming missing for:  ";


reminderfox.abCard.personalABURI = 'moz-abmdbdirectory://abook.mab';
reminderfox.abCard.collectedAABURI = 'moz-abmdbdirectory://history.mab';
reminderfox.abCard.selectedABURI = null;
reminderfox.abCard.cDirectory = '';
reminderfox.abCard.cCard = null;
reminderfox.abCard.bundle = document.getElementById("reminderfox_addressBook");

/**
 *
 * /messenger/addressbook/abCardOverlay.js/
 *
 * function AbEditSelectedCard()
 {
 AbEditCard(GetSelectedCard());
 }
 --> goEditCardDialog(GetSelectedDirectory(), card);
 ondialogaccept="return EditCardOKButton();">
 siehe
 *		function InitEditCard()
 *		--> gEditCard
 */
/**
 * Add a reminder for Contact in TB/AB
 *
 * @param {string} op = Reminder|Copy
 */
reminderfox.abCard.addReminder4Contact = function(op){

		function getDetails (cCard, aItems) {
			var items = aItems.split(',');
			var aStr = "";
			for (var i=0; i < items.length; i++) {
				var w = reminderfox.abCard.cCardItem(cCard, items[i]);
				if (w != "") aStr += w + " ";
			}
			return aStr;
		}

	//	--- get the Contact info
	reminderfox.msgnr.whichMessenger();
	reminderfox.abCard.selectedABURI = GetSelectedDirectory();
	reminderfox.abCard.cDirectory = GetDirectoryFromURI(reminderfox.abCard.selectedABURI).dirName;
	reminderfox.util.Logger('AB',"  .abCard.cDirectory: " + reminderfox.abCard.cDirectory + "\n  ..selectedABURI: " + reminderfox.abCard.selectedABURI)

	if (reminderfox.abCard.cDirectory.isMailList) {
		return;
	} // terminate if on 'List'
	switch (op) {
		case "Reminder":{ // this is to set a reminder from a selected card
			reminderfox.abCard.cCard = GetSelectedCard();

			if (reminderfox.abCard.cCard == null) {
				reminderfox.util.PromptAlert(reminderfox.string("rf.contacts.abcard.single"));
				return;
			}

			var dirId = reminderfox.abCard.cCard.directoryId.substring(0, reminderfox.abCard.cCard.directoryId.indexOf("&"));
			var cardDirectory = MailServices.ab.getDirectoryFromId(dirId).URI
			reminderfox.util.Logger('AB',"  card belongs to: "+ cardDirectory)

			// --- setup the reminder -----
			var time = new Date();
			var timeString = reminderfox.date.getTimeString(time);
			var _dateVariableString = reminderfox.core.getPreferenceValue(reminderfox.consts.LIST_DATE_LABEL, reminderfox.consts.LIST_DATE_LABEL_DEFAULT);

			var remFoxDate = reminderfox.date.getDateVariable(null, time, _dateVariableString) + "  " + timeString;
			var newDate = new Date();
			newDate.setDate(newDate.getDate() + 1); // default to using tomorrow's date for reminder
			var reminderId = reminderfox.core.generateUniqueReminderId(newDate);

			var remFoxSummary = "[" + reminderfox.abCard.itemName("LabelContact") + "] " +
			reminderfox.abCard.cCardItem(reminderfox.abCard.cCard, "DisplayName");
			var newReminderToBeAdded = new reminderfox.core.ReminderFoxEvent(reminderId, newDate, remFoxSummary);
			newReminderToBeAdded.extraInfo = "X-REMINDERFOX-CONTACT:" +
			cardDirectory +
			"::" +
			reminderfox.abCard.cDirectory +
			"::" +
			reminderfox.abCard.cCard.displayName;
			var cNotes = '[' + reminderfox.abCard.cDirectory + ']\n';
			var custItems = "";
			var labelStr = "";

			// +++++ read  all card-items to be added +++++
			var rmFx_cardItems = reminderfox.abCard.readPref(); // -- get values
			var cardItems = rmFx_cardItems.split(";");
			for (var i = 0; i < cardItems.length; i++) {
				var anyValue = false;
				var currentLine = cardItems[i];
				if (cardItems[i].indexOf("Label") != -1) {
					if (cardItems[i].charAt(0) != "X") {
						labelStr = "\n" + reminderfox.abCard.itemName(cardItems[i]) +
						":\n";
					}
				}
				else {
					if ((currentLine != "") &&
					(currentLine.substring(0, 2) != "//")) {
						var usAdr = false;
						if (currentLine.indexOf("WorkCity,WorkState") != -1 ||
						currentLine.indexOf("HomeCity,HomeState") != -1) usAdr = true;
						var cItems = currentLine.split(",");
						for (var j = 0; j < cItems.length; j++) { /* one item */
							var namString = cItems[j];
							//  process  cardItem
							if (namString.charAt(0) == "!") {
								// this needs to fetch the namString
								var iName = namString.substring(1);
							}
							else {
								iName = namString;
							}
							if (iName == "HomeWebPage") iName = "WebPage1";
							if (iName == "WorkWebPage") iName = "WebPage2";
							var iname = iName.substring(0, 1).toLowerCase() + iName.substring(1);
							if (iname.charAt(0) != "x") {
								var thisItem = reminderfox.abCard.cCardItem(reminderfox.abCard.cCard, iName);
								if (iName.indexOf("Custom") != -1) {
									if (thisItem != "") {
										cNotes += labelStr + "    " + reminderfox.abCard.itemName(iName) + " : " +
										thisItem;
										anyValue = true;
										labelStr = "";
									}
								}
								else {
									if (namString.charAt(0) == "!") {
										if (thisItem != "") {
											cNotes += labelStr + "    " + reminderfox.abCard.itemName(iName) + ":\t";
											anyValue = true;
											labelStr = "";
										}
									}

									if (thisItem != "") {

										if (labelStr != "" && thisItem != "") {
											cNotes += labelStr;
											labelStr = "";
										}

										if (anyValue == false) cNotes += "    ";
										cNotes += thisItem;

										if (usAdr == false) {
											cNotes += "   ";
										}
										else {
											cNotes += ",  ";
										}
										usAdr = false;
										anyValue = true;
									}
								}
							}
						}
					}
					if (anyValue == true) cNotes += "\n";
				}
			}
			newReminderToBeAdded.notes = cNotes;

			if (custItems != "") newReminderToBeAdded.notes += "\n" + custItems + "\n";
			// --- add ABcard-items to rmFx-fields ---

			// add address to 'Location' for search with Google Maps
			var workAddr = getDetails (reminderfox.abCard.cCard,
					"WorkAddress,WorkAddress2,WorkCity,WorkZipCode,WorkState,WorkCountry");
			var homeAddr = getDetails (reminderfox.abCard.cCard,
					"HomeAddress,HomeAddress2,HomeCity,HomeZipCode,HomeState,HomeCountry");

	//		var go4Addr = (homeAddr != "") ? homeAddr : workAddr;
			//  .location does NOT accept local chars like  in 'KLN'  ==> so normalize the string
			newReminderToBeAdded.location = reminderfox.abCard.normalizeNameString((homeAddr != "") ? homeAddr : workAddr);
			var cItem = reminderfox.abCard.cCard.primaryEmail;

			if (cItem != "") newReminderToBeAdded.url = "mailto" + ":" + cItem;
			cItem = reminderfox.abCard.cCardItem(reminderfox.abCard.cCard, "Category");

			if (cItem != "") newReminderToBeAdded.categories = reminderfox.abCard.cCard.category;

			var bYear = (reminderfox.abCard.cCardItem(reminderfox.abCard.cCard, "BirthYear"));

			if (bYear != "") { // need a year as string, if not skip birthday
				newReminderToBeAdded.summary += '   <' + bYear + '>';
				// set the StartDate for the reminder to the Birthday Month/Day
				var newDate = new Date();
				var month = parseInt(reminderfox.abCard.cCardItem(reminderfox.abCard.cCard, "BirthMonth")) - 1;
				newDate.setMonth(month);
				newDate.setDate(parseInt(reminderfox.abCard.cCardItem(reminderfox.abCard.cCard, "BirthDay")));
				newReminderToBeAdded.date = newDate;
				// set 'repeat yearly' and 'allDay'
				newReminderToBeAdded.recurrence.type = 0; //reminderfox.consts.RECURRENCE_YEARLY;
				newReminderToBeAdded.allDayEvent = true;
			}

			//  .... and go to display it .... w 'edit'  to get recurrence + allDay
			reminderfox.core.addReminderHeadlessly(newReminderToBeAdded, false /*edit*/);  //gWXXX changed to false
		}
		case "Copy":{ // copy mailadr of selected cards to clipboard
			//    with mailName <mailadr@xxx.yy>, etc
			var rmFx_Cards = GetSelectedAbCards();
			var xAttendees = "";
			for (var n = 0; n < rmFx_Cards.length; n++) {
				xAttendees += rmFx_Cards[n].lastName + " " + rmFx_Cards[n].firstName +
				"<" +
				rmFx_Cards[n].primaryEmail +
				">,";
			}
			// del last comma
			xAttendees = xAttendees.substring(0, xAttendees.length - 1)
			reminderfox.abCard.abookMini();
			reminderfox.util.copytoClipboard(xAttendees);
			reminderfox.abCard.insertAttendees(xAttendees);
			return;
		}
	} // switch
};

/**
 *   focus on the  'invitation' window
 */
reminderfox.abCard.insertAttendees = function(xAttendees){
	//~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
	var topWindow = reminderfox.util.getWindow("window:ItemDialog");

	try {
		topWindow.focus();
		var attendeeBox = topWindow.document.getElementById("attendees");
		var attendeeText = attendeeBox.value;
		var end0 = attendeeBox.selectionEnd;

		if (attendeeText == "" && attendeeText != null) {
			attendeeBox.value = xAttendees;
		}
		else {
			if (attendeeText.charAt(attendeeText.length) != ',') {
				attendeeBox.value = attendeeText + ',' + xAttendees;
			}
			else {
				attendeeBox.value = attendeeText + xAttendees;
			}
		}
		var end = attendeeBox.textLength;
		attendeeBox.setSelectionRange(end);
		topWindow.focus();
	}
	catch (e) {
		}
};


reminderfox.abCard.abookOpen = function(){
	// first enable textbox for easy pasting
	document.getElementById('attendees').removeAttribute("disabled");
	document.getElementById('inviteEnable').setAttribute("checked", "true");

	var topWindow = reminderfox.util.getWindow("mail:addressbook");

	if (topWindow) { // if already open bring it to front
		topWindow.focus();
	}
	else {
		var mailApp = reminderfox.util.messengerApp();
		if ((mailApp == null) || (mailApp == "")) {
			reminderfox.util.PromptAlert("Messenger not found!"); // reminderfox.string("rf.schedule. $$string$$ "));
			return;
		}
		var go4Process = Cc["@mozilla.org/process/util;1"].createInstance(Ci.nsIProcess);

		try {
			go4Process.init(mailApp);
		}
		catch (ex) {
				}
		go4Process.run(false, new Array("-addressbook"), 1);
	}
};

reminderfox.abCard.abookMini = function(){
	var topWindow = reminderfox.util.getWindow("mail:addressbook");
	topWindow.minimize();
};

/*
 * get item value or set ""
 *   @param {xpcomponent} cCard ab card representation
 *   @param {string} card item name (first letter uppercase)
 *   @return {string} card item value or ""
 */
reminderfox.abCard.cCardItem = function(cCard, iName){

	var nameAB2 = iName.substring(0, 1).toLowerCase() + iName.substring(1);
	return cCard.getProperty(iName, "") || ((cCard[nameAB2]) ? cCard[nameAB2] : "");
};


var TBABstrings;

reminderfox.abCard.string= function(bString){
	if (TBABstrings === undefined)  TBABstrings = Services.strings.createBundle("chrome://messenger/locale/addressbook/addressBook.properties");

    try {
      return rmFXstrings.GetStringFromName(bString);
    } catch (e) {
        reminderfox.util.Logger('Alert', "TBAB String bundle error : " + bString + "\n" + e);
        return bString;
    }
};


reminderfox.abCard.itemName = function(namItem){
	/* ---------- access the properties ... if relevant  ------------- */
	try {
		// .... access 'address.properties'
		if (namItem == "DisplayName" ||
		namItem == "NickName" ||
		namItem == "PrimaryEmail" ||
		namItem == "SecondEmail" ||
		namItem == "ScreenName")
			return reminderfox.abCard.string("property" + namItem);

		if (namItem == "LabelContact" || namItem == "HomeAddress")
			return reminderfox.abCard.string(reminderfox.abCard.prop + namItem);

		if (namItem.indexOf("Label") != -1)
			return reminderfox.abCard.string("heading" + namItem.substring(5));

		if (namItem.indexOf("Number") != -1)
			return reminderfox.abCard.string("property" + namItem.substring(0, namItem.indexOf("N")));

		// ... access morecols.properties  ... if there else addressbook.p
		if (namItem.indexOf("Custom") != -1)
			return reminderfox.abCard.getCustomLabel(namItem);

		// ... now no entries ... need to set it here (without 'locale' translation)
		if (namItem.indexOf("Name") != -1)
			return namItem;

		if (namItem == "JobTitle")
			return "Job";
		if (namItem == "Department")
			return "Department";
		if (namItem == "Company")
			return "Company";

		if (namItem == "HomeWebPage" ||
		namItem == "WorkWebPage")
			return "WebPage";

		if (namItem.indexOf("Address2") != -1)
			return "";

		//  ... delete 'Phone'  from item-name and return it
		if (namItem.indexOf("Phone") != -1)
			return namItem.substring(0, 4);

		// ... delete 'Work' or 'Home' from item-name and return it
		if ((namItem.indexOf("Work") != -1) ||
		(namItem.indexOf("Home") != -1))
			return namItem.substring(4);
	}
	catch (ex) {
		reminderfox.core.logMessageLevel(reminderfox.abCard.errMsg + "\n[" + reminderfox.msgnr.name + "] " +
		reminderfox.abCard.errMsg1 +
		namItem, 2);
	}

	return namItem;
};


reminderfox.abCard.getCustomLabel = function(iName){
	// ---------- work with Custom 1..4 individual entries  -------------
	var cLabel = "";
	var moreColsPrefs = Cc["@mozilla.org/preferences-service;1"].getService(Ci.nsIPrefBranch);

	var cLabelid = "morecols." +
	iName.substring(0, 1).toLowerCase() +
	iName.substring(1) + ".label";
	try {
	//	cLabel = moreColsPrefs.getComplexValue(cLabelid, Ci.nsISupportsString).data;
		try {
			cLabel = moreColsPrefs.getStringPref(cLabelid);
		} catch (ex) {
			cLabel = moreColsPrefs.getComplexValue(cLabelid,
				Ci.nsISupportsString).data;
		}
	}
	catch (e) {
		cLabel = "Custom " + iName.substring(6, 7);
	}
	return cLabel;
};


reminderfox.abCard.readPref = function(){
	// ------------------------------------------------ READ  PREFS
	var abCardPrefVersion = reminderfox.core.getPreferenceValue(reminderfox.consts.ABCARD, "US");
	reminderfox.core.setPreferenceValue(reminderfox.consts.ABCARD, abCardPrefVersion);

	if (abCardPrefVersion == "EU") {
		reminderfox.abCard.items = reminderfox.abCard.itemsEU; // set to EU default
	} else {
		reminderfox.abCard.items = reminderfox.abCard.itemsUS; // set to US default
	}
	return reminderfox.abCard.items;
};


/**
 * From the reminderlist open the associated TB/AB card
  *  This requires the contact was added before from the TB/AB card or list selection
  *  The reminder has these paramters to define the card:
  *    -  reminder.url    {mail address} foo@nowhere.moc
  *    -  reminder.extraInfo with 'X-REMINDERFOX-CONTACT:{directory}::{AB title}::{DisplayName})'
  *  //gWXXX  REWORK: with getting a UUID for the card/contact;
  *
  *  @see bug https://bugzilla.mozilla.org/show_bug.cgi?id=444093
  *
  * @param event -- the selected reminder or todo (only one allowed!)
  * @return opens the TB/AB card
  */
reminderfox.abCard.openABcard = function(event){
	//------------------------------------------------------------------------------
	var selectedEvents;

	if (event.currentTarget.id == "treechildren-contextmenu-reminder-openABcard") {
		selectedEvents = getAllSelectedReminders(); // from 'reminder list' context menu
	}
	if (event.currentTarget.id == "treechildren-contextmenu-todo-openABcard") {
		selectedEvents = getAllSelectedTodos(); // from 'reminder list' context menu
	}

	if (selectedEvents.length != 1) {
		reminderfox.util.PromptAlert(reminderfox.string("rf.contacts.abcard.single"));
		return;
	}
	/*----
	 var allAddressBooks = abManager.directories;
	 while (allAddressBooks.hasMoreElements()) {
	 var addressBook = allAddressBooks.getNext();
	 if (addressBook instanceof Ci.nsIAbDirectory) {
//	 reminderfox.util.Logger('AB', "AB : " + abManager.getDirectory(addressBook.URI).URI
//	 + " " + abManager.getDirectory(addressBook.URI).dirName);
	 //reminderFox: AB : moz-abmdbdirectory://abook.mab
	 //reminderFox: AB : moz-abmdbdirectory://abook-1.mab
	 //reminderFox: AB : moz-abmdbdirectory://history.mab
	 }
	 }
	 --------- */
	// X-REMINDERFOX-CONTACT:moz-abmdbdirectory://abook.mab::Personal Address Book::Wern Nigg\\nDTSTAMP:20090722T114039

	var abManager = Cc["@mozilla.org/abmanager;1"].getService(Ci.nsIAbManager);
	var exPos = selectedEvents[0].extraInfo.indexOf("X-REMINDERFOX-CONTACT:");

	if (exPos != -1) {
		var contactInfo = selectedEvents[0].extraInfo;
		var contactElem = contactInfo.split("\\n");
reminderfox.util.Logger('AB',"contactElem :" + contactElem.toString())

		var x, abURI;
		for (x in contactElem) {
			if (contactElem[x].search("X-REMINDERFOX-CONTACT") == 0) {
				var contactDetails = contactElem[x].replace("X-REMINDERFOX-CONTACT:","").split("::")
reminderfox.util.Logger('AB',"contactDetails:" + contactDetails.toString())
				abURI = contactDetails[0];
			}
		}

		if (selectedEvents[0].url != null) {
			var thisMailAdr = selectedEvents[0].url.substring(7);
			var thisCard = abManager.getDirectory(abURI).cardForEmailAddress(thisMailAdr);
		}
		else {
			// search for element as stored with "DisplayName"
			var thisCard = abManager.getDirectory(abURI).getCardFromProperty("DisplayName", contactDetails[2], false);
		}

		if (thisCard != null) window.openDialog("chrome://messenger/content/addressbook/abEditCardDialog.xul", "", "chrome,resizable=no,modal,titlebar,centerscreen", {
			abURI: abURI,
			card: thisCard
		});
	}
};

/**
 * imported from "Duplicate Contact Manager" by   Marian Steinbach, 2006
 * normalizeNameString
 <br>
 * Strips some characters from a name so that different spellings (e.g. with and
 * without accents, can be compared. Works case insensitive.
 *
 * @param	String		the string to be normalized
 * @return	String		normalized version of the string
 */
reminderfox.abCard.normalizeNameString = function(str){
	//------------------------------------------------------------------------------
	// remove punctiation
	//str = str.replace(/[\"\-\_\'\.\:\,\;\&\+]+/g, '');

	// replace funny letters
	str = str.replace(/[ÃÃÃÃÃ¨Ã©ÃªÃ«ÄÄÄÄÄÄÄÄÄÄ]/g, 'e');
	str = str.replace(/[ÃÃÃÃÃÃ¢Ã¡Ã Ã£Ã¥ÄÄÄÄÄÄÇºÇ»]/g, 'a');
	str = str.replace(/[ÃÃÃÃÃ¬Ã­Ã®Ã¯Ä¨Ä©ÄªÄ«Ä¬Ä­Ä®Ä¯Ä°Ä±]/g, 'i');
	str = str.replace(/[ÃÃÃÃÃÃ²Ã³Ã´ÃµÃ¸ÅÅÅÅÅÅÇ¾Ç¿]/g, 'o');
	str = str.replace(/[ÃÃÃÃ¹ÃºÃ»Å¨Å©ÅªÅ«Å¬Å­Å®Å¯Å°Å±Å²Å³Æ¡Æ¯Æ°]/g, 'u');
	str = str.replace(/[ÃÃ½Ã¿Å¶Å·Å¸]/g, 'y');

	str = str.replace(/[ÃÃ§ÄÄÄÄÄÄÄÄ]/g, 'c');
	str = str.replace(/[ÃÃ°ÄÄÄ]/g, 'd');
	str = str.replace(/[ÄÄÄÄÄ Ä¡Ä¢Ä£]/g, 'g');
	str = str.replace(/[Ä¤Ä¥Ä¦Ä§]/g, 'h');
	str = str.replace(/[Ä´Äµ]/g, 'j');
	str = str.replace(/[Ä¶Ä·Ä¸]/g, 'k');
	str = str.replace(/[Ä¹ÄºÄ»Ä¼Ä¿ÅÅÅ]/g, 'l');
	str = str.replace(/[ÃÃ±ÅÅÅÅÅÅÅÅÅ]/g, 'n');
	str = str.replace(/[ÅÅÅÅÅÅ]/g, 'r');
	str = str.replace(/[ÅÅÅÅÅÅÅ Å¡]/g, 's');
	str = str.replace(/[Å¢Å£Å¤Å¥Å¦Å§]/g, 't');
	str = str.replace(/[Å´Åµ]/g, 'w');
	str = str.replace(/[Å¹ÅºÅ»Å¼Å½Å¾]/g, 'z');

	// replace ligatures
	str = str.replace(/[ÃÃÃ¤Ã¦Ç¼Ç½]/g, 'ae');
	str = str.replace(/[ÃÃ¶ÅÅ]/g, 'oe');
	str = str.replace(/[ÃÃ¼]/g, 'ue');
	str = str.replace(/[Ã]/g, 'ss');
	str = str.replace(/[Ä²Ä³]/g, 'ij');

	// remove single letters (like initials)
	/*	str = str.replace(/ [A-Za-z0-9] /g, ' ');
	 str = str.replace(/^[A-Za-z0-9] /g, '');
	 str = str.replace(/ [A-Za-z0-9]$/g, '');
	 */
	// remove multiple white spaces
	str = str.replace(/[\s]{2,}/, ' ');

	// remove leading and trailing space
	str = str.replace(/[\s]{2,}/g, ' ');
	str = str.replace(/^[\s]+/, '');
	str = str.replace(/[\s]+$/, '');

	str = str.toLowerCase();
	return str;
}
