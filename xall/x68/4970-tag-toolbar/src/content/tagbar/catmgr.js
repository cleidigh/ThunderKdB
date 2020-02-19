//class TTBCategoryManager
function TTBCategoryManager()
{
	this.cats = null;
	this.localeBundle = document.getElementById("TTBBundle"); //will be null in option dialog
	this.pref = Components.classes["@mozilla.org/preferences-service;1"]
	  				.getService(Components.interfaces.nsIPrefBranch);
	this.delimiter = gTTBPreferences.copyUnicharPref("ttb.cats.delimiter", null);
	this.maxRecent = gTTBPreferences.getIntPref("ttb.max_recent_tags", 5);
	if (!gTTBPreferences.getBoolPref("ttb.cats.migrated", false)) {
		this.convertOldPrefs();
	}
	this.newCategories();
}

TTBCategoryManager.prototype.newCategories = function()
{
	this.cats = new Array();
	var catsStr = gTTBPreferences.copyUnicharPref("ttb.cats", "");
	var catsArray = catsStr.split(",");
	var needToConvert = false;
	if (!this.delimiter) {
		this.delimiter = "%";
		gTTBPreferences.setUnicharPref("ttb.cats.delimiter","%");
		needToConvert = true;
	}

	//Add user defined categories
	var length = catsArray.length;
	for (var i=0; i<length; i++) {
		var catKey = catsArray[i];		
		var name = gTTBPreferences.copyUnicharPref("ttb."+catKey+".name", "");		
		var tags = gTTBPreferences.copyUnicharPref("ttb."+catKey+".tags", "");
		if (needToConvert) {
			tags = tags.replace(/,/g, this.delimiter);
			gTTBPreferences.setUnicharPref("ttb."+catKey+".tags", tags);
		}
		var tagArray = new Array();
		if (tags.indexOf("%%ttbquery%%:") == 0) tagArray.push(tags);
		else tagArray = tags.split(this.delimiter);
		var cat = {
			key: catKey,
			system: false,
			name: name,
			tags: tagArray
		};
		this.cats.push(cat);	
	}
	//Add Recent Tags category
	if (this.localeBundle && this.maxRecent > 0) {
		var name = this.localeBundle.getString("tagbar.cat_recent");
		var tags = "%%ttbquery%%:%%Recent%%||NONE||false||false";
		var cat = {
			key: "catrecent",
			system: true,
			name: name,
			tags: [tags]
		};
		this.cats.push(cat);
	}
}

TTBCategoryManager.prototype.appendNewCategory = function(name, tags, overwrite)
{
	var exist = this.getCategoryByName(name);
	if (exist) {
		if (overwrite) this.updateCategory(exist.key, exist.name, tags);
		return;
	}
	var catKey = "cat0";
	var i = 0;
//	while (this.cats[catKey]) {
//		catKey = "cat"+(++i);
//	}
	while (this.getCategoryByKey(catKey)) {
		catKey = "cat"+(++i);
	}
	var catsStr = gTTBPreferences.copyUnicharPref("ttb.cats", "");
	gTTBPreferences.setUnicharPref("ttb.cats", catsStr+","+catKey);
	
	gTTBPreferences.setUnicharPref("ttb."+catKey+".name", name);
	gTTBPreferences.setUnicharPref("ttb."+catKey+".tags", tags.join(this.delimiter));
	this.newCategories();
	
	return catKey;
}

TTBCategoryManager.prototype.convertOldPrefs = function()
{
	var catsStr = gTTBPreferences.copyUnicharPref("ttb.cats", "");
	var catsArray = catsStr.split(",");
	var length = catsArray.length;
	var catKeys = new Array();
	for (var i=0; i<length; i++) {
		var catKey = "cat"+i;
		catKeys.push(catKey);
		dump("ttb."+catKey+".name"+ " "+ catsArray[i]);
		gTTBPreferences.setUnicharPref("ttb."+catKey+".name", catsArray[i]);
	}
	dump("ttb.cats", catKeys.join(","));
	gTTBPreferences.setUnicharPref("ttb.cats", catKeys.join(","));
	gTTBPreferences.setBoolPref("ttb.cats.migrated", true);
}

TTBCategoryManager.prototype.getCategoryAt = function(index)
{
	if (index < 0 | this.cats.length <= index) return null;
	else return this.cats[index];
}

TTBCategoryManager.prototype.size = function()
{
	return this.cats.length;
}

TTBCategoryManager.prototype.getCategoryByKey = function(key)
{
	if (!key) return null;
	var length = this.size();
	for (var i=0; i<length; i++) {
		if (this.cats[i].key == key) return this.cats[i];
	}
	
	return null;
}

TTBCategoryManager.prototype.getCategoryByName = function(name)
{
	if (!name) return null;
	var length = this.size();
	for (var i=0; i<length; i++) {
		if (this.cats[i].name == name) return this.cats[i];
	}
	
	return null;
}

TTBCategoryManager.prototype.appendNewTagToCategory = function(catKey, newTagKey)
{
	var cat = this.getCategoryByKey(catKey);	
	if (cat.tags.indexOf("%%ttbquery%%:") == 0) return false;
	gTTBPreferences.setUnicharPref(
		"ttb."+catKey+".tags", cat.tags.join(this.delimiter)+this.delimiter+newTagKey);
	this.newCategories();
	return true;
}

TTBCategoryManager.prototype.syncTagsInCategory = function()
{
	var tagService = Components.classes["@mozilla.org/messenger/tagservice;1"]
	  .getService(Components.interfaces.nsIMsgTagService);

	//var catsStr = gTTBPreferences.copyUnicharPref("ttb.cats","");
	//if (catsStr == "") return;
	//var cats = catsStr.split(",");
	//var catsNum = cats.length;
	var catsNum = this.size();
	for (var i=0; i<catsNum; i++) {
		var cat = this.cats[i];
		if (cat.system) continue;
		var str = gTTBPreferences.copyUnicharPref("ttb."+cat.key+".tags","");
		if (str.indexOf("%%ttbquery%%:") == 0) continue;
		var tags = str.split(this.delimiter);
		var newTags = new Array();
		var tagsNum = tags.length;
		for (var j=0; j<tagsNum; j++) {
			try {
				if (tagService.getTagForKey(tags[j])) {
					newTags.push(tags[j]);
				}
			} catch(e) {
			}
		}
		gTTBPreferences.setUnicharPref("ttb."+cat.key+".tags", newTags.join(this.delimiter));
	}
}

TTBCategoryManager.prototype.removeAllCategories = function()
{
	this.pref.clearUserPref("ttb.cats");
	var catsNum = this.size();
	for (var i=0; i<catsNum; i++) {
		var cat = this.cats[i];
		this.pref.clearUserPref("ttb."+cat.key+".name");
		this.pref.clearUserPref("ttb."+cat.key+".tags");
	}
	this.newCategories();
}

TTBCategoryManager.prototype.removeCategory = function(key)
{
	if (!key) return;
	var length = this.size();
	var newCats = new Array();
	for (var i=0; i<length; i++) {
		var cat = this.cats[i];
		if (key != cat.key) newCats.push(cat.key);
	}
	gTTBPreferences.setUnicharPref("ttb.cats", newCats.join(","));
	this.pref.clearUserPref("ttb."+key+".name");
	this.pref.clearUserPref("ttb."+key+".tags");
	this.newCategories();
}

TTBCategoryManager.prototype.changeCategoryOrder = function(newOrder)
{
	if (!newOrder) newOrder = new Array();
	gTTBPreferences.setUnicharPref("ttb.cats", newOrder.join(","));
	this.newCategories();
}

TTBCategoryManager.prototype.updateCategory = function(key, name, tags)
{
	if (name == "") {
		this.removeCategory(key);
		return null;
	}
	var catKey = key;
	if (this.getCategoryByKey(key)) {
		gTTBPreferences.setUnicharPref("ttb."+key+".name", name);
		gTTBPreferences.setUnicharPref("ttb."+key+".tags", tags.join(this.delimiter));		
		this.newCategories();
	} else {
		catKey = this.appendNewCategory(name, tags);
	}
	
	return catKey;
}

TTBCategoryManager.prototype.isSearchQuery = function(tags)
{
	return tags.indexOf("%%ttbquery%%:") == 0;
}

TTBCategoryManager.prototype.getRecentTags = function()
{
	this.updateRecentTags();
	var keys = null;
	if (this.maxRecent > 0) keys = gTTBPreferences.copyUnicharPref("ttb.recent_tags", null);
	return keys ? keys.split(this.delimiter) : [];
}

TTBCategoryManager.prototype.unshiftRecentTags = function(keys)
{
	for (var i=0; i<keys.length; i++) {
		this.unshiftRecentTag(keys[i]);
	}
}

TTBCategoryManager.prototype.unshiftRecentTag = function(key)
{
	if (this.maxRecent <= 0) return;
	var keys = gTTBPreferences.copyUnicharPref("ttb.recent_tags", null);
	if (keys) keys = keys.split(this.delimiter);
	else keys = new Array();
	var index = keys.indexOf(key);
	if (index >= 0) {
		keys.splice(index, 1);
	}
	
	keys.unshift(key);
  this.updateRecentTags(keys);
}

TTBCategoryManager.prototype.updateRecentTags = function(keys)
{
	if (this.maxRecent <= 0) return;
	if (!keys) {
		keys = gTTBPreferences.copyUnicharPref("ttb.recent_tags", null);
		if (keys)	{
			keys = keys.split(this.delimiter);
		}	else {
			keys = new Array();
		}
	}

	if (keys.length > this.maxRecent) {
		keys.splice(this.maxRecent);
	}
	
	var keysStr = keys.length > 0 ? keys.join(this.delimiter) : "";
	gTTBPreferences.setUnicharPref("ttb.recent_tags", keysStr);
}
