var eventListenerRegistered = false;
var prefChanged = false;

var prefs = {
  use_msghdr: true,
  bgcolor_en: true,
  lightness: 75,
  fg_mode: 0,
  ignore_black: false
};

//keyboard shortcut
browser.commands.onCommand.addListener((command) => {
  if (command == "cmd_open-tag-popup") {
    browser.browserAction.openPopup();
  }
});

browser.storage.onChanged.addListener((changes, area) => {

  for (let item in changes) {
    prefs[item] = changes[item].newValue;
  }

  if (!prefChanged) {
    browser.tabs.onActivated.addListener(applyPrefs);
    prefChanged = true;
  }
});

function applyPrefs(activeInfo) {
  if (prefs.bgcolor_en) {
    registerCSS();
  } else {
    unregisterCSS();
  }
  
  registerEventListener(prefs.use_msghdr);
  
  prefChanged = false;
  
  browser.tabs.onActivated.removeListener(applyPrefs);
}

function registerEventListener(register) {
  if (!eventListenerRegistered && register) {
    browser.tagPopupApi.onClick.addListener(eventListenerCallback);
    eventListenerRegistered = true;
  } else if (eventListenerRegistered && !register) {
    browser.tagPopupApi.onClick.removeListener(eventListenerCallback);
    eventListenerRegistered = false;
  }
}

async function eventListenerCallback(tagKey, additional, x, y) {

  let tabs = await browser.tabs.query({
    active: true,
    currentWindow: true
  });
  let msg = await browser.messageDisplay.getDisplayedMessage(tabs[0].id);
  let tags = msg.tags;
  if (additional) { //additional tag is clicked
    tags.push(tagKey);
  } else {
    tags = tags.filter((tag) => {
      return tag != tagKey;
    });
  }

  await browser.messages.update(msg.id, {
    tags: tags
  });

  updateMessageHeaderView(tags);
}

async function updateMessageHeaderView(attachedTags) {
  await browser.tagPopupApi.onTagsChange();

  if (prefs.use_msghdr) {
    //search keys not attached to the message
    let allTags = await browser.messages.listTags();
    let outTags = [];
    for (let i = 0; i < allTags.length; i++) {
      let tag = allTags[i];
      if (attachedTags.indexOf(tag.key) < 0) {
        let obj = {};
        let rgbStr = tag.color.replace("#", "");
        let rgb = rgbStr.match(/../g);
        if (rgb) {
          let r = parseInt(rgb[0], 16);
          let g = parseInt(rgb[1], 16);
          let b = parseInt(rgb[2], 16);
          let fgColor = CSSManager.adjustFgColor(r, g, b, 1);
          obj.fgRGB = fgColor.join(",");
        } else {
          obj.fgRGB = "";
        }
        obj.tag = tag.tag;
        obj.color = tag.color;
        outTags.push(obj);
      }
    }
    
    browser.tagPopupApi.showAdditionalTagsInMsgHdrView(outTags);
  }
}

browser.runtime.onMessage.addListener(async message => {
  switch (message.message) {
    case "TAGS_CHANGED":
      updateMessageHeaderView(message.tags);
      break;
    case "GET_TAGCOLORS":
      let colors = await CSSManager.getAllTagColors(false, true);
      browser.runtime.sendMessage({
        message: "SEND_TAGCOLORS",
        colors: colors
      });
    default:
      break;
  }
});

browser.messageDisplay.onMessageDisplayed.addListener(async (tab, message) => {
  updateMessageHeaderView(message.tags);
});

async function init() {
  for (let key in prefs) {
    let result = await browser.storage.local.get(key);
    let value = result[key];
    if (value !== undefined) {
      prefs[key] = value;
    }
  }

  await CSSManager.init(prefs.fg_mode, prefs.lightness / 100.0, null);

  registerCSS();
  registerEventListener(prefs.use_msghdr);
}

async function registerCSS() {
  if (prefs.bgcolor_en) {
    let css = await CSSManager.makeCSS(prefs.ignore_black);
    browser.tagPopupApi.insertCSS(css);
  }
}

async function unregisterCSS() {
  browser.tagPopupApi.removeCSS();
}

init();
