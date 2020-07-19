var forbidEvent = false;

function initTagList(tags) {
  let form = document.getElementById("taglist");
  let allChecked = true;

  let noMsgLabel = document.getElementById("nomsg");
  let mainArea = document.getElementById("tagsArea");
  
  if (tags.length < 1) { //no message is selected
    nomsg.hidden = false;
    mainArea.hidden = true;
    allChecked = false;
  } else {
    nomsg.hidden = true;
    mainArea.hidden = false;

    for (let i = 0; i < tags.length; i++) {
      let check = document.createElement("input");
      check.setAttribute("type", "checkbox");
      check.checked = tags[i].attach;
      check.id = "check_" + tags[i].key;
      check.value = tags[i].key;
      check.name = "tag_check";
      check.addEventListener("change", addTags);

      let label = document.createElement("lable");
      let accesskey = i < 9 ? "(" + (i + 1) + ")" : "";
      label.textContent = tags[i].tag + accesskey;
      
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
      form.appendChild(div);

      allChecked = allChecked && tags[i].attach;
    }

    let searchbox = document.taglist.search;
    searchbox.addEventListener("input", searchTags);

    let selall = document.taglist.selall;
    selall.checked = allChecked;
    selall.addEventListener("change", selectAll);
  }
}

async function init() {
  let tags = await listTags();
  await CSSManager.init(null, null, []);
  translate();
  initTagList(tags);
}

async function listTags() {
  let ret = [];
  let tags = await browser.messages.listTags();

  let messages = await getCurrentMessages();

  if (messages.length > 0) {
    for (let i = 0; i < tags.length; i++) {
      ret.push({
        key: tags[i].key,
        tag: tags[i].tag,
        color: tags[i].color,
        attach: (messages[0].tags.indexOf(tags[i].key) != -1)
      });
    }
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
    let tagCheck = document.taglist.tag_check;
    let newTags = [];
    for (let i = 0; i < tagCheck.length; i++) {
      if (tagCheck[i].checked) {
        newTags.push(tagCheck[i].value);
      }
    }

    let messages = await getCurrentMessages();
    for (let i = 0; i < messages.length; i++) {
      await browser.messages.update(messages[i].id, {
        tags: newTags
      });
    }
    browser.runtime.sendMessage({
      message: "TAGS_CHANGED",
      tags: newTags
    });
  }
}

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

init();
