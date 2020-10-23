var { MailServices } = ChromeUtils.import(
  "resource:///modules/MailServices.jsm"
);

// Generate a list of all window IDs
// Code from http://forums.mozillazine.org/viewtopic.php?p=2278338&

var folderAccountCompose = {

    // Global variables
    prefs: Services.prefs,
    
    
    
    // copyAllWindowIDs: function () {
    //     var ids = [];
    //     var rdfService = Components.classes["@mozilla.org/rdf/rdf-service;1"]
    //             .getService(Components.interfaces.nsIRDFService);
    //     var ds = rdfService.GetDataSourceBlocking("rdf:window-mediator");
    //     var root = rdfService.GetResource("NC:WindowMediatorRoot");
    //     var container = Components.classes["@mozilla.org/rdf/container;1"]
    //             .getService(Components.interfaces.nsIRDFContainer);
    //     container.Init(ds, root);
    
    //     var elements = container.GetElements();
    //     while (elements.hasMoreElements()) {
    //         var element = elements.getNext()
    //             .QueryInterface(Components.interfaces.nsIRDFResource);
    //         ids.push(element.Value);
    //     }
        
    //     return ids;
    // },
    
    
    getPrefs: function (folderURI,blob) {
    
        // Retrieve the account from the preferences hive
        // Look at the samples below to see how blob is used...
        
        var acct = "";
    
    
        // If a folder has no prefs set, look at parent, then grandparent, et al until something is found or we run out of ancestors
        // folderURI = mailbox://somename@someaddr.com/folder/subfolder/subsubfolder/...
        
        // user_pref("extensions.folderaccount.mailbox://myemail@xxx.com/test%205ddr/Subfolder%20Level%201", "id1");
        // user_pref("extensions.folderaccount.mailbox://myemail@xxx.com/test%205ddr/Subfolder%20Level%201/gggg", "id2");

        // To retrieve this, we'd set blob to "to."
        // user_pref("extensions.folderaccount.to.mailbox://myemail@xxx.com/test%205ddr/Subfolder%20Level%201", "joe@smith.com");


        var ct = folderURI.split('/').length;
    
        while (ct > 3) {                
            try {
                acct = folderAccountCompose.prefs.getCharPref("extensions.folderaccount." + blob + folderURI);
                break;          // We got our value, let's leave this loop

            } catch (e) { }         // Nothing to do, just leave acct at default value

            folderURI = folderURI.substring(0,folderURI.lastIndexOf('/'));  // Point folderURI at the parent folder

            ct = folderURI.split('/').length;
        }       
        
        return(acct);
    },


    
    /////////////////////////////////////
    // Administrative functions
    /////////////////////////////////////
    
    logMsg: function(txt) {
        try {
        
         var prefs = Components.classes["@mozilla.org/preferences-service;1"].
                getService(Components.interfaces.nsIPrefBranch);
        
            if (folderAccountCompose.prefs.getBoolPref("extensions.folderaccount.debug")) {
                Components.classes["@mozilla.org/consoleservice;1"].getService(Components.interfaces.nsIConsoleService)
                .logStringMessage('folderAccountCompose - ' + txt);
            }
        } catch(e) { }
        
    }
};



    
var ptrComposeStartup = window.ComposeStartup;  // Pointer to original ComposeLoad function



// Modified version of ComposeStartup
ComposeStartup = function dummy(aParams) {

    // This code borrowed from elsewhere in TB
    var params;

    if (aParams) 
        params = aParams;
    else if (window.arguments && window.arguments[0]) {   // aParams is Null

        try {
            if (window.arguments[0] instanceof Components.interfaces.nsIMsgComposeParams)
                params = window.arguments[0];
            else 
                params = handleMailtoArgs(window.arguments[0]);
        }

        catch(ex) { dump("ERROR with parameters: " + ex + "\n"); }
    } 


    // If we still have no params, this might be a good time to fall back to default behavior!
    if (!params) { 
        ptrComposeStartup(false, null);
        return;
    }
    
   

    var folderURI = ""; 
    var mediator= Services.wm;

    // Now cycle through all windows until we find one that understands GetSelectedFolderURI()
    // Known bug: if there is more than one "main" window open, we can't tell which one opened the compose window.

    var enumerator = mediator.getEnumerator(null);
    while (enumerator.hasMoreElements()) {
        var domWindow = enumerator.getNext();
        try {
            if(domWindow.gFolderDisplay && domWindow.gFolderDisplay.displayedFolder) {
               folderURI = domWindow.gFolderDisplay.displayedFolder.URI;
               break;
            } 
        } catch (e) { }  // If there's an error here, it's not what we want, so we need do nothing

    }
    
    // folderAccountCompose.logMsg('Using settings for folderURI = >' + folderURI + '<');
    
    
    // // folderAccountCompose.logMsg(Dumper(params));   // Call Dumper
    
    
    
    // TO:
    // Do NOT overwrite To: address if the message is new and already has one: The user probably selected an addr from the address book and wants to use that one.


    if (params.type == 0 && !params.composeFields.to) {     // type: 0 = New message, 3 = Forward, 6 = Reply, 2 = Reply All
        // Only set the To: address on a new message.  For forwards, or Reply All, more likely than not the user will want to use a non-default To address.

         /////// To:
        try {
            var To = folderAccountCompose.getPrefs(folderURI,"to.");   

            if (To) {
                params.composeFields.to = To; 
                // folderAccountCompose.logMsg('Default To: (new) address = >' + To + '<');
            }

        } catch (e) { }         // Nothing to do, just leave to: at default value

     }
     
    //Reply-To: Set everytime
    // (by Jakob)

    if ((params.type == 0 || folderAccountCompose.getPrefs(folderURI,"replyToOnReplyForward.")) && !params.composeFields.replyTo) {     // type: 0 = New message, 3 = Forward, 6 = Reply, 2 = Reply All
        // TODO: on Reply All, remove replyTo address in To or CC if present

         /////// ReplyTo:
        try {
            var replyTo = folderAccountCompose.getPrefs(folderURI,"replyTo.");   
        
        if (replyTo) {
                //params.identity.replyTo = '';        // Will alter base identity ==> could override here and restore later... but that's risky!!
                params.composeFields.replyTo = replyTo; 
                // folderAccountCompose.logMsg('Adding Reply-To: = >' + replyTo + '<');
            }

        } catch (e) { }         // Nothing to do, just leave to: at default value
     }

     
     if (params.type == 6 && !params.composeFields.cc) {        // Set CC for Replies,  (Reply-Alls seem to be broken, so we'll ignore it here)

        /////// CC:        
        try {
            var To = folderAccountCompose.getPrefs(folderURI,"to.");   
            var addToCcOnReply = folderAccountCompose.getPrefs(folderURI,"addToCcOnReply.");   

            if (addToCcOnReply == "true") {
                params.composeFields.cc = To; 
                // folderAccountCompose.logMsg('Adding CC: = >' + To + '<');
            }

        } catch (e) { }         // Nothing to do, just leave cc: at default value
    }
        
    


    // FROM:    
    // Make sure we are using the desired identity
    
    var FromID = folderAccountCompose.getPrefs(folderURI,"");   

    var To = folderAccountCompose.getPrefs(folderURI,"to.");   
    var overrideReturnAddress = folderAccountCompose.getPrefs(folderURI,"overrideReturnAddress.");   
    
    var override = true;
    if((params.type == 6 || params.type == 2) && overrideReturnAddress == "true")       // No override if this is a reply or reply-all and overrideReturnAddress is true
        override = false;

    // Assume the user always wants the default From, for all sorts of messages, unless they have specified one

    if (FromID && override) {    
        params.identity = MailServices.accounts.getIdentity(FromID);
        // folderAccountCompose.logMsg('From identity set to >' + FromID + '<');
    }        

    // folderAccountCompose.logMsg('Calling the REAL ComposeStartup()  [MsgType = ' + params.type + ']');
    ptrComposeStartup(params);           // Call original ComposeLoad function with modified fields

/*
    var pop = document.getElementById("msgIdentityPopup");
    for (i=0;i<pop.childNodes.length;i++) {
        alert(pop.childNodes[i].getAttribute("accountkey"));     // label has email address itself
                                                            // value is the name known by TB
                                                            // accountname has "- " plus account name
    }

*/
/*
    // Experimental sorting of names in To dropdown
    
      var popup = document.getElementById("msgIdentityPopup");
      var accounts = queryISupportsArray(MailServices.accounts.accounts, Components.interfaces.nsIMsgAccount);
      accounts.sort(cecompareAccountSortOrder);

      for (var i in accounts) {
        var server = accounts[i].incomingServer;
        if (!server)
           continue;
        var identites = queryISupportsArray(accounts[i].identities, Components.interfaces.nsIMsgIdentity);
        for (var j in identites) {
          var identity = identites[j];
          var item = document.createElement("menuitem");
          item.className = "identity-popup-item";
          item.setAttribute("label", server.prettyName);
          item.setAttribute("value", identity.key);
          item.setAttribute("accountkey", accounts[i].key);
          item.setAttribute("accountname", " [" + identity.identityName +"]");
          popup.appendChild(item);
        }
      }


*/
/*

            var idents = prefs.getCharPref("account." + accounts[i] + ".identities").split(',');

            for (var j=0; j<idents.length; j++) {

                try {    
                    var ident = idents[j];
                    var email = prefs.getCharPref("identity." + ident + ".useremail");

                    // OK, passed the test, now get the account name
                    var server = prefs.getCharPref("account." + accounts[i] + ".server");


                    var acctname = "";

                    // If there are more than one account with this identity, we need to clarify which one is which...
                    if (idents.length > 1) {

                        // Name [fullName] worked, but created confusion in some setups...  let's try Name [email address]
                        acctname = prefs.getCharPref("server." + server + ".name") + " [" + prefs.getCharPref("identity." + ident + ".useremail") + "]";

                    } else { 
                        acctname = prefs.getCharPref("server." + server + ".name");
                    }


                    menuItem = document.createElement("menuitem");
                    menuItem.setAttribute("label",acctname);
                    menuItem.setAttribute("value",ident);

                    popup.appendChild(menuItem);

                    if (defaultFrom == ident) { menuItem.setAttribute("selected","true") }

                } catch(e) { }  // Nothing to do but skip this identity...
            }



*/




    // And set the color to indicate that we're using a non-standard return address
    //if (FromID) {    
    //    
    //    var menulist =  document.getElementById("msgIdentity");
    //    
    //}        



// There is code here to handle replies in a similar manner to new messages.  Unfortunately, it doesn't always work, and it is not
// supported.  However, if you want to enable such functionality at your own risk, remove the two lines below marked "Manfred..."

 /* //    <====  Manfred... delete this line and the one marked below

    // Now why the hell do we need to modify the ComposeStartup params _AFTER_ we run ComposeStartup on replies?  
    // Things can get really bulloxed up if we modify them beforehand...    


    if (params.type == 6) {     // 0 = New message, 3 = Forward, 6 = Reply, 2 = Reply All
        
        // TO:  
        // Only set the To: address on a new message or a reply.  For forwards, or Reply All, more likely than not the user will want to use a non-default To address.

        try {
            var To = folderAccountCompose.getPrefs(folderURI,"to.");   

            if (To) {
                // folderAccountCompose.logMsg('Default To: (reply) address = >' + To + '<');
                params.composeFields.to = To;
                
                // And herein lies a big problem.  composeFields.ReplyTo is always blank, even if there is a ReplyTo.  We cannot manipulate it here.
                // But if that header exists, it will override everything we do to the To.  It appears as though the C code reads the ReplyTo header
                // directly from the message itself.  Perhaps we can try to strip the header from the message...
                // Fortunately, on replies, we know the URI of the original message...  Could we go back to that ourselves and bypass the C bypass mechanism?
                // Alas, this approach does not seem to hold much promise.  Too slow.
                
          }
          
      } catch (e) { }         // Nothing to do, just leave to: at default value
        
    }


// Manfred... delete this line and the one marked above ====>   */

  

    // // folderAccountCompose.logMsg(Dumper(params));   // Call Dumper


}

function onLoad(activatedWhileWindowOpen) {
  window.ComposeStartup = ComposeStartup;
}

function onUnload(deactivatedWhileWindowOpen) {}
