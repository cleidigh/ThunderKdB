/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. 
 * Copyright: opto (Klaus)
 * */
 
 
//Components.utils.import("resource:///modules/StringBundle.js");
Components.utils.import("resource:///modules/Services.jsm");
//Components.utils.import("resource:///modules/gloda/indexer.js");
//Components.utils.import("resource://app/modules/MailUtils.js");
const {classes: Cc, interfaces: Ci, utils: Cu, results : Cr} = Components;

//borrowed from mail/base/content/mailCommands.js
function getIdentityForHeader(hdr, type)
{
  function findDeliveredToIdentityEmail() {
    // This function reads from currentHeaderData, which is only useful if we're
    // looking at the currently-displayed message. Otherwise, just return
    // immediately so we don't waste time.
    if (hdr != gMessageDisplay.displayedMessage)
      return "";

    // Get the delivered-to headers.
    let key = "delivered-to";
    let deliveredTos = new Array();
    let index = 0;
    let header = "";
    while ((header = currentHeaderData[key])) {
      deliveredTos.push(header.headerValue.toLowerCase().trim());
      key = "delivered-to" + index++;
    }

    // Reverse the array so that the last delivered-to header will show at front.
    deliveredTos.reverse();

    for (let i = 0; i < deliveredTos.length; i++) {
      for (let identity in fixIterator(accountManager.allIdentities,
                                       Components.interfaces.nsIMsgIdentity)) {
        if (!identity.email)
          continue;
        // If the deliver-to header contains the defined identity, that's it.
        if (deliveredTos[i] == identity.email.toLowerCase() ||
            deliveredTos[i].includes("<" + identity.email.toLowerCase() + ">"))
          return identity.email;
      }
    }
    return "";
  }

  let server = null;
  let identity = null;
  let folder = hdr.folder;
  if (folder) {
    server = folder.server;
    identity = folder.customIdentity;
    if (identity)
      return identity;
  }

  if (!server) {
    let accountKey = hdr.accountKey;
    if (accountKey) {
      let account = accountManager.getAccount(accountKey);
      if (account)
        server = account.incomingServer;
    }
  }

  let hintForIdentity = "";
  if (type == Components.interfaces.nsIMsgCompType.ReplyToList)
    hintForIdentity = findDeliveredToIdentityEmail();
  else if (type == Components.interfaces.nsIMsgCompType.Template)
    hintForIdentity = hdr.author;
  else
    hintForIdentity = hdr.recipients + "," + hdr.ccList + "," +
                      findDeliveredToIdentityEmail();

  if (server)
    identity = getIdentityForServer(server, hintForIdentity);

  if (!identity)
    identity = getBestIdentity(accountManager.allIdentities, hintForIdentity);

  return identity;
}


function parse(aMimeLine) {
  if (!aMimeLine)
    return [[], []];
  let emails = {};
  let fullNames = {};
  let names = {};
  let numAddresses = MailServices.headerParser.parseHeadersWithArray(aMimeLine, emails, names, fullNames);
  return [names.value, emails.value];
}

function newMsgThread(event){
        let msgHdr = gFolderDisplay.selectedMessage;
       // let msgURI = gDBView.URIForFirstSelectedMessage;
//                   MailUtils.displayMessage(msgHdr);
  let title = msgHdr.mime2DecodedSubject;  

//alert( msgHdr.mime2DecodedRecipients); 
//alert(msgHdr.recipients);
//alert(msgHdr.author);
  let [recipients, recipientsEmailAddresses] = parse(msgHdr.recipients);
//  alert(recipientsEmailAddresses);

   let newThreadIdentity= getIdentityForHeader(msgHdr, "new");
//   alert(newThreadIdentity.email);
 var ToMe=  (  msgHdr.recipients.includes(newThreadIdentity.email.toLowerCase())  );                         

 var FromMe= ( msgHdr.author.includes(newThreadIdentity.email.toLowerCase()));
// alert(ToMe);
// alert(FromMe);
  var msgComposeService=  
    Components.classes["@mozilla.org/messengercompose;1"]  
    .getService(Components.interfaces.nsIMsgComposeService);  
  

  let compFields = Components.classes["@mozilla.org/messengercompose/composefields;1"].createInstance(Components.interfaces.nsIMsgCompFields);
compFields.from = newThreadIdentity.email; 
if (FromMe) compFields.to = msgHdr.recipients; else compFields.to = msgHdr.author +  "," + msgHdr.recipients ;
compFields.cc = msgHdr.ccList;
compFields.bcc = msgHdr.bccList;
//alert(compFields.to);
//alert ( msgHdr.recipients);
//compFields.subject = "test";
//compFields.body = "message body\r\n";      //only displayed if format is plaintext
let msgComposeParams = Components.classes["@mozilla.org/messengercompose/composeparams;1"].createInstance(Components.interfaces.nsIMsgComposeParams);
msgComposeParams.composeFields = compFields;
msgComposeParams.identity=newThreadIdentity ;
//   msgComposeParams.format = Ci.nsIMsgCompFormat.PlainText;      //otherwise, body is not dislayed
   //composeHtml
  //     Ci.nsIMsgCompFormat.HTML
 //      Ci.nsIMsgCompFormat.PlainText;
 

msgComposeService.OpenComposeWindowWithParams(null, msgComposeParams);


//other option to open compose window:
/*  
var sURL="mailto:user@domain.com?subject=add";  

  // make the URI  
  var ioService =  
    Components.classes["@mozilla.org/network/io-service;1"]  
      .getService(Components.interfaces.nsIIOService);  
  
  aURI = ioService.newURI(sURL, null, null);  
// open new message  
  msgComposeService.OpenComposeWindowWithURI (null, aURI);  
*/


//MsgReplyToAllMessage(event);RestoreFocusAfterHdrButton();
}



