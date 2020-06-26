var prefs = Components.classes["@mozilla.org/preferences-service;1"].getService(Components.interfaces.nsIPrefBranch);
var TB3;
var nativeShiftDelete;
const tagService = Cc["@mozilla.org/messenger/tagservice;1"].getService(Ci.nsIMsgTagService);
var allTags = tagService.getAllTags({});

function createMenuItem(aLabel) {
    const XUL_NS = "http://www.mozilla.org/keymaster/gatekeeper/there.is.only.xul";
    var item = document.createElementNS(XUL_NS, "menuitem"); // crée un nouvel élément de menu XUL
    item.setAttribute("label", aLabel);
    return item;
}

function CBDinitpanel() {

    document.getElementById("CBDoption1").checked = prefs.getBoolPref("extensions.confirmbeforedelete.addressbook.enable");

    if (prefs.getPrefType("mail.warn_on_shift_delete") > 0) {
        nativeShiftDelete = true;
        document.getElementById("CBDoption3").checked = prefs.getBoolPref("mail.warn_on_shift_delete");
    } else {
        document.getElementById("CBDoption3").checked = prefs.getBoolPref("extensions.confirmbeforedelete.shiftcanc.enable");
        nativeShiftDelete = false;
    }
    document.getElementById("CBDoption4").checked = prefs.getBoolPref("extensions.confirmbeforedelete.delete.enable");
    document.getElementById("CBDoption5").checked = !prefs.getBoolPref("extensions.confirmbeforedelete.default.cancel");
    document.getElementById("CBDoption6").checked = prefs.getBoolPref("extensions.confirmbeforedelete.calendar.enable");
    document.getElementById("CBDoption7").checked = prefs.getBoolPref("extensions.confirmbeforedelete.folders.lock");
    document.getElementById("CBDoption8").checked = prefs.getBoolPref("extensions.confirmbeforedelete.gotrash.enable");
    document.getElementById("CBDoption9").checked = prefs.getBoolPref("extensions.confirmbeforedelete.delete.lock");
    document.getElementById("CBDoption2").checked = !(prefs.getBoolPref("mailnews.emptyTrash.dontAskAgain"));
    document.getElementById("CBDoption10").checked = prefs.getBoolPref("extensions.confirmbeforedelete.protect.enable");

    if (document.getElementById("CBDoption9").checked) {
        document.getElementById("CBDoption3").setAttribute("disabled", "true");
        document.getElementById("CBDoption4").setAttribute("disabled", "true");
        document.getElementById("CBDoption8").setAttribute("disabled", "true");
    }

    var taglist = document.getElementById("taglist");
    var tagpop = document.getElementById("tagpop");
    var TagKey = prefs.getCharPref("extensions.confirmbeforedelete.protect.tag");

    for (var inc = 0; inc < allTags.length; inc++) {
        var aTag = createMenuItem(allTags[inc].tag);
        aTag.style.setProperty("color", allTags[inc].color, "");
        tagpop.appendChild(aTag);
        if (allTags[inc].key == TagKey)
            taglist.selectedIndex = inc;
    }
    if (!document.getElementById("CBDoption10").checked) {
        taglist.setAttribute("disabled", "true");
    }
}

function toggleTag(el) {
    var taglist = document.getElementById("taglist");
    if (el.checked) {
        taglist.removeAttribute("disabled");
    } else {
        taglist.setAttribute("disabled", "true");
    }
}

function listChange() {
    var taglist = document.getElementById("taglist");
    taglist.style.setProperty("color", taglist.selectedItem.style.color, "");
}

function toggleDeleteLock(el) {
    if (el.checked) {
        document.getElementById("CBDoption3").setAttribute("disabled", "true");
        document.getElementById("CBDoption4").setAttribute("disabled", "true");
        document.getElementById("CBDoption8").setAttribute("disabled", "true");
        document.getElementById("CBDoption10").setAttribute("disabled", "true");
        document.getElementById("taglist").setAttribute("disabled", "true");
    } else {
        document.getElementById("CBDoption3").removeAttribute("disabled");
        document.getElementById("CBDoption4").removeAttribute("disabled");
        document.getElementById("CBDoption8").removeAttribute("disabled");
        document.getElementById("CBDoption10").removeAttribute("disabled");
        if (document.getElementById("CBDoption10").checked) {
            let taglist = document.getElementById("taglist");
            taglist.removeAttribute("disabled");
        }
    }
}

document.addEventListener("dialogaccept", function (event) {
    prefs.setBoolPref("extensions.confirmbeforedelete.addressbook.enable", document.getElementById("CBDoption1").checked);
    prefs.setBoolPref("mailnews.emptyTrash.dontAskAgain", !(document.getElementById("CBDoption2").checked));
    if (nativeShiftDelete)
        prefs.setBoolPref("mail.warn_on_shift_delete", document.getElementById("CBDoption3").checked);
    else
        prefs.setBoolPref("extensions.confirmbeforedelete.shiftcanc.enable", document.getElementById("CBDoption3").checked);
    prefs.setBoolPref("extensions.confirmbeforedelete.delete.enable", document.getElementById("CBDoption4").checked);
    prefs.setBoolPref("extensions.confirmbeforedelete.default.cancel", !document.getElementById("CBDoption5").checked);
    prefs.setBoolPref("extensions.confirmbeforedelete.calendar.enable", document.getElementById("CBDoption6").checked);
    prefs.setBoolPref("extensions.confirmbeforedelete.folders.lock", document.getElementById("CBDoption7").checked);
    prefs.setBoolPref("extensions.confirmbeforedelete.gotrash.enable", document.getElementById("CBDoption8").checked);
    prefs.setBoolPref("extensions.confirmbeforedelete.delete.lock", document.getElementById("CBDoption9").checked);
    prefs.setBoolPref("extensions.confirmbeforedelete.protect.enable", document.getElementById("CBDoption10").checked);

    var taglist = document.getElementById("taglist");
    prefs.setCharPref("extensions.confirmbeforedelete.protect.tag", allTags[taglist.selectedIndex].key);
    prefs.setBoolPref("extensions.confirmbeforedelete.protect.enable", document.getElementById("CBDoption10").checked);
});