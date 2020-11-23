if(!com.ktsystems.subswitch.SetPrefix) com.ktsystems.subswitch.SetPrefix={};

com.ktsystems.subswitch.SetPrefix = {
    getItem : function (){
        var arg = window.arguments[0];
        var item;
        if (arg instanceof Components.interfaces.nsIDialogParamBlock) {
            item = new com.ktsystems.subswitch.Utils.createItem(arg.GetString(21), arg.GetString(20));
        } else {
            item = arg;
        }
       
        return item;
    },

    oldCommonDialogOnLoad : function() {
        var arg = window.arguments[0];
        if (arg instanceof Components.interfaces.nsIDialogParamBlock) {
            document.title = arg.GetString(12);

            // display the main text
            // XXX the substr(0, 10000) part is a workaround for bug 317334
            var croppedMessage = arg.GetString(0).substr(0, 10000);

            var element = document.getElementById("info.body");
            element.appendChild(document.createTextNode(croppedMessage));

            element = document.getElementById("info.header");
            element.appendChild(document.createTextNode(arg.GetString(3)));
            
            // set the icon
            var iconElement = document.getElementById("info.icon");
            var iconClass = arg.GetString(2);
            if (!iconClass)
                iconClass = "message-icon";
            iconElement.setAttribute("class", iconElement.getAttribute("class") + " " + iconClass);

            // set default result to cancelled
            arg.SetInt(0, 1);
        }
    },

    setRDOnLoad : function() {
        
		document.addEventListener("dialogaccept", function() {
			com.ktsystems.subswitch.SetPrefix.setRDOnDialogAccept();
		}); 
		
		var item = this.getItem();

        if (item) {
            document.getElementById("rd").value = item.rd;
            document.getElementById("description").value = item.description;
            if (item.aliases) {
                com.ktsystems.subswitch.Utils.fillListboxFromArray(document.getElementById("aliasesList"), item.aliases);
            }
            if (item.addresses) {
                com.ktsystems.subswitch.Utils.fillListboxFromArray(document.getElementById("addressList"), item.addresses);
            }
            if (item.currentSeqValue) {
                document.getElementById("rdSequenceValue").value = item.currentSeqValue;
                document.getElementById("rdSequenceValue").disabled = !(com.ktsystems.subswitch.Utils.isTemplateWithSequence(item.rd));
            }
        }
		
    },

    setRDOnDialogAccept : function () {
        this.setRDCommonAccept();
    },

    onChangeRD : function (value) {
        document.getElementById("rdSequenceValue").disabled = !(com.ktsystems.subswitch.Utils.isTemplateWithSequence(value));
    },

    setRDCommonAccept : function() {
        var isValid = false;

        try {
            isValid = this.checkDescription() && this.checkRD();

            if (isValid) {
                var arg = window.arguments[0];
                if (arg instanceof Components.interfaces.nsIDialogParamBlock) {
                    arg.SetInt(0, 0);
                    arg.SetString(21, document.getElementById("description").value);
                    arg.SetString(20, document.getElementById("rd").value);
                 } else {
                    var item = arg;
                    if (item) {
                        item.description = document.getElementById("description").value;
                        item.rd = document.getElementById("rd").value;
                        item.aliases = com.ktsystems.subswitch.Utils.getArrayFromListbox(document.getElementById("aliasesList"));
                        item.addresses = com.ktsystems.subswitch.Utils.getArrayFromListbox(document.getElementById("addressList"));
                        item.currentSeqValue = document.getElementById("rdSequenceValue").value;
                    }
                }
            }
        } catch (err) {
            alert(err);
        }
        return isValid;
    },

    checkDescription : function(){
        var description = document.getElementById("description");
        var isValid = this.checkElem(description);

        if (!isValid) {
            alert(
                com.ktsystems.subswitch.Utils.getLocalizedMessage("setRD.invalidDescription"));
            description.focus();
        }

        return isValid;
    },

    checkRD : function () {
        var rd = document.getElementById("rd");
        var isValid = this.checkElem(rd);

        if (!isValid) {
            alert(
                com.ktsystems.subswitch.Utils.getLocalizedMessage("setRD.invalidPath"));
            rd.focus();
        }

        return isValid;
    },

    checkElem : function(elem) {
        var isValid;

        if (elem == null || elem.value == ""
            || elem.value.indexOf(com.ktsystems.subswitch.Utils.getRDEntrySplitSign()) > -1
            || elem.value.indexOf(com.ktsystems.subswitch.Utils.getRDPrefEntriesSplitSign()) > -1) {
            isValid = false;
        } else {
            isValid = true;
        }

        return isValid;
    },

    addAlias : function(type) {
        var input = document.getElementById("alias");
        
        if (!this.checkElem(input)) {
            alert(
                com.ktsystems.subswitch.Utils.getLocalizedMessage("setRD.invalidAlias"));
            return;
        }
        var newValue = input.value;
        
        this.addItemToListBox(input, "aliasesList", newValue, "setRD.duplicateAlias"); 
    },

    addAddress : function() {
        var type = document.getElementById("addressType");
        var input = document.getElementById("address");
        
        var validate = new RegExp(com.ktsystems.subswitch.Const.rx_user + "\@" + com.ktsystems.subswitch.Const.rx_domain);
    
        if (!this.checkElem(input) || !input.value.match(validate)) {
            alert(
                com.ktsystems.subswitch.Utils.getLocalizedMessage("options.invalidAddress"));
            return;
        }
        var newValue = type.selectedItem.value + ' ' + input.value;
        
		this.addItemToListBox(input, "addressList", newValue, "options.duplicateAddress");
    },

    addItemToListBox : function(input, where, newValue, duplicateMessageKey) {
		var listbox = document.getElementById(where);
		
		for (var i = 0; i < listbox.itemCount; i++) {
            if (listbox.getItemAtIndex(i).value.toLowerCase() == newValue.toLowerCase()) {
                alert(
                    com.ktsystems.subswitch.Utils.getLocalizedMessage(duplicateMessageKey));
                return;
            }
        }
        
		let newNode = document.createXULElement("richlistitem");

		// Store the value in the list item as before.
		newNode.value = newValue; 
		let newLabel = document.createXULElement("label");
		// The label is now stored in the value attribute of the label element.
		newLabel.value = newValue;

		newNode.appendChild(newLabel);
		listbox.appendChild(newNode);
		
        listbox.ensureIndexIsVisible(listbox.itemCount - 1);
        input.value = "";
	},
	
	removeAlias : function(type) {
        this.removeItemFromListBox(type, "aliasesList");
    },

    removeAddress : function(type) {
        this.removeItemFromListBox(type, "addressList");
    },
	
	removeItemFromListBox : function(type, where) {
		var listbox = document.getElementById(where);
        var selected = listbox.selectedIndex;

        if (selected >= 0)
            listbox.getItemAtIndex(selected).remove();
	}
}