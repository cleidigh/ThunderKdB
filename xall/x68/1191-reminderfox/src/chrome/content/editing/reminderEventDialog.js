var newReminder;
var newTodo;
var additionalTodoSelected = false;

var isTodo;
var editThis


/**
 * Load all options for the Add/Edit dialog
 * window.openDialog("chrome://reminderfox/content/editing/reminderEventDialog.xul",
 * with reminderfox.core.addReminderHeadlessly()
 */
function loadEventOptions() {

	var menuitem, account, msg, tabInfo;
	var calDAVaccounts, accountID;
	var reminderCalDAVid, todoCalDAVid;

	var localEvents= reminderfox.string("rf.html.heading.reminders");
	var localToDos = reminderfox.string("rf.html.heading.todos");

	var firstRun = true;

	isTodo = window.arguments[0].isTodo;
	editThis = window.arguments[0].editing;
	tabInfo = window.arguments[0].tabInfo;		// passed  tabInfo : reminderfox.tabInfo,

	calDAVaccounts = window.arguments[0].calDAVaccounts;
	if(!isTodo) {
		newReminder = window.arguments[0].reminder;
		reminderCalDAVid = newReminder.calDAVid;
	}
	if(isTodo) {
		newTodo = window.arguments[0].reminder;
		todoCalDAVid = newTodo.calDAVid;
	}

	var isSubscription = reminderfox_isSubscribedCalendarTabSelected();

	var defaultSyncAccount = reminderfox.core.getPreferenceValue (reminderfox.consts.CALDAV_DEFAULT_ACCOUNT, reminderfox.string("rf.html.heading.reminders"));

/*-----
	msg = '  loadEvent Options     |editThis|isTodo : ' + editThis +"|"+ isTodo;
	if (newReminder) msg += "\n  reminder.summary|reminderCalDAVid : " + newReminder.summary + "|" +  reminderCalDAVid;
	if (newTodo)     msg += "\n  Todo.summary|todoCalDAVid|todoCalDAVid : " + isTodo + "|" + newTodo.summary + "|" + todoCalDAVid;
	msg += "\n  isSubscription : " +  isSubscription
	+ "\n  tabInfo.tabName|tabID|tabTyp : " +  tabInfo.tabName + "|" + tabInfo.tabID + "|" + tabInfo.tabTyp;
//reminderfox.util.Logger('Alert', msg);
---*/

	// populate menuList for Reminder and CalDAV and append ToDo's and User list ------------
	var reminderListChooser = document.getElementById("reminderListChooser");

	// clear all menuList entries
	var reminderAllLists = document.getElementById("reminderAllLists");
	while(reminderAllLists.hasChildNodes()) {
		reminderAllLists.removeChild(reminderAllLists.lastChild);
	}


	// add 'Reminder' for local event first -------------
	menuitem = document.createElement("menuitem");
	menuitem.setAttribute("label", localEvents);		// localized tab Label (Termine, Herinneringen,..)
	menuitem.setAttribute("id", reminderfox.consts.DEFAULT_REMINDERS_CATEGORY);   // = "Xreminder";

	menuitem.setAttribute("ID", "");		//local event has to have an empty string here!
	menuitem.setAttribute("Typ", "VEVENT");
	reminderAllLists.appendChild(menuitem);

	// add CalDAV accounts for Events  -------------------
	var defaultListIndex = 1;
	for(account in calDAVaccounts) {
		if((calDAVaccounts[account].Active) && (calDAVaccounts[account].Typ == "VEVENT")) {
			menuitem = document.createElement("menuitem");
			menuitem.setAttribute("class", "menuitem-iconic");

			menuitem.setAttribute("image", reminderfox.consts.SHARE);
			menuitem.setAttribute("label", "[ " + account + " ] " + calDAVaccounts[account].Name);
			menuitem.setAttribute("id", calDAVaccounts[account].Name);

			menuitem.setAttribute("ID", account);
			menuitem.setAttribute("Typ", "VEVENT");
			reminderAllLists.appendChild(menuitem);
			if (calDAVaccounts[account].Name == defaultSyncAccount) {
				defaultListIndex++;
			}
		}
	}

	// add separator between events and todos ---------------
	var menuseparator = document.createElement("menuseparator");
	reminderAllLists.appendChild(menuseparator);
			menuseparator.setAttribute("id", "separator");
	defaultListIndex++;

	// add entry for "ToDo's" ---------------
	menuitem = document.createElement("menuitem");
	menuitem.setAttribute("label", localToDos);		// localized tab label (Aufgaben, ... )
	menuitem.setAttribute("id", reminderfox.consts.DEFAULT_TODOS_CATEGORY); // "Xtodo"

	menuitem.setAttribute("ID", "");
	menuitem.setAttribute("Typ", "VTODO");
	reminderAllLists.appendChild(menuitem);
	defaultListIndex++;

	// add CalDAV accounts for Todos  -------------------
	for(accountID in calDAVaccounts) {
		if((calDAVaccounts[accountID].Active) && (calDAVaccounts[accountID].Typ == "VTODO")) {
			menuitem = document.createElement("menuitem");
			menuitem.setAttribute("class", "menuitem-iconic");

			menuitem.setAttribute("image", reminderfox.consts.SHARE);
			menuitem.setAttribute("label", '[ ' + accountID + " ] " + calDAVaccounts[accountID].Name);
			menuitem.setAttribute("id", calDAVaccounts[accountID].Name);
			menuitem.setAttribute("style", "font-style:italic;");

			menuitem.setAttribute("ID", accountID);
			menuitem.setAttribute("Typ", "VTODO");
			reminderAllLists.appendChild(menuitem);
			if (calDAVaccounts[accountID].Name == defaultSyncAccount) {
				defaultListIndex++;
			}
		}
	}

	var i;
	// add User List Labels --------------
	var subscriptions = reminderfox.core.getSubscriptions();
	var todoListsArray = reminderfox.core.getAllCustomTodoLists();
	for(i = 0; i < todoListsArray.length; i++) {
		var newItem = document.createElement("menuitem");
		newItem.setAttribute("label", todoListsArray[i]);
		newItem.setAttribute("id", todoListsArray[i]);

		newItem.setAttribute("ID", "");
		newItem.setAttribute("Typ", "ULIST");		// change to "ULIST"
		if (!(todoListsArray[i] in subscriptions)) // skip for subscriptions !
			reminderListChooser.firstChild.appendChild(newItem);
	}

	// preselect the menuList item based on:
	// -- VEVENT: new --> check for preselected locale or CalDAV
	// -- VEVENT: edit --> has CalDAV --> CalDAV ID label
	// -- VTODO:  new/edit --> "ToDo's" label
	// -- ULIST:  edit --> "UserList"
	reminderAllLists = document.getElementById("reminderAllLists");

	var listIndex, todoIndex;
	// don't start with 'Reminders' -- would miss CalDAV entries!
	for (i = 1; i < reminderAllLists.children.length; i++) {
		var menuItem = reminderAllLists.children[i];

		var listID = (menuItem.attributes.ID != null) ? menuItem.attributes.ID.value : "";		// may contain calDAVid

		if ((listID === "") && isTodo && (menuItem.id == "Xtodo")) {
			todoIndex = i;
		}

		if (editThis) {
			if ((listID !== "") && (newReminder) && (newReminder.calDAVid !== "")) {
				if (listID == newReminder.calDAVid) {listIndex = i;break;}
			}
			if ((listID !== "") && (newTodo) && (newTodo.calDAVid !== "")) {
				if (listID == newTodo.calDAVid) {listIndex = i; break;}
			}
			if ((listID == reminderCalDAVid) && !isTodo && (menuItem.id == "Xreminder")) {
				listIndex = i; break;
			}
			if (tabInfo.tabID.indexOf("reminderFoxList:") == 0) {
				if (tabInfo.tabID ==  "reminderFoxList:" + menuItem.id) {
					listIndex = i; break;
				}
			} else {
				if ((listID === "") && !todoCalDAVid && isTodo && (menuItem.id == "Xtodo")) {
					listIndex = i; break;
				}
			}

		} else {
			if (menuItem.id == defaultSyncAccount) {
				listIndex = i; break;
			}

			if (tabInfo.tabID ==  "reminderFoxList:" + menuItem.id) {
				listIndex = i; break;
			}

		}
	}
	if (!listIndex) {
		if (!todoIndex) listIndex = 0;
		else
			listIndex = todoIndex;
	}

/*----------- gw ####    TEST 4   menulist.editable

Attachment 9019625 Details for Bug 1500620

-      menulist.editable = true;
+      menulist.setAttribute("editable", "true");

example

<menulist id="daylist" oncommand="optionsDateChanged(false)"
	editable="true" onchange="reminderFox_timeChanged();" class="rmFxMenulist">

------------*/
	var daylist = document.getElementById("daylist");
	daylist.setAttribute("editable", "true");


//------------- end of test ----------------


	reminderFox_ListChooserChanged(listIndex, editThis, firstRun);
}


/**
 * Select or change the [Add/Edit] dialog index (Reminder, Reminder CalDAV, Todo, etc)
 * @param {Integer} listIndex
 *    listIndex will be null with using the pulldown menu
 *    listIndex can be '0' from loadEventOptions()
 * @param {boolean} editThis - flag to set title (Add/Edit)
 * @param {boolean} firstRun - flag to not erase dialog when ListChooser is used
 */
function reminderFox_ListChooserChanged(listIndex, editThis, firstRun) {
//------------------------------------------------------------------------------
	var reminderListChooser = document.getElementById("reminderListChooser");

	if(listIndex == null){
		listIndex = reminderListChooser.selectedIndex;
	}
	reminderListChooser.selectedIndex = listIndex;

	var listType = document.getElementById("reminderAllLists").children[listIndex].attributes.Typ.value;

	if(listType == 'VEVENT') {// 'event'
		document.title = (editThis) ? reminderfox.string("rf.options.reminder.edit.title")
			: reminderfox.string("rf.options.reminder.add.title");

		document.getElementById("todoDateCheckbox").setAttribute("hidden", true);
		document.getElementById("showInTooltip").setAttribute("hidden", true);

		document.getElementById("reminderDateLabel").setAttribute("hidden", false);
		document.getElementById("remindUntilComplete").setAttribute("hidden", false);

		if(newReminder == null) {  // this is a change of the List
			reminderFox_saveTodoOptions(newTodo);
			newReminder = reminderfox.core.convertTodoToReminder(newTodo);
			if(newReminder.date == null) 	newReminder.date = new Date();
		}

		newTodo = null;

		if(firstRun) reminderfox_loadReminders(newReminder, editThis);

	}// listType == 'VEVENT'   {		// 'event'


	if ((listType == 'VTODO') || (listType == 'ULIST')) {  // 'tasks' or userlist
		document.title = (editThis) ? reminderfox.string("rf.options.todo.edit.title")
			: reminderfox.string("rf.options.todo.add.title");

		document.getElementById("todoDateCheckbox").setAttribute("hidden", false);
		document.getElementById("showInTooltip").setAttribute("hidden", false);

		document.getElementById("reminderDateLabel").setAttribute("hidden", true);
		document.getElementById("remindUntilComplete").setAttribute("hidden", true);


		if(newTodo == null) {  // this is a change of the List
			reminderFox_saveReminderOptions(newReminder);
			newTodo = reminderfox.core.convertReminderToTodo(newReminder);
		//	if(newReminder.date == null) newReminder.date = new Date();
		}

		if(firstRun) reminderfox_loadTodos(newTodo, editThis);

		newReminder = null;

		if(!additionalTodoSelected)  sizeToContent();

		additionalTodoSelected = true;  // next time, we don't want to init the todo's with defaults

	}//	'tasks' or list


	if(listType == 'subscription') {  // use Add Event
		document.title = reminderfox.string("rf.options.reminder.add.title");

		document.getElementById("todoDateCheckbox").setAttribute("hidden", true);
		document.getElementById("showInTooltip").setAttribute("hidden", true);

		document.getElementById("reminderDateLabel").setAttribute("hidden", false);
		document.getElementById("remindUntilComplete").setAttribute("hidden", false);

		reminderListChooser = document.getElementById("reminderListChooser");
		reminderListChooser.selectedIndex = 0;

		reminderfox_loadReminders(newReminder, false /*editThis*/);
	}

	firstRun = null;
}


/**
 * Saves the dialog entries made with "reminderfox.core.addReminderHeadlessly" event dialog
 * with bow icon on main menu bar.
 */
function reminderFox_AddEditDialog_Enter() {
// ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
	var reminderListChooser = document.getElementById("reminderListChooser");
	var listIndex = reminderListChooser.selectedIndex;

	// 'Typ' is used to differentate menulistitems
	//   'VEVENT' = Reminders
	//   'VTODO'  = Todos, UserLists
	//   'subscriptions'     ?????

	var listType = reminderListChooser.selectedItem.attributes.Typ.value;
	var listID = reminderListChooser.selectedItem.attributes.ID.value;

	if(listType == 'VEVENT') {

		newReminder.calDAVid = listID;
		if (reminderFox_saveReminderOptions(newReminder) == false) return;
		window.arguments[0].reminder = newReminder;
		window.arguments[0].listToBeAddedTo = 0; // "Reminders"
		window.arguments[0].tabName = reminderfox.consts.DEFAULT_REMINDERS_CATEGORY; // "Reminders"
	} else {

		newTodo.calDAVid = listID;
		if(reminderFox_saveTodoOptions(newTodo) == false) return;
		window.arguments[0].reminder = newTodo;
		var list = document.getElementById("reminderAllLists").children[listIndex].id;
		var index = list.indexOf(':');
		if (index >0 ) list = list.substring(index + 1, list.length);
		window.arguments[0].listToBeAddedTo = listIndex;
		if (listID && listID !== "") list = "Xtodo";
		window.arguments[0].tabName = list; // "xtodos" or list name
	}

	window.arguments[0].OK = true;
	window.close();
}
