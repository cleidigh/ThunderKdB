
var folderAccountProps = {

    addTab: function() {

/* => TB78
        // Insert a new dropdown dynamically into the first tab of the properties menu
        // Can't use ovelay because parent has no id


        // Create a menuPopup to contain our menuItems
        var menuPopup = document.createElement("menupopup");

        var menuItem;   // Object for creating items...

        var selectedIndex = 0;  // Pointer to currently selected menu item

        // The "Use Default" option
        menuItem = document.createElement("menuitem");
        menuItem.setAttribute("label","Use Default");
        menuItem.setAttribute("value","Use Default");
        menuPopup.appendChild(menuItem);
*/

        var menuList = document.getElementById("mlFolderAccount");
        menuList.selectedItem = menuList.appendItem("Use Default", "Use Default");


        // Get the "mail" prefrence branch
        var allPrefs = Components.classes["@mozilla.org/preferences-service;1"].getService(Components.interfaces.nsIPrefService);
        var prefs = allPrefs.getBranch("mail.");   
        var accounts = new Array();
        accounts = prefs.getCharPref("accountmanager.accounts").split(',');     // accountmanager.accounts is a comma delimited list of accounts


        // Retrieve any stored user settings...

        //var folderURI = window.opener.GetSelectedFolderURI();             // Pre 3.0
        //var folderURI = window.opener.gFolderDisplay.displayedFolder.URI;   // Want something like "imap://jefferson@www.mailco.com/INBOX/Trash"
        var folderURI =  window.arguments[0].folder.URI;


        var userSettings = allPrefs.getBranch("extensions.folderaccount.");   
        var defaultFrom;
        var defaultTo;
/* unused variable
        var defaultCc;
*/
        var overrideReturnAddress;
        var addToCcOnReply;
	var replyToOnReplyForward;
        var defaultReplyTo;
        
        // Selected From: account
        try {
            defaultFrom = userSettings.getCharPref(folderURI);      
        } catch (e) {
            defaultFrom = "Use Default";
        }


        // Selected To: address
        try {
            defaultTo = userSettings.getCharPref("to." + folderURI);
        } catch (e) {
            defaultTo = "";
        }
 
         // Include address in CC on reply?
         try {
             addToCcOnReply = userSettings.getCharPref("addToCcOnReply." + folderURI);
         } catch (e) {
             addToCcOnReply = "false";
         }

	// Include RepyTo on reply?
         try {
             replyToOnReplyForward = userSettings.getCharPref("replyToOnReplyForward." + folderURI);
         } catch (e) {
             replyToOnReplyForward = "false";
         }
         
         try {
             defaultReplyTo = userSettings.getCharPref("replyTo." + folderURI);
         } catch (e) {
             defaultReplyTo = "";
         }


         // Override default return address?
         try {
             overrideReturnAddress = userSettings.getCharPref("overrideReturnAddress." + folderURI);
         } catch (e) {
             overrideReturnAddress = "false";
         }

        for (var i=0; i<accounts.length; i++) {
            try {  // This try/catch will take care of accounts that have no associated identities.  These we want to skip.
            
            
                // We won't use email, but this will error out if the user doesn't have one set for this type
                // of account (e.g. News & Blogs, Local Folders), which gives us an easy way to skip entries that have no email
                
                // Single personalities assocated with an account look like this:
                // user_pref("mail.account.account2.identities", "id1");

                // Multiple personalities associated with an account look like this:
                // user_pref("mail.account.account2.identities", "id1,id6");

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

/* => TB78
                        menuItem = document.createElement("menuitem");
                        menuItem.setAttribute("label",acctname);
                        menuItem.setAttribute("value",ident);

                        menuPopup.appendChild(menuItem);

                        if (defaultFrom == ident) { menuItem.setAttribute("selected","true") }
*/
                        let menuItem = menuList.appendItem(acctname, ident);
                        if (defaultFrom == ident) {
                          menuList.selectedItem = menuItem;
                        }


                    } catch(e) { }  // Nothing to do but skip this identity...
                }


            } catch(e) { }  // Nothing to do but skip this account...

            document.getElementById("mlFolderAccountDefaultTo").setAttribute("value", defaultTo);
            document.getElementById("mlFolderAccountAddToCcOnReply").checked = (addToCcOnReply == "true");
            document.getElementById("mlFolderAccountReplyToOnReplyForward").checked = (replyToOnReplyForward == "true");
            document.getElementById("mlFolderAccountOverrideReturnAddress").checked = (overrideReturnAddress == "true");
            document.getElementById("mlFolderAccountDefaultReplyTo").setAttribute("value", defaultReplyTo);  // (by Jakob)

        }
        

/* => TB78

        // Create a menuList to contain the menuPopup
        var menuList = document.createElement("menulist");
        menuList.setAttribute("id","mlFolderAccount");  // So we can find it again later!
        //menuList.id = "mlFolderAccount";


        // Our menuPopup is added to the MenuList
        menuList.appendChild(menuPopup);
        menuList.setAttribute("flex",1);



        // Create an hbox, and add a label and our menuList
        var hbox = document.createElement("hbox");
        var label = document.createElement("label");
        label.setAttribute("value","From Account:");
        

        // And another...
        var hbox2 = document.createElement("hbox");
        var label2 = document.createElement("label");
        label2.setAttribute("value","Default To:");
        
        // And even another...
        var hbox3 = document.createElement("hbox");
        var label3 = document.createElement("label");
        label3.setAttribute("value","   ");    // Indent checkbox

        // And yet more... will this madness never end?!?
        var hbox4 = document.createElement("hbox");
        var label4 = document.createElement("label");
        label4.setAttribute("value","   ");     // Indent checkbox

        // And yet still more... 
        var hbox5 = document.createElement("hbox");
        var label5 = document.createElement("label");
        label5.setAttribute("value","Additional Reply-To:");

        var hbox6 = document.createElement("hbox");
        var label6 = document.createElement("label");
        label6.setAttribute("value","   ");     // Indent checkbox



        // I can't make this work!!
        //label.setAttribute("accesskey","A");      // Shortcut key

        hbox.appendChild(label);
        hbox.appendChild(menuList);


        var dtInput = document.createElement("textbox");
        dtInput.setAttribute("id","mlFolderAccountDefaultTo");  // So we can find it again later!
        dtInput.setAttribute("flex",1);
        dtInput.setAttribute("value",defaultTo);
        
        hbox2.appendChild(label2);
        hbox2.appendChild(dtInput);


        var dccCheckbox = document.createElement("checkbox");
        dccCheckbox.setAttribute("id","mlFolderAccountAddToCcOnReply");  // So we can find it again later!
        dccCheckbox.setAttribute("label","Add to CC list on reply (won't work on reply-all)");
        dccCheckbox.setAttribute("checked", addToCcOnReply);

        hbox3.appendChild(label3);             
        hbox3.appendChild(dccCheckbox);



        var doraCheckbox = document.createElement("checkbox");
        doraCheckbox.setAttribute("id","mlFolderAccountOverrideReturnAddress");  // So we can find it again later!
        doraCheckbox.setAttribute("label","Ignore From account on Reply or Reply-All (i.e. Let Thunderbird choose)");
        doraCheckbox.setAttribute("checked", overrideReturnAddress);

        hbox4.appendChild(label4);             
        hbox4.appendChild(doraCheckbox);
        
        var drtInput = document.createElement("textbox");  // (by Jakob)
        drtInput.setAttribute("id","mlFolderAccountDefaultReplyTo");  // So we can find it again later!  // (by Jakob)
        drtInput.setAttribute("flex",1);  // (by Jakob)
        drtInput.setAttribute("value",defaultReplyTo);  // (by Jakob)

        hbox5.appendChild(label5); 
        hbox5.appendChild(drtInput);

	var dccCheckbox = document.createElement("checkbox");
        dccCheckbox.setAttribute("id","mlFolderAccountReplyToOnReplyForward");  // So we can find it again later!
        dccCheckbox.setAttribute("label","use Reply To address also on reply and forward");
        dccCheckbox.setAttribute("checked", replyToOnReplyForward);
        hbox6.appendChild(label6);             
        hbox6.appendChild(dccCheckbox);
        
        

        hbox.setAttribute("align",  "baseline");  // Make hboxes look pretty
        hbox2.setAttribute("align", "baseline");  
        hbox3.setAttribute("align", "baseline");  
        hbox4.setAttribute("align", "baseline");  
        hbox5.setAttribute("align", "baseline");

        // Finally, a vbox is created to hold the menuList
        var vbox = document.createElement("vbox");
        vbox.appendChild(hbox);
        
        // And one for the Default To input
        var vbox2 = document.createElement("vbox");
        vbox2.appendChild(hbox2);


        // And one for the Default CC input
        var vbox3 = document.createElement("vbox");
        vbox3.appendChild(hbox3);


        // And one more for the Use Default Return Address
        var vbox4 = document.createElement("vbox");
        vbox4.appendChild(hbox4);


        // And one more for the Use Default Reply-To
        var vbox5 = document.createElement("vbox");
        vbox5.appendChild(hbox5);

	// And one more for Reply-To on Reply
        var vbox6 = document.createElement("vbox");
        vbox6.appendChild(hbox6);



        var tabpanels = document.getElementById("folderPropTabPanel");
        if (!tabpanels) {   // TB v2.0 beta
            var tabbox = document.getElementById("folderPropTabBox");   // This is the parent of tabpanels
        
            tabpanels = tabbox.childNodes[1];  // From XUL Planet: The tabbox should contain two children, the first a tabs element which 
                                               // contains the tabs and the second a tabpanels element which contains the contents of the pages.
        }    
        // And we're back in business!


        // Add the new content to the bottom of the first panel of folder properties
        tabpanels.firstChild.appendChild(vbox);
        tabpanels.firstChild.appendChild(vbox2);
        tabpanels.firstChild.appendChild(vbox5);
        tabpanels.firstChild.appendChild(vbox6);
        tabpanels.firstChild.appendChild(vbox3);
        tabpanels.firstChild.appendChild(vbox4);

        //// Now add an event handler for when the user clicks "OK"

        // First, grab the current event handler
        // var handler = document.documentElement.getAttribute('ondialogaccept');

        // And prepend our save function to it...
        // document.documentElement.setAttribute('ondialogaccept','folderAccountProps.saveAccountPrefs();' + handler);
		
        // The preceding code no longer works in Thunderbird 68 
        // (see https://developer.thunderbird.net/add-ons/tb68/changes#less-than-dialog-greater-than-events),
        // therefore changed preference weren't saved.
        // This way seems to work fine:

*/

        document.addEventListener("dialogaccept", function(event) {
        	folderAccountProps.saveAccountPrefs();
        });

    },


/////

    // Removes leading whitespaces
    LTrim: function ( value ) {
        var re = /\s*((\S+\s*)*)/;
        return value.replace(re, "$1");
    },

    // Removes ending whitespaces
    RTrim: function ( value ) {
        var re = /((\s*\S+)*)\s*/;
        return value.replace(re, "$1");
    },

    // Removes leading and ending whitespaces
    trim: function ( value ) {
        return folderAccountProps.LTrim(folderAccountProps.RTrim(value));
    },



    saveAccountPrefs: function() {

        // Get value of our box:

        try {

            var mlFrom                    = document.getElementById("mlFolderAccount");
            var mlTo                      = document.getElementById("mlFolderAccountDefaultTo");
            var mlAddToCcOnReply          = document.getElementById("mlFolderAccountAddToCcOnReply");
	    var mlReplyToOnReplyForward	  = document.getElementById("mlFolderAccountReplyToOnReplyForward");
            var mlOverrideReturnAddress   = document.getElementById("mlFolderAccountOverrideReturnAddress");
            var mlReplyTo                 = document.getElementById("mlFolderAccountDefaultReplyTo");  // (by Jakob)


            var folderURI =  window.arguments[0].folder.URI;

            var prefs = Components.classes["@mozilla.org/preferences-service;1"].getService(Components.interfaces.nsIPrefService);
            prefs = prefs.getBranch("extensions.folderaccount.");   

            if(mlFrom.value == "Use Default") {
                // If the value is "Use Default", then we'll just delete the relevant saved preference
                // Need to use try/catch because if pref doesn't exist, clearUserPref will bomb
                try {
                    prefs.clearUserPref(folderURI);
                    } catch (e) { }

            } else {

                // Otherwise, save the preference
                prefs.setCharPref(folderURI,mlFrom.value);
            }
            
            mlTo.value = folderAccountProps.trim(mlTo.value);   // Strip leading and trailing spaces
            mlReplyTo.value = folderAccountProps.trim(mlReplyTo.value); 

            if(mlTo.value == "") {
                // If the value is blank, then we'll just delete the relevant saved preference
                // Need to use try/catch because if pref doesn't exist, clearUserPref will bomb
                try {
                    prefs.clearUserPref("to." + folderURI);
                } catch (e) { }

            } else {
                // Otherwise, save the preference
                prefs.setCharPref("to." + folderURI,mlTo.value);
            }


            // Save state of our checkbox
            prefs.setCharPref("addToCcOnReply." + folderURI, mlAddToCcOnReply.getAttribute("checked"));
	    prefs.setCharPref("replyToOnReplyForward." + folderURI, mlReplyToOnReplyForward.getAttribute("checked"));
            prefs.setCharPref("overrideReturnAddress." + folderURI, mlOverrideReturnAddress.getAttribute("checked"));
            prefs.setCharPref("replyTo." + folderURI,mlReplyTo.value);

            
        } catch (e) { } 
    }
};

/* => TB78
// Run our main code when the window has been loaded...
// Use try/catch to get rid of a spurious error message.  Remember to disable this when debugging!!
try {
    window.addEventListener("load", folderAccountProps.addTab(), false);
} catch(e) { }
*/

function onLoad(activatedWhileWindowOpen) {
  WL.injectCSS("chrome://messenger/skin/menulist.css");
  WL.injectElements(`
    <tab id="FolderAccountTab" label="Folder Account" insertafter="GeneralTab"/>
    <vbox id="FolderAccountPanel" insertafter="GeneralPanel">
      <vbox id="nameBox" align="right" class="input-container">
        <label id="identityLabel" value="From Account:" accesskey="F" control="mlFolderAccount"/>
        <menulist is="menulist-editable" id="mlFolderAccount" type="description" disableautoselect="false">
          <menupopup id="mlFolderAccountPopup"/>
          <spacer height="2"/>
        </menulist>
        <label id="defaultToLabel" value="Default To:" control="mlFolderAccountDefaultTo" accesskey="T"/>
        <html:input id="mlFolderAccountDefaultTo" type="text" class="input-inline"/>
        <label id="defaultReplyToLabel" value="Additional Reply-To:" control="mlFolderAccountDefaultReplyTo" accesskey="R"/>
        <html:input id="mlFolderAccountDefaultReplyTo" type="text" class="input-inline"/>
      </vbox>
      <spacer height="6"/>
      <vbox>
        <checkbox id="mlFolderAccountReplyToOnReplyForward" label="Use Reply-To address also on Reply and Forward" accesskey="U"/>
        <spacer height="2"/>
        <checkbox id="mlFolderAccountAddToCcOnReply" label="Add to CC list on Reply (won't work on Reply-All)" accesskey="C"/>
        <spacer height="2"/>
        <checkbox id="mlFolderAccountOverrideReturnAddress" label="Ignore From account on Reply or Reply-All (i.e. let Thunderbird choose)" accesskey="I"/>
      </vbox>
    </vbox>
  `);
  folderAccountProps.addTab();
}

function onUnload(deactivatedWhileWindowOpen) {}
