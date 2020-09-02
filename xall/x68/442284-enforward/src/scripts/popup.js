var noteInfo = null;
var serviceName = "Evernote";

async function init() {
  document.getElementById("fwdButton").addEventListener("click", (event) => {
    sendResult(true);
  });
  document.getElementById("cancelButton").addEventListener("click", (event) => {
    sendResult(false);
  });

  document.getElementById("yesCancelButton").addEventListener("click", (event) => {
    sendCancel(true);
  });
  document.getElementById("noCancelButton").addEventListener("click", (event) => {
    sendCancel(false);
  });

  browser.runtime.onMessage.addListener(async (message) => {
    switch (message.message) {
      case "SEND_NOTEINFO":
        serviceName = message.serviceName;
        if (message.progress === 2) {
          noteInfo = message.noteInfo;
          fillNoteTable();
        } else if (message.progress === 3) {
          showCancelForm();
        }
        break;
      default:
        break;
    }
  });

  browser.runtime.sendMessage({
    message: "START_FORWARDING"
  });
  
  await translate();
}

init();

function showCancelForm() {
  let caption = document.getElementById("serviceName");
  caption.textContent = caption.textContent.replace("%s", serviceName);
//  document.getElementById("serviceName").textContent = "Forward to " + serviceName;
  document.getElementById("confArea").setAttribute("class", "box-none");
  document.getElementById("cancelArea").setAttribute("class", "box-visible");
}

async function fillNoteTable() {
  let tbody = null;
  if (noteInfo[0].onenote) {
    document.getElementById("entable").setAttribute("class", "box-none");
    document.getElementById("ontable").setAttribute("class", "box-visible");
    tbody = document.getElementById("noteTableOn");
  } else {
    document.getElementById("ontable").setAttribute("class", "box-none");
    document.getElementById("entable").setAttribute("class", "box-visible");
    tbody = document.getElementById("noteTable");
  }
  
  let caption = document.getElementById("serviceName");
  caption.textContent = caption.textContent.replace("%s", serviceName);

//  document.getElementById("serviceName").textContent = "Forward to " + serviceName;

  for (let i = 0; i < noteInfo.length; i++) {
    let info = noteInfo[i];
    let tr = createNoteRow(info, i);
    tbody.appendChild(tr);
  }
}

function createNoteRow(info, num) {
  let tr = document.createElement("tr");

  //Fwd
  let td = document.createElement("td");
  let elem = document.createElement("input");
  elem.setAttribute("type", "checkbox");
  elem.checked = !info.canceled;
  elem.setAttribute("id", "fwd" + num);
  td.appendChild(elem);
  tr.appendChild(td);

  //Title
  td = document.createElement("td");
  elem = document.createElement("input");
  elem.setAttribute("type", "text");
  if (info.onenote) {
    elem.setAttribute("size", "100");
  }
  elem.setAttribute("value", info.title);
  elem.setAttribute("id", "title" + num);
  td.appendChild(elem);
  tr.appendChild(td);

  if (!info.onenote) {
    //Append
    td = document.createElement("td");
    elem = document.createElement("input");
    elem.setAttribute("type", "checkbox");
    elem.checked = info.append;
    elem.setAttribute("id", "append" + num);
    td.appendChild(elem);
    tr.appendChild(td);

    //Notebook
    td = document.createElement("td");
    elem = document.createElement("input");
    elem.setAttribute("type", "text");
    elem.setAttribute("size", "15");
    elem.setAttribute("value", info.notebook);
    elem.setAttribute("id", "notebook" + num);
    td.appendChild(elem);
    tr.appendChild(td);

    //Reminder
    td = document.createElement("td");
    elem = document.createElement("input");
    elem.setAttribute("type", "checkbox");
    elem.checked = info.reminder;
    elem.setAttribute("id", "reminder" + num);
    td.appendChild(elem);
    tr.appendChild(td);

    //Notification (Reminder date)
    td = document.createElement("td");
    elem = document.createElement("input");
    elem.setAttribute("type", "text");
    elem.setAttribute("value", info.reminderDate);
    elem.setAttribute("size", "10");
    elem.setAttribute("placeholder", "yyyy/mm/dd");
    elem.setAttribute("id", "reminderdate" + num);
    td.appendChild(elem);
    tr.appendChild(td);

    //Tags
    td = document.createElement("td");
    elem = document.createElement("input");
    elem.setAttribute("type", "text");
    elem.setAttribute("value", info.tags.join(", "));
    elem.setAttribute("placeholder", "Tag1, Tag2, ...");
    elem.setAttribute("id", "tags" + num);
    td.appendChild(elem);
    tr.appendChild(td);
  }

  return tr;
}

function applyUserChanges(confirmed) {
  let sendNum = 0;
  if (noteInfo) {
    for (let i = 0; i < noteInfo.length; i++) {
      let info = noteInfo[i];
      let elem = document.getElementById("fwd" + i);
      info.canceled = confirmed ? !elem.checked : true;
      elem = document.getElementById("title" + i);
      info.title = elem.value;
      if (!info.onenote) {
        elem = document.getElementById("append" + i);
        info.append = elem.checked;
        elem = document.getElementById("notebook" + i);
        info.notebook = elem.value;
        elem = document.getElementById("reminder" + i);
        info.reminder = elem.checked;
        elem = document.getElementById("reminderdate" + i);
        info.reminderDate = elem.value;
        elem = document.getElementById("tags" + i);
        info.tags = elem.value ? elem.value.split(/\s*,\s*/) : [];
      }

      if (!info.canceled) {
        sendNum++;
      }
    }
  }

  return sendNum;
}

async function sendResult(confirmed) {
  let sendNum = applyUserChanges(confirmed);

  await browser.runtime.sendMessage({
    message: "USER_CHECKED",
    confirmed: confirmed,
    noteInfo: noteInfo,
    sendNum: sendNum
  });

  //close popup automatically
  window.close();
}

async function sendCancel(canceled) {
  if (canceled) {
    await browser.runtime.sendMessage({
      message: "USER_CANCELED"
    });
  }

  //close popup automatically
  window.close();
}
