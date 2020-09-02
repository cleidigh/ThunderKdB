var progress = 0; //0: not started, 1: started, 2: before send, 3: sending
var noteInfoIndex = 0;
var noteInfoConfLocal = null;
var isOnenote = false;
var showPopup = false;
var isReminder = false;
var buttonExists = false;

/*
Prefs changed in experiments.
Monitor change in experiments and store it in MX.
Note if it is not registerred here, its onChange event is detected and infinite loop will occur.
*/
var expPrefs = ["sent_date", "sent_times"];
var prefs = [];

async function init() {
  gENFPreferences.init();
  prefs = gENFPreferences.getDefaultPrefs();
  await loadAlllPrefs();
  createMenus();
  await browser.enForwardApi.init();
}
init();

/* 
Listener to check toolbar button on tab created. 
Remove it when the check completed.
After that, it is monitored by toolbar customization event from experiments scope.
*/
var initialListener = async (tab) => {
  if (tab.mailTab) {
    buttonExists = await browser.enForwardApi.checkToolbarButton();
    browser.tabs.onCreated.removeListener(initialListener);
  }
}
browser.tabs.onCreated.addListener(initialListener);

async function loadAlllPrefs() {
  for (let key in prefs) {
    let result = await browser.storage.local.get(key);
    if (result[key] !== undefined) {
      prefs[key] = result[key];
      setPrefToExperiments(key);
    }
  }
}

function setPrefToExperiments(item) {
  //pref is changed in experiments. need not to notify to avoid infinite loop
  if (expPrefs.indexOf(item) >= 0) return;

  switch (typeof (prefs[item])) {
    case "number":
      browser.enForwardApi.setIntPref(item, prefs[item]);
      break;
    case "boolean":
      browser.enForwardApi.setBoolPref(item, prefs[item]);
      break;
    case "string":
      browser.enForwardApi.setCharPref(item, prefs[item]);
      break;
    default: //unknown pref
      break;
  }
}

browser.storage.onChanged.addListener((changes, area) => {
  for (let item in changes) {
    prefs[item] = changes[item].newValue;
    setPrefToExperiments(item);

    if (item === "onenote_service_name") updateOtherServiceMenu();
  }
});

//start from context menus
function createMenus() {
  messenger.menus.create({
    contexts: ["message_list"],
    id: "enforward_evernote",
    onclick: () => {
      isReminder = false;
      isOnenote = false;
      openPopup();
    },
    title: "Forward to Evernote"
  });

  messenger.menus.create({
    contexts: ["message_list"],
    id: "enforward_evernote_rem",
    onclick: () => {
      isReminder = true;
      isOnenote = false;
      openPopup();
    },
    title: "Forward to Evernote with reminder"
  });

  let otherServiceName = prefs["onenote_service_name"];
  messenger.menus.create({
    contexts: ["message_list"],
    id: "enforward_onenote",
    onclick: () => {
      isReminder = false;
      isOnenote = true;
      openPopup();
    },
    title: "Forward to " + otherServiceName
  });
}

function updateOtherServiceMenu() {
  let otherServiceName = prefs["onenote_service_name"];
  messenger.menus.update("enforward_onenote", {
    title: "Forward to " + otherServiceName
  });
}

//start from toolbar butoon
browser.browserAction.onClicked.addListener((tab, info) => {
  isReminder = (prefs["default_service"] === 1); //always show popup with reminder mode
  isOnenote = (prefs["default_service"] === 2);
  openPopup();
});

//start from shortcut
browser.commands.onCommand.addListener((command) => {
  switch (command) {
    case "cmd_evernote":
      isReminder = false;
      isOnenote = false;
      openPopup();
      break;
    case "cmd_evernote_rem":
      isReminder = true;
      isOnenote = false;
      openPopup();
      break;
    case "cmd_onenote":
      isReminder = false;
      isOnenote = true;
      openPopup();
      break;
    default: //unknown command
      break;
  }
});

function openPopup() {
  if (isOnenote) { //Other service
    showPopup = prefs["onenote_show_conf_dialog"];
  } else if (isReminder) { //Evernote with reminder. Always show popup.
    showPopup = true;
  } else { //Evernote without reminder
    showPopup = prefs["show_conf_dialog"];
  }

  if (buttonExists) {
    browser.browserAction.setBadgeText({
      text: null
    });

    //popup is set even if no warning option to show cancel popup
    browser.browserAction.setPopup({
      popup: "html/popup.html"
    });
  } else { //toobar button is not available. so cannot show popup and badge.
    console.log("Toolbarbutton does not exist. Suppress popup and badge.")
    showPopup = false;
  }

  if (showPopup) {
    browser.browserAction.openPopup();
  } else {
    if (progress < 1) {
      startForwarding();
    } else {
      cancelForwarding();
    }
  }
}

function startForwarding() {
  if (buttonExists) {
    browser.browserAction.setBadgeText({
      text: null
    });
  }
  browser.enForwardApi.forwardMessages(isOnenote, isReminder);
  progress = 1;
}

function cancelForwarding() {
  browser.enForwardApi.abortForward();
  progress = 0;
  console.log("User canceled.")

  if (buttonExists) {
    //remove popup
    browser.browserAction.setPopup({
      popup: null
    });

    browser.browserAction.setBadgeText({
      text: null
    });
  }
}

browser.runtime.onMessage.addListener(async (message) => {
  switch (message.message) {
    //From popup
    case "START_FORWARDING": //start request from popup
      if (progress < 1) {
        startForwarding();
      } else if (progress === 1) {
        //waiting noteInfo from Experiments. 
      } else if (progress === 2) {
        sendNoteInfoToPopup(noteInfoConfLocal);
      } else {
        //confirm cancel forwarding
        sendNoteInfoToPopup([]);
      }
      break;
    case "USER_CHECKED":
      if (message.confirmed && message.noteInfo.length > 0) {
        updateNoteInfo(message.noteInfo, noteInfoIndex, message.sendNum);
      } else {
        cancelForwarding();
      }
      break;
    case "USER_CANCELED":
      cancelForwarding();
      break;

      //From options
    case "GET_TAGS":
      let tags = await browser.messages.listTags();
      sendTags(tags);
      break;
    case "GET_IDS":
      let ids = await getIdentities();
      sendIdentities(ids);
      break;

      //From compose
    case "GET_NOTEINFO_COMPOSE":
      let noteInfo = await browser.enForwardApi.getNoteInfoForSelectedMessages(message.onenote);
      noteInfoToCompose(noteInfo);
      break;
    default:
      break;
  }
});

function sendTags(tags) {
  browser.runtime.sendMessage({
    message: "SEND_TAGS",
    tags: tags
  });
}

function noteInfoToCompose(noteInfo) {
  browser.runtime.sendMessage({
    message: "SEND_NOTEINFO_COMPOSE",
    noteInfo: noteInfo
  });
}

async function getIdentities() {
  let accounts = await browser.accounts.list();
  let ret = [];

  for (let i = 0; i < accounts.length; i++) {
    let acc = accounts[i];
    let ids = acc.identities;

    //skip local foler and account without identity
    if (acc.type === "none" || ids.length === 0) continue;

    for (let j = 0; j < ids.length; j++) {
      let email = ids[j].email;
      let name = ids[j].name;
      let id = acc.id + "/" + ids[j].id;
      let label = ids[j].label;

      ret[id] = name ? name + " <" + email + ">" : email;
      if (label) ret[id] += " (" + label + ")";
    }
  }
  return ret;
}

function sendIdentities(ids) {
  browser.runtime.sendMessage({
    message: "SEND_IDS",
    ids: ids
  });
}

function sendNoteInfoToPopup(noteInfoConf, index) {
  let showPopup = isOnenote ? prefs["onenote_show_conf_dialog"] : prefs["show_conf_dialog"];
  if (showPopup && buttonExists) {
    let serviceName = isOnenote ? prefs["onenote_service_name"] : "Evernote";
    browser.runtime.sendMessage({
      message: "SEND_NOTEINFO",
      noteInfo: noteInfoConf,
      progress: progress,
      serviceName: serviceName
    });
  } else {
    updateNoteInfo(noteInfoConf, index, noteInfoConf.length);
  }
}

function updateNoteInfo(noteInfoConf, index, sendNum) {
  if (buttonExists) {
    browser.browserAction.setBadgeText({
      text: sendNum.toString()
    });
  }

  browser.enForwardApi.updateNoteInfo(noteInfoConf, index);
  progress = 3;
}

browser.enForwardApi.setMonitoredPrefs(expPrefs);
browser.enForwardApi.onPrefChanged.addListener(async (prefstr, type, intValue, boolValue, charValue) => {
  let value = null;
  switch (type) {
    case "int":
      value = intValue;
      break;
    case "bool":
      value = boolValue;
      break;
    case "char":
      value = charValue;
      break;
  }

  prefs[prefstr] = value;

  let obj = {};
  obj[prefstr] = value;
  browser.storage.local.set(obj);
});

browser.enForwardApi.onBeforeSend.addListener((noteInfoConf, index) => {
  if (progress > 0 && noteInfoConf.length > 0) { //other cases are ones from filter functionality
    progress = 2;
    noteInfoConfLocal = noteInfoConf;
    noteInfoIndex = index;
    sendNoteInfoToPopup(noteInfoConf, index);
  } else if (noteInfoConf.length === 0) {
    console.log("no message is selected");
    cancelForwarding();
  }
});

browser.enForwardApi.onSendComplete.addListener((succeeded, sentNum, totalNum) => {
  if (progress > 2) { //other cases are ones from filter functionality
    let rest = totalNum - sentNum;
    if (buttonExists) {
      if (succeeded) {
        browser.browserAction.setBadgeText({
          text: rest.toString()
        });
      } else {
        browser.browserAction.setBadgeText({
          text: "!"
        });
      }
    }

    if (rest > 0) {
      progress = 3;
    } else {
      progress = 0;
      if (buttonExists) {
        //remove popup
        browser.browserAction.setPopup({
          popup: null
        });

        //remove badge after a few seconds
        setTimeout(() => {
          browser.browserAction.setBadgeText({
            text: null
          });
        }, 3000);
      }
    }
  }
});

browser.enForwardApi.afterToolbarCustomization.addListener((id, enfButtonExists) => {
  if (id === "mail-bar3") {
    buttonExists = enfButtonExists;
  }
});

browser.compose.onBeforeSend.addListener((tab, details) => {
  let found = isEnAddressIncluded(details.to, prefs["email"]);
  found = found || isEnAddressIncluded(details.cc, prefs["email"]);
  found = found || isEnAddressIncluded(details.bcc, prefs["email"]);

  if (found) {
    browser.enForwardApi.saveSentDone();
  }
});

function isEnAddressIncluded(addrList, enAddress) {
  let found = false;
  for (let i = 0; i < addrList.length; i++) {
    let contact = addrList[i];
    if (contact.indexOf("@") < 0) { //maybe maillist
      continue;
    }
    let re = contact.match(/.+ <(\S+)>/);
    let addr = re ? re[1] : contact;
    if (addr === enAddress) {
      found = true;
      break;
    }
  }

  return found;
}
