/*
 * License:  see License.txt

 * Code  for TB 78 or later: Creative Commons (CC BY-ND 4.0):
 *      Attribution-NoDerivatives 4.0 International (CC BY-ND 4.0) 
 
 * Copyright: Klaus Buecher/opto 2021
 * Contributors:  see Changes.txt
 */

var lastMailTab;

async function main() {
 
  // landing windows.
  messenger.runtime.onInstalled.addListener(async ({ reason, temporary }) => {
    // if (temporary) return; // skip during development
    switch (reason) {
      case "install":
      {
        let url = browser.runtime.getURL("popup/installed.html");
        //await browser.tabs.create({ url });
        await browser.windows.create({ url, type: "popup", width: 1010, height: 770, });
      }
      break;
      // see below
      case "update":
      {
        let url = browser.runtime.getURL("popup/update.html");
        //await browser.tabs.create({ url });
        await browser.windows.create({ url, type: "popup", width: 1010, height: 770, });
      }
      break;
    // see below
    }
  });

  /*
  messenger.messageDisplay.onMessageDisplayed.addListener((tab, message) => {
    //console.log(`Message displayed in tab ${tab.id}: ${message.subject}`);
  });
*/

async function newThread(info, tab )  {
  console.log(`Message displayed in tab ${tab.id}: ${info.modifiers}`);
  console.log(info);
  console.log(info.modifiers.indexOf("Shift"));    
  let msg = await messenger.messageDisplay.getDisplayedMessage(tab.id);
//		console.log(msg.author);
  var compDet =  {body:""};

 if (info.modifiers.indexOf("Alt")==-1  )  compDet = {body:"", subject:""}; // compDet.subject = "";// = {body:""}; else compDet = {body:"", subject:""}; 
 let compTab =  await messenger.compose.beginNew(msg.id,compDet);

  let attList = await messenger.compose.listAttachments(compTab.id);
//		console.log(attList);

  let i = 0;
  for (i=0; i<attList.length;i++) await messenger.compose.removeAttachment(compTab.id, attList[i].id);
  if (info.modifiers.indexOf("Shift")!=-1  )  {
  compDet = await messenger.compose.getComposeDetails(compTab.id);
  console.log(compDet);
  let bcc = compDet.bcc;
  console.log(compDet.to, bcc)
  let replyTo = compDet.replyTo;
  bcc.push(replyTo[0]);
  console.log(bcc);
  compDet.bcc = bcc;
  console.log(compDet);
  compDet = await messenger.compose.setComposeDetails(compTab.id, compDet);
  }


}

async  function getActiveTab(activeInfo)
 {

let lastTab= await browser.tabs.get(activeInfo.tabId);
if (lastTab.mailTab) 
{
lastMailTab=lastTab; 
//console.log(lastMailTab); 
}
//  else console.log("no mailtab");
 }

browser.tabs.onActivated.addListener(getActiveTab);



async function newThreadComm()  {
  console.log(`Message displayed in tab ${lastMailTab.id}`);
   let msg = await messenger.messageDisplay.getDisplayedMessage(lastMailTab.id);
//		console.log(msg.author);
  var compDet = {body:"", subject:""}; // compDet.subject = "";// = {body:""}; else compDet = {body:"", subject:""}; 
 let compTab =  await messenger.compose.beginNew(msg.id,compDet);

  let attList = await messenger.compose.listAttachments(compTab.id);
//		console.log(attList);

  let i = 0;
  for (i=0; i<attList.length;i++) await messenger.compose.removeAttachment(compTab.id, attList[i].id);


}


browser.menus.create({
  id: "newThread",
  title: "New to all (click) / keep subject (Alt-click) / bcc to me (Shift-click)",
   onclick:  newThread,
  contexts: ["message_list"]
});




  messenger.messageDisplayAction.onClicked.addListener(async (tab, info) => {
    console.log(`Message displayed in tab ${tab.id}: ${info.modifiers}`);
    console.log(info);
    console.log(info.modifiers.indexOf("Shift"));    
		let msg = await messenger.messageDisplay.getDisplayedMessage(tab.id);
//		console.log(msg.author);
    var compDet =  {body:""};

   if (info.modifiers.indexOf("Alt")==-1  )  compDet = {body:"", subject:""}; // compDet.subject = "";// = {body:""}; else compDet = {body:"", subject:""}; 
   let compTab =  await messenger.compose.beginNew(msg.id,compDet);
 
		let attList = await messenger.compose.listAttachments(compTab.id);
//		console.log(attList);

		let i = 0;
    for (i=0; i<attList.length;i++) await messenger.compose.removeAttachment(compTab.id, attList[i].id);
    if (info.modifiers.indexOf("Shift")!=-1  )  {
    compDet = await messenger.compose.getComposeDetails(compTab.id);
    console.log(compDet);
    let bcc = compDet.bcc;
    console.log(compDet.to, bcc)
    let replyTo = compDet.replyTo;
    bcc.push(replyTo[0]);
    console.log(bcc);
    compDet.bcc = bcc;
    console.log(compDet);
    compDet = await messenger.compose.setComposeDetails(compTab.id, compDet);
    }
   
  });

  browser.commands.onCommand.addListener(function (command) {
    if (command === "newThreadComm") {
      console.log("comm: newThreadComm");
      newThreadComm();
    }
  });
  
  
//    messenger.messageDisplayAction.disable();
//    messenger.messageDisplayAction.setBadgeText({text:"test"});

/*
 messenger.tabs.onActivated.addListener(async (activeInfo) => {
    //console.log("tab activated "+ activeInfo.tabId + " window: " + activeInfo.windowId);
    lastTab = activeInfo.tabId;
    lastWindow = activeInfo.windowId;
    let tabInfo = await messenger.tabs.get( activeInfo.tabId);
    if (!tabInfo.mailTab) ;
  });

*/

 /*
  * Start listening for opened windows. Whenever a window is opened, the registered
  * JS file is loaded. To prevent namespace collisions, the files are loaded into
  * an object inside the global window. The name of that object can be specified via
  * the parameter of startListening(). This object also contains an extension member.
  */

}

main().catch(console.error);