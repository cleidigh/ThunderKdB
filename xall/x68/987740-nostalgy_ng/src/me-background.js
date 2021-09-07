/*
 * License:  see License.txt
 * Code until Nostalgy 0.3.0/Nostalgy 1.1.15: Zlib
 * Code additions for TB 78 or later: Creative Commons (CC BY-ND 4.0):
 *      Attribution-NoDerivatives 4.0 International (CC BY-ND 4.0) 
 
 * Contributors:  see Changes.txt
 */



/*
 * Documentation:
 * https://github.com/thundernest/addon-developer-support/wiki/Using-the-WindowListener-API-to-convert-a-Legacy-Overlay-WebExtension-into-a-MailExtension-for-Thunderbird-78
 
 
 
 todo
 
 altes goback weg
 richtiges suchverfahren
 history box tut nicht
 
 */

var lastTab = 0, lastWindow = 0, currentMailTab = false;
//messenger.Utilities.isMailTab(true);
//});



//Start Tbsync

messenger.tabs.onCreated.addListener(tab => {
  // onActivated does not fire for tabs being created, manually call the final
  // handler.
  if (tab.active) {
    onSafeActivated({ tabId: tab.id, windowId: tab.windowId });
  }
});

messenger.tabs.onActivated.addListener(activeInfo => {
  // Assume onActivated works as intended, forward to our final handler.  
  onSafeActivated(activeInfo);
});

// This is the final onActivated function, which is called 
// * on the active tab after load
// * on tabs, which have been created as active
// * on each standard tab switch
async function onSafeActivated(activeInfo) {
  let tab = await messenger.tabs.get(activeInfo.tabId);
  //console.log(`Tab ${tab.id} in window ${tab.windowId} was activated (mailtab: ${tab.mailTab}).`);
  currentMailTab = tab.mailTab;
  messenger.Utilities.isMailTab(tab.mailTab);
}


async function waitForLoad() {
  let windows = await browser.windows.getAll({ windowTypes: ["normal"] });
  if (windows.length > 0) {
    // At least one window exists already, so we probably have been activated
    // during runtime. Manually fire a onSaveActivated event with the current info.
    // We will get notified about any subsequent change (even during startup).
    for (let win of windows) {
      let activeTabs = await messenger.tabs.query({ active: true, windowId: win.windowId });
      if (activeTabs.length == 1) {
        onSafeActivated({ tabId: activeTabs[0].id, windowId: activeTabs[0].windowId });
      } else {
     //   console.error(`Did not find exactly one active tab in window ${win.windowId}:`, activeTabs);
      }
    }
    return false;
  }

  return new Promise(function (resolve, reject) {
    function listener(tab) {
      browser.windows.onCreated.removeListener(listener);
      resolve(true);
    }
    browser.windows.onCreated.addListener(listener);
  });
}

window.addEventListener("load", waitForLoad);



//Ende TBsync


messenger.windows.onFocusChanged.addListener(async windowId => {
  // 
  //  let tab = await   messenger.tabs.getCurrent();
 // console.log(" Begin onFocusChanged, windowid", windowId);
  let Tab = await messenger.tabs.query({ windowId: windowId, mailTab: true });
  if (Tab.length > 0) {
 //   console.log("vor Promise");
    let ff = await new Promise(resolve => setTimeout(resolve, 200));
 //   console.log("nach Promise", ff);

    let tab = Tab[0];
  //  console.log("tab", tab, Tab);
  //  console.log(`onFocusChanged:  Tab ${tab.id} in window ${tab.windowId} was activated (mailtab: ${tab.active}).`);
    messenger.Utilities.isMailTab(tab.active);//mailTab);
  };



});

messenger.runtime.onInstalled.addListener(async ({ reason, temporary }) => {
  // if (temporary) return; // skip during development
  switch (reason) {
    case "install":
      {
        const url = messenger.runtime.getURL("popup/installed.html");
        //        const url = messenger.runtime.getURL("popup/about_content.html");
        //await browser.tabs.create({ url });
        await messenger.windows.create({ url, type: "popup", height: 780, width: 1090, });
      }
      break;
    case "update":
      {
        const url = messenger.runtime.getURL("popup/update.html");
        //await browser.tabs.create({ url });
        await messenger.windows.create({ url, type: "popup", height: 780, width: 1090, });
      }
      break;
    // see below
  }
});


var helpUrl = messenger.runtime.getURL("popup/about_content.html");
//await browser.tabs.create({ url });
//messenger.windows.create({ url, type: "popup", width: 910, height: 750, });

messenger.NotifyTools.onNotifyBackground.addListener(async (info) => {
  switch (info.command) {
    case "showHelp":
      //do something
      let helpUrl = messenger.runtime.getURL("popup/about_content.html");
      //     console.log("showHelp");
      messenger.windows.create({ url: helpUrl, type: "popup", width: 700, height: 780, });

      //let rv = await doSomething();
      return;// rv;
      break;
  }
});


/*
messenger.tabs.onActivated.addListener(async (activeInfo) => {
  console.log("tab activated "+ activeInfo.tabId + " window: " + activeInfo.windowId);
  lastTab = activeInfo.tabId;
  lastWindow = activeInfo.windowId;
  let tabInfo = await messenger.tabs.get( activeInfo.tabId);
  console.log( "mailTab", tabInfo.mailTab );
  messenger.Utilities.isMailTab(tabInfo.mailTab);
});

*/

/*
messenger.mailTabs.onSelectedMessagesChanged.addListener(async (tab, selectedMessages) => {
  console.log("onSeletedMessagesChanged ", selectedMessages);//+ " window: " + activeInfo.windowId);
  //lastTab = activeInfo.tabId;
  //lastWindow = activeInfo.windowId;
 // let tabInfo = await messenger.tabs.get( tabId);
 // console.log( "mailTab", tabInfo.mailTab );
 //messenger.Utilities.isMailTab(true); 
 console.log("no sel msg", selectedMessages.messages.length);
  if (selectedMessages.messages.length >0)  messenger.Utilities.isMailTab(true); else messenger.Utilities.isMailTab(false);
});

*/

/*

messenger.tabs.onAttached.addListener(async (tabId, attachInfo) => {
  console.log("tab attached "+ tabId   );//+ " window: " + activeInfo.windowId);
  //lastTab = activeInfo.tabId;
  //lastWindow = activeInfo.windowId;
  let tabInfo = await messenger.tabs.get( tabId);
  console.log( "mailTab", tabInfo.mailTab ,"active",   tabInfo.active  );
  
  }
//  messenger.Utilities.isMailTab(tabInfo.mailTab);
);

*/
/*
messenger.tabs.onCreated.addListener(async (tab) => {
  console.log("tab created "+ tab.id + "mailTab ", tab.mailTab, "active ", tab.active );
//  lastTab = activeInfo.tabId;
//  lastWindow = activeInfo.windowId;
if (tab.active)  {
  messenger.Utilities.isMailTab(tab.mailTab);
};
//messenger.Utilities.isMailTab(tab.mailTab);

//let tabInfo = await messenger.tabs.get( tab.id);
//  messenger.Utilities.isMailTab(tabInfo.mailTab);

//await browser.notifications.create("tabcreated", {
//  "type": "basic",
//  "title": "tabcreated",
//  "message": JSON.stringify(tab)
//});



});


*/


async function main() {
  messenger.WindowListener.registerDefaultPrefs("chrome/content/scripts/me-Defaults.js");


  messenger.WindowListener.registerChromeUrl([
    ["content", "nostalgy", "chrome/content/"],
    ["locale", "nostalgy", "en-US", "chrome/locale/en-US/"],
    //      ["locale", "quickfolders", "ca", "chrome/locale/ca/"],
    ["locale", "nostalgy", "de", "chrome/locale/de/"],
    ["resource", "nostalgy", ""]
    /*      ["locale", "quickfolders", "es-MX", "chrome/locale/es-MX/"],
    ["locale", "quickfolders", "es", "chrome/locale/es/"],
    ["locale", "quickfolders", "fr", "chrome/locale/fr/"],
    ["locale", "quickfolders", "hu-HU", "chrome/locale/hu-HU/"],
    ["locale", "quickfolders", "it", "chrome/locale/it/"],
    ["locale", "quickfolders", "ja-JP", "chrome/locale/ja-JP/"],
    ["locale", "quickfolders", "nl", "chrome/locale/nl/"],
    ["locale", "quickfolders", "pl", "chrome/locale/pl/"],
    ["locale", "quickfolders", "pt-BR", "chrome/locale/pt-BR/"],
    ["locale", "quickfolders", "ru", "chrome/locale/ru/"],
    ["locale", "quickfolders", "sl-SI", "chrome/locale/sl-SI/"],
    ["locale", "quickfolders", "sr", "chrome/locale/sr/"],
    ["locale", "quickfolders", "sv-SE", "chrome/locale/sv-SE/"],
    ["locale", "quickfolders", "vi", "chrome/locale/vi/"],
    ["locale", "quickfolders", "zh-CN", "chrome/locale/zh-CN/"],
    ["locale", "quickfolders", "zh-CHS", "chrome/locale/zh-CN/"],
    ["locale", "quickfolders", "zh", "chrome/locale/zh/"],
    ["locale", "quickfolders", "zh-CHT", "chrome/locale/zh/"],
    ["locale", "quickfolders", "zh-TW", "chrome/locale/zh/"]
*/
  ]);


  messenger.WindowListener.registerOptionsPage("chrome://nostalgy/content/edit_prefs.xhtml");

  //attention: each target window (like messenger.xul) can appear only once
  // this is different from chrome.manifest
  // xhtml for Tb78
  // messenger.WindowListener.registerWindow("chrome://messenger/content/messenger.xhtml", "chrome/content/scripts/qf-messenger.js");

  //   messenger.WindowListener.registerWindow("chrome://messenger/content/messenger.xul", "chrome/content/scripts/me-messenger.js");
  messenger.WindowListener.registerWindow("chrome://messenger/content/messenger.xhtml", "chrome/content/scripts/me-messenger.js");

  //messenger.WindowListener.registerWindow("chrome://messenger/content/messengercompose.xul", "chrome/content/scripts/qf-composer.js");
  messenger.WindowListener.registerWindow("chrome://messenger/content/messengercompose/messengercompose.xhtml", "chrome/content/scripts/me-composer.js");
  /*
      messenger.WindowListener.registerWindow("chrome://messenger/content/FilterListDialog.xul", "chrome/content/scripts/qf-filterlist.js");
      messenger.WindowListener.registerWindow("chrome://messenger/content/FilterListDialog.xhtml", "chrome/content/scripts/qf-filterlist.js");
   
      messenger.WindowListener.registerWindow("chrome://messenger/content/SearchDialog.xul", "chrome/content/scripts/qf-searchDialog.js");
      messenger.WindowListener.registerWindow("chrome://messenger/content/SearchDialog.xhtml", "chrome/content/scripts/qf-searchDialog.js");
  
      messenger.WindowListener.registerWindow("chrome://messenger/content/customizeToolbar.xul", "chrome/content/scripts/qf-customizetoolbar.js");
      messenger.WindowListener.registerWindow("chrome://messenger/content/customizeToolbar.xhtml", "chrome/content/scripts/qf-customizetoolbar.js");
  */
  //   messenger.WindowListener.registerWindow("chrome://messenger/content/messageWindow.xul", "chrome/content/scripts/me-messageWindow.js");
  messenger.WindowListener.registerWindow("chrome://messenger/content/messageWindow.xhtml", "chrome/content/scripts/me-messageWindow.js");
  //  messenger.WindowListener.registerWindow("chrome://messenger/content/messageWindow.xhtml", "chrome/content/scripts/me-messenger.js");

  /* 
   
     messenger.WindowListener.registerStartupScript("chrome/content/scripts/qf-startup.js");
     messenger.WindowListener.registerShutdownScript("chrome/content/scripts/qf-shutdown.js");
 */
  /*
   * Start listening for opened windows. Whenever a window is opened, the registered
   * JS file is loaded. To prevent namespace collisions, the files are loaded into
   * an object inside the global window. The name of that object can be specified via
   * the parameter of startListening(). This object also contains an extension member.
   */

  messenger.WindowListener.waitForMasterPassword();
  messenger.WindowListener.startListening();

  //let mtabs = await messenger.tabs.query({ active: true, currentWindow: true, mailTab: true });
  //console.log("tabs", mtabs);
}

main();
