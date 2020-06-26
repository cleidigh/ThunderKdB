function  quicksearch_author(info, tab)
{
let searchText=info.selectedMessages.messages[0].author;
let iPos=-1;
let iLength=searchText.length;
let sModifier=  info.modifiers[0] || "";
if (sModifier=="Ctrl")  
{ 
  iPos=searchText.indexOf("@");
//  if (searchText[searchText.length-1] == ">"  ) iLength=iLength-1;
}
res =  browser.mailTabs.setQuickFilter( {text: {text: searchText.substring(iPos+1), author:true, recipients:true}}); 
i=10;
}



async function  quicksearch_authorComm()
{
let msgs=  await browser.mailTabs.getSelectedMessages(lastMailTab);
let searchText=msgs.messages[0].author;
let iPos=-1;
let iLength=searchText.length;

res =  browser.mailTabs.setQuickFilter( {text: {text: searchText.substring(0), author:true, recipients:true}}); 
i=10;
}




async function  quicksearch_DomainComm()
{
let msgs=  await browser.mailTabs.getSelectedMessages(lastMailTab);
let searchText=msgs.messages[0].author;
let iPos=-1;
let iLength=searchText.length;

  iPos=searchText.indexOf("@");
//  if (searchText[searchText.length-1] == ">"  ) iLength=iLength-1;

res =  browser.mailTabs.setQuickFilter( {text: {text: searchText.substring(iPos+1), author:true, recipients:true}}); 
i=10;
}

async  function getActiveTab(activeInfo)
 {

lastTab= await browser.tabs.get(activeInfo.tabId);
if (lastTab.mailTab) 
{
lastMailTab=activeInfo.tabId; 
//console.log(lastMailTab); 
}
//  else console.log("no mailtab");
 }

browser.tabs.onActivated.addListener(getActiveTab);



browser.menus.create({
  id: "search-author",
  title: "Quicksearch: email (click) / domain (Ctrl-click)",
   onclick:  quicksearch_author,
  contexts: ["message_list"]
});


browser.runtime.onInstalled.addListener(async ({ reason, temporary }) => {
  if (temporary) return; // skip during development
  switch (reason) {
    case "install":
      {
        const url = browser.runtime.getURL("popup/installed.html");
        //await browser.tabs.create({ url });
        await browser.windows.create({ url, type: "popup", height: 600, width: 600, });
      }
      break;
    // see below
  }
});


browser.commands.onCommand.addListener(function (command) {
  if (command === "quicksearch-email") {
    console.log("quicksearch-email");
    quicksearch_authorComm();
  }
});


browser.commands.onCommand.addListener(function (command) {
  if (command === "quicksearch-domain") {
    console.log("quicksearch-domain");
    quicksearch_DomainComm();
  }
});



browser.commands.onCommand.addListener(function (command) {
  if (command === "quicksearch-subject") {
//    console.log("quicksearch-subject!");
  }
});




