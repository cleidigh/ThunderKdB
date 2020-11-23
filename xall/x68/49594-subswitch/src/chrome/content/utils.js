
if(!com.ktsystems.subswitch.Utils) com.ktsystems.subswitch.Utils={};

var subswitchOptionsHandler = {
    onLoadOptions: function () {
        window.close();
    },
    onUnloadOptions: function () {
        this.openSettings();
    },
    //FIXME: maybe someday. keep instead of reload settings
    openSettings: function() {
        var settingsDialog = window.open("chrome://subjects_prefix_switch/content/options.xhtml",
            "subjects_prefix_switch_options", "chrome,centerscreen,resizable");
        settingsDialog.focus();
    }
}


com.ktsystems.subswitch.Utils = {
    createItem : function(description, rd) {
        this.description = description;
        this.rd = rd;
    },

    getLocalizedMessage : function(msg) {
        return document.getElementById("subjects_prefix_switch.locale").getString(msg);
    },

    openMailURL : function(aURL) {
        var ioService = Components.classes["@mozilla.org/network/io-service;1"].getService(Components.interfaces.nsIIOService);
        var uri = ioService.newURI(aURL, null, null);

        var msgComposeService =  Components.classes["@mozilla.org/messengercompose;1"].getService(Components.interfaces.nsIMsgComposeService);

        msgComposeService.OpenComposeWindowWithURI (null, uri);
    },

    openURL : function(aURL) {
        var ioService = Components.classes["@mozilla.org/network/io-service;1"].getService(Components.interfaces.nsIIOService);
		    var uri = ioService.newURI(aURL, null, null);

        var protocolSvc = Components.classes["@mozilla.org/uriloader/external-protocol-service;1"].getService(Components.interfaces.nsIExternalProtocolService);
        protocolSvc.loadURI(uri);
    },

    openOptions : function(ev, autosave) {
        subswitchOptionsHandler.openSettings();
    },

    dumpStr : function(str) {
        if (com.ktsystems.subswitch.Const.PUBLIC_DIST == 'true')
            return;

        var csClass = Components.classes['@mozilla.org/consoleservice;1'];
        var cs = csClass.getService(Components.interfaces.nsIConsoleService);

        cs.logStringMessage((new Date()).getTime() + ": " + str);
    },

    fillListboxFromArray : function (listbox, array) {
        for (var i = 0; i < array.length; i++) {
            if (array[i] != "-") {
                let newNode = document.createXULElement("richlistitem");

      				// Store the value in the list item as before.
      				newNode.value = array[i];
      				let newLabel = document.createXULElement("label");
      				// The label is now stored in the value attribute of the label element.
      				newLabel.value = array[i];

      				newNode.appendChild(newLabel);
      				listbox.appendChild(newNode);
      			}
        }
    },

    getStringFromListbox : function(listbox){
        var array = "-";

        if (listbox.childNodes.length > 0) {
            array = this.getArrayFromListbox(listbox).join(";");
        }

        return array;
    },

    getArrayFromListbox : function(listbox){
        var array = new Array();

        if (listbox.childNodes.length > 0) {
            for (var i = 0; i < listbox.childNodes.length; i++){
                array.push(listbox.getItemAtIndex(i).value);
            }
        }
        return array;
    },

    upgradeSettings : function(dataString) {
        var r1 = new RegExp(/\*/g);
        var r2 = new RegExp(/\|/g);

        return dataString.replace(r1, com.ktsystems.subswitch.Utils.getRDEntrySplitSign())
                         .replace(r2, com.ktsystems.subswitch.Utils.getRDPrefEntriesSplitSign());
    },

    getRDEntrySplitSign : function() {
       var result;
       try {
            result = com.ktsystems.subswitch.Const.subswitch_prefs.getCharPref("entry_split_sign");
       } catch(e) {
            result = com.ktsystems.subswitch.Const.ENTRY_SPLIT_SIGN;
            com.ktsystems.subswitch.Const.subswitch_prefs.setCharPref("entry_split_sign", result);
       }
       return result;
    },

    getRDPrefEntriesSplitSign : function() {
       var result;
       try {
            result = com.ktsystems.subswitch.Const.subswitch_prefs.getCharPref("entries_split_sign");
       } catch(e) {
            result = com.ktsystems.subswitch.Const.ENTRIES_SPLIT_SIGN;
            com.ktsystems.subswitch.Const.subswitch_prefs.setCharPref("entries_split_sign", result);
       }
       return result;
    },

    removeMenuItems : function (menu) {
        var children = menu.childNodes;

        for (var i = children.length - 1; i >= 0; i--) {
            menu.removeChild(children[i]);
        }
    },

    createMenuItem : function(id, label, tooltip, oncommand) {
        var item = document.createXULElement("menuitem");

        item.setAttribute("id", id);
        item.setAttribute("label", label);
        item.setAttribute("tooltiptext", tooltip);
        item.setAttribute("oncommand", oncommand);
        item.setAttribute("disabled", false);

        return item;
    },

    padNumber : function (n, len) {
	    var s = n.toString();
	    if (s.length < len) {
	        s = (com.ktsystems.subswitch.Const.SEQ_PAD_MASK + s).slice(-len);
	    }

	    return s;
	},

    isTemplateWithSequence : function (prefix) {
        var numberRE = new RegExp(/{number:(N+)}/gi);

        return (prefix.match(numberRE)!=null);
    }
}
