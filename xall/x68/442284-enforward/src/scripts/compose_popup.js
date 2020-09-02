async function init() {
  translate();
  document.getElementById("service").addEventListener("change", ()=>{switchService(false);});
  document.getElementById("append").addEventListener("change", appendSwitched);
  document.getElementById("okButton").addEventListener("click", updateCompFields);
  document.getElementById("cancelButton").addEventListener("click", cancel);
  document.getElementById("fillButton").addEventListener("click", ()=>{switchService(true);});

  let result = await browser.storage.local.get("onenote_service_name");
  if (result.onenote_service_name) {
    document.getElementById("onenote").textContent = result.onenote_service_name;
  } else {
    document.getElementById("onenote").textContent = "OneNote";
  }

  result = await browser.storage.local.get("default_service");
  let onenote = (result.default_service > 1);
  if (onenote) {
    document.getElementById("service").value = "onenote";
  } else {
    document.getElementById("service").value = "evernote";
  }
  switchService(false);
}
init();

function getNoteInfo(onenote) {
  browser.runtime.sendMessage({
    message: "GET_NOTEINFO_COMPOSE",
    onenote: onenote
  });
}

browser.runtime.onMessage.addListener(async (message) => {
  switch (message.message) {
    //From popup
    case "SEND_NOTEINFO_COMPOSE":
      fillFields(message.noteInfo[0]);
      break;
    default:
      break;
  }
});

function switchService(needNoteInfo) {
  let service = document.getElementById("service").value;
  let onenote = (service === "onenote");
  fillEmail(onenote);
  
  if (needNoteInfo) {
    getNoteInfo(onenote);  
  }
  
  document.getElementById("append").disabled = onenote;
  document.getElementById("notebook").disabled = onenote;
  document.getElementById("reminder").disabled = onenote;
  document.getElementById("notification").disabled = onenote;
  document.getElementById("tags").disabled = onenote;
}

function appendSwitched() {
  let service = document.getElementById("service").value;
  let disabled = (service === "onenote") || document.getElementById("append").checked;
  document.getElementById("notebook").disabled = disabled;
  document.getElementById("reminder").disabled = disabled;
  document.getElementById("notification").disabled = disabled;
  document.getElementById("tags").disabled = disabled;
}

async function fillEmail(onenote) {
  document.getElementById("service").value = onenote ? "onenote" : "evernote";
  let prefstr = onenote ? "onenote_email" : "email";
  let result = await browser.storage.local.get(prefstr);
  document.getElementById("email").value = result[prefstr];  
}

async function fillFields(noteInfo) {
  document.getElementById("title").value = noteInfo.title;
  document.getElementById("append").checked = false;
  document.getElementById("notebook").value = noteInfo.notebook;
  document.getElementById("reminder").checked = noteInfo.reminder;
  document.getElementById("notification").value = noteInfo.reminderDate;
  document.getElementById("tags").value = noteInfo.tags;
}

async function updateCompFields() {
  let tabs = await browser.tabs.query({
    active: true,
    currentWindow: true
  });
  let tabId = tabs[0].id;

  let service = document.getElementById("service").value;
  let email = document.getElementById("email").value;
  let title = document.getElementById("title").value;
  let append = document.getElementById("append").checked;
  let notebook = document.getElementById("notebook").value;
  let reminder = document.getElementById("reminder").checked;
  let notification = document.getElementById("notification").value;
  let tags = document.getElementById("tags").value;
  let tagsSubject = "";
  if (tags) {
    let tagsArray = tags.split(/\s*,\s*/);
    for (let i = 0; i < tagsArray.length; i++) {
      tagsSubject = tagsSubject + " #" + tagsArray[i];
    }
  }

  let subject = title;
  if (service === "evernote") {
    if (append) {
      subject = subject + " +";
    } else {
      if (reminder) subject = subject + " !";
      if (reminder && notification) subject = subject + notification;
      if (notebook) subject = subject + " @" + notebook;
      if (tagsSubject) subject = subject + tagsSubject;
    }
  }

  let newDetails = {};
  newDetails.subject = subject
  newDetails.to = email;
  await browser.compose.setComposeDetails(tabId, newDetails);

  //close popup automatically
  window.close();
}

function cancel() {
  //close popup automatically
  window.close();
}
