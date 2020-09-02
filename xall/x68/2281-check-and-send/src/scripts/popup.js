var prefs = [];
var warnings = [];

function init() {
  document.casalert.okbutton.addEventListener("click", (event) => {
    sendResult(true);
  });
  document.casalert.ngbutton.addEventListener("click", (event) => {
    sendResult(false);
  });
  translate();
  requestWarnings();
}

async function requestWarnings() {
  let tabs = await browser.tabs.query({
    active: true,
    currentWindow: true
  });
  let tabId = tabs[0].id;
  browser.runtime.sendMessage({
    message: "GET_WARNINGS",
    tabId: tabId
  });
}

async function sendResult(confirmed) {
  applyUserChanges();
  let tabs = await browser.tabs.query({
    active: true,
    currentWindow: true
  });
  let tabId = tabs[0].id;
  await browser.runtime.sendMessage({
    message: "USER_CHECKED",
    tabId: tabId,
    confirmed: confirmed,
    warnings: warnings
  });

  //close popup automatically
  window.close();
}

function applyUserChanges() {
  //Recipient name correction
  for (let i = 0; i < warnings.correctNameTo.length; i++) {
    let checkbox = document.getElementById("recNameTo" + i);
    warnings.correctNameTo[i].correct = checkbox.checked;
  }

  for (let i = 0; i < warnings.correctNameCc.length; i++) {
    let checkbox = document.getElementById("recNameCc" + i);
    warnings.correctNameCc[i].correct = checkbox.checked;
  }

  for (let i = 0; i < warnings.correctNameReplyTo.length; i++) {
    let checkbox = document.getElementById("recNameReplyTo" + i);
    warnings.correctNameReplyTo[i].correct = checkbox.checked;
  }

  //Duplicated recipients
  for (let key in warnings.dupTo) {
    let checkbox = document.getElementById("dupTo" + key);
    warnings.dupTo[key].merge = checkbox.checked;
  }

  for (let key in warnings.dupCc) {
    let checkbox = document.getElementById("dupCc" + key);
    warnings.dupCc[key].merge = checkbox.checked;
  }

  for (let key in warnings.dupBcc) {
    let checkbox = document.getElementById("dupBcc" + key);
    warnings.dupBcc[key].merge = checkbox.checked;
  }

  for (let key in warnings.dupReplyTo) {
    let checkbox = document.getElementById("dupReplyTo" + key);
    warnings.dupReplyTo[key].merge = checkbox.checked;
  }

  //Address check
  for (let i = 0; i < warnings.addrCheckTo.length; i++) {
    let checkbox = document.getElementById("addrCheckTo" + i);
    warnings.addrCheckTo[i].send = checkbox.checked;
  }

  for (let i = 0; i < warnings.addrCheckCc.length; i++) {
    let checkbox = document.getElementById("addrCheckCc" + i);
    warnings.addrCheckCc[i].send = checkbox.checked;
  }

  for (let i = 0; i < warnings.addrCheckBcc.length; i++) {
    let checkbox = document.getElementById("addrCheckBcc" + i);
    warnings.addrCheckBcc[i].send = checkbox.checked;
  }

  for (let i = 0; i < warnings.addrCheckReplyTo.length; i++) {
    let checkbox = document.getElementById("addrCheckReplyTo" + i);
    warnings.addrCheckReplyTo[i].send = checkbox.checked;
  }
}

browser.runtime.onMessage.addListener(async (message) => {
  switch (message.message) {
    case "SEND_WARNINGS":
      warnings = message.warnings;
      if (Object.keys(warnings).length > 0) {
        updateWarnings(message.session);
      } else {
        //no error and popup is not needed
        let tabs = await browser.tabs.query({
          active: true,
          currentWindow: true
        });
        let tabId = tabs[0].id;
        await browser.runtime.sendMessage({
          message: "USER_CHECKED",
          tabId: tabId,
          confirmed: true,
          warnings: []
        });

        //close popup automatically
        window.close();
      }
      break;
    default:
      break;
  }
});

function updateWarnings(inSession) {
  document.getElementById("checkingMessage").setAttribute("class", "box-collapse");
  document.getElementById("warningArea").setAttribute("class", "box-visible");

  let errOccurred = false;

  errOccurred = updateRecTypeWarnings() || errOccurred;
  errOccurred = updateDupRecWarnings() || errOccurred;
  errOccurred = updateAddrCheckWarnings() || errOccurred;
  if (errOccurred) {
    document.getElementById("recArea").setAttribute("class", "box-visible");
  } else {
    document.getElementById("recArea").setAttribute("class", "box-collapse");
  }

  errOccurred = updateIdentityWarnings() || errOccurred;
  errOccurred = updateAttachWarnings() || errOccurred;
  errOccurred = updateWordsWarnings() || errOccurred;
  errOccurred = updateRecNameWarnings() || errOccurred;

  errOccurred = updateDayDateWarnings() || errOccurred;


  if (errOccurred) {
    document.getElementById("noError").setAttribute("class", "box-collapse");
  } else {
    document.getElementById("noError").setAttribute("class", "box-visible");
  }

  if (inSession) {
    document.getElementById("submitArea").setAttribute("class", "box-visible");
  } else {
    document.getElementById("submitArea").setAttribute("class", "box-collapse");
  }
}

function updateIdentityWarnings() {
  let errCnt = 0;
  if (warnings.identity) {
    document.getElementById("identityArea").setAttribute("class", "box-visible");
    document.getElementById("identityName").textContent = warnings.identity;
    errCnt = 1;
  } else {
    document.getElementById("identityArea").setAttribute("class", "box-collapse");
  }

  return errCnt;
}

function updateAttachWarnings() {
  let errOccurred = false;
  let attachSize = document.getElementById("attachSize");
  let attachSizeLi = document.getElementById("attachSizeLi");
  if (warnings.attachSize > 0) {
    attachSizeLi.setAttribute("class", "dia_list box-visible");
    attachSize.textContent = attachSize.textContent.replace("%", warnings.attachSize);
    errOccurred = true;
  } else {
    attachSizeLi.setAttribute("class", "dia_list box-collapse");
  }

  let attachList = document.getElementById("attachlist");
  let attachListLi = document.getElementById("attachListLi");
  let attachments = warnings.attachExts;
  for (let i = 0; i < attachments.length; i++) {
    addItemToBox(attachList, attachments[i]);
  }
  if (attachments.length > 0) {
    attachListLi.setAttribute("class", "dia_list box-visible");
    errOccurred = true;
  } else {
    attachListLi.setAttribute("class", "dia_list box-collapse");
  }

  if (errOccurred) {
    document.getElementById("attachArea").setAttribute("class", "box-visible");
  } else {
    document.getElementById("attachArea").setAttribute("class", "box-collapse");
  }

  return errOccurred;
}

function updateWordsWarnings() {
  let errOccurred = false;
  if (Object.keys(warnings.ngWordsSubject).length > 0 || warnings.mustWordsSubject.length > 0) {
    errOccurred = true;
    document.getElementById("kwSubjectArea").setAttribute("class", "box-visible");

    if (Object.keys(warnings.ngWordsSubject).length > 0) {
      let box = document.getElementById("ngWordsSubject");
      for (let key in warnings.ngWordsSubject) {
        addItemToBox(box, key + " (" + warnings.ngWordsSubject[key] + ")");
      }
      document.getElementById("ngWordsSubjectLi").setAttribute("class", "dia_list box-visible");
    } else {
      document.getElementById("ngWordsSubjectLi").setAttribute("class", "dia_list box-collapse");
    }

    if (warnings.mustWordsSubject.length > 0) {
      let box = document.getElementById("mustWordsSubject");
      for (let i = 0; i < warnings.mustWordsSubject.length; i++) {
        addItemToBox(box, warnings.mustWordsSubject[i]);
      }
      document.getElementById("mustWordsSubjectLi").setAttribute("class", "dia_list box-visible");
    } else {
      document.getElementById("mustWordsSubjectLi").setAttribute("class", "dia_list box-collapse");
    }
  } else {
    document.getElementById("kwSubjectArea").setAttribute("class", "box-collapse");
  }

  if (Object.keys(warnings.ngWordsBody).length > 0 || warnings.mustWordsBody.length > 0) {
    errOccurred = true;
    document.getElementById("kwBodyArea").setAttribute("class", "box-visible");

    if (Object.keys(warnings.ngWordsBody).length > 0) {
      let box = document.getElementById("ngWordsBody");
      for (let key in warnings.ngWordsBody) {
        addItemToBox(box, key + " (" + warnings.ngWordsBody[key] + ")");
      }
      document.getElementById("ngWordsBodyLi").setAttribute("class", "dia_list box-visible");
    } else {
      document.getElementById("ngWordsBodyLi").setAttribute("class", "dia_list box-collapse");
    }

    if (warnings.mustWordsBody.length > 0) {
      let box = document.getElementById("mustWordsBody");
      for (let i = 0; i < warnings.mustWordsBody.length; i++) {
        addItemToBox(box, warnings.mustWordsBody[i]);
      }
      document.getElementById("mustWordsBodyLi").setAttribute("class", "dia_list box-visible");
    } else {
      document.getElementById("mustWordsBodyLi").setAttribute("class", "dia_list box-collapse");
    }
  } else {
    document.getElementById("kwBodyArea").setAttribute("class", "box-collapse");
  }

  if (errOccurred) {
    document.getElementById("keywordsArea").setAttribute("class", "box-visible");
  } else {
    document.getElementById("keywordsArea").setAttribute("class", "box-collapse");
  }

  return errOccurred;
}

function addItemToBox(box, str) {
  let span = document.createElement("span");
  span.textContent = str;
  box.appendChild(span);
  box.appendChild(document.createElement("br"));
}

function updateRecNameWarnings() {
  let errOccurred = false;
  if (warnings.correctNameTo.length > 0) {
    document.getElementById("toRecNameLi").setAttribute("class", "dia_list box-visible");
    errOccurred = true;
    let tbody = document.getElementById("toRecName");
    for (let i = 0; i < warnings.correctNameTo.length; i++) {
      let warn = warnings.correctNameTo[i];
      addAddrTableRow(tbody, warn.oldName, warn.newName, "recNameTo" + i, "checkRecNameTo", i, warn.correct);
    }
  } else {
    document.getElementById("toRecNameLi").setAttribute("class", "dia_list box-collapse");
  }

  if (warnings.correctNameCc.length > 0) {
    document.getElementById("ccRecNameLi").setAttribute("class", "dia_list box-visible");
    errOccurred = true;
    let tbody = document.getElementById("ccRecName");
    for (let i = 0; i < warnings.correctNameCc.length; i++) {
      let warn = warnings.correctNameCc[i];
      addAddrTableRow(tbody, warn.oldName, warn.newName, "recNameCc" + i, "checkRecNameCc", i, warn.correct);
    }
  } else {
    document.getElementById("ccRecNameLi").setAttribute("class", "dia_list box-collapse");
  }

  if (warnings.correctNameReplyTo.length > 0) {
    document.getElementById("replyToRecNameLi").setAttribute("class", "dia_list box-visible");
    errOccurred = true;
    let tbody = document.getElementById("replyToRecName");
    for (let i = 0; i < warnings.correctNameReplyTo.length; i++) {
      let warn = warnings.correctNameReplyTo[i];
      addAddrTableRow(tbody, warn.oldName, warn.newName, "recNameReplyTo" + i, "checkRecNameReplyTo", i, warn.correct);
    }
  } else {
    document.getElementById("replyToRecNameLi").setAttribute("class", "dia_list box-collapse");
  }

  if (!warnings.suppressCorrectNameWarn && errOccurred) {
    document.getElementById("recNameArea").setAttribute("class", "box-visible");
  } else {
    errOccurred = false;
    document.getElementById("recNameArea").setAttribute("class", "box-collapse");
  }

  return errOccurred;
}

function addAddrTableRow(tbody, str1, str2, id, name, value, checked) {
  let tr = document.createElement("tr");
  let td = document.createElement("td");
  let check = document.createElement("input");
  check.setAttribute("type", "checkbox");
  check.setAttribute("id", id);
  check.setAttribute("name", name);
  check.setAttribute("value", value);
  check.checked = checked;
  td.appendChild(check);
  td.setAttribute("class", "wfix");
  tr.appendChild(td);

  td = document.createElement("td");
  td.textContent = str1;
  tr.appendChild(td);

  if (str2) {
    td = document.createElement("td");
    td.innerHTML = "&rArr;";
    td.setAttribute("class", "wfix");
    tr.appendChild(td);
    td = document.createElement("td");
    td.textContent = str2;
    tr.appendChild(td);
  }

  tbody.appendChild(tr);
}

function updateRecTypeWarnings() {
  let errOccurred = false;
  if (warnings.emptyTo) {
    document.getElementById("recEmptyToLi").setAttribute("class", "dia_list box-visible");
    errOccurred = true;
  } else {
    document.getElementById("recEmptyToLi").setAttribute("class", "dia_list box-collapse");
  }

  if (warnings.emptyCc) {
    document.getElementById("recEmptyCcLi").setAttribute("class", "dia_list box-visible");
    errOccurred = true;
  } else {
    document.getElementById("recEmptyCcLi").setAttribute("class", "dia_list box-collapse");
  }

  if (warnings.emptyBcc) {
    document.getElementById("recEmptyBccLi").setAttribute("class", "dia_list box-visible");
    errOccurred = true;
  } else {
    document.getElementById("recEmptyBccLi").setAttribute("class", "dia_list box-collapse");
  }

  if (warnings.tooManyToCc) {
    document.getElementById("recTooManyToCcLi").setAttribute("class", "dia_list box-visible");
    errOccurred = true;
  } else {
    document.getElementById("recTooManyToCcLi").setAttribute("class", "dia_list box-collapse");
  }

  if (warnings.emptyReplyTo) {
    document.getElementById("recEmptyReplyToLi").setAttribute("class", "dia_list box-visible");
    errOccurred = true;
  } else {
    document.getElementById("recEmptyReplyToLi").setAttribute("class", "dia_list box-collapse");
  }

  return errOccurred;
}

function updateDupRecWarnings() {
  let errOccurred = false;

  if (Object.keys(warnings.dupTo).length > 0) {
    errOccurred = true;
    if (!warnings.suppressDupAddrWarn) {
      document.getElementById("dupToLi").setAttribute("class", "dia_list box-visible");
    } else {
      document.getElementById("dupToLi").setAttribute("class", "dia_list box-collapse");
    }
    let box = document.getElementById("dupTo");
    for (let key in warnings.dupTo) {
      addCheckItemToBox(box,
        key + " (" + warnings.dupTo[key].indexes.length + ")",
        "dupTo" + key,
        "checkDupTo",
        key,
        warnings.dupTo[key].merge
      );
    }
  } else {
    document.getElementById("dupToLi").setAttribute("class", "dia_list box-collapse");
  }

  if (Object.keys(warnings.dupCc).length > 0) {
    errOccurred = true;
    if (!warnings.suppressDupAddrWarn) {
      document.getElementById("dupCcLi").setAttribute("class", "dia_list box-visible");
    } else {
      document.getElementById("dupCcLi").setAttribute("class", "dia_list box-collapse");
    }

    let box = document.getElementById("dupCc");
    for (let key in warnings.dupCc) {
      addCheckItemToBox(box,
        key + " (" + warnings.dupCc[key].indexes.length + ")",
        "dupCc" + key,
        "checkDupCc",
        key,
        warnings.dupCc[key].merge
      );
    }
  } else {
    document.getElementById("dupCcLi").setAttribute("class", "dia_list box-collapse");
  }

  if (Object.keys(warnings.dupBcc).length > 0) {
    errOccurred = true;
    if (!warnings.suppressDupAddrWarn) {
      document.getElementById("dupBccLi").setAttribute("class", "dia_list box-visible");
    } else {
      document.getElementById("dupBccLi").setAttribute("class", "dia_list box-collapse");
    }

    let box = document.getElementById("dupBcc");
    for (let key in warnings.dupBcc) {
      addCheckItemToBox(box,
        key + " (" + warnings.dupBcc[key].indexes.length + ")",
        "dupBcc" + key,
        "checkDupBcc",
        key,
        warnings.dupBcc[key].merge
      );
    }
  } else {
    document.getElementById("dupBccLi").setAttribute("class", "dia_list box-collapse");
  }

  if (Object.keys(warnings.dupReplyTo).length > 0) {
    errOccurred = true;
    if (!warnings.suppressDupAddrWarn) {
      document.getElementById("dupReplyToLi").setAttribute("class", "dia_list box-visible");
    } else {
      document.getElementById("dupReplyToLi").setAttribute("class", "dia_list box-collapse");
    }

    let box = document.getElementById("dupReplyTo");
    for (let key in warnings.dupReplyTo) {
      addCheckItemToBox(box,
        key + " (" + warnings.dupReplyTo[key].indexes.length + ")",
        "dupReplyTo" + key,
        "checkDupReplyTo",
        key,
        warnings.dupReplyTo[key].merge
      );
    }
  } else {
    document.getElementById("dupReplyToLi").setAttribute("class", "dia_list box-collapse");
  }

  return errOccurred;
}

function updateAddrCheckWarnings() {
  let errOccurred = false;

  let warn = warnings.addrCheckTo;
  if (warn.length > 0) {
    errOccurred = true;
    document.getElementById("addrCheckToLi").setAttribute("class", "dia_list box-visible");
    let box = document.getElementById("addrCheckTo");
    for (let i = 0; i < warn.length; i++) {
      addCheckItemToBox(box,
        warn[i].address,
        "addrCheckTo" + i,
        "checkAddrCheckTo",
        i,
        warn[i].send
      );
    }
  } else {
    document.getElementById("addrCheckToLi").setAttribute("class", "dia_list box-collapse");
  }

  warn = warnings.addrCheckCc;
  if (warn.length > 0) {
    errOccurred = true;
    document.getElementById("addrCheckCcLi").setAttribute("class", "dia_list box-visible");
    let box = document.getElementById("addrCheckCc");
    for (let i = 0; i < warn.length; i++) {
      addCheckItemToBox(box,
        warn[i].address,
        "addrCheckCc" + i,
        "checkAddrCheckCc",
        i,
        warn[i].send
      );
    }
  } else {
    document.getElementById("addrCheckCcLi").setAttribute("class", "dia_list box-collapse");
  }

  warn = warnings.addrCheckBcc;
  if (warn.length > 0) {
    errOccurred = true;
    document.getElementById("addrCheckBccLi").setAttribute("class", "dia_list box-visible");
    let box = document.getElementById("addrCheckBcc");
    for (let i = 0; i < warn.length; i++) {
      addCheckItemToBox(box,
        warn[i].address,
        "addrCheckBcc" + i,
        "checkAddrCheckBcc",
        i,
        warn[i].send
      );
    }
  } else {
    document.getElementById("addrCheckBccLi").setAttribute("class", "dia_list box-collapse");
  }

  warn = warnings.addrCheckReplyTo;
  if (warn.length > 0) {
    errOccurred = true;
    document.getElementById("addrCheckReplyToLi").setAttribute("class", "dia_list box-visible");
    let box = document.getElementById("addrCheckReplyTo");
    for (let i = 0; i < warn.length; i++) {
      addCheckItemToBox(box,
        warn[i].address,
        "addrCheckReplyTo" + i,
        "checkAddrCheckReplyTo",
        i,
        warn[i].send
      );
    }
  } else {
    document.getElementById("addrCheckReplyToLi").setAttribute("class", "dia_list box-collapse");
  }

  return errOccurred;
}

function addCheckItemToBox(box, str, id, name, value, checked) {
  addAddrTableRow(box, str, null, id, name, value, checked);
}

function updateDayDateWarnings() {
  let errOccurred = false;

  let warn = warnings.wrongDay;
  if (Object.keys(warn).length > 0) {
    errOccurred = true;
    document.getElementById("wrongDayLi").setAttribute("class", "dia_list box-visible");
    let tbody = document.getElementById("wrongDay");
    for (let key in warn) {
      addDayDateTableRow(tbody, warn[key].date, warn[key].correctDay, warn[key].localeDate, "&rArr;", true);
    }
  } else {
    document.getElementById("wrongDayLi").setAttribute("class", "dia_list box-collapse");
  }

  warn = warnings.noteDay;
  if (Object.keys(warn).length > 0) {
    errOccurred = true;
    document.getElementById("noteDayLi").setAttribute("class", "dia_list box-visible");
    let tbody = document.getElementById("noteDay");
    for (let key in warn) {
      addDayDateTableRow(tbody, warn[key].date, warn[key].noteDay, warn[key].localeDate, "=", false);
    }
  } else {
    document.getElementById("noteDayLi").setAttribute("class", "dia_list box-collapse");
  }

  warn = warnings.invalidDate;
  if (Object.keys(warn).length > 0) {
    errOccurred = true;
    document.getElementById("invalidDateLi").setAttribute("class", "dia_list box-visible");
    let tbody = document.getElementById("invalidDate");
    for (let key in warn) {
      addDayDateTableRow(tbody, warn[key].date, null, warn[key].correctDate, "&rArr;", true);
    }
  } else {
    document.getElementById("invalidDateLi").setAttribute("class", "dia_list box-collapse");
  }

  if (errOccurred) {
    document.getElementById("dayDateArea").setAttribute("class", "box-visible");
  } else {
    document.getElementById("dayDateArea").setAttribute("class", "box-collapse");
  }

  return errOccurred;
}

function addDayDateTableRow(tbody, date, dayNum, localeDate, arr, candidate) {
  let tr = document.createElement("tr");
  let td = document.createElement("td");
  td.textContent = date;
  tr.appendChild(td);

  td = document.createElement("td");
  td.innerHTML = arr;
  td.setAttribute("class", "wfix");
  tr.appendChild(td);

  let dayStr = dayNum === null ? localeDate : getFullDayString(dayNum) + " (" + localeDate + ")";
  if (candidate) dayStr += " ?";
  td = document.createElement("td");
  td.textContent = dayStr;
  tr.appendChild(td);
  tbody.appendChild(tr);
}

init();
