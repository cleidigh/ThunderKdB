var forbidEvent = false;
var categories = [];
var allTags = null;
var selectedMessages = [];

function initTagList(tags) {
  let allChecked = true;

  let form = document.getElementById("taglist");
  let noMsgLabel = document.getElementById("nomsg");
  let mainArea = document.getElementById("tagsArea");
  let body = document.getElementById("taglistBody");
  mainArea.removeChild(body);

  body = document.createElement("div");
  body.id = "taglistBody";
  mainArea.appendChild(body);

  if (!tags) { //no message is selected
    nomsg.hidden = false;
    mainArea.hidden = true;
    allChecked = false;
  } else {
    nomsg.hidden = true;
    mainArea.hidden = false;

    if (tags.length > 0) {
      allChecked = true;
    } else {
      allChecked = false;
    }

    for (let i = 0; i < tags.length; i++) {
      let check = document.createElement("input");
      check.setAttribute("type", "checkbox");
      check.checked = tags[i].attach;
      check.id = "check_" + tags[i].key;
      check.value = tags[i].key;
      check.name = "tag_check";
      check.setAttribute("tagColor", tags[i].color);
      check.setAttribute("tagName", tags[i].tag);
      check.addEventListener("change", addTags);

      let label = document.createElement("label");
      label.textContent = tags[i].tag;

      let rgbStr = tags[i].color.replace("#", "");
      let rgb = rgbStr.match(/../g);
      if (rgb) {
        let r = parseInt(rgb[0], 16);
        let g = parseInt(rgb[1], 16);
        let b = parseInt(rgb[2], 16);
        let fgColor = CSSManager.adjustFgColor(r, g, b, 1);
        label.style.color = "rgb(" + fgColor.join(",") + ")";
      } else {
        label.style.color = tags[i].color;
      }

      label.style.borderBottomColor = tags[i].color;
      label.style.borderBottomStyle = "solid";
      label.style.borderBottomWidth = "thin";
      label.id = "label_" + tags[i].key;

      let div = document.createElement("div");
      div.id = "div_" + tags[i].key;
      div.setAttribute("class", "checkbox-visible");
      div.appendChild(check);
      div.appendChild(label);
      body.appendChild(div);

      allChecked = allChecked && tags[i].attach;
    }

    let selall = document.taglist.selall;
    selall.checked = allChecked;
  }

  form.setAttribute("class", "checkbox-visible");
}

async function init() {
  await CSSManager.init(null, null, []);
  translate();

  let result = await browser.storage.local.get("categories");
  if (result.categories === undefined) {
    await prepareDefaultCategories();
  } else if (result.categories.length === 0) {
    await prepareDefaultCategories();
  } else {
    categories = result.categories;
  }

  initCategoryList();

  result = await browser.storage.local.get("lastCat");
  let lastCat = result.lastCat === undefined ? "all" : result.lastCat;
  let catList = document.getElementById("categories");
  catList.value = lastCat;

  if (catList.selectedIndex == -1) { //lastCat does not exist
    catList.value = "all";
  }

  selectedMessages = await getCurrentMessages();

  switchCategory();

  let searchbox = document.taglist.search;
  searchbox.addEventListener("input", searchTags);

  let selall = document.taglist.selall;
  selall.addEventListener("change", selectAll);

  catList.addEventListener("change", () => {
    switchCategory();
  });
}

async function switchCategory() {
  let catList = document.getElementById("categories");
//  let selectedIndex = catList.selectedIndex;
//  let cat = categories[selectedIndex];
  let opt = catList.selectedOptions[0];
  let index = opt.getAttribute("catIndex");
  let cat = categories[parseInt(index)];
  
  let tags = null;

  if (selectedMessages.length < 1) {
    tags = null;
  } else if (cat.key === "all") {
    tags = await listTags(null);
  } else if (cat.isSearchCategory) {
    let searchedTags = await listSavedSearchTags(cat.query, cat.caseSense, cat.regexp);
    tags = await listTags(searchedTags);
  } else {
    tags = await listTags(cat.tags);
  }

  initTagList(tags);

  let obj = {
    lastCat: cat.key
  };
  browser.storage.local.set(obj);
}

async function listSavedSearchTags(query, caseSense, regexp) {
  let pattern = "";
  if (regexp) {
    pattern = caseSense ? new RegExp(query) : new RegExp(query, "i");
  } else {
    pattern = caseSense ? query : query.toLowerCase();
  }

  if (!allTags) allTags = await browser.messages.listTags();

  let ret = [];
  for (let i = 0; i < allTags.length; i++) {
    let tag = allTags[i];
    let matched = false;
    if (regexp) {
      matched = pattern.test(tag.tag);
    } else {
      let name = caseSense ? tag.tag : tag.tag.toLowerCase();
      matched = (name.indexOf(pattern) > -1);
    }

    if (matched) {
      tag.attach = (selectedMessages.length > 0) && (selectedMessages[0].tags.indexOf(tag.key) != -1);
      ret.push(tag);
    }
  }

  return ret;
}

function initCategoryList() {
  let catList = document.getElementById("categories");
  for (let i = 0; i < categories.length; i++) {
    let cat = categories[i];

    //skip empty recent category
    if (cat.key === "recent" && cat.tags.length === 0) {
      continue;
    }
    let opt = document.createElement("option");
    opt.value = cat.key;
    opt.textContent = cat.name;
    opt.setAttribute("catIndex", i);
    catList.appendChild(opt);
  }
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

  categories.push(allCat);

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

  categories.push(recentCat);
}

async function listTags(orgTags) {
  let ret = [];

  if (!allTags) allTags = await browser.messages.listTags();

  let tags = orgTags ? orgTags : allTags;

  if (selectedMessages.length > 0) {
    for (let i = 0; i < tags.length; i++) {
      ret.push({
        key: tags[i].key,
        tag: tags[i].tag,
        color: tags[i].color,
        attach: (selectedMessages[0].tags.indexOf(tags[i].key) != -1)
      });
    }
  } else { //no message is selected
    ret = null;
  }

  return ret;
}

function searchTags(event) {
  let query = event.target.value.toLowerCase();
  let checkbox = document.taglist.tag_check;

  for (let i = 0; i < checkbox.length; i++) {
    let label = document.getElementById("label_" + checkbox[i].value);
    let tagName = label.textContent.toLowerCase();
    if (tagName == "" || tagName.indexOf(query) != -1) {
      checkbox[i].parentNode.setAttribute("class", "checkbox-visible");
    } else {
      checkbox[i].parentNode.setAttribute("class", "checkbox-collapse");
    }
  }
}

function selectAll(event) {
  let sel = event.target.checked;
  let checkbox = document.taglist.tag_check;

  forbidEvent = true;
  for (let i = 0; i < checkbox.length; i++) {
    let visibleClass = checkbox[i].parentNode.getAttribute("class");
    if (visibleClass == "checkbox-visible") {
      checkbox[i].checked = sel;
    }
  }
  forbidEvent = false;
  addTags();
}

async function addTags() {
  if (!forbidEvent) {
    disableTagList(true);
    let tagCheck = document.taglist.tag_check;
    let newTagKeys = [];
    let newTags = [];
    for (let i = 0; i < tagCheck.length; i++) {
      if (tagCheck[i].checked) {
        newTagKeys.push(tagCheck[i].value);
        let obj = {
          key: tagCheck[i].value,
          name: tagCheck[i].getAttribute("tagName"),
          color: tagCheck[i].getAttribute("tagColor")
        };
        newTags.push(obj);
      }
    }
    
    //update tags by background.js
    browser.runtime.sendMessage({
      message: "TAGS_CHANGED",
      tags: newTags,
      tagKeys: newTagKeys
    });
  }
}

async function addTagsToMessages(msgs, newTagKeys) {
  for (let i = 0; i < msgs.length; i++) {
    await browser.messages.update(msgs[i].id, {
      tags: newTagKeys
    });
  }
}

function disableTagList(disable) {
  document.taglist.categories.disabled = disable;
  document.taglist.search.disabled = disable;
  document.taglist.selall.disabled = disable;
  
  let body = document.getElementById("taglistBody");
  for (let i=0; i<body.childNodes.length; i++) {
    let div = body.childNodes[i];
    if (div.id.indexOf("div_") === 0) {
      let checkId = div.id.replace(/^div_/,"check_");
      let check = document.getElementById(checkId);
      if (check) check.disabled = disable;
    }
  }
}

//returns upto 100 selected messages
async function getCurrentMessages() {
  let tabs = await browser.tabs.query({
    active: true,
    currentWindow: true
  });

  let messages = [];

  try {
    if (tabs[0].mailTab) {
      let msgs = await browser.mailTabs.getSelectedMessages(tabs[0].id);
      messages = msgs.messages;
    } else {
      let msg = await browser.messageDisplay.getDisplayedMessage(tabs[0].id);
      if (msg) messages.push(msg);
    }
  } catch (e) {
    console.error("No message is selected and displayed." + e);
  }

  return messages;
}

browser.runtime.onMessage.addListener((message) => {
  switch (message.message) {
    case "UPDATE_MSGS_DONE":
      disableTagList(false);
      break;
    default:
      break;
  }
});

init();
