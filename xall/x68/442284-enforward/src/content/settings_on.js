function ENFONSettings(){}
ENFONSettings.prototype = gENFSettings;

var gENFONSettings = new ENFONSettings();
gENFONSettings.init = function() {
	this.prefix = "ENFON";
	this.elementIDs = [
		"Email",
		"IdList",
		"SendInterval",
		"SaveInSent",
		"MarkAsForward",
		"DelOrgMsg",
		"NoteTitle",
		"RmReFwd",
		"RmMLTag",
		"AttFwdMode",
		"AttExtFilter",
		"AttSizeFilter",
		"SkeyEnable",
		"Skey",
		"SkeyAlt",
		"SkeyCtrl",
		"SkeyMeta"
	];

	window.addEventListener("dialogaccept",function(){gENFONSettings.savePrefs();});
	window.addEventListener("dialogcancel",function(){gENFONSettings.cancelPrefs();});
}

//Memo is not available
gENFONSettings.saveMemoText = function() {}
gENFONSettings.loadMemoText = function() {}
gENFONSettings.onChangeAccountType = function() {}
