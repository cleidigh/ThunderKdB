(function()
{
let log = mapaPlus.log;
log("changemp.js loaded");
function $(id)
{
	return document.getElementById(id);
}
mapaPlus.window = window;
mapaPlus.checkPasswords = checkPasswords;
mapaPlus.setPassword = setPassword;
mapaPlus.okButton = null;
mapaPlus.okButtonLabel = "";
mapaPlus.bundle = null;
mapaPlus.protect = false; //don't ask for password
mapaPlus.protected = false; //disable everything until old password entered
mapaPlus.protectedBegin = true;
mapaPlus.windowID = 0;
mapaPlus.windowType = "changemp";
mapaPlus.pass = false;

mapaPlus.load = function()
{
	mapaPlus.init();
}

mapaPlus.init = function init()
{
log.debug();
	this.windowID = this.core.windowAdd(mapaPlus, "changemp");
	this.bundle = $("bundlePreferences");
	$("masterPasswordPlusOptions").setAttribute("changemp", true);
	$("changemp").setAttribute("ondialogaccept", "return setPassword();");
	$("oldpw").setAttribute("oninput", "checkPasswords();");

	if (this.core.isFF4)
		$("prompt-one").collapsed = $("one.info").collapsed = true;

	$("mapaPlusContextmenu").hidden = this.core.isTB;
	$("mapaPlusUrlbarBox").hidden = this.core.isTB;
	this.okButton = document.documentElement.getButton("accept") || gDialog.getButton("accept");
	this.okButtonLabel = this.okButton.label;

	setPassword = function ()
	{
		var promptService = Components.classes["@mozilla.org/embedcomp/prompt-service;1"]
																	.getService(Components.interfaces.nsIPromptService);
		var token = Components.classes["@mozilla.org/security/pk11tokendb;1"].getService(Components.interfaces.nsIPK11TokenDB).getInternalKeyToken();
		dump("*** TOKEN!!!! (name = |" + token + "|\n");

		var oldpwbox = $("oldpw");
		var initpw = oldpwbox.getAttribute("inited");
		var bundle = $("bundlePreferences");
		var success = false;

		if (initpw == "false" || initpw == "empty") {
			try {
				var oldpw = "";
				var passok = 0;

				if (initpw == "empty") {
					passok = 1;
				} else {
					oldpw = oldpwbox.value;
					passok = oldpw != "" && token.checkPassword(oldpw);
				}

				if (passok) {
					if (initpw == "empty" && pw1.value == "") {
						// This makes no sense that we arrive here,
						// we reached a case that should have been prevented by checkPasswords.
					} else {
						if (pw1.value == "") {
							var secmoddb = Components.classes["@mozilla.org/security/pkcs11moduledb;1"].getService(Components.interfaces.nsIPKCS11ModuleDB);
							if (secmoddb.isFIPSEnabled) {
								// empty passwords are not allowed in FIPS mode
								promptService.alert(window,
																		bundle.getString("pw_change_failed_title"),
																		bundle.getString("pw_change2empty_in_fips_mode"));
								passok = 0;
							}
						}
						if (passok) {
							token.changePassword(oldpw, pw1.value);
							token.logoutAndDropAuthenticatedResources();
							success = true;
							mapaPlus.saveOptions();
							if (pw1.value == "") {
								promptService.alert(window,
																		bundle.getString("pw_change_success_title"),
																		bundle.getString("pw_erased_ok")
																		+ " " + bundle.getString("pw_empty_warning"));
							} else {
								promptService.alert(window,
																		bundle.getString("pw_change_success_title"),
																		bundle.getString("pw_change_ok"));
							}
						}
					}
				} else {
					if (pw1.value != "" || oldpw != "")
					{
						oldpwbox.focus();
						oldpwbox.setAttribute("value", "");
						promptService.alert(window,
																bundle.getString("pw_change_failed_title"),
																bundle.getString("incorrect_pw"));
					}
					else
					{
						success = true;
						mapaPlus.saveOptions();
					}
				}
			} catch (e) {
//				mapaPlus.dump(e);
				promptService.alert(window,
														bundle.getString("pw_change_failed_title"),
														bundle.getString("failed_pw_change"));
			}
		} else {
			token.initPassword(pw1.value);
			success = true;
			mapaPlus.saveOptions();
			if (pw1.value == "") {
				promptService.alert(window,
														bundle.getString("pw_change_success_title"),
														bundle.getString("pw_not_wanted")
														+ " " + bundle.getString("pw_empty_warning"));
			}
		}
		return success;
	}
	checkPasswords = function ()
	{
		mapaPlus.checkPasswords();
		if (!$("oldpw").hidden)
		{
			document.documentElement.getButton("accept").disabled = !((!$("oldpw").value
																																	&& $("pw1").value == ""
																																	&& $("pw2").value == "")
																															|| ($("oldpw").value
																																	&& !document.documentElement.getButton("accept").disabled));

//			mapaPlus.core.tokenDB.logoutAndDropAuthenticatedResources();
			mapaPlus.setProtect("protected", mapaPlus.protectedBegin)
		}
		mapaPlus.enableDisable();
	}

	this.setListeners();
//	checkPasswords();
	this.suppress();
}
//init()

mapaPlus.suppress = function()
{
	var status = $("mapaPlusSuppress").value == 0 || $("mapaPlusSuppress").disabled || mapaPlus.isLocked;
	mapaPlus.setAttribute("mapaPlusSuppressBox", "disabled", status, !status);
	status = ((!$("mapaPlusSuppressPopup").checked && $("mapaPlusSuppressPopup").getAttribute("indeterminate") != "true") || $("mapaPlusSuppressPopup").disabled) || mapaPlus.isLocked;
	mapaPlus.setAttribute("mapaPlusSuppressPopupRemoveBox", "disabled", status, !status);
}

mapaPlus._enableDisable = function _enableDisable(e)
{
log.debug();
	let	del = ($("oldpw").value != ""
						&& $("pw1").value == ""
						&& $("pw2").value == "");

	mapaPlus.okButton.label = del ? mapaPlus.bundle.getString("pw_remove_button") : mapaPlus.okButtonLabel;
}

mapaPlus.saveOptions = function()
{
	this.core.prefNoObserve = true;
	// we don't want save new settings if options locked
	if (!this.isLocked)
	{
		if ($("mapaPlusSuppressPopup").getAttribute("indeterminate") == "true")
			$("mapaPlusSuppressPopup").checked = true;
		else
			this.core.suppressedPopupStop = false;

		this.hotkeySave("mapaPlusLogoutHotkey", "logouthotkey");
		this.hotkeySave("mapaPlusLockHotkey", "lockhotkey");
		this.hotkeySave("mapaPlusLockWinHotkey", "lockwinhotkey");
		this.hotkeySave("mapaPlusLockLogoutHotkey", "locklogouthotkey");

		this.timeoutSave("logouttimeout");
		this.timeoutSave("locktimeout");
		this.timeoutSave("startuptimeout");

		let el = $("options").getElementsByTagName('*'),
				pref, prefType, prefValue, prefExtra;

		for(let i = 0; i < el.length; i++)
		{
			pref = el[i].getAttribute("preference");
			if (!pref)
				continue;

			let prefValue;
			if ($(pref))
				prefType = $(pref).getAttribute("type");

			switch (prefType)
			{
				case "bool":
						prefValue = el[i].checked;
					break;
				case "int":
				case "char":
				case "unichar":
						prefValue = el[i].value;
					break;
				default:
						prefType = null;
			}
			if (!prefType)
				continue;

			this.core.pref(pref, prefValue);
		}
	}
	let sel = this.getOrder("urlbar-icons");
	if (sel)
		this.core.pref("urlbarpos", (sel.dir?1:0)+sel.id);

	sel = false;//this.getOrder("status-bar");
	if (sel)
		this.core.pref("statusbarpos", (sel.dir?1:0)+sel.id);

	this.core.prefNoObserve = false;
	this.core.windowUpdate(true,true);
	this.core.init(true, mapaPlus);
}

mapaPlus.close = function(e)
{
	mapaPlus.core.windowRemove(mapaPlus.windowID, "changemp");
//	window.close();
}

let first = mapaPlus.core.windowFirst("changemp");
if (first)
{
	mapaPlus.core.timerFocus.init("changemp");
	mapaPlus.close();
}
else
{
	window.addEventListener("load", mapaPlus.load, false);
	window.addEventListener("unload", mapaPlus.close, false);
}
})()