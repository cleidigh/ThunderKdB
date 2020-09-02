var default_prefs = {
  use_msghdr: true,
  bgcolor_en: true,
  lightness: 75,
  fg_mode: 0,
  ignore_black: false,
  recent_num: 0,
  hdr_category: "all",
  refresh_cats: true
};

var colors = []; //all used color
var tags = []; //all tags
var categories = []; //list of categories with order

async function init() {
  translate();
  await loadPrefs();

  await CSSManager.init(null, null, []);
  browser.runtime.sendMessage({
    message: "GET_TAGCOLORS"
  });

  browser.runtime.sendMessage({
    message: "GET_TAGS"
  });
}
init();

browser.runtime.onMessage.addListener(async message => {
  switch (message.message) {
    case "SEND_TAGCOLORS":
      colors = message.colors;
      showColorSample();
      break;
    case "SEND_TAGS":
      tags = message.tags;
      initCategoryEditor();
      break;
    default:
      break;
  }
});

function buildHdrCategoryList(key) {
  let list = document.getElementById("hdr_category");

  for (let i = list.childNodes.length - 1; i >= 0; i--) {
    list.removeChild(list.childNodes[i]);
  }

  for (let i = 0; i < categories.length; i++) {
    let cat = categories[i];
    if (!cat.isSearchCategory) {
      let opt = document.createElement("option");
      opt.value = cat.key;
      opt.textContent = cat.name;
      list.appendChild(opt);
      if (cat.key === key) {
        list.selectedIndex = i;
      }
    }
  }

  if (list.selectedIndex == -1) list.selectedIndex = 0;
}

async function loadPrefs() {
  //load all categories
  let result = await browser.storage.local.get("categories");
  if (result.categories === undefined) {
    await prepareDefaultCategories();
  } else if (result.categories.length === 0){
    await prepareDefaultCategories();
  } else {
    categories = result.categories;
  }

  for (let key in default_prefs) {
    let elem = document.getElementById(key);
    let result = await browser.storage.local.get(key);
    let value = result[key];
    if (value === undefined) {
      value = default_prefs[key];
    }

    switch (elem.localName) {
      case "input":
        let type = elem.getAttribute("type");
        if (type == "checkbox") {
          elem.checked = value;
        } else if (type == "number") {
          elem.value = value;
        }
        break;
      case "select":
        if (key === "hdr_category") {
          buildHdrCategoryList(value);
        } else {
          elem.value = value.toString();
        }
        break;
      default:
        break;
    }

    elem.addEventListener("change", (event) => {
      savePref(event);
    });
  }

  document.getElementById("fg_mode").addEventListener("change", () => {
    showColorSample();
  });
  document.getElementById("lightness").addEventListener("change", () => {
    showColorSample();
  });
  document.getElementById("ignore_black").addEventListener("change", () => {
    showColorSample();
  });
  document.getElementById("reset_recent").addEventListener("click", () => {
    clearRecentHistory();
  });
  document.getElementById("refresh_cats_now").addEventListener("click", () => {
    refreshCategoryCachedTags();
  });

}

async function savePref(event) {
  let elem = event.target;
  let id = elem.id;
  let obj = {};

  switch (elem.localName) {
    case "input":
      let type = elem.getAttribute("type");
      if (type == "checkbox") {
        obj[id] = elem.checked;
      } else if (type == "number") {
        obj[id] = isNaN(elem.value) ? 0 : elem.value;
      }
      break;
    case "select":
      if (id === "hdr_category") {
        obj[id] = elem.value;
      } else {
        obj[id] = parseInt(elem.value);
      }
      break;
    default:
      break;
  }
  browser.storage.local.set(obj);
}

async function showColorSample() {
  let lightness = parseInt(document.getElementById("lightness").value);

  if (isNaN(lightness)) return;
  lightness = lightness / 100.0;
  if (lightness > 1) {
    lightness = 1;
    document.getElementById("lightness").value = 100;
  } else if (lightness < 0) {
    lightness = 0;
    document.getElementById("lightness").value = 0;
  }

  let fg = parseInt(document.getElementById("fg_mode").value);

  let list = document.getElementById("colorSample");
  for (let i = list.childNodes.length - 1; i >= 0; i--) {
    list.removeChild(list.childNodes[i]);
  }

  for (let i = 0; i < colors.length; i++) {
    let item = document.createElement("option");
    item.textContent = "This is a preview";
    item.setAttribute("id", "preview" + i);
    list.appendChild(item);
  }

  let ignore_black = document.getElementById("ignore_black").checked;

  for (let i = 0; i < colors.length; i++) {
    let rgb = colors[i].split(", ");
    rgb[0] = parseInt(rgb[0]);
    rgb[1] = parseInt(rgb[1]);
    rgb[2] = parseInt(rgb[2]);

    let sample = document.getElementById("preview" + i);
    let fgColorcode = rgb.join(",");

    if (ignore_black && (rgb[0] + rgb[1] + rgb[2] == 0)) {
      sample.style.color = "rgb(" + fgColorcode + ")";
    } else {
      let s_colorcode = CSSManager.calcBgColorBySaturation(rgb[0], rgb[1], rgb[2], lightness);
      if (fg == 0) {
        let rgb2 = CSSManager.adjustFgColor(rgb[0], rgb[1], rgb[2], lightness);
        fgColorcode = rgb2.join(",");
      } else if (fg == 1) {
        let rgb2 = CSSManager.calcFgColorByLuminance(s_colorcode[0], s_colorcode[1], s_colorcode[2]);
        fgColorcode = rgb2.join(",");
      } else if (fg == 2) {
        let rgb2 = CSSManager.calcFgColorByHue(rgb[0], rgb[1], rgb[2]);
        fgColorcode = rgb2.join(",");
      }

      sample.style.color = "rgb(" + fgColorcode + ")";
      sample.style.backgroundColor = "rgb(" + s_colorcode.join(",") + ")";
    }
  }
}

async function initCategoryEditor() {
  let catList = document.getElementById("categories");

  //clear category list
  for (let i = catList.childNodes.length - 1; i >= 0; i--) {
    catList.removeChild(catList.childNodes[i]);
  }

  for (let i = 0; i < categories.length; i++) {
    let cat = categories[i];
    let opt = document.createElement("option");
    opt.textContent = cat.name;
    opt.value = cat.key;
    catList.appendChild(opt);
  }

  //show empty category initially
  initCategoryEditorWorkSpace("empty");

  catList.addEventListener("change", (event) => {
    initCategoryEditorWorkSpace(event.target.value);
  });

  document.getElementById("catUp").addEventListener("click", () => {
    let moved = moveOptsInSelection(
      document.getElementById("categories"),
      true
    );
    if (moved) updateCategoryOrder();
  });

  document.getElementById("catDown").addEventListener("click", () => {
    let moved = moveOptsInSelection(
      document.getElementById("categories"),
      false
    );
    if (moved) updateCategoryOrder();
  });

  document.getElementById("catNew").addEventListener("click", () => {
    initCategoryEditorWorkSpace("empty");
    document.getElementById("categoryNameInput").value = "New Category";
    updateCategory(true);
  });

  document.getElementById("catDel").addEventListener("click", () => {
    let deleted = removeSelectedCategory();
    if (deleted) updateCategoryOrder();
  });

  document.getElementById("catUpdate").addEventListener("click", () => {
    if (document.getElementById("categories").selectedIndex > -1) {
      updateCategory(false);
    } else { //if no category is selected, add it
      updateCategory(true);
    }
  });

  document.getElementById("editSavedSearch").addEventListener("change", () => {
    initSavedSearchArea();
  });

  document.getElementById("queryInput").addEventListener("input", () => {
    updateSavedSearchCategory();
  });

  document.getElementById("queryCaseSense").addEventListener("change", () => {
    updateSavedSearchCategory();
  });

  document.getElementById("queryRegExp").addEventListener("change", () => {
    updateSavedSearchCategory();
  });

  document.getElementById("tagsAdd").addEventListener("click", () => {
    swapTagsBetweenCats(
      document.getElementById("out_cat"),
      document.getElementById("in_cat")
    );
  });

  document.getElementById("tagsRemove").addEventListener("click", () => {
    swapTagsBetweenCats(
      document.getElementById("in_cat"),
      document.getElementById("out_cat")
    );
  });

  document.getElementById("tagsUp").addEventListener("click", () => {
    moveOptsInSelection(
      document.getElementById("in_cat"),
      true
    );
  });

  document.getElementById("tagsDown").addEventListener("click", () => {
    moveOptsInSelection(
      document.getElementById("in_cat"),
      false
    );
  });

  document.getElementById("filterInCat").addEventListener("input", () => {
    filterTagsInCategory(
      document.getElementById("in_cat"),
      document.getElementById("filterInCat").value
    );
  });

  document.getElementById("filterOutCat").addEventListener("input", () => {
    filterTagsInCategory(
      document.getElementById("out_cat"),
      document.getElementById("filterOutCat").value
    );
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
  
  saveCategories();
}

function findCategory(key) {
  let ret = null;
  for (let i = 0; i < categories.length; i++) {
    let cat = categories[i];
    if (cat.key === key) {
      ret = cat;
      break;
    }
  }

  return ret;
}

function findTagInCategory(key, cat) {
  let found = null;
  for (let i = 0; i < cat.tags.length; i++) {
    if (cat.tags[i].key === key) {
      found = cat.tags[i];
      break;
    }
  }

  return found;
}

function initCategoryEditorWorkSpace(key) {
  let cat = findCategory(key);

  if (key === "all" || key === "recent") {
    document.getElementById("categoryArea").setAttribute("class", "indent box-hidden");
    document.getElementById("editorArea").setAttribute("class", "indent wrapper-cateditor box-hidden");
    document.getElementById("noteditable").setAttribute("class", "box-visible");
    document.getElementById("catDel").disabled = true;
    document.getElementById("editSavedSearch").checked = false;
    document.getElementById("savedSearchArea").setAttribute("class", "indent box-collapse");
  } else if (cat && !cat.isSearchCategory) { //normal category
    document.getElementById("categoryArea").setAttribute("class", "indent box-visible");
    document.getElementById("editorArea").setAttribute("class", "indent wrapper-cateditor box-visible");
    document.getElementById("noteditable").setAttribute("class", "box-collapse");
    document.getElementById("catDel").disabled = false;
    document.getElementById("editSavedSearch").checked = false;
    document.getElementById("editSavedSearch").disabled = false;
    document.getElementById("savedSearchArea").setAttribute("class", "indent box-collapse");
    document.getElementById("categoryNameInput").value = cat.name;

    let inCatBox = document.getElementById("in_cat");
    let outCatBox = document.getElementById("out_cat");

    clearTagList(inCatBox);
    clearTagList(outCatBox);

    fillTagList(inCatBox, cat.tags);

    for (let i = 0; i < tags.length; i++) {
      let tag = tags[i];
      if (!findTagInCategory(tag.key, cat)) {
        let opt = document.createElement("option");
        opt.value = tag.key;
        opt.textContent = tag.tag;
        opt.setAttribute("tagColor", tag.color);

        let color = calcTagFgColor(tag.color);
        opt.style.color = color;
        outCatBox.append(opt);
      }
    }
  } else if (key === "empty") { //new empty category
    document.getElementById("categoryArea").setAttribute("class", "indent box-visible");
    document.getElementById("editorArea").setAttribute("class", "indent wrapper-cateditor box-visible");
    document.getElementById("noteditable").setAttribute("class", "box-collapse");
    document.getElementById("catDel").disabled = false;

    document.getElementById("editSavedSearch").checked = false;
    document.getElementById("savedSearchArea").setAttribute("class", "indent box-collapse");

    let inCatBox = document.getElementById("in_cat");
    let outCatBox = document.getElementById("out_cat");
    clearTagList(inCatBox);
    clearTagList(outCatBox);

    //all tags are in "out_cat" box
    fillTagList(outCatBox, tags);
  } else if (cat && cat.isSearchCategory) { //saved search category
    document.getElementById("noteditable").setAttribute("class", "box-collapse");
    document.getElementById("catDel").disabled = false;
    document.getElementById("categoryArea").setAttribute("class", "indent box-visible");
    document.getElementById("categoryNameInput").value = cat.name;
    document.getElementById("editSavedSearch").checked = true;
    document.getElementById("queryInput").value = "";

    initSavedSearchArea();

    document.getElementById("queryInput").value = cat.query;
    document.getElementById("queryCaseSense").checked = cat.caseSense;
    document.getElementById("queryRegExp").checked = cat.regexp;
    updateSavedSearchCategory();
  }
}

function initSavedSearchArea() {
  let enable = document.getElementById("editSavedSearch").checked;
  let inCatBox = document.getElementById("in_cat");
  let outCatBox = document.getElementById("out_cat");
  let searchCatBox = document.getElementById("search_cat");

  document.getElementById("editSavedSearch").disabled = false;

  clearTagList(inCatBox);
  clearTagList(outCatBox);
  clearTagList(searchCatBox);

  if (enable) {
    document.getElementById("editorArea").setAttribute("class", "indent wrapper-cateditor box-hidden");
    document.getElementById("savedSearchArea").setAttribute("class", "indent box-visible");

    document.getElementById("queryInput").value = "";
    document.getElementById("queryCaseSense").checked = false;
    document.getElementById("queryRegExp").checked = false;

    fillTagList(searchCatBox, tags);
  } else {
    document.getElementById("editorArea").setAttribute("class", "indent wrapper-cateditor box-visible");
    document.getElementById("savedSearchArea").setAttribute("class", "indent box-collapse");

    document.getElementById("queryInput").value = "";
    document.getElementById("queryCaseSense").checked = false;
    document.getElementById("queryRegExp").checked = false;

    fillTagList(outCatBox, tags);
  }
}

function fillTagList(list, inTags) {
  for (let i = 0; i < inTags.length; i++) {
    let tag = inTags[i];
    let opt = document.createElement("option");
    opt.value = tag.key;
    opt.textContent = tag.tag;
    opt.setAttribute("tagColor", tag.color);

    let color = calcTagFgColor(tag.color);
    opt.style.color = color;
    list.append(opt);
  }
}

function calcTagFgColor(color) {
  let ret = color;
  let rgbStr = color.replace("#", "");
  let rgb = rgbStr.match(/../g);
  if (rgb) {
    let r = parseInt(rgb[0], 16);
    let g = parseInt(rgb[1], 16);
    let b = parseInt(rgb[2], 16);
    let fgColor = CSSManager.adjustFgColor(r, g, b, 1);
    ret = "rgb(" + fgColor.join(",") + ")";
  } else {
    ret = color;
  }

  return ret;
}

function clearTagList(list) {
  for (let i = list.childNodes.length - 1; i >= 0; i--) {
    list.removeChild(list.childNodes[i]);
  }
}

function swapTagsBetweenCats(fromList, toList) {
  let offset = toList.selectedIndex;
  if (offset == -1) {
    offset = toList.childNodes.length > 1 ? toList.childNodes.length : 0;
  }

  let orgOpts = fromList.selectedOptions;

  //copy to array. selectedOptions will change by the appendChild() and insertBefore()
  let opts = [];
  for (let i = 0; i < orgOpts.length; i++) {
    opts.push(orgOpts[i]);
  }
  for (var i = 0; i < opts.length; i++) {
    let opt = opts[i];
    let pos = offset + 1 + i;
    if (pos >= toList.childNodes.length) {
      toList.appendChild(opt);
    } else {
      let refChild = toList.childNodes[pos];
      toList.insertBefore(opt, refChild);
    }
  }

  fromList.selectedIndex = -1;
  toList.selectedIndex = -1;
}

function moveOptsInSelection(list, up) {
  if (list.selectedIndex == -1) return false;
  let orgOpts = list.selectedOptions;

  //copy to array. selectedOptions will change by the appendChild() and insertBefore()
  let opts = [];
  for (let i = 0; i < orgOpts.length; i++) {
    opts.push(orgOpts[i]);
  }

  let firstIndex = getIndexOfOption(list, opts[0]);
  let lastIndex = getIndexOfOption(list, opts[opts.length - 1]);
  if (up && firstIndex == 0) return false;
  if (!up && lastIndex == list.childNodes.length - 1) return false;

  if (up) {
    for (let i = 0; i < opts.length; i++) {
      let opt = opts[i];
      swapOptInSelection(list, up, opt);
    }
  } else {
    for (var i = opts.length - 1; i >= 0; i--) {
      let opt = opts[i];
      swapOptInSelection(list, up, opt);
    }
  }

  return true;
}

function swapOptInSelection(list, up, opt) {
  let refIndex = up ? getIndexOfOption(list, opt) - 1 : getIndexOfOption(list, opt) + 2;
  let refChild = list.childNodes[refIndex];
  if (refIndex >= list.childNodes.length) {
    list.appendChild(opt);
  } else {
    list.insertBefore(opt, refChild);
  }
}

function getIndexOfOption(list, opt) {
  let index = -1;
  for (let i = 0; i < list.length; i++) {
    if (list[i] === opt) {
      index = i;
      break;
    }
  }

  return index;
}

function updateSavedSearchCategory() {
  let caseSense = document.getElementById("queryCaseSense").checked;
  let regexp = document.getElementById("queryRegExp").checked;
  let query = document.getElementById("queryInput").value;

  let matchedTags = query ? searchTags(query, caseSense, regexp) : tags;
  let searchCatBox = document.getElementById("search_cat");
  clearTagList(searchCatBox);
  fillTagList(searchCatBox, matchedTags);
}

function filterTagsInCategory(list, query) {
  if (query) {
    let matchedTags = searchTags(query, false, false);
    for (let i = 0; i < list.childNodes.length; i++) {
      let opt = list.childNodes[i];
      opt.setAttribute("class", "box-collapse");
      for (let j = 0; j < matchedTags.length; j++) {
        let tag = matchedTags[j];
        if (opt.value === tag.key) {
          opt.setAttribute("class", "box-visible");
          break;
        }
      }
    }
  } else {
    for (let i = 0; i < list.childNodes.length; i++) {
      let opt = list.childNodes[i];
      opt.setAttribute("class", "box-visible");
    }
  }
}

function searchTags(query, caseSense, regexp) {
  let pattern = "";
  if (regexp) {
    pattern = caseSense ? new RegExp(query) : new RegExp(query, "i");
  } else {
    pattern = caseSense ? query : query.toLowerCase();
  }

  let ret = [];
  for (let i = 0; i < tags.length; i++) {
    let tag = tags[i];
    let matched = false;
    if (regexp) {
      matched = pattern.test(tag.tag);
    } else {
      let name = caseSense ? tag.tag : tag.tag.toLowerCase();
      matched = (name.indexOf(pattern) > -1);
    }

    if (matched) ret.push(tag);
  }

  return ret;
}

function removeSelectedCategory() {
  let catList = document.getElementById("categories");
  let index = catList.selectedIndex;
  let deleted = false;

  if (index > -1 && catList.options[index].value.indexOf("cat") === 0) {
    catList.remove(index);
    deleted = true;
  } else {
    deleted = false;
    console.log("Cannot delete system category.");
  }

  return deleted;
}

function updateCategory(add) {
  let catList = document.getElementById("categories");
  if (!add && catList.selectedIndex == -1) return;

  let name = document.getElementById("categoryNameInput").value;
  if (!name) return;

  let catTags = [];
  let savedSearch = document.getElementById("editSavedSearch").checked;
  let query = document.getElementById("queryInput").value;
  let caseSense = document.getElementById("queryCaseSense").checked;
  let regexp = document.getElementById("queryRegExp").checked;
  let inCat = document.getElementById("in_cat");

  if (!savedSearch) {
    for (let i = 0; i < inCat.options.length; i++) {
      let opt = inCat.options[i]
      let tag = {
        key: opt.value,
        tag: opt.textContent,
        color: opt.getAttribute("tagColor")
      };
      catTags.push(tag);
    }
    query = "";
    caseSense = false;
    regexp = false;
  }

  if (add) {
    let key = generateNewCatKey();
    let cat = {
      name: name,
      key: key,
      isSearchCategory: savedSearch,
      tags: catTags,
      query: query,
      caseSense: caseSense,
      regexp: regexp
    }
    categories.push(cat);
    let opt = document.createElement("option");
    opt.textContent = cat.name;
    opt.value = cat.key;
    catList.appendChild(opt);
    catList.selectedIndex = catList.options.length - 1;
  } else {
    let key = catList.value;
    let cat = findCategory(key);
    cat.name = name;
    cat.tags = catTags;
    cat.isSearchCategory = savedSearch;
    cat.query = query;
    cat.caseSense = caseSense;
    cat.regexp = regexp;
    catList.selectedOptions[0].textContent = name;
  }

  saveCategories();
}

function generateNewCatKey() {
  let key = "cat0";
  let i = 0;

  while (findCategory(key)) {
    key = "cat" + (i + 1);
  }

  return key;
}

function updateCategoryOrder() {
  let newOrder = [];
  let catList = document.getElementById("categories");

  for (let i = 0; i < catList.options.length; i++) {
    let key = catList.options[i].value;
    let cat = findCategory(key);
    if (cat) newOrder.push(cat);
  }

  categories = newOrder;

  saveCategories();
}

async function saveCategories() {
  let obj = {
    categories: categories
  };
  browser.storage.local.set(obj);

  let catList = document.getElementById("hdr_category");
  buildHdrCategoryList(catList.value);
}

function clearRecentHistory() {
  let recentCat = findCategory("recent");
  recentCat.tags = [];
  saveCategories();
}

function refreshCategoryCachedTags() {
  console.log("Refresh tag cache in categories manually.");

  //generate key=>tag map
  let tagMap = {};
  for (let i = 0; i < tags.length; i++) {
    let tag = tags[i];
    tagMap[tag.key] = tag;
  }

  for (let i = 0; i < categories.length; i++) {
    let cat = categories[i];
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
  
  let catList = document.getElementById("categories");
  initCategoryEditorWorkSpace(catList.value);
  
  console.log("Refreshed.");
  
  saveCategories();
}