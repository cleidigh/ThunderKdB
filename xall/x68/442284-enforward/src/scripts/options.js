var prefs = {};
var defaultPrefs = null;
var tagListsDone = false;
var idListsDone = false;

function init() {
  gENFPreferences.init();
  defaultPrefs = gENFPreferences.getDefaultPrefs();
  loadPrefs();
}

async function loadPrefs() {
  for (let key in defaultPrefs) {
    let elem = document.getElementById(key);
    if (!elem) continue; //load individually

    let result = await browser.storage.local.get(key);
    let val = result[key];
    if (val === undefined) { //new pref
      console.log(key + " is not defined");
      val = defaultPrefs[key];
      let obj = {};
      obj[key] = val;
      browser.storage.local.set(obj);
    }

    switch (elem.localName) {
      case "input":
        let type = elem.getAttribute("type");
        if (type === "checkbox") {
          elem.checked = val ? true : false;
        }
        if (type === "radio") {
          continue;
        } else if (type === "text") {
          elem.value = val ? val : "";
        } else if (type === "number") {
          elem.value = val;
        }
        break;
      case "select":
        elem.value = val;
        break;
      case "div":
        continue;
      case "textarea":
        elem.value = val;
        break;
      default:
        break;
    }

    elem.addEventListener("change", savePrefs);
  }

  //load rest prefs individually
  //radio prefs
  let index = await loadRadioIndexPref("default_service");
  if (index > -1) document.enf_form.default_service[index].checked = true;
  document.enf_form.default_service[0].addEventListener("change", savePrefs);
  document.enf_form.default_service[1].addEventListener("change", savePrefs);
  document.enf_form.default_service[2].addEventListener("change", savePrefs);

  index = await loadRadioIndexPref("forward_mode");
  if (index > -1) document.enf_form.forward_mode[index].checked = true;
  document.enf_form.forward_mode[0].addEventListener("change", savePrefs);
  document.enf_form.forward_mode[1].addEventListener("change", savePrefs);

  index = await loadRadioIndexPref("attachments_forward_mode");
  if (index > -1) document.enf_form.attachments_forward_mode[index].checked = true;
  document.enf_form.attachments_forward_mode[0].addEventListener("change", savePrefs);
  document.enf_form.attachments_forward_mode[1].addEventListener("change", savePrefs);
  //Ask me option is disabled in MX version
//  document.enf_form.attachments_forward_mode[2].addEventListener("change", savePrefs);
  document.enf_form.attachments_forward_mode[3].addEventListener("change", savePrefs);
  document.enf_form.attachments_forward_mode[4].addEventListener("change", savePrefs);

  index = await loadRadioIndexPref("onenote_attachments_forward_mode");
  if (index > -1) document.enf_form.onenote_attachments_forward_mode[index].checked = true;
  document.enf_form.onenote_attachments_forward_mode[0].addEventListener("change", savePrefs);
  document.enf_form.onenote_attachments_forward_mode[1].addEventListener("change", savePrefs);
  //Ask me option is disabled in MX version
//  document.enf_form.onenote_attachments_forward_mode[2].addEventListener("change", savePrefs);
  document.enf_form.onenote_attachments_forward_mode[3].addEventListener("change", savePrefs);
  document.enf_form.onenote_attachments_forward_mode[4].addEventListener("change", savePrefs);

  //tag prefs
  checkTagList("post_tags");
  checkTagList("post_tags_rm");
  checkTagList("onenote_post_tags");
  checkTagList("onenote_post_tags_rm");
  checkTagList("ignored_tags");

  fillLimitInfo();
}

async function loadRadioIndexPref(key) {
  let result = await browser.storage.local.get(key);
  let index = 0;
  if (isNaN(result[key])) {
    index = defaultPrefs[key];
    let obj = {};
    obj[key] = index;
    browser.storage.local.set(obj);
  } else {
    index = result[key];
  }

  return index;
}

async function savePrefs(event) {
//  let elem = event.target;
  let elem = event.currentTarget;  
  let key = elem.id;
  let obj = {};

  switch (elem.localName) {
    case "input":
      let type = elem.getAttribute("type");
      if (type === "checkbox") {
        obj[key] = elem.checked ? true : false;
      }
      if (type === "radio") {
        key = elem.getAttribute("name");
        let val = getRadioIndexValue(key);
        if (val >= 0) {
          obj[key] = val;
        } else { //unknown key
          obj = null;
        }
      } else if (type === "text") {
        obj[key] = elem.value ? elem.value : "";
      } else if (type === "number") {
        obj[key] = Number.isNaN(elem.value) ? 0 : parseInt(elem.value);
      }
      break;
    case "select":
      obj[key] = elem.value;
      break;
    case "div":
      obj[key] = getTagListValue(key);
      break;
    case "textarea":
      obj[key] = elem.value;
      break;
    default:
      break;
  }

  if (key === "account_type") fillLimitInfo();

  if (obj) browser.storage.local.set(obj);
}

function getRadioIndexValue(key) {
  let value = -1;
  switch (key) {
    case "default_service":
      value = Number.parseInt(document.enf_form.default_service.value);
      break;
    case "forward_mode":
      value = Number.parseInt(document.enf_form.forward_mode.value);
      break;
    case "attachments_forward_mode":
      value = Number.parseInt(document.enf_form.attachments_forward_mode.value);
      break;
    case "onenote_attachments_forward_mode":
      value = Number.parseInt(document.enf_form.onenote_attachments_forward_mode.value);      
      break;
    default:
      value = -1;
      break;
  }
  
  return value;
}

async function buildTagLists(tags) {
  tagListsDone = false;
  fillTagList("post_tags", tags);
  fillTagList("post_tags_rm", tags);
  fillTagList("onenote_post_tags", tags);
  fillTagList("onenote_post_tags_rm", tags);
  fillTagList("ignored_tags", tags);
  tagListsDone = true;
}

async function fillTagList(id, tags) {
  let list = document.getElementById(id);

  for (let i = 0; i < tags.length; i++) {
    let tag = tags[i];
    let check = document.createElement("input");
    let label = document.createElement("label");
    let br = document.createElement("br");
    let checkId = id + tag.key;
    check.setAttribute("type", "checkbox");
    check.setAttribute("key", tag.key);
    check.setAttribute("tag", tag.tag);
    check.setAttribute("id", checkId);
    label.textContent = tag.tag;
    label.setAttribute("for", checkId);
    if (tag.color) {
      label.setAttribute("style", "color:" + tag.color);
    }
    list.append(check);
    list.append(label);
    list.append(br);

//    check.addEventListener("change", savePrefs);
  }
  list.addEventListener("change", savePrefs);
}

async function checkTagList(key) {
  let result = await browser.storage.local.get(key);
  if (result[key] === undefined) {
    let obj = {};
    obj[key] = "";
    browser.storage.local.set(obj);
  } else if (result[key].length > 0) {
    let tags = result[key].split(" ");
    for (let i = 0; i < tags.length; i++) {
      document.getElementById(key + tags[i]).checked = true;
    }
  }
}

function getTagListValue(id) {
  let div = document.getElementById(id);
  let val = "";
  for (let i = 0; i < div.childNodes.length; i++) {
    let elem = div.childNodes[i];
    if ((elem.localName === "input") && (elem.getAttribute("type") === "checkbox") && (elem.checked)) {
      val += " " + elem.getAttribute("key");
    }
  }

  return val;
}

async function buildIdentityLists(ids) {
  idListsDone = false;
  await fillIdentityList("forward_id", ids);
  await fillIdentityList("onenote_forward_id", ids);
  idListsDone = true;
}

async function fillIdentityList(elemId, ids) {
  let list = document.getElementById(elemId);
  for (let key in ids) {
    let opt = document.createElement("option");
    opt.setAttribute("value", key);
    opt.textContent = ids[key];
    list.appendChild(opt);
  }

  list.selectedIndex = 0;
}

async function fillLimitInfo() {
  let accountType = document.getElementById("account_type").value;
  let maxSize = gENForwardUtils.getMaxSize(accountType);
  let maxSend = gENForwardUtils.getMaxSend(accountType);

  let result = await browser.storage.local.get("sent_times");
  let sent = result["sent_times"] ? result["sent_times"] : 0;
  document.getElementById("note_size_info").textContent = maxSize.toString();
  document.getElementById("sent_today_info").textContent = sent + "/" + maxSend;
}

browser.runtime.onMessage.addListener(async (message) => {
  switch (message.message) {
    case "SEND_TAGS":
      await buildTagLists(message.tags);
      if (tagListsDone && idListsDone) init();
      break;
    case "SEND_IDS":
      await buildIdentityLists(message.ids);
      if (tagListsDone && idListsDone) init();
      break;
    default:
      break;
  }
});

browser.runtime.sendMessage({
  message: "GET_TAGS",
});

browser.runtime.sendMessage({
  message: "GET_IDS",
});
