ChromeUtils.defineModuleGetter(
  this,
  "MailServices",
  "resource:///modules/MailServices.jsm"
);

var folderAccount = {


    // Global var
    prefs: Components.classes["@mozilla.org/preferences-service;1"].getService(Components.interfaces.nsIPrefBranch),
  
  folderListener: {
    folderRenamed(oldFolder, newFolder) {
      folderAccount.folderRenamed(oldFolder.URI, newFolder.URI);
    }
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

    },  
  


    // The following is run when Thunderbird is first loaded  
    load: function() {

    // Initialization code
    this.initialized = true;
    // this.strings = document.getElementById("folderAccount-strings");

    // Add a listner to watch for a renamed folder
    // When a folder is renamed, we need to update our stored prefs to reflect the change

      // nsIMsgFolderListener
      MailServices.mfn.addListener(folderAccount.folderListener, MailServices.mfn.folderRenamed);
    },
   


    // The following is run when Thunderbird is unloaded
    unload: function() {

      // Remove our folder listner.  Is this stricly necessary??

      MailServices.mfn.removeListener(folderAccount.folderListener);
    }
};


// Run these when Thunderbird is loaded or unloaded

function onLoad(activatedWhileWindowOpen) {
  folderAccount.load();
}

function onUnload(deactivatedWhileWindowOpen) {
  folderAccount.unload();
}
