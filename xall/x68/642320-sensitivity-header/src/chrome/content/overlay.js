if (typeof sensitivity_header_management == "undefined") { 
    
var sensitivity_header_management = {

    sensitivityMenu : null, // initial menu item - always present   
    toolbaritem: null,
    debugmode: false, // prints console messages for testing purposes
    
    updateSensitivityToolbarButton: function(retrievedHeader) {
        if (sensitivity_header_management.debugmode) dump("updateSensitivityToolbarButton: ( " + retrievedHeader + " ) \n");
        
        sensitivity_header_management.sensitivityMenu.querySelector('[checked="true"]').removeAttribute('checked');
        sensitivity_header_management.sensitivityMenu.querySelector('[value="' + retrievedHeader + '"]').setAttribute('checked', 'true');
        
        sensitivity_header_management.toolbaritem = document.getElementById('sensitivityTB-menulist');
        if (sensitivity_header_management.toolbaritem) {
            sensitivity_header_management.toolbaritem.value = retrievedHeader;
        }
    },

    // Updates the Sensitivity Submenu to show a check mark against the selected item.
    // Called from XUL when user opens the Sensitivity submenu.
    // No longer used as the code is now in the above function.
    updateSensitivityMenu: function() {
        if (sensitivity_header_management.debugmode) dump("updateSensitivityMenu \n");
        if (gMsgCompose) {
            
            //    sensitivity_header_management.sensitivityMenu = document.getElementById('sensitivityMenu');
            //    sensitivity_header_management.sensitivityMenu.querySelector('[checked="true"]').removeAttribute('checked');
            //    sensitivity_header_management.sensitivityMenu.querySelector('[value="' + sensitivity_header_management.toolbaritem.value + '"]').setAttribute('checked', 'true');
            //}
        }
    },

    // Toolbar menulist onCommand + Options Menu onCommand.  (taget is menuitem 'value')
    // Called from XUL (from menu and toolbar items).
    SensitivityMenuSelect: function(target) {
        if (sensitivity_header_management.debugmode) dump("SensitivityMenuSelect( " +  target.value + " )\n");
        if (gMsgCompose) {
            var headername = "Sensitivity";
            var headervalue = "Normal";
            var msgCompFields = gMsgCompose.compFields;
            if (msgCompFields) {
                headervalue = target.getAttribute('value');
                sensitivity_header_management.SetSensiHeader(headername,headervalue);
                sensitivity_header_management.toolbaritem = document.getElementById('sensitivityTB-menulist');
                if (sensitivity_header_management.toolbaritem) {
                    sensitivity_header_management.updateSensitivityToolbarButton(target.getAttribute('value'));
                }
            }
        }
    },

    // Simple function to set header 'hdr' to value 'val'.
    // Prior TB/SM versions used otherRandomHeaders - not supporting these.
    SetSensiHeader: function(hdr, val) {
        if (sensitivity_header_management.debugmode) dump("SetSensiHeader( " + hdr + " , " + val + " )\n");
        if ("otherRandomHeaders" in gMsgCompose.compFields) {
            // alert("You appear to be using an older version of Thunderbird/Seamonkey which is not supported by the Sensitivity Header add-on.");
            // https://bugzilla.mozilla.org/show_bug.cgi?id=998191  (TB >= 37; SM >= 2.33)
        } else {
            if (val == 'Normal') val = "";
            gMsgCompose.compFields.setHeader(hdr, val);
            // If setting header to 'Normal' via menu/toolbar, should remove header from message, but I cannot locate an API function to do that yet.. :-(
            // Alternative approach would be to store a value somewhere until message 'send/save/send-later' (add setHeader to those window/message events)
        }
    },

    onLoadComposeWindow: function() {
        if (sensitivity_header_management.debugmode) dump("onLoadComposeWindow\n");
        sensitivity_header_management.sensitivityMenu = document.getElementById('sensitivityMenu' ); // initial menu item - always present
        var searchForText = "Sensitivity";
        var retrievedHeader = "";
        
        if  (gMsgCompose.compFields.hasHeader(searchForText)) {
            retrievedHeader = gMsgCompose.compFields.getUnstructuredHeader(searchForText);
            // Above function doesn't appear to work as inteneded? - unable to find an API/function for finding a header in an existing (draft/unsent) message yet.      
            // retrievedHeader = gMsgCompose.compFields.getAsciiHeader('sensitivity'); // maybe there are other functions that might work?
            
            if (retrievedHeader == "Company-Confidential") retrievedHeader = "Confidential";
            if (retrievedHeader == "") retrievedHeader = "Normal";
        } else {
            retrievedHeader = "Normal";
        }
        sensitivity_header_management.updateSensitivityToolbarButton(retrievedHeader);
    }
};

    sensitivity_header_management.myStateListener = {
        NotifyComposeFieldsReady : function() {
            sensitivity_header_management.onLoadComposeWindow();
        }
    //  ,NotifyComposeBodyReady : function() {}
    //  ,ComposeProcessDone : function(aResult) {}
    //  ,SaveInFolderDone : function(folderURI) {}
    };
    
    window.addEventListener("compose-window-init", function() {
        gMsgCompose.RegisterStateListener(sensitivity_header_management.myStateListener);
    }, true);
}