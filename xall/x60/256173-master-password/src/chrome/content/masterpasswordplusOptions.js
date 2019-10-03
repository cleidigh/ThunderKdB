(function(){
let log = mapaPlus.core.log;
function $(id)
{
	return document.getElementById(id);
}
mapaPlus.window = window;
mapaPlus.protect = false; //ask for password
mapaPlus.protected = false;//mapaPlus.core.prefs.getBoolPref("protect");
mapaPlus.protectedBegin = true;
mapaPlus.pass = false;
mapaPlus.windowType = "options";
mapaPlus.windowID = mapaPlus.core.windowAdd(mapaPlus, mapaPlus.windowType);

mapaPlus.saveOptions = function saveOptions()
{
log.debug();
	this.core.prefNoObserve = true;
	var sel = this.getOrder("urlbar-icons");
	if (sel)
		this.core.pref("urlbarpos", (sel.dir?1:0)+sel.id);

	sel = this.getOrder("status-bar");
	if (sel)
		this.core.pref("statusbarpos", (sel.dir?1:0)+sel.id);

	if ($("mapaPlusSuppressPopup").getAttribute("indeterminate") == "true")
		$("mapaPlusSuppressPopup").checked = true;
	else
		this.core.suppressedPopupStop = false;

	this.hotkeySave("mapaPlusLogoutHotkey", "logouthotkey");
	this.hotkeySave("mapaPlusLockHotkey", "lockhotkey");
	this.hotkeySave("mapaPlusLockWinHotkey", "lockwinhotkey");
	this.hotkeySave("mapaPlusLockLogoutHotkey", "locklogouthotkey");

	this.timeoutSave("logouttimeout", true);
	this.timeoutSave("locktimeout", true);
	this.timeoutSave("startuptimeout", true);
	this.core.prefNoObserve = false;
	this.core.windowUpdate(true,true);
	this.core.init(true, this);
	this.core.windowAction("updateTitle", null, "Dialog");
	this.debugSave();
	this.changesLogSave();
	this.updateInfoBox();
}
//Initialize options
mapaPlus.load = function ()
{
	mapaPlus.init();
}
mapaPlus.init = function init()
{
log.debug();
	$("mapaPlusContextmenu").hidden = this.core.isTB;
	$("mapaPlusUrlbarBox").hidden = this.core.isTB;
//	$("mapaPlusString_logouttimeout").value = $("mapaPlusString_logouttimeout").value.replace("#", this.core.appInfo.name);
//	if (this.core.isFF4)
//		$("prompt-one").collapsed = $("one.info").collapsed = true;

	if (this.strings.moreinfo)
		document.documentElement.getButton("disclosure").label = this.strings.moreinfo;

	this.setListeners();
	window.addEventListener("unload", this.close, false);
//	this.setProtect("protected", false)
	this.loadArgs();

	replace_validateValue($("mapaPlusFailedAttempts"));
	replace_validateValue($("mapaPlusFailedAttemptsTime"));
}


mapaPlus.suppress = function()
{
	var status = $("mapaPlusSuppress").value == 0 || $("mapaPlusSuppress").disabled || mapaPlus.isLocked;
	mapaPlus.setAttribute("mapaPlusSuppressBox", "disabled", status, !status, "mapaPlusSuppressPopup");
	status = ((!$("mapaPlusSuppressPopup").checked && $("mapaPlusSuppressPopup").getAttribute("indeterminate") != "true") || $("mapaPlusSuppressPopup").disabled || mapaPlus.locked);
	mapaPlus.setAttribute("mapaPlusSuppressPopupRemoveBox", "disabled", status, !status);
}


function replace_validateValue(obj)
{
	obj.prev = [0, 0, obj._value];
	obj._validateValue = function(aValue, aIsIncDec)
	{
		let min = obj.min,
				max = obj.max,
				val = String(aValue).replace(/[^0-9\-]/g, "");
		val = val.replace(/[\-]{2,}/g, "-");
		val = val.replace(/([0-9]+)[\-]+/g, "$1");
		if (val == "-")
			aValue = val;
		else
			aValue = Number(val) || 0;

		if (aValue < min)
			aValue = min;
		else if (aValue > max)
			aValue = obj._value > max ? max : obj._value;

		aValue = "" + aValue;
		obj._valueEntered = false;
		obj._value = aValue == "-" ? aValue : Number(aValue);
		obj.prev.push(obj._value);
		obj.prev.splice(0,1);
		obj.inputField.value = Number(aValue) || aValue == "-" ? aValue : mapaPlus.strings.disabled;
		obj._enableDisableButtons();
		return aValue;
	}
	obj.value = obj.value;
} //replace_validateValue()
})();