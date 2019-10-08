<?xml version="1.0"?>



<overlay id="folderAccountCompose_propsOverlay" xmlns="http://www.mozilla.org/keymaster/gatekeeper/there.is.only.xul">




<script type="application/x-javascript"><![CDATA[

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



    
var ptrComposeStartup = ComposeStartup;  // Pointer to original ComposeLoad function



// Modified version of ComposeStartup
ComposeStartup = function dummy(recycled, aParams) {

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
    
    folderAccountCompose.logMsg('Using settings for folderURI = >' + folderURI + '<');
    
    
    // folderAccountCompose.logMsg(Dumper(params));   // Call Dumper
    
    
    
    // TO:
    // Do NOT overwrite To: address if the message is new and already has one: The user probably selected an addr from the address book and wants to use that one.


    if (params.type == 0 && !params.composeFields.to) {     // type: 0 = New message, 3 = Forward, 6 = Reply, 2 = Reply All
        // Only set the To: address on a new message.  For forwards, or Reply All, more likely than not the user will want to use a non-default To address.

         /////// To:
        try {
            var To = folderAccountCompose.getPrefs(folderURI,"to.");   

            if (To) {
                params.composeFields.to = To; 
                folderAccountCompose.logMsg('Default To: (new) address = >' + To + '<');
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
                folderAccountCompose.logMsg('Adding Reply-To: = >' + replyTo + '<');
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
                folderAccountCompose.logMsg('Adding CC: = >' + To + '<');
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
        folderAccountCompose.logMsg('From identity set to >' + FromID + '<');
    }        

    folderAccountCompose.logMsg('Calling the REAL ComposeStartup()  [MsgType = ' + params.type + ']');
    ptrComposeStartup(recycled, params);           // Call original ComposeLoad function with modified fields

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
                folderAccountCompose.logMsg('Default To: (reply) address = >' + To + '<');
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

  

    // folderAccountCompose.logMsg(Dumper(params));   // Call Dumper


}



/* For future reference, params looks like this:
[From DataDumper by Matt Kruse <matt@mattkruse.com>]

folderAccountCompose - {
 'composeFields' => {
                     'to' => 'junk@trash.com',
                     'QueryInterface' => [function],
                     'from' => '',
                     'replyTo' => '',   <--- always blank, even if there is a replyTo (but there is data in the identity reply-to)
                     'cc' => '',
                     'bcc' => '',
                     'fcc' => '',
                     'fcc2' => '',
                     'newsgroups' => '',
                     'newshost' => '',
                     'newspostUrl' => '',
                     'followupTo' => '',
                     'subject' => '',
                     'attachments' => '',
                     'organization' => '',
                     'references' => '',
                     'priority' => '',
                     'messageId' => '',
                     'characterSet' => 'ISO-8859-1',
                     'defaultCharacterSet' => 'ISO-8859-1',
                     'templateName' => '',
                     'draftId' => '',
                     'returnReceipt' => false,
                     'receiptHeaderType' => 0,
                     'attachVCard' => false,
                     'forcePlainText' => false,
                     'useMultipartAlternative' => false,
                     'uuEncodeAttachments' => false,
                     'bodyIsAsciiOnly' => false,
                     'forceMsgEncoding' => false,
                     'otherRandomHeaders' => '',
                     'body' => '',
                     'temporaryFiles' => '',
                     'attachmentsArray' => {
                                            'QueryInterface' => [function],
                                            'read' => [function],
                                            'write' => [function],
                                            'Count' => [function],
                                            'GetElementAt' => [function],
                                            'QueryElementAt' => [function],
                                            'SetElementAt' => [function],
                                            'AppendElement' => [function],
                                            'RemoveElement' => [function],
                                            'Enumerate' => [function],
                                            'Clear' => [function],
                                            'GetIndexOf' => [function],
                                            'GetIndexOfStartingAt' => [function],
                                            'GetLastIndexOf' => [function],
                                            'DeleteLastElement' => [function],
                                            'DeleteElementAt' => [function],
                                            'Compact' => [function],
                                            'clone' => [function]
                                           },
                     'addAttachment' => [function],
                     'removeAttachment' => [function],
                     'removeAttachments' => [function],
                     'SplitRecipients' => [function],
                     'ConvertBodyToPlainText' => [function],
                     'checkCharsetConversion' => [function],
                     'needToCheckCharset' => true,
                     'securityInfo' => [null]
                    },
 'QueryInterface' => [function],
 'type' => 0,
 'format' => 0,
 'originalMsgURI' => '',    <--- will contain original message URI on a reply
 'identity' => {
                'QueryInterface' => [function],
                'key' => 'id3',
                'identityName' => 'My Name Herse <myesssmailaa@address.com>',
                'fullName' => 'My Name Herse',
                'email' => 'myesssmailaa@address.com',
                'replyTo' => '',
                'organization' => '',
                'composeHtml' => true,
                'attachSignature' => false,
                'attachVCard' => false,
                'autoQuote' => true,
                'replyOnTop' => 0,
                'sigBottom' => true,
                'signature' => [null],
                'signatureDate' => 0,
                'escapedVCard' => '',
                'doFcc' => true,
                'fccFolder' => 'mailbox://myemail@xxx.com/Sent',
                'fccFolderPickerMode' => '0',
                'draftsFolderPickerMode' => '0',
                'tmplFolderPickerMode' => '0',
                'bccSelf' => false,
                'bccOthers' => false,
                'bccList' => [null],
                'doBcc' => false,
                'doBccList' => '',
                'draftFolder' => 'mailbox://myemail@xxx.com/Drafts',
                'stationeryFolder' => 'mailbox://myemail@xxx.com/Templates',
                'showSaveMsgDlg' => false,
                'directoryServer' => '',
                'overrideGlobalPref' => false,
                'autocompleteToMyDomain' => false,
                'valid' => true,
                'clearAllValues' => [function],
                'smtpServerKey' => 'smtp1',
                'requestReturnReceipt' => false,
                'receiptHeaderType' => 0,
                'copy' => [function],
                'getUnicharAttribute' => [function],
                'setUnicharAttribute' => [function],
                'getCharAttribute' => [function],
                'setCharAttribute' => [function],
                'getBoolAttribute' => [function],
                'setBoolAttribute' => [function],
                'getIntAttribute' => [function],
                'setIntAttribute' => [function]
               },
 'bodyIsLink' => false,
 'sendListener' => [null],
 'smtpPassword' => '',
 'origMsgHdr' => [null]
}
*/


// Insert dumper code below...


//////////////////////////////////////////////////////////////////////////////////
//////////////////////////////////////////////////////////////////////////////////
//////////////////////////////////////////////////////////////////////////////////
//////////////////////////////////////////////////////////////////////////////////
//////////////////////////////////////////////////////////////////////////////////
//////////////////////////////////////////////////////////////////////////////////
//////////////////////////////////////////////////////////////////////////////////
//////////////////////////////////////////////////////////////////////////////////
//////////////////////////////////////////////////////////////////////////////////
//////////////////////////////////////////////////////////////////////////////////
//////////////////////////////////////////////////////////////////////////////////
//////////////////////////////////////////////////////////////////////////////////
//////////////////////////////////////////////////////////////////////////////////
//////////////////////////////////////////////////////////////////////////////////
//////////////////////////////////////////////////////////////////////////////////


// ===================================================================
// Author: Matt Kruse <matt@mattkruse.com>
// WWW: http://www.mattkruse.com/
//
// NOTICE: You may use this code for any purpose, commercial or
// private, without any further permission from the author. You may
// remove this notice from your final code if you wish, however it is
// appreciated by the author if at least my web site address is kept.
//
// You may *NOT* re-distribute this code in any way except through its
// use. That means, you can include it in your product, or your web
// site, or any other form where the code is actually being used. You
// may not put the plain javascript up on your site for download or
// include it in your javascript libraries for download. 
// If you wish to share this code with others, please just point them
// to the URL instead.
// Please DO NOT link directly to my .js files from your site. Copy
// the files to your server and use them there. Thank you.
// ===================================================================

// HISTORY
// ------------------------------------------------------------------
// March 18, 2004: Updated to include max depth limit, ignoring standard
//    objects, ignoring references to itself, and following only
//    certain object properties.
// March 17, 2004: Created
/* 
DESCRIPTION: These functions let you easily and quickly view the data
structure of javascript objects and variables

COMPATABILITY: Will work in any javascript-enabled browser

USAGE:

// Return the output as a string, and you can do with it whatever you want
var out = Dumper(obj);

// When starting to traverse through the object, only follow certain top-
// level properties. Ignore the others
var out = Dumper(obj,'value','text');

// Sometimes the object you are dumping has a huge number of properties, like
// form fields. If you are only interested in certain properties of certain 
// types of tags, you can restrict that like Below. Then if DataDumper finds
// an object that is a tag of type "OPTION" it will only examine the properties
// of that object that are specified.
DumperTagProperties["OPTION"] = [ 'text','value','defaultSelected' ]

// View the structure of an object in a window alert
DumperAlert(obj);

// Popup a new window and write the Dumper output to that window
DumperPopup(obj);

// Write the Dumper output to a document using document.write()
DumperWrite(obj);
// Optionall, give it a different document to write to
DumperWrite(obj,documentObject);

NOTES: Be Careful! Some objects hold references to their parent nodes, other
objects, etc. Data Dumper will keep traversing these nodes as well, until you
have a really, really huge tree built up. If the object you are passing in has
references to other document objects, you should either:
    1) Set the maximum depth that Data Dumper will search (set DumperMaxDepth)
or
    2) Pass in only certain object properties to traverse
or
    3) Set the object properties to traverse for each type of tag
    
*/ 
var DumperIndent = 1;
var DumperIndentText = " ";
var DumperNewline = "\n";
var DumperObject = null; // Keeps track of the root object passed in
var DumperMaxDepth = 2; // Max depth that Dumper will traverse in object
var DumperIgnoreStandardObjects = true; // Ignore top-level objects like window, document
var DumperProperties = null; // Holds properties of top-level object to traverse - others are igonred
var DumperTagProperties = new Object(); // Holds properties to traverse for certain HTML tags
function DumperGetArgs(a,index) {
    var args = new Array();
    // This is kind of ugly, but I don't want to use js1.2 functions, just in case...
    for (var i=index; i<a.length; i++) {
        args[args.length] = a[i];
    }
    return args;
}
function DumperPopup(o) {
    var w = window.open("about:blank");
    w.document.open();
    w.document.writeln("<HTML><BODY><PRE>");
    w.document.writeln(Dumper(o,DumperGetArgs(arguments,1)));
    w.document.writeln("</PRE></BODY></HTML>");
    w.document.close();
}
function DumperAlert(o) {
    alert(Dumper(o,DumperGetArgs(arguments,1)));
}
function DumperWrite(o) {
    var argumentsIndex = 1;
    var d = document;
    if (arguments.length>1 && arguments[1]==window.document) {
        d = arguments[1];
        argumentsIndex = 2;
    }
    var temp = DumperIndentText;
    var args = DumperGetArgs(arguments,argumentsIndex)
    DumperIndentText = "&nbsp;";
    d.write(Dumper(o,args));
    DumperIndentText = temp;
}
function DumperPad(len) {
    var ret = "";
    for (var i=0; i<len; i++) {
        ret += DumperIndentText;
    }
    return ret;
}
function Dumper(o) {
    var level = 1;
    var indentLevel = DumperIndent;
    var ret = "";
    if (arguments.length>1 && typeof(arguments[1])=="number") {
        level = arguments[1];
        indentLevel = arguments[2];
        if (o == DumperObject) {
            return "[original object]";
        }
    }
    else {
        DumperObject = o;
        // If a list of properties are passed in
        if (arguments.length>1) {
            var list = arguments;
            var listIndex = 1;
            if (typeof(arguments[1])=="object") {
                list = arguments[1];
                listIndex = 0;
            }
            for (var i=listIndex; i<list.length; i++) {
                if (DumperProperties == null) { DumperProperties = new Object(); }
                DumperProperties[list[i]]=1;
            }
        }
    }
    if (DumperMaxDepth != -1 && level > DumperMaxDepth) {
        return "...";
    }
    if (DumperIgnoreStandardObjects) {
        if (o==window || o==window.document) {
            return "[Ignored Object]";
        }
    }
    // NULL
    if (o==null) {
        ret = "[null]";
        return ret;
    }
    // FUNCTION
    if (typeof(o)=="function") {
        ret = "[function]";
        return ret;
    } 
    // BOOLEAN
    if (typeof(o)=="boolean") {
        ret = (o)?"true":"false";
        return ret;
    } 
    // STRING
    if (typeof(o)=="string") {
        ret = "'" + o + "'";
        return ret;
    } 
    // NUMBER   
    if (typeof(o)=="number") {
        ret = o;
        return ret;
    }
    if (typeof(o)=="object") {
        if (typeof(o.length)=="number" ) {
            // ARRAY
            ret = "[";
            for (var i=0; i<o.length;i++) {
                if (i>0) {
                    ret += "," + DumperNewline + DumperPad(indentLevel);
                }
                else {
                    ret += DumperNewline + DumperPad(indentLevel);
                }
                ret += Dumper(o[i],level+1,indentLevel-0+DumperIndent);
            }
            if (i > 0) {
                ret += DumperNewline + DumperPad(indentLevel-DumperIndent);
            }
            ret += "]";
            return ret;
        }
        else {
            // OBJECT
            ret = "{";
            var count = 0;
            for (i in o) {
                if (o==DumperObject && DumperProperties!=null && DumperProperties[i]!=1) {
                    // do nothing with this node
                }
                else {
                    if (typeof(o[i]) != "unknown") {
                        var processAttribute = true;
                        // Check if this is a tag object, and if so, if we have to limit properties to look at
                        if (typeof(o.tagName)!="undefined") {
                            if (typeof(DumperTagProperties[o.tagName])!="undefined") {
                                processAttribute = false;
                                for (var p=0; p<DumperTagProperties[o.tagName].length; p++) {
                                    if (DumperTagProperties[o.tagName][p]==i) {
                                        processAttribute = true;
                                        break;
                                    }
                                }
                            }
                        }
                        if (processAttribute) {
                            if (count++>0) {
                                ret += "," + DumperNewline + DumperPad(indentLevel);
                            }
                            else {
                                ret += DumperNewline + DumperPad(indentLevel);
                            }
                            ret += "'" + i + "' => " + Dumper(o[i],level+1,indentLevel-0+i.length+6+DumperIndent);
                        }
                    }
                }
            }
            if (count > 0) {
                ret += DumperNewline + DumperPad(indentLevel-DumperIndent);
            }
            ret += "}";
            return ret;
        }
    }
}

//////////////////////////////////////////////////////////////////////////////////
//////////////////////////////////////////////////////////////////////////////////
//////////////////////////////////////////////////////////////////////////////////
//////////////////////////////////////////////////////////////////////////////////
//////////////////////////////////////////////////////////////////////////////////
//////////////////////////////////////////////////////////////////////////////////
//////////////////////////////////////////////////////////////////////////////////
//////////////////////////////////////////////////////////////////////////////////
//////////////////////////////////////////////////////////////////////////////////
//////////////////////////////////////////////////////////////////////////////////
//////////////////////////////////////////////////////////////////////////////////
//////////////////////////////////////////////////////////////////////////////////
//////////////////////////////////////////////////////////////////////////////////
//////////////////////////////////////////////////////////////////////////////////
//////////////////////////////////////////////////////////////////////////////////



]]>


</script>


</overlay>




 
