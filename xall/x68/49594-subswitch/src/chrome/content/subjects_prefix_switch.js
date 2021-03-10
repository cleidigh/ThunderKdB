var { MsgHdrToMimeMessage } = ChromeUtils.import("resource:///modules/gloda/MimeMessage.jsm");
var { mimeMsgToContentSnippetAndMeta } = ChromeUtils.import("resource:///modules/gloda/GlodaContent.jsm");

if(!com.ktsystems.subswitch.SubSwitchMain) com.ktsystems.subswitch.SubSwitchMain={};

com.ktsystems.subswitch.SubSwitchMain = {
    rdi_loadStatus : false,
    rdi_initStatus : false,
    rdi_isRD : false,
    loadRDfromEmail : true,
    addRDtoEmail : true,
    showSSBeforeMsgSubject : true,
    rdi_curr : null,

    init : function() {
        var subMain = com.ktsystems.subswitch.SubSwitchMain;
        if (subMain.rdi_initStatus)
            return;
        var prefs = com.ktsystems.subswitch.Const.subswitch_prefs;
        var defaultRD;
        var offbydefault, contextmenu;
        var initdelay = 1000;

        try {
            defaultRD = parseInt(prefs.getCharPref("defaultrd"));
            offbydefault = prefs.getBoolPref("offbydefault");
            contextmenu = prefs.getBoolPref("contextmenu");
            subMain.showSSBeforeMsgSubject = prefs.getBoolPref("beforeMsgSubject");
            subMain.loadRDfromEmail = prefs.getBoolPref("loadRDfromEmail");
            subMain.addRDtoEmail = prefs.getBoolPref("addRDtoEmail");
        } catch (e) {
            com.ktsystems.subswitch.Utils.dumpStr('subMain.init-> '+e);
            defaultRD = -1;
            offbydefault = false;
            contextmenu = true;
            initdelay = 1000;
        }

        var ctxmenu = document.getElementById("subjects_prefix_switchContext");
        ctxmenu.setAttribute("hidden", !contextmenu);
        var ctxmenuSep = document.getElementById("subjects_prefix_switchContextSeparator");
        ctxmenuSep.setAttribute("hidden", !contextmenu);

        com.ktsystems.subswitch.SubSwitchMain.createSubToolbar(subMain.showSSBeforeMsgSubject);

        setTimeout(function(){
                com.ktsystems.subswitch.SubSwitchMain.delayedInit(defaultRD, offbydefault);
        }, initdelay);

        subMain.rdi_initStatus = true;
    },

    subjects_prefix_switch : function() {
        var subMain = com.ktsystems.subswitch.SubSwitchMain;
        var subjectElement = document.getElementById("msgSubject");
        var wasPrefix = subMain.rdi_isRD;
        subjectElement.editor.beginTransaction();

        com.ktsystems.subswitch.Utils.dumpStr('XXXXXXXX->' + subMain.rdi_curr + ' ' + subMain.rdi_isRD);
        if (subMain.searchRD(subjectElement)) {
            subMain.removeRD(subjectElement);
        }
        if (wasPrefix || !subMain.rdi_curr) {
            subMain.loadNextPrefix();
        }
        if (!subMain.rdi_isRD && subMain.rdi_curr != null) {
            subMain.insertRD(subjectElement, subMain.rdi_curr);
        }

        com.ktsystems.subswitch.Utils.dumpStr('XXXXXXXX->' + subMain.rdi_curr + ' ' + subMain.rdi_isRD);

        SetComposeWindowTitle();
        subjectElement.editor.endTransaction();
    },

    on_off_prefix : function(onlyRemove) {
        var subMain = com.ktsystems.subswitch.SubSwitchMain;
        var subjectElement = document.getElementById("msgSubject");
        var wasPrefix = subMain.rdi_isRD;
        subjectElement.editor.beginTransaction();

        if (!onlyRemove && !subMain.rdi_isRD && subMain.rdi_curr != null) {
            subMain.insertRD(subjectElement, subMain.rdi_curr);
        } else {
            if (subMain.searchRD(subjectElement)) {
                subMain.removeRD(subjectElement);
            }
        }

        SetComposeWindowTitle();
        subjectElement.editor.endTransaction();
    },

    loadNextPrefix : function() {
        var subMain = com.ktsystems.subswitch.SubSwitchMain;
        var nextPrefix;
        var prefixes = subMain.loadRDProperty();
        if (!subMain.rdi_curr)  {
            nextPrefix = prefixes[0];
        } else {
            var idx = prefixes.indexOf(subMain.rdi_curr) + 1;
            if (idx <= prefixes.length)  {
                nextPrefix = prefixes[idx];
            } else {
                nextPrefix = null;
            }
        }
        subMain.setPrefix(nextPrefix, true);

        com.ktsystems.subswitch.Utils.dumpStr('loadNextPrefix->' + nextPrefix);
    },

    setPrefix : function(newPrefix, changeSubtoolbarButton) {
        var subMain = com.ktsystems.subswitch.SubSwitchMain;
        var idx;

        subMain.rdi_curr = newPrefix;

        if (newPrefix != null) {
            var prefixes = subMain.loadRDProperty();
            idx = prefixes.indexOf(subMain.rdi_curr) + 1;
        } else {
            idx = -1;
        }
        var subtoolbar = document.getElementById("subjects_prefix_switchMenuPopup-subtoolbarButton");
        if (changeSubtoolbarButton && subtoolbar.selectedIndex != idx) {
            subtoolbar.selectedIndex = idx;
        }

        com.ktsystems.subswitch.Utils.dumpStr('selectedIndex->' + subtoolbar.selectedIndex+ ' ' + idx);
    },

    afterOptionsResetPrefix : function() {
        var subMain = com.ktsystems.subswitch.SubSwitchMain;
        subMain.setPrefix(subMain.rdi_curr, true);
    },

    searchRD : function(subjectElement) {
        var subMain = com.ktsystems.subswitch.SubSwitchMain;
        if (!subMain.rdi_curr)
            return false;

        var indexOf = subjectElement.value.indexOf(subMain.rdi_curr.lastFormattedPrefixValue);
        return (indexOf > -1);
    },

    removeRD : function(subjectElement) {
        var subMain = com.ktsystems.subswitch.SubSwitchMain;
        var start = subjectElement.value.indexOf(subMain.rdi_curr.lastFormattedPrefixValue);
        var len = subMain.rdi_curr.lastFormattedPrefixValue.length

        subjectElement.value =
            // 0 - RD
            subjectElement.value.substring(0, start)
            // RD - koniec z usuniecie spacji po RD
            + (subjectElement.value.substring(start+len).charAt(0) == ' '
                ? subjectElement.value.substring(start + len + 1)
                : subjectElement.value.substring(start + len));

       subMain.removeAddress(subMain.rdi_curr);

       subMain.rdi_isRD = false;
    },

    removeAddress : function(rd) {
        var msgCompFields = gMsgCompose.compFields;

        if (rd != null && rd.addresses != null) {
            for (var i = 0; i < rd.addresses.length; i++) {
                var address = rd.addresses[i].split(':');
                var type = 'addr_' + address[0].toLowerCase();
                if (address[1] != null) {
                    awRemoveRecipients(msgCompFields, type, [address[1]]);
                }
            }
        }
    },

    insertRD : function(subjectElement, rd) {
        var subMain = com.ktsystems.subswitch.SubSwitchMain;
        subjectElement.editor.beginningOfDocument();
        subjectElement.value = rd.formattedPrefixValue + ' ' + subjectElement.value;

        subMain.setPrefix(rd, true);
        subMain.rdi_isRD = true;
        subMain.insertAddress(rd);

        com.ktsystems.subswitch.Utils.dumpStr('insertRD->' + rd.formattedPrefixValue + ' ' +rd.description);
    },

    insertAddress : function(rd) {
        var msgCompFields = gMsgCompose.compFields;

        if (rd != null && rd.addresses != null) {
            for (var i = 0; i < rd.addresses.length; i++) {
                var address = rd.addresses[i].split(':');
                var type = 'addr_' + address[0].toLowerCase();
                if (address[1] != null) {
                    awAddRecipients(msgCompFields,type, address[1]);
                }
            }
        }
    },

    loadRD : function(idx, del) {
        var subMain = com.ktsystems.subswitch.SubSwitchMain;
        var rd = subMain.loadRDProperty()[idx];

        var subjectElement = document.getElementById("msgSubject");
        var currentEditor = subjectElement.editor;
        var initialRange = currentEditor.selection.getRangeAt(0).cloneRange();
        var hasRD = subMain.searchRD(subjectElement);
        currentEditor.beginTransaction();

        if (hasRD && del) {
            subMain.removeRD(subjectElement);
        }
        subMain.insertRD(subjectElement, rd);

        SetComposeWindowTitle();
        currentEditor.endTransaction();

        currentEditor.selection.removeAllRanges();
        currentEditor.selection.addRange(initialRange);

        subMain.sanitize();
    },

    sanitize : function()  {
        com.ktsystems.subswitch.SubSwitchMain.rdi_initStatus = false;
    },

    ensurePrefs : function() {
        var subConst = com.ktsystems.subswitch.Const;
        for (var i = 0; i < subConst.CONFIGURATION_IDS.length; i++) {
            if (subConst.subswitch_prefs.getPrefType(subConst.CONFIGURATION_IDS[i])
                    == subConst.subswitch_prefs.PREF_INVALID)  {
                com.ktsystems.subswitch.Utils.openOptions(true);
                return;
             }
        }
     },

    onLoad : function() {
        var subMain = com.ktsystems.subswitch.SubSwitchMain;
        if (subMain.rdi_loadStatus)
            return;
        subMain.ensurePrefs();
        subMain.init();

        subMain.rdi_loadStatus = true;
    },

    delayedInit : function(defaultRD, offbydefault) {
        var subMain = com.ktsystems.subswitch.SubSwitchMain;
        com.ktsystems.subswitch.Utils.dumpStr('delayedInit ->' + defaultRD + ' ' +offbydefault);
        var hasDefaultRD = defaultRD > -1;
        if (hasDefaultRD && !subMain.loadRDfromEmail) {
            subMain.initWithDefault(defaultRD, offbydefault);
        }

        if (gMsgCompose.type == Components.interfaces.nsIMsgCompType.New) {
            subMain.findSubSwitchHeaderNew(defaultRD, offbydefault);
        } else if (subMain.loadRDfromEmail) {
            subMain.loadOriginalMsgSSHeader(defaultRD, offbydefault);
        }
    },

    initWithDefault : function(defaultRD, offbydefault) {
        var subMain = com.ktsystems.subswitch.SubSwitchMain;
        //subMain.setPrefix(subMain.loadRDProperty()[defaultRD], false);
        //if (!offbydefault && subMain.rdi_curr) {
        var rd = subMain.loadRDProperty()[defaultRD];
        if (!offbydefault && rd) {
            subMain.setPrefix(rd, false);
            subMain.loadRD(defaultRD, subMain.rdi_initStatus);
        }
    },

    initMenuPopup : function(element) {
        console.log("Init of initMenuPopup - START");
        var subMain = com.ktsystems.subswitch.SubSwitchMain;
        var menuPopup = document.getElementById("subjects_prefix_switchMenuPopup-" + element);

        com.ktsystems.subswitch.Utils.removeMenuItems(menuPopup);

        if (element == "menu" || element == "context") {
            subMain.insertOnOffItem(menuPopup,
                com.ktsystems.subswitch.Utils.getLocalizedMessage("menuItem.onOff"),
                com.ktsystems.subswitch.Utils.getLocalizedMessage("toolTip.onOff"));
            menuPopup.appendChild(document.createXULElement("menuseparator"));
        } else if (element == "subtoolbar") {
            subMain.insertEraseItem(menuPopup,
                "",
                com.ktsystems.subswitch.Utils.getLocalizedMessage("toolTip.onOff"));
        }

        var rdData = subMain.loadRDProperty();

        for (var i = 0; i < rdData.length; i++) {
            subMain.insertMenuItem(menuPopup, rdData[i].description, rdData[i].rd, i);
        }

        if (rdData.length > 0) {
            menuPopup.appendChild(document.createXULElement("menuseparator"));
        }

        subMain.insertOptionsItem(menuPopup,
            com.ktsystems.subswitch.Utils.getLocalizedMessage("menuItem.options"),
            com.ktsystems.subswitch.Utils.getLocalizedMessage("toolTip.enterOptions"))

        console.log("Init of initMenuPopup - END");
    },

    loadRDProperty : function() {
        return com.ktsystems.subswitch.PrefixesListSingleton.getInstance().getPrefixesList();
    },

    insertMenuItem : function(menu, label, tooltip, idx) {
        var item = com.ktsystems.subswitch.Utils.createMenuItem("subjects_prefix_switch_RD_" + idx, label, tooltip, "com.ktsystems.subswitch.SubSwitchMain.loadRD(" + idx + ", true); event.stopPropagation();");
		menu.appendChild(item);
    },

    insertOptionsItem : function(menu, label, tooltip) {
        var item = com.ktsystems.subswitch.Utils.createMenuItem("subjects_prefix_switch_openOptions", label, tooltip, "com.ktsystems.subswitch.SubSwitchMain.afterOptionsResetPrefix(); com.ktsystems.subswitch.Utils.openOptions(event, false); event.stopPropagation();");
		menu.appendChild(item);
    },

    insertOnOffItem : function(menu, label, tooltip) {
        var item = com.ktsystems.subswitch.Utils.createMenuItem("subjects_prefix_switch_onOff",  label, tooltip, "com.ktsystems.subswitch.SubSwitchMain.on_off_prefix(false); event.stopPropagation();");
		menu.appendChild(item);
    },

	insertEraseItem : function(menu, label, tooltip) {
        var item = com.ktsystems.subswitch.Utils.createMenuItem("subjects_prefix_switch_onOff",  label, tooltip, "com.ktsystems.subswitch.SubSwitchMain.on_off_prefix(true); event.stopPropagation();");
		menu.appendChild(item);
    },

	loadOriginalMsgSSHeader : function(defaultRD, offbydefault) {
        com.ktsystems.subswitch.Utils.dumpStr('-> loadOriginalMsgSSHeader; defaultRD = '+offbydefault+'; defaultRD = '+offbydefault);
        let messenger = Components.classes["@mozilla.org/messenger;1"].createInstance(Components.interfaces.nsIMessenger);
        let msgURI = gMsgCompose.originalMsgURI;
        com.ktsystems.subswitch.Utils.dumpStr('loadOriginalMsgSSHeader; originalMsgURI->'+msgURI);
        if (msgURI) {
            let msgHdr = messenger.messageServiceFromURI(msgURI).messageURIToMsgHdr(msgURI);

            if (com.ktsystems.subswitch.SubSwitchMain.isAddressOnIgnoreList(msgHdr.author) != true) {
                try {
                    MsgHdrToMimeMessage(msgHdr, null, function(aMsgHdr, aMimeMsg) {
                        var subMain = com.ktsystems.subswitch.SubSwitchMain;
                        com.ktsystems.subswitch.Utils.dumpStr('-> MsgHdrToMimeMessage; aMimeMsg = '+aMimeMsg);
                        if (aMimeMsg == null) /* shouldn't happen, but sometimes does? */
                            return;

                        let item = subMain.findSubSwitchHeader(aMimeMsg);

                        if (item != null) {
                            subMain.initMenuPopup('subtoolbar');
                            subMain.setPrefix(item, true);
                            subMain.rdi_isRD = true;
                        } else {
                            subMain.initWithDefault(defaultRD, offbydefault);
                        }
                        com.ktsystems.subswitch.Utils.dumpStr('<- MsgHdrToMimeMessage; item = '+item);
                     });
                } catch (e) {
                    if (e.result == Components.results.NS_ERROR_FAILURE) {
                       com.ktsystems.subswitch.Utils.dumpStr('loadOrgMsg; no ssHeader ->' + e);
                    } else {
                        com.ktsystems.subswitch.Utils.dumpStr('loadOrgMsg; no XXX ->' + e);
                    }
                }
            }
        } else {
            com.ktsystems.subswitch.SubSwitchMain.initWithDefault(defaultRD, offbydefault);
        }
        com.ktsystems.subswitch.Utils.dumpStr('<- loadOriginalMsgSSHeader');
    },

    isAddressOnIgnoreList : function(author) {
        com.ktsystems.subswitch.Utils.dumpStr('-> isAddressOnIgnoreList; author = '+author);
        var result = false;
        com.ktsystems.subswitch.Utils.dumpStr(author);
        var ignoreList = com.ktsystems.subswitch.Const.subswitch_prefs.getStringPref("discoveryIgnoreList").split(";");

        if (author.charAt(0) == "\"" && author.charAt(author.length - 1) == "\"")
            author = author.substring(1, author.length - 1);
        if (author.indexOf(">") > -1) {
            let authorStripRegEx = new RegExp("(" + com.ktsystems.subswitch.Const.rx_user + "\@" + com.ktsystems.subswitch.Const.rx_domain + ")");
            let m = authorStripRegEx.exec(author);
            if (m != null) {
                author = m[0];
            }
        }
        com.ktsystems.subswitch.Utils.dumpStr(author);

        if (ignoreList.length > 0) {
            var validate = new RegExp(com.ktsystems.subswitch.Const.rx);
            var match;
            if (validate.test(author)) {
                for (var j = 0; j < ignoreList.length; j++) {
                    if (ignoreList[j].indexOf("?") > -1) {
                        let ignoreTriggerRegEx = new RegExp(ignoreList[j].split("?").join(com.ktsystems.subswitch.Const.rx_wildcard));
                        com.ktsystems.subswitch.Utils.dumpStr(">>>"+ignoreList[j].split("?").join(com.ktsystems.subswitch.Const.rx_wildcard));
                        match = ignoreTriggerRegEx.test(author);
                    } else {
                        match = (ignoreList[j].toLowerCase() == author.toLowerCase());
                    }

                    if (match) {
                        result = true;
                        break;
                    }
                }
            }
        }

        com.ktsystems.subswitch.Utils.dumpStr('<- isAddressOnIgnoreList; result = '+result);
        return result;
    },

    findSubSwitchHeader : function(aMimeMsg) {
        com.ktsystems.subswitch.Utils.dumpStr('-> findSubSwitchHeader; aMimeMsg = '+aMimeMsg);
        let ssKey, ssDesctiption;
        let remotePrefixItem;
        let ssHeader = aMimeMsg.get(com.ktsystems.subswitch.Const.SUBSWITCH_MIME_HEADER);
        com.ktsystems.subswitch.Utils.dumpStr('findSubSwitchHeader; ssHeader ->'+ssHeader);
        var subMain = com.ktsystems.subswitch.SubSwitchMain;

        if (ssHeader) {
            let ssStrings = subMain.decodeEncodeHeader(ssHeader).split(';');
            ssDesctiption = ssStrings[0].trim();
            ssKey = ssStrings[1].trim();
        } else {
            let discoveryPattern = com.ktsystems.subswitch.Const.subswitch_prefs.getCharPref("discoveryItemPattern");
            let subject = aMimeMsg.get("Subject");
            let re = new RegExp(discoveryPattern);
            let m = re.exec(subject);
            if (m != null) {
                ssKey = m[0];
                ssDesctiption = m[0];
            }
        }

        if (ssKey != null) {
            remotePrefixItem = new com.ktsystems.subswitch.PrefixItem(ssDesctiption, ssKey);
            com.ktsystems.subswitch.Utils.dumpStr('findSubSwitchHeader; dopasowanie prefiksu remoteSP ->'+remotePrefixItem);

            let rdData = subMain.loadRDProperty();
            let idx = subMain.loadRDProperty().indexOfComplex(remotePrefixItem);
            let found = (idx >= 0);
            com.ktsystems.subswitch.Utils.dumpStr('findSubSwitchHeader; found ->' + found);

            if (!found) {
                if (!subMain.displayConfirm(remotePrefixItem)) {
                    remotePrefixItem = null;
                }
            } else {
                remotePrefixItem = subMain.loadRDProperty()[idx];
            }
        }

        com.ktsystems.subswitch.Utils.dumpStr('<- findSubSwitchHeader; remotePrefixItem = '+remotePrefixItem);
        return remotePrefixItem;
    },

    findSubSwitchHeaderNew : function(defaultRD, offbydefault) {
        var subMain = com.ktsystems.subswitch.SubSwitchMain;
        var subjectElement = document.getElementById("msgSubject");
        var ssKey = subjectElement.value;

        var item = new com.ktsystems.subswitch.PrefixItem(ssKey, ssKey);
        let idx = subMain.loadRDProperty().indexOf(item);
        let found = (idx >= 0);
        if (found) {
            item = subMain.loadRDProperty()[idx];
            subMain.initMenuPopup('subtoolbar');
            subMain.setPrefix(item, true);
            subMain.rdi_isRD = true;
        } else {
            subMain.initWithDefault(defaultRD, offbydefault);
        }
    },

    displayConfirm : function (remotePrefixItem) {
        var strbundle = document.getElementById("subjects_prefix_switch.locale");

        var title = strbundle.getString("discovery.confirmTitle");
        var msg = strbundle.getString("discovery.confirmMessage");
        var header = strbundle.getString("discovery.confirmHeader");
        var params = Components.classes["@mozilla.org/embedcomp/dialogparam;1"].createInstance(Components.interfaces.nsIDialogParamBlock);
        params.SetNumberStrings(30);

        params.SetString(0, msg);
        params.SetString(2, "question-icon");
        params.SetString(3, header);
        params.SetString(12, title);

        params.SetString(20, remotePrefixItem.rd);
        params.SetString(21, remotePrefixItem.description);

        window.openDialog("chrome://subjects_prefix_switch/content/prefix_found.xhtml", null,
            "chrome,centerscreen,modal,dialog,resizable=no", params);
        com.ktsystems.subswitch.Utils.dumpStr('parseSubSwitchMimeHeader; displayConfirm4 ->');

        remotePrefixItem.rd = params.GetString(20);
        remotePrefixItem.description = params.GetString(21);

        return params.GetInt(0) == 0 ? true : false;
    },

    onSend : function() {
        var subMain = com.ktsystems.subswitch.SubSwitchMain;

        subMain.rdi_curr.incSeqValue();
        com.ktsystems.subswitch.PrefixesListSingleton.getInstance().savePrefixesSequences();
        com.ktsystems.subswitch.Utils.dumpStr('-> onSend; currentSeqValue 3= '+subMain.rdi_curr.currentSeqValue);

        com.ktsystems.subswitch.Utils.dumpStr('-> onSend; addRDtoEmail = '+subMain.addRDtoEmail);
        if (subMain.addRDtoEmail && subMain.rdi_isRD) {
            try {
                gMsgCompose.compFields.setHeader(com.ktsystems.subswitch.Const.SUBSWITCH_MIME_HEADER,
                         subMain.mimeEncodeHeader(subMain.rdi_curr.description + "; " + subMain.rdi_curr.rd, gMsgCompose.compFields.characterSet));
            } catch (ex) {
                com.ktsystems.subswitch.Utils.dumpStr ("ERROR: Cannot add current RD to message\n" + ex + "\r\n");
            }
        }
        subMain.rdi_curr = null;
        com.ktsystems.subswitch.Utils.dumpStr('<- onSend');
    },

    mimeEncodeHeader: function(aHeader, aCharset) {
        // Get the mime header encoder service
        var mimeEncoder = Components.classes["@mozilla.org/messenger/mimeconverter;1"]
                                    .getService(Components.interfaces.nsIMimeConverter);

        // This routine sometimes throws exceptions for mis-encoded data so
        // wrap it with a try catch for now..
        var newHeader;
        try {
            newHeader = mimeEncoder.encodeMimePartIIStr_UTF8(
                aHeader,
                false, aCharset, 0, 72);
        } catch (ex) {
            newHeader = aHeader;
        }

        return newHeader;
    },

    decodeEncodeHeader: function(aHeader) {
        // Get the mime header encoder service
        var mimeEncoder = Components.classes["@mozilla.org/messenger/mimeconverter;1"]
                                    .getService(Components.interfaces.nsIMimeConverter);

        // This routine sometimes throws exceptions for mis-encoded data so
        // wrap it with a try catch for now..
        var newHeader;
        try {
            newHeader = mimeEncoder.decodeMimeHeader(
                aHeader, null, false, true);
        } catch (ex) {
            newHeader = aHeader;
        }
        return newHeader;
    },

    createSubToolbar : function(isVisible) {
        var subtoolbar = document.getElementById("subjects_prefix_switchMenuPopup-subtoolbarButton");

        var ms = document.getElementById("msgSubject");

        //TB 5.0 fix
        if (ms.parentNode.firstChild.nodeName == 'hbox') {
            ms = ms.parentNode.firstChild;
        } else {
            ms = ms.parentNode;
        }

        ms.insertBefore(subtoolbar, ms.firstChild);

        var subMain = com.ktsystems.subswitch.SubSwitchMain;
        subMain.initMenuPopup('subtoolbar');

        subtoolbar.selectedIndex = -1;

        subtoolbar.setAttribute("hidden", !isVisible);
    },

    initMsgWindowToolbar : function() {
         try {
            var subMain = com.ktsystems.subswitch.SubSwitchMain;
            var toolbar = document.getElementById("composeToolbar2");
            var curSet = toolbar.currentSet;
            if (!subMain.showSSBeforeMsgSubject
                    && curSet.indexOf("subjects_prefix_switchButton") == -1) {
                var set;
                set = curSet + ",subjects_prefix_switchButton";
                toolbar.setAttribute("currentset", set);
                toolbar.currentSet = set;
                document.persist("composeToolbar2", "currentset");
            }
        } catch(e) {
            com.ktsystems.subswitch.Utils.dumpStr('subMain.initMsgWindowToolbar-> '+e);
        }
    }
};
