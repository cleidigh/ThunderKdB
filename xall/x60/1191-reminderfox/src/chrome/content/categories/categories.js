
if(!reminderfox) var reminderfox={};
if(!reminderfox.category) reminderfox.category = {};


/**
 * Add/delete a category item selected from pulldown menu and
 * modify the "inputRmCategories" box;
 * the 'inputRmCategories' box is read by 'addReminderDialog.js'
 */
reminderfox.category.Set = function (event){
	var selectCat = event.label.replace(/,/g, "\\,");
	var aSelectCat = [selectCat];
	var inputCat = reminderfox.category.Clean(document.getElementById('inputRmCategories').value);
	var aInputCat = reminderfox.category.Array(inputCat);

	// includes the input string the selected string?
	if (aInputCat.indexOf(selectCat) == -1) {
		aSelectCat = aSelectCat.concat(aInputCat);
	}
	else { // yes, so delete the string from input
		aSelectCat = aInputCat.filter(item => item !== selectCat);
	}
	document.getElementById('inputRmCategories').value = reminderfox.category.NoDup(aSelectCat.join(','));
};


/**
 * Add the current perfs-categories to the pull-down-menu
 */
reminderfox.category.Setup = function (){
	var newItem;

	var itemTextbox = document.getElementById('inputRmCategories');
	var itemCur = itemTextbox.value;

	var curCatArray = reminderfox.category.Array(itemCur);
	var cCount = curCatArray.length;

	/* first we delete all cat-items categories, hold the 'manage-menuitem' */

	var mList = document.getElementById('categories-menupopup');
	var count = mList.childNodes.length;

	while (count--) {
		var child = mList.childNodes[count];
		if (child.getAttribute("value") != 3) {
			mList.removeChild(mList.childNodes[count]);
		}
	}
	var m1 = document.createElement("menuseparator");
	(mList.insertBefore(m1, mList.childNodes[0]));

	/* read both categories 'user' and 'standard' from prefs */
	// -- first add the 'standard' cat-items --
	var rmCategoriesStandard = reminderfox.core.readCategories2prefs();
	var catArray = reminderfox.category.Array(rmCategoriesStandard);
	var count2 = catArray.length;
	var mCount = count2 + 1; /* rem the pos for 'user' items */
	while (count2--) {
		m1 = document.createElement("menuitem");
		newItem = reminderfox.util.trim(catArray[count2]);
		// apply parameters
		m1.setAttribute("type", "checkbox");
		m1.setAttribute("value", "2");
		m1.addEventListener("command", function() {reminderfox.category.Set(this);},false);
		m1.setAttribute("label", newItem);

		for (var i = 0; i < cCount; i++) {
			if (newItem.toLowerCase() == reminderfox.util.trim(curCatArray[i].toLowerCase())) {
				m1.setAttribute("checked", true);
			}
		}
		// insert the new element into the DOM before node 0
		(mList.insertBefore(m1, mList.childNodes[0]));
	}


	m1 = document.createElement("menuseparator");
	(mList.insertBefore(m1, mList.childNodes[mCount]));

	// -- second we add the 'user' cat-items --
	catArray = reminderfox.category.GetUsers();

	count2 = catArray.length;

	while (count2--) {
		newItem = reminderfox.util.trim(catArray[count2]);
		if (newItem != "") {
			var checkCat = false;
			m1 = document.createElement("menuitem");
			// apply parameters
			m1.setAttribute("type", "checkbox");
			m1.setAttribute("value", "1");
			m1.addEventListener("command", function() {reminderfox.category.Set(this);},false);
			m1.setAttribute("label", newItem);
			for (var j = 0; j < cCount; j++) {
				if (newItem.toLowerCase() == reminderfox.util.trim(curCatArray[j].toLowerCase())) {
					m1.setAttribute("checked", true);
				}
			}
			// insert the new element into the DOM before node 0
			(mList.insertBefore(m1, mList.childNodes[mCount]));
		}
	}
};

/**
 *  go through all reminders and todos and get all referenced categories that are not defined
 *  in the standard categories
 */
reminderfox.category.GetUsers = function(){
	var reminders;
	var _todosArray;
	var reminderFoxListWindow = reminderfox.util.getWindow("window:reminderFoxEdit");
	// get reminders and todos model from the list window if possible - this allows you to get the latest categories even if not yet saved to
	// the ics file yet
	if (reminderFoxListWindow) {
		reminders = reminderFoxListWindow.reminderfox.core.getReminderEvents();
		_todosArray = reminderFoxListWindow.reminderfox.core.getReminderTodos();
	}
	else {
		reminders = reminderfox.core.getReminderEvents();
		_todosArray = reminderfox.core.getReminderTodos();
	}

	var currentReminderCategories, category;
	var rmCategoriesStandard = reminderfox.core.readCategories2prefs();
	var rmCatMainArray = reminderfox.category.Array(rmCategoriesStandard);
	var userCategories = [];
	var n, i, j;
	for (i = 0; i < reminders.length; i++) {
		if (reminders[i].categories != null && reminders[i].categories != "") {
			currentReminderCategories = reminderfox.category.Array(reminders[i].categories);
			for (j = 0; j < currentReminderCategories.length; j++) {
				category = currentReminderCategories[j];
				if (!reminderfox.category.ContainedInList(rmCatMainArray, category)) {
					// add unique category to list (but only if not it default categories)
					if (!reminderfox.category.ContainedInList(userCategories, category)) {
						userCategories[userCategories.length] = category;
					}
				}
			}
		}
	}
	// now search the todo's as well
	for (n in _todosArray) {
		var reminderTodos = _todosArray[n];
		for (i = 0; i < reminderTodos.length; i++) {
			if (reminderTodos[i].categories != null && reminderTodos[i].categories != "") {
				currentReminderCategories = reminderfox.category.Array(reminderTodos[i].categories);
				for (j = 0; j < currentReminderCategories.length; j++) {
					category = currentReminderCategories[j];
					if (!reminderfox.category.ContainedInList(rmCatMainArray, category)) {
						// add unique category to list (but only if not it default categories)
						if (!reminderfox.category.ContainedInList(userCategories, category)) {
							userCategories[userCategories.length] = category;
						}
					}
				}
			}
		}
	}
	return userCategories.sort();
};

/**
 * Checks a category item if part of a given list
 * @return {boolean}
 */
reminderfox.category.ContainedInList = function(existingList, userCategory){
	for (var j = 0; j < existingList.length; j++) {
		if (reminderfox.util.trim(existingList[j].toLowerCase()) == reminderfox.util.trim(userCategory.toLowerCase())) {
			return true;
		}
	}
	return false;
};


reminderfox.category.NoDup = function(catA){
	var n;
	var catAA = reminderfox.category.Array(catA);
	var catB = ",";
	for (n = 0; n < catAA.length; n++) {
		if (catB.toLowerCase().indexOf(',' + reminderfox.util.escapeCommas(catAA[n].toLowerCase()) + ',') == -1) {
			catB += reminderfox.util.escapeCommas(catAA[n]) + ',';
		}
	}
	return reminderfox.category.Clean(catB);
};


reminderfox.category.Clean =function(str){ // lead-/trailing comma, single comma/spc
	return str.replace(/ \s*/g,' ').replace(/,\,*/g,',').replace(/\s\ */g,'')
				 .replace(/[,]+$/, '').replace(/^[,]+/, '');
};


reminderfox.category.Array = function(categoriesString){
	if (!categoriesString) {
		return [];
	}
	// \u001A is the unicode "SUBSTITUTE" character
	function revertCommas(name){
		return name.replace(/\u001A/g, ",");
	}

	return categoriesString.replace(/\\,/g, "\u001A").split(",").map(revertCommas);
};


//================manageCategories=========================================

reminderfox.category.addOrEdit = null;

	/**
	 * Read 'main' and 'default' Categories , write to textboxes
	 * manageCategoriesOverlay.xul
	 * reminderFoxOptions.js
	 */

reminderfox.category.readDefault = function(){
	/*read both categories 'user' and 'main' from prefs */
	var rmCategoriesStandard = reminderfox.core.readCategories2prefs();

	// --  'main' cat-items --
	var mainCatBox = document.getElementById('mainCatBox');	// richlistbox   richlistitem - OK
	var count = mainCatBox.childNodes.length;

	while (count--) {
		if (mainCatBox.childNodes[count].getAttribute("value") != 3) {
			mainCatBox.removeChild(mainCatBox.childNodes[count]);
		}
	}
	var catArray = reminderfox.category.Array(rmCategoriesStandard);
	var count2 = catArray.length;

	var rlbCategory;
	while (count2--) {
		rlItem = document.createElement("richlistitem");
		var labelItem = document.createElement("label");

		labelItem.setAttribute("label", reminderfox.util.trim(catArray[count2]));
		labelItem.setAttribute("value", reminderfox.util.trim(catArray[count2]));
		rlItem.appendChild(labelItem);
		mainCatBox.appendChild(rlItem);
	}
};


reminderfox.category.saveGroupsAndClose = function(){
	reminderfox.category.saveGroups();
	window.close();
};


reminderfox.category.saveGroups = function(mode){
	var mainCatBox = document.getElementById('mainCatBox');	// richlistbox   richlistitem  ???
	var count = mainCatBox.childNodes.length;

	var rmCategoriesStandard = "";
	for (var i = 0; i < count; i++) {
		if (mainCatBox.childNodes[i].label != "") {
			rmCategoriesStandard += reminderfox.util.escapeCommas(mainCatBox.childNodes[i].label) + ",";
		}
	}
	rmCategoriesStandard = reminderfox.category.Clean(rmCategoriesStandard);
	if (mode != null) {
		var catArray = reminderfox.category.Array(rmCategoriesStandard);
		if (mode == 'up') rmCategoriesStandard = catArray.sort().join(',');
		if (mode == 'down') rmCategoriesStandard = catArray.sort().reverse().join(',');
	}
	reminderfox.core.writeCategories2prefs(reminderfox.category.NoDup(rmCategoriesStandard));
};


reminderfox.category.readCurrentCategories= function(){
	/* delete all cat-items categories, then insert from prefs */

	// -- 'current' cat-items --
	var userCatBox = document.getElementById('userCatBox');	// richlistbox   richlistitem - OK
	var count = userCatBox.childNodes.length;

	while (count--) {
		if (userCatBox.childNodes[count].getAttribute("value") != 3) {
			userCatBox.removeChild(userCatBox.childNodes[count]);
		}
	}
	var catArray = reminderfox.category.GetUsers();
	var count2 = catArray.length;

	while (count2--) {
		var rlItem = document.createElement("richlistitem");
		var labelItem = document.createElement("label");

		labelItem.setAttribute("label", reminderfox.util.trim(catArray[count2]));
		labelItem.setAttribute("value", reminderfox.util.trim(catArray[count2]));
		rlItem.appendChild(labelItem);
		userCatBox.appendChild(rlItem);
	}
};


reminderfox.category.moveCategoryToDefaultList=function(){
	/* --------------------------------------
	  move seletecd catItem from
		  'user' to 'main' group
	 */
	var userCatBox = document.getElementById('userCatBox');	// richlistbox   richlistitem - OK
	var selectedItems = userCatBox.selectedItems;

	for (var i = selectedItems.length - 1; i >= 0; i--) {
		var selCatItem = selectedItems[i];
		var moveItem = selCatItem.label;
		userCatBox.removeChild(selCatItem);

		var m1 = window.opener.document.createElement("richlistitem");
		var labelItem = document.createElement("label");

		labelItem.setAttribute("label", moveItem);
		labelItem.setAttribute("value", moveItem);
		m1.appendChild(labelItem);

		var mainCatBox = window.opener.document.getElementById('mainCatBox');
		mainCatBox.insertBefore(m1, mainCatBox.childNodes[0]);
	}
	window.opener.reminderfox.category.saveGroups()
};



reminderfox.category.showAllCurrentCategories=function(){
	window.openDialog("chrome://reminderfox/content/categories/currentCategories.xul",
	"reminderFox-editAdd-categories", "chrome,resizable,modal");
};

reminderfox.category.mainCategoryListFocus=function(event){
	document.getElementById('sCatEdit').removeAttribute("disabled");
	document.getElementById('sCatDelete').removeAttribute("disabled");
	document.getElementById('reminderFox_cats_moveUp').removeAttribute("disabled");
	document.getElementById('reminderFox_cats_moveDown').removeAttribute("disabled");
};

reminderfox.category.go4Category=function(event){
	var editCat;
	reminderfox.category.addOrEdit = event.id;

	if (reminderfox.category.addOrEdit == "sCatEdit") {
		var mainCatBox = document.getElementById('mainCatBox');  // richlistbox   richlistitem - ???
		var selCatItem = mainCatBox.currentIndex;

		if (selCatItem == -1) {
			return;
		} /* no item selecetd */
		editCat = mainCatBox.childNodes[selCatItem].label;
	}
	else { /*  sCatAdd */
		editCat = "";
	}

	var callOptions = {
		eventID: reminderfox.category.addOrEdit,
		currentItem: editCat
	};
	window.openDialog("chrome://reminderfox/content/categories/addCategory.xul",
		"reminderFox-editAdd-categories", "chrome,resizable,modal", callOptions);

	var item = callOptions.currentItem;

	//function returnCategory(item){
		/* --------------------------------------------------
		 'item' has been send from Add/Edit Mask
		 Have to
		 -- check for duplicates in 'standard'-cat-item list
		 -- escape commas
		 Will new/added item push to top of list
		 */
		if (reminderfox.category.addOrEdit == "sCatEdit") {
			reminderfox.category.selectedCatItemDelete();
		}
		reminderfox.category.saveGroups();
		reminderfox.category.addOrEdit = "";
		reminderfox.core.writeCategories2prefs(reminderfox.category.NoDup(reminderfox.util.escapeCommas(item) +
			',' + reminderfox.core.readCategories2prefs()));
		reminderfox.category.readDefault();
	//}
};


/**
 * Categories sorting for 'Default'
 * @param mode		= 'up' or 'down'
 */
reminderfox.category.catSort=function(mode){
	if (!mode) mode = "";
	reminderfox.category.saveGroups(mode);
	reminderfox.category.readDefault();
};


reminderfox.category.selectedCatItemDelete=function(){
	var mainCatBox = document.getElementById('mainCatBox');  //richlistbox
	var selCatItem = mainCatBox.currentIndex;

	if ((selCatItem > -1)) {
		mainCatBox.removeChild(mainCatBox.childNodes[selCatItem]);
	}
};


reminderfox.category.manageCategory=function(){
// -----------------------------------------
	window.openDialog("chrome://reminderfox/content/categories/manageCategories.xul",
		"reminderFox-manage-categories", "chrome,resizable,modal");
};


reminderfox.category.goCategoryLoad=function() {
	reminderfox.category.addOrEdit = window.arguments[0].eventID;
	var cItem 	= window.arguments[0].currentItem;
	var catBoxInput = document.getElementById('categoryInput');
	if (reminderfox.category.addOrEdit == "sCatEdit") {
		catBoxInput.value = cItem;
		document.title = reminderfox.string("rf.EditCategory.title");
	}
	else {
		document.title = reminderfox.string("rf.AddCategory.title");
	}
	catBoxInput.focus();
};
