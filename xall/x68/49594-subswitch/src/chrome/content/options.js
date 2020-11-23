const { XPCOMUtils } = ChromeUtils.import("resource://gre/modules/XPCOMUtils.jsm");

if(!com.ktsystems.subswitch.OptionsPanel) com.ktsystems.subswitch.OptionsPanel={};
if(!com.ktsystems.subswitch.OptionsTreeView) com.ktsystems.subswitch.OptionsTreeView={};

const ssMsgNotification = {};
XPCOMUtils.defineLazyGetter(ssMsgNotification, "notificationbox", () => {
    return new MozElements.NotificationBox(element => {
        element.setAttribute("flex", "1");
        element.setAttribute("notificationside", "bottom");

        document.getElementById("ssMsg-notification").append(element);
    });
});

com.ktsystems.subswitch.OptionsTreeView = function(items, defaultsignature){
    this.items = items;
    this.defaultsignature = defaultsignature;
    this.treebox = null;
}

com.ktsystems.subswitch.OptionsTreeView.prototype = {

    invalidate: function() {
        this.treebox.invalidate();
    },

    swap: function(idx1, idx2) {
        if ((idx1 == idx2) || (idx1 < 0) || (idx2 < 0))
            return;

        var temp = this.items[idx1];

        this.items[idx1] = this.items[idx2];
        this.items[idx2] = temp;

        if (this.defaultsignature == idx1) {
            this.defaultsignature = idx2;
        }
        else if (this.defaultsignature == idx2) {
            this.defaultsignature = idx1;
        }
    },

    insertItem: function(newItem) {
        try{
            this.items.push(newItem);
            this.treebox.rowCountChanged(this.rowCount, 1);

            if (this.items.length == 1) {
                this.defaultsignature = 0;
            }
        } catch (err) {
            alert(err);
        }
    },

    deleteSelectedItem: function() {
        try {
            var selIdx = this.selection.currentIndex;

            if (selIdx < 0)
                return;

            var removedItems = this.items.splice(selIdx, 1);

            if (selIdx == this.defaultsignature) {
                this.defaultsignature = -1;
            } else if (selIdx < this.defaultsignature) {
                this.defaultsignature = this.defaultsignature - 1;
            }
            this.treebox.rowCountChanged(selIdx, -1);

            if (this.items.length > 0)
                this.selection.select(selIdx == 0 ? 0 : selIdx - 1);

            if (this.items.length == 1) {
                this.defaultsignature = 0;
            }
        } catch (err){
            alert(err);
        }
    },

    getCellText: function(row, column){
        switch (typeof(column) == "object" ? column.id : column){
            case "default":
                return (row == this.defaultsignature ? "Y" : "N");
            case "description":
                return this.items[row].description;
            case "rd":
                return this.items[row].rd;
            case "showInNewMsgPopup":
                return this.items[row].showInNewMsgPopup;
            case "aliases":
                return this.items[row].aliases.join(", ");
            default:
                return "";
        }
    },

    setTree: function(treebox){
        this.treebox = treebox;
    },

    cycleCell: function(row, column){
        var col = (typeof(column) == "object" ? column.id : column);
        if (col == "default") {
            if (row == this.defaultsignature){
                this.defaultsignature = -1;
            } else{
                var currDef = this.defaultsignature;
                this.defaultsignature = row;
                this.items[row].isVisible = true;
                this.treebox.invalidateCell(currDef, column);
            }
        }
        if (col == "showInNewMsgPopup") {
            this.items[row].showInNewMsgPopup = !this.items[row].showInNewMsgPopup;
            this.treebox.invalidateCell(row, column);
        }

        this.selection.select(row);
        this.treebox.invalidateRow(row);
    },

    getImageSrc: function(row, column) {
        var col = (typeof(column) == "object" ? column.id : column);
        var result = null;

        if (col == "default" && row == this.defaultsignature) {
            result = "resource://subjects_prefix_switch/default.png";
        } else if (col == "showInNewMsgPopup" && this.items[row].showInNewMsgPopup) {
            result =  "resource://subjects_prefix_switch/emblem-important.png";
        }

        return result;
    },

    get rowCount() {
        return this.items.length;
    },

    isContainer: function(row) { return false; },
    isSeparator: function(row) { return false; },
    isSorted: function(row) { return false; },
    cycleHeader: function(col, elem) {},
    getLevel: function(row) { return 0; },
    getRowProperties: function(row, props) {},
    getCellProperties: function(row, col, props) {},
    getColumnProperties: function(colid, col, props) {}
};

com.ktsystems.subswitch.OptionsPanel = {
    rdTree : null,
    rdTreeView : null,

	dumpStr  : function(str) {
        var csClass = Components.classes['@mozilla.org/consoleservice;1'];
        var cs = csClass.getService(Components.interfaces.nsIConsoleService);

        cs.logStringMessage((new Date()).getTime() + ": " + str);
    },

    showMessage : function(title, msg) {
        var nb = ssMsgNotification.notificationbox;

        if (nb) {
            let notification = nb.getNotificationWithValue("ssMsgNotification");
            if (notification) {
                nb.removeNotification(notification);
            }

            nb.appendNotification(msg, "ssMsgNotification",
                "chrome://global/skin/icons/information-16.png",
                nb.PRIORITY_INFO_MEDIUM, null);
        }
    },

    optionsOnLoad : function(){

		document.addEventListener("dialogaccept", function() {
			com.ktsystems.subswitch.OptionsPanel.onDialogAccept();
		});


        var elementID;
        var element;
        var eltType;
        var defpref;
this.dumpStr (1);
       for (var i = 0; i < com.ktsystems.subswitch.Const.CONFIGURATION_IDS.length; i++){
            elementID = com.ktsystems.subswitch.Const.CONFIGURATION_IDS[i];
            element = document.getElementById(elementID);
this.dumpStr (element);
            if  (!element) break;

            eltType = element.localName;
            com.ktsystems.subswitch.Const.subswitch_str.data = element.getAttribute("defaultpref");

            if  (eltType == "radiogroup"){
                try {
                    element.selectedItem = element.childNodes[com.ktsystems.subswitch.Const.subswitch_prefs.getIntPref(element.getAttribute("prefstring"))];
                } catch (e) {
                    element.selectedItem = element.childNodes[element.getAttribute("defaultpref")];
                    try{
                        com.ktsystems.subswitch.Const.subswitch_prefs.setIntPref(element.getAttribute("prefstring"), element.getAttribute("defaultpref") );
                    }catch (e) {this.dumpStr (e);}
                }
            } else if (eltType == "checkbox") {
                try {
                    element.checked = (com.ktsystems.subswitch.Const.subswitch_prefs.getBoolPref(element.getAttribute("prefstring")));
                } catch(e){
                    defpref = element.getAttribute("defaultpref");
                    element.checked = (defpref == "true");
                    try {
                        com.ktsystems.subswitch.Const.subswitch_prefs.setBoolPref(element.getAttribute("prefstring"), (defpref == "true"));
                    } catch (e) {this.dumpStr (e);}
                }
            } else if (eltType == "textbox" || eltType == "input") {
                try {
                    element.setAttribute("value", com.ktsystems.subswitch.Const.subswitch_prefs.getStringPref(element.getAttribute("prefstring")));
                } catch (e) {
                    element.setAttribute("value", element.getAttribute("defaultpref"));
                    try {
                        com.ktsystems.subswitch.Const.subswitch_prefs.setStringPref(element.getAttribute("prefstring"), com.ktsystems.subswitch.Const.subswitch_str);
                    } catch (e) {this.dumpStr (e);}
                }
            } else if (eltType == "menulist") {
                try {
                    element.insertItemAt(0, com.ktsystems.subswitch.Const.subswitch_prefs.getStringPref(element.getAttribute("prefstring")));
                    element.selectedIndex = 0;
                } catch (e) {
                    element.insertItemAt(0, element.getAttribute("defaultpref"));
                    element.selectedIndex = 0;
                    try {
                        com.ktsystems.subswitch.Const.subswitch_prefs.setStringPref(element.getAttribute("prefstring"), com.ktsystems.subswitch.Const.subswitch_str);
                    } catch (e) {this.dumpStr (e);}
                }
            } else if (eltType == "richlistbox") {
                try {
                    com.ktsystems.subswitch.Utils.fillListboxFromArray(element,
                        com.ktsystems.subswitch.Const.subswitch_prefs.getStringPref(element.getAttribute("prefstring")).split(";"));
                } catch (e) {
                    com.ktsystems.subswitch.Utils.fillListboxFromArray(element, element.getAttribute("defaultpref").split(";"));
                    try {
                        com.ktsystems.subswitch.Const.subswitch_prefs.setStringPref(element.getAttribute("prefstring"), com.ktsystems.subswitch.Const.subswitch_str);
                    } catch (e) {this.dumpStr (e);}
                }
            }
        }

        this.initTree();
    },

    findWindowDragBox: function(nb) {
        var kDOMViewCID          = "@mozilla.org/inspector/dom-view;1";
        var mDOMView = Components.classes[kDOMViewCID].getService(Components.interfaces["inIDOMView"]);
        mDOMView.showSubDocuments = true;
        mDOMView.showAnonymousContent = true;
        mDOMView.rootNode = nb;

        var walker = Components.classes["@mozilla.org/inspector/deep-tree-walker;1"].getService(Components.interfaces["inIDeepTreeWalker"]);
        walker.showAnonymousContent = mDOMView.showAnonymousContent;
        walker.showSubDocuments = mDOMView.showSubDocuments;

        walker.init(nb, NodeFilter.SHOW_ALL);
        //walker.init(nb, Components.interfaces.nsIDOMNodeFilter.SHOW_ALL);

        var result;
        while (walker.currentNode) {
            if (this.doFindElementsByTagName(walker)) {
                result = walker.currentNode;
                walker.nextNode();
                break;
            }
            walker.nextNode();
        }

        return result;
    },

     doFindElementsByTagName : function(aWalker) {
        return aWalker.currentNode
               && aWalker.currentNode.nodeType ==  Components.interfaces.nsIDOMNode.ELEMENT_NODE
               && aWalker.currentNode.localName == 'windowdragbox';
    },

    initTree : function() {
        var list = com.ktsystems.subswitch.PrefixesListSingleton.getInstance();
        var treeData = list.prefixesList;
        var defaultRD = -1;
this.dumpStr('initTree1');
        try {
            defaultRD = parseInt(com.ktsystems.subswitch.Const.subswitch_prefs.getCharPref("defaultrd"));
        } catch(e) {}
this.dumpStr('initTree2');
        this.rdTree = document.getElementById("subjects_prefix_switchTree");this.dumpStr('initTree3');

        this.rdTreeView = new com.ktsystems.subswitch.OptionsTreeView(treeData, defaultRD);this.dumpStr('initTree4');
        this.rdTree.view = this.rdTreeView;this.dumpStr('initTree5');
        this.rdTreeView.invalidate();this.dumpStr('initTree6');
        this.onSelectItem();this.dumpStr('initTree7');
    },

    onDialogAccept : function() {
        var elementID;
        var element;
        var eltType;

        for (var i = 0; i < com.ktsystems.subswitch.Const.CONFIGURATION_IDS.length; i++) {
            elementID = com.ktsystems.subswitch.Const.CONFIGURATION_IDS[i];
            element = document.getElementById(elementID);

            if  (!element) break;

            eltType = element.localName;

            if  (eltType == "radiogroup")
                com.ktsystems.subswitch.Const.subswitch_prefs.setIntPref(element.getAttribute("prefstring"), parseInt(element.value));
            else if  (eltType == "checkbox")
                com.ktsystems.subswitch.Const.subswitch_prefs.setBoolPref(element.getAttribute("prefstring"), element.checked);
            else if ((eltType == "textbox" || eltType == "input") && element.preftype == "int")
                com.ktsystems.subswitch.Const.subswitch_prefs.setIntPref(element.getAttribute("prefstring"), parseInt(element.getAttribute("value")));
            else if (eltType == "textbox" || eltType == "input") {
                com.ktsystems.subswitch.Const.subswitch_str.data = element.value;
                com.ktsystems.subswitch.Const.subswitch_prefs.setStringPref(element.getAttribute("prefstring"), com.ktsystems.subswitch.Const.subswitch_str);
            } else if (eltType == "menulist") {
                com.ktsystems.subswitch.Const.subswitch_str.data = element.selectedItem.label;
                com.ktsystems.subswitch.Const.subswitch_prefs.setStringPref(element.getAttribute("prefstring"), com.ktsystems.subswitch.Const.subswitch_str);
            } else if (eltType == "richlistbox") {
                com.ktsystems.subswitch.Const.subswitch_str.data = com.ktsystems.subswitch.Utils.getStringFromListbox(element);
                com.ktsystems.subswitch.Const.subswitch_prefs.setStringPref(element.getAttribute("prefstring"), com.ktsystems.subswitch.Const.subswitch_str);
            }
        }

        com.ktsystems.subswitch.PrefixesListSingleton.getInstance().savePrefixesArray(this.rdTreeView.defaultsignature);
        com.ktsystems.subswitch.PrefixesListSingleton.getInstance().savePrefixesSequences();
    },

    onSelectItem : function() {
        var selIdx = this.rdTreeView.selection.currentIndex;
        var rowCount = this.rdTreeView.rowCount;

        document.getElementById("up").disabled = selIdx <= 0;
        document.getElementById("down").disabled = selIdx < 0 || selIdx >= rowCount - 1;
        document.getElementById("delete").disabled = selIdx < 0;
        document.getElementById("edit").disabled = selIdx < 0;
        document.getElementById("duplicate").disabled = selIdx < 0;

        return true;
    },

    newItem : function() {
        var item = new com.ktsystems.subswitch.PrefixItem("", "");

        window.openDialog("chrome://subjects_prefix_switch/content/setrd.xhtml",
            "_blank", "chrome,centerscreen,modal,resizable=yes,dependent=yes", item);

        if (item.isValid()) {
            this.rdTreeView.insertItem(item);
            this.rdTreeView.invalidate();
        }
    },

    editItem : function() {
        var selIdx = this.rdTreeView.selection.currentIndex;
        if (selIdx < 0)
            return;

        window.openDialog("chrome://subjects_prefix_switch/content/setrd.xhtml",
            "_blank", "chrome,centerscreen,modal,resizable=yes,dependent=yes", this.rdTreeView.items[selIdx]);

        this.rdTreeView.invalidate();
    },

    duplicateItem : function() {
        var selIdx = this.rdTreeView.selection.currentIndex;
        if (selIdx < 0)
            return;

        var oldItem = this.rdTreeView.items[selIdx]
        var item = new com.ktsystems.subswitch.PrefixItem(oldItem.label
                + ' ('
                + com.ktsystems.subswitch.Utils.getLocalizedMessage("options.prefixCopy")
                +')', oldItem.prefix);

        item.aliasesList = oldItem.aliasesList;
        item.addressesList = oldItem.addressesList;

        window.openDialog("chrome://subjects_prefix_switch/content/setrd.xhtml",
            "_blank", "chrome,centerscreen,modal,resizable=yes,dependent=yes", item);

        if (item.isValid()) {
            this.rdTreeView.insertItem(item);
            this.rdTreeView.invalidate();
        }

    },

    deleteItem : function() {
        this.rdTreeView.deleteSelectedItem();
        this.rdTree.focus();
    },

    moveItem : function(moveUp) {
        var fromIdx = this.rdTreeView.selection.currentIndex;
        var toIdx;

        this.rdTree.focus();

        if (moveUp) {
            if (fromIdx <= 0)
                return;

            toIdx = fromIdx - 1;
        } else {
            if (fromIdx >= this.rdTreeView.rowCount - 1)
                return;

            toIdx = fromIdx + 1;
        }

        this.rdTreeView.swap(fromIdx, toIdx);
        this.rdTreeView.invalidate();
        this.rdTreeView.selection.select(toIdx);
        this.rdTreeView.treebox.ensureRowIsVisible(toIdx);
    },

    onExportPressed : function() {
        return this.pickFile(
        com.ktsystems.subswitch.Utils.getLocalizedMessage("options.pickExportTitle"),
                    Components.interfaces.nsIFilePicker.modeSave,
                    "subswitch.csv",
                    function(file) {
                        try {
                            com.ktsystems.subswitch.Utils.dumpStr(file.leafName);
                            let name = file.leafName;
                            if ((new RegExp('(csv|CSV)$').test(name)) != true) {
                                var newName = name + ".csv";
                                file.leafName = newName;
                            }
                            var foStream = Components.classes["@mozilla.org/network/file-output-stream;1"].
                                 createInstance(Components.interfaces.nsIFileOutputStream);

                            // use 0x02 | 0x10 to open file for appending.
                            // https://developer.mozilla.org/en-US/docs/Archive/Add-ons/Code_snippets/File_I_O
                            foStream.init(file, 0x02 | 0x08 | 0x20, 0666, 0);
                            // write, create, truncate
                            // In a c file operation, we have no need to set file mode with or operation,
                            // directly using "r" or "w" usually.

                            // if you are sure there will never ever be any non-ascii text in data you can
                            // also call foStream.writeData directly
                            var converter = Components.classes["@mozilla.org/intl/converter-output-stream;1"].
                                                      createInstance(Components.interfaces.nsIConverterOutputStream);
                            converter.init(foStream, "UTF-8", 0, 0);

                            converter.writeString("Description;Prefix;isDefault\n");
                            for (var i = 0; i < com.ktsystems.subswitch.OptionsPanel.rdTreeView.rowCount ; i++) {
                                let defaultPref = (com.ktsystems.subswitch.OptionsPanel.rdTreeView.defaultsignature == i) ? "yes" : "no";

                                converter.writeString(
                                    com.ktsystems.subswitch.OptionsPanel.rdTreeView.getCellText(i, "description")
                                    + ";" + com.ktsystems.subswitch.OptionsPanel.rdTreeView.getCellText(i, "rd")
                                    + ";"+defaultPref+"\n");
                            }
                            converter.close(); // this closes foStream
                            foStream.close();

                            com.ktsystems.subswitch.OptionsPanel.showMessage(
                                com.ktsystems.subswitch.Utils.getLocalizedMessage("options.pickExportTitle"),
                                com.ktsystems.subswitch.Utils.getLocalizedMessage("options.pickExportSuccess"));
                        } catch (e) {
                            com.ktsystems.subswitch.OptionsPanel.showMessage(
                                com.ktsystems.subswitch.Utils.getLocalizedMessage("options.pickExportTitle"),
                                com.ktsystems.subswitch.Utils.getLocalizedMessage("options.pickExportError")+e);
                        }

                    }
       );
    },

    onImportPressed : function () {
        return this.pickFile(com.ktsystems.subswitch.Utils.getLocalizedMessage("options.pickImportTitle"),
                     Components.interfaces.nsIFilePicker.modeOpen,
                     "subswitch.csv",
                    function(file) {
                        try {
                            var fiStream = Components.classes["@mozilla.org/network/file-input-stream;1"].
                                createInstance(Components.interfaces.nsIFileInputStream);

                            fiStream.init(file, -1, -1, 0);

                            var converter = Components.classes["@mozilla.org/intl/converter-input-stream;1"]
                                .createInstance(Components.interfaces.nsIConverterInputStream);

                            converter.init(fiStream, "UTF-8", 1024, 0xFFFD);
                            converter.QueryInterface(Components.interfaces.nsIUnicharLineInputStream);

                            if (converter instanceof Components.interfaces.nsIUnicharLineInputStream) {
                                var line = {};
                                var cont;
                                var rdTreeView = com.ktsystems.subswitch.OptionsPanel.rdTreeView;
                                do {
                                    cont = converter.readLine(line);
                                    if (line.value != "Description;Prefix;isDefault") {
                                        var splitted = line.value.split(";");
                                        if (splitted.length != 3)
                                            throw new Error(
                                                com.ktsystems.subswitch.Utils.getLocalizedMessage("options.pickImportInvalidFormat"));
                                        var item = new com.ktsystems.subswitch.PrefixItem(splitted[0], splitted[1]);
                                        if (item.isValid() && rdTreeView.items.indexOf(item)<0) {
                                            rdTreeView.insertItem(item);
                                            if (splitted[2] == "yes") {
                                                rdTreeView.defaultsignature = rdTreeView.rowCount - 1;
                                            }
                                        }
                                    }
                                } while (cont);
                                rdTreeView.invalidate();

                                converter.close();
                                fiStream.close();

                                com.ktsystems.subswitch.OptionsPanel.showMessage(
                                    com.ktsystems.subswitch.Utils.getLocalizedMessage("options.pickImportTitle"),
                                    com.ktsystems.subswitch.Utils.getLocalizedMessage("options.pickImportSuccess"));

                            } else {
                                throw new Error(
                                    com.ktsystems.subswitch.Utils.getLocalizedMessage("options.pickImportInvalidOperation"));
                            }
                        } catch (e) {
                            com.ktsystems.subswitch.OptionsPanel.showMessage(
                                com.ktsystems.subswitch.Utils.getLocalizedMessage("options.pickImportTitle"),
                                com.ktsystems.subswitch.Utils.getLocalizedMessage("options.pickImportError")+e);
                        }
                    }
       );
    },

    pickFile : function(localizedTitle, fileMode, fileName, func) {
        var fp = Components.classes["@mozilla.org/filepicker;1"].createInstance(Components.interfaces.nsIFilePicker);
        fp.init(window, localizedTitle, fileMode);

        var dirService = Components.classes["@mozilla.org/file/directory_service;1"].
                      getService(Components.interfaces.nsIProperties);

        var homeDirFile = dirService.get("Home", Components.interfaces.nsIFile); // returns an nsIFile object

        fp.defaultString = fileName;
    //    fp.displayDirectory = homeDirFile;

        fp.appendFilter("CSV", "*.csv");

		fp.open(function (rv) {
		  if (rv == Components.interfaces.nsIFilePicker.returnOK || rv == Components.interfaces.nsIFilePicker.returnReplace) {
			var file = fp.file;

			func(fp.file);
		  }
		});

        return true;
    },

    addAutoSwitch : function(type) {
        var input = document.getElementById("address");
        var listbox = document.getElementById("discoveryIgnoreList");

        var msgInvalid = com.ktsystems.subswitch.Utils.getLocalizedMessage("options.invalidAddress");
        var msgDuplicate = com.ktsystems.subswitch.Utils.getLocalizedMessage("options.duplicateAddress");

        if (!this.validateAutoswitch(input.value, type)) {
            alert(msgInvalid);
            return;
        }

        for (var i = 0; i < listbox.getRowCount(); i++) {
            if (listbox.getItemAtIndex(i).value == input.value) {
                alert(msgDuplicate);
                return;
            }
        }

		let newNode = document.createXULElement("richlistitem");

		// Store the value in the list item as before.
		newNode.value = input.value;
		let newLabel = document.createXULElement("label");
		// The label is now stored in the value attribute of the label element.
		newLabel.value = input.value;

		newNode.appendChild(newLabel);

		listbox.appendChild(newNode);
        listbox.ensureIndexIsVisible(listbox.itemCount - 1);

		input.value = "";
    },

    removeAutoswitch : function(type) {
        var listbox = document.getElementById("discoveryIgnoreList");
        var selected = listbox.selectedIndex;

        if (selected >= 0)
            listbox.getItemAtIndex(selected).remove();
    },

    validateAutoswitch : function(input, type) {
        if (input.indexOf("?") > -1) {
            if (input.charAt(0) == "?")
                input = "X" + input;

            if (input.charAt(input.length - 2) == "." &&
                 input.charAt(input.length - 1) == "?" )
                input += "X";

            input = input.split("?").join("X");
            com.ktsystems.subswitch.Utils.dumpStr(input);
        }

        var validate = new RegExp(com.ktsystems.subswitch.Const.rx);
    com.ktsystems.subswitch.Utils.dumpStr(com.ktsystems.subswitch.Const.rx);

        return validate.test(input);
    }
}
