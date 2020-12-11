// cleidigh
/*
    ImportExportTools NG is a derivative extension for Thunderbird 60+
    providing import and export tools for messages and folders.
    The derivative extension authors:
        Copyright (C) 2019 : Christopher Leidigh, The Thunderbird Team

    The original extension & derivatives, ImportExportTools, by Paolo "Kaosmos",
    is covered by the GPLv3 open-source license (see LICENSE file).
        Copyright (C) 2007 : Paolo "Kaosmos"

    ImportExportTools NG is free software: you can redistribute it and/or modify
    it under the terms of the GNU General Public License as published by
    the Free Software Foundation, either version 3 of the License, or
    (at your option) any later version.

    This program is distributed in the hope that it will be useful,
    but WITHOUT ANY WARRANTY; without even the implied warranty of
    MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
    GNU General Public License for more details.

    You should have received a copy of the GNU General Public License
    along with this program.  If not, see <https://www.gnu.org/licenses/>.
 */

// cleidigh - reformat, services, globals, dialog changes

/* global IETprefs, IETgetComplexPref, IETsetComplexPref, IETpickFile, browser */

var { Services } = ChromeUtils.import('resource://gre/modules/Services.jsm');

function IETsetCharsetPopup(charsetPref) {
    const versionChecker = Services.vc;
    const currentVersion = Services.appinfo.platformVersion;


    var charsetPopup = document.getElementById("charset-list-popup");
    var charsetList = IETprefs.getCharPref("extensions.importexporttoolsng.export.charset_list");
    var charsetItems = charsetList.split(",");
    var menuitem;

    for (var i = 0; i < charsetItems.length; i++) {
        if (versionChecker.compare(currentVersion, "68") >= 0) {
            // replacement for createElement post TB60
            menuitem = document.createXULElement("menuitem");
        } else {
            menuitem = document.createElement("menuitem");
        }

        menuitem.setAttribute("label", charsetItems[i]);
        menuitem.setAttribute("value", charsetItems[i]);
        charsetPopup.appendChild(menuitem);
        if (charsetItems[i] === charsetPref)
            document.getElementById("charset-list").selectedItem = menuitem;
    }
}

function initMboxImportPanel() {

    // Services.console.logStringMessage("options initialization");

    const versionChecker = Services.vc;
    const currentVersion = Services.appinfo.platformVersion;

    // cleidigh - TB68 groupbox needs hbox/label
    if (versionChecker.compare(currentVersion, "61") >= 0) {
        var captions = document.querySelectorAll("caption");
        for (let i = 0; i < captions.length; i++) {
            captions[i].style.display = "none";
        }
    } else {
        var groupboxtitles = document.querySelectorAll(".groupbox-title");
        for (let i = 0; i < groupboxtitles.length; i++) {
            groupboxtitles[i].style.display = "none";
        }
    }

    var IETngVersion = window.opener.ietng.extension.addonData.version;

    document.getElementById("optionsdialog").setAttribute("title", "ImportExportTools NG - v" + IETngVersion);

    var os = navigator.platform.toLowerCase();
    if (!os.includes("win")) {
        document.documentElement.style.setProperty("--groupbox-header-bg", "#f0f0f0");
        document.documentElement.style.setProperty("--question-height", "28px");
    }

    IETsetCharsetPopup("");

    document.getElementById("MBoverwrite").checked = IETprefs.getBoolPref("extensions.importexporttoolsng.export.overwrite");
    document.getElementById("MBasciiname").checked = IETprefs.getBoolPref("extensions.importexporttoolsng.export.filenames_toascii");
    document.getElementById("MBconfrimimport").checked = IETprefs.getBoolPref("extensions.importexporttoolsng.confirm.before_mbox_import");
    document.getElementById("MBhtmlasdisplayed").checked = IETprefs.getBoolPref("extensions.importexporttoolsng.export.HTML_as_displayed");
    document.getElementById("MBcliptextplain").checked = IETprefs.getBoolPref("extensions.importexporttoolsng.clipboard.always_just_text");
    document.getElementById("MBsubmaxlen").value = IETprefs.getIntPref("extensions.importexporttoolsng.subject.max_length");
    document.getElementById("MBauthmaxlen").value = IETprefs.getIntPref("extensions.importexporttoolsng.author.max_length");
    document.getElementById("MBrecmaxlen").value = IETprefs.getIntPref("extensions.importexporttoolsng.recipients.max_length");
    document.getElementById("setTimestamp").checked = IETprefs.getBoolPref("extensions.importexporttoolsng.export.set_filetime");
    document.getElementById("addtimeCheckbox").checked = IETprefs.getBoolPref("extensions.importexporttoolsng.export.filenames_addtime");
    document.getElementById("buildMSF").checked = IETprefs.getBoolPref("extensions.importexporttoolsng.import.build_mbox_index");
    document.getElementById("addNumber").checked = IETprefs.getBoolPref("extensions.importexporttoolsng.import.name_add_number");

    if (IETprefs.getIntPref("extensions.importexporttoolsng.exportEML.filename_format") === 2)
        document.getElementById("customizeFilenames").checked = true;
    else
        document.getElementById("customizeFilenames").checked = false;


    if (IETprefs.getIntPref("extensions.importexporttoolsng.exportEML.filename_format") === 3)
        document.getElementById("useExtendedFormat").setAttribute("checked", "true");
    else
        document.getElementById("useExtendedFormat").removeAttribute("checked");

    if (IETprefs.getPrefType("extensions.importexporttoolsng.exportMBOX.dir") > 0)
        document.getElementById("export_mbox_dir").value = IETgetComplexPref("extensions.importexporttoolsng.exportMBOX.dir");
    if (IETprefs.getBoolPref("extensions.importexporttoolsng.exportMBOX.use_dir")) {
        document.getElementById("use_export_mbox_dir").checked = true;
        document.getElementById("export_mbox_dir").removeAttribute("disabled");
        document.getElementById("export_mbox_dir").nextSibling.removeAttribute("disabled");
    } else {
        document.getElementById("use_export_mbox_dir").checked = false;
        document.getElementById("export_mbox_dir").setAttribute("disabled", "true");
        document.getElementById("export_mbox_dir").nextSibling.setAttribute("disabled", "true");
    }

    if (IETprefs.getPrefType("extensions.importexporttoolsng.exportEML.dir") > 0)
        document.getElementById("export_eml_dir").value = IETgetComplexPref("extensions.importexporttoolsng.exportEML.dir");
    if (IETprefs.getBoolPref("extensions.importexporttoolsng.exportEML.use_dir")) {
        document.getElementById("use_export_eml_dir").checked = true;
        document.getElementById("export_eml_dir").removeAttribute("disabled");
        document.getElementById("export_eml_dir").nextSibling.removeAttribute("disabled");
    } else {
        document.getElementById("use_export_eml_dir").checked = false;
        document.getElementById("export_eml_dir").setAttribute("disabled", "true");
        document.getElementById("export_eml_dir").nextSibling.setAttribute("disabled", "true");
    }

    if (IETprefs.getPrefType("extensions.importexporttoolsng.exportMSG.dir") > 0)

        document.getElementById("export_msgs_dir").value = IETgetComplexPref("extensions.importexporttoolsng.exportMSG.dir");
    if (IETprefs.getBoolPref("extensions.importexporttoolsng.exportMSG.use_dir")) {
        document.getElementById("use_export_msgs_dir").checked = true;
        document.getElementById("export_msgs_dir").removeAttribute("disabled");
        document.getElementById("export_msgs_dir").nextSibling.removeAttribute("disabled");
    } else {
        document.getElementById("use_export_msgs_dir").checked = false;
        document.getElementById("export_msgs_dir").setAttribute("disabled", "true");
        document.getElementById("export_msgs_dir").nextSibling.setAttribute("disabled", "true");
    }

    if (IETprefs.getPrefType("extensions.importexporttoolsng.export.filename_pattern") > 0) {
        var pattern = IETprefs.getCharPref("extensions.importexporttoolsng.export.filename_pattern");
        var patternParts = pattern.split("-");

        for (var i = 0; i < 3; i++) {
            var list = document.getElementById(`part${i + 1}`);
            var popup = document.getElementById(`part${i + 1}-popup-list`);

            switch (patternParts[i]) {
                case "%d":
                    list.selectedItem = popup.childNodes[1];
                    break;
                case "%D":
                    list.selectedItem = popup.childNodes[2];
                    break;
                case "%k":
                    list.selectedItem = popup.childNodes[3];
                    break;
                case "%n":
                    list.selectedItem = popup.childNodes[4];
                    break;
                case "%a":
                    list.selectedItem = popup.childNodes[5];
                    break;
                case "%r":

                    list.selectedItem = popup.childNodes[6];
                    break;
                case "%e":
                    list.selectedItem = popup.childNodes[7];
                    break;
                default:
                    list.selectedItem = popup.childNodes[0];
            }
        }
    }

    document.getElementById("addPrefix").checked = IETprefs.getBoolPref("extensions.importexporttoolsng.export.filename_add_prefix");
    try {
        document.getElementById("prefixText").value = IETgetComplexPref("extensions.importexporttoolsng.export.filename_prefix");
    } catch (e) { }

    document.getElementById("addSuffix").checked = IETprefs.getBoolPref("extensions.importexporttoolsng.export.filename_add_suffix");
    try {
        document.getElementById("suffixText").value = IETgetComplexPref("extensions.importexporttoolsng.export.filename_suffix");
    } catch (e) { }

    document.getElementById("customDateFormat").value = IETgetComplexPref("extensions.importexporttoolsng.export.filename_date_custom_format");
    document.getElementById("extendedFormat").value = IETgetComplexPref("extensions.importexporttoolsng.export.filename_extended_format");


    document.getElementById("cutSub").checked = IETprefs.getBoolPref("extensions.importexporttoolsng.export.cut_subject");
    document.getElementById("cutFN").checked = IETprefs.getBoolPref("extensions.importexporttoolsng.export.cut_filename");
    customNamesCheck(document.getElementById("customizeFilenames"));
    extendedFormatCheck(document.getElementById("useExtendedFormat"));

    document.getElementById("indexDateFormat").value = IETgetComplexPref("extensions.importexporttoolsng.export.index_date_custom_format");

    var charset = "";
    var textCharset = "";
    var csvSep = "";

    try {
        charset = IETprefs.getCharPref("extensions.importexporttoolsng.export.filename_charset");
        textCharset = IETprefs.getCharPref("extensions.importexporttoolsng.export.text_plain_charset");
        csvSep = IETprefs.getCharPref("extensions.importexporttoolsng.csv_separator");
    } catch (e) {
        charset = "";
        textCharset = "";
        csvSep = "";
    }

    IETsetCharsetPopup(textCharset);
    document.getElementById("filenameCharset").value = charset;
    document.getElementById("csvSep").value = csvSep;

    document.getElementById("skipMsg").checked = IETprefs.getBoolPref("extensions.importexporttoolsng.export.skip_existing_msg");
    if (IETprefs.getBoolPref("extensions.importexporttoolsng.export.use_container_folder")) {
        document.getElementById("indexSetting").selectedIndex = 0;
        document.getElementById("skipMsg").disabled = true;
    } else {
        document.getElementById("indexSetting").selectedIndex = 1;
    }

    // Backup section
    var freq = IETprefs.getIntPref("extensions.importexporttoolsng.autobackup.frequency");

    switch (freq) {
        case 99:
            document.getElementById("frequencyList").selectedIndex = 5;
            document.getElementById("backupEnable").checked = true;
            break;

        case 1:
            document.getElementById("frequencyList").selectedIndex = 0;
            document.getElementById("backupEnable").checked = true;
            break;
        case 3:
            document.getElementById("frequencyList").selectedIndex = 1;
            document.getElementById("backupEnable").checked = true;
            break;
        case 7:
            document.getElementById("frequencyList").selectedIndex = 2;
            document.getElementById("backupEnable").checked = true;
            break;
        case 15:
            document.getElementById("frequencyList").selectedIndex = 3;
            document.getElementById("backupEnable").checked = true;
            break;
        case 30:
            document.getElementById("frequencyList").selectedIndex = 4;
            document.getElementById("backupEnable").checked = true;
            break;
        default:
            document.getElementById("backupEnable").checked = false;
            document.getElementById("frequencyList").disabled = true;
    }

    try {
        document.getElementById("backupDir").value = IETgetComplexPref("extensions.importexporttoolsng.autobackup.dir");
        document.getElementById("backupCustomName").value = IETgetComplexPref("extensions.importexporttoolsng.autobackup.dir_custom_name");
    } catch (e) { }

    document.getElementById("backupType").selectedIndex = IETprefs.getIntPref("extensions.importexporttoolsng.autobackup.type");
    var dir = IETprefs.getIntPref("extensions.importexporttoolsng.autobackup.dir_name_type");
    document.getElementById("backupDirName").selectedIndex = dir;
    document.getElementById("backupType").selectedIndex = IETprefs.getIntPref("extensions.importexporttoolsng.autobackup.type");
    document.getElementById("saveMode").selectedIndex = IETprefs.getIntPref("extensions.importexporttoolsng.autobackup.save_mode");

    var last = IETprefs.getIntPref("extensions.importexporttoolsng.autobackup.last") * 1000;
    if (last > 0) {
        var time = new Date(last);
        var localTime = time.toLocaleString();
        document.getElementById("backupLast").value = localTime;
    }
    document.getElementById("modalWin").checked = IETprefs.getBoolPref("extensions.importexporttoolsng.autobackup.use_modal_dialog");

}

/* function setSaveMode(type) {
    var saveMode = IETprefs.getIntPref("extensions.importexporttoolsng.autobackup.save_mode");
    if (saveMode == 0 || (saveMode == 2 && type ==0))
        document.getElementById("saveMode").selectedIndex = 0;
    else
        document.getElementById("saveMode").selectedIndex = 1;
}

function toggleType(el) {
    setSaveMode(el.selectedIndex);
}*/

function saveMboxImportPrefs() {
    IETprefs.setBoolPref("extensions.importexporttoolsng.export.overwrite", document.getElementById("MBoverwrite").checked);
    IETprefs.setBoolPref("extensions.importexporttoolsng.export.filenames_toascii", document.getElementById("MBasciiname").checked);
    IETprefs.setBoolPref("extensions.importexporttoolsng.confirm.before_mbox_import", document.getElementById("MBconfrimimport").checked);
    IETprefs.setBoolPref("extensions.importexporttoolsng.export.HTML_as_displayed", document.getElementById("MBhtmlasdisplayed").checked);
    IETprefs.setBoolPref("extensions.importexporttoolsng.clipboard.always_just_text", document.getElementById("MBcliptextplain").checked);
    IETprefs.setIntPref("extensions.importexporttoolsng.subject.max_length", document.getElementById("MBsubmaxlen").value);
    IETprefs.setIntPref("extensions.importexporttoolsng.author.max_length", document.getElementById("MBauthmaxlen").value);
    IETprefs.setIntPref("extensions.importexporttoolsng.recipients.max_length", document.getElementById("MBrecmaxlen").value);
    IETprefs.setBoolPref("extensions.importexporttoolsng.export.set_filetime", document.getElementById("setTimestamp").checked);
    IETprefs.setBoolPref("extensions.importexporttoolsng.export.filenames_addtime", document.getElementById("addtimeCheckbox").checked);
    IETprefs.setBoolPref("extensions.importexporttoolsng.import.build_mbox_index", document.getElementById("buildMSF").checked);
    IETprefs.setBoolPref("extensions.importexporttoolsng.import.name_add_number", document.getElementById("addNumber").checked);

    if (document.getElementById("customizeFilenames").checked)
        IETprefs.setIntPref("extensions.importexporttoolsng.exportEML.filename_format", 2);
    else if (document.getElementById("useExtendedFormat").checked) {
        console.debug('please use extended format ');
        IETprefs.setIntPref("extensions.importexporttoolsng.exportEML.filename_format", 3);
    } else
        IETprefs.setIntPref("extensions.importexporttoolsng.exportEML.filename_format", 0);

    IETprefs.setBoolPref("extensions.importexporttoolsng.exportMBOX.use_dir", document.getElementById("use_export_mbox_dir").checked);
    if (document.getElementById("export_mbox_dir").value !== "")
        IETsetComplexPref("extensions.importexporttoolsng.exportMBOX.dir", document.getElementById("export_mbox_dir").value);
    else
        IETprefs.deleteBranch("extensions.importexporttoolsng.exportMBOX.dir");

    IETprefs.setBoolPref("extensions.importexporttoolsng.exportEML.use_dir", document.getElementById("use_export_eml_dir").checked);
    if (document.getElementById("export_eml_dir").value !== "")
        IETsetComplexPref("extensions.importexporttoolsng.exportEML.dir", document.getElementById("export_eml_dir").value);
        IETprefs.deleteBranch("extensions.importexporttoolsng.exportEML.dir");

    IETprefs.setBoolPref("extensions.importexporttoolsng.exportMSG.use_dir", document.getElementById("use_export_msgs_dir").checked);
    if (document.getElementById("export_msgs_dir").value !== "")
        IETsetComplexPref("extensions.importexporttoolsng.exportMSG.dir", document.getElementById("export_msgs_dir").value);
    else
        IETprefs.deleteBranch("extensions.importexporttoolsng.exportMSG.dir");

    var pattern = "";
    for (let u = 1; u < 4; u++) {
        var val = document.getElementById("part" + u.toString()).selectedItem.value;
        if (u > 1 && val)
            val = "-" + val;
        pattern += val;
    }
    IETprefs.setCharPref("extensions.importexporttoolsng.export.filename_pattern", pattern);
    IETprefs.setBoolPref("extensions.importexporttoolsng.export.filename_add_prefix", document.getElementById("addPrefix").checked);
    IETprefs.setBoolPref("extensions.importexporttoolsng.export.filename_add_suffix", document.getElementById("addSuffix").checked);
    // if (document.getElementById("prefixText").value != "")
    IETsetComplexPref("extensions.importexporttoolsng.export.filename_prefix", document.getElementById("prefixText").value);
    IETsetComplexPref("extensions.importexporttoolsng.export.filename_suffix", document.getElementById("suffixText").value);
    IETsetComplexPref("extensions.importexporttoolsng.export.filename_date_custom_format", document.getElementById("customDateFormat").value);
    IETsetComplexPref("extensions.importexporttoolsng.export.index_date_custom_format", document.getElementById("indexDateFormat").value);

    IETsetComplexPref("extensions.importexporttoolsng.export.filename_extended_format", document.getElementById("extendedFormat").value);
    IETprefs.setBoolPref("extensions.importexporttoolsng.export.cut_subject", document.getElementById("cutSub").checked);
    IETprefs.setBoolPref("extensions.importexporttoolsng.export.cut_filename", document.getElementById("cutFN").checked);
    IETprefs.setCharPref("extensions.importexporttoolsng.export.filename_charset", document.getElementById("filenameCharset").value);
    IETprefs.setCharPref("extensions.importexporttoolsng.export.text_plain_charset", document.getElementById("charset-list").selectedItem.value);
    IETprefs.setCharPref("extensions.importexporttoolsng.csv_separator", document.getElementById("csvSep").value);

    if (document.getElementById("indexSetting").selectedIndex === 0)
        IETprefs.setBoolPref("extensions.importexporttoolsng.export.use_container_folder", true);
    else
        IETprefs.setBoolPref("extensions.importexporttoolsng.export.use_container_folder", false);

    // Backup section
    if (!document.getElementById("backupEnable").checked)
        IETprefs.setIntPref("extensions.importexporttoolsng.autobackup.frequency", 0);
    else
        IETprefs.setIntPref("extensions.importexporttoolsng.autobackup.frequency", document.getElementById("frequencyList").selectedItem.value);
    if (document.getElementById("backupDir").value)
        IETsetComplexPref("extensions.importexporttoolsng.autobackup.dir", document.getElementById("backupDir").value);
    else
        IETprefs.deleteBranch("extensions.importexporttoolsng.autobackup.dir");
    IETprefs.setIntPref("extensions.importexporttoolsng.autobackup.dir_name_type", document.getElementById("backupDirName").selectedIndex);
    if (document.getElementById("backupCustomName").value)
        IETsetComplexPref("extensions.importexporttoolsng.autobackup.dir_custom_name", document.getElementById("backupCustomName").value);
    else
        IETprefs.deleteBranch("extensions.importexporttoolsng.autobackup.dir_custom_name");

    IETprefs.setBoolPref("extensions.importexporttoolsng.export.skip_existing_msg", document.getElementById("skipMsg").checked);
    IETprefs.setBoolPref("extensions.importexporttoolsng.autobackup.use_modal_dialog", document.getElementById("modalWin").checked);
    IETprefs.setIntPref("extensions.importexporttoolsng.autobackup.type", document.getElementById("backupType").selectedIndex);
    IETprefs.setIntPref("extensions.importexporttoolsng.autobackup.save_mode", document.getElementById("saveMode").selectedIndex);
}

function customNamesCheck(el) {
    if (!el.checked) {
        document.getElementById("addtimeCheckbox").setAttribute("disabled", "true");
        document.getElementById("part1").setAttribute("disabled", "true");
        document.getElementById("part2").setAttribute("disabled", "true");
        document.getElementById("part3").setAttribute("disabled", "true");
        document.getElementById("addPrefix").setAttribute("disabled", "true");
        document.getElementById("prefixText").setAttribute("disabled", "true");
        document.getElementById("addSuffix").setAttribute("disabled", "true");
        document.getElementById("suffixText").setAttribute("disabled", "true");
        document.getElementById("customDateFormat").setAttribute("disabled", "true");
        document.getElementById("customDateLabel").setAttribute("disabled", "true");

    } else {
        console.debug('disable file names');
        document.getElementById("addtimeCheckbox").removeAttribute("disabled");
        document.getElementById("part1").removeAttribute("disabled");
        document.getElementById("part2").removeAttribute("disabled");
        document.getElementById("part3").removeAttribute("disabled");
        document.getElementById("addPrefix").removeAttribute("disabled");
        document.getElementById("prefixText").removeAttribute("disabled");
        document.getElementById("addSuffix").removeAttribute("disabled");
        document.getElementById("suffixText").removeAttribute("disabled");
        document.getElementById("customDateFormat").removeAttribute("disabled");
        document.getElementById("customDateLabel").removeAttribute("disabled");
        document.getElementById("extendedFormat").setAttribute("disabled", "true");
        document.getElementById("useExtendedFormat").removeAttribute("checked");
        document.getElementById("extendedFormatLabel").setAttribute("disabled", "true");

    }
}


function extendedFormatCheck(el) {
    if (el.checked) {
        document.getElementById("customizeFilenames").setAttribute("checked", "false");
        document.getElementById("addtimeCheckbox").setAttribute("disabled", "true");
        document.getElementById("part1").setAttribute("disabled", "true");
        document.getElementById("part2").setAttribute("disabled", "true");
        document.getElementById("part3").setAttribute("disabled", "true");
        document.getElementById("addPrefix").setAttribute("disabled", "true");
        document.getElementById("prefixText").setAttribute("disabled", "true");
        document.getElementById("addSuffix").setAttribute("disabled", "true");
        document.getElementById("suffixText").setAttribute("disabled", "true");
        document.getElementById("customDateFormat").setAttribute("disabled", "true");
        document.getElementById("customDateLabel").setAttribute("disabled", "true");
        document.getElementById("extendedFormat").removeAttribute("disabled");
        document.getElementById("extendedFormatLabel").removeAttribute("disabled");

    } else {
        document.getElementById("extendedFormat").setAttribute("disabled", "true");
        document.getElementById("extendedFormatLabel").setAttribute("disabled", "true");

    }
}


function toggleDirCheck(el) {
    if (!el.checked) {
        el.nextSibling.setAttribute("disabled", "true");
        el.nextSibling.nextSibling.setAttribute("disabled", "true");
    } else {
        el.nextSibling.removeAttribute("disabled");
        el.nextSibling.nextSibling.removeAttribute("disabled");
    }
}

function toggleBackup(el) {
    document.getElementById("frequencyList").disabled = !el.checked;
}

function toggleSkipMsg(el) {
    document.getElementById("skipMsg").disabled = (el.selectedIndex === 0);
}

function pickFile(el) {
    IETpickFile(el);
}

document.addEventListener("dialogaccept", function (event) {
    saveMboxImportPrefs();
});

window.addEventListener("load", function (event) {
    initMboxImportPanel();
});
