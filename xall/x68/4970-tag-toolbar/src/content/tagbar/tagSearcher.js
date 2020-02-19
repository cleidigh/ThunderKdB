//class TTBTagSearcher
function TTBTagSearcher(word, color, regexp, casesens)
{
	this.tagService = Components.classes["@mozilla.org/messenger/tagservice;1"]
	  .getService(Components.interfaces.nsIMsgTagService);
	  
	if (word && this.initByQuery(word)) return;
	if (word == null) word = "";
	if (color == null) color = "NONE";
	//this.query = word+"%%"+color;
	this.word = word;
	this.color = color;
	this.regexp = regexp;
	this.casesens = casesens;
}

TTBTagSearcher.prototype.searchTags = function()
{
	var tagArray = this.tagService.getAllTags({});
	var tagCount = tagArray.length;
//	var word = this.query.split("%%")[0];
//	var color = this.query.split("%%")[1];
	//var ignoreCase = word == word.toLowerCase();
	var hits = new Array();
	
	if (this.word == "%%Recent%%") {
		var catmgr = new TTBCategoryManager();
		hits = catmgr.getRecentTags();
	} else {
		for (var i=0; i<tagCount; i++){
			var taginfo = tagArray[i];
			var name = taginfo.tag;
			if (this.regexp) {
				var re = this.casesens ? new RegExp(this.word) : new RegExp(this.word, "i");
				if (name.match(re)) {
					if (this.color == "NONE" || taginfo.color == this.color) hits.push(taginfo.key);
				}
			} else {
				if (!this.casesens) name = name.toLowerCase();
				if (name.indexOf(this.word) > -1) { 
					if (this.color == "NONE" || taginfo.color == this.color) hits.push(taginfo.key);
				}
			}
		}
	}
	
	return hits;
}

TTBTagSearcher.prototype.saveQueryAsCategory = function()
{
	var callback = { catname: "" };
	window.openDialog("chrome://tagbar/content/saveQueryDialog.xul", "tagbar-savequery", "chrome,modal,dialog,centerscreen", callback);
	if (callback.catname == "") return;
	
	var tags = new Array();
	tags.push("%%ttbquery%%:"+this.word+"||"+this.color+"||"+this.regexp+"||"+this.casesens);
	var catMgr = new TTBCategoryManager();
	catMgr.appendNewCategory(callback.catname, tags);
}

TTBTagSearcher.prototype.queryToTagKeys = function(queryStr)
{
	if (this.initByQuery(queryStr)) return this.searchTags();
	else return null;
	/*
	if (queryStr.indexOf("%%ttbquery%%:") != 0) return null;
	var queryArray = queryStr.substring(13,queryStr.length).split("||");
	this.word = queryArray[0];
	this.color = queryArray[1];
	this.regexp = queryArray[2] == "true";
	this.casesens = queryArray[3] == "true";
	return this.searchTags();
	*/
}

TTBTagSearcher.prototype.initByQuery = function(queryStr)
{
	if (queryStr.indexOf("%%ttbquery%%:") != 0) return false;
	var queryArray = queryStr.substring(13,queryStr.length).split("||");
	this.word = queryArray[0];
	this.color = queryArray[1];
	this.regexp = queryArray[2] == "true";
	this.casesens = queryArray[3] == "true";
	return true;
}