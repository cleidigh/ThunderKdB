

var folderAccount = {


    // Global var
    prefs: Components.classes["@mozilla.org/preferences-service;1"].getService(Components.interfaces.nsIPrefBranch),
  
    folderListener: {
        OnItemAdded: function(parentItem, item) { },


        OnItemRemoved: function(parentItem, item) {

            // Delete preference

            if (item instanceof Components.interfaces.nsIMsgFolder) {

                // Save this URI in case this turns out to be a rename...
                folderAccount.folderListener.oldURI = item.URI; 
            }

            //folderAccount.logMsg('OnItemRemoved (delete), item>' + item + '< parentItem>' + parentItem + '<');
        },

        
        
        OnItemUnicharPropertyChanged: function(item, property, oldValue, newValue){
          if (item instanceof Components.interfaces.nsIMsgFolder && property == "Name") {
          
              // This looks like a rename, so save the URI 
              folderAccount.folderListener.newURI = item.URI;
          }

          //folderAccount.logMsg('OnItemUnicharPropertyChanged, item>' + item + '< property>' + property + '< oldValue>' + oldValue + '< newValue>' + newValue + '<');
        },

        

        OnItemEvent: function (folder, event) {
            
            var eventType = event.toString();
            
            if (eventType == "RenameCompleted") {
            
                // It was indeed a rename, so let's update our settings
                folderAccount.folderRenamed(folderAccount.folderListener.oldURI, folderAccount.folderListener.newURI);
                
                // And log it
                //folderAccount.logMsg("Folder >" + folderAccount.folderListener.oldURI + "< renamed to >" +folderAccount.folderListener.newURI + "<");
            }
            
            
            folderAccount.folderListener.newURI = "";
            folderAccount.folderListener.oldURI = "";

            //folderAccount.logMsg('folderListener, event>' + eventType + '<');
        },
        
        // Other folder events that we can ignore for now
        OnItemPropertyChanged:      function(item, property, oldValue, newValue) { },    
        OnItemIntPropertyChanged:   function(item, property, oldValue, newValue) { },
        OnItemBoolPropertyChanged:  function(item, property, oldValue, newValue) { },
        OnItemPropertyFlagChanged:  function(item, property, oldFlag, newFlag) { }
    },
  
  
    // The following is run when a folder is renamed
    folderRenamed: function (oldURI, newURI) {
    
    
        // Scan through the preferences and find any folder references that need to be updated
        var branch = folderAccount.prefs.getBranch("extensions.folderaccount.");
        var children = branch.getChildList("",{});
        
        for(var i=0; i < children.length; i++ ) {     
            var child = children[i];
            var child2 = child + "/";
            
            var pos = child2.indexOf(oldURI + "/");
            
            if (pos >= 0 ) {

                // Store the setting value
                var val = folderAccount.prefs.getCharPref("extensions.folderaccount." + child);
                
                // Clear the old setting
                folderAccount.prefs.clearUserPref("extensions.folderaccount." + child);



                // Create and set the new setting
                var child2 = child2.substring(0,pos) + newURI + child2.substring(pos + oldURI.length,child.length);
                
                folderAccount.prefs.setCharPref("extensions.folderaccount." + child2, val);                
            }
        }

        
        // And again for the "To" prefs  (TODO: Should probably condense code with above...  only differences are the .to bits...)
        branch = folderAccount.prefs.getBranch("extensions.folderaccount.to.");
        children = branch.getChildList("",{});

        for(var i=0; i < children.length; i++ ) {     
            var child = children[i];
            var child2 = child + "/";

            var pos = child2.indexOf(oldURI + "/");

            if (pos >= 0 ) {

                // Store the setting value
                var val = folderAccount.prefs.getCharPref("extensions.folderaccount.to" + child);

                // Clear the old setting
                folderAccount.prefs.clearUserPref("extensions.folderaccount.to" + child);


                // Create and set the new setting
                var child2 = child2.substring(0,pos) + newURI + child2.substring(pos + oldURI.length,child.length);

                folderAccount.prefs.setCharPref("extensions.folderaccount.to" + child2, val);                

            }
        }

        // And again for the "Cc" prefs  (TODO: Should probably condense code with above...  only differences are the .to bits...)
        branch = folderAccount.prefs.getBranch("extensions.folderaccount.to.");
        children = branch.getChildList("",{});

        for(var i=0; i < children.length; i++ ) {     
            var child = children[i];
            var child2 = child + "/";

            var pos = child2.indexOf(oldURI + "/");

            if (pos >= 0 ) {

                // Store the setting value
                var val = folderAccount.prefs.getCharPref("extensions.folderaccount.cc" + child);

                // Clear the old setting
                folderAccount.prefs.clearUserPref("extensions.folderaccount.cc" + child);


                // Create and set the new setting
                var child2 = child2.substring(0,pos) + newURI + child2.substring(pos + oldURI.length,child.length);

                folderAccount.prefs.setCharPref("extensions.folderaccount.cc" + child2, val);                

            }
        }
    },  
  


    // The following is run when Thunderbird is first loaded  
    load: function() {

    // Initialization code
    this.initialized = true;
    // this.strings = document.getElementById("folderAccount-strings");

    // Add a listner to watch for a renamed folder
    // When a folder is renamed, we need to update our stored prefs to reflect the change

    Components.classes["@mozilla.org/messenger/services/session;1"].
        getService(Components.interfaces.nsIMsgMailSession).
        AddFolderListener(folderAccount.folderListener, Components.interfaces.nsIFolderListener.all);
    },
   


    // The following is run when Thunderbird is unloaded
    unload: function() {

      // Remove our folder listner.  Is this stricly necessary??

      Components.classes["@mozilla.org/messenger/services/session;1"].
          getService(Components.interfaces.nsIMsgMailSession).
          RemoveFolderListener(folderAccount.folderListener);
    },


    /////////////////////////////////////
    // Administrative functions
    /////////////////////////////////////

    logMsg: function(txt) {
        try {

            // If debug preference is not present, this function will throw an error, which will be harmlessly caught
            if (folderAccount.prefs.getBoolPref("extensions.folderaccount.debug")) {
                Components.classes["@mozilla.org/consoleservice;1"].getService(Components.interfaces.nsIConsoleService)
                .logStringMessage('folderAccount - ' + txt);
            }
        
        } catch(e) { }
      
    }
};


// Run these when Thunderbird is loaded or unloaded

/* => TB78
    window.addEventListener("load", function(e) { folderAccount.load(); }, false);
    window.addEventListener("unload", function(e) { folderAccount.unload(); }, false);
*/

function onLoad(activatedWhileWindowOpen) {
  folderAccount.load();
}

function onUnload(deactivatedWhileWindowOpen) {
  folderAccount.unload();
}
