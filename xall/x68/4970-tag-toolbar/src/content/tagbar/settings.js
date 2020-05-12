var gTTBSetting;
var gTTBImportManager;

function initTTBSetting()
{
	TTBCSSManager.init();
	gTTBSetting = new TTBSetting();
	gTTBSetting.onLoad();
	gTTBImportManager = new TTBImportManager(gTTBSetting.catMgr);
}

//class TTBSettings
function TTBSetting()
{
	this.prefElems = [
		"TTBMaxNum",
		"TTBMaxRecentNum",
		"TTBAlwaysSmallIcon",
		"TTBInvalidateCache",
		"TTBRemCat",
		"TTBHideTagsHdr",
		"TTBCompReproduce",
		"TTBThreadStyle",
		"TTBThreadFgStyle",
		"TTBThreadStyleLightness"
	];
	this.catMgr = null;
	this.catsMenuIDs = new Array();
	this.pref = Components.classes["@mozilla.org/preferences-service;1"]
	  .getService(Components.interfaces.nsIPrefBranch);
//	document.getElementById("TTBCatList").
//	  inputField.addEventListener("change", this.renameSelectedCat, false);
	this.localeBundle = document.getElementById("TTBCatSetBundle");
	
	//delimiter for tags in category
	this.delimiter = gTTBPreferences.copyUnicharPref("ttb.cats.delimiter","");
	this.edittingCatOrder = false;
	this.delCats = new Array();
	
	document.getElementById("TTBCatOrder").
	  setAttribute("label",this.localeBundle.getString("tagbar.catset_edit_order_start"));
	document.getElementById("TTBTagListLabel").
	  setAttribute("value",this.localeBundle.getString("tagbar.catset_list1_tags_mode"));
	  
	var arg = window.arguments;
	var tabs = document.getElementById("tabs");
	var tabId = arg ? arg[0] : "settab";
	var tab = document.getElementById(tabId);
	tabs.selectedItem = tab;
	
	var windowMediator = Components.classes["@mozilla.org/appshell/window-mediator;1"].
													getService(Components.interfaces.nsIWindowMediator);
	this.parent = windowMediator.getMostRecentWindow("mail:3pane");
	if (window == this.parent) this.parent = null;
}

TTBSetting.prototype.verifyTextBoxForNum = function(target)
{
	var num = parseInt(target.value);
	if (isNaN(num) || num < 0) target.value = "1";
	else target.value = num.toString();
}

TTBSetting.prototype.cancelPrefs = function()
{
	return true;
}

TTBSetting.prototype.onLoad = function()
{
	this.catMgr = new TTBCategoryManager();
	this.delimiter = this.catMgr.delimiter;
	this.loadPrefs();
	this.buildCatList();
}

TTBSetting.prototype.defaultOpt = function()
{
	var elemNum = this.prefElems.length;
	for (var i=0; i<elemNum; i++) {
		var id = this.prefElems[i];
		var elem = document.getElementById(id);
		var type = elem.getAttribute("preftype");
		var localName = elem.localName;
		var defVal = elem.getAttribute("defaultpref");
		if (localName == "textbox" && type == "int") {
			elem.value = defVal;
		} else if (localName == "richlistbox" && type == "string") {
			elem.setAttribute("value", defVal);
		} else if (localName == "checkbox") {
			defVal = defVal == "true";
			if (defVal) elem.setAttribute("checked", true);
			else elem.removeAttribute("checked");
		} else if (localName == "menulist" && type == "int") {
			elem.value = defVal;
		}
	}
	//this.showColorSample(1 - document.getElementById("TTBThreadStyleAlpha").getAttribute("value"));
	this.showColorSample(null);
}

TTBSetting.prototype.loadPrefs = function()
{
	var elemNum = this.prefElems.length;
	for (var i=0; i<elemNum; i++) {
		var id = this.prefElems[i];
		var elem = document.getElementById(id);
		var type = elem.getAttribute("preftype");
		var localName = elem.localName;
		var prefStr = elem.getAttribute("prefstring");
		var defVal = elem.getAttribute("defaultpref");
		if (localName == "textbox" && type == "int") {
			var val = gTTBPreferences.getIntPref(prefStr, parseInt(defVal));
			elem.value = val.toString();
		}	else if (localName == "richlistbox" && type == "string") {
			var val = gTTBPreferences.copyUnicharPref(prefStr, defVal);
			//elem.value = val;
			elem.setAttribute("value", val);
		} else if (localName == "checkbox") {
			defVal = defVal == "true";
			var val = gTTBPreferences.getBoolPref(prefStr, defVal);
			if (val) elem.setAttribute("checked", true);
			else elem.removeAttribute("checked");
		} else if (localName == "menulist" && type == "int") {
			var val = gTTBPreferences.getIntPref(prefStr, parseInt(defVal));
			elem.value = val;			
		}
	}
	//this.showColorSample(1 - document.getElementById("TTBThreadStyleAlpha").getAttribute("value"));
	this.showColorSample(null);
}

TTBSetting.prototype.savePrefs = function() {
	//update categories
	if (this.edittingCatOrder) this.editCatOrder();
	this.setValueToCatMenuList();
	
	var delCatNum = this.delCats.length;
	for (var i=0; i<delCatNum; i++) {
		this.catMgr.removeCategory(this.delCats[i]);
	}
	
	var cats = new Array();
	var menuNum = this.catsMenuIDs.length;
	for (var i=0; i<menuNum; i++) {
		var menu = document.getElementById(this.catsMenuIDs[i]);
		if (menu) {
			var key = menu.getAttribute("catkey");
			var tags = menu.getAttribute("value");
			if (this.catMgr.isSearchQuery(tags)) tags = [tags];
			else tags = tags.split(this.delimiter);
			var name = menu.getAttribute("label");
			key = this.catMgr.updateCategory(key, name, tags); //add new category if the key does not exist
			if (key) cats.push(key);
		}
	}
	this.catMgr.changeCategoryOrder(cats);

	//update options
	var elemNum = this.prefElems.length;
	for (var i=0; i<elemNum; i++) {
		var id = this.prefElems[i];
		var elem = document.getElementById(id);
		var type = elem.getAttribute("preftype");
		var localName = elem.localName;
		var prefStr = elem.getAttribute("prefstring");
		if (localName == "textbox" && type == "int") {
			gTTBPreferences.setIntPref(prefStr, parseInt(elem.value));
		} else if (localName == "richlistbox" && type == "string") {
			var val = elem.getAttribute("value");
			gTTBPreferences.setUnicharPref(prefStr, val);
		} else if (localName == "checkbox") {
			var val = elem.getAttribute("checked");
			if (val) gTTBPreferences.setBoolPref(prefStr, true);
			else gTTBPreferences.setBoolPref(prefStr, false);
		} else if (localName == "menulist" && type == "int") {
			gTTBPreferences.setIntPref(prefStr, parseInt(elem.value));
		}
	}
	var observerService = Components.classes["@mozilla.org/observer-service;1"].
	  getService(Components.interfaces.nsIObserverService);
	observerService.notifyObservers(null, "ttb:setting_updated", "");

	return true;
}

TTBSetting.prototype.addCatMenuItem = function(id, label, value) {
	var menulist = document.getElementById("TTBCatList");
	var menuItem = menulist.appendItem(label, value);
	menuItem.setAttribute("id", id);
	this.catsMenuIDs.push(id);
	menulist.selectedItem = menuItem;
	//menulist.select();
	return menuItem;
}

TTBSetting.prototype.makeNewCat = function() {
	var menulist = document.getElementById("TTBCatList");
	var menuItem = menulist.selectedItem;
	
	var prompts = Components.classes["@mozilla.org/embedcomp/prompt-service;1"]
	                        .getService(Components.interfaces.nsIPromptService);
	var input = {value: menuItem.getAttribute("label")};
	var check = {value: false};
	var result = prompts.prompt(window, "Edit Category", "Input new category name", input, "Add as a new category", check);
	
	if (!result) return; //Canceled
	
	var cnt = this.catsMenuIDs.length;
	var idPrefix = "TTBCat";
	var idCandidate = idPrefix + cnt;
	while (document.getElementById(idCandidate)) {
		cnt++;
		idCandidate = idPrefix + cnt;
	}
	//var catName = this.localeBundle.getString("tagbar.catset_newcat_name");
	var catName = input.value;
	if (check.value){ //new category
		var newMenuItem = this.addCatMenuItem(idCandidate, catName, "");
		this.initTagList(newMenuItem.getAttribute("value"));
	} else {
		menuItem.setAttribute("label", catName);
		this.renameSelectedCat();
		//this.setValueToCatMenuList();
	}
	
}

TTBSetting.prototype.renameSelectedCat = function() {
	var menulist = document.getElementById("TTBCatList");
	var menuItem = menulist.selectedItem;
	if (menuItem){
		//var newName = menulist.inputField.value;
		var newName = menuItem.getAttribute("label");
		newName = newName.replace(/,/g,"_"); //"," cannot be used for category name
		menuItem.setAttribute("label", newName);
	}
}

TTBSetting.prototype.deleteSelectedCat = function() {
	var menulist = document.getElementById("TTBCatList");
	var menuItem = menulist.selectedItem;
	if (!menuItem) return;
	this.delCats.push(menuItem.getAttribute("catkey"));
	var menuItemIndex = menulist.selectedIndex;
	var index = this.catsMenuIDs.indexOf(menuItem.getAttribute("id"));
	this.catsMenuIDs.splice(index, 1);
	//menulist.removeItemAt(menuItemIndex);
	menulist.menupopup.removeChild(menuItem);
	
	this.selectCatByIndex(menulist, menuItemIndex-1);
}

TTBSetting.prototype.selectCat = function(menulist, menuItem) {
	menulist.selectedItem = menuItem;
	this.initTagList(menulist.selectedItem.getAttribute("value"));
}

TTBSetting.prototype.selectCatByIndex = function(menulist, index) {
	if (index < 0) index = 0;
	try {
		menulist.selectedIndex = index;
		this.initTagList(menulist.selectedItem.getAttribute("value"));
	} catch(e) { //no categories
	}
}

TTBSetting.prototype.buildCatList = function() {
	var menulist = document.getElementById("TTBCatList");

	var catsNum = this.catMgr.size();	
	if (catsNum == 0) {
		this.initTagList("");
		return;
	}
	
	var idPrefix = "TTBCat";
	var catsArray = new Array();
	for (var i=0; i<catsNum; i++) {
		var cat = this.catMgr.getCategoryAt(i);
		if (!cat) continue;
		if (cat.system) continue;
		
		var idCandidate = idPrefix + i;
		var cnt = i;
		while (document.getElementById(idCandidate)) {
			cnt++;
			idCandidate = idPrefix + cnt;
		}
		var menuitem = this.addCatMenuItem(idCandidate, cat.name, cat.tags.join(this.delimiter));
		menuitem.setAttribute("catkey", cat.key);
	}
	this.selectCatByIndex(menulist, 0);
}

TTBSetting.prototype.initTagList = function(orderStr) {
	var order;
	if (this.catMgr.isSearchQuery(orderStr)) { 
		order = new Array();
		order.push(orderStr);
		document.getElementById("TTBTagListHeader").setAttribute("collapsed", "true");
	} else {
		order = orderStr.split(this.delimiter);
		document.getElementById("TTBTagListHeader").removeAttribute("collapsed");
	}

	var sortFunc = function(a, b) {
		var aindex = order.indexOf(a.key);
		var bindex = order.indexOf(b.key);
		var ret = 0;
		if (aindex == -1 && bindex != -1) ret = 1;
		else if (aindex != -1 && bindex == -1) ret = -1;
		else ret = aindex - bindex;

		return ret;
	};
		this.updateTagList(order, sortFunc);
}

TTBSetting.prototype.updateTagList = function(order, sortFunc) {
	var tagService = Components.classes["@mozilla.org/messenger/tagservice;1"]
	  .getService(Components.interfaces.nsIMsgTagService);
	var tagArray = tagService.getAllTags({});
	
	document.getElementById("TTBTagListHeader").removeAttribute("sortDirection");
	
	var list = document.getElementById("TTBTagList");
	var list2 = document.getElementById("TTBTagList2");
//	var rows = list.getRowCount();

	for (var i = list.childNodes.length; i > 0; --i) {
			var node = list.childNodes[i];
			if (node && node.localName == "richlistitem") {
				list.removeChild(node);
			}
		}
		/*
	for (var i = rows; i > 1; --i) { //end before 0 to remain treecol
		//list.removeItemAt(i);
		list.remove(i);
	}
	*/
//	rows = list2.getRowCount();
		for (var i = list2.childNodes.length; i > 0; --i) {
			var node = list2.childNodes[i];
			if (node && node.localName == "richlistitem") {
				list2.removeChild(node);
			}
		}
/*
	for (var i = rows; i > 1; --i) { //end before 0 to remain treecol
		//list2.removeItemAt(i);
		list2.remove(i);
	}
*/	
	if (this.catMgr.isSearchQuery(order[0])) {
		var searcher = new TTBTagSearcher(order[0]);
		document.getElementById("TTBTagListLabel").setAttribute(
			"value",
			this.localeBundle.getString("tagbar.catset_list1_query_mode")
		);
		document.getElementById("TTBTagFilterBox").setAttribute("collapsed","true");	
		document.getElementById("TTBTagFilterBox2").setAttribute("collapsed","true");
		//document.getElementById("TTBTagFilterBox").setAttribute("hidden","true");	
		//document.getElementById("TTBTagFilterBox2").setAttribute("hidden","true");

		list2.setAttribute("collapsed","true");
		document.getElementById("TTBButtonBox").setAttribute("collapsed","true");
		document.getElementById("TTBTagListLabel2").setAttribute("collapsed","true");
		
		var val = searcher.word ? searcher.word : "";
		list.appendItem(this.localeBundle.getString("tagbar.catset_list1_query_keyword")+" "+searcher.word);
		val = searcher.regexp ? this.localeBundle.getString("tagbar.set_yes")
													: this.localeBundle.getString("tagbar.set_no");
		list.appendItem(this.localeBundle.getString("tagbar.catset_list1_query_regexp")+" " + val);
		val = searcher.casesense ? this.localeBundle.getString("tagbar.set_yes")
														 : this.localeBundle.getString("tagbar.set_no");
 		list.appendItem(this.localeBundle.getString("tagbar.catset_list1_query_case")+" " + val);
		var color = searcher.color;
		if (color == "NONE") {
			val = this.localeBundle.getString("tagbar.set_na");
			color = "";
		}	else if (color == "") {
			val = this.localeBundle.getString("tagbar.set_default");
		} else {
			val = color;
		}
		var item = list.appendItem(this.localeBundle.getString("tagbar.catset_list1_query_color")+" " + val);		
		item.style.color = color;
	} else {
		document.getElementById("TTBTagListLabel").
		  setAttribute("value",this.localeBundle.getString("tagbar.catset_list1_tags_mode"));
		document.getElementById("TTBTagFilterBox").removeAttribute("collapsed");
		document.getElementById("TTBTagFilterBox2").removeAttribute("collapsed");
		//document.getElementById("TTBTagFilterBox").removeAttribute("hidden");
		//document.getElementById("TTBTagFilterBox2").removeAttribute("hidden");

		list2.removeAttribute("collapsed");
		document.getElementById("TTBButtonBox").removeAttribute("collapsed");
		document.getElementById("TTBTagListLabel2").removeAttribute("collapsed");
		
		var orgTagArray = tagArray.slice(0);
		if (order != "" && sortFunc != null) tagArray.sort(sortFunc);
		var tagsNum = tagArray.length;

		for (var i = 0; i < tagsNum; i++) {
			var taginfo = tagArray[i];
			//var item = null;
			var orgIndex = orgTagArray.indexOf(taginfo, 0) + 1 + " ";
			if (order.indexOf(taginfo.key, 0) >= 0) {
				//item = list.appendItem(orgIndex + taginfo.tag, taginfo.key);
				this.appendItemToRichlist(list, orgIndex + taginfo.tag, taginfo.key, taginfo.color);
			} else {
				//item = list2.appendItem(orgIndex + taginfo.tag, taginfo.key);
				this.appendItemToRichlist(list2, orgIndex + taginfo.tag, taginfo.key, taginfo.color);
			}
			//item.style.color = taginfo.color;
		}
	}
}

TTBSetting.prototype.appendItemToRichlist = function(list, label, value, color) {
  var item = this.createRichlistItem(list, label, value, color);
	list.appendChild(item);
	return item;
},

TTBSetting.prototype.insertItemToRichlist = function(list, label, value, color, refChild) {
  var item = this.createRichlistItem(list, label, value, color);
	list.insertBefore(item,refChild);
	return item;
},

TTBSetting.prototype.createRichlistItem = function(list, label, value, color) {
	var item = document.createElement("richlistitem");
	var desc = document.createElement("description");
	desc.setAttribute("value", label);
	item.setAttribute("value", value);
	if (color) desc.style.color = color;
	item.appendChild(desc);
	return item;
},


TTBSetting.prototype.setValueToCatMenuList = function() {
	var menulist = document.getElementById("TTBCatList");
	var menuItem = menulist.selectedItem;
	if (!menuItem) return;
	this.renameSelectedCat();
	
	//if (menuItem.getAttribute("value").indexOf("%%ttbquery%%:") == 0) return;
	if (this.catMgr.isSearchQuery(menuItem.getAttribute("value"))) return;
	var list = document.getElementById("TTBTagList");
	var rowCount = list.getRowCount();
	var prefData = new Array();
	for (var i=0; i<rowCount; i++) {
		var item = list.getItemAtIndex(i);
		prefData.push(item.getAttribute("value"));
	}

	var prefStr = "";
	if (prefData.length > 0) prefStr = prefData.join(this.delimiter);
	menuItem.setAttribute("value", prefStr);
}

TTBSetting.prototype.selectAll = function(select) {
	var list = document.getElementById("TTBTagList");
	var rowCount = list.getRowCount();
	for (var i=0; i<rowCount; i++) {
		var item = list.getItemAtIndex(i);
		if (select) item.setAttribute("checked", "true");
		else item.removeAttribute("checked");
	}
}

TTBSetting.prototype.addTagsToCat = function() {
	var to = document.getElementById("TTBTagList");
	var from = document.getElementById("TTBTagList2");
	this.swapTagsBetweenCats(from, to);
}

TTBSetting.prototype.removeTagsFromCat = function() {
	var from = document.getElementById("TTBTagList");
	var to = document.getElementById("TTBTagList2");
	this.swapTagsBetweenCats(from, to);
}

TTBSetting.prototype.swapTagsBetweenCats = function(fromList, toList) {
	var offset = toList.selectedIndex;
	if (offset == -1) {
		//offset = toList.getRowCount();
		offset = toList.childNodes.length > 1 ? toList.childNodes.length : 0;
	}

	var items = fromList.selectedItems;
	
	var tags = [];
	for (var i=0; i<items.length; i++){
		tags.push(items[i]);
	}
	var sortFunc = function(a, b) {
		var aindex = fromList.getIndexOfItem(a);
		var bindex = fromList.getIndexOfItem(b);
		return aindex - bindex;
	};
	tags = tags.sort(sortFunc);

	var newTag = null;
	var tagsNum = tags.length;
	for (var i=0; i<tagsNum; i++) {
		var tag = tags[i];
		var color = tag.firstChild.style.color;
		//var pos = offset + 1 + i;
		var pos = offset + 1 + i;
		//if (pos >= toList.getRowCount()) {
		if (pos >= toList.childNodes.length) {
			//newTag = toList.appendItem(tag.getAttribute("label"),
			//						   tag.getAttribute("value"));
			newTag = this.appendItemToRichlist(toList, tag.firstChild.getAttribute("value"), tag.getAttribute("value"), color);
		} else {
			//newTag = toList.insertItemAt(pos,
			//							 tag.getAttribute("label"),
			//							 tag.getAttribute("value"));
			var refChild = toList.childNodes[pos];
			newTag = this.insertItemToRichlist(toList, tag.firstChild.getAttribute("value"), tag.getAttribute("value"), color, refChild);
		}
		//newTag.style.color = tag.style.color;
	}

	if (newTag) toList.ensureElementIsVisible(newTag);

	for (var i=tagsNum-1; i>=0; i--) {
		var tag = tags[i];
		//var index = fromList.getIndexOfItem(tag);
		//fromList.removeItemAt(index);
		fromList.removeChild(tag);
	}
	
	//richlistbox remembers selectedItems even though it is removed. So clear selection here
	fromList.selectedIndex = -1;
}

TTBSetting.prototype.upTagsInCat = function() {
	var list = document.getElementById("TTBTagList");
	this.moveTagsInCat(list, true);
}

TTBSetting.prototype.downTagsInCat = function() {
	var list = document.getElementById("TTBTagList");
	this.moveTagsInCat(list, false);
}

TTBSetting.prototype.moveTagsInCat = function(list, up) {
	if (list.selectedIndex == -1) return;
	var items = list.selectedItems;

	var tags = [];
	for (var i=0; i<items.length; i++){
		tags.push(items[i]);
	}
	var sortFunc = function(a, b) {
		var aindex = list.getIndexOfItem(a);
		var bindex = list.getIndexOfItem(b);
		return aindex - bindex;
	};
	tags = tags.sort(sortFunc);
	
	var firstIndex = list.getIndexOfItem(tags[0]);
	var lastIndex = list.getIndexOfItem(tags[tags.length-1]);
	if (up && firstIndex == 0) return;
	if (!up && lastIndex == list.getRowCount() - 1) return;

	var tag = null;
	var tagsNum = tags.length;
	if (up) {
		for (var i=0; i<tagsNum; i++) {
			tag = tags[i];
			this.swapTagsInCat(list, up, tag);
		}
	} else {
		for (var i=tagsNum-1; i>=0; i--) {
			tag = tags[i];
			this.swapTagsInCat(list, up, tag);
		}
	}
	if (tag) list.ensureElementIsVisible(tag);
}

TTBSetting.prototype.swapTagsInCat = function(list, up, tag)
{
	var newTag = null;
	var index = up ? list.getIndexOfItem(tag) - 1 : list.getIndexOfItem(tag) + 1;
	index = index + 1; //+1 since childNodes includes header
	//var target = list.getItemAtIndex(index);
	var target = list.childNodes[index];
	//var label = target.getAttribute("label");
	var label = target.firstChild.getAttribute("value");
	var colorStyle = target.firstChild.style.color;
	var value = target.getAttribute("value");
	//list.removeItemAt(index);
	var catkey = target.getAttribute("catkey");
	list.removeChild(target);
	index = up ? index + 1 : index - 1;
	//if (index >= list.getRowCount()) {
	if (index >= list.childNodes.length) {
		//newTag = list.appendItem(label,value);
		newTag = this.appendItemToRichlist(list, label, value, colorStyle);
	} else {
		var refChild = list.childNodes[index];
		newTag = this.insertItemToRichlist(list, label, value, colorStyle, refChild);
		//newTag = list.insertItemAt(index,label,value);
	}
	//newTag.style.color = colorStyle;
	if (catkey) newTag.setAttribute("catkey", target.getAttribute("catkey"));
}

TTBSetting.prototype.resetOrder = function()
{
	this.setValueToCatMenuList();
	var menulist = document.getElementById("TTBCatList");
	var menuItem = menulist.selectedItem;
	this.updateTagList(menuItem.getAttribute("value"), null);
}

TTBSetting.prototype.sortInAlphabeticalOrder = function(target)
{
	this.setValueToCatMenuList();
	var menulist = document.getElementById("TTBCatList");
	var menuItem = menulist.selectedItem;
	var direction = target.getAttribute("sortDirection");
	var sortFunc = null;
	if (direction == "descending") {
		direction = "ascending";
		sortFunc = function(a, b) {
			if (a.tag < b.tag) return -1;
			else if (a.tag > b.tag) return 1;
			else return 0;
		}
	} else if (direction == "ascending") {
		direction = "descending";
		sortFunc = function(a, b) {
			if (a.tag > b.tag) return -1;
			else if (a.tag < b.tag) return 1;
			else return 0;
		}
	} else {
		direction = "ascending";
		sortFunc = function(a, b) {
			if (a.tag < b.tag) return -1;
			else if (a.tag > b.tag) return 1;
			else return 0;
		}
	}
	if (this.edittingCatOrder) {
		this.sortCategory(sortFunc);
	} else {
		this.updateTagList(menuItem.getAttribute("value"), sortFunc);
	}
		
	target.setAttribute("sortDirection", direction);
}

/* removed from TB65
TTBSetting.prototype.editTags = function()
{
	openOptionsDialog("paneDisplay");
	this.setValueToCatMenuList();
	var menulist = document.getElementById("TTBCatList");
	var menuItem = menulist.selectedItem;
	if (menuItem)
	  this.initTagList(menuItem.getAttribute("value"));
	else
	  this.initTagList("");
}
*/

TTBSetting.prototype.editCatOrder = function()
{
	var button = document.getElementById("TTBCatOrder");
	document.getElementById("TTBButtonBox").removeAttribute("collapsed"); //invoked from showing query mode
	if (this.edittingCatOrder) {
		button.setAttribute("label",
							this.localeBundle.getString("tagbar.catset_edit_order_start"));
		document.getElementById("TTBTagListLabel").
		  setAttribute("value",this.localeBundle.getString("tagbar.catset_list1_tags_mode"));
		document.getElementById("TTBCatNew").removeAttribute("disabled");
		document.getElementById("TTBCatDel").removeAttribute("disabled");
		document.getElementById("TTBCatList").removeAttribute("disabled");
		document.getElementById("TTBIn").removeAttribute("collapsed");
		document.getElementById("TTBOut").removeAttribute("collapsed");
		document.getElementById("TTBReOrder").removeAttribute("collapsed");
		//removed from TB65
		//document.getElementById("TTBEditTags").removeAttribute("collapsed");
		document.getElementById("TTBList2Box").removeAttribute("collapsed");
		this.endEditCatOrder();
	} else {
		this.setValueToCatMenuList();
		this.startEditCatOrder();
		button.setAttribute("label",
							this.localeBundle.getString("tagbar.catset_edit_order_end"));
		document.getElementById("TTBTagListLabel").
		  setAttribute("value",this.localeBundle.getString("tagbar.catset_list1_cats_mode"));
		document.getElementById("TTBCatNew").setAttribute("disabled", "true");
		document.getElementById("TTBCatDel").setAttribute("disabled", "true");
		document.getElementById("TTBCatList").setAttribute("disabled", "true");
		document.getElementById("TTBIn").setAttribute("collapsed", "true");
		document.getElementById("TTBOut").setAttribute("collapsed", "true");
		document.getElementById("TTBReOrder").setAttribute("collapsed", "true");
		//removed from TB65
		//document.getElementById("TTBEditTags").setAttribute("collapsed", "true");
		document.getElementById("TTBList2Box").setAttribute("collapsed", "true");
	}
	
	this.edittingCatOrder = !this.edittingCatOrder;
}

TTBSetting.prototype.startEditCatOrder = function() {
	var menulist = document.getElementById("TTBCatList");
	var list = document.getElementById("TTBTagList");
	//var rows = list.getRowCount();
	var rows = list.childNodes.length;
	for (var i = rows - 1; i > 0; --i) {
		//list.removeItemAt(i);
		list.removeChild(list.childNodes[i]);
	}
	
	for (var i=0; i<this.catsMenuIDs.length; i++) {
		var menu = document.getElementById(this.catsMenuIDs[i]);
		if (menu) {
			//var item = list.appendItem(menu.getAttribute("label"), menu.getAttribute("value"));
			var item = this.appendItemToRichlist(list, menu.getAttribute("label"), menu.getAttribute("value"));
			item.setAttribute("catkey", menu.getAttribute("catkey"));
		}
	}
	
	var header = document.getElementById("TTBTagListHeader");
	header.removeAttribute("sortDirection");
	header.removeAttribute("collapsed");
}

TTBSetting.prototype.endEditCatOrder = function()
{
	var menulist = document.getElementById("TTBCatList");
	
	var list = document.getElementById("TTBTagList");
	var rows = list.childNodes.length;
	
	menulist.removeAllItems();
	this.catsMenuIDs = [];
	for (var i = 1; i < rows; i++) { //start with 1 since index=0 is header
		var item = list.childNodes[i];
		var id = "TTBCat" + (i-1); 
		var menuitem = this.addCatMenuItem(id, item.firstChild.getAttribute("value"), item.getAttribute("value"));
		menuitem.setAttribute("catkey", item.getAttribute("catkey"));
	}
	
	for (var i = rows - 1; i > 0; --i) {
		//list.removeItemAt(i);
		list.removeChild(list.childNodes[i]);
	}
	this.selectCatByIndex(menulist, 0);
}

TTBSetting.prototype.sortCategory = function(sortFunc)
{
	var list = document.getElementById("TTBTagList");
	var rows = list.getRowCount();
	var catArray = new Array();
	for (var i = 0; i < rows; i++) {
		var item = list.getItemAtIndex(i);
		var cat = {
			tag: item.getAttribute("label"),
			value: item.getAttribute("value"),
			key: item.getAttribute("catkey")
		}
		catArray.push(cat);
	}

	for (var i = rows - 1; i >= 0; --i) {
		list.removeItemAt(i);
	}
	
	catArray.sort(sortFunc);	
	for (var i=0; i<catArray.length; i++) {
		var cat = catArray[i];
		var item = list.appendItem(cat.tag, cat.value);
		item.setAttribute("catkey", cat.key);
	}
}

TTBSetting.prototype.filterTags = function(listbox, textbox)
{
	var text = document.getElementById(textbox).value;
	var list = document.getElementById(listbox);
	var rowCount = list.getRowCount();
	var ignoreCase = text == text.toLowerCase();
	list.clearSelection();
	if (text == "") return;
	var firstIndex = -1;
	for (var i=0; i<rowCount; i++) {
		//var item = list.getItemAtIndex(i);
		//var name = item.getAttribute("label");
		var item = list.getItemAtIndex(i);
		var name = item.firstChild.getAttribute("value");
		if (ignoreCase) name = name.toLowerCase();
		if (name.indexOf(text) != -1) {
			list.addItemToSelection(item);
			if (firstIndex == -1) firstIndex = i;
		}
	}
	list.ensureIndexIsVisible(firstIndex);
}

TTBSetting.prototype.clearPref = function(prefstring)
{
	try {
		this.pref.clearUserPref(prefstring);
	} catch(e) {
		dump("Cannot clear " + prefstring +"\n");
		return false;
	}
	
	return true;
}

TTBSetting.prototype.showColorSample = function(lightness)
{
	var enabled = document.getElementById("TTBThreadStyle").checked;
	if (lightness == null) lightness = document.getElementById("TTBThreadStyleLightness").getAttribute("value");
	else if (lightness > 1) lightness = 1;
	else if (lightness < 0) lightness = 0;
	if (isNaN(lightness)) return;
	var fg = document.getElementById("TTBThreadFgStyle").getAttribute("value");

	var colors = TTBCSSManager.getAllTagColors(false,true);
	//var colors = TTBCSSManager.getCurrentTagColors();
	colors = colors.sort();
	var list = document.getElementById("TTBThreadStyleLightness");
	if (list.itemCount == 0) {
		for (var i=0; i<colors.length; i++) {
			//var item = list.appendItem("");
			var item = document.createElement("richlistitem");
			var desc = document.createElement("description");
			desc.setAttribute("value", "This is a preview");
			desc.setAttribute("id", "TTBThreadStyleSample"+i);
			desc.setAttribute("flex", "1");
			item.appendChild(desc);
			/* Remove OK?
			var cell = document.createElement("listcell");
			cell.setAttribute("label", "This is a preview");
			//cell.setAttribute("label", colors[i]);
			cell.setAttribute("id", "TTBThreadStyleSample"+i);
			item.appendChild(cell);
			*/
			list.appendChild(item);
		}
	}
	for (var i=0; i<colors.length; i++) {
		var rgb = colors[i].split(", ")
		var sample = document.getElementById("TTBThreadStyleSample"+i);
		var colorcode = rgb.join(",");
		var fgColorcode = rgb.join(",");
		var s_colorcode = TTBCSSManager.calcBgColorBySaturation(rgb[0], rgb[1], rgb[2], lightness);
		if (fg == 0) {
			var rgb2 = TTBCSSManager.adjustFgColor(rgb[0], rgb[1], rgb[2], lightness);
			fgColorcode = rgb2.join(",");
		} else if (fg == 1) {
			//var rgb2 = TTBCSSManager.calcFgColorByValue(rgb[0], rgb[1], rgb[2]);
			//var rgb2 = TTBCSSManager.calcFgColorByLuminance(rgb[0], rgb[1], rgb[2]);
			var rgb2 = TTBCSSManager.calcFgColorByLuminance(s_colorcode[0], s_colorcode[1], s_colorcode[2]);
			fgColorcode = rgb2.join(",");
		} else if (fg == 2) {
			var rgb2 = TTBCSSManager.calcFgColorByHue(rgb[0], rgb[1], rgb[2]);
			fgColorcode = rgb2.join(",");
		}
		
		if (enabled) {
			sample.style.color = "rgb(" + fgColorcode + ")";
			//sample.style.backgroundColor = "rgba(" + colorcode + "," + alpha + ")";
			//var s_colorcode = TTBCSSManager.calcBgColorBySaturation(rgb[0], rgb[1], rgb[2], lightness);
			sample.style.backgroundColor = "rgb(" + s_colorcode.join(",") + ")";
		} else {
			sample.style.color = "rgb(" + colorcode + ")";
			sample.style.backgroundColor = "rgb(255, 255, 255)";
		}
	}

	//document.getElementById("TTBThreadStyleScale").value = parseInt(lightness*100);
	document.getElementById("TTBThreadStyleText").value = parseInt(lightness*100);
	document.getElementById("TTBThreadStyleLightness").setAttribute("value", lightness);

	if (enabled) {
		//document.getElementById("TTBThreadStyleScale").removeAttribute("disabled");
		document.getElementById("TTBThreadStyleText").removeAttribute("disabled");
		document.getElementById("TTBThreadFgStyle").removeAttribute("disabled");
	} else {
		//document.getElementById("TTBThreadStyleScale").setAttribute("disabled",true);
		document.getElementById("TTBThreadStyleText").setAttribute("disabled",true);
		document.getElementById("TTBThreadFgStyle").setAttribute("disabled",true);
	}
}

function TTBImportManager(catMgr)
{
	this.catMgr = catMgr;
	this.profileService = Components.classes["@mozilla.org/toolkit/profile-service;1"]
                     .getService(Components.interfaces.nsIToolkitProfileService);	
	this.localeBundle = document.getElementById("TTBCatSetBundle");
	this.initProfileList();
}

TTBImportManager.prototype.initProfileList = function()
{
	var profiles = this.profileService.profiles;
	//var curProfPath = this.profileService.selectedProfile.localDir.path;
	//var curProfPath = this.profileService.selectedProfile.rootDir.path;
	var curProfPath = this.profileService.currentProfile.rootDir.path;
	var menulist = document.getElementById("TTBProfileList");
	while (profiles.hasMoreElements()) {
		var item = profiles.getNext();
		item = item.QueryInterface(Components.interfaces.nsIToolkitProfile);
		var name = item.name;
		//var path = item.localDir.path; // .../Local Settings/Application Data/Thunderbird/...
		var path = item.rootDir.path; // .../Application Data/Thunderbird/...
		if (path === curProfPath) continue;
		menulist.appendItem(name, path);
	}
	menulist.selectedIndex = 0;	
}

TTBImportManager.prototype.selectPrefJs = function()
{
  var fp = Components.classes["@mozilla.org/filepicker;1"].createInstance(Components.interfaces.nsIFilePicker);
	var current = Components.classes["@mozilla.org/file/directory_service;1"]
								.createInstance(Components.interfaces.nsIProperties)
								.get("ProfD", Components.interfaces.nsIFile);
  fp.init(window,
  				this.localeBundle.getString("tagbar.set_select_file_title"),
  				Components.interfaces.nsIFilePicker.modeOpen);
  fp.appendFilter(this.localeBundle.getString("tagbar.set_select_file_filter"),
  								"*.js");
  fp.appendFilter(this.localeBundle.getString("tagbar.set_select_file_filter2"),
  								"*.*");
  //fp.displayDirectory = current;
  
  //var ret = fp.show();
  let ret;
  fp.open(ret => {
	  if (ret == Components.interfaces.nsIFilePicker.returnOK) {
			var file = fp.file;
	  	if (!file || !file.isReadable()) {
	  		alert(this.localeBundle.getString("tagbar.set_select_file_permission_error"));
	  	} else {
	  		document.getElementById("TTBProfilePath").value = file.path;
	  	}
	  }
  });
}

TTBImportManager.prototype.importTagsAndCats = function()
{
	var radio = document.getElementById("TTBProfilePathRadio");
	var pathId = radio.value;
	var path = document.getElementById(pathId).value;
	
	var file = null;
	try {
  	file = Components.classes["@mozilla.org/file/local;1"].createInstance(Components.interfaces.nsIFile);
  	file.initWithPath(path);
	} catch(e) {
		file = null
	}
	
	if (!file) {
		alert(this.localeBundle.getString("tagbar.set_import_error"));
		return;
	}
	
	if (file.isDirectory()) file.append("prefs.js");
	if (!file.exists()) {
		alert(this.localeBundle.getString("tagbar.set_import_error"));
		return;
	}
	var istream = Components.classes["@mozilla.org/network/file-input-stream;1"]
                    .createInstance(Components.interfaces.nsIFileInputStream);

	istream.init(file, 0x01, 0444, 0);
	istream.QueryInterface(Components.interfaces.nsIInputStream);
	var cistream = Components.classes["@mozilla.org/intl/converter-input-stream;1"]
               		.createInstance(Components.interfaces.nsIConverterInputStream);

	cistream.init(istream, "UTF-8", 1024, 0xFFFD);
	cistream.QueryInterface(Components.interfaces.nsIUnicharLineInputStream);
	var line = {}, hasmore;
	var tags = [];
	var cats = [];
	var catsDelim = "%";
	do {
 		hasmore = cistream.readLine(line);
 		var lineText = line.value;
 		/* pref line should be the following:
 		 * user_pref("mailnews.tags.$label1.color", "#FF0000");
 		 */
 		var args = lineText.split(/\(|, |\)/);
 		if (args[0] != "user_pref") continue;
 		var key = args[1];
 		key = key.replace(/^\s*"/, "");
 		key = key.replace(/"\s*$/, "");
 		var value = args[2];
 		value = value.replace(/^\s*"/, "");
 		value = value.replace(/"\s*$/, "");
 		if (key == "mailnews.tags.version") {
 			continue;
		} else if (key.indexOf("mailnews.tags.") == 0) {
 			var sections = key.split(".");
 			var tagKey = sections[2];
 			if (!tags[tagKey]) tags[tagKey] = {};
 			var tagObj = tags[tagKey];
 			tagObj[sections[sections.length-1]] = value;
 		} else if (key == "ttb.cats.delimiter") {
 			catsDelim = value;
 		} else if (key == "ttb.cats" || key == "ttb.cats.migrated") {
 			continue;
 		} else if (key.indexOf("ttb.cat") == 0) {
 			var sections = key.split(".");
 			var catKey = sections[1];
 			if (!cats[catKey]) cats[catKey] = {};
 			var catObj = cats[catKey];
 			catObj[sections[sections.length-1]] = value;
 		}
	} while(hasmore);
	
	istream.close();
	cistream.close();
	
	//var overwrite = document.getElementById("TTBImportOverwrite").checked;
	this.importTags(tags);

	var importCats = document.getElementById("TTBImportCategories").checked;
	if (importCats) this.importCats(cats, catsDelim);
	var observerService = Components.classes["@mozilla.org/observer-service;1"].
	  getService(Components.interfaces.nsIObserverService);
	observerService.notifyObservers(null, "ttb:setting_updated", "");
	/*
	gTTBSetting = new TTBSetting();
	gTTBSetting.onLoad();
	var tabs = document.getElementById("tabs");
	var tab = document.getElementById("impttab");
	tabs.selectedItem = tab;
	*/
	window.close();
}

TTBImportManager.prototype.importTags = function(tags)
{
  var tagService = Components.classes["@mozilla.org/messenger/tagservice;1"]
                             .getService(Components.interfaces.nsIMsgTagService);
 	var key;
	for (key in tags) {
		var tag = tags[key].tag;
		var color = tags[key].color;
		var exist = tagService.getKeyForTag(tag);
		if (exist) {
				//tagService.deleteKey(exist);
				//tagService.setTagForKey(exist, tag);
				//tagService.setColorForKey(exist, color);
				dump(tag + " already exists. Skip importing.\n");
				continue;
		} else {
	  	tagService.addTag(tag, color, '');
		}
	}
}

TTBImportManager.prototype.importCats = function(cats, delim, overwrite)
{
 	var key;
	for (key in cats) {
		var name = cats[key].name;
		var tags = cats[key].tags;
		var tagsArray = [];
		if (tags.indexOf("%%ttbquery%%:") == 0) tagsArray.push(tags);
		else tagsArray = tags.split(delim);
		this.catMgr.appendNewCategory(name, tagsArray);
	}
}

window.addEventListener("dialogaccept", function(event) {
	var ret = gTTBSetting.savePrefs();
	if (!ret) {
		event.preventDefault();
	}
});

window.addEventListener("dialogcancel", function(event) {
	var ret = gTTBSetting.cancelPrefs(event);
	if (!ret) {
		event.preventDefault();
	}
});


