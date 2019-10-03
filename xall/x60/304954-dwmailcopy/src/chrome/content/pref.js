//設定情報読込
function dwReadSetting(objId,defValue) {
    var obj = document.getElementById(objId);
    var atr = obj.getAttribute("prefattribute");

    if (atr=="") return;

    var val = dwReadSetting_Sub(objId, defValue);
    obj.setAttribute(atr,val);
}

//設定情報読込サブルーチン
function dwReadSetting_Sub(objId,defValue) {
    var obj = document.getElementById(objId);
    var typ = obj.getAttribute("preftype");
    var atr = obj.getAttribute("prefattribute");
    var str = obj.getAttribute("prefstring");

    if ((typ=="")||(atr=="")||(str=="")) return;

    var prefs = Components.classes["@mozilla.org/preferences-service;1"].getService(Components.interfaces.nsIPrefService);
    prefs = prefs.getBranch("extensions.dwmailcopy.");

    var val;
    if (typ=="bool") {
        val=prefs.getBoolPref(str, defValue);
    } else if (typ=="int") {
        val=prefs.getIntPref(str, defValue);
    } else if (typ=="string") {
        val=prefs.copyUnicharPref(str, defValue);
    } else {
        alert(objId + ": " + getLocaleString("PrefTypeNotSupported") + ": " + typ);
        return;
    }
    return val;
}

//設定情報保存
function dwWriteSettingChkbox(objId) {
    var obj = document.getElementById(objId);
    var typ = obj.getAttribute("preftype");
    var atr = obj.getAttribute("prefattribute");
    var str = obj.getAttribute("prefstring");

    if ((typ=="")||(atr=="")||(str=="")) return;

    var prefs = Components.classes["@mozilla.org/preferences-service;1"].getService(Components.interfaces.nsIPrefService);
    prefs = prefs.getBranch("extensions.dwmailcopy.");

    val = obj.checked;

    if (typ=="bool") {
        prefs.setBoolPref(str, val);
    } else if (typ=="int") {
        prefs.setIntPref(str, val);
    } else if (typ=="string") {
        prefs.setUnicharPref(str, val);
    } else {
        alert(objId + ": " + getLocaleString("PrefTypeNotSupported") + ": " + typ);
        return;
    }
}

