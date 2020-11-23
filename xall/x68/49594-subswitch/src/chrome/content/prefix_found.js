if(!com.ktsystems.subswitch.PrefixFound) com.ktsystems.subswitch.PrefixFound={};

com.ktsystems.subswitch.PrefixFound = {

    prefixesMap : new WeakMap(),

    prefixFoundOnLoad : function() {
        document.addEventListener("dialogaccept", function () {
            com.ktsystems.subswitch.PrefixFound.prefixFoundOnDialogAccept();
        });

    },

    updateAliasButton : function() {
        var checkbox = document.getElementById("aliasCheckbox");
        var button = document.getElementById("aliasButton");

        button.disabled = !checkbox.checked;

        document.getElementById("rd").disabled = checkbox.checked;
        document.getElementById("description").disabled = checkbox.checked;
    },

    initAliasMenuPopup : function() {
        var menuPopup = document.getElementById("aliasMenuPopup");

        com.ktsystems.subswitch.Utils.removeMenuItems(menuPopup);
        prefixesMap = new WeakMap();

        var rdData = com.ktsystems.subswitch.PrefixesListSingleton.getInstance().getPrefixesList();

        for (var i = 0; i < rdData.length; i++) {
            var item = com.ktsystems.subswitch.Utils.createMenuItem("aliasMenuPopup_" + rdData[i].rd, rdData[i].description, null, "");
            prefixesMap.set(item, rdData[i]);

            menuPopup.appendChild(item);
        }
    },

    prefixFoundOnDialogAccept : function() {
        var isValid = false;

        try {
            var checkbox = document.getElementById("aliasCheckbox");
            var pl = com.ktsystems.subswitch.PrefixesListSingleton.getInstance();
            var item;
            var arg = window.arguments[0];

            if (checkbox.checked) {
                var aliasButton = document.getElementById("aliasButton");
                if (!aliasButton.selectedItem) {
                    alert(getLocalizedMessage("setRD.invalidAlias"));
                    aliasButton.focus();

                    isValid = false;
                } else {
                    var alias = document.getElementById("rd").value;
                    item = prefixesMap.get(document.getElementById("aliasButton").selectedItem);
                    item.aliases.push(alias);

                    arg.SetString(20, alias);
                    isValid = true;
                }
            } else {
                isValid = com.ktsystems.subswitch.SetPrefix.checkDescription() && com.ktsystems.subswitch.SetPrefix.checkRD();
                if (isValid) {
                    item = new com.ktsystems.subswitch.PrefixItem(
                                            document.getElementById("description").value,
                                            document.getElementById("rd").value);

                    arg.SetString(20, item.rd);
                    pl.getPrefixesList().push(item);
                }
            }
            if (item) {
                pl.savePrefixesArray();
                pl.savePrefixesSequences();

                arg.SetInt(0, 0);
                arg.SetString(21, item.description);
            }
        } catch (err) {
            alert(err);
        }
        return isValid;
    }
}