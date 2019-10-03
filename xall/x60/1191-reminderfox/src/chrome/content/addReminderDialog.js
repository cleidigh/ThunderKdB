
if (!reminderfox)     var reminderfox = {};
if (!reminderfox.addDialog) reminderfox.addDialog = {}; // dummy object used with JS loader


//const REMINDER_FOX_REPEAT_LABEL_NONE =    reminderfox.string("rf.add.columns.repeat.none");
const REMINDER_FOX_REPEAT_LABEL_NONE = "";
const REMINDER_FOX_REPEAT_LABEL_YEARLY = reminderfox.string("rf.add.columns.repeat.yearly");
const REMINDER_FOX_REPEAT_LABEL_YEARLY_DAY = reminderfox.string("rf.add.columns.repeat.yearlyDay");
const REMINDER_FOX_REPEAT_LABEL_MONTHLY = reminderfox.string("rf.add.columns.repeat.monthly");
const REMINDER_FOX_REPEAT_LABEL_MONTHLY_DAY = reminderfox.string("rf.add.columns.repeat.monthlyDay");
const REMINDER_FOX_REPEAT_LABEL_WEEKLY = reminderfox.string("rf.add.columns.repeat.weekly");
const REMINDER_FOX_REPEAT_LABEL_DAILY = reminderfox.string("rf.add.columns.repeat.daily");


//const REMINDER_FOX_TIME_ALL_DAY_LABEL = reminderfox.string("rf.add.time.allday");
const REMINDER_FOX_TIME_ALL_DAY_LABEL = "";

const REMINDER_FOX_AM = reminderfox.string("rf.add.time.AM");
const REMINDER_FOX_PM = reminderfox.string("rf.add.time.PM");
const REMINDER_FOX_TIME_DELIMITER = reminderfox.string("rf.add.time.delimiter");

const REMINDER_FOX_ID_REF = "idRef";
const REMINDER_FOX_DATE_REF = "dateRef";

var SHOW_ALL_REMINDERS = false;
var HIDE_ALL_REMINDERS = false;
var HIDE_COMPLETED_ITEMS = false;


var selectCalendarSync = false;
var calendarReminderArray = null; // new Array(12);
var calendarTodoArray = null;


var reminderFox_subscribedCalendars = {};

var useDefaultDate = true;
var dateVariableString = "";		// set with    function reminderfox_loadReminders(){

var REPEAT_PREVIOUS_OCCURRENCES;
var REPEAT_UPCOMING_OCCURRENCES;


var reminderFoxTabDirtied = false;

var reminderFox_highlightTodayPreference = true;

var listSortMap = null;


/**
 *  filtering and search ------------------------------------- begin ----
 *
 * 	//gWCalndr    RF/Calendar requires rework of Filters/View
 * 	some calls may been issued also the Filter panel isn't open
 * 	See also  "View" features
 */
if (!reminderfox.search) reminderfox.search = {};

	reminderfox.search.showFilters = false;         // show textSearch and Filter/Views

	reminderfox.search.filtersType        = 0;      // Filters/Views  menuNo in use
	reminderfox.search.viewsFilterEvents  = 0;      // Filters/Views  for Reminders
	reminderfox.search.viewsFilterLists   = 0;      // Filters/Views  for Todos/Lists

	reminderfox.search.textSearchType     = 0;      // searchText menuNo in use
	reminderfox.search.textSearchLabel    = "";     // searchText Label in use
	reminderfox.search.textSearchString   = "";     // searchText  string in use
	reminderfox.search.textFindLastString = null;   // findText string in use

	reminderfox.search.searchBarWaitTime = null;
	reminderfox.search.SEARCH_ITEMS_ALL_INDEX = 4;


/**
 * changed searchText 'menuItem'
 * set textbox to menuItem label, clearButton set to gray
 * clear searchText string
 */
reminderfox.search.textSearchMenuChange= function(xThis){
//------------------------------------------------------------------------------
	reminderfox.search.textSearchType = xThis.value;

	reminderfox.util.Logger('filtering'," .search.textSearchMenuChange : " + xThis.value);
	document.documentElement.attributes.textFilter.value = xThis.value;

	reminderfox.search.textSearchLabel = xThis.label;

	document.getElementById('rmFx-textSearch-clearbutton').setAttribute('clearButtonShown', false);
	document.getElementById('rmFx-searchText-box').value = xThis.label;
	document.getElementById('rmFx-searchText-box').style.color = "gray";

	reminderfox.search.textSearchString = "";
	reminderfox.search.HighlightHeader(reminderfox.search.textSearchType);
	refillLists();
	reminderfox.search.advanceFocus();
	return true;
};


/**
 *   clear textBox input mode (blue button, 'gray' text, list header, set box label, spyglass tooltiptext)
*/
reminderfox.search.textSearchBoxClear= function(){
//-----------------------------------------------------------------------------
	document.getElementById('rmFx-textSearch-clearbutton').setAttribute('clearButtonShown', false);
	document.getElementById('rmFx-searchText-box').value = reminderfox.search.textSearchLabel;
	document.getElementById('rmFx-searchText-box').style.color = "gray";

	var spyglass = document.getElementById("rmFx-search-spyglass");
	spyglass.setAttribute('tooltiptext', reminderfox.string("rf.calendar.menu.toggleSearchFilter"));
	spyglass.setAttribute('search', 'false');

	reminderfox.search.textSearchString = "";
	reminderfox.search.HighlightHeader();
	refillLists();
	reminderfox.search.advanceFocus();
};


reminderfox.search.advanceFocus= function() {
//------------------------------------------------------------------------------
	document.commandDispatcher.advanceFocus();   // 2.1.6  to remove focus from textbox
/*----
	// if we are in calendar mode, focus on add-event (icon-only button)
	// tfm: for some reason isLegacy means "use single bar".  Not sure why.
	if (reminderfox.core.isLegacy ) {
		document.getElementById("reminderfox-calendar-add-event").focus();
	}
	// otherwise focus on bottom Add Event button
	else {
		document.getElementById("reminderfox-calendar-add").focus();
	}
---------*/
};


/**
 * set the selected menu item  by menuNo
 */
reminderfox.search.searchTextMenuItem= function(menuNo){
//------------------------------------------------------------------------------
	var menu = document.getElementById('rmFx-searchText-menuItems');
	if (menu == null) return;

	var menuItems = menu.getElementsByAttribute('value', '*');
	if (menuItems.length > 0) {
		for (var i = 1; i < menuItems.length; i++) {
			menuItems[i].removeAttribute('checked');
		}
	}
	menuItems[menuNo].setAttribute('checked', 'true');
	reminderfox.search.textSearchLabel = menuItems[menuNo].label;
};



reminderfox.search.searchTextSpyglass= function(menuNo){
//------------------------------------------------------------------------------
	if (reminderfox.search.showFilters == false) return;

	reminderfox.search.textSearchType = (menuNo != null) ? menuNo : 0;
	reminderfox.search.searchTextMenuItem (menuNo);

	var menuPopup = document.getElementById('rmFx-search-popup');
	var searchBox = document.getElementById('rmFx-searchText-box');
	searchBox.value = menuPopup.children[menuNo].attributes.label.value;
	searchBox.style.color = "gray";

	if (reminderfox.search.textSearchString != "") {
		searchBox.value = reminderfox.search.textSearchString;
		document.getElementById('rmFx-searchText-box').style.color = "blue";
		document.getElementById('rmFx-textSearch-clearbutton').setAttribute('clearButtonShown', true);

		var spyglass = document.getElementById("rmFx-search-spyglass");
		spyglass.setAttribute('tooltiptext', '[' +  menuPopup.children[menuNo].attributes.label.value + '] ' +
			reminderfox.string("rf.filters.textsearch.label") +' : ' +
			reminderfox.search.textSearchString);

		spyglass.setAttribute('search', 'true');
	}
};


/**
 *   'highlight' the List-Column-Header
 * @param {integer|null}  null: remove blue labels only; != null: blue header
 */
reminderfox.search.HighlightHeader= function(menuNo){
//------------------------------------------------------------------------------
	var rmColumnLabels = ["descColLabel", "catColLabel", "notesColLabel"];
	if (!reminderfox_isReminderTabSelected())
		rmColumnLabels = ["todoDescColLabel", "todoCatColLabel", "todoNotesColLabel"];

	var colLabel;
	// reset all headers
	for (var i = 0; i < rmColumnLabels.length; i++) {
		colLabel = document.getElementById(rmColumnLabels[i]);
		if (colLabel != null) {
			colLabel.setAttribute("style", "color:black; font-weight:normal");
		}
	}
	if (menuNo != null) {	// if null only delete the blue headers
		// color list-column-header for corresponding selected displayMenu/menuNo item
		if (reminderfox.search.isTextSearch()) {
			if (menuNo != reminderfox.search.SEARCH_ITEMS_ALL_INDEX) {
				colLabel = document.getElementById(rmColumnLabels[menuNo]);
				if (colLabel != null) {
					colLabel.setAttribute("style", "color:blue; font-weight:bold");
				}
			}
			else {
				// highlight them all
				for (var j = 0; j < rmColumnLabels.length; j++) {
					colLabel = document.getElementById(rmColumnLabels[j]);
					if (colLabel != null) {
						colLabel.setAttribute("style", "color:blue; font-weight:bold");
					}
				}
			}
		}
	}
};


/**
 *  change Input text color to blue
 */
reminderfox.search.textSearchOnInput= function(event){
//------------------------------------------------------------------------------
	event.style.color = "blue";
};


/**
 * The quicksearch response is split between onSearchKeyDown and onSearchKeyUp because this logic
 * is tied to a timed function that sets the focus on the quicksearch bar after a period of time.
 * This split is required for Japanese input using Input Method Editor(IME), where they enter some characters and
 * then need to select the converted Japanese text from the IME.  If the quicksearch textbox steals the focus
 * before that is completed, it screws up the input conversion.  As such, we put the logic in the onKeyUp event
 * instead, which is only called after the IME is finished.
 */
reminderfox.search.onSearchKeyPress= function(event){
//------------------------------------------------------------------------------
	if ((event != null) && (event.keyCode == 9)) {
		return; /* break the focus */
	}

	var qs_button = document.getElementById('rmFx-textSearch-clearbutton');
	if (qs_button != null) {
		qs_button.setAttribute('clearButtonShown', true);
	}
};


/**
 * read Char in with delay to catch last one
 */
reminderfox.search.onSearchKeyUp= function(event){
//------------------------------------------------------------------------------
	var SEARCHBAR_WAIT_DELAY = 250;
		var desc = document.getElementById("rmFx-searchText-box");
		reminderfox.search.textSearchString = desc.value;

	if (event.keyCode == 13) { // if 'return' pressed, filter the view immediately
		reminderfox.search.HighlightHeader(reminderfox.search.textSearchType);
		reminderfox.search.searchBarWaitTime = null;
		refillLists();
		desc.focus();
	}
	else {
		reminderfox.search.searchBarWaitTime = new Date().getTime() + SEARCHBAR_WAIT_DELAY;
		setTimeout(function() {reminderfox.search.onSearchInput();}, SEARCHBAR_WAIT_DELAY);
	}
};


reminderfox.search.isTextSearch= function(){
//------------------------------------------------------------------------------
	return (reminderfox.search.textSearchString == "") ? false : true;
};


/**
 *   Erase the 'Search' text if it's set/filtered
 */
reminderfox.search.onSearchFocus= function(){
//------------------------------------------------------------------------------
	if (!reminderfox.search.isTextSearch()) {
		document.getElementById("rmFx-searchText-box").value = "";
	}
};


/**
* update Reminder and ToDo lists & get focus back
*/
reminderfox.search.onSearchInput= function(){
//------------------------------------------------------------------------------
	if (reminderfox.search.searchBarWaitTime != null) {
		var currentTime = new Date().getTime();
		// only update the search view if enough time has passed since the last keystroke
		if ((currentTime + 15) > reminderfox.search.searchBarWaitTime) {

//				reminderfox.search.textSearchString = document.getElementById("rmFx-searchText-box").value;

			if (reminderfox.search.textSearchString == "") {
				reminderfox.search.textSearchBoxClear();
				// after clearing text box, set the cursor back to the text serach box;
				// otherwise gives a bad experience where focus shifts to Add Event
				// when typing/clearing the text box manually
				document.getElementById("rmFx-searchText-box").focus();
			} else {
				// tfm Aug 14, 2012: not sure what searchTextSpyglass does. But it causes weird behavior of
				// refocusing the cursor at the end of the text string even if user puts
				// cursor earlier in their text string.  Mabye this is used in cal-only
				// mode?
				//reminderfox.search.searchTextSpyglass (reminderfox.search.textSearchType);
				reminderfox.search.HighlightHeader(reminderfox.search.textSearchType);

				refillLists();
				document.getElementById("rmFx-searchText-box").focus();
			}
		}
	}
};


/**
 *  Changing filter/view menu changes the index and rebuilds List and Calendar
 */
reminderfox.search.filtersTypeChanged= function (){		//gWMainMenu
//------------------------------------------------------------------------------
	var previousFilter = reminderfox.search.filtersTypeGet();
	var selectedFilter = document.getElementById("rmFx-filters-type");

	if ((selectedFilter) &&(selectedFilter.selectedItem.value == 'vEditor')) {

		if (reminderfox.view.views.lastFilter == null) { // Views Editor was canceled
			fItem = previousFilter;   // reset previous setting
		} else {  // a 'View' was changed or added, select it in the filter menu
			fItem = reminderfox.view.views.lastFilter; // selected View
		}

		if (reminderfox_isReminderTabSelected() == true ){		// index to access the right Filters/Views menulabel
			reminderfox.search.filtersType = reminderfox.core.setPreferenceValue(reminderfox.consts.FILTER_EVENTS_CURRENT, fItem);
			document.documentElement.attributes.viewsFilterEvents.value = +fItem;
		} else {
			reminderfox.search.filtersType = reminderfox.core.setPreferenceValue(reminderfox.consts.FILTER_LISTS_CURRENT, fItem);
			document.documentElement.attributes.viewsFilterLists.value = +fItem;
		}

		reminderfox.calendar.filter.close();
		reminderfox.calendar.filter.build();
		reminderfox.view.setFilterTitel(reminderfox.search.filtersType);
		reminderfox.search.searchTextSpyglass (reminderfox.search.textSearchType);

		reminderfox.calendar.ui.selectDay (reminderfox.datePicker.gSelectedDate);
		return;
	}

	fItem = document.getElementById("rmFx-filters-type").selectedIndex;
	selectedFilter.selectedIndex = +fItem;

	if (reminderfox_isReminderTabSelected() == true ){		// index to access the right Filters/Views menulabel
		reminderfox.search.filtersType = reminderfox.core.setPreferenceValue(reminderfox.consts.FILTER_EVENTS_CURRENT, fItem);
		document.documentElement.attributes.viewsFilterEvents.value = +fItem;
	} else {
		reminderfox.search.filtersType = reminderfox.core.setPreferenceValue(reminderfox.consts.FILTER_LISTS_CURRENT, fItem);
		document.documentElement.attributes.viewsFilterLists.value = +fItem
	}

	reminderfox.view.setFilterTitel(+fItem);
	reminderfox.calendar.ui.selectDay (reminderfox.datePicker.gSelectedDate);
};


/**
 * Get the filtersType from prefs -- respect reminders or todos/lists
 */
reminderfox.search.filtersTypeGet= function (){		//gWMainMenu
//------------------------------------------------------------------------------
	if (reminderfox_isReminderTabSelected() == true ){		// index to access the right Filters/Views menulabel
		reminderfox.search.filtersType = +document.documentElement.attributes.viewsFilterEvents.value;
	} else {
		reminderfox.search.filtersType = +document.documentElement.attributes.viewsFilterLists.value;
	}
	return reminderfox.search.filtersType;
};

reminderfox.search.filtersTypeReset= function (){		//gWMainMenu
//------------------------------------------------------------------------------
	reminderfox.core.setPreferenceValue(reminderfox.consts.FILTER_EVENTS_CURRENT, 0);
	reminderfox.core.setPreferenceValue(reminderfox.consts.FILTER_LISTS_CURRENT, 0);
};

// --------------------- filtering  & searching --------------------  end --


function selectTab(){
//------------------------------------------------------------------------------
	// give focus to the reminder/todo description when switching tabs

	selectCalendarSync = false;

	var tabIndex = reminderfox.tabInfo.tabIndex;
	var tabPanels = document.getElementById("tabPanelID");
	tabPanels.selectedIndex = tabIndex;
	document.documentElement.attributes.tab.value = tabIndex;	// "tab"  goes to 'persit' for XUL

	var currentReminderPanel = document.getElementById("treeparent").parentNode;
	var currentTodoPanel = document.getElementById("todo_treeparent").parentNode;

	if (!reminderfox_isReminderTabSelected()) {  // VTODO tab

		if (tabPanels.childNodes[tabIndex] == currentTodoPanel) { // we clicked on the same tab...
			if (reminderFoxTabDirtied) {
				reminderFoxTabDirtied = false;
				removeAllListItems(false, true);
			}
		}
		else {
			// this is the active tab -  we want to move its contents to new tab
			// first remove all the tree children from old tab (clear its todo list; it will be repopulated with
			// todos from new list)
			var treeChildren = document.getElementById("todo_treechildren");
			if (treeChildren != null && treeChildren.childNodes.length > 0) {
				while (treeChildren.hasChildNodes()) {
					treeChildren.removeChild(treeChildren.firstChild);
				}
			}

			// now move all elements from old tab to new tab
			var newPanel = tabPanels.childNodes[tabIndex];
			while (currentTodoPanel.hasChildNodes()) {
				var child = currentTodoPanel.removeChild(currentTodoPanel.firstChild);

				newPanel.appendChild(child);
			}
		}
	}  // VTODO tab

	else {  // VEVENT or subscription  tab

		if (!(tabPanels.childNodes[tabIndex] == currentReminderPanel)) { // another VEVENT  or subscription tab
			// clear status text
			reminderfox.core.statusSet("");

			calendarReminderArray = null; // clear array (in case sorted)
			// this is the active tab -  we want to move its contents to new tab
			// first remove all the tree children from old tab (clear its todo list; it will be repopulated with
			// todos from new list)
			var treeChildren = document.getElementById("treechildren");
			if (treeChildren != null && treeChildren.childNodes.length > 0) {
				while (treeChildren.hasChildNodes()) {
					treeChildren.removeChild(treeChildren.firstChild);
				}
			}

			// now move all elements from old tab to new tab
			var newTab = tabPanels.childNodes[tabIndex];
			while (currentReminderPanel.hasChildNodes()) {
				var child = currentReminderPanel.removeChild(currentReminderPanel.firstChild);
				newTab.appendChild(child);
			}
		}  // another VEVENT  or subscription tab

	} // VEVENT or subscription

	selectCalendarSync = true;
	reminderfoxModifyButtons();			//check for subscription tab to disable buttons
	reminderfox.calendar.ui.selectDay();		// this runs fillList also !
}


function reminderfox_isReminderTabSelected(){
	var isReminder = false;
	if (reminderfox.tabInfo.tabIndex == 0) {
		isReminder = true;
	}
	else {
		if (reminderfox_isSubscribedCalendarTabSelected()) {
			isReminder = true;
		}
	}
	return isReminder;
}




function rmFx_checkLoaded(){
	if (getAllSelectedReminders().length == 0) {
		document.getElementById("treechildren-contextmenu-sendReminder").setAttribute("disabled", "true");
	}
	if (getAllSelectedTodos().length == 0) {
		document.getElementById("treechildren-contextmenu-sendTodos").setAttribute("disabled", "true");
	}
}


function rmFx_mainDialogLoadReload() {
	if (!reminderfox.core.checkModified ()) {
		reminderfox.core.reminderFoxEvents = null;
		reminderfox.core.reminderFoxTodosArray = null;

		reminderfox.core.reminderFoxExtraInfoPrefix = null;

		reminderfox.core.numDaysEvents = [];
		reminderfox.core.numDaysTodos = [];

		reminderfox.calDAV.accounts = {};

		rmFx_mainDialogLoad(true);
	}
}


/*
 *   "calendarColor":"rgba(230,200,0,0.15)"
 */
function rmFx_setTreeRowColors() {
	var calDAVaccounts = reminderfox.calDAV.getAccounts();

	for (var account in calDAVaccounts) {
		var id = calDAVaccounts[account].ID;

		var color = "";

console.error(" calColor 1 id: ",id, calDAVaccounts[id].calendarColor );
		if (calDAVaccounts[id].calendarColor != null) {
			color = calDAVaccounts[id].calendarColor;
		}

		if (color == "undefined" || color == null ) {
			color = "rgba(230,200,0,0.15)";  // default setting
		}

		var opacity = reminderfox.core.getPreferenceValue(reminderfox.consts.CALDAV_OPACITY_SELECTED,
			reminderfox.consts.CALDAV_OPACITY_SELECTED_DEFAULT);
		reminderfox.core.setPreferenceValue(reminderfox.consts.CALDAV_OPACITY_SELECTED, opacity);

		var color1 = color.split(',');
		color1[3] = ' ' + opacity/100;
		color1 = color1.join(',') + ')';

		reminderfox.styleUtil.insertStyle('caldav.css',
			"treechildren::-moz-tree-row(caldav" + id + ") {background-color:" + color +" !important;}")

		reminderfox.styleUtil.insertStyle('caldav.css',
			"treechildren::-moz-tree-row(caldav" + id + ", selected) {background-color:" + color1 +" !important;}")
	}
}



/**
 *  Starting the ReminderFox Main Dialog with MainList and/or Calendar
 */
function rmFx_mainDialogLoad(restartSkip){

	/* ----- enabled next lines for deeper debugging   // #### gW 2018-10
	reminderfox.core.listAllPrefs();		//gW

	reminderfox._prefsBRANCH.setCharPref('loggers', '{"Reminderfox":"Debug","calndrGrid":"Debug","calndrLayout":"Debug","calDAV":"Info","alarm":"Debug","http":"Debug","alarm":"Debug"}');

	reminderfox._prefsBRANCH.clearUserPref('debug.loglevel');
	reminderfox._prefsBRANCH.setIntPref('debug.loglevel', 7);
	-------------*/


	rmFx_setTreeRowColors();

	//gWABContact Handling
	reminderfox.msgnr.whichMessenger();
	var addContext = document.getElementById("treechildren-contextmenu");
	if (addContext != null) addContext.addEventListener("popupshowing", reminderfox.util.popupCheckMenus, false);

	addContext = document.getElementById("todo-treechildren-contextmenu");
	if (addContext != null) addContext.addEventListener("popupshowing", reminderfox.util.popupCheckMenus, false);

	// get prefs for showing Legacy design
	var isLegacy = reminderfox.core.getPreferenceValue (reminderfox.consts.ISLEGACY, false);

	document.getElementById("bottomButtonBox").setAttribute('hidden', isLegacy);
	document.getElementById("reminderfox-calendar-add-event").setAttribute('hidden', !isLegacy);

	var defaultfilterEvents = reminderfox.core.getPreferenceValue(reminderfox.consts.FILTER_EVENTS_DEFAULT, 0);
	var defaultfilterLists = reminderfox.core.getPreferenceValue(reminderfox.consts.FILTER_LISTS_DEFAULT, 0);

	if (defaultfilterEvents != 8) reminderfox.core.setPreferenceValue(reminderfox.consts.FILTER_EVENTS_CURRENT, defaultfilterEvents);
	if (defaultfilterLists != 8) reminderfox.core.setPreferenceValue(reminderfox.consts.FILTER_LISTS_CURRENT, defaultfilterLists);

	var dateVariableString = reminderfox.core.getPreferenceValue(reminderfox.consts.LIST_DATE_LABEL, reminderfox.consts.LIST_DATE_LABEL_DEFAULT);
	if (dateVariableString != reminderfox.consts.LIST_DATE_LABEL_DEFAULT) {
		useDefaultDate = false;
	}

	// get/set calendar/list default values (layout, width, height, etc ...)
	reminderfox.calendar.layout.Setup();

	reminderFox_highlightTodayPreference = reminderfox.core.getPreferenceValue(reminderfox.consts.HIGHLIGHT_TODAYS_REMINDERS, reminderfox.consts.HIGHLIGHT_TODAYS_REMINDERS_DEFAULT);

	REPEAT_PREVIOUS_OCCURRENCES = reminderfox.core.getPreferenceValue(reminderfox.consts.REPEAT_PREVIOUS_OCCURRENCES, -1);
	REPEAT_UPCOMING_OCCURRENCES = reminderfox.core.getPreferenceValue(reminderfox.consts.REPEAT_UPCOMING_OCCURRENCES, -1);
	HIDE_COMPLETED_ITEMS = reminderfox.core.getPreferenceValue(reminderfox.consts.HIDE_COMPLETED_ITEMS, false);

	var hideCompletedContextMenu = document.getElementById("treechildren-contextmenu-hideCompleted");
	var hideCompletedTodosContextMenu = document.getElementById("treechildren-contextmenu-hideCompleted2");
	if (HIDE_COMPLETED_ITEMS) {
		hideCompletedContextMenu.setAttribute("checked", "true");
		hideCompletedTodosContextMenu.setAttribute("checked", "true");
	}
	else {
		hideCompletedContextMenu.setAttribute("checked", "false");
		hideCompletedTodosContextMenu.setAttribute("checked", "false");
	}

	// create todo lists
	var todoLists = reminderfox.core.getPreferenceValue(reminderfox.consts.TODO_LISTS, "");

	// check to see if we need to update the todoLists....
	var update = false;
	var todosArr = reminderfox.core.getReminderTodos();
	var todoListsArray = todoLists.split(",");
	for (var n in todosArr) {
		if (n != reminderfox.consts.DEFAULT_TODOS_CATEGORY) {
			var found = false;
			for (var i = 0; i < todoListsArray.length; i++) {
				if (n == todoListsArray[i]) {
					found = true;
					break;
				}
			}
			if (!found) {
				if (todoLists.length > 0) {
					todoLists = todoLists + "," + n;
				}
				else {
					todoLists = n;
				}
				update = true;
			}
		}
	}
	if (update) {
		reminderfox.core.setPreferenceValue(reminderfox.consts.TODO_LISTS, todoLists);
	}


	if (todoLists != null && todoLists.length > 0) {
		var todoListsArray = todoLists.split(",");

		var tabPanels = document.getElementById("tabPanelID");
		var todosTab = document.getElementById("todosPanel");
		var remindersTab = document.getElementById("reminderPanel");

		var calendarTabPanel = document.getElementById("rmFx-tabList");

		var len = calendarTabPanel.childNodes.length;
		var lastLabel = calendarTabPanel.children[len-1].value;

		while (calendarTabPanel.childNodes.length > 2) {
			calendarTabPanel.removeChild(calendarTabPanel.lastChild);
		}
		for (var i = 0; i < todoListsArray.length; i++) {
			var tabListItem = reminderfox.util.trim(todoListsArray[i]);
			var newTabList = document.createElement("label");
			newTabList.setAttribute("id", "reminderFoxList:" + tabListItem);
			newTabList.setAttribute("class", "rmFx_panelItem");

			newTabList.setAttribute("value", tabListItem);
			newTabList.setAttribute("tabListNo", i +2);
			newTabList.addEventListener("click", function() {var tabNo= +this.getAttribute('tabListNo'); reminderfox.calendar.ui.tabListChange(tabNo, this);},false);

			calendarTabPanel.appendChild(newTabList);

			var newtabpanel = todosTab.cloneNode(false);
			newtabpanel.setAttribute("id", "reminderFoxListPanel:" + tabListItem);
			tabPanels.appendChild(newtabpanel);
		};

		// add to manage User List
		var menuseparator = document.createElement("menuseparator");
		calendarTabPanel.appendChild(menuseparator);

			var editLists = document.createElement("label");
			editLists.setAttribute("id", "rmFx_editLists");
			editLists.setAttribute("class", "rmFx_panelItem");
			editLists.setAttribute("value", lastLabel);
			editLists.addEventListener("click",function() {reminderfox.overlay.openOptionsDialog('todoLists');},false);
		calendarTabPanel.appendChild(editLists);

		reminderfox.tabInfo.Set("Reminders", "Xreminder", 0, 'VEVENT');
	};

	// get sort columns
	// Main List Column Names -- camelCase!  If not it's changed here
	//  reminders  : dateColLabel,descColLabel,timeColLabel,dateCompleted,repeatColLabel,completeColLabel,remindUntilCompletedColLabel,notesColLabel,alarmColLabel,catColLabel,endDateColLabel,mailColLabel,calDAVcolLabel,
	//  todo/list  : todoDateColLabel,todoDescColLabel,todoTimeColLabel,todoDateCompleted,todoCompleteColLabel,todoShowInTooltip,todoNotesColLabel,todoAlarmColLabel,todoCatColLabel,todoEndDateColLabel,todoMailColLabel,
	listSortMap = new Array();
	var sortColumnsStr = reminderfox.core.getPreferenceValue(reminderfox.consts.SORT_COLUMNS_PREF, "");
	if (sortColumnsStr != null && sortColumnsStr != "") {
		var sortColumnsStrArray = sortColumnsStr.split(",");
		for (var i = 0; i < sortColumnsStrArray.length; i++) {
			var listName = sortColumnsStrArray[i];
			i++;
			var sortCol = sortColumnsStrArray[i];
			sortCol = sortCol.charAt(0).toLowerCase() + sortCol.substring(1);
			i++;
			var sortDir = parseInt(sortColumnsStrArray[i]);
			listSortMap[listName] = {
				sortColumn: sortCol,
				sortDirection: sortDir
			};
		}
	}

	var syncedUp = reminderfox.core.ensureRemindersSynchronized();

	if (isTodoTabSorted()) {
		reminderFoxTabDirtied = true; // we need to refill the todo tab the first time you select it to resort it
	}
	reminderfox.datePicker.gSelectedDate = new Date();

	// select appropriate tab
	var tIndex;
	var defaultEditType = reminderfox.core.getPreferenceValue(reminderfox.consts.DEFAULT_EDIT, reminderfox.consts.DEFAULT_EDIT_DEFAULT);
	if(defaultEditType == "reminders") tIndex = 0;
	if(defaultEditType == "todos") tIndex = 1;
	if(defaultEditType == "previous") {
		// get the 'persist' value for previous opened TAB
		tIndex = document.documentElement.attributes.tab.value;
	}
	if (tIndex == null) tIndex = 0; // go for 'reminders'
	reminderfox.calendar.ui.tabListChange (tIndex);

	// set Filter display based on preference
	reminderfox.search.showFilters = reminderfox.core.getPreferenceValue(reminderfox.consts.SHOW_FILTERS, false);

	if (restartSkip == null) reminderfox.calendar.filter.toggle (reminderfox.search.showFilters);

	//get Sync settings
	var networkSync = reminderfox.core.getPreferenceValue(reminderfox.consts.NETWORK.SYNCHRONIZE, reminderfox.consts.NETWORK.SYNCHRONIZE_DEFAULT);

	var calDAVstatus = reminderfox.calDAV.accountsStatus ()
	reminderfox.util.Logger('network',"Sync settings  ..   networkSync: " + networkSync + "   CalDAV  accounts: " + calDAVstatus.count)

	document.getElementById('rmFx_progress-panel').hidden = true;


	selectCalendarSync = true;
	setTimeout(function () { reminderfox.calendar.ui.selectDay('today');}, 0);

	// start synchronizing in background (if that network option is set) if no CalDAV active
	if (calDAVstatus.active == 0)
		setTimeout(reminderFox_ensureRemoteRemindersSynchronizedInEditWindow, 1);

	if (window.arguments != null && window.arguments[1] != null) {
		var editReminderID = window.arguments[1].editID;
		if (editReminderID != null) {
			if (window.arguments[1].isAReminder == "true") {
				selectReminderById(editReminderID);
				window.setTimeout(reminderOrTodoEdit, 1);
			}
			else {
				selectTodoById(window.arguments[1].todoList, editReminderID);
				window.setTimeout(reminderOrTodoEdit, 1);
			}
		}
	}
	reminderFox_updateFoxyBadge();
	reminderfox.search.advanceFocus();

	// start sync in background for Remote Calendars
	reminderfox.online.status('rmFx_CalDAV_updatePending','')
}


function reminderFox_updateFoxyBadge(){
		var todaysAndUpcomingReminders = reminderfox.overlay.getTodaysAndUpcomingReminders();

		var todayReminders = todaysAndUpcomingReminders.today;
		var important = false;
		for (var i = 0; i < todayReminders.length; i++) {
			if (todayReminders[i].priority == reminderfox.consts.PRIORITY_IMPORTANT) {
				important = true;
			}
		}

		//smartFoxy badge change numbers/color
		reminderfox.core.foxyStatus(todayReminders, important, todaysAndUpcomingReminders.upcoming)
}


function reminderFox_ensureRemoteRemindersSynchronizedInEditWindow(){
	// sync 'em up
	var networkSync = reminderfox.core.getPreferenceValue(reminderfox.consts.NETWORK.SYNCHRONIZE, reminderfox.consts.NETWORK.SYNCHRONIZE_DEFAULT);

	if (networkSync) {
		reminderfox.core.statusSet(reminderfox.string("rf.add.network.status.label"));
		reminderfox.network.download.reminderFox_download_Startup_headless(reminderfox.consts.UI_MODE_HEADLESS_SHOW_ERRORS, reminderFox_synchronizeEditWindowCallback);
	}
}


function reminderFox_synchronizeEditWindowCallback(statustxtString, actionID){
	// var statusTxt = document.getElementById("reminderFox-network-status");

	if (actionID == 1) { // completed successfully (remote and local are equal, or were uploaded)
		reminderfox.core.statusSet("");

	}
	else
		if (actionID == 2) { // reminders were downloaded,  need to refresh reminders
			modifiedReminders();

			reminderfox.core.clearRemindersAndTodos();

			reminderfox.calendar.ui.selectDay();

			selectCalendarSync = false;
			// remove all of the calendar items and re-add them
			removeAllListItems(true, true);
			calendarReminderArray = null; // null out in case reminder columns are sorted
			calendarTodoArray = null;
			fillList(true, true);
			selectCalendarSync = true;

			reminderfox.core.statusSet("");

			// check to see if a reminder is being edited (such as if you opened the edit window from an alarm).
			// If so, then we need to replace the old reminder instance (which is no longer in memory) with a newly
			// retrieved one from the new model in memory
			var topWindow = reminderfox.util.getWindow("window:reminderFoxReminderOptionsDialog");
			if (topWindow) {
				var staleReminder = topWindow.arguments[0].reminder;
				if (staleReminder != null) {
					var refreshedReminder = reminderfox.core.getRemindersById(staleReminder.id, getCurrentReminderList());
					if (refreshedReminder != null) {
						topWindow.arguments[0].reminder = refreshedReminder;
					}
				}
			}
		}
		else {
			reminderfox.core.statusSet(statustxtString);
		}
}


function repopulateListForYear(oldYear, newYear){
	selectCalendarSync = false;
	// remove all of the calendar items and re-add them
	removeAllListItems(true, false);
	calendarReminderArray = null; // null out in case reminder columns are sorted
	calendarTodoArray = null;
	fillList(true, false);
	selectCalendarSync = true;
}


function fillList(fillReminders, fillTodoList){
	// don't go for fillList if no List is shown

var logMsg = "fillList   layout:" + document.documentElement.attributes.layout.value +
	"  reminders:" + fillReminders + "  todos:" + fillTodoList;  //XXXdebug
reminderfox.util.Logger('calndrGrid', logMsg);

	if (document.documentElement.attributes.layout.value == 0) return;    // Calendar only mode

	var i;
	if (fillReminders) {
		if (isTabSorted('fillList .. Reminders')) {

			var tabName = reminderfox.tabInfo.tabName;

			var direction = listSortMap[reminderfox.tabInfo.tabName].sortDirection;
			if (direction == reminderfox.consts.SORT_DIRECTION_ASCENDING) {
				listSortMap[tabName].sortColumn;
			}

	//		if (reminderfox.core.lastEvent != null) var lastEvent = reminderfox.core.lastEvent
			fillListSortReminders(true);

			// select (highlight) today's reminder or the next upcoming reminder
			setTimeout(function () { highlightClosestUpcomingReminder (reminderfox.datePicker.gSelectedDate, 'fillList sorted', reminderfox.core.lastEvent)},0);
	//		highlightClosestUpcomingReminder (reminderfox.datePicker.gSelectedDate, 'fillList sorted', reminderfox.core.lastEvent);

		} else {
			clearAllSortColumns(); // or could put this in the select tab logic...  may be better
			createCalendarReminderArray();
			var todaysDate = new Date();
			var monthArray, dayReminderArray;
			var monthIndex, dayIndex, reminderIndex;
			for (monthIndex = 0; monthIndex < 12; monthIndex++) {
				monthArray = calendarReminderArray[monthIndex];
				if (monthArray != null) {
					for (dayIndex = 0; dayIndex < 31; dayIndex++) {
						dayReminderArray = monthArray[dayIndex];
						if (dayReminderArray != null) {
							for (reminderIndex = 0; reminderIndex < dayReminderArray.length; reminderIndex++) {
								createUIListReminderItemSorted(dayReminderArray[reminderIndex], todaysDate);
							}
						}
					}
				}
			}
			highlightClosestUpcomingReminder (reminderfox.datePicker.gSelectedDate, 'fillList unsorted', reminderfox.core.lastEvent)
		}
		// bit of a hack here - for some reason at some times these filtered elements were indeed added to the
		// treechildren, but wouldn't show in the UI.  calling the treeselection.select() seemed to fix that, but
		// not sure why - possibly that the current view was scrolled off the screen
		if (reminderfox.search.isTextSearch()) {
			var treeChildren = document.getElementById("treechildren");
			var treeitems = treeChildren.childNodes;
			if (treeitems.length > 0) {
		//		setTimeout(treeSelect, 0);				// disabled 2013-06-13
			}
		}
	}

	if (fillTodoList) {
		//calendarTodoArray = null;
		createCalendarTodoArray()

		if (isTabSorted('fillList ... TodoList')) {		// for fillToDoList  in fillList
			fillListSortTodos();
		}
		else {
			clearAllSortColumns(); //  or could put this in the select tab logic...  may be better

			var filtersType = document.getElementById("rmFx-filters-type");
			// if one of the filters is set, only show those dates in the calendar array
			// only if the index is < 8; that means one of the "date-based" filters is set.
			// If the index is higher, that means a Custom View, and we should go through the non-date based filtering
			var currentFilter = reminderfox.search.filtersTypeGet();
			if (currentFilter > 0 && currentFilter < 8) {
				var todaysDate = new Date();
				var monthArray, dayReminderArray;
				var monthIndex, dayIndex, reminderIndex;
				for (monthIndex = 0; monthIndex < 12; monthIndex++) {
					monthArray = calendarTodoArray[monthIndex];
					if (monthArray != null) {
						for (dayIndex = 0; dayIndex < 31; dayIndex++) {
							dayReminderArray = monthArray[dayIndex];
							if (dayReminderArray != null) {
								for (reminderIndex = 0; reminderIndex < dayReminderArray.length; reminderIndex++) {
									createUIListItemTodo(dayReminderArray[reminderIndex], false, todaysDate, false);
								}
							}
						}
					}
				}
			}

			else {

				// put that other check in the createTodoArray
				var todaysDate = new Date();
				var reminderTodos = getCurrentTodoList();
				for (i = 0; i < reminderTodos.length; i++) {
					createUIListItemTodo(reminderTodos[i], false, todaysDate, false);
				}
				highlightTodo();
			}
		}
	}
}


function treeSelect(){
	var treeSelection = document.getElementById("reminderTree").view.selection;

	try {
		var treeChildren = document.getElementById("treechildren");
		var treeitems = treeChildren.childNodes;
		if (treeitems.length > 0) {
			treeSelection.select(0);
		}
	} catch (ex) {
	}
}



function doFindNext(){
	if (reminderfox.search.textFindLastString == null) {
		doFind();
	}
	else {
		if (reminderfox_isReminderTabSelected()) {
			findReminder();
		}
		else {
			findTodo();
		}
	}
}


function doShowAll(){
	SHOW_ALL_REMINDERS = true;
	HIDE_ALL_REMINDERS = false;

	// redraw the year and the days
	reminderfox.calendar.ui.selectDay();
}


function doHideAll(){
	SHOW_ALL_REMINDERS = false;
	HIDE_ALL_REMINDERS = true;

	reminderfox.calendar.ui.selectDay();
}


/**
 * Called from addReminderDialog.XUL context menu
 */
function toggleHideCompletedItems(){
	HIDE_COMPLETED_ITEMS = !HIDE_COMPLETED_ITEMS;

	var hideCompletedContextMenu = document.getElementById("treechildren-contextmenu-hideCompleted");
	var hideCompletedTodosContextMenu = document.getElementById("treechildren-contextmenu-hideCompleted2");
	if (HIDE_COMPLETED_ITEMS) {
		hideCompletedContextMenu.setAttribute("checked", "true");
		hideCompletedTodosContextMenu.setAttribute("checked", "true");
	}
	else {
		hideCompletedContextMenu.setAttribute("checked", "false");
		hideCompletedTodosContextMenu.setAttribute("checked", "false");
	}

	selectCalendarSync = false;
	// remove all of the calendar items and re-add them
	removeAllListItems(true, true);
	// redraw the year and the days
	reminderfox.calendar.ui.selectDay();

	selectCalendarSync = true;
}


function doFind(){
	var nsIPromptService = Ci.nsIPromptService;
	var nsPrompt_CONTRACTID = "@mozilla.org/embedcomp/prompt-service;1";
	var gPromptService = Cc[nsPrompt_CONTRACTID].getService(nsIPromptService);
	var result = {
		value: reminderfox.search.textFindLastString
	};
	var dummy = {
		value: 0
	};
	var title;
	if (reminderfox_isReminderTabSelected()) {
		title = reminderfox.string("rf.add.find.title");
	}
	else {
		title = reminderfox.string("rf.add.find.todo.title");
	}

	if (gPromptService.prompt(window, title, reminderfox.string("rf.add.find.description"), result, null, dummy)) {

		reminderfox.search.textFindLastString = result.value;

		// only bring up find dialog if reminders tab is selected
		if (reminderfox_isReminderTabSelected()) {
			findReminder();
		}
		else {
			findTodo();
		}
	}
}


function findReminder(){

	if (reminderfox.calendar.layout.status == 0) return; //gWCalndr just disable with Calendar ONLY!

	var i;
	var item;
	var row;
	var descCell;
	var descCellLabel;

	var selectedTreeItemIndex = document.getElementById("reminderTree").currentIndex;
	// if nothing selected, default to start of list
	if (selectedTreeItemIndex == -1) {
		selectedTreeItemIndex = 0;
	}

	var treeChildren = document.getElementById("treechildren");
	var selectedTreeItem = treeChildren.childNodes[selectedTreeItemIndex];

	var dateLabel = selectedTreeItem.childNodes[0].childNodes[0].getAttribute("label");
	var descLabel = selectedTreeItem.childNodes[0].childNodes[1].getAttribute("label");
	var findTextCaseInsensitiveLastString = reminderfox.search.textFindLastString.toUpperCase();

	var treeitems = treeChildren.childNodes;
	var startIndex = selectedTreeItemIndex;
	if (startIndex + 1 < treeitems.length) {
		startIndex = startIndex + 1;
	}
	else {
		startIndex = 0;
	}

	var foundIndex = -1;
	for (i = startIndex; i < treeitems.length; i++) {
		item = treeitems[i];
		row = item.childNodes[0];
		descCell = row.childNodes[1];
		descCellLabel = descCell.getAttribute("label");
		descCellLabel = descCellLabel.toUpperCase();

		if (descCellLabel.indexOf(findTextCaseInsensitiveLastString) != -1) {
			foundIndex = i;

			break;
		}
	}

	if (foundIndex == -1) {
		for (i = 0; i < startIndex; i++) {
			item = treeitems[i];
			row = item.childNodes[0];
			descCell = row.childNodes[1];
			descCellLabel = descCell.getAttribute("label");
			descCellLabel = descCellLabel.toUpperCase();

			if (descCellLabel.indexOf(findTextCaseInsensitiveLastString) != -1) {
				foundIndex = i;
				break;
			}
		}
	}
	if (foundIndex != -1) {
		var treeSelection = document.getElementById("reminderTree").view.selection
		treeSelection.select(foundIndex);
		findHighLight("reminderTree", foundIndex, treeitems.length);
	}
}


function findTodo(){
	var i;
	var item;
	var row;
	var descCell;
	var descCellLabel;

	var selectedTreeItemIndex = document.getElementById("todoTree").currentIndex;
	// if nothing selected, default to start of list
	if (selectedTreeItemIndex == -1) {
		selectedTreeItemIndex = 0;
	}

	var treeChildren = document.getElementById("todo_treechildren");
	var selectedTreeItem = treeChildren.childNodes[selectedTreeItemIndex];

	var descLabel = selectedTreeItem.childNodes[0].childNodes[1].getAttribute("label"); // 1 is description for Todos
	var findTextCaseInsensitiveLastString = reminderfox.search.textFindLastString.toUpperCase();

	var treeitems = treeChildren.childNodes;
	var startIndex = selectedTreeItemIndex;
	if (startIndex + 1 < treeitems.length) {
		startIndex = startIndex + 1;
	}
	else {
		startIndex = 0;
	}

	var foundIndex = -1;
	for (i = startIndex; i < treeitems.length; i++) {
		item = treeitems[i];
		row = item.childNodes[0];
		descCell = row.childNodes[1]; // 1 is description for todo's
		descCellLabel = descCell.getAttribute("label");
		descCellLabel = descCellLabel.toUpperCase();
		if (descCellLabel.indexOf(findTextCaseInsensitiveLastString) != -1) {
			foundIndex = i;

			break;
		}
	}

	if (foundIndex == -1) {
		for (i = 0; i < startIndex; i++) {
			item = treeitems[i];
			row = item.childNodes[0];
			descCell = row.childNodes[1]; // 1 is description for ToDo's
			descCellLabel = descCell.getAttribute("label");
			descCellLabel = descCellLabel.toUpperCase();

			if (descCellLabel.indexOf(findTextCaseInsensitiveLastString) != -1) {
				foundIndex = i;
				break;
			}
		}
	}
	if (foundIndex != -1) {
		var treeSelection = document.getElementById("todoTree").view.selection
		treeSelection.select(foundIndex);
		findHighLight("todoTree", foundIndex, treeitems.length);
	}
}


/**
 * called with selecting an event on list (reminders/todos)
 * if day was selected on Calendar -- just return
 */
function reminderSelected(event){
	if (reminderfox.calendar.drawList == false) {reminderfox.calendar.drawList = true;  return;}

	if (selectCalendarSync) {
		var selectedTreeItemIndex = document.getElementById("reminderTree").currentIndex;
		rmFx_selectedCurrentTree_ItemIndex = selectedTreeItemIndex;
		if (selectedTreeItemIndex >= 0) {
			var treeChildren = document.getElementById("treechildren");
			if (treeChildren != null) {
				if (selectedTreeItemIndex >= treeChildren.childNodes.length) {
					selectedTreeItemIndex = treeChildren.childNodes.length - 1;
				}
				var selectedTreeItem = treeChildren.childNodes[selectedTreeItemIndex];

				var reminderDateTime = selectedTreeItem.childNodes[0].getAttribute(REMINDER_FOX_DATE_REF);
				var reminderInstanceDate = new Date(parseInt(reminderDateTime));
				reminderfox.calendar.ui.selectDayOnCalndr (reminderInstanceDate);

			}
		}
	}
}

var rmFx_selectedCurrentTree_ItemIndex = 0;

function todoSelected(event){

	if (reminderfox.calendar.drawList == false) {reminderfox.calendar.drawList = true;  return;}

	if (selectCalendarSync) {
		var selectedTreeItemIndex = document.getElementById("todoTree").currentIndex;
		rmFx_selectedCurrentTree_ItemIndex = selectedTreeItemIndex;
		if (selectedTreeItemIndex >= 0) {
			var treeChildren = document.getElementById("todo_treechildren");
			if (treeChildren != null) {
				if (selectedTreeItemIndex >= treeChildren.childNodes.length) {
					selectedTreeItemIndex = treeChildren.childNodes.length - 1;
				}
				if (selectedTreeItemIndex < 0) {
					return;
				}
				var selectedTreeItem = treeChildren.childNodes[selectedTreeItemIndex];
				var reminderDateTime = selectedTreeItem.childNodes[0].getAttribute(REMINDER_FOX_DATE_REF);
				if (reminderDateTime != null && reminderDateTime.length > 0) {
					var reminderInstanceDate = new Date(parseInt(reminderDateTime));
					reminderfox.calendar.ui.selectDayOnCalndr (reminderInstanceDate);
				}
			}
		}
	}
	reminderfox.core.statusSet("");
}


/**
 * Creates array for the selected year
 * @return  calendarReminderArray {array} months/days/events
 */
function createCalendarReminderArray(){
	var monthArray;
	var monthDay;
	var dayReminderArray;
	var newDayReminder;
	var length;
	var val;

	calendarReminderArray = new Array(12);
	var reminders = getCurrentReminderList();

	var currentDate = reminderfox.datePicker.gSelectedDate;
	if (currentDate == null) {
		currentDate = new Date();
	}
	var year = currentDate.getFullYear();

	var displayIndex = null; //gWgetStartAndEndDates
	// set 	displayIndex =999 to display reminders past/future years
	var dateSpan = reminderFox_getStartAndEndDates(displayIndex, null, null, "reminders");

	var todaysDate = new Date();

	for (var i = 0; i < reminders.length; i++) {
		var basereminder = reminders[i];

		var allReminders = reminderfox.core.getAllRemindersInDateRange(basereminder, dateSpan.start, dateSpan.end, false);
		var x;
		// maybe make this a method that returns start/endindex
		var startIndex = 0;
		var endIndex = 0;
		if (allReminders.length > 0) {
			endIndex = allReminders.length;
		}
		if (allReminders.length > 0) {
			if (SHOW_ALL_REMINDERS) {
				startIndex = 0;
				endIndex = allReminders.length;
			}
			else
				if (HIDE_ALL_REMINDERS) {
					for (x = 0; x < allReminders.length; x++) {
						if (reminderfox.core.compareDates(allReminders[x].date, todaysDate) != -1) {
							break;
						}
					}
					// handle end case where x = length
					startIndex = x;

					// need to show reminders of yearly that have passed
					if (startIndex == allReminders.length) {
						startIndex = allReminders.length - 1;
					}
					endIndex = startIndex + 1;
					if (endIndex > allReminders.length) {
						endIndex = allReminders.length;
					}
				}
				// if there's only 1 reminder and the prefs are set to show prev/next, then just ignore the check
				else
					if (!(allReminders.length == 1 && REPEAT_PREVIOUS_OCCURRENCES >= 1 && REPEAT_UPCOMING_OCCURRENCES >= 1)) {
						for (x = 0; x < allReminders.length; x++) {
							if (reminderfox.core.compareDates(allReminders[x].date, todaysDate) != -1) {
								break;
							}
						}

						if (REPEAT_PREVIOUS_OCCURRENCES == -1) {
							startIndex = 0;
						}
						else {
							startIndex = x - REPEAT_PREVIOUS_OCCURRENCES;
							if (startIndex < 0) {
								startIndex = 0;
							}
						}

						if (REPEAT_UPCOMING_OCCURRENCES == -1) {
							endIndex = allReminders.length;
						}
						else {
							endIndex = x + REPEAT_UPCOMING_OCCURRENCES;
							if (endIndex > allReminders.length) {
								endIndex = allReminders.length;
							}
						}

						// if the user is showing no previous occurrences, we still want to show if a previous reminder is marked as RUC
						if (REPEAT_PREVIOUS_OCCURRENCES == 0 &&
						basereminder.remindUntilCompleted == reminderfox.consts.REMIND_UNTIL_COMPLETE_MARKED) {
							if (startIndex > 0 && startIndex == endIndex) { // eminderFox_compareDates( allReminders[x].date, todaysDate) == 1 ) {
								startIndex = startIndex - 1;
							}
						}
					}
		}
		for (var j = startIndex; j < endIndex; j++) {
			var reminder = allReminders[j];
			reminder = reminderfox.core.processReminderDescription(reminder, dateSpan.start.getFullYear(), false);

			// if it's marked as RemindUntilComplete, this should be treated as Today's date
			if (reminder.remindUntilCompleted == reminderfox.consts.REMIND_UNTIL_COMPLETE_MARKED && j == startIndex) {
				var todaysDate = new Date();
				if (todaysDate.getFullYear() == year) { // only valid for current year in the calendar
					var ignore = false;
					var filtersType = document.getElementById("rmFx-filters-type");
					if (filtersType != null) {
						var filtersTypeIndex = filtersType.selectedIndex;
						// month or week
						if (filtersTypeIndex == 1 || filtersTypeIndex == 2) {
							// if the date is outside of the selected month/week, then just show it.
							// Otherwise, go ahead and show it as Today's date.
							if (!(reminderfox.core.compareDates(todaysDate, dateSpan.start) > -1 &&
							reminderfox.core.compareDates(todaysDate, dateSpan.end) < 1)) {
								ignore = true;
							}
						}
					}
					if (!ignore) {
						var origDate = reminderFox_getDateVariableString(reminder, reminder.date)
						reminder = reminderfox.core.cloneReminderFoxEvent(reminder);
						reminder.date = new Date(todaysDate.getFullYear(), todaysDate.getMonth(), todaysDate.getDate(), reminder.date.getHours(), reminder.date.getMinutes());

						// for reminders that are passed due, show original date in summary.
						// Some users prefer the date that the reminder was set for to show
						// in the list; this is a reasonable compromise
						reminder.summary = reminder.summary + "  [" + origDate + "]";
					}
				}
			}

			var ignoreReminder = false;
			if (HIDE_COMPLETED_ITEMS &&
			reminderfox.core.isCompletedForDate(reminder, reminder.date)) {
				ignoreReminder = true;
			}

			monthArray = calendarReminderArray[reminder.date.getMonth()];
			if (monthArray == null) {
				monthArray = new Array(31);
				calendarReminderArray[reminder.date.getMonth()] = monthArray;
			}

			monthDay = reminder.date.getDate();
			dayReminderArray = monthArray[monthDay - 1];
			if (dayReminderArray == null) {
				dayReminderArray = new Array();
				monthArray[monthDay - 1] = dayReminderArray;
			}
			length = dayReminderArray.length;

			if (!ignoreReminder) {
				dayReminderArray[length] = reminder;
			}
		}
	}
}


/**
 * Creates array for the selected year
 * @return  calendarReminderArray {array} months/days/events
 */
function createCalendarTodoArray () {
	var monthArray;
	var monthDay;
	var dayReminderArray;
	var newDayReminder;
	var length;
	var val;


	calendarTodoArray = new Array(12);

	var reminders = getCurrentTodoList(); // returns all todos for ONLY current list

	var currentDate = reminderfox.datePicker.gSelectedDate;
	if (currentDate == null) {
		currentDate = new Date();
	}
	var year = currentDate.getFullYear();
	var dateSpan = reminderFox_getStartAndEndDates();
	var todaysDate = new Date();
	for (var i = 0; i < reminders.length; i++) {
		var basereminder = reminders[i];
		if (basereminder.date == null) {
			continue; // if there is no date set on this todo, then ignore it
		}

		var allTodos = reminderfox.core.getAllRemindersInDateRange(basereminder, dateSpan.start, dateSpan.end, false);
		var x;
		// maybe make this a method that returns start/endindex
		var startIndex = 0;
		var endIndex = 0;
		if (allTodos.length > 0) {
			endIndex = allTodos.length;
		}
		if (allTodos.length > 0) {
			if (SHOW_ALL_REMINDERS) {
				startIndex = 0;
				endIndex = allTodos.length;
			}
			else
				if (HIDE_ALL_REMINDERS) {
					for (x = 0; x < allTodos.length; x++) {
						if (reminderfox.core.compareDates(allTodos[x].date, todaysDate) != -1) {
							break;
						}
					}
					// handle end case where x = length
					startIndex = x;

					// need to show reminders of yearly that have passed
					if (startIndex == allTodos.length) {
						startIndex = allTodos.length - 1;
					}
					endIndex = startIndex + 1;
					if (endIndex > allTodos.length) {
						endIndex = allTodos.length;
					}
				}
				// if there's only 1 reminder and the prefs are set to show prev/next, then just ignore the check
				else
					if (!(allTodos.length == 1 && REPEAT_PREVIOUS_OCCURRENCES >= 1 && REPEAT_UPCOMING_OCCURRENCES >= 1)) {
						for (x = 0; x < allTodos.length; x++) {
							if (reminderfox.core.compareDates(allTodos[x].date, todaysDate) != -1) {
								break;
							}
						}

						if (REPEAT_PREVIOUS_OCCURRENCES == -1) {
							startIndex = 0;
						}
						else {
							startIndex = x - REPEAT_PREVIOUS_OCCURRENCES;
							if (startIndex < 0) {
								startIndex = 0;
							}
						}

						if (REPEAT_UPCOMING_OCCURRENCES == -1) {
							endIndex = allTodos.length;
						}
						else {
							endIndex = x + REPEAT_UPCOMING_OCCURRENCES;
							if (endIndex > allTodos.length) {
								endIndex = allTodos.length;
							}
						}
					}
		}
		for (var j = startIndex; j < endIndex; j++) {
			var todo = allTodos[j];
			todo = reminderfox.core.processReminderDescription(todo, dateSpan.start.getFullYear(), false);

			monthArray = calendarTodoArray[todo.date.getMonth()];
			if (monthArray == null) {
				monthArray = new Array(31);
				calendarTodoArray[todo.date.getMonth()] = monthArray;
			}

			monthDay = todo.date.getDate();
			dayReminderArray = monthArray[monthDay - 1];
			if (dayReminderArray == null) {
				dayReminderArray = new Array();
				monthArray[monthDay - 1] = dayReminderArray;
			}
			length = dayReminderArray.length;

			var ignoreReminder = false;
			if (HIDE_COMPLETED_ITEMS &&
			todo.completedDate != null) {
				ignoreReminder = true;
			}

			if (!ignoreReminder) {
				dayReminderArray[length] = todo;
			}
		}
	}
}


function reminderFox_getAddTimeString(reminder){
	var timeString = null;
	if (!reminder.allDayEvent) {
		try {
			var hours = reminder.date.getHours();

			var AMorPM = reminderfox.string("rf.add.time.PM");
			var use24HourTime= reminderfox.core.getPreferenceValue(reminderfox.consts.USE_24_HOUR_TIME, false);
			if (use24HourTime) {
				AMorPM = "";
				if (hours < 10) {
					hours = "0" + hours;
				}

			}

			if (AMorPM != "") {
				if (hours < 12) {
					AMorPM = reminderfox.string("rf.add.time.AM");
				}
				if (hours == 0) {
					hours = 12;
				}
				if (hours >= 13) {
					hours = hours - 12;
				}
			}

			var minutes = reminder.date.getMinutes();
			if (minutes < 10) {
				minutes = "0" + minutes;
			}

			timeString = hours + REMINDER_FOX_TIME_DELIMITER + minutes;
			if (AMorPM != "") {
				timeString = timeString + " " + AMorPM;
			}
		}
		catch (e) {
				}
	}
	return timeString;
}


function setRemindUntilCompleteColumn(reminder, columnLabel){
	if (reminder.remindUntilCompleted == reminderfox.consts.REMIND_UNTIL_COMPLETE_TO_BE_MARKED) {
		columnLabel.setAttribute("src", reminderfox.consts.REMIND_UNTIL_COMPLETED_TO_BE_MARKED_IMAGE);
	}
	else
		if (reminder.remindUntilCompleted == reminderfox.consts.REMIND_UNTIL_COMPLETE_MARKED) {
			columnLabel.setAttribute("src", reminderfox.consts.REMIND_UNTIL_COMPLETED_IMAGE);
		}
}



function getTimeHoursFromString(time){
	var hours = 0;
	var startindex = time.indexOf(reminderfox.string("rf.add.time.delimiter"));
	if (startindex != -1) {
		try {
			var hours = parseInt(time.substring(0, startindex));
			var minutes = time.substring(startindex + 1, startindex + 3);
			// now trim remainder
			var remainder = time.substring(startindex + 3, time.length);
			if (remainder != "") {
				remainder = reminderfox.util.trim(remainder);
				var AMorPM = remainder;
				if (AMorPM.toUpperCase() == reminderfox.string("rf.add.time.PM").toUpperCase()) {
					if (hours != 12) {
						hours = hours + 12;
					}
				}
				else {
					if (hours == 12) {
						hours = 0;
					}
				}
			}
		}
		catch (e) {
				}
	}
	return hours;
}


function getTimeMinutesFromString(time){
	var minutes = 0;
	var startindex = time.indexOf(reminderfox.string("rf.add.time.delimiter"));
	if (startindex != -1) {
		try {
			minutes = time.substring(startindex + 1, startindex + 3);
		}
		catch (e) {
				}
	}
	return minutes;
}


function reminderFox_getDateVariableString(reminder, date){
	var dateVariableString = reminderfox.core.getPreferenceValue(reminderfox.consts.LIST_DATE_LABEL, reminderfox.consts.LIST_DATE_LABEL_DEFAULT);
	return reminderfox.date.getDateVariable(reminder, date, dateVariableString);
};


/**
 * 'View'
 *  'reminderFox_getStartAndEndDates' has been modified to use also with 'View'.
 *  calling parameters:
 *  @param filtersTypeIndex {integer} set with reminderfox.search.filtersTypeGet()
 *  @param useToday  {boolean} true == use 'TODAY' for start day of selected periode
 *  @param showAll {boolean}
 *  Note: rearranging/adding the XUL items and a re-numbering has to be changed
 *     also with 'VIEW'  (rmFxViews.js)
 */
function reminderFox_getStartAndEndDates(filtersTypeIndex, useToday, showAll) {
	var startAndEnd = {
		start : null,
		end : null
	};

	//  if 'View' has set the date span already, use that			//gW_getStartAndEndDates
	if (reminderfox.view.views.cDateSpan.start != null) {
		startAndEnd.start = reminderfox.view.views.cDateSpan.start;
		startAndEnd.end = reminderfox.view.views.cDateSpan.end;
		return startAndEnd;
	}

	var nMonth = reminderfox.calendar.numMonth;

	if(filtersTypeIndex == null) {
		if (reminderfox.search == null) filtersTypeIndex =0
		else
			filtersTypeIndex = reminderfox.search.filtersTypeGet();
	}

	//var showAll = false;
	if (showAll) {// if showAll is true, we will show ALL reminders instead of just this year/month/week/etc
		// get all years (we'll just do +/- 150 to put some cap and aid performance)
		var currentyear = new Date().getFullYear();
		// start of year
		startAndEnd.start = new Date(currentyear - 150, 0, 1);
		// end of year
		startAndEnd.end = new Date(currentyear + 150, 11, 31);
		return startAndEnd;
	}

	var year;
	var month;
	var day;
	if(reminderfox.datePicker.gSelectedDate != null) {
		year = reminderfox.datePicker.gSelectedDate.getFullYear();
		month = reminderfox.datePicker.gSelectedDate.getMonth();
		day = reminderfox.datePicker.gSelectedDate.getDate();
	}
	if(year == null) {
		year = new Date().getFullYear();
		month = new Date().getMonth();
		day = new Date().getDate();

	}

	if(useToday == true) {
		year = new Date().getFullYear();
		month = new Date().getMonth();
		day = new Date().getDate();
	}

	switch (filtersTypeIndex) {
		case 0: {// year
			startAndEnd.start = new Date(year, 0, 1);
			startAndEnd.end = new Date(year, 11, 31);
			break;
		}

		case 1: {// month
			var endDay = reminderfox.date.getValidDateForMonth(year, month, 31);
			startAndEnd.start = new Date(year, month, 1);
			startAndEnd.end = new Date(year, month, endDay);
			break;
		}

		case 2: {// week
			// get start of the week
			var start = new Date(year, month, day);
			startAndEnd.start = reminderfox.core.getThisDayFromCurrentDate(start, 0);

			// get end of the week
			var end = new Date(year, month, day);
			startAndEnd.end = reminderfox.core.getThisDayFromCurrentDate(end, 6);

			// if the start date is before this year, just use this year as start
			var startOfYear = new Date(year, 0, 1);
			// start of year
			if(reminderfox.core.compareDates(startAndEnd.start, startOfYear) == -1) {
				startAndEnd.start = startOfYear;
			}
			// if the end date goes beyond this year, use the end of year as the stopping point
			var endOfYear = new Date(year, 11, 31);
			// end of year
			if(reminderfox.core.compareDates(startAndEnd.end, endOfYear) == 1) {
				startAndEnd.end = endOfYear;
			}
			break;
		}

		case 3: {// day
			startAndEnd.start = new Date(year, month, day);
			startAndEnd.end = new Date(year, month, day);
			break;
		}

		case 4: {// next week
			var todaysDate = new Date();
			startAndEnd.start = todaysDate;
			startAndEnd.end = new Date(todaysDate.getFullYear(), todaysDate.getMonth(), todaysDate.getDate() + 7);
			// end 7 days from now
			// if the end date goes beyond this year, use the end of year as the stopping point
			var endOfYear = new Date(year, 11, 31);
			// end of year
			if(reminderfox.core.compareDates(startAndEnd.end, endOfYear) == 1) {
				startAndEnd.end = endOfYear;
			}
			break;
		}

		case 5: {// next two weeks
			var todaysDate = new Date();
			startAndEnd.start = todaysDate;
			startAndEnd.end = new Date(todaysDate.getFullYear(), todaysDate.getMonth(), todaysDate.getDate() + 14);
			// end 7 days from now
			// if the end date goes beyond this year, use the end of year as the stopping point
			var endOfYear = new Date(year, 11, 31);
			// end of year
			if(reminderfox.core.compareDates(startAndEnd.end, endOfYear) == 1) {
				startAndEnd.end = endOfYear;
			}
			break;
		}

		case 6: {// all upcoming
			var todaysDate = new Date();
			startAndEnd.start = todaysDate;
			// end to the end of the year
			startAndEnd.end = new Date(todaysDate.getFullYear(), 11, 31);
			break;
		}

		case 8: {// 'View' has the date span
			if(reminderfox.view.views.cDateSpan.start != null) {
				startAndEnd.start = reminderfox.view.views.cDateSpan.start;
				startAndEnd.end = reminderfox.view.views.cDateSpan.end;
			}
		}

	}// switch (filtersTypeIndex)

	if(startAndEnd.start == null) {
		startAndEnd.start = new Date(year, 0, 1);
		startAndEnd.end = new Date(year, 11, 31);
	}
	return startAndEnd;
}


/**
 * Adds an event to the list, if list hidden, do nothing
 */
function createUIListItemReminder(baseReminder){
	// don't go if no List is shown
	if (reminderfox.calendar.layout.status < 1) return; // call from menu icon or Calndr only

	var lastListIndex = 0;
	var once = document.getElementById("occurrence");
	var treeChildren = document.getElementById("treechildren");
	var dateSpan = reminderFox_getStartAndEndDates();
	var year;
	if (reminderfox.datePicker.gSelectedDate != null) {
		year = reminderfox.datePicker.gSelectedDate.getFullYear();
	}
	if (year == null) {
		year = new Date().getFullYear();
	}
	var todaysDate = new Date();
	var allReminders = reminderfox.core.getAllRemindersInDateRange(baseReminder, dateSpan.start, dateSpan.end, false);

	var startIndex = 0;
	var endIndex = 0;
	if (allReminders.length > 0) {
		endIndex = allReminders.length;
	}
	if (allReminders.length > 0) {
		if (SHOW_ALL_REMINDERS) {
			startIndex = 0;
			endIndex = allReminders.length;
		}
		else
			if (HIDE_ALL_REMINDERS) {
				for (var x = 0; x < allReminders.length; x++) {
					if (reminderfox.core.compareDates(allReminders[x].date, todaysDate) != -1) {
						break;
					}
				}
				startIndex = x;
				// need to show reminders of yearly that have passed
				if (startIndex == allReminders.length) {
					startIndex = allReminders.length - 1;
				}
			}

			// if there's only 1 reminder and the prefs are set to show prev/next, then just ignore the check
			else
				if (!(allReminders.length == 1 && REPEAT_PREVIOUS_OCCURRENCES >= 1 && REPEAT_UPCOMING_OCCURRENCES >= 1)) {
					for (var x = 0; x < allReminders.length; x++) {
						if (reminderfox.core.compareDates(allReminders[x].date, todaysDate) != -1) {
							break;

						}
					}
					if (REPEAT_PREVIOUS_OCCURRENCES == -1) {
						startIndex = 0;
					}
					else {
						startIndex = x - REPEAT_PREVIOUS_OCCURRENCES;
						if (startIndex < 0) {
							startIndex = 0;
						}
					}

					if (REPEAT_UPCOMING_OCCURRENCES == -1) {
						endIndex = allReminders.length;
					}
					else {
						endIndex = x + REPEAT_UPCOMING_OCCURRENCES;
						if (endIndex > allReminders.length) {
							endIndex = allReminders.length;
						}
					}
				}
	}

	var calDAVaccounts = reminderfox.calDAV.getAccounts()

	for (var j = startIndex; j < endIndex; j++) {
		var treeSelection;
		var value;
		var tree;
		var boxobject;
		var first;
		var last;
		var previousReminderOffset;

		var newItem = document.createElement("treeitem");
		var newRow = document.createElement("treerow");
		newRow.setAttribute(REMINDER_FOX_ID_REF, baseReminder.id);

//calDAV_color
		if (baseReminder.calDAVid != null) {
			var account = calDAVaccounts[baseReminder.calDAVid];

			if ((account != null) && (account.calendarColor != null)) {
				newRow.setAttribute('properties', 'caldav' + account.ID);   //set calendarColor with account.ID
				newRow.setAttribute('class', 'caldav' + account.ID);
			}
		}

		var newDateLabel = document.createElement("treecell");
		var newDescLabel = document.createElement("treecell");

		newItem.appendChild(newRow);
		newRow.appendChild(newDateLabel);
		newRow.appendChild(newDescLabel);
		var isImportant = false;

		var reminder = allReminders[j];
		reminder = reminderfox.core.processReminderDescription(reminder, year, false);

		// if it's marked as RemindUntilComplete, this should be treated as Today's date
		if (reminder.remindUntilCompleted == reminderfox.consts.REMIND_UNTIL_COMPLETE_MARKED && j == startIndex) {
			if (todaysDate.getFullYear() == year) { // only valid for current year in the calendar
				// if the Filter is applied, don't show as today's date if it's another selected month/week
				var ignore = false;

				var filtersTypeIndex = reminderfox.search.filtersTypeGet();
				// month or week
				if (filtersTypeIndex == 1 || filtersTypeIndex == 2) {
					// if the date is outside of the selected month/week, then just show it.
					// Otherwise, go ahead and show it as Today's date.
					if (!(reminderfox.core.compareDates(todaysDate, dateSpan.start) > -1 &&
					reminderfox.core.compareDates(todaysDate, dateSpan.end) < 1)) {
						ignore = true;
					}
				}
				if (!ignore) {
					reminder = reminderfox.core.cloneReminderFoxEvent(reminder);
					reminder.date = new Date(todaysDate.getFullYear(), todaysDate.getMonth(), todaysDate.getDate(), reminder.date.getHours(), reminder.date.getMinutes());
				}

			}
		}

		var dayVal = reminder.date.getDate();
		if (calendarReminderArray == null) {
			createCalendarReminderArray();
		}
		var monthArray = calendarReminderArray[reminder.date.getMonth()];
		if (monthArray == null) {
			monthArray = new Array(31);
			calendarReminderArray[reminder.date.getMonth()] = monthArray;
		}

		var dayReminderArray = monthArray[dayVal - 1];
		if (dayReminderArray == null) {
			dayReminderArray = new Array();
			monthArray[dayVal - 1] = dayReminderArray;
		}

		var length = dayReminderArray.length;
		dayReminderArray[length] = reminder;

		if (useDefaultDate) {
			var monthAsText = reminderfox.date.getMonthAsText(reminder.date.getMonth());
			newDateLabel.setAttribute("label", monthAsText + " " + dayVal);
		}
		else {
			newDateLabel.setAttribute("label", reminderFox_getDateVariableString(reminder, reminder.date));
		}
		newRow.setAttribute(REMINDER_FOX_DATE_REF, reminder.date.getTime());

		newDescLabel.setAttribute("label", reminder.summary);
		var newTimeLabel = document.createElement("treecell");
		newRow.appendChild(newTimeLabel);

		var newCompletedDateLabel = document.createElement("treecell");
		newRow.appendChild(newCompletedDateLabel);

		var newRepeatLabel = document.createElement("treecell");
		newRow.appendChild(newRepeatLabel);

		var newCompleteLabel = document.createElement("treecell");
		newRow.appendChild(newCompleteLabel);

		var newRemindUntilCompletedLabel = document.createElement("treecell");
		newRow.appendChild(newRemindUntilCompletedLabel);

		var newNotesLabel = document.createElement("treecell");
		newRow.appendChild(newNotesLabel);

		var alarmLabel = document.createElement("treecell");
		newRow.appendChild(alarmLabel);

		var categoriesLabel = document.createElement("treecell");
		newRow.appendChild(categoriesLabel);

		var endDateLabel = document.createElement("treecell");
		newRow.appendChild(endDateLabel);

		var isToday = reminderfox.core.compareDates(reminder.date, todaysDate) == 0;
		var isImportant = reminder.priority == reminderfox.consts.PRIORITY_IMPORTANT;
		var isCompleted = reminderfox.core.isCompletedForDate(reminder, reminder.date);

		setTextProperties(isToday, isImportant, isCompleted, newDateLabel, newDescLabel, newTimeLabel);

		if (isCompleted) {
			newCompleteLabel.setAttribute("src", reminderfox.consts.COMPLETED_IMAGE);

			if (useDefaultDate) {
				var monthAsText = reminderfox.date.getMonthAsText(reminder.completedDate.getMonth());
				newCompletedDateLabel.setAttribute("label", monthAsText + " " + reminder.completedDate.getDate());
			}
			else {
				newCompletedDateLabel.setAttribute("label", reminderFox_getDateVariableString(reminder, reminder.completedDate));
			}
		}


		if (reminder.endDate != null) {
			var myEndDate = new Date(reminder.date.getTime() + reminder.durationTime);
			if (reminder.allDayEvent) {
				myEndDate.setDate(myEndDate.getDate() - 1);
			}
			if (useDefaultDate) {
				var monthAsText = reminderfox.date.getMonthAsText(myEndDate.getMonth());
				endDateLabel.setAttribute("label", monthAsText + " " + myEndDate.getDate());
			}
			else {
				endDateLabel.setAttribute("label", reminderFox_getDateVariableString(reminder, myEndDate));
			}
		}

		setRemindUntilCompleteColumn(reminder, newRemindUntilCompletedLabel);


		if (reminder.allDayEvent) {
			newTimeLabel.setAttribute("label", REMINDER_FOX_TIME_ALL_DAY_LABEL);
		}
		else {
			var time = reminderFox_getAddTimeString(reminder);
			if (time == null) {
				newTimeLabel.setAttribute("label", REMINDER_FOX_TIME_ALL_DAY_LABEL);
			}
			else {
				newTimeLabel.setAttribute("label", time);
			}
		}

		if (reminder.recurrence.type == reminderfox.consts.RECURRENCE_YEARLY) {
			newRepeatLabel.setAttribute("label", REMINDER_FOX_REPEAT_LABEL_YEARLY);
		}
		else
			if (reminder.recurrence.type == reminderfox.consts.RECURRENCE_YEARLY_DAY) {
				newRepeatLabel.setAttribute("label", REMINDER_FOX_REPEAT_LABEL_YEARLY_DAY);
			}
			else
				if (reminder.recurrence.type == reminderfox.consts.RECURRENCE_MONTHLY_DATE) {
					newRepeatLabel.setAttribute("label", REMINDER_FOX_REPEAT_LABEL_MONTHLY);
				}
				else
					if (reminder.recurrence.type == reminderfox.consts.RECURRENCE_MONTHLY_DAY) {
						newRepeatLabel.setAttribute("label", REMINDER_FOX_REPEAT_LABEL_MONTHLY_DAY);
					}
					else
						if (reminder.recurrence.type == reminderfox.consts.RECURRENCE_WEEKLY) {
							newRepeatLabel.setAttribute("label", REMINDER_FOX_REPEAT_LABEL_WEEKLY);
						}
						else
							if (reminder.recurrence.type == reminderfox.consts.RECURRENCE_DAILY) {
								newRepeatLabel.setAttribute("label", REMINDER_FOX_REPEAT_LABEL_DAILY);
							}
							else {
								newRepeatLabel.setAttribute("label", REMINDER_FOX_REPEAT_LABEL_NONE);
							}

		if (reminder.notes != null) {
			newNotesLabel.setAttribute("src", reminderfox.consts.NOTES_IMAGE);
		}

		if (reminder.alarm != null) {

			// actually could check if snooze time is less than reminder's date...  if so don't show it (the snooze has passed?)
			if (reminder.snoozeTime != null && !isCompleted) {
				alarmLabel.setAttribute("src", reminderfox.consts.ALARM_SNOOZE_IMAGE);
			}
			else {
				alarmLabel.setAttribute("src", reminderfox.consts.ALARM_IMAGE);
			}
		}

		if (reminder.categories != null) {
			categoriesLabel.setAttribute("label", reminder.categories);
			// TODO:
			//newDescLabel.setAttribute( "style", "color: #F6F9ED" );
		}

		var newMailLabel = document.createElement("treecell");
		newRow.appendChild(newMailLabel);
		if (reminderfox.core.isMailEvent(reminder)) {
			newMailLabel.setAttribute("src", reminderfox.consts.MAIL_IMAGE);
		}

		var calDAVlabel = document.createElement("treecell");
		newRow.appendChild(calDAVlabel);

		if ((reminder.calDAVid != null) && (reminder.calDAVid != "")){
			var calDAVbadgeImage = document.createElement("image");
			calDAVlabel.appendChild(calDAVbadgeImage);
				calDAVbadgeImage.setAttribute("class", "rmFx-calDAV-badge");
				calDAVbadgeImage.setAttribute("tooltiptext", reminderfox.string("rf.caldav.stored2account"));

			var calDAVbadgeLabel = document.createElement("label");
			calDAVlabel.appendChild(calDAVbadgeLabel);
				calDAVbadgeLabel.setAttribute("value", reminder.calDAVid);
				calDAVbadgeLabel.setAttribute("class", "rmFx-calDAV-text");
		}

		// Figure out where to put the new item in sorted list
		var treeitems = treeChildren.childNodes;
		var added = false;

		for (var i = lastListIndex; i < treeitems.length; i++) {
			var item = treeitems[i];
			var row = item.childNodes[0];
			var reminderDateTime = row.getAttribute(REMINDER_FOX_DATE_REF);
			var reminderInstanceDate = new Date(parseInt(reminderDateTime));

			var timeLabel = row.childNodes[2].getAttribute("label");
			var allDay = timeLabel == REMINDER_FOX_TIME_ALL_DAY_LABEL;

			if (reminderInstanceDate.getMonth() > reminder.date.getMonth()
					|| (reminderInstanceDate.getMonth() == reminder.date.getMonth()
					&& dayVal <= reminderInstanceDate.getDate())) {

				if (reminderInstanceDate.getMonth() == reminder.date.getMonth()
						&& reminderInstanceDate.getDate() == dayVal) {

					if (reminder.allDayEvent && !allDay) {
						continue;
					}
					else
						if (!reminder.allDayEvent && allDay) {
								// adding hourly reminder; let's add it
						}
						else
							if (!reminder.allDayEvent && !allDay) {
								// two hourly events.  Let's compare the times.
								var currentHours = getTimeHoursFromString(timeLabel);
								var currentMinutes = getTimeMinutesFromString(timeLabel);
								if (reminder.date.getHours() > currentHours) {
									continue;
								}
								else
									if (reminder.date.getHours() == currentHours &&
									reminder.date.getMinutes() > currentMinutes) {
										continue;
									}
							}
							else
								if (!isImportant) {
									// if this reminder is not marked as important, add to the
									// end of the list of today's reminders
									continue;
								}
				}

				treeChildren.insertBefore(newItem, item);
				added = true;

				// highlight the newly added reminder in the list
				treeSelection = document.getElementById("reminderTree").view.selection;
				if (selectCalendarSync) {
					try {
						treeSelection.select(i);
					}
					catch (e) {
						reminderfox.core.logMessageLevel("  Error in selectReminderById1: " +
						e.message, reminderfox.consts.LOG_LEVEL_INFO); //TODO
					}
					findHighLight("reminderTree", i, treeitems.length)
				}
				lastListIndex = i;
				break;
			}
		}

		if (!added) {
			treeChildren.appendChild(newItem);

			// highlight the newly added reminder in the list
			treeSelection = document.getElementById("reminderTree").view.selection;
			if (selectCalendarSync) {
				treeSelection.select(treeitems.length - 1);
				// make sure that newly selected row is shown in scroll pane
				findHighLight("reminderTree", i, treeitems.length)
			}
		}
	}
	if (isTabSorted('createUIListItemReminder')) {		// for  createUIListItemReminder
		removeAllListItems(true, false);
		fillList(true, false);
	}
}


function setTextProperties(isToday, isImportant, isCompleted, newDateLabel, newDescLabel, newTimeLabel){
	if (reminderFox_highlightTodayPreference && isToday && isImportant && isCompleted) {
		newDateLabel.setAttribute("properties", "imporantCompleteTextToday");
		newDescLabel.setAttribute("properties", "imporantCompleteTextToday");
		newTimeLabel.setAttribute("properties", "imporantCompleteTextToday");
	}
	else
		if (reminderFox_highlightTodayPreference && isToday && isImportant) {
			newDateLabel.setAttribute("properties", "imporantToday");
			newDescLabel.setAttribute("properties", "imporantToday");
			newTimeLabel.setAttribute("properties", "imporantToday");
		}
		else
			if (reminderFox_highlightTodayPreference && isToday && isCompleted) {
				newDateLabel.setAttribute("properties", "todayCompleteText");
				newDescLabel.setAttribute("properties", "todayCompleteText");
				newTimeLabel.setAttribute("properties", "todayCompleteText");
			}
			else
				if (reminderFox_highlightTodayPreference && isToday) {
					newDateLabel.setAttribute("properties", "today");
					newDescLabel.setAttribute("properties", "today");
					newTimeLabel.setAttribute("properties", "today");
				}
				else
					if (isImportant && isCompleted) {
						newDateLabel.setAttribute("properties", "imporantCompleteText");
						newDescLabel.setAttribute("properties", "imporantCompleteText");
						newTimeLabel.setAttribute("properties", "imporantCompleteText");
					}
					else
						if (isImportant) {
							newDateLabel.setAttribute("properties", "important");
							newDescLabel.setAttribute("properties", "important");
							newTimeLabel.setAttribute("properties", "important");
						}
						else
							if (isCompleted) {
								newDateLabel.setAttribute("properties", "completeText");
								newDescLabel.setAttribute("properties", "completeText");
								newTimeLabel.setAttribute("properties", "completeText");
							}
							else {
								newDateLabel.removeAttribute("properties");
								newDescLabel.removeAttribute("properties");
								newTimeLabel.removeAttribute("properties");
							}
}



function eventMatchesFilterText(reminder, rmSearchText, currentSearchItemValue){

	var searchItems = ["summary", "categories", "notes", "location", "ALL"];

	try { //  'try'	to skip for invalid 'Item' description
		if (currentSearchItemValue == reminderfox.search.SEARCH_ITEMS_ALL_INDEX) {

			var found = false;
			for (var i = 0; !found && i < searchItems.length; i++) {
				if (i != reminderfox.search.SEARCH_ITEMS_ALL_INDEX) {
					if (reminder[searchItems[i]] != null) { // no match
						var attributeValue = reminder[searchItems[i]].toLowerCase();
						if (searchItems[i] == "categories") {
							attributeValue = reminderfox.util.unEscapeCommas(attributeValue);
						}
						if (attributeValue.search(rmSearchText) != -1) {
							found = true;
						}
					}
				}
			}
			if (!found) {
				return false; // no matches
			}
		}
		else {
			if (reminder[searchItems[currentSearchItemValue]] == null) { // no match
				return false;
			}
			var attributeValue = reminder[searchItems[currentSearchItemValue]].toLowerCase();
			if (searchItems[currentSearchItemValue] == "categories") {
				attributeValue = reminderfox.util.unEscapeCommas(attributeValue);
			}
			if (attributeValue.search(rmSearchText) == -1) {
				return false;
			}
		}
	}
	catch (e) {
		return
	};
	return true;
}


function rmFx_checkFiltered (reminder) {

	if (!reminderfox.view.ViewThis(reminder)) return false;		// no Views Filter

	if (reminderfox.search.isTextSearch()) {
		var rmSearchText = reminderfox.search.textSearchString.toLowerCase();
		if (!eventMatchesFilterText(reminder, rmSearchText, reminderfox.search.textSearchType)) {
			return false;
		}
	};
	return true;
};


function createUIListReminderItemSorted(reminder, todaysDate){
//	if (document.documentElement.attributes.layout.value == 0) return;    // Calendar only mode
	if (reminderfox.calendar.layout.status < 1) return; // call from menu icon or Calndr only

	if (!rmFx_checkFiltered (reminder)) return;

	var calDAVaccounts = reminderfox.calDAV.getAccounts()
	var once = document.getElementById("occurrence");
	var treeChildren = document.getElementById("treechildren");

	var newItem = document.createElement("treeitem");
	var newRow = document.createElement("treerow");
	newRow.setAttribute(REMINDER_FOX_ID_REF, reminder.id);       // REMINDER_FOX_ID_REF  = idRef

		if (reminder.calDAVid != null) {
			var account = calDAVaccounts[reminder.calDAVid]
			if ((account != null) && (account.calendarColor != null)) {
				newRow.setAttribute('properties', 'caldav' + account.ID);   //set calendarColor with account.ID
				newRow.setAttribute('class', 'caldav' + account.ID);
			}
		}

	var newDateLabel = document.createElement("treecell");
	var newDescLabel = document.createElement("treecell");

	newItem.appendChild(newRow);
	newRow.appendChild(newDateLabel);
	newRow.appendChild(newDescLabel);

	var isToday = reminderfox.core.compareDates(reminder.date, todaysDate) == 0;
	var isImportant = reminder.priority == reminderfox.consts.PRIORITY_IMPORTANT;
	var isCompleted = reminderfox.core.isCompletedForDate(reminder, reminder.date);

	var monthAsText = reminderfox.date.getMonthAsText(reminder.date.getMonth());
	if (useDefaultDate) {
		newDateLabel.setAttribute("label", monthAsText + " " + reminder.date.getDate());
	}
	else {
		newDateLabel.setAttribute("label", reminderFox_getDateVariableString(reminder, reminder.date));
	}

	newRow.setAttribute(REMINDER_FOX_DATE_REF, reminder.date.getTime());

	newDescLabel.setAttribute("label", reminder.summary);

	var newTimeLabel = document.createElement("treecell");
	newRow.appendChild(newTimeLabel);

	var newCompletedDateLabel = document.createElement("treecell");
	newRow.appendChild(newCompletedDateLabel);


	var newRepeatLabel = document.createElement("treecell");
	newRow.appendChild(newRepeatLabel);

	var newCompleteLabel = document.createElement("treecell");
	newRow.appendChild(newCompleteLabel);

	var newRemindUntilCompletedLabel = document.createElement("treecell");
	newRow.appendChild(newRemindUntilCompletedLabel);

	var newNotesLabel = document.createElement("treecell");
	newRow.appendChild(newNotesLabel);

	var alarmLabel = document.createElement("treecell");
	newRow.appendChild(alarmLabel);

	var catLabel = document.createElement("treecell");
	newRow.appendChild(catLabel);

	var endDateLabel = document.createElement("treecell");
	newRow.appendChild(endDateLabel);

	setTextProperties(isToday, isImportant, isCompleted, newDateLabel, newDescLabel, newTimeLabel);

	if (isCompleted) {
		newCompleteLabel.setAttribute("src", reminderfox.consts.COMPLETED_IMAGE);
		if (useDefaultDate) {
			var monthAsText = reminderfox.date.getMonthAsText(reminder.completedDate.getMonth());
			newCompletedDateLabel.setAttribute("label", monthAsText + " " + reminder.completedDate.getDate());
		}
		else {
			newCompletedDateLabel.setAttribute("label", reminderFox_getDateVariableString(reminder, reminder.completedDate));
		}
	}


	if (reminder.endDate != null) {
		var myEndDate = new Date(reminder.date.getTime() + reminder.durationTime);
		if (reminder.allDayEvent) {
			myEndDate.setDate(myEndDate.getDate() - 1);
		}
		if (useDefaultDate) {
			var monthAsText = reminderfox.date.getMonthAsText(myEndDate.getMonth());
			endDateLabel.setAttribute("label", monthAsText + " " + myEndDate.getDate());
		}
		else {
			endDateLabel.setAttribute("label", reminderFox_getDateVariableString(reminder, myEndDate));
		}
	}


	setRemindUntilCompleteColumn(reminder, newRemindUntilCompletedLabel);

	if (reminder.notes != null) {
		//newNotesLabel.setAttribute("properties", "notes");
		newNotesLabel.setAttribute("src", reminderfox.consts.NOTES_IMAGE);
	}

	if (reminder.alarm != null) {
		if (reminder.snoozeTime != null && !isCompleted) {
			alarmLabel.setAttribute("src", reminderfox.consts.ALARM_SNOOZE_IMAGE);
		}
		else {
			alarmLabel.setAttribute("src", reminderfox.consts.ALARM_IMAGE);
		}
	}

	var newMailLabel = document.createElement("treecell");
	newRow.appendChild(newMailLabel);
	if (reminderfox.core.isMailEvent(reminder)) {
		newMailLabel.setAttribute("src", reminderfox.consts.MAIL_IMAGE);
	}

	var calDAVlabel = document.createElement("treecell");
	newRow.appendChild(calDAVlabel);

	if ((reminder.calDAVid != null) && (reminder.calDAVid != "")) {
//	reminderfox.util.Logger('calDAV', " reminder.calDAVid : " + reminder.calDAVid ,true);
		calDAVlabel.setAttribute("class", "calDAVbadge");
		calDAVlabel.setAttribute("label", reminder.calDAVid);

		var account = calDAVaccounts[reminder.calDAVid];
		if (account != null && account.Active != null) {
			if (account.Active == true) {
				calDAVlabel.setAttribute("src", reminderfox.consts.SHARE16);
			} else {
				calDAVlabel.setAttribute("src", reminderfox.consts.SHARE16w);
			}
		}
	}

	if (reminder.categories != null) {
		catLabel.setAttribute("label", reminder.categories);

		//gWXXX  if different colors to be used for 'categories'
		//	newDescLabel.removeAttribute("properties");
		//	newDescLabel.setAttribute( "style", " color: blue" );
		//	newDescLabel.setAttribute("properties", "important");
	}

	if (reminder.allDayEvent) {
		newTimeLabel.setAttribute("label", REMINDER_FOX_TIME_ALL_DAY_LABEL);
	}
	else {
		var time = reminderFox_getAddTimeString(reminder);
		if (time == null) {
			newTimeLabel.setAttribute("label", REMINDER_FOX_TIME_ALL_DAY_LABEL);
		}
		else {
			newTimeLabel.setAttribute("label", time);
		}
	}

	if (reminder.recurrence.type == reminderfox.consts.RECURRENCE_YEARLY) {
		newRepeatLabel.setAttribute("label", REMINDER_FOX_REPEAT_LABEL_YEARLY);
	}
	else
		if (reminder.recurrence.type == reminderfox.consts.RECURRENCE_YEARLY_DAY) {
			newRepeatLabel.setAttribute("label", REMINDER_FOX_REPEAT_LABEL_YEARLY_DAY);
		}
		else
			if (reminder.recurrence.type == reminderfox.consts.RECURRENCE_MONTHLY_DATE) {
				newRepeatLabel.setAttribute("label", REMINDER_FOX_REPEAT_LABEL_MONTHLY);
			}
			else
				if (reminder.recurrence.type == reminderfox.consts.RECURRENCE_MONTHLY_DAY) {
					newRepeatLabel.setAttribute("label", REMINDER_FOX_REPEAT_LABEL_MONTHLY_DAY);
				}
				else
					if (reminder.recurrence.type == reminderfox.consts.RECURRENCE_WEEKLY) {
						newRepeatLabel.setAttribute("label", REMINDER_FOX_REPEAT_LABEL_WEEKLY);
					}
					else
						if (reminder.recurrence.type == reminderfox.consts.RECURRENCE_DAILY) {
							newRepeatLabel.setAttribute("label", REMINDER_FOX_REPEAT_LABEL_DAILY);
						}
						else {
							newRepeatLabel.setAttribute("label", REMINDER_FOX_REPEAT_LABEL_NONE);
						}

	treeChildren.appendChild(newItem);
}


function getCurrentTodoList(){
	var todosArr = reminderfox.core.getReminderTodos();

	var tab = reminderfox.tabInfo.tabName;
	var tabID = reminderfox.tabInfo.tabID;
	var tabIndex = reminderfox.tabInfo.tabIndex;

	var index = tabID.indexOf(':');
	if (tabIndex <= 1 || index == -1) {
		name = reminderfox.consts.DEFAULT_TODOS_CATEGORY;
	}
	else {
		name = tabID.substring(index + 1, tabID.length);
	}
	var todos = todosArr[name];
	if (todos == null) {
		todos = new Array();
		todosArr[name] = todos;
	}
	return todos;
}


function getCurrentReminderList(){
	if (reminderfox_isSubscribedCalendarTabSelected()) {
		var subscribedCalArr = getSubscribedCalendars();

		var tab = reminderfox.tabInfo.tabName;
		var tabID = reminderfox.tabInfo.tabID;
		var tabIndex = reminderfox.tabInfo.tabIndex;

		var subscribedCal = subscribedCalArr[tab];
		if (subscribedCal == null) { // || subscribedCal.length == 0 ) {
			// download this subscription...
			subscribedCal = new Array();
			subscribedCalArr[tab] = subscribedCal;
			// start downloading in background
			//setTimeout(reminderFox_downloadSubscribedCalendar, 1, tab, subscribedCal);
			setTimeout(function() {reminderfox.userIO.getSubscription(tab, subscribedCal)},1);
		}
		reminderfox_getNumDaysModel(subscribedCal)
		return subscribedCal;
	}
	else {
		var reminders = reminderfox.core.getReminderEvents();
		return reminders;
	}
}

/**
 * Generate the 'numDaysEvents' array for a 'reminders' array
 */
function reminderfox_getNumDaysModel(reminders) {
	var namType = 'numDaysEvents'
	reminderfox.core[namType] = [];

	for (var n= 0; n < reminders.length; n++) {
		reminderfox.core.numDaysModelAdd (reminders[n], namType)
	}
	var msgLog = "getNumDaysModel  in addRemindersDialog:  reminders#: " + reminders.length;
//	reminderfox.util.Logger('ALERT', msgLog);			//§§§performance  checking
}


function getSubscribedCalendars(){
	if (reminderFox_subscribedCalendars == null) {
		reminderFox_subscribedCalendars = {};
	}
	return reminderFox_subscribedCalendars;
}



function reminderFox_downloadSubscribedCalendar(subsName, subscribedCal){
	// sync 'em up
	// var statusTxt = document.getElementById("reminderFox-network-status");


	var subscriptions = reminderfox.core.getSubscriptions();
	var url = subscriptions[subsName];
	if (url != null && url.length > 0) {
		reminderfox.core.statusSet(reminderfox.string("rf.options.customlist.subscribe.retrieve.title")
			+ " " + url);
		var webcalIndex = url.indexOf("webcal://"); // handle webcal address
		if (webcalIndex != -1) {
			url = "http://" + url.substring("webcal://".length);
		}
		reminderfox.network.download.reminderFox_download_Startup_headless_URL(reminderfox.consts.UI_MODE_HEADLESS_SHOW_ERRORS, reminderFox_downloadSubscribedCalendarCallback, url, subscribedCal, null);
	}

}


function reminderFox_downloadSubscribedCalendarCallback(statustxtString, actionID, downloadedReminders){

	if (actionID == 1) { // completed successfully (remote and local are equal, or were uploaded)
		reminderfox.core.statusSet("");
	}
	else
		if (actionID == 2) { // reminders were downloaded,  need to refresh reminders
			var subscribedCalArr = getSubscribedCalendars();

			var tabName = reminderfox.tabInfo.tabName;
			var tabID = reminderfox.tabInfo.tabID;


			var index = tabID.indexOf(':');
			name = tabID.substring(index + 1, tabID.length);

			var subscribedCal = subscribedCalArr[name];
			if (subscribedCal == null) {
				subscribedCal = new Array();
				subscribedCalArr[name] = subscribedCal;
			}
			subscribedCal = downloadedReminders;

			reminderfox.calendar.ui.selectDay();

			selectCalendarSync = false;
			// remove all of the calendar items and re-add them
			removeAllListItems(true, false);
			calendarReminderArray = null; // null out in case reminder columns are sorted
			fillList(true, false);
			selectCalendarSync = true;
		}
		else {
			reminderfox.core.statusSet(statustxtString);
		}

}



function createUIListItemTodo(todo, sort, todaysDate, addToArray){
//	if (document.documentElement.attributes.layout.value == 0) return;    // Calendar only mode
	if (reminderfox.calendar.layout.status < 1) return; // call from menu icon or Calndr only

	var tree;
	var treeSelection
	var boxobject;
	var item;
	if (reminderfox.view.ViewThis(todo) == 0) {
		return
	};

	//textSearch
	if (reminderfox.search.isTextSearch()) {
		var rmSearchText = reminderfox.search.textSearchString.toLowerCase();
		if (!eventMatchesFilterText(todo, rmSearchText, reminderfox.search.textSearchType)) {
			return;
		}
	}

	// if this todo is completed and the user wants to hide completed items,
	// don't add it to the list
	if (HIDE_COMPLETED_ITEMS &&
	todo.completedDate != null) {
		return;
	}

	var treeChildren = document.getElementById("todo_treechildren");
	var newItem = document.createElement("treeitem");
	var newRow = document.createElement("treerow");
	newRow.setAttribute(REMINDER_FOX_ID_REF, todo.id);
	var newDateLabel = document.createElement("treecell");
	var newDescLabel = document.createElement("treecell");
	newDescLabel.setAttribute("align", "end");

	newItem.appendChild(newRow);
	newRow.appendChild(newDateLabel);
	newRow.appendChild(newDescLabel);
	var isImportant = false;

	if (todo.date != null) {
		var monthAsText = reminderfox.date.getMonthAsText(todo.date.getMonth());
		if (useDefaultDate) {
			newDateLabel.setAttribute("label", monthAsText + " " + todo.date.getDate());
		}
		else {
			newDateLabel.setAttribute("label", reminderFox_getDateVariableString(todo, todo.date));
		}
		newRow.setAttribute(REMINDER_FOX_DATE_REF, todo.date.getTime());

		if (addToArray) {
			if (calendarTodoArray == null) {
				//createCalendarTodoArray();
				calendarTodoArray = new Array(12);
			}

			todo = reminderfox.core.processReminderDescription(todo, todaysDate.getFullYear(), false);

			var monthArray = calendarTodoArray[todo.date.getMonth()];
			if (monthArray == null) {
				monthArray = new Array(31);
				calendarTodoArray[todo.date.getMonth()] = monthArray;
			}

			var monthDay = todo.date.getDate();
			var dayReminderArray = monthArray[monthDay - 1];
			if (dayReminderArray == null) {
				dayReminderArray = new Array();
				monthArray[monthDay - 1] = dayReminderArray;
			}
			length = dayReminderArray.length;

			var ignoreReminder = false;
			if (HIDE_COMPLETED_ITEMS &&
			todo.completedDate != null) {
				ignoreReminder = true;
			}

			if (!ignoreReminder) {
				dayReminderArray[length] = todo;
			}
		}
	}

	todo = reminderfox.core.processReminderDescription(todo, todaysDate.getFullYear(), true);
	newDescLabel.setAttribute("label", todo.summary);

	var newTimeLabel = document.createElement("treecell");
	newRow.appendChild(newTimeLabel);
	if (todo.date != null) {
		if (todo.allDayEvent) {
			newTimeLabel.setAttribute("label", REMINDER_FOX_TIME_ALL_DAY_LABEL);
		}
		else {
			var time = reminderFox_getAddTimeString(todo);
			if (time == null) {
				newTimeLabel.setAttribute("label", REMINDER_FOX_TIME_ALL_DAY_LABEL);
			}
			else {
				newTimeLabel.setAttribute("label", time);
			}
		}
	}

	var newCompletedDateLabel = document.createElement("treecell");
	newRow.appendChild(newCompletedDateLabel);


	var newCompletedLabel = document.createElement("treecell");
	newRow.appendChild(newCompletedLabel);

	var newTodoShowInTooltip = document.createElement("treecell");
	newRow.appendChild(newTodoShowInTooltip);

	// check for any options that are specified, and mark them in the columns
	if (todo.priority == reminderfox.consts.PRIORITY_IMPORTANT) {
		newDescLabel.setAttribute("properties", "important");
		isImportant = true;
	}

	if (todo.completedDate != null) {
		newCompletedLabel.setAttribute("src", reminderfox.consts.COMPLETED_TODO_IMAGE);
		if (isImportant) {
			newDescLabel.setAttribute("properties", "imporantCompleteText");
		}
		else {
			newDescLabel.setAttribute("properties", "completeText");
		}

		if (useDefaultDate) {
			var monthAsText = reminderfox.date.getMonthAsText(todo.completedDate.getMonth());
			newCompletedDateLabel.setAttribute("label", monthAsText + " " + todo.completedDate.getDate());
		}
		else {
			newCompletedDateLabel.setAttribute("label", reminderFox_getDateVariableString(todo, todo.completedDate));
		}
	}

	if (todo.showInTooltip) {
		newTodoShowInTooltip.setAttribute("src", reminderfox.consts.SHOW_IN_TOOLTIP_IMAGE);
	}

	var newNotesLabel = document.createElement("treecell");
	newRow.appendChild(newNotesLabel);
	if (todo.notes != null) {
		newNotesLabel.setAttribute("src", reminderfox.consts.NOTES_IMAGE);
		//newNotesLabel.setAttribute("properties", "align='center'");
		// 	newNotesLabel.setAttribute("align", "end");
		//newNotesLabel.setAttribute("properties", "notes");
	}

	var alarmLabel = document.createElement("treecell");
	newRow.appendChild(alarmLabel);

	if (todo.alarm != null) {
		if (todo.snoozeTime != null && todo.completedDate == null) {
			alarmLabel.setAttribute("src", reminderfox.consts.ALARM_SNOOZE_IMAGE);
		}
		else {
			alarmLabel.setAttribute("src", reminderfox.consts.ALARM_IMAGE);
		}
	}


	var categoriesLabel = document.createElement("treecell");
	newRow.appendChild(categoriesLabel);
	if (todo.categories != null) {
		categoriesLabel.setAttribute("label", todo.categories);
	}

	var endDateLabel = document.createElement("treecell");
	newRow.appendChild(endDateLabel);

	if (todo.date != null && todo.endDate != null) {
		var myEndDate = new Date(todo.date.getTime() + todo.durationTime);
		if (todo.allDayEvent) {
			myEndDate.setDate(myEndDate.getDate() - 1);
		}
		if (useDefaultDate) {
			var monthAsText = reminderfox.date.getMonthAsText(myEndDate.getMonth());
			endDateLabel.setAttribute("label", monthAsText + " " + myEndDate.getDate());
		}
		else {
			endDateLabel.setAttribute("label", reminderFox_getDateVariableString(todo, myEndDate));
		}
	}

	var newMailLabel = document.createElement("treecell");
	newRow.appendChild(newMailLabel);
	if (reminderfox.core.isMailEvent(todo)) {
		newMailLabel.setAttribute("src", reminderfox.consts.MAIL_IMAGE);
	}

	var calDAVlabel = document.createElement("treecell");
	newRow.appendChild(calDAVlabel);

//	reminderfox.util.Logger('calDAV', " todo.calDAVid #1: " + todo.summary + "  " +  todo.calDAVid ,true);
	if ((todo.calDAVid != null) && (todo.calDAVid != "")) {
		calDAVlabel.setAttribute("class", "calDAVbadge");
		calDAVlabel.setAttribute("label", todo.calDAVid);

		var account = calDAVaccounts[todo.calDAVid];
		if (account != null && account.Active != null) {
			if (account.Active == true) {
				calDAVlabel.setAttribute("src", reminderfox.consts.SHARE16);
			} else {
				calDAVlabel.setAttribute("src", reminderfox.consts.SHARE16w);
			}
		}
	}


	var treeitems = treeChildren.childNodes;
	if (!sort || treeitems.length == 0) {
		treeChildren.appendChild(newItem);
	}
	// if current todo is not important, add after important items
	else
		if (!isImportant) {
			var added = false;
			for (var i = 0; i < treeitems.length && !added; i++) {
				item = treeitems[i];
				var row = item.childNodes[0];
				var todoRefId = row.getAttribute(REMINDER_FOX_ID_REF);
				var todoAtIndex = reminderfox.core.getTodosById(todoRefId, getCurrentTodoList());

				var descCell = row.childNodes[0];
				var descLabel = descCell.getAttribute("label");
				if (!todoAtIndex.priority == reminderfox.consts.PRIORITY_IMPORTANT) {
					if (todo.showInTooltip) {
						treeChildren.insertBefore(newItem, item);
						added = true;
						// highlight the newly added reminder in the list
						tree = document.getElementById("todoTree");
						treeSelection = tree.view.selection;
						try {
							treeSelection.select(i);
						}
						catch (e) {
							reminderfox.core.logMessageLevel("  Error in selectReminderById1: " +
							e.message, reminderfox.consts.LOG_LEVEL_INFO); //TODO
						}

						boxobject = tree.boxObject;
						boxobject.ensureRowIsVisible(i);
					}
					else {
						if (!todoAtIndex.showInTooltip) {
							treeChildren.insertBefore(newItem, item);
							added = true;
							// highlight the newly added reminder in the list
							tree = document.getElementById("todoTree");
							treeSelection = tree.view.selection;
							try {
								treeSelection.select(i);
							}
							catch (e) {
								reminderfox.core.logMessageLevel("  Error in selectReminderById1: " +
								e.message, reminderfox.consts.LOG_LEVEL_INFO); //TODO
							}

							boxobject = tree.boxObject;
							boxobject.ensureRowIsVisible(i);
						}
					}

				}
			}

			if (!added) {
				treeChildren.appendChild(newItem);
				// highlight the newly added reminder in the list
				tree = document.getElementById("todoTree");
				treeSelection = tree.view.selection;
				treeSelection.select(treeitems.length - 1);

				boxobject = tree.boxObject;
				boxobject.ensureRowIsVisible(treeitems.length - 1);
			}
		}
		// new Todo is important - add to top of list
		else {
			item = treeitems[0];
			treeChildren.insertBefore(newItem, item);
			added = true;
			// highlight the newly added reminder in the list
			tree = document.getElementById("todoTree");
			treeSelection = tree.view.selection;
			treeSelection.select(0);

			boxobject = tree.boxObject;
			boxobject.ensureRowIsVisible(0);
		}


}


function createUIListItemTodoAtIndex(todo, index){
//	if (document.documentElement.attributes.layout.value == 0) return;    // Calendar only mode
	if (reminderfox.calendar.layout.status < 1) return; // call from menu icon or Calndr only

	var tree;
	var treeSelection
	var boxobject;
	var item;

	var treeChildren = document.getElementById("todo_treechildren");
	var newItem = document.createElement("treeitem");
	var newRow = document.createElement("treerow");
	newRow.setAttribute(REMINDER_FOX_ID_REF, todo.id);
	var newDateLabel = document.createElement("treecell");
	var newDescLabel = document.createElement("treecell");

	newItem.appendChild(newRow);
	newRow.appendChild(newDateLabel);
	newRow.appendChild(newDescLabel);
	var isImportant = false;

	if (todo.date != null) {
		var monthAsText = reminderfox.date.getMonthAsText(todo.date.getMonth());
		if (useDefaultDate) {
			newDateLabel.setAttribute("label", monthAsText + " " + todo.date.getDate());
		}
		else {
			newDateLabel.setAttribute("label", reminderFox_getDateVariableString(todo, todo.date));
		}
		newRow.setAttribute(REMINDER_FOX_DATE_REF, todo.date.getTime());
	}
	todo = reminderfox.core.processReminderDescription(todo, new Date().getFullYear(), true);
	newDescLabel.setAttribute("label", todo.summary);
	var newTimeLabel = document.createElement("treecell");
	newRow.appendChild(newTimeLabel);
	if (todo.date != null) {
		if (todo.allDayEvent) {
			newTimeLabel.setAttribute("label", REMINDER_FOX_TIME_ALL_DAY_LABEL);
		}
		else {
			var time = reminderFox_getAddTimeString(todo);
			if (time == null) {
				newTimeLabel.setAttribute("label", REMINDER_FOX_TIME_ALL_DAY_LABEL);
			}
			else {
				newTimeLabel.setAttribute("label", time);
			}
		}
	}

	var newCompletedDateLabel = document.createElement("treecell");
	newRow.appendChild(newCompletedDateLabel);


	var newCompletedLabel = document.createElement("treecell");
	newRow.appendChild(newCompletedLabel);

	var newTodoShowInTooltip = document.createElement("treecell");
	newRow.appendChild(newTodoShowInTooltip);

	// check for any options that are specified, and mark them in the columns
	if (todo.priority == reminderfox.consts.PRIORITY_IMPORTANT) {
		newDescLabel.setAttribute("properties", "important");
		isImportant = true;
	}

	if (todo.completedDate != null) {
		newCompletedLabel.setAttribute("src", reminderfox.consts.COMPLETED_TODO_IMAGE);
		if (isImportant) {
			newDescLabel.setAttribute("properties", "imporantCompleteText");
		}
		else {
			newDescLabel.setAttribute("properties", "completeText");
		}

		if (useDefaultDate) {
			var monthAsText = reminderfox.date.getMonthAsText(todo.completedDate.getMonth());
			newCompletedDateLabel.setAttribute("label", monthAsText + " " + todo.completedDate.getDate());
		}
		else {
			newCompletedDateLabel.setAttribute("label", reminderFox_getDateVariableString(todo, todo.completedDate));
		}
	}

	if (todo.showInTooltip) {
		newTodoShowInTooltip.setAttribute("src", reminderfox.consts.SHOW_IN_TOOLTIP_IMAGE);
	}

	var newNotesLabel = document.createElement("treecell");
	newRow.appendChild(newNotesLabel);
	if (todo.notes != null) {
		newNotesLabel.setAttribute("src", reminderfox.consts.NOTES_IMAGE);
		//newNotesLabel.setAttribute("properties", "align='center'");
		newNotesLabel.setAttribute("align", "end");
		//newNotesLabel.setAttribute("properties", "notes");
	}

	var alarmLabel = document.createElement("treecell");
	newRow.appendChild(alarmLabel);

	if (todo.alarm != null) {
		if (todo.snoozeTime != null && todo.completedDate == null) {
			alarmLabel.setAttribute("src", reminderfox.consts.ALARM_SNOOZE_IMAGE);
		}
		else {
			alarmLabel.setAttribute("src", reminderfox.consts.ALARM_IMAGE);
		}
	}

	var categoriesLabel = document.createElement("treecell");
	newRow.appendChild(categoriesLabel);
	if (todo.categories != null) {
		categoriesLabel.setAttribute("label", todo.categories);
	}

	var endDateLabel = document.createElement("treecell");
	newRow.appendChild(endDateLabel);
	if (todo.date != null && todo.endDate != null) {
		var myEndDate = new Date(todo.date.getTime() + todo.durationTime);
		if (todo.allDayEvent) {
			myEndDate.setDate(myEndDate.getDate() - 1);
		}
		if (useDefaultDate) {
			var monthAsText = reminderfox.date.getMonthAsText(myEndDate.getMonth());
			endDateLabel.setAttribute("label", monthAsText + " " + myEndDate.getDate());
		}
		else {
			endDateLabel.setAttribute("label", reminderFox_getDateVariableString(todo, myEndDate));
		}
	}

	var newMailLabel = document.createElement("treecell");
	newRow.appendChild(newMailLabel);
	if (reminderfox.core.isMailEvent(todo)) {
		newMailLabel.setAttribute("src", reminderfox.consts.MAIL_IMAGE);
	}


	var calDAVlabel = document.createElement("treecell");
	newRow.appendChild(calDAVlabel);

//	reminderfox.util.Logger('calDAV', " todo.calDAVid #2: " + todo.summary + "  " + todo.calDAVid ,true);
	if ((todo.calDAVid != null) && (todo.calDAVid != "")) {
		calDAVlabel.setAttribute("class", "calDAVbadge");
		calDAVlabel.setAttribute("label", todo.calDAVid);

		var account = calDAVaccounts[todo.calDAVid];
		if (account != null && account.Active != null) {
			if (account.Active == true) {
				calDAVlabel.setAttribute("src", reminderfox.consts.SHARE16);
			} else {
				calDAVlabel.setAttribute("src", reminderfox.consts.SHARE16w);
			}
		}
	}


	var treeitems = treeChildren.childNodes;
	// insert at end if last item
	if (index >= treeitems.length) {
		treeChildren.appendChild(newItem);
		// highlight the newly added reminder in the list
		tree = document.getElementById("todoTree");
		treeSelection = tree.view.selection;
		treeSelection.select(treeitems.length - 1);

		boxobject = tree.boxObject;
		boxobject.ensureRowIsVisible(treeitems.length - 1);

	}
	else {
		// otherwise insert before current item at index
		item = treeitems[index];
		treeChildren.insertBefore(newItem, item);

		tree = document.getElementById("todoTree");
		treeSelection = tree.view.selection;
		treeSelection.select(index);

		boxobject = tree.boxObject;
		boxobject.ensureRowIsVisible(index);
	}
}

function panelGetName () {
	var panelName = document.getElementById("tabPanelID")._selectedPanel.id
	var treeName = "todoTree"
	if (panelName == "reminderPanel") treeName = "reminderTree"
	return treeName;
}

function treeChildrenGetName () {
	var panelName = document.getElementById("tabPanelID")._selectedPanel.id
	var treeChild = "todo_treechildren"
	if (panelName == "reminderPanel") treeChild = "treechildren"
	return treeChild;
}


/**
 * select (highlight) today's reminder or the next upcoming reminder
 */
function highlightClosestUpcomingReminder(currentDate, info, lastReminder){

	var currentDateNum =  reminderfox.date.convertDate(currentDate);

	var treeName = panelGetName();		// "reminderTree"  or  "todoTree"
	var treeChild = treeChildrenGetName()

	var treeChildren = document.getElementById(treeChild);
	var treeitems = treeChildren.childNodes;

	// get selected events into visable part of bug
	//    https://www.mozdev.org/bugs/show_bug.cgi?id=21565
	var tree = document.getElementById(treeName);

	// get hashmap - check for tabname
	var tabName = reminderfox.tabInfo.tabName;
	var sortInfo = listSortMap[tabName];
	var sortDirection = reminderfox.consts.SORT_DIRECTION_ASCENDING;
	if (sortInfo != null) {
		sortDirection = sortInfo.sortDirection
	}


	for (var i = 0; i < treeitems.length; i++) {
		var item = treeitems[i];
		var row = item.childNodes[0];

		var reminderDateTime = row.getAttribute(REMINDER_FOX_DATE_REF);
		var reminderDate = new Date(parseInt(reminderDateTime));
		var reminderDateNum =  reminderfox.date.getDateNum(reminderDate);

		if  (((reminderDateNum >= currentDateNum)&& (sortDirection==reminderfox.consts.SORT_DIRECTION_ASCENDING))
				|| ((reminderDateNum <= currentDateNum)&& (sortDirection ==reminderfox.consts.SORT_DIRECTION_DESCENDING))) {
			if (document.getElementById(treeName).view != null) {
				var treeSelection = document.getElementById(treeName).view.selection;
				if (treeSelection != null) {
					try {
						treeSelection.select(i);
					}
					catch (e) {
						// when changing calendar years, selecting an event and
						// syncing to the calendar seemed screwed up
					}
				}
			}

			// make sure that newly selected row is shown in scroll pane
			findHighLight(treeName, i, treeitems.length)
			break;
		}
	}
//	if (lastReminder != null) {
		highlightReminderOnSelectedDay(lastReminder)
//	}
}

/*
 * ensureRowIsVisible in a scroll pane / tree
 */
function findHighLight(whichTree, foundIndex, treeLength){
	if (foundIndex != -1) {
		var tree = document.getElementById(whichTree);
		var boxobject = tree.boxObject;

		// make sure it shows up at the top if possible
		var first = boxobject.getFirstVisibleRow();
		var last = boxobject.getLastVisibleRow();
		if (foundIndex < first || foundIndex > last) {
			boxobject.scrollToRow(treeLength - 9);
		}

		var previousReminderOffset = 3;
		if (foundIndex < previousReminderOffset) {
			boxobject.ensureRowIsVisible(foundIndex);
		}
		else {
			boxobject.ensureRowIsVisible(foundIndex - previousReminderOffset);
		}
	}
}

/**
 * select (highlight) reminder or the next upcoming reminder
 */
function highlightReminderOnSelectedDay(reminder){
	var idCheck = (reminder == null) ? "" : reminder.id
	var selectedTreeItemIndex = document.getElementById("reminderTree").currentIndex;

	if (selectedTreeItemIndex >= 0) {
		var treeChildren = document.getElementById("treechildren");

		if ((treeChildren != null) && (treeChildren.childNodes != null) && (treeChildren.childNodes.length >0)) {
			if (selectedTreeItemIndex >= treeChildren.childNodes.length) {
				selectedTreeItemIndex = treeChildren.childNodes.length - 1;
			}
			var selectedTreeItem = treeChildren.childNodes[selectedTreeItemIndex];
			var _reminderDateTime = selectedTreeItem.childNodes[0].getAttribute(REMINDER_FOX_DATE_REF);
			var _reminderDate = reminderfox.date.convertDate(new Date(+_reminderDateTime));

			var nextIndex = selectedTreeItemIndex;
			var nextTreeItem = ""
			var nextID =""
			var nextDateTime = 0
			var nextDate = 0

			do {
				nextTreeItem = treeChildren.childNodes[nextIndex];
				if (nextTreeItem == null) break
				nextID = nextTreeItem.childNodes[0].getAttribute(REMINDER_FOX_ID_REF);
				nextDateTime = (nextTreeItem.childNodes[0].getAttribute(REMINDER_FOX_DATE_REF));
				nextDate = reminderfox.date.convertDate(new Date(+nextTreeItem.childNodes[0].getAttribute(REMINDER_FOX_DATE_REF)));
				nextIndex++
			}
			while ((_reminderDate == nextDate) && (idCheck != nextID))

			var treeSelection = document.getElementById("reminderTree").view.selection;
			if (_reminderDate != nextDate) {

		var traceMsg = " highlightReminderOnSelectedDay  treeSelection : " + treeSelection
		+ "\n   " + document.getElementById("reminderTree").view + "  "  + document.getElementById("reminderTree").view.selection
		+ "\n  selectedTreeItemIndex: " + selectedTreeItemIndex; //§§errorTrace
	// reminderfox.util.Logger('Alert', traceMsg);
				treeSelection.select(selectedTreeItemIndex);
			} else {
				treeSelection.select(nextIndex -1);
			}
		}
	}
}



/**
 * select (highlight) today's reminder or the next upcoming reminder
 */
function highlightReminderForDate(currentMonth, currentDay){
	var highlighted = false;
	var treeChildren = document.getElementById("treechildren");
	var treeitems = treeChildren.childNodes;
	for (var i = 0; i < treeitems.length; i++) {
		var item = treeitems[i];
		var row = item.childNodes[0];

		var reminderDateTime = row.getAttribute(REMINDER_FOX_DATE_REF);
		var reminderDate = new Date(parseInt(reminderDateTime));

		if (reminderDate.getMonth() == currentMonth && reminderDate.getDate() == currentDay) {
			highlighted = true;
			if (document.getElementById("reminderTree").view != null) {
				var treeSelection = document.getElementById("reminderTree").view.selection
				if (treeSelection != null) {
					try {
						treeSelection.select(i);
					}
					catch (e) {
						reminderfox.core.logMessageLevel("  Error in highlightReminderForDate: " +
						e.message, reminderfox.consts.LOG_LEVEL_INFO); //TODO
					}
				}
			}

			// make sure that newly selected row is shown in scroll pane
			findHighLight("reminderTree", i, treeitems.length)
			break;
		}
	}
}


function highlightTodo(){
	var tree = document.getElementById("todoTree");

	if (tree.view == null)  return;
	var treeSelection = tree.view.selection;

	var row = (rmFx_selectedCurrentTree_ItemIndex != null) ? rmFx_selectedCurrentTree_ItemIndex : 0;
	treeSelection.select(row);

	try {
		var boxobject = tree.boxObject;
		boxobject.ensureRowIsVisible(0);
	}
	catch (ex) {
		}
}

/**
 * Remove an UI List item with a selected event/todo,
 * don't change the data models
 */
function removeUIListItemReminder(reminder, treeChildren){
	// don't with no Main List displayed

	if (reminderfox.util.layoutStatus() < 1)  return;

	if (treeChildren == null) {
		treeChildren = reminderfox_isReminderTabSelected()
			? "treechildren"
			: "todo_treechildren";
	}

	var topWindow = reminderfox.util.getWindow("window:reminderFoxEdit");
	topWindow.focus()

	treeChildren = topWindow.document.getElementById(treeChildren)
	var treeitems = treeChildren.childNodes;
	for (var i = treeitems.length - 1; i >= 0; i--) {
		var item = treeitems[i];
		var row = item.childNodes[0];
		var reminderRefId = row.getAttribute(REMINDER_FOX_ID_REF);
		if (reminderRefId == reminder.id) {
			treeChildren.removeChild(item);
			break;
		}
	}
}


/*
 *  Remove a 'todo' from the data models
 *  @param todo {object}
 *  @param messageIDtagging {boolean}  used with 'multiple' deleting messages to
 *           prevent not to open 'all' related messages and folders
 */
function removeTodoListItem(todo, messageIDtagging){
	var treeChildren = document.getElementById("todo_treechildren");
	var treeitems = treeChildren.childNodes;
	for (var i = 0; i < treeitems.length; i++) {
		var item = treeitems[i];
		var row = item.childNodes[0];
		var todoRefId = row.getAttribute(REMINDER_FOX_ID_REF);
		if (todoRefId == todo.id) {
			treeChildren.removeChild(item);

			// gW 2008-12-14
			// need to clear Mail label if a message is attached to this reminder
			if ((todo.messageID != null) && (messageIDtagging)) {
				if (window.arguments != null) {
					var clearMailLabelCallback = window.arguments[1].clearMailLabelCallback;
					if (clearMailLabelCallback != null) {
						clearMailLabelCallback(todo.messageID);
					}
				}
			}
			break;
		}
	}
}


// saves and closes the 'edit reminders' dialog
function reminderfox_RevertNewNchanged(){
	// there were changes.  Prompt user to revert/cancel
	// get a reference to the prompt service component.
	var promptService = Cc["@mozilla.org/embedcomp/prompt-service;1"]
		.getService(Ci.nsIPromptService);

	var flags = promptService.BUTTON_TITLE_IS_STRING * promptService.BUTTON_POS_0 +
		promptService.BUTTON_TITLE_IS_STRING * promptService.BUTTON_POS_1;
	var msg = reminderfox.string("rf.add.revert.description");

	var buttonPressed = promptService.confirmEx(window, reminderfox.string("rf.add.revert.title"),
		msg, flags, reminderfox.string("rf.add.revert.button.revert.title"),
		reminderfox.string("rf.button.cancel"), null, null, {});

	// revert pressed
	if (buttonPressed == 0) {
		reminderfox_revertActions();
	}
}


function removeAllListItems(removeReminders, removeTodos){
	if (removeReminders) {
		var reminderTree = document.getElementById("reminderTree");
		var treeChildren = document.getElementById("treechildren");
		reminderTree.removeChild(treeChildren);

		var newchildren = document.createElement("treechildren");
		newchildren.setAttribute("id", "treechildren");
		newchildren.addEventListener("dblclick", function(event) {if (event.button == 0) reminderOrTodoEdit();},false);
		newchildren.addEventListener("click", function(event) {reminderFox_toggleReminderColumns(event);},false);

		newchildren.setAttribute("tooltip", "reminderTree-tooltip");
		reminderTree.appendChild(newchildren);
	}

	if (removeTodos) {
		var todo_treechildren = document.getElementById("todo_treechildren");
		while (todo_treechildren.hasChildNodes()) {
			todo_treechildren.removeChild(todo_treechildren.firstChild);
		}
	}
}


/**
 * Saves modified/new events/todos and some settings ..
 *  ... and closes the 'Main Dialog' (showing List and Calendar)
 * sync with remote server if necessary
 */
function rmFx_mainDialogSaveAndClose(isCloseDemanded){
//----------------------------------------------------------------
	var currentDate = new Date();
	var day = currentDate.getDate();
	var windowEnumerator = reminderfox.core.getWindowEnumerator();
	var currentWindow;
	var daysChanged = false;

	// see if the day has changed since last process
	if (windowEnumerator.hasMoreElements()) {
		currentWindow = windowEnumerator.getNext();

		if (currentWindow.reminderfox.overlay.lastDay != day) {
			daysChanged = true;
		}
	}

	// write out column sort info
	var listSortStr = "";
	for (var n in listSortMap) {
		var sortInfo = listSortMap[n];
		if (sortInfo != null) {
			if (listSortStr != "") {
				listSortStr = listSortStr + ",";
			}
			listSortStr = listSortStr + n + "," + sortInfo.sortColumn + "," + sortInfo.sortDirection;
			;
		}
	}
	reminderfox.core.setPreferenceValue(reminderfox.consts.SORT_COLUMNS_PREF, listSortStr);
	reminderfox.core.setPreferenceValue(reminderfox.consts.SHOW_FILTERS, reminderfox.search.showFilters);

	// if any events were modified or the day has changed, we want to update the tooltip and status text
	if (reminderfox.core.remindersModified || daysChanged) {

		reminderfox.core.writeOutRemindersAndTodos(false);  // (isExport)			// within try  .. does update all browsers  and  networking
		reminderfox.overlay.processRecentReminders(true);

		try {
			// update all of the browsers
			windowEnumerator = reminderfox.core.getWindowEnumerator();
			while (windowEnumerator.hasMoreElements()) {
				var currentWindow = windowEnumerator.getNext();
				currentWindow.reminderfox.core.reminderFoxEvents = reminderfox.core.reminderFoxEvents;
				currentWindow.reminderfox.core.reminderFoxTodosArray = reminderfox.core.reminderFoxTodosArray;

				currentWindow.reminderfox.overlay.updateRemindersInWindow();
				currentWindow.reminderfox.core.clearRemindersAndTodos();
			}
			// this callback syncs the written changes to remote and does it in the background on the calling
			// window (otherwise we have to keep this window open until the network function callback returns)
			var syncCallback = null;
			if (window.arguments != null) {
				syncCallback = window.arguments[1].callback;
			}
			if (syncCallback != null) {
				var networkSync = reminderfox.core.getPreferenceValue(reminderfox.consts.NETWORK.SYNCHRONIZE, reminderfox.consts.NETWORK.SYNCHRONIZE_DEFAULT)

				if (networkSync) {
					syncCallback();
				}
			}
		}
		catch (e) {
		}

	}
	else {
		reminderfox.core.ensureRemindersSynchronized();	  // sync with closing the Main Dialog  //TODO Networking

		// call reminderFox_intializeReminderFox to check in case the timers have stopped; this will restart
		// it and process any reminders if necessary (such as alarms, etc)
		//gW   excecution of processRemindersCallback was already disabled in reminderFox.js  #85
		/*---------
		// var processRemindersCallback = null;
		// if (window.arguments != null) {
		// 	processRemindersCallback = window.arguments[1].processRemindersCallback;
		// }
		// if (processRemindersCallback != null) {
		// 	processRemindersCallback(true);
		}
		-------------*/
	}

	// clear reminders from memory
	if (isCloseDemanded) reminderfox.core.clearRemindersAndTodos();

	reminderfoxModifyButtons (false);
}

/**
 * Disable/Enable [Revert] [Save] buttons on MainDialog
 * Subscription pages are always disabled
 */
function reminderfoxModifyButtons (setStatus) {
	if (setStatus == null) setStatus = reminderfox.core.remindersModified
	reminderfox.core.remindersModified = setStatus;

	var subscriptionTab = reminderfox_isSubscribedCalendarTabSelected()

	var buttonMode = setStatus && !subscriptionTab
		var button = document.getElementById("reminderfox-calendar-events-revert");
		if (button) button.setAttribute("disabled",!buttonMode);
		if (button) button.setAttribute("modified",buttonMode);

		var button = document.getElementById("reminderfox-calendar-events-save");
		if (button) button.setAttribute("disabled",!buttonMode);
		if (button) button.setAttribute("modified",buttonMode);
};


function modifiedReminders(){		//gWCalndr  -- go for unified [Revert] button
	reminderfoxModifyButtons (true);
}


function getInstanceDateOfLastSelected(currentReminder){

	var reminderInstanceDate = currentReminder.date;

	try {
		var reminderID = currentReminder.id;
		var treeChildren = document.getElementById("treechildren");
		var selectedIDsHash = {};

		var start = new Object();
		var end = new Object();
		var numRanges = document.getElementById("reminderTree").view.selection.getRangeCount();
		for (var t = numRanges - 1; t >= 0; t--) {
			document.getElementById("reminderTree").view.selection.getRangeAt(t, start, end);
			for (var v = end.value; v >= start.value; v--) {
				var selectedTreeItem = treeChildren.childNodes[v];
				var reminderRefId = selectedTreeItem.childNodes[0].getAttribute(REMINDER_FOX_ID_REF);
				if (reminderRefId == currentReminder.id) {
					var year = reminderfox.datePicker.gSelectedDate.getFullYear();
					if (year == null) {
						year = new Date().getFullYear();
					}

					var reminderDateTime = selectedTreeItem.childNodes[0].getAttribute(REMINDER_FOX_DATE_REF);
					reminderInstanceDate = new Date(parseInt(reminderDateTime));

					return reminderInstanceDate;
				}
			}
		}
	} catch (ex) {return reminderInstanceDate;}

	return null;
}


/**
 *    Removes Reminders from List
 *    @param currentReminder
 *    @param promptForRecurringDelete
 *    @param deleteDate
 *    @param dateLabel
 *    @param messageIDtagging  used with 'multiple' deleting messages to
 *           prevent not to open 'all' releated messages and folders
 */
function removeReminder(currentReminder, promptForRecurringDelete, deleteDate, dateLabel, messageIDtagging){

	if (promptForRecurringDelete != null && promptForRecurringDelete == true) {
		var messageID = currentReminder.messageID;

		if (currentReminder.recurrence.type == reminderfox.consts.RECURRENCE_YEARLY ||
				currentReminder.recurrence.type == reminderfox.consts.RECURRENCE_MONTHLY_DATE ||
				currentReminder.recurrence.type == reminderfox.consts.RECURRENCE_MONTHLY_DAY ||
				currentReminder.recurrence.type == reminderfox.consts.RECURRENCE_WEEKLY ||
				currentReminder.recurrence.type == reminderfox.consts.RECURRENCE_DAILY) {

			// prompt user...
			var deleteRecurrenceOnly = true;

			if (deleteDate == null) {
				deleteDate = getInstanceDateOfLastSelected(currentReminder);
			}
			if (dateLabel == null) {
				dateLabel = reminderFox_getDateVariableString(currentReminder, deleteDate);
			}

			var promptService = Cc["@mozilla.org/embedcomp/prompt-service;1"].getService(Ci.nsIPromptService);
			var deleteDescription = reminderfox.string("rf.add.deleteReminderInstance.description") + "\n";
			deleteDescription += dateLabel + ": " + currentReminder.summary + "\n";
			var flags = promptService.BUTTON_TITLE_IS_STRING * promptService.BUTTON_POS_0
				+ promptService.BUTTON_TITLE_IS_STRING * promptService.BUTTON_POS_1
				+ promptService.BUTTON_TITLE_IS_STRING * promptService.BUTTON_POS_2
				+ promptService.BUTTON_POS_0_DEFAULT;
			var msg = deleteDescription;
			var buttonPressed = promptService.confirmEx(window,
				reminderfox.string("rf.add.deleteReminder.title"), msg, flags,
				reminderfox.string("rf.add.deleteReminderInstance.currentInstance.button"),
				reminderfox.string("rf.button.cancel"),
				reminderfox.string("rf.add.deleteReminderInstance.all.button"), null, {});

			// cancel pressed
			if (buttonPressed == 1) {
				return false;
			}

			// current instances pressed
			if (buttonPressed == 0) {
				if (deleteDate != null) {
					deleteDate.setDate(deleteDate.getDate() + 1);
					var instanceReminder = reminderfox.core.getFirstReminderOccurrenceAfterStartDate(currentReminder, deleteDate);
					var newReminderDate = instanceReminder.date;

					var newReminder = reminderfox.core.cloneReminderFoxEvent(currentReminder);
					newReminder.date = newReminderDate;
					newReminder.endDate = new Date(parseInt(newReminder.date.getTime()) + newReminder.durationTime);
					// if the date has changed, treat as a new reminder.  This is because
					// We want to re-add in the proper sorted order into the list of reminders

					removeUIListItemReminder(currentReminder);

					// remove from models  RList and numDays   //gWCAL
					reminderfox.core.removeReminderFromDataModels(currentReminder)

					// add reminder in sorted order...
					var reminders = reminderfox.core.getReminderEvents();
					if (newReminder.remindUntilCompleted != reminderfox.consts.REMIND_UNTIL_COMPLETE_NONE) {
						newReminder.remindUntilCompleted = reminderfox.consts.REMIND_UNTIL_COMPLETE_TO_BE_MARKED;  // =1
					}
					var sortedIndex = reminderfox.core.getSortedIndexOfNewReminder(reminders, newReminder, false);
					reminderfox.core.insertIntoArray(reminders, newReminder, sortedIndex);
					createUIListItemReminder(newReminder);
					return true;
				}
			}
			else { // buttonPressed == 2
						// delete all instances pressed  - do nothing here; we'll delete as normal
			}
		}

		// need to clear Mail label (if remove was called from the user AND flagged)
		if ((messageID != null) && (messageIDtagging)) {
			if (window.arguments != null) {
				var clearMailLabelCallback = window.arguments[1].clearMailLabelCallback;
				if (clearMailLabelCallback != null) {
					clearMailLabelCallback(messageID);
				}
			}
		}
	}

	rmFx_CalDAV_ReminderDelete(currentReminder);

	// remove from UI list
	removeUIListItemReminder(currentReminder);
	// remove from model list
	reminderfox.core.removeReminderFromDataModels(currentReminder);
	return true;
};


/**
 * Remove a 'todo' from standard data model only,
 * used with move todo up/down and move to/from other list
 * and 'reminderOrTodoEdit()'
 */
function removeTodo(currentTodo, messageIDtagging){
	if (currentTodo != null) {
		// remove from model list
		var todos = getCurrentTodoList();
		for (var i = 0; i < todos.length; i++) {
			if (todos[i].id == currentTodo.id) {
				reminderfox.core.removeFromArray(todos, i);
				break;
			}
		}
		modifiedReminders();
	}
};


/**
 * Switch to next Tab -- used with key="Cntrl t"
 */
function rmFx_advanceTab(){
	var tabListmax = +document.getElementById("rmFx-tabList").children.length;

	//reminderfox.tabInfo.Get ();
	reminderfox.tabInfo.tabIndex++;
	if (reminderfox.tabInfo.tabIndex == tabListmax-2) {
		reminderfox.tabInfo.tabIndex = 0;
	}
	reminderfox.calendar.ui.tabListChange(reminderfox.tabInfo.tabIndex);
};


/**
 * activates Context menu on "Reminders" on MainList
 *  {for Todo/Lists see:  activateContextTodo(event)}
 */
function activateContextReminder(event){

	var tree = document.getElementById("reminderTree");
	var contextMenu = document.getElementById("treechildren-contextmenu");

	// modify context menu depending on Important reminder status
	var selectedTreeItemIndex = document.getElementById("reminderTree").currentIndex;
	var currentReminder = getReminderForSelectedItem();
	if (selectedTreeItemIndex == -1 || currentReminder == null) {
		for (var i = 0; i < contextMenu.childNodes.length; i++) {
			contextMenu.childNodes[i].setAttribute("disabled", true);
		}
		return;
	}
	else {
		// enable all child menu items
		for (var i = 0; i < contextMenu.childNodes.length; i++) {
			contextMenu.childNodes[i].removeAttribute("disabled");
		}
	}
	var multipleRemindersSelected = false;
	var selectedReminders = getAllSelectedReminders();
	if (selectedReminders.length > 1) {
		multipleRemindersSelected = true;
	}

	var treechildrenContextmenuEdit = document.getElementById("treechildren-contextmenu-edit");
	if (multipleRemindersSelected) {
		// if multiple reminders selected, disable Edit
		treechildrenContextmenuEdit.setAttribute("disabled", true);
	}
	else {
		treechildrenContextmenuEdit.removeAttribute("disabled");
	}

	// show current lists...
	var moveToList = document.getElementById("treechildren-contextmenu-moveReminderToList-popup");
	while (moveToList.hasChildNodes()) {
		moveToList.removeChild(moveToList.firstChild);
	}
	var tabList = document.getElementById("rmFx-tabList");
	// reduce by 2 because of 'Add New User List' and menu separator
	var tabListmax = document.getElementById("rmFx-tabList").children.length -2;

	var subscriptions = reminderfox.core.getSubscriptions();
	var i = 1;
	if (reminderfox_isSubscribedCalendarTabSelected()) {
		i = 0; // allow reminder tab
	}
	for (; i < tabListmax; i++) { // i =1, because we want to skip reminders
		var tablistItem = tabList.childNodes[i];
		var tabLabel = tablistItem.getAttribute("value");
		if (subscriptions[tabLabel] == null) { // ignore subscribed calendars
			var menuItem = document.createElement("menuitem");
			menuItem.setAttribute("label", tabLabel);
//fx			menuItem.setAttribute("oncommand", "userMoveReminderToTodo(event.target)");
			menuItem.addEventListener("command", function (event) {userMoveReminderToTodo(event,this);},false);
			moveToList.appendChild(menuItem);
		}
	}

	var contextMenuImportant = document.getElementById("treechildren-contextmenu-important");
	if (currentReminder.priority != reminderfox.consts.PRIORITY_IMPORTANT) {
		contextMenuImportant.setAttribute("checked", "false");
	}
	else {
		contextMenuImportant.setAttribute("checked", "true");
	}

	var contextMenuRemindComplete = document.getElementById("treechildren-contextmenu-remindUntilComplete");
	if (currentReminder.remindUntilCompleted != reminderfox.consts.REMIND_UNTIL_COMPLETE_NONE) {
		contextMenuRemindComplete.setAttribute("checked", "true");
	}
	else {
		contextMenuRemindComplete.setAttribute("checked", "false");
	}

	var contextMenuComplete = document.getElementById("treechildren-contextmenu-markAsComplete");
	if (currentReminder.completedDate == null) {
		contextMenuComplete.setAttribute("checked", "false");
	}
	else {
		var treeChildren = document.getElementById("treechildren");
		var selectedTreeItem = treeChildren.childNodes[selectedTreeItemIndex];
		var reminderDateTime = selectedTreeItem.childNodes[0].getAttribute(REMINDER_FOX_DATE_REF);
		var reminderInstanceDate = new Date(parseInt(reminderDateTime));

		if (reminderfox.core.isCompletedForDate(currentReminder, reminderInstanceDate)) {
			contextMenuComplete.setAttribute("checked", "true");
		}
		else {
			contextMenuComplete.setAttribute("checked", "false");
		}
	}

	// If reminder is associated with an email, show the View Mail context menu item.  Otherwise, do not.
	var showMail = document.getElementById("treechildren-contextmenu-showMail");
	if (showMail != null) {
		if (!reminderfox.core.isMailEvent(currentReminder)) {
			showMail.setAttribute("hidden", "true");
		}
		else {
			showMail.setAttribute("hidden", "false");
		}
	}

	if (reminderfox_isSubscribedCalendarTabSelected()) { // disable some menu items for subscribed (read-only) calendars
		document.getElementById("treechildren-contextmenu-important").setAttribute("disabled", true);
		document.getElementById("treechildren-contextmenu-markAsComplete").setAttribute("disabled", true);
		document.getElementById("treechildren-contextmenu-remindUntilComplete").setAttribute("disabled", true);
		document.getElementById("treechildren-contextmenu-delete").setAttribute("disabled", true);
		document.getElementById("treechildren-contextmenu-copyReminder").setAttribute("disabled", true);
	}
	else {
		document.getElementById("treechildren-contextmenu-important").removeAttribute("disabled");
		document.getElementById("treechildren-contextmenu-markAsComplete").removeAttribute("disabled");
		document.getElementById("treechildren-contextmenu-remindUntilComplete").removeAttribute("disabled");
		document.getElementById("treechildren-contextmenu-delete").removeAttribute("disabled");
		document.getElementById("treechildren-contextmenu-copyReminder").removeAttribute("disabled");
	}

	if (getAllSelectedReminders().length == 0) {
		document.getElementById("treechildren-contextmenu-sendReminder").setAttribute("disabled", "true");
	}
};


function reminderFox_onListCalDAV(xthis){
	// calDAV menu
	var calDAVaccounts = reminderfox.calDAV.getAccounts();

	if ((calDAVaccounts != null) && (Object.keys(calDAVaccounts).length !== 0 )){

		// remove all items from popup menu
		var calDAVlist = document.getElementById(xthis.id);  // 'exportXML-popup' or 'exportXML-todo-popup'

		while (calDAVlist.hasChildNodes()) {
			calDAVlist.removeChild(calDAVlist.firstChild);
		}
		for (var account in calDAVaccounts) {
			if (calDAVaccounts[account].Active == true) {

				var menuItem = document.createElement("menuitem");
				menuItem.setAttribute("class", "menuitem-iconic");

				menuItem.setAttribute("image", reminderfox.consts.SHAREW);
				menuItem.setAttribute("label", "[ " + account + " ] " + calDAVaccounts[account].Name);
				menuItem.setAttribute("value", account);
				menuItem.setAttribute("tooltiptext", reminderfox.string("rf.caldav.event2remote"));

				menuItem.addEventListener("command", function() {rmFx_CalDAV_UpdateReminderMultiple(this.value);},false);

				calDAVlist.appendChild(menuItem);
			}
		}
	}
};


function reminderFox_toggleReminderColumns(event){
	var row = {}, column = {}, part = {};
	var tree = document.getElementById("reminderTree");
	var boxobject = tree.boxObject;
	boxobject.getCellAt(event.clientX, event.clientY, row, column, part);

	var rowIndex = row.value;
	if (rowIndex != -1 && event.button != 2) { // don't handle event if right-clicking (only show context menu)
		var treeSelection = document.getElementById("reminderTree").view.selection;

		if (typeof column.value != "stri  ng") {
			if (column.value != null) {
				column.value = column.value.id;
			}
		}

		// cycler columns do not get selected automatically like other columns.  Must manually
		// call select
		if (column.value == "remindUntilCompletedColLabel") {
			treeSelection.select(rowIndex);
			toggleRemindUntilCompleted();
		}
		else
			if (column.value == "completeColLabel") {
				treeSelection.select(rowIndex);
				toggleMarkAsComplete();
			}
			else
				if (column.value == "mailColLabel") {
					treeSelection.select(rowIndex);
					reminderfox.mail.doShowMail();
				}
				else
					if (column.value == "notesColLabel" ||
					column.value == "alarmColLabel") {
						treeSelection.select(rowIndex);
					}
	}
}


function reminderFox_toggleTodoColumns(event){
	var row = {}, column = {}, part = {};
	var tree = document.getElementById("todoTree");
	var boxobject = tree.boxObject;
	boxobject.getCellAt(event.clientX, event.clientY, row, column, part);

	var rowIndex = row.value;
	if (rowIndex != -1 && event.button != 2) { // don't handle event if right-clicking (only show context menu)
		var treeSelection = document.getElementById("todoTree").view.selection;

		if (typeof column.value != "string") {
			column.value = column.value.id;
		}

		if (column.value == "todoShowInTooltip") {
			treeSelection.select(rowIndex);
			toggleShowInTooltipTodo();
		}
		else
			if (column.value == "todoCompleteColLabel") {
				treeSelection.select(rowIndex);
				toggleMarkAsCompleteTodo();
			}
			else
				if (column.value == "todoMailColLabel") {
					treeSelection.select(rowIndex);
					reminderfox.mail.doShowMailTodo();
				}
				else
					if (column.value == "todoNotesColLabel" ||
					column.value == "todoAlarmColLabel") {
						treeSelection.select(rowIndex);
					}
	}
}


function getLabelForColumn(columnId){
	var column = document.getElementById(columnId);
	return column.getAttribute("label");
}


function addTooltipWithLabel(tooltipItem, columnId, value, importantStatus, completedStatus, labelText){
	var hbox = document.createElement("hbox");
	var columnLabel;
	if (columnId == null) {
		columnLabel = labelText;
	}
	else {
		columnLabel = getLabelForColumn(columnId);
	}

	var title = document.createElement("description");
	title.setAttribute("value", columnLabel + ": ");
	title.setAttribute("style", "font-weight:bold");
	hbox.appendChild(title);

	var tooltipValue = document.createElement("description");
	tooltipValue.setAttribute("value", value);

	if (importantStatus && completedStatus) {
		tooltipValue.setAttribute("style", " text-decoration: line-through; color: red");
	}
	else
		if (importantStatus) {
			tooltipValue.setAttribute("style", "color: red");
		}
		else
			if (completedStatus) {
				tooltipValue.setAttribute("style", " text-decoration: line-through");
			}

	hbox.appendChild(tooltipValue);

	tooltipItem.appendChild(hbox);
}


function reminderTreeTooltip(event){
	var tree = document.getElementById("reminderTree");
	var boxobject = tree.boxObject; // cast to treeboxobject to use getRowAt
	var row = {}, column = {}, part = {};
	boxobject.getCellAt(event.clientX, event.clientY, row, column, part);

	if (column.value != null && typeof column.value != "string") {
		column.value = column.value.id;
	}

	var index = tree.boxObject.getRowAt(event.clientX, event.clientY);
	if (index == -1) {
		return false; // returning false causes tooltip to not show
	}
	var treeChildren = document.getElementById("treechildren");
	var selectedTreeItem = treeChildren.childNodes[index];
	var reminderRefId = selectedTreeItem.childNodes[0].getAttribute(REMINDER_FOX_ID_REF);

	var reminder = reminderfox.core.getRemindersById(reminderRefId, getCurrentReminderList());
	if (reminder == null) {
		return false; // returning false causes tooltip to not show
	}

	var tooltipItem = document.getElementById("reminderTree-tooltip-box");
	while (tooltipItem.hasChildNodes()) {
		tooltipItem.removeChild(tooltipItem.firstChild);
	}

	// if this is the alarm column, show the alarm value
	if (reminder.alarm != null && column.value == "alarmColLabel") {
		// if the alarm is currently snoozed, show the snooze value as well....
		if (reminder.snoozeTime != null) {
			var snoozeAlarmTime = reminder.snoozeTime;
			var index = snoozeAlarmTime.indexOf(';');
			if (index != -1) {
				snoozeAlarmTime = snoozeAlarmTime.substring(0, index);
			}
			var snoozedate = new Date(parseInt(snoozeAlarmTime));
			var dateString = reminderFox_getDateVariableString(reminder, snoozedate);
			var timeString = reminderfox.date.getTimeString(snoozedate);

			var snoozetitle = document.createElement("description");
			snoozetitle.setAttribute("value", reminderfox.string("rf.alarm.list.tooltip.snooze")
				+ " " + dateString + ", " + timeString);
			tooltipItem.appendChild(snoozetitle);
		}
		else {
			// otherwise show when the next alarm is scheduled for...
			var reminderDateTime = selectedTreeItem.childNodes[0].getAttribute(REMINDER_FOX_DATE_REF);
			var reminderInstanceDate = new Date(parseInt(reminderDateTime));

			var newDate = new Date(reminder.date.getFullYear(), reminder.date.getMonth(),
				reminder.date.getDate(), reminder.date.getHours(), reminder.date.getMinutes());
			if (reminder.allDayEvent) {
				newDate.setHours(0, 0);
			}

			var mins = reminderInstanceDate.getMinutes();
			var alarmMinutes = reminderfox.core.getAlarmInMinutes(reminder, newDate);
			if (alarmMinutes != null) {
				reminderInstanceDate.setMinutes(mins - alarmMinutes);

				var dateString = reminderFox_getDateVariableString(reminder, reminderInstanceDate);
				var timeString = reminderfox.date.getTimeString(reminderInstanceDate);

				var snoozetitle = document.createElement("description");
				snoozetitle.setAttribute("value", reminderfox.string("rf.alarm.tooltip.text")
					+ " " + dateString + ", " + timeString);
				tooltipItem.appendChild(snoozetitle);
			}
		}

		// if the alarm value has 'trigrel' add to the tooltip  (eg: "alarm: 15 minutes before event")
		if (reminder.alarm.charAt(reminder.alarm.length-1) != "Z")  {
			var title = document.createElement("description");
			title.setAttribute("value", getAlarmTooltipText(reminder.alarm));
			tooltipItem.appendChild(title);
		}
	}
	else {
		var row = selectedTreeItem.childNodes[0];
		var dateCell = row.childNodes[0];
		var dateCellLabel = dateCell.getAttribute("label");
		var descCell = row.childNodes[1];
		var descCellLabel = descCell.getAttribute("label");
		var timeCell = row.childNodes[2];
		var timeCellLabel = timeCell.getAttribute("label");
		var completedDateNode = selectedTreeItem.childNodes[0].childNodes[3];
		var completedDateLabel = completedDateNode.getAttribute("label");

		var important = false;
		if (reminder.priority == reminderfox.consts.PRIORITY_IMPORTANT) {
			important = true;
		}

		// see if current instance of reminder is completed
		var completed = false;
		var reminderDateTime = row.getAttribute(REMINDER_FOX_DATE_REF);
		var reminderInstanceDate = new Date(parseInt(reminderDateTime));

		if (reminderfox.core.isCompletedForDate(reminder, reminderInstanceDate)) {
			completed = true;
		}

		addTooltipWithLabel(tooltipItem, "descColLabel", descCellLabel, important, completed);

		var dateString = dateCellLabel;
		if (!reminder.allDayEvent) {
			dateString = dateString + ", " + timeCellLabel;
		}

		if (reminder.durationTime != null) {
			var reminderInstanceEndDate = new Date(parseInt(reminderDateTime) + reminder.durationTime);
			if (reminder.allDayEvent) {
				if (reminder.durationTime > 86400000) { // 24 * 60 * 60 * 1000 = 1 day in ms
					reminderInstanceEndDate.setDate(reminderInstanceEndDate.getDate() - 1); // -1 enddate offset
					var endDateStr = reminderFox_getDateVariableString(reminder, reminderInstanceEndDate);
					dateString += " - " + endDateStr;
				}
			}
			else {
				var endTime = reminderfox.date.getTimeString(reminderInstanceEndDate);
				if (reminderInstanceEndDate.getMonth() == reminderInstanceDate.getMonth() &&
				reminderInstanceEndDate.getDate() == reminderInstanceDate.getDate()) {
					// same days..
					dateString += " - " + endTime;
				}
				// multiple days
				else {
					var endDateStr = reminderFox_getDateVariableString(reminder, reminderInstanceEndDate);
					dateString += " - " + endDateStr + ", " + endTime;
				}
			}
		}


		addTooltipWithLabel(tooltipItem, "dateColLabel", dateString);

		if (reminder.categories != null && reminder.categories != "") {
			addTooltipWithLabel(tooltipItem, "catColLabel", reminder.categories);
		}

		if (completedDateLabel != null && completedDateLabel != "") {
			addTooltipWithLabel(tooltipItem, "dateCompleted", completedDateLabel);
		}

		if (reminder.location != null && reminder.location != "") {
			addTooltipWithLabel(tooltipItem, null, reminder.location, false, false, reminderfox.string("rf.add.reminders.tooltip.locaton"));
		}

		if (reminder.url != null && reminder.url != "") {
			addTooltipWithLabel(tooltipItem, null, reminder.url, false, false, reminderfox.string("rf.add.reminders.tooltip.url"));
		}

		if ((reminder.calDAVid != null) && (reminder.calDAVid != "")) {
			var calDAVaccounts = reminderfox.calDAV.getAccounts()
			var account = calDAVaccounts[reminder.calDAVid];
			if (account != null) {
				addTooltipWithLabel(tooltipItem, null, '[ ' + reminder.calDAVid + ' ] ' + account.Name, false, false, reminderfox.string("rf.caldav.account.remote"));
			}
		}

		// add notes to tooltip (if applicable)
		if (reminder.notes != null) {
			addNotesToTooltip(reminder.notes, tooltipItem);
		}
	}
	return true;
}


function todoTreeTooltip(event){
	var tree = document.getElementById("todoTree");
	var boxobject = tree.boxObject; // cast to treeboxobject to use getRowAt

	var calDAVaccounts = reminderfox.calDAV.getAccounts()

	var row = {}, column = {}, part = {};
	boxobject.getCellAt(event.clientX, event.clientY, row, column, part);

	if (column.value != null && typeof column.value != "string") {
		column.value = column.value.id;
	}

	var index = tree.boxObject.getRowAt(event.clientX, event.clientY);
	if (index == -1) {
		return false; // returning false causes tooltip to not show
	}
	var treeChildren = document.getElementById("todo_treechildren");
	var selectedTreeItem = treeChildren.childNodes[index];
	var todoRefId = selectedTreeItem.childNodes[0].getAttribute(REMINDER_FOX_ID_REF);
	var todo = reminderfox.core.getTodosById(todoRefId, getCurrentTodoList());
	if (todo == null) {
		return false; // returning false causes tooltip to not show
	}

	todo = reminderfox.core.processReminderDescription(todo, new Date().getFullYear(), true);


	var tooltipItem = document.getElementById("todoTree-tooltip-box");
	while (tooltipItem.hasChildNodes()) {
		tooltipItem.removeChild(tooltipItem.firstChild);
	}

	// if this is the alarm column, show the alarm value
	if (todo.alarm != null && column != null && column.value == "todoAlarmColLabel") {
		// if the alarm is currently snoozed, show the snooze value as well....
		if (todo.snoozeTime != null) {
			var snoozeAlarmTime = todo.snoozeTime;
			var index = snoozeAlarmTime.indexOf(';');
			if (index != -1) {
				snoozeAlarmTime = snoozeAlarmTime.substring(0, index);
			}
			var snoozedate = new Date(parseInt(snoozeAlarmTime));
			var dateString = reminderFox_getDateVariableString(todo, snoozedate);
			var timeString = reminderfox.date.getTimeString(snoozedate);

			var snoozetitle = document.createElement("description");
			snoozetitle.setAttribute("value", reminderfox.string("rf.alarm.list.tooltip.snooze") + " " + dateString + ", " + timeString);
			tooltipItem.appendChild(snoozetitle);
		}

		// add the alarm to the tooltip
		var title = document.createElement("description");
		title.setAttribute("value", getAlarmTooltipText(todo.alarm));
		tooltipItem.appendChild(title);


	}
	else {
		var row = selectedTreeItem.childNodes[0];
		var dateCell = row.childNodes[0];
		var dateCellLabel = dateCell.getAttribute("label");
		var descCell = row.childNodes[1];
		var descCellLabel = descCell.getAttribute("label");
		var timeCell = row.childNodes[2];
		var timeCellLabel = timeCell.getAttribute("label");
		var completedDateNode = selectedTreeItem.childNodes[0].childNodes[3];
		var completedDateLabel = completedDateNode.getAttribute("label");

		var important = false;
		if (todo.priority == reminderfox.consts.PRIORITY_IMPORTANT) {
			important = true;
		}
		var completed = false;
		if (todo.completedDate != null) {
			completed = true;
		}
		addTooltipWithLabel(tooltipItem, "descColLabel", descCellLabel, important, completed);

		if (todo.date != null) {
			var dateString = dateCellLabel;
			if (!todo.allDayEvent) {
				dateString = dateString + ", " + timeCellLabel;
			}

			if (todo.durationTime != null) {
				var reminderDateTime = row.getAttribute(REMINDER_FOX_DATE_REF);
				if (reminderDateTime != null) {
					var reminderInstanceDate = new Date(parseInt(reminderDateTime));
					var reminderInstanceEndDate = new Date(parseInt(reminderDateTime) + todo.durationTime);
					if (todo.allDayEvent) {
						if (todo.durationTime > 86400000) { // 24 * 60 * 60 * 1000 = 1 day in ms
							reminderInstanceEndDate.setDate(reminderInstanceEndDate.getDate() - 1); // -1 enddate offset
							var endDateStr = reminderFox_getDateVariableString(todo, reminderInstanceEndDate);
							dateString += " - " + endDateStr;
						}
					}
					else {
						var endTime = reminderfox.date.getTimeString(reminderInstanceEndDate);
						if (reminderInstanceEndDate.getMonth() == reminderInstanceDate.getMonth() &&
						reminderInstanceEndDate.getDate() == reminderInstanceDate.getDate()) {
							// same days..
							dateString += " - " + endTime;
						}
						// multiple days
						else {
							var endDateStr = reminderFox_getDateVariableString(todo, reminderInstanceEndDate);
							dateString += " - " + endDateStr + ", " + endTime;
						}
					}
				}
			}


			addTooltipWithLabel(tooltipItem, "dateColLabel", dateString);
		}

		if (todo.categories != null && todo.categories != "") {
			addTooltipWithLabel(tooltipItem, "catColLabel", todo.categories);
		}

		if (completedDateLabel != null && completedDateLabel != "") {
			addTooltipWithLabel(tooltipItem, "todoDateCompleted", completedDateLabel);
		}

		if (todo.location != null && todo.location != "") {
			addTooltipWithLabel(tooltipItem, null, todo.location, false, false, reminderfox.string("rf.add.reminders.tooltip.locaton"));
		}

		if (todo.url != null && todo.url != "") {
			addTooltipWithLabel(tooltipItem, null, todo.url, false, false, reminderfox.string("rf.add.reminders.tooltip.url"));
		}

		if ((todo.calDAVid != null) && (todo.calDAVid != "")) {
			var account = calDAVaccounts[todo.calDAVid];
			if (account != null) {
				addTooltipWithLabel(tooltipItem, null, '[ ' + todo.calDAVid + ' ] '
				+ account.Name, false, false, reminderfox.string("rf.caldav.account.remote"));
			}
		}

		// add notes to to tooltip (if applicable)
		//
		if (todo.notes != null) {
			addNotesToTooltip(todo.notes, tooltipItem);
		}
	}

	return true;
}


function addNotesToTooltip(orignotes, tooltipItem, maxLines){
	var newline = "\n";

	// replace all tab characters with spaces (otherwise shows up as weird character)
	var notes = orignotes.replace(new RegExp(/\t/g), "    ");
	//var columnLabel = getLabelForColumn( "notesColLabel");
	var separatedString = notes.split(newline);
	var tooltipWrapLength = 120;
	var remLabel;
	var headerAdded = false;
	var maxLinesReached = false;
	var numberOfLinesAdded = 0;
	for (var i = 0; i < separatedString.length && !maxLinesReached; i++) {
		var noteLine = separatedString[i];
		while (noteLine.length > tooltipWrapLength && !maxLinesReached) {
			// go back to last whitespace
			var lastIndex = noteLine.lastIndexOf(' ', tooltipWrapLength);
			var forceLineBreak = false;
			if (lastIndex == -1) {
				forceLineBreak = true;
				lastIndex = tooltipWrapLength + 1;
			}
			if (lastIndex != -1) {
				var curStr = noteLine.substring(0, lastIndex);
				if (!headerAdded) { // first row, add column header name
					addTooltipWithLabel(tooltipItem, "notesColLabel", curStr);
					numberOfLinesAdded++;
					headerAdded = true;
				}
				else {
					remLabel = document.createElement("description");
					remLabel.setAttribute("value", curStr);
					tooltipItem.appendChild(remLabel);
					numberOfLinesAdded++;
					if (maxLines != null && numberOfLinesAdded >= maxLines) {
						maxLinesReached = true;
					}
				}
			}
			var startIndex;
			if (forceLineBreak) {
				startIndex = lastIndex;
			}
			else {
				startIndex = lastIndex + 1;
			}
			noteLine = noteLine.substring(startIndex);
		}

		if (!headerAdded) { // first row, add column header name
			addTooltipWithLabel(tooltipItem, "notesColLabel", noteLine);
			numberOfLinesAdded++;
			headerAdded = true;
		}
		else {
			remLabel = document.createElement("description");
			remLabel.setAttribute("value", noteLine);
			tooltipItem.appendChild(remLabel);

			numberOfLinesAdded++;
			if (maxLines != null && numberOfLinesAdded >= maxLines) {
				maxLinesReached = true;
			}
		}
	}

	// notes are truncated - add indicator
	if (maxLinesReached) {
		var notesTruncatedLabel = document.createElement("description");
		notesTruncatedLabel.setAttribute("value", "...");
		tooltipItem.appendChild(notesTruncatedLabel);
	}
}


function userMoveTodoToReminderList(eventTarget){
	var selectedTodos = getAllSelectedTodos();
	for (var i = 0; i < selectedTodos.length; i++) {
		var movedTodo = selectedTodos[i];

		var newReminder = reminderfox.core.convertTodoToReminder(movedTodo);

		removeTodo(movedTodo);

		// add reminder in sorted order...
		var reminders = reminderfox.core.getReminderEvents();
		var sortedIndex = reminderfox.core.getSortedIndexOfNewReminder(reminders, newReminder, false);
		reminderfox.core.insertIntoArray(reminders, newReminder, sortedIndex);

		reminderfox.core.numDaysModelDelete (movedTodo, 'numDaysTodos');
		reminderfox.core.numDaysModelAdd (newReminder, 'numDaysEvents');

		createUIListItemReminder(newReminder); // update UI list
	}
	refreshCalendar();
	modifiedReminders();
}


/**
 * Build user readable Alarm string
 * @param {string}  alarmTime (ICS attribute)
 * using prefs 'extensions.reminderFox.alarmAttribute' to en-/disable output of IVS attribute
 */
function getAlarmTooltipText(alarmTime){
	var alarmAttribute = reminderfox.core.getPreferenceValue("extensions.reminderFox.alarmAttribute", false)
	var result;

	var minutes = reminderfox.core.getDurationAsMinutes(alarmTime);
	var _days    = parseInt(minutes/1440);
	var _hours   = parseInt(minutes/60)%24;
	var _minutes = parseInt(minutes % 60);

	var _result = "" // reminderfox.string("rf.reminderoptions.alarm") + ": ";
		if (_days != 0) _result +=  _days + reminderfox.string("rf.reminderoptions.notify.days.label")
		if (_hours != 0) _result += _hours + reminderfox.string("rf.reminderoptions.notify.hours.label")
		if (_minutes != 0) _result += _minutes + reminderfox.string("rf.reminderoptions.notify.minutes.label")

		if (_result != "") {
			_result = "(" +_result + " " + reminderfox.string("rf.reminderoptions.notify.before.label") + ")  "
		}
		if (alarmAttribute) _result += "[" + alarmTime + "]";

	return _result;
}


function userMoveToTodoList(event){

	var eventTarget = event.target
	var targetTodoListName = eventTarget.getAttribute("label");  // 'label' is the source Tab list
	var newTodoListName = eventTarget.getAttribute("label");  // 'label' is the source Tab list
	var selectedTodos = getAllSelectedTodos();
	var messageIDtagging = (selectedTodos.length == 1) ? true : false;
	for (var i = 0; i < selectedTodos.length; i++) {
		var movedTodo = selectedTodos[i];

		if (movedTodo.date != null) { // could want to move to a reminder
			var tabList = document.getElementById("rmFx-tabList");
			var tablistItem = tabList.childNodes[0]; // get first tab (reminders)
			var tabLabel = tablistItem.getAttribute("value");		//gWCalndr

			if (tabLabel == targetTodoListName) {
				userMoveTodoToReminderList(eventTarget);
				return;
			}
		}
		// if moving to ToDo's, use special "Xtodo" id (as label could be another language)
		var tabList = document.getElementById("rmFx-tabList");
		var tablistItem = tabList.childNodes[1]; // get second tab -- "ToDo's"
		var tabLabel = tablistItem.getAttribute("value");		// the Tab List to move the reminder to
		if (tabLabel == targetTodoListName) {
			targetTodoListName = reminderfox.consts.DEFAULT_TODOS_CATEGORY;
		}

		var todosArr = reminderfox.core.getReminderTodos();
		var todos = todosArr[targetTodoListName];
		if (todos == null) {
			todos = new Array();
			todosArr[targetTodoListName] = todos;
		}
		removeTodo(movedTodo, messageIDtagging);

		var sortedIndex = reminderfox.core.getSortedIndexOfNewTodo(todos, movedTodo);
		reminderfox.core.insertIntoArray(todos, movedTodo, sortedIndex);

		reminderfox.core.numDaysModelDelete (movedTodo, 'numDaysTodos');
		movedTodo["X-listID"] = newTodoListName;
		reminderfox.core.numDaysModelAdd (movedTodo, 'numDaysTodos');

	}
	reminderfox.calendar.ui.selectDay(movedTodo.date);

	refreshCalendar();
	modifiedReminders();
}


/**
 * activates Context menu on "ToDo/List" on MainList
 *  {for Reminders see: activateContextReminder(event)}
 */
function activateContextTodo(event){
	var tree = document.getElementById("todoTree");
	document.popupNode = tree;

	var selectedTreeItemIndex = document.getElementById("todoTree").currentIndex;
	var treeChildren = document.getElementById("todo_treechildren");
	var contextMenu = document.getElementById("todo-treechildren-contextmenu");
	var currentTodo = getTodoForSelectedItem();

	// if no Todo selected or todo empty etc --> disable & return
	if (treeChildren == null || selectedTreeItemIndex == -1
		|| treeChildren.childNodes.length == 0 || currentTodo == null) {
		for (var i = 0; i < contextMenu.childNodes.length; i++) {
			contextMenu.childNodes[i].setAttribute("disabled", true);
		}
		return;
	}
	else {
		// enable all child menu items
		for (var i = 0; i < contextMenu.childNodes.length; i++) {
			contextMenu.childNodes[i].removeAttribute("disabled");
		}
	}


	var multipleTodosSelected = false;
	var selectedTodos = getAllSelectedTodos();
	if (selectedTodos.length > 1) {
		multipleTodosSelected = true;
	}

	var treechildrenContextmenuEdit = document.getElementById("treechildren-contextmenu-edit2");
	if (multipleTodosSelected) {
		// if multiple reminders selected, disable Edit
		treechildrenContextmenuEdit.setAttribute("disabled", true);
	}
	else {
		treechildrenContextmenuEdit.removeAttribute("disabled");
	}


	// show current lists...
	var moveToList = document.getElementById("treechildren-contextmenu-moveToList-popup");
	while (moveToList.hasChildNodes()) {
		moveToList.removeChild(moveToList.firstChild);
	}

	var tab = reminderfox.tabInfo.tabName;
	var tabID = reminderfox.tabInfo.tabID;
	var tabIndex = reminderfox.tabInfo.tabIndex;

	var index = tabID.indexOf(':');
	name = tabID.substring(index + 1, tabID.length);
	if (tabIndex <= 1 || index == -1) {
		name = reminderfox.consts.DEFAULT_TODOS_CATEGORY;
	}

	var i = 0;
	if (currentTodo.date == null) {
		i = 1; // if no date on the ToDo, don't allow to move to a reminder
	}
	var tabList = document.getElementById("rmFx-tabList");
	// reduce by 2 because of 'Add New User List' and menu separator
	var tabListmax = document.getElementById("rmFx-tabList").children.length - 2;

	var subscriptions = reminderfox.core.getSubscriptions();
	for (; i < tabListmax; i++) {
		var tablistItem = tabList.childNodes[i];
		var tabLabel = tablistItem.getAttribute("value");
		if (tabLabel != name && subscriptions[tabLabel] == null) { // ignore subscribed calendars
			var menuItem = document.createElement("menuitem");
			menuItem.setAttribute("label", tabLabel);
//fx			menuItem.setAttribute("oncommand", "userMoveToTodoList(event.target)");
			menuItem.addEventListener("command", function (event) {userMoveToTodoList(event)}, false);
			moveToList.appendChild(menuItem);
		}
	}

	// modify context menu depending on Important reminder status
	var contextMenuImportant = document.getElementById("treechildren-contextmenu-important2");
	if (currentTodo.priority != reminderfox.consts.PRIORITY_IMPORTANT) {
		contextMenuImportant.setAttribute("checked", "false");
	}
	else {
		contextMenuImportant.setAttribute("checked", "true");
	}

	var contextMenuComplete = document.getElementById("treechildren-contextmenu-markAsComplete2");
	if (currentTodo.completedDate != null) {
		contextMenuComplete.setAttribute("checked", "true");
	}
	else {
		contextMenuComplete.setAttribute("checked", "false");
	}


	var contextMenuShowInTooltip = document.getElementById("treechildren-contextmenu-showInTooltip");
	if (currentTodo.showInTooltip) {
		contextMenuShowInTooltip.setAttribute("checked", "true");
	}
	else {
		contextMenuShowInTooltip.setAttribute("checked", "false");
	}

	// disable moveUp/moveDown if that option isn't available
	var moveUpMenu = document.getElementById("treechildren-contextmenu-moveUp");

	if (isFirstTodoSelected()) {
		moveUpMenu.setAttribute("disabled", true);
	}
	else {
		moveUpMenu.setAttribute("disabled", false);
	}

	var moveDownMenu = document.getElementById("treechildren-contextmenu-moveDown");
	if (isLastTodoSelected()) {
		moveDownMenu.setAttribute("disabled", true);
	}
	else {
		moveDownMenu.setAttribute("disabled", false);
	}

	// If reminder is associated with an email, show the View Mail context menu item.  Otherwise, do not.
	var showMail = document.getElementById("treechildren-contextmenu-showMail2");
	if (showMail != null) {
		if (!reminderfox.core.isMailEvent(currentTodo)) {
			showMail.setAttribute("hidden", "true");
		}
		else {
			showMail.setAttribute("hidden", "false");
		}
	}

	if (getAllSelectedTodos().length == 0) {
		document.getElementById("treechildren-contextmenu-sendTodos").setAttribute("disabled", "true");
	}
};


function processKeyPressedOnReminderTree(event){
	if (event.keyCode == null) return;

	switch (event.keyCode) {

		case 8: case 46:  // delete or backspace: 'Delete'
			userDeleteReminder(); break;

		case 13:  // return:  'Edit reminder'
				reminderOrTodoEdit(); break;

		default:
		switch (event.which) {

			case 32: // space bar: 'Toggle mark as Complete'
						// fun note: if I don't call this in a settimeout, this will crash firefox (yay!).  This
						// happens if you have a column sorted and hit the spacebar to run this evnet.
						// In createUIListReminderItemSorted when it is adding the elements for the tree item, after
						// 10 attributes it crashes.  No idea why.
						setTimeout(toggleMarkAsComplete, 1); break;

			case 63: // '?'  toggle Spyglass
				reminderfox.calendar.filter.toggle(); break;

			case 46: // '.'  goto 'Today'
				reminderfox.calendar.ui.selectDay('today'); break;

			case 58: // ':'  goto 'Original date' of event
				var orginDate = getReminderForSelectedItem().date;
				reminderfox.calendar.ui.selectDay(orginDate); break;

	//		case 35: // '#'  tbd
	//			break;
		}
	}
}


function processKeyPressedOnTodoTree(xEvent){
	if (xEvent.keyCode == 46 || xEvent.keyCode == 8) // 46 =  delete key; 8 = backspace (to handle Mac 'Delete')
		userDeleteTodo(xEvent);
	else
		if (xEvent.keyCode == 13) // return
			reminderOrTodoEdit();
		else
			if (xEvent.charCode == 32) { // space bar
				setTimeout(toggleMarkAsCompleteTodo, 1);
			}
}


/**
 * Calls the "Add/Edit Reminder/Todo" dialog
 * used with [Add] button on Main Dialog
 */
function reminderOrTodoAdd(){
	if (reminderfox_isReminderTabSelected()) {
		reminderfox.core.addReminder(null, reminderfox.datePicker.gSelectedDate);
	}
	else {
		reminderfox.core.addTodo(null, reminderfox.datePicker.gSelectedDate);
	}
};


/**
 * 	Open the 'Edit' dialog for a selected reminder/todo, if edited stores to RList and numDaysModel
 * 	@param {object} go4Reminder: reminder, if null from ReminderList, else from Calendar
 */
function reminderOrTodoEdit(go4Reminder, isTodo, messageID){

	var currentReminder = "";
	if (go4Reminder != null) {  // called from calendar or alarm with reminder/todo

		var currentReminder = go4Reminder;

	} else {

		var aTreeChildren = "treechildren"
		if (isTodo == null) { // called from calendar or alarm with reminder/todo
			isTodo = !reminderfox_isReminderTabSelected();
			var currentReminder = isTodo
				? getTodoForSelectedItem()
				: getReminderForSelectedItem();
			var aTreeChildren = isTodo
				? "todo_treechildren"
				: "treechildren"
		}

		var mainDialog  = reminderfox.util.getWindow("window:reminderFoxEdit");
		if (mainDialog != null) {
			mainDialog.focus()
			var selectedTreeItemIndex = rmFx_selectedCurrentTree_ItemIndex;
			if (selectedTreeItemIndex >= 0) {
				var treeChildren = document.getElementById(aTreeChildren);
				if (treeChildren != null) {
					var selectedTreeItem = treeChildren.childNodes[selectedTreeItemIndex];
					var _reminderDateTime = selectedTreeItem.childNodes[0].getAttribute(REMINDER_FOX_DATE_REF);
					var reminderCurrentDate = reminderfox.date.convertDate(new Date(+_reminderDateTime));
					currentReminder.instanceDate = reminderCurrentDate;
				}
			}
		}
	}


	if (messageID != null) {
		currentReminder.messageID = messageID
	}
	reminderfox.core.addReminderHeadlessly(currentReminder /*currentEvent*/, true /*isEdit*/, isTodo  /*, listName*/);
};


/**
 * Select a Reminder/Todo on Main List to be copied
 * New will be set for todays date
 */
function copyReminderOrTodo(){
	var thisReminder = reminderfox_isReminderTabSelected() ? getReminderForSelectedItem() : getTodoForSelectedItem();
	if (thisReminder == null) return;

	var newReminder = reminderFox_copyReminder(thisReminder, true /*isTodo*/);
	if (newReminder != null)

	reminderfox.core.addReminderHeadlessly(newReminder, true /*edit*/, !reminderfox_isReminderTabSelected() /* isTodo*/);
};


function reminderFox_copyReminder(originalReminder, isTodo){
	var instanceDate = reminderfox.datePicker.gSelectedDate;

	var currentDate = new Date();
	var newReminderFoxEvent = (!isTodo)
		? reminderfox.core.cloneReminderFoxEvent(originalReminder)
		: reminderfox.core.cloneReminderFoxTodo(originalReminder);


	if (newReminderFoxEvent.recurrence.type != null) {

		var title = reminderfox.string("rf.reminder.copy.instance.title"); // "Copy Recurring Reminder"
		var msg = reminderfox.string("rf.reminder.copy.instance.msg");
		var key0 = reminderfox.string("rf.reminder.copy.instance.single"); // ("Single")
		var key1 = reminderfox.string("rf.button.cancel");
		var key2 = reminderfox.string("rf.reminder.copy.instance.recurring"); // ("Recurring")

		var mode = reminderfox.util.ConfirmEx (title , msg, key0, key1, key2);

		if (mode == 1) return null;// cancel pressed
		if (mode == 0) {// single
			newReminderFoxEvent.recurrence.type = null;

			var startDateNum = reminderfox.date.convertDate(newReminderFoxEvent.date);
			var instanceDateNum = reminderfox.date.convertDate(instanceDate);
			var endDateNum = reminderfox.date.convertDate(newReminderFoxEvent.endDate);

			var newEndDate = reminderfox.date.convertDate(instanceDateNum +(endDateNum - startDateNum));

			instanceDate.setHours(newReminderFoxEvent.date.getHours());
			instanceDate.setMinutes(newReminderFoxEvent.date.getMinutes());
			newEndDate.setHours(newReminderFoxEvent.endDate.getHours());
			newEndDate.setMinutes(newReminderFoxEvent.endDate.getMinutes());

			newReminderFoxEvent.date = instanceDate;
			newReminderFoxEvent.endDate = newEndDate;
		//	alert( "new Dates: " + instanceDate + " -- " + newEndDate)
		}
	}


	var newId = reminderfox.core.generateUniqueReminderId(currentDate);
	newReminderFoxEvent.id = newId;
	newReminderFoxEvent.completedDate = null;
	newReminderFoxEvent.snoozeTime = null;
	if (newReminderFoxEvent.alarm != null) {
		newReminderFoxEvent.alarmLastAcknowledge = currentDate.getTime();
	}
	newReminderFoxEvent.lastModified = reminderfox.date.objDTtoStringICS(currentDate);	//gWTZID

	if (newReminderFoxEvent.remindUntilCompleted == reminderfox.consts.REMIND_UNTIL_COMPLETE_MARKED /*2*/) {
		newReminderFoxEvent.remindUntilCompleted = reminderfox.consts.REMIND_UNTIL_COMPLETE_TO_BE_MARKED; /*1*/
	}

	return newReminderFoxEvent;
};


function userDeleteReminder(events) {		//gWCal
	if (reminderfox_isReminderTabSelected()) {
		userDeleteEvent(events)
	} else {
		userDeleteTodo(events);
	}
	if (events != null)
		reminderfox.core.storeOrUpdate(events);
};


function userDeleteEvent(events){ 		//gWCal
	var deleteIt = false;
	var deleteDate = new Date();

	var selectedReminders;
	if (events) {
		selectedReminders = events;
	} else {
		selectedReminders = getAllSelectedReminders();
	}

	if (selectedReminders.length == 1 &&
	(selectedReminders[0].recurrence.type == reminderfox.consts.RECURRENCE_YEARLY ||
	selectedReminders[0].recurrence.type == reminderfox.consts.RECURRENCE_MONTHLY_DATE ||
	selectedReminders[0].recurrence.type == reminderfox.consts.RECURRENCE_MONTHLY_DAY ||
	selectedReminders[0].recurrence.type == reminderfox.consts.RECURRENCE_WEEKLY ||
	selectedReminders[0].recurrence.type == reminderfox.consts.RECURRENCE_DAILY)) {
		deleteIt = removeReminder(selectedReminders[0], true);
	}
	else {
		var deleteDescription = null;
		var reminderTitle = null;
		if (selectedReminders.length == 1) {
			deleteDescription = reminderfox.string("rf.add.deleteReminder.description") + "\n";
			reminderTitle = reminderfox.string("rf.add.deleteReminder.title");
		}
		else {
			deleteDescription = reminderfox.string("rf.add.deleteReminders.description") + "\n";
			reminderTitle = reminderfox.string("rf.add.deleteReminders.title");
		}

		// store the date label and delete date before we start deleting the reminders,
		// as then the selected indices get shifted
		var reminderDateLabelArray = new Array();
		var reminderDeleteDateArray = new Array();
		var messageIDtagging = (selectedReminders.length == 1) ? true : false;
		for (var i = 0; i < selectedReminders.length; i++) {
			var currentReminder = selectedReminders[i];
			deleteDate = getInstanceDateOfLastSelected(currentReminder);
			var dateLabel = reminderFox_getDateVariableString(currentReminder, deleteDate);
			reminderDateLabelArray[currentReminder.id] = dateLabel;
			reminderDeleteDateArray[currentReminder.id] = deleteDate;
			var descLabel = currentReminder.summary;
			deleteDescription += dateLabel + ": " + descLabel + "\n";
		}

		var nsIPromptService = Ci.nsIPromptService;
		var nsPrompt_CONTRACTID = "@mozilla.org/embedcomp/prompt-service;1";
		var gPromptService = Cc[nsPrompt_CONTRACTID].getService(nsIPromptService);
		if (gPromptService.confirm(window, reminderTitle, deleteDescription)) {

			for (var i = 0; i < selectedReminders.length; i++) {
				var currentReminder = selectedReminders[i];
				deleteIt = removeReminder(currentReminder, true, reminderDeleteDateArray[currentReminder.id], reminderDateLabelArray[currentReminder.id], messageIDtagging);
			}
		}
	}

	if (deleteIt) {
		reminderfox.calendar.ui.selectDay (deleteDate);
		reminderfox.calendar.drawList = true;
		refreshCalendar(false, true);
		modifiedReminders();
	}
	return deleteIt;
}

/**
 * Move a 'reminder' called from context menu
 */
function userMoveReminderToTodo(event){
	var eventTarget = event.target
	var tabList = document.getElementById("rmFx-tabList");
	var newTabLabel = tabList.childNodes[0].getAttribute("value");		// the 'Tab List' name to move the reminder to

	var moveToListName  = eventTarget.getAttribute("label");  // 'label' is the source Tab list
	var newTodoListName = eventTarget.getAttribute("label");  // 'label' is the source Tab list

	// if moving to ToDo's, use special "Xtodo" id (as label could be another language)
	var tabLabel = tabList.childNodes[1].getAttribute("value"); // get second tab -- "ToDo's"
	if (tabLabel == moveToListName) {
		moveToListName = reminderfox.consts.DEFAULT_TODOS_CATEGORY;
	}
	var subscriptionTab = reminderfox_isSubscribedCalendarTabSelected()
	var thisTab = reminderfox.tabInfo

//	alert ("  reminders    tabInfo.ID: " + thisTab.tabID +"  " + thisTab.tabName
//	+"\n  newTabLabel|moveToListName  " +  newTabLabel +"|"+ moveToListName)

	// dealing with reminders ------------------------
	if (newTabLabel == moveToListName) {

		var selectedReminders = getAllSelectedReminders();
		var messageIDtagging = (selectedReminders.length == 1) ? true : false;
		for (var i = 0; i < selectedReminders.length; i++) {
			var currentReminder = selectedReminders[i];
			//	var newTodo = reminderfox.core.convertReminderToTodo( currentReminder );
			var newReminder = reminderfox.core.cloneReminderFoxEvent(currentReminder);

			// remove from reminders if NOT subscribed
			if (!subscriptionTab) {
				removeReminder(currentReminder, null, null, null, messageIDtagging);

				var reminders = reminderfox.core.getReminderEvents();
				var sortedIndex = reminderfox.core.getSortedIndexOfNewReminder(reminders, newReminder, false);
				reminderfox.core.insertIntoArray(reminders, newReminder, sortedIndex);

				createUIListItemReminder(newReminder);  // update UI list
			}

			else { // subscription -- check for duplicates!
				var reminders = this.reminderfox.core.reminderFoxEvents
				var sortedIndex = reminderfox.core.getSortedIndexOfNewReminder(reminders, newReminder, false);
				reminderfox.core.removeReminderFromDataModels (newReminder, reminders)
				reminderfox.core.insertIntoArray(reminders, newReminder, sortedIndex);
			}
		}

		if (subscriptionTab) {
			modifiedReminders();
			// on subscription tab :  the events) added to the .core.reminderFoxEvents array
			// which isn't shown, no further actions
			return
		}

		// if todo list is selected (has child nodes, need to add a list item to it)
		reminderFoxTabDirtied = true;

		reminderfox.calendar.ui.selectDay (newReminder.date);
		reminderfox.calendar.drawList = true;

		refreshCalendar();
		modifiedReminders();
		return;
	}

	// dealing with Todo/User list items ----------------------
	var todosArr = reminderfox.core.getReminderTodos();
	var todos = todosArr[moveToListName];
	if (todos == null) {
		todos = new Array();
		todosArr[moveToListName] = todos;
	}

	var selectedReminders = getAllSelectedReminders();
	var messageIDtagging = (selectedReminders.length == 1) ? true : false;
	for (var i = 0; i < selectedReminders.length; i++) {
		var currentReminder = selectedReminders[i];
		var newTodo = reminderfox.core.convertReminderToTodo(currentReminder);

		// remove from reminders
		removeReminder(currentReminder, null, null, null, messageIDtagging);

		var sortedIndex = reminderfox.core.getSortedIndexOfNewTodo(todos, newTodo);
		reminderfox.core.insertIntoArray(todos, newTodo, sortedIndex);

		reminderfox.core.numDaysModelDelete (newTodo, 'numDaysTodos');
		newTodo["X-listID"] = newTodoListName;
		reminderfox.core.numDaysModelAdd (newTodo, 'numDaysTodos');

	}
	// if todo list is selected (has child nodes, need to add a list item to it)
	reminderFoxTabDirtied = true;

	refreshCalendar();
	modifiedReminders();
}


function userDeleteTodo(xEvent){		//gWCal

	var selectedTodos = null;
	if (xEvent && ((xEvent.tagName && xEvent.tagName == 'menuitem') || (xEvent.type && xEvent.type == 'keypress'))) {
		selectedTodos = getAllSelectedTodos();
	} else {
		selectedTodos = xEvent;
	}

	var deleteDescription = reminderfox.string("rf.add.deleteToDo.description") + "\n  ";

	for (var i = 0; i < selectedTodos.length; i++) {
		var currentTodo = selectedTodos[i];
		var dateLabel = "";
		if (currentTodo.date != null) {
			dateLabel = reminderFox_getDateVariableString(currentTodo, currentTodo.date) + ": ";
		}
		var descLabel = currentTodo.summary;
		deleteDescription += dateLabel + descLabel + "\n";
	}

	var nsIPromptService = Ci.nsIPromptService;
	var nsPrompt_CONTRACTID = "@mozilla.org/embedcomp/prompt-service;1";
	var gPromptService = Cc[nsPrompt_CONTRACTID].getService(nsIPromptService);
	if (gPromptService.confirm(window, reminderfox.string("rf.add.deleteToDo.title"), deleteDescription)) {

		var currentTodoList = getCurrentTodoList();
		for (var i = 0; i < selectedTodos.length; i++) {
			var currentTodo = selectedTodos[i];
			removeUIListItemReminder(currentTodo);
			// remove from models  RList and numDays   //gWCAL
			reminderfox.core.removeReminderFromDataModels(currentTodo, currentTodoList)
			rmFx_CalDAV_ReminderDelete(currentTodo);
		}

		refreshCalendar(true, false);
		modifiedReminders();
	}
}


function getTreeItemIndexForTodo(todo){
	var treeChildren = document.getElementById("todo_treechildren");
	var treeitems = treeChildren.childNodes;
	for (var i = treeitems.length - 1; i >= 0; i--) {
		var item = treeitems[i];
		var row = item.childNodes[0];
		var reminderRefId = row.getAttribute(REMINDER_FOX_ID_REF);
		if (reminderRefId == todo.id) {
			//return item;
			return i;
		}
	}
	return -1;
}


function moveTodoUp(){
	if (!isFirstTodoSelected()) {
		var oldIndices = getAllSelectedTodoIndices();
		var todos = getCurrentTodoList();
		var treeChildren = document.getElementById("todo_treechildren");
		for (var k = 0; k < oldIndices.length; k++) {
			var index = oldIndices[k];
			var selectedTreeItem = treeChildren.childNodes[index];
			var currentTodoRefId = selectedTreeItem.childNodes[0].getAttribute(REMINDER_FOX_ID_REF);
			var currentTodo = reminderfox.core.getTodosById(currentTodoRefId, todos);

			if (index > 0) {
				var previousIndex = index - 1;
				var previousselectedTreeItem = treeChildren.childNodes[previousIndex];
				var todoRefId = previousselectedTreeItem.childNodes[0].getAttribute(REMINDER_FOX_ID_REF);

				// get current index inside of todo array in memory
				var i;
				var found = false;
				for (i = 0; i < todos.length; i++) {
					if (todos[i].id == todoRefId) {
						found = true;
						break;
					}
				}

				if (found && i >= 0) {
					//var newIndex = getPreviousTodoIndex(todos, i );  // insert before old position
					var newIndex = i;
					var newTodo = reminderfox.core.cloneReminderFoxTodo(currentTodo);
					var selectedTreeItemIndex = getTreeItemIndexForTodo(newTodo);

					removeTodo(currentTodo);
					reminderfox.core.insertIntoArray(todos, newTodo, newIndex);

					var newListIndex = selectedTreeItemIndex - 1;
					removeUIListItemReminder(newTodo, 'todo_treechildren');
					createUIListItemTodoAtIndex(newTodo, newListIndex);
				}
			}
		}

		// update the selected items
		var treeSelection = document.getElementById("todoTree").view.selection
		for (var k = 0; k < oldIndices.length; k++) {
			var index = oldIndices[k];
			treeSelection.rangedSelect((index - 1), (index - 1), true);
		}

		modifiedReminders();
	}

}



function getAllSelectedTodoIndices(){
	var treeChildren = document.getElementById("todo_treechildren");
	var indices = new Array();

	var start = new Object();
	var end = new Object();
	var numRanges = document.getElementById("todoTree").view.selection.getRangeCount();

	for (var t = 0; t < numRanges; t++) {
		document.getElementById("todoTree").view.selection.getRangeAt(t, start, end);
		for (var v = start.value; v <= end.value; v++) {
			indices[indices.length] = v;
		}
	}

	return indices;
}


function getAllSelectedReminderIndices(){
	var treeChildren = document.getElementById("treechildren");
	var indices = new Array();

	var start = new Object();
	var end = new Object();
	var numRanges = document.getElementById("reminderTree").view.selection.getRangeCount();

	for (var t = 0; t < numRanges; t++) {
		document.getElementById("reminderTree").view.selection.getRangeAt(t, start, end);
		for (var v = start.value; v <= end.value; v++) {
			indices[indices.length] = v;
		}
	}

	return indices;
}


function getNextTodoIndex(todos, lastIndex){
	if (!HIDE_COMPLETED_ITEMS) {
		return lastIndex + 1;
	}

	// bypass all completed todos
	var i;
	for (i = lastIndex + 1; i < todos.length; i++) {
		if (todos[i].completedDate == null) {
			break;

		}
	}
	return i;
}


function getPreviousTodoIndex(todos, lastIndex){
	if (!HIDE_COMPLETED_ITEMS) {
		return lastIndex - 1;
	}

	// bypass all completed todos
	var i;
	for (i = lastIndex - 1; i >= 0; i--) {
		if (todos[i].completedDate == null) {
			break;
		}
	}

	return i;
}




function moveTodoDown(){
	if (!isLastTodoSelected()) {
		var oldIndices = getAllSelectedTodoIndices();
		var todos = getCurrentTodoList();
		var treeChildren = document.getElementById("todo_treechildren");
		for (var k = oldIndices.length - 1; k >= 0; k--) {
			var index = oldIndices[k];
			var selectedTreeItem = treeChildren.childNodes[index];
			var currentTodoRefId = selectedTreeItem.childNodes[0].getAttribute(REMINDER_FOX_ID_REF);
			var currentTodo = reminderfox.core.getTodosById(currentTodoRefId, todos);

			var nextIndex = index + 1;

			var nextselectedTreeItem = treeChildren.childNodes[nextIndex];
			var todoRefId = nextselectedTreeItem.childNodes[0].getAttribute(REMINDER_FOX_ID_REF);

			// get current index inside of todo array in memory
			var i;
			var found = false;
			for (i = 0; i < todos.length; i++) {
				if (todos[i].id == currentTodo.id) {
					found = true;
					break;
				}
			}

			if (found) {
				//var newIndex = getNextTodoIndex(todos, i);  // insert after old position (take into account some todos may be hidden as complete)  // actually want index of next VISIBLE todo (use list todos, not memory todos?)
				var newIndex = i + 1; // insert current selected item into the next index location (thus moving it down in the list)
				var newTodo = reminderfox.core.cloneReminderFoxTodo(currentTodo);
				var selectedTreeItemIndex = getTreeItemIndexForTodo(newTodo);

				removeTodo(currentTodo, false /*messageIDtagging*/);
				reminderfox.core.insertIntoArray(todos, newTodo, newIndex);

				var newListIndex = selectedTreeItemIndex + 1;

				removeUIListItemReminder(newTodo, 'todo_treechildren');
				createUIListItemTodoAtIndex(newTodo, newListIndex);
			}
		}

		var treeSelection = document.getElementById("todoTree").view.selection
		for (var k = 0; k < oldIndices.length; k++) {
			var index = oldIndices[k];
			treeSelection.rangedSelect((index + 1), (index + 1), true);
		}

		modifiedReminders();
	}
}


function toggleImportantFlagTodo(todosPassed){
	var selectedTodos;

	if (todosPassed != null) {
		selectedTodos = todosPassed;
	} else {
		selectedTodos = getAllSelectedTodos();
	}

	for (var i = 0; i < selectedTodos.length; i++) {
		var currentTodo = selectedTodos[i];
		if (currentTodo.priority == reminderfox.consts.PRIORITY_NORMAL) {
			currentTodo.priority = reminderfox.consts.PRIORITY_IMPORTANT;
		}
		else {
			currentTodo.priority = reminderfox.consts.PRIORITY_NORMAL;
		}

		updateInListTodo(currentTodo);
	}
	if (todosPassed != null) {
	//	reminderfox.core.lastEvent = currentTodo;  //remember reminder to update dateNum array
		reminderfox.core.numDaysModelAdd(currentTodo, (reminderfox_isReminderTabSelected() ? 'numDaysEvents' : 'numDaysTodos'));
	}
	modifiedReminders();
	refreshCalendar(true, true);
}


function getReminderForSelectedItem(){
	var selectedTreeItemIndex = document.getElementById("reminderTree").currentIndex;
	if (selectedTreeItemIndex != -1) {
		var treeChildren = document.getElementById("treechildren");
		var selectedTreeItem = treeChildren.childNodes[selectedTreeItemIndex];
		if (selectedTreeItem != null) {
			var reminderRefId = selectedTreeItem.childNodes[0].getAttribute(REMINDER_FOX_ID_REF);
			return reminderfox.core.getRemindersById(reminderRefId, getCurrentReminderList());
		}
	}
	else {
		return null;
	}
}


function getOriginEventDate() {
	var thisEvent = getReminderForSelectedItem().date;

}


function selectReminderById(reminderID, list){
	if (reminderfox.calendar.layout.status == -1) return; // call from menu icon
	var treeName =  (list == null) ? "reminderTree" : "todoTree";
	var treeChildren = (list == null) ? document.getElementById("treechildren") : document.getElementById("todo_treechildren");;

	var treeitems = treeChildren.childNodes;
	for (var i = 0; i < treeitems.length; i++) {
		var item = treeitems[i];
		var row = item.childNodes[0];
		var reminderRefId = row.getAttribute(REMINDER_FOX_ID_REF);
		if (reminderRefId == reminderID) {

				document.getElementById(treeName /*"reminderTree"*/).currentIndex = i;
				var treeSelection = document.getElementById(treeName /*"reminderTree"*/).view.selection
				try {
					treeSelection.select(i);
				}
				catch (e) {
					reminderfox.core.logMessageLevel("  Error in selectReminderById1: " +
					e.message, reminderfox.consts.LOG_LEVEL_INFO); //TODO
				}
				// make sure that newly selected row is shown in scroll pane
				findHighLight(treeName /*"reminderTree"*/, i, treeitems.length)
			break;
		}
	}
}


function selectTodoById(todoListName, reminderID){
	if (reminderfox.calendar.layout.status == -1) return; // call from menu icon

	var tabList = document.getElementById("rmFx-tabList");

	for (var i = 1; i < tabList.childNodes.length; i++) { // i =1, because we want to skip reminders
		var tablistItem = tabList.childNodes[i];
		var tabLabel = tablistItem.getAttribute("label");
		if (tabLabel == todoListName) {
			tabList.selectedItem = tablistItem;
			var treeChildren = document.getElementById("todo_treechildren");
			var treeitems = treeChildren.childNodes;
			for (var i = 0; i < treeitems.length; i++) {
				var item = treeitems[i];
				var row = item.childNodes[0];
				var reminderRefId = row.getAttribute(REMINDER_FOX_ID_REF);
				if (reminderRefId == reminderID) {
					document.getElementById("todoTree").currentIndex = i;
					var treeSelection = document.getElementById("todoTree").view.selection
					try {
						treeSelection.select(i);
					}
					catch (e) {
						reminderfox.core.logMessageLevel("  Error in selectReminderById1: " +
						e.message, reminderfox.consts.LOG_LEVEL_INFO); //TODO
					}

					// make sure that newly selected row is shown in scroll pane
					findHighLight("todoTree", i, treeitems.length)
				}
			}
			break;
		}
	}
}


function getTodoForSelectedItem(){
	var selectedTreeItemIndex = document.getElementById("todoTree").currentIndex;
	if (selectedTreeItemIndex != -1) {
		var treeChildren = document.getElementById("todo_treechildren");
		var selectedTreeItem = treeChildren.childNodes[selectedTreeItemIndex];
		if (selectedTreeItem != null) {
			var todoRefId = selectedTreeItem.childNodes[0].getAttribute(REMINDER_FOX_ID_REF);
			return reminderfox.core.getTodosById(todoRefId, getCurrentTodoList());
		}
	}
	return null;
}


function getAllSelectedReminders(){
	var selectedReminders = new Array();
	var treeChildren = document.getElementById("treechildren");
	var selectedIDsHash = {};

	var start = new Object();
	var end = new Object();
	try { //gWbackup&delete
		var numRanges = document.getElementById("reminderTree").view.selection.getRangeCount();
		for (var t = 0; t < numRanges; t++) {
			document.getElementById("reminderTree").view.selection.getRangeAt(t, start, end);

			for (var v = start.value; v <= end.value; v++) {
				var selectedTreeItem = treeChildren.childNodes[v];
				if (selectedTreeItem != null) {
					var reminderRefId = selectedTreeItem.childNodes[0].getAttribute(REMINDER_FOX_ID_REF);
					selectedIDsHash[reminderRefId] = 0;
				}
			}
		}

		// now we have all the unique IDs in a hash (in case the user selected multiple instances of the same reminder)
		// so we go through and get all of those unique reminders
		for (var n in selectedIDsHash) {
			var reminderRefId = n;
			var reminder = reminderfox.core.getRemindersById(reminderRefId, getCurrentReminderList());
			selectedReminders[selectedReminders.length] = reminder;
		}
	}
	catch (ex) {
	//	reminderfox.util.Logger('ALERT', ex.message + "; getAllSelectedReminders : Error no Reminders returned!");
	}

	return selectedReminders;
}


function isFirstTodoSelected(){
	var start = new Object();
	var end = new Object();
	var numRanges = document.getElementById("todoTree").view.selection.getRangeCount();
	for (var t = 0; t < numRanges; t++) {
		document.getElementById("todoTree").view.selection.getRangeAt(t, start, end);
		for (var v = start.value; v <= end.value; v++) {
			if (v == 0) {
				return true;
			}
		}
	}
	return false;
}


function isLastTodoSelected(){
	var treeChildren = document.getElementById("todo_treechildren");
	var treeitems = treeChildren.childNodes;
	var treeItemsLastIndex = treeitems.length - 1;

	var start = new Object();
	var end = new Object();
	var numRanges = document.getElementById("todoTree").view.selection.getRangeCount();

	for (var t = 0; t < numRanges; t++) {
		document.getElementById("todoTree").view.selection.getRangeAt(t, start, end);
		for (var v = start.value; v <= end.value; v++) {
			if (v == treeItemsLastIndex) {
				return true;
			}
		}
	}
	return false;
}


function getAllSelectedTodos(){

	var selectedTodos = new Array();
	var treeChildren = document.getElementById("todo_treechildren");
	var selectedIDsHash = {};

	var start = new Object();
	var end = new Object();
	var numRanges = document.getElementById("todoTree").view.selection.getRangeCount();

	for (var t = 0; t < numRanges; t++) {
		document.getElementById("todoTree").view.selection.getRangeAt(t, start, end);
		for (var v = start.value; v <= end.value; v++) {
			if (v < 0 || v > treeChildren.childNodes.length - 1) {
				reminderfox.core.logMessageLevel("  getAllSelectedTodos outside range: " + v + " > nodes: " +
				treeChildren.childNodes.length +
				reminderfox.tabInfo.tabName , reminderfox.consts.LOG_LEVEL_DEBUG);
			}
			else {
				var selectedTreeItem = treeChildren.childNodes[v];
				var reminderRefId = selectedTreeItem.childNodes[0].getAttribute(REMINDER_FOX_ID_REF);
				selectedIDsHash[reminderRefId] = 0;
			}
		}
	}
	// now we have all the unique IDs in a hash (in case the user selected multiple instances of the same reminder)
	// so we go through and get all of those unique reminders
	for (var n in selectedIDsHash) {
		var reminderRefId = n;
		var todo = reminderfox.core.getTodosById(reminderRefId, getCurrentTodoList());
		selectedTodos[selectedTodos.length] = todo;
	}
	return selectedTodos;
}


function toggleImportantFlag(remindersPassed){
	var selectedReminders;

	if (remindersPassed != null) {
		selectedReminders = remindersPassed;
	} else {
		selectedReminders = getAllSelectedReminders();
	}

	for (var i = 0; i < selectedReminders.length; i++) {
		var currentReminder = selectedReminders[i];
		if (currentReminder.priority == reminderfox.consts.PRIORITY_NORMAL) {
			currentReminder.priority = reminderfox.consts.PRIORITY_IMPORTANT;
		}
		else {
			currentReminder.priority = reminderfox.consts.PRIORITY_NORMAL;
		}
		updateInListReminder(currentReminder);
	}

	// if this is a remote calendar event go to sync it
	rmFx_CalDAV_UpdateReminder (currentReminder)
}


function updateInListReminder(reminder){

//	reminderfox.calendar.dateArray.EventUpdate (reminder.date);

	if (reminderfox.calendar.layout.status < 1) return; // call from menu icon or Calndr only

	var currentSelectedDate = reminderfox.datePicker.gSelectedDate

	var treeChildren = document.getElementById("treechildren");
	var todaysDate = new Date();
	var treeitems = treeChildren.childNodes;

	var year = reminderfox.datePicker.gSelectedDate.getFullYear();
	if (year == null) {
		year = new Date().getFullYear();
	}
	var reminderInstanceDate;
	for (var i = 0; i < treeitems.length; i++) {
		var item = treeitems[i];
		var row = item.childNodes[0];
		var reminderRefId = row.getAttribute(REMINDER_FOX_ID_REF);  //   = "idRef";
		if (reminderRefId == reminder.id) {
			// check if reminder.complete and then reminder.date compared to today's date - first one
			// >= today, mark it as complete.  No others...
			//if ( reminder.completedDate != null  ) {
			var reminderDateTime = row.getAttribute(REMINDER_FOX_DATE_REF);	// = "dateRef";
			var reminderInstanceDate = new Date(parseInt(reminderDateTime));
			//}
			updateReminder(reminder, item, reminderInstanceDate);
		}
	}
	reminder.lastModified = reminderfox.date.objDTtoStringICS(todaysDate);	//gWTZID

	reminderfox.calendar.dateArray.EventUpdate (currentSelectedDate);

	modifiedReminders();
}


function getTreeItemForReminder(reminder){
	var treeChildren = document.getElementById("treechildren");
	var treeitems = treeChildren.childNodes;
	for (var i = treeitems.length - 1; i >= 0; i--) {
		var item = treeitems[i];
		var row = item.childNodes[0];
		var reminderRefId = row.getAttribute(REMINDER_FOX_ID_REF);
		if (reminderRefId == reminder.id) {
			return item;
		}
	}
	return null;
}


function updateReminder(reminder, selectedTreeItem, reminderInstanceDate){

	if (selectedTreeItem == null) {
		selectedTreeItem = getTreeItemForReminder(reminder);
	}

	var dateNode = selectedTreeItem.childNodes[0].childNodes[0];
	var descriptionNode = selectedTreeItem.childNodes[0].childNodes[1];
	var timeNode = selectedTreeItem.childNodes[0].childNodes[2];
	var completedDateNode = selectedTreeItem.childNodes[0].childNodes[3];
	var repeatNode = selectedTreeItem.childNodes[0].childNodes[4];
	var completeNode = selectedTreeItem.childNodes[0].childNodes[5];
	var remindUntilCompleteNode = selectedTreeItem.childNodes[0].childNodes[6];
	var notesNode = selectedTreeItem.childNodes[0].childNodes[7];
	var alarmNode = selectedTreeItem.childNodes[0].childNodes[8];
	var categoryNode = selectedTreeItem.childNodes[0].childNodes[9];
	var endDateNode = selectedTreeItem.childNodes[0].childNodes[10];
	var mailNode = selectedTreeItem.childNodes[0].childNodes[11];

	// update description

	var year = reminderfox.datePicker.gSelectedDate.getFullYear();
	if (year == null) {
		year = new Date().getFullYear();
	}

	var todaysDate = new Date();

	var isToday = reminderfox.core.compareDates(reminderInstanceDate, todaysDate) == 0;
	var isImportant = reminder.priority == reminderfox.consts.PRIORITY_IMPORTANT;
	var isCompleted = reminderfox.core.isCompletedForDate(reminder, reminderInstanceDate);

	reminder = reminderfox.core.processReminderDescription(reminder, year, false);
	descriptionNode.setAttribute("label", reminder.summary);

	setTextProperties(isToday, isImportant, isCompleted, dateNode, descriptionNode, timeNode);

	if (reminder.allDayEvent) {
		timeNode.setAttribute("label", REMINDER_FOX_TIME_ALL_DAY_LABEL);
	}
	else {
		var time = reminderFox_getAddTimeString(reminder);
		if (time == null) {
			timeNode.setAttribute("label", REMINDER_FOX_TIME_ALL_DAY_LABEL);
		}
		else {
			timeNode.setAttribute("label", time);
		}
	}
	// update once
	if (reminder.recurrence.type == reminderfox.consts.RECURRENCE_YEARLY) {
		repeatNode.setAttribute("label", REMINDER_FOX_REPEAT_LABEL_YEARLY);
	}
	else
		if (reminder.recurrence.type == reminderfox.consts.RECURRENCE_YEARLY_DAY) {
			repeatNode.setAttribute("label", REMINDER_FOX_REPEAT_LABEL_YEARLY_DAY);
		}
		else
			if (reminder.recurrence.type == reminderfox.consts.RECURRENCE_MONTHLY_DATE) {
				repeatNode.setAttribute("label", REMINDER_FOX_REPEAT_LABEL_MONTHLY);
			}
			else
				if (reminder.recurrence.type == reminderfox.consts.RECURRENCE_MONTHLY_DAY) {
					repeatNode.setAttribute("label", REMINDER_FOX_REPEAT_LABEL_MONTHLY_DAY);
				}
				else
					if (reminder.recurrence.type == reminderfox.consts.RECURRENCE_WEEKLY) {
						repeatNode.setAttribute("label", REMINDER_FOX_REPEAT_LABEL_WEEKLY);
					}
					else
						if (reminder.recurrence.type == reminderfox.consts.RECURRENCE_DAILY) {
							repeatNode.setAttribute("label", REMINDER_FOX_REPEAT_LABEL_DAILY);
						}
						else {
							repeatNode.setAttribute("label", REMINDER_FOX_REPEAT_LABEL_NONE);
						}

	// update complete
	var isCompleted = reminderfox.core.isCompletedForDate(reminder, reminderInstanceDate);
	if (isCompleted) {
		completeNode.setAttribute("src", reminderfox.consts.COMPLETED_IMAGE);

		if (useDefaultDate) {
			var monthAsText = reminderfox.date.getMonthAsText(reminder.completedDate.getMonth());
			completedDateNode.setAttribute("label", monthAsText + " " + reminder.completedDate.getDate());
		}
		else {
			completedDateNode.setAttribute("label", reminderFox_getDateVariableString(reminder, reminder.completedDate));
		}
	}
	else {
		completeNode.removeAttribute("src");
		completedDateNode.removeAttribute("label");
	}

	if (reminder.endDate != null) {
		var monthAsText = reminderfox.date.getMonthAsText(reminder.endDate.getMonth());
		if (useDefaultDate) {
			endDateNode.setAttribute("label", monthAsText + " " + reminder.endDate.getDate());
		}
		else {
			endDateNode.setAttribute("label", reminderFox_getDateVariableString(reminder, reminder.endDate));
		}
	}
	else {
		endDateNode.removeAttribute("label");
	}

	// update remind until complete
	if (reminder.remindUntilCompleted != reminderfox.consts.REMIND_UNTIL_COMPLETE_NONE) {
		setRemindUntilCompleteColumn(reminder, remindUntilCompleteNode);
	}
	else {
		remindUntilCompleteNode.removeAttribute("src");
	}

	if (reminder.notes != null) {
		//  notesNode.setAttribute("properties", "notes");
		notesNode.setAttribute("src", reminderfox.consts.NOTES_IMAGE);
	}
	else {
		notesNode.removeAttribute("src");
		//notesNode.removeAttribute("properties");
	}

	if (reminder.alarm != null) {
		if (reminder.snoozeTime != null && !isCompleted) {
			alarmNode.setAttribute("src", reminderfox.consts.ALARM_SNOOZE_IMAGE);
		}
		else {
			alarmNode.setAttribute("src", reminderfox.consts.ALARM_IMAGE);
		}
	}
	else {
		alarmNode.removeAttribute("src");
	}

	if (reminder.categories != null) {
		categoryNode.setAttribute("label", reminder.categories);
	}
	else {
		categoryNode.removeAttribute("label");
	}

	if (mailNode != null) {
		if (reminderfox.core.isMailEvent(reminder)) {
			mailNode.setAttribute("src", reminderfox.consts.MAIL_IMAGE);
		}
		else {
			mailNode.removeAttribute("src");
		}
	}
}






function updateInListTodo(todo){
	var treeChildren = document.getElementById("todo_treechildren");
	var treeitems = treeChildren.childNodes;
	for (var i = 0; i < treeitems.length; i++) {
		var selectedTreeItem = treeitems[i];
		var row = selectedTreeItem.childNodes[0];
		var reminderRefId = row.getAttribute(REMINDER_FOX_ID_REF);
		if (reminderRefId == todo.id) {
			var dateNode = selectedTreeItem.childNodes[0].childNodes[0];
			var descriptionNode = selectedTreeItem.childNodes[0].childNodes[1];
			var timeNode = selectedTreeItem.childNodes[0].childNodes[2];
			var completedDateNode = selectedTreeItem.childNodes[0].childNodes[3];
			var completeNode = selectedTreeItem.childNodes[0].childNodes[4];
			var showInTooltipNode = selectedTreeItem.childNodes[0].childNodes[5];
			var notesNode = selectedTreeItem.childNodes[0].childNodes[6];
			var alarmNode = selectedTreeItem.childNodes[0].childNodes[7];
			var categoryNode = selectedTreeItem.childNodes[0].childNodes[8];
			var endDateNode = selectedTreeItem.childNodes[0].childNodes[9];
			var mailNode = selectedTreeItem.childNodes[0].childNodes[10];

			if (todo.date != null) {
				var monthAsText = reminderfox.date.getMonthAsText(todo.date.getMonth());
				if (useDefaultDate) {
					dateNode.setAttribute("label", monthAsText + " " + todo.date.getDate());
				}
				else {
					dateNode.setAttribute("label", reminderFox_getDateVariableString(todo, todo.date));
				}

				if (todo.allDayEvent) {
					timeNode.setAttribute("label", REMINDER_FOX_TIME_ALL_DAY_LABEL);
				}
				else {
					var time = reminderFox_getAddTimeString(todo);
					if (time == null) {
						timeNode.setAttribute("label", REMINDER_FOX_TIME_ALL_DAY_LABEL);
					}
					else {
						timeNode.setAttribute("label", time);
					}
				}
			}
			else {
				dateNode.removeAttribute("label");
				timeNode.removeAttribute("label");
			}

			if (todo.endDate != null) {
				var monthAsText = reminderfox.date.getMonthAsText(todo.endDate.getMonth());
				if (useDefaultDate) {
					endDateNode.setAttribute("label", monthAsText + " " + todo.endDate.getDate());
				}
				else {
					endDateNode.setAttribute("label", reminderFox_getDateVariableString(todo, todo.endDate));
				}
			}
			else {
				endDateNode.removeAttribute("label");
			}



			// update description
			todo = reminderfox.core.processReminderDescription(todo, new Date().getFullYear(), true);
			descriptionNode.setAttribute("label", todo.summary);

			// update importance
			var isImportant = false;
			if (todo.priority == reminderfox.consts.PRIORITY_IMPORTANT) {
				// mark the description as important (red-highlighted)
				descriptionNode.setAttribute("properties", "important");
				isImportant = true;
			}
			else {
				descriptionNode.removeAttribute("properties");
			}

			// update show in tooltip
			if (todo.completedDate != null) {
				completeNode.setAttribute("src", reminderfox.consts.COMPLETED_TODO_IMAGE);

				if (isImportant) {
					descriptionNode.setAttribute("properties", "imporantCompleteText");
				}
				else {
					descriptionNode.setAttribute("properties", "completeText");
				}


				if (useDefaultDate) {
					var monthAsText = reminderfox.date.getMonthAsText(todo.completedDate.getMonth());
					completedDateNode.setAttribute("label", monthAsText + " " + todo.completedDate.getDate());
				}
				else {
					completedDateNode.setAttribute("label", reminderFox_getDateVariableString(todo, todo.completedDate));
				}

			}
			else {
				if (isImportant) {
								//descriptionNode.setAttribute("properties", "imporantCompleteText");
					// mark the date and description as important (red-highlighted)
					//dateNode.setAttribute("properties", "important");
				}
				else {
					descriptionNode.removeAttribute("properties"); // completed setatus?
				}
				completeNode.removeAttribute("src");
				completedDateNode.removeAttribute("label");
			}

			// update show in tooltip
			if (todo.showInTooltip) {
				showInTooltipNode.setAttribute("src", reminderfox.consts.SHOW_IN_TOOLTIP_IMAGE);
			}
			else {
				showInTooltipNode.removeAttribute("src");
			}

			if (todo.notes != null) {
				notesNode.setAttribute("src", reminderfox.consts.NOTES_IMAGE);
			}
			else {
				notesNode.removeAttribute("src");
			}

			if (todo.alarm != null) {
				if (todo.snoozeTime != null && todo.completedDate == null) {
					alarmNode.setAttribute("src", reminderfox.consts.ALARM_SNOOZE_IMAGE);
				}
				else {
					alarmNode.setAttribute("src", reminderfox.consts.ALARM_IMAGE);
				}
			}
			else {
				alarmNode.removeAttribute("src");
			}

			if (todo.categories != null) {
				categoryNode.setAttribute("label", todo.categories);
			}
			else {
				categoryNode.removeAttribute("label");
			}

			if (mailNode != null) {
				if (reminderfox.core.isMailEvent(todo)) {
					mailNode.setAttribute("src", reminderfox.consts.MAIL_IMAGE);
				}
				else {
					mailNode.removeAttribute("src");
				}
			}
			break;
		}
	}


	//2014-02-26  would crash rmFx/app if todo has no date
    var setDate = new Date();
    if (todo.date) setDate = todo.date
    reminderfox.calendar.dateArray.EventUpdate (setDate);

	modifiedReminders();
}


function refreshCalendar(keepReminderArray, keepTodoArray){
	if (!keepReminderArray) {
		calendarReminderArray = null;
	}
	if (!keepTodoArray) {
		calendarTodoArray = null;
	}
	reminderfox.calendar.ui.selectDay();
}


function toggleShowInTooltipTodo(currentTodo){

	if (currentTodo != null) {
		var selectedTodos = {};
		selectedTodos[0] = currentTodo;
		var num = 1;
	} else {
		var selectedTodos = getAllSelectedTodos();
		var num = selectedTodos.length;
	}

	for (var i = 0; i < num; i++) {
		currentTodo = selectedTodos[i];
		currentTodo.showInTooltip = !currentTodo.showInTooltip;
		updateInListTodo(currentTodo);
	}
	reminderfox.core.numDaysModelAdd(currentTodo, 'numDaysTodos');
	refreshCalendar(true, false);
	modifiedReminders();
}


function toggleRemindUntilCompleted(reminder){

	if (reminder) {
		var selectedReminders = {};
		selectedReminders[0] = reminder;
		var num = 1;
	} else {
		var selectedReminders = getAllSelectedReminders();
		var num = selectedReminders.length;
	};
	var todaysDate = new Date();

	for (var i = 0; i < num; i++) {
		var currentReminder = selectedReminders[i];
		var cleanUpReminderInList = false;

		// NON recurring events are handled here
		if (currentReminder.recurrence.type == null) {
			if (currentReminder.remindUntilCompleted == reminderfox.consts.REMIND_UNTIL_COMPLETE_NONE) {
				if (reminderfox.core.compareDates(currentReminder.date, todaysDate) == -1) { // -1: date is in the past
					currentReminder.remindUntilCompleted = reminderfox.consts.REMIND_UNTIL_COMPLETE_MARKED;  /*2*/
					cleanUpReminderInList = true;
				}
				else {
					currentReminder.remindUntilCompleted = reminderfox.consts.REMIND_UNTIL_COMPLETE_TO_BE_MARKED; /*1*/
				}
			}
			else { // clear RUC
				currentReminder.remindUntilCompleted = reminderfox.consts.REMIND_UNTIL_COMPLETE_NONE;
				cleanUpReminderInList = true;
			}
		}

		//  recurring events are handled here
		else {
			if (currentReminder.remindUntilCompleted == reminderfox.consts.REMIND_UNTIL_COMPLETE_NONE) {
				if (reminderfox.core.compareDates(currentReminder.date, todaysDate) == -1) { // -1: date is in the past
					currentReminder.remindUntilCompleted = reminderfox.consts.REMIND_UNTIL_COMPLETE_MARKED;  /*2*/
					cleanUpReminderInList = true;
				}
				else {
					currentReminder.remindUntilCompleted = reminderfox.consts.REMIND_UNTIL_COMPLETE_TO_BE_MARKED; /*1*/
				}
			}
			else { // clear RUC
				currentReminder.remindUntilCompleted = reminderfox.consts.REMIND_UNTIL_COMPLETE_NONE;
				cleanUpReminderInList = true;
			}

		}
		/*-------------------
		else {
			if (currentReminder.remindUntilCompleted == reminderfox.consts.REMIND_UNTIL_COMPLETE_NONE) {
				currentReminder.remindUntilCompleted = reminderfox.consts.REMIND_UNTIL_COMPLETE_TO_BE_MARKED;
			}
			else
				if (currentReminder.remindUntilCompleted == reminderfox.consts.REMIND_UNTIL_COMPLETE_TO_BE_MARKED) {
					currentReminder.remindUntilCompleted = reminderfox.consts.REMIND_UNTIL_COMPLETE_NONE;
				}
				else
					if (currentReminder.remindUntilCompleted == reminderfox.consts.REMIND_UNTIL_COMPLETE_MARKED) {
						currentReminder.remindUntilCompleted = reminderfox.consts.REMIND_UNTIL_COMPLETE_NONE;
						cleanUpReminderInList = true;
					}
		} -----------*/


		updateInListReminder(currentReminder);
		// if this is a remote calendar event go to sync it
		rmFx_CalDAV_UpdateReminder (currentReminder)
		modifiedReminders();

		// if is was marked as RemindUntilCompleted and was showing in the list at a later date, we  need to remove this from the
		// UI list back to its original location
		if (cleanUpReminderInList) {
			removeUIListItemReminder(currentReminder);
			createUIListItemReminder(currentReminder);
			reminderfox.core.lastEvent = currentReminder;
		}
	}
	refreshCalendar(false, true);
};


/**
 * Toggle a reminder as complete. Handles calls from List and Calendar.
 * From List the row details are used -- no passed parameters,
 * from Calendar the reminder and the currently selected day are passed
 * @param reminder {object} passed reminder
 * @param currentDateNum {integer} date as num-value
 */
function toggleMarkAsComplete(orgReminder, currentDateNum){

	if (orgReminder) {	// from Calendar
		var currentReminder = reminderfox.core.cloneReminderFoxEvent (orgReminder);
		var reminderInstanceDate = reminderfox.date.convertDate(currentDateNum);
		currentReminder = toggleMarkAsComplete_(currentReminder, reminderInstanceDate);

	} else {  // from LIST
		var treeChildren = document.getElementById("treechildren");

		var start = new Object();
		var end = new Object();
		var numRanges = document.getElementById("reminderTree").view.selection.getRangeCount();

		for (var t = 0; t < numRanges; t++) {  // process all selected events
			document.getElementById("reminderTree").view.selection.getRangeAt(t, start, end);

			for (var v = start.value; v <= end.value; v++) {  // process all occurrances
				var selectedTreeItem = treeChildren.childNodes[v];

				var reminderRefId = selectedTreeItem.childNodes[0].getAttribute(REMINDER_FOX_ID_REF);
				var currentReminder = reminderfox.core.getRemindersById(reminderRefId, getCurrentReminderList());

				if (currentReminder != null) {
					var reminderDateTime = selectedTreeItem.childNodes[0].getAttribute(REMINDER_FOX_DATE_REF);
					var reminderInstanceDate = new Date(parseInt(reminderDateTime));

					currentReminder = toggleMarkAsComplete_(currentReminder, reminderInstanceDate)

				}	// currentReminder != null
			}	  // process all occurrances
		}  // process all selected events
	} // from LIST
//gW	refreshCalendar(false, true);

	// if this is a remote calendar event go to sync it
	rmFx_CalDAV_UpdateReminder (currentReminder)
	modifiedReminders();
};


function toggleMarkAsComplete_(currentReminder, reminderInstanceDate) {

	if (reminderfox.core.isCompletedForDate(currentReminder, reminderInstanceDate)) {
		currentReminder.completedDate = null;
	}
	else {
		var todaysDate = new Date();
		// if it's a one time reminder just use today's date
		if (currentReminder.recurrence.type == reminderfox.consts.RECURRENCE_ONETIME) {
			currentReminder.completedDate = todaysDate;
		}
		else {
			var compare = reminderfox.core.compareDates(reminderInstanceDate, todaysDate);
			if (compare >= 0) { // if reminder is today or in the future, just use that instance date
				currentReminder.completedDate = reminderInstanceDate;
			}
			else {
				// if we mark a repeating guy as complete and the next instance is in the future, then use today's date as the complete
				// date, and not the occurrence.
				var currentInstanceDate = new Date(reminderInstanceDate.getFullYear(), reminderInstanceDate.getMonth(), reminderInstanceDate.getDate(), reminderInstanceDate.getHours(), reminderInstanceDate.getMinutes());
				currentInstanceDate.setDate(currentInstanceDate.getDate() + 1);
				var nextReminderInstance = reminderfox.core.getFirstReminderOccurrenceAfterStartDate(currentReminder, currentInstanceDate);
				var compare = reminderfox.core.compareDates(nextReminderInstance.date, todaysDate);
				if (compare == 1) { // if today's date is greater than instance, use today
					currentReminder.completedDate = todaysDate;
				}
				else {
					// if today's date is less than or equal to the reminder instance's date, then use the reminder's date
					currentReminder.completedDate = reminderInstanceDate;
				}
			}
		}

		// if reminder is marked as Remind Until Complete, clear it (if one-time, clear the RUC completely;
		// if a repeating reminder, simply change back to RUC-marked)  and update the reminder
		//  in the list (as the current reminder instance may be removed)
		if (currentReminder.recurrence.type == reminderfox.consts.RECURRENCE_ONETIME &&
			(currentReminder.remindUntilCompleted == reminderfox.consts.REMIND_UNTIL_COMPLETE_TO_BE_MARKED ||
			currentReminder.remindUntilCompleted == reminderfox.consts.REMIND_UNTIL_COMPLETE_MARKED)) {

			selectCalendarSync = false;
			toggleRemindUntilCompleted();
			modifiedReminders();
			selectCalendarSync = true;
		}
		else {
			if (currentReminder.remindUntilCompleted == reminderfox.consts.REMIND_UNTIL_COMPLETE_MARKED) {
				selectCalendarSync = false;
				currentReminder.remindUntilCompleted = reminderfox.consts.REMIND_UNTIL_COMPLETE_TO_BE_MARKED;
				updateInListReminder(currentReminder);
				modifiedReminders();

				// if is was marked as RemindUntilCompleted and was showing in the list at a later date, we  need
				// to remove this from the UI list back to its original location
				removeUIListItemReminder(currentReminder);
				createUIListItemReminder(currentReminder);
				selectCalendarSync = true;
			}
		}
	}
	updateInListReminder(currentReminder);

	reminderfox.core.numDaysModelAdd(currentReminder, (reminderfox_isReminderTabSelected() ? 'numDaysEvents' : 'numDaysTodos'));
	sortReminderIfNeccessary(currentReminder.id);

	return currentReminder;
};


function toggleMarkAsCompleteTodo(currentTodo, currentDateNum){

	if (currentTodo != null) {
		var selectedTodos = {};
		selectedTodos[0] = currentTodo;
		var num = 1;
	} else {
		var selectedTodos = getAllSelectedTodos();
		var num = selectedTodos.length;
	}

	for (var i = 0; i < num; i++) {
		currentTodo = selectedTodos[i];
		if (currentTodo.completedDate != null) {
			currentTodo.completedDate = null;
		}
		else {
			currentTodo.completedDate = new Date();
		}
		updateInListTodo(currentTodo);
		sortTodoIfNeccessary(currentTodo.id);
	}
//	reminderfox.core.lastEvent = currentTodo;  //remember reminder to update dateNum array
	reminderfox.core.numDaysModelAdd(currentTodo, (reminderfox_isReminderTabSelected() ? 'numDaysEvents' : 'numDaysTodos'));

	rmFx_CalDAV_UpdateReminder (currentTodo)

	refreshCalendar(true, false);
	modifiedReminders();
}


function reminderfox_revertActions(){
	var currentDate = reminderfox.datePicker.gSelectedDate;

	var revertReminders = true;
	var revertTodos = true;

	reminderfox.core.getReminderEvents(true /*clear*/);

	removeAllListItems(revertReminders, revertTodos);
	calendarReminderArray = null; // null out in case reminder columns are sorted
	calendarTodoArray = null;

	reminderfox.datePicker.gSelectedDate = currentDate;
	refreshCalendar();

	// gray out the revert buttons
	reminderfoxModifyButtons (false);
}


function refillLists(){
	var revertReminders;
	var revertTodos;

	if (reminderfox_isReminderTabSelected()) {
		revertReminders = true;
		revertTodos = false;
	}
	else {
		revertReminders = false;
		revertTodos = true;
	}

	removeAllListItems(revertReminders, revertTodos);
//	fillList(revertReminders, revertTodos);
	// refreshCalendar calls reminderfox.calendar.ui.selectDay(); with fillList
	refreshCalendar();
}


function sortcolumn(column){
	var name = column.getAttribute("id");

	// get current tab name....
	var tabName = reminderfox.tabInfo.tabName;

	// get hashmap - check for tabname
	var sortInfo = listSortMap[tabName];
	if (sortInfo == null) {
		// if not there -= then set this tabname-->{column, 0} (ascending)
		listSortMap[tabName] = {
			sortColumn: name,
			sortDirection: reminderfox.consts.SORT_DIRECTION_ASCENDING
		};
	}
	else {
		if (sortInfo.sortColumn == name) {
			// same column -- increase sortDir
			if (sortInfo.sortDirection == reminderfox.consts.SORT_DIRECTION_ASCENDING) {
				listSortMap[tabName] = {
					sortColumn: name,
					sortDirection: reminderfox.consts.SORT_DIRECTION_DESCENDING
				};
			}
			else {
				//  if desc--> then increase and REMOVE entry
				listSortMap[tabName] = null;
			}
		}
		else {
			// new column
			listSortMap[tabName] = {
				sortColumn: name,
				sortDirection: reminderfox.consts.SORT_DIRECTION_ASCENDING
			};
		}
	}

	if (reminderfox_isReminderTabSelected()) {
		removeAllListItems(true, false);
		fillList(true, false);
	}
	else {
		removeAllListItems(false, true);
		fillList(false, true);
	}
}


function isTabSorted(info){
reminderfox.util.Logger('calndrGrid', " isTabSorted    info: " + info)
	var tabName = reminderfox.tabInfo.tabName;

	// get hashmap - check for tabname
	if (listSortMap == null) return false;

	var sortInfo = listSortMap[tabName];
	if (sortInfo != null) {
		return true;
	}
	else {
		return false;
	}
}


function isTodoTabSorted(){
	var tabName = reminderfox.tabInfo.tabName;

	// get hashmap - check for tabname
	var sortInfo = listSortMap[tabName];
	if (sortInfo != null) {
		return true;
	}
	else {
		return false;
	}
}


function fillListSortTodos(){
	var tabName = reminderfox.tabInfo.tabName;

	clearAllSortColumns();
	var column = document.getElementById(listSortMap[tabName].sortColumn);

	if (listSortMap[tabName].sortDirection == reminderfox.consts.SORT_DIRECTION_ASCENDING) {
		column.setAttribute("sortDirection", "ascending");
	}
	else {
		column.setAttribute("sortDirection", "descending");
	}

	var todos = getCurrentTodoList();

	var sortedArray;
	var unsortedArray = new Array();

	var filtersType = document.getElementById("rmFx-filters-type");
	if (filtersType != null && filtersType.selectedIndex > 0) {
		var todaysDate = new Date();
		var monthArray, dayReminderArray;
		var monthIndex, dayIndex, reminderIndex;
		for (monthIndex = 0; monthIndex < 12; monthIndex++) {
			monthArray = calendarTodoArray[monthIndex];
			if (monthArray != null) {
				for (dayIndex = 0; dayIndex < 31; dayIndex++) {
					dayReminderArray = monthArray[dayIndex];
					if (dayReminderArray != null) {
						for (reminderIndex = 0; reminderIndex < dayReminderArray.length; reminderIndex++) {
							unsortedArray[unsortedArray.length] = dayReminderArray[reminderIndex];
						}
					}
				}
			}
		}

		sortedArray = new Array(unsortedArray.length);
		for (var i = 0; i < unsortedArray.length; i++) {
			sortedArray[i] = unsortedArray[i];
			sortedArray[i].originalIndex = i;
		}
	}
	else {
		var sortedArray = new Array(todos.length);
		for (var i = 0; i < todos.length; i++) {
			sortedArray[i] = todos[i];
			sortedArray[i].originalIndex = i;
		}
	}

	reminderfox.core.quick_sort(sortedArray, listSortMap[tabName].sortColumn, listSortMap[tabName].sortDirection);

	removeAllListItems(false, true);

	var todaysDate = new Date();
	for (i = 0; i < sortedArray.length; i++) {
		createUIListItemTodo(sortedArray[i], false, todaysDate, false);
	}
	highlightTodo();
}


function fillListSortReminders(){
	var tabName = reminderfox.tabInfo.tabName;
	var sortColumn = listSortMap[tabName].sortColumn
	var calDAVaccounts = reminderfox.calDAV.getAccounts()

	clearAllSortColumns();
	var column = document.getElementById(sortColumn);

	if (column == null) return;		//gW2013-05-18 if column is unkown/wrong the whole Main dialog will not be rendered

	if (listSortMap[tabName].sortDirection == reminderfox.consts.SORT_DIRECTION_ASCENDING) {
		column.setAttribute("sortDirection", "ascending");
	}
	else {
		column.setAttribute("sortDirection", "descending");
	}

	removeAllListItems(true, false);
	if (calendarReminderArray == null) {
		createCalendarReminderArray();
	}
	var unsortedArray = new Array();
	var monthArray, dayReminderArray;
	var monthIndex, dayIndex, reminderIndex;
	for (monthIndex = 0; monthIndex < 12; monthIndex++) {
		monthArray = calendarReminderArray[monthIndex];
		if (monthArray != null) {
			for (dayIndex = 0; dayIndex < 31; dayIndex++) {
				dayReminderArray = monthArray[dayIndex];
				if (dayReminderArray != null) {
					for (reminderIndex = 0; reminderIndex < dayReminderArray.length; reminderIndex++) {
						//createUIListReminderItemSorted(dayReminderArray[reminderIndex]);
						unsortedArray[unsortedArray.length] = dayReminderArray[reminderIndex];
					}
				}
			}
		}
	}


	var sortedArray = new Array(unsortedArray.length);
	for (var i = 0; i < unsortedArray.length; i++) {
		sortedArray[i] = unsortedArray[i];
		sortedArray[i].originalIndex = i;
	}

	var todaysDate = new Date();
	reminderfox.core.quick_sort(sortedArray, listSortMap[tabName].sortColumn, listSortMap[tabName].sortDirection);
	for (i = 0; i < sortedArray.length; i++) {
		createUIListReminderItemSorted(sortedArray[i], todaysDate);
	}
}


function clearAllSortColumns(){
	// clear reminder columns
	if (reminderfox_isReminderTabSelected()) {
		document.getElementById("dateColLabel").removeAttribute("sortDirection");
		document.getElementById("descColLabel").removeAttribute("sortDirection");
		document.getElementById("timeColLabel").removeAttribute("sortDirection");
		document.getElementById("dateCompleted").removeAttribute("sortDirection");
		document.getElementById("repeatColLabel").removeAttribute("sortDirection");
		document.getElementById("completeColLabel").removeAttribute("sortDirection");
		document.getElementById("remindUntilCompletedColLabel").removeAttribute("sortDirection");
		document.getElementById("notesColLabel").removeAttribute("sortDirection");
		document.getElementById("alarmColLabel").removeAttribute("sortDirection");
		document.getElementById("mailColLabel").removeAttribute("sortDirection");
		document.getElementById("catColLabel").removeAttribute("sortDirection");
		document.getElementById("endDateColLabel").removeAttribute("sortDirection");
		document.getElementById("calDAVcolLabel").removeAttribute("sortDirection");
	}
	else {
		// clear todo columns
		document.getElementById("todoDateColLabel").removeAttribute("sortDirection");
		document.getElementById("todoDescColLabel").removeAttribute("sortDirection");
		document.getElementById("todoDateCompleted").removeAttribute("sortDirection");
		document.getElementById("todoCompleteColLabel").removeAttribute("sortDirection");
		document.getElementById("todoShowInTooltip").removeAttribute("sortDirection");
		document.getElementById("todoTimeColLabel").removeAttribute("sortDirection");
		document.getElementById("todoAlarmColLabel").removeAttribute("sortDirection");
		document.getElementById("todoNotesColLabel").removeAttribute("sortDirection");
		document.getElementById("todoMailColLabel").removeAttribute("sortDirection");
		document.getElementById("todoCatColLabel").removeAttribute("sortDirection");
		document.getElementById("todoEndDateColLabel").removeAttribute("sortDirection");
	}
}


function sortTodoIfNeccessary(todoID){
	if (isTabSorted('sortTodoIfNeccessary')) {			//  in sortTodoIfNeccessary
		removeAllListItems(false, true);
		fillList(false, true);
	}


	var todoName;

	var tab = reminderfox.tabInfo.tabName;
	var tabID = reminderfox.tabInfo.tabID;
	var tabIndex = reminderfox.tabInfo.tabIndex;

	var index = tabID.indexOf(':');
	name = tabID.substring(index + 1, tabID.length);

	if (tabIndex <= 1 || index == -1) {
		name = reminderfox.consts.DEFAULT_TODOS_CATEGORY;
	}

	selectTodoById(name, todoID);
}


function sortReminderIfNeccessary(reminderID){
	if (isTabSorted('sortReminderIfNeccessary')) {		// in  sortReminderIfNeccessary
		removeAllListItems(true, false);
		calendarReminderArray = null;
		fillList(true, false);
		selectReminderById(reminderID);
	}
}


function getCurrentTodoListOrALL(){	// NOT USED with current version 1.9.9.5.x
	var todosArr = reminderfox.core.getReminderTodos();

	var tabName = reminderfox.tabInfo.tabName;
	var tabID = reminderfox.tabInfo.tabID;
	var tabIndex = reminderfox.tabInfo.tabIndex;

	var index = tabID.indexOf(':');
	name = tabID.substring(index + 1, tabID.length);

	if (tabName.label != "&ALLTODO") {
		var index = tabID.indexOf(':');
		if (tabIndex <= 1 || index == -1) {
			name = reminderfox.consts.DEFAULT_TODOS_CATEGORY;
		}
		else {
			name = tabID.substring(index + 1, tabID.length);
		}
		var todos = todosArr[name];
		if (todos == null) {
			todos = new Array();
			todosArr[name] = todos;
		}
		return todos;
	}
	else {

		// this is a test to get all Todo's/Lists into ONE todo list named "&ALLTODO"
		var cArray = new Array();
		for (var indexList = 1; indexList < tabList.children.length; indexList++) {
			tabName = tabList.children[indexList];
			index = tabName.id.indexOf(':');
			if (indexList == 1) {
				iName = "ToDo's";
			}
			else {
				iName = tabName.id.substring(index + 1, tabName.id.length);
			}
			if (iName != "&ALLTODO") {
				var cLen = cArray.length;
				for (var indexSub = 0; indexSub < todosArr[iName].length; indexSub++) {
					cArray[cLen] = todosArr[iName][indexSub];
					cLen++;
				}
			}
		}
		return cArray;
	}
}
