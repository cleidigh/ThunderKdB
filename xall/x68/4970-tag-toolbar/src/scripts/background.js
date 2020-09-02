var eventListenerRegistered = false;
var cssPrefChanged = false;
var updatingMsgs = false;

var prefs = {
  use_msghdr: true,
  bgcolor_en: true,
  lightness: 75,
  fg_mode: 0,
  ignore_black: false,
  recent_num: 0,
  hdr_category: "all",
  refresh_cats: true,
  categories: []
};

function disablePopup(disable) {
  if (disable) {
    updatingMsgs = true;
    browser.browserAction.disable();
    browser.messageDisplayAction.disable();
  } else {
    updatingMsgs = false;
    browser.browserAction.enable();
    browser.messageDisplayAction.enable();
  }
}

//keyboard shortcut
browser.commands.onCommand.addListener((command) => {
  if (command == "cmd_open-tag-popup" && !updatingMsgs) {
    browser.browserAction.openPopup();
  }
});

browser.storage.onChanged.addListener((changes, area) => {
  let css_prefs = [
    "bgcolor_en",
    "lightness",
    "fg_mode",
    "ignore_black"
  ];

  for (let item in changes) {
    prefs[item] = changes[item].newValue;
    cssPrefChanged = cssPrefChanged || (css_prefs.indexOf(item) > -1);
  }

  if (Object.keys(changes).indexOf("recent_num") > -1) {
    updateRecentTags([]);
  }

  if (Object.keys(changes).indexOf("use_msghdr") > -1) {
    registerEventListener(prefs.use_msghdr);
  }

  if (!cssPrefChanged) {
    browser.tabs.onActivated.addListener(applyPrefs);
    cssPrefChanged = true;
  }

});

function findCategory(key) {
  let ret = null;
  for (let i = 0; i < prefs.categories.length; i++) {
    let cat = prefs.categories[i];
    if (cat.key === key) {
      ret = cat;
      break;
    }
  }

  return ret;
}

function applyPrefs(activeInfo) {
  if (prefs.bgcolor_en) {
    registerCSS();
  } else {
    unregisterCSS();
  }

  cssPrefChanged = false;

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
  if (additional) { //add tag
    tags.push(tagKey);
    if (prefs.recent_num > 0) {
      let cat = findCategory(prefs.hdr_category);
      let tagObj = await findTagInCategory(tagKey, cat);
      await updateRecentTags([tagObj]);
    }
  } else { //remove tag
    tags = tags.filter((tag) => {
      return tag != tagKey;
    });
  }

  //disablePopup(true);
  await browser.messages.update(msg.id, {
    tags: tags
  });
  //disablePopup(false);

  updateMessageHeaderView(tags);
}

async function findTagInCategory(key, cat) {
  let found = null;
  let catKey = cat ? cat.key : "all";
  let tags = (catKey === "all") ? await browser.messages.listTags() : cat.tags;
  for (let i = 0; i < tags.length; i++) {
    if (tags[i].key === key) {
      found = tags[i];
      break;
    }
  }

  return found;
}

async function updateMessageHeaderView(attachedTags) {
  await browser.tagPopupApi.onTagsChange();

  if (prefs.use_msghdr) {
    //search keys not attached to the message
    let cat = findCategory(prefs.hdr_category);
    let catKey = cat ? cat.key : "all";
    let allTags = (catKey === "all") ? await browser.messages.listTags() : cat.tags;
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

browser.runtime.onMessage.addListener(async (message) => {
  switch (message.message) {
    case "TAGS_CHANGED":
      disablePopup(true);
      await addTags(message.tagKeys);
      disablePopup(false);
      
      if (prefs.recent_num > 0) await updateRecentTags(message.tags);
      updateMessageHeaderView(message.tags);

      /*
        Notify completion to popup.
        Failed if popup was already closed but it does not affect to the add-on's functionalities.
      */
      browser.runtime.sendMessage({
        message: "UPDATE_MSGS_DONE"
      });

      break;
    case "GET_TAGCOLORS":
      let colors = await CSSManager.getAllTagColors(false, true);
      browser.runtime.sendMessage({
        message: "SEND_TAGCOLORS",
        colors: colors
      });
      break;
    case "GET_TAGS":
      let tags = await browser.messages.listTags();
      browser.runtime.sendMessage({
        message: "SEND_TAGS",
        tags: tags
      });
      break;
    default:
      break;
  }
});

async function addTags(newTagKeys) {
  let tabs = await browser.tabs.query({
    active: true,
    currentWindow: true
  });

  try {
    if (tabs[0].mailTab) {
      console.log("Start to update tags.");
      let msgs = await browser.mailTabs.getSelectedMessages(tabs[0].id);
      let cnt = await addTagsToMessages(msgs.messages, newTagKeys);
      console.log(cnt+" messages were updated.");
      while (msgs.id) {
        msgs = await browser.messages.continueList(msgs.id);
        cnt += await addTagsToMessages(msgs.messages, newTagKeys);
        console.log(cnt+" messages were updated.");
      }
      console.log("Completed.");
    } else {
      let msg = await browser.messageDisplay.getDisplayedMessage(tabs[0].id);
      await addTagsToMessages([msg], newTagKeys);
    }
  } catch (e) {
    console.error("No message is selected and displayed." + e);
  }
}

async function addTagsToMessages(msgs, newTagKeys) {
  for (let i = 0; i < msgs.length; i++) {
    await browser.messages.update(msgs[i].id, {
      tags: newTagKeys
    });
  }
  
  return msgs.length;
}

browser.messageDisplay.onMessageDisplayed.addListener(async (tab, message) => {
  updateMessageHeaderView(message.tags);
});

async function updateRecentTags(tags) {
  let recentTagsCategory = findCategory("recent");
  let newRecent = [];

  if (tags.length > 0) { //check duplicates
    for (let i = 0; i < tags.length; i++) {
      let tag = tags[i];
      let index = recentTagsCategory.tags.findIndex((x) => {
        return x.key === tag.key;
      });

      if (index > -1) {
        recentTagsCategory.tags.splice(index, 1);
      }

      newRecent.push(tag);
    }
  }

  newRecent = newRecent.concat(recentTagsCategory.tags);
  if (newRecent.length > prefs.recent_num) {
    newRecent.splice(prefs.recent_num);
  }

  recentTagsCategory.tags = newRecent;
  browser.storage.local.set({
    categories: prefs.categories
  });
}

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

  if (prefs.refresh_cats) refreshCategoryCachedTags();
}

async function refreshCategoryCachedTags() {
  console.log("Refresh tag cache in categories.");
  let cats = prefs.categories;

  if (!cats || cats.length === 0) {
    await prepareDefaultCategories();
    console.log("Category is not found. Prepare defaults.");
  } else {
    //generate key=>tag map
    let tags = await browser.messages.listTags();
    let tagMap = {};
    for (let i = 0; i < tags.length; i++) {
      let tag = tags[i];
      tagMap[tag.key] = tag;
    }

    for (let i = 0; i < cats.length; i++) {
      let cat = cats[i];
      if (cat.key === "all" || cat.isSearchCategory) {
        continue;
      }

      let catTags = cat.tags;
      for (let j = catTags.length - 1; j >= 0; j--) { //search in reverse order since removal may occur
        let catTag = catTags[j];
        let curTag = tagMap[catTag.key];

        if (!curTag) { //the tag was removed
          catTags.splice(j, 1);
        } else {
          catTag.tag = curTag.tag;
          catTag.color = curTag.color;
        }
      }
    }
    console.log("Refreshed.");
  }


  browser.storage.local.set({
    categories: prefs.categories
  });
}

async function prepareDefaultCategories() {

  let name = await browser.i18n.getMessage("tpupSysCatAll");
  let allCat = {
    name: name,
    key: "all",
    isSearchCategory: false,
    tags: [],
    query: "",
    caseSense: false,
    regexp: false
  };

  prefs.categories.push(allCat);

  name = await browser.i18n.getMessage("tpupSysCatRecent");
  let recentCat = {
    name: name,
    key: "recent",
    isSearchCategory: false,
    tags: [],
    query: "",
    caseSense: false,
    regexp: false
  };

  prefs.categories.push(recentCat);
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
