var prefs = null;
var cas_modes = []; //key = identity, value = mode string
var warnings = {};
var promiseMap = new Map();

var default_prefs = {
  //Identity
  showIdentity: false,
  //Attachments
  attachExtCheckEnable: false,
  attachExts: [],
  attachSizeLimit: 0,
  attachBlacklistCheck: true,
  //Words
  wordNGCheckEnable: false,
  ngWords: [],
  wordMustCheckEnable: false,
  mustWords: [],
  wordIsRegExp: false,
  wordCaseSense: false,
  wordIgnoreQuote: true,
  wordCheckBody: true,
  wordCheckSubject: false,
  //Recipient names
  recNameMode: 2, //0: correct, 1: remove, 2: none
  recNameRemoveNotInAb: false,
  recNameSuppressWarn: false,
  recNameAbs: [],
  //Recipient types
  needTo: true,
  needCc: false,
  needBcc: false,
  needReplyTo: false,
  limitToCc: 0,
  //Address check
  checkDup: true,
  dupSuppressWarn: false,
  addrCheckMode: 0, //0: popup all, 1: addrbook/list, 3: none
  addrCheckAbEnable: false,
  addrCheckAbs: [],
  abWhite: false,
  addrCheckListEnable: false,
  addrList: [],
  listWhite: false,
  addrCheckExcludeBcc: false,
  addrCheckBoth: false,
  checkWrongDay: false,
  dayDate: [],
  monthDef: [],
  dateDef: [],
  dayDef: [],
  checkDay: [],
  checkInvalidDate: false,
  alwaysPopup: true,
  expandMailLists: true
};

async function init() {
  browser.composeAction.disable();
  await loadPrefsForCommon();
}

async function performChecking(tabId) {
  let errCnt = 0;
  initWarnings();
  let details = await browser.compose.getComposeDetails(tabId);
  await loadPrefsForCurrentIdentity(details.identityId);

  if (prefs.expandMailLists) details = await expandMailLists(details);

  errCnt += await checkIdentity(details);
  errCnt += await checkAttachments(tabId);
  errCnt += await checkWords(details);
  errCnt += await checkRecipientNames(details);
  errCnt += checkRecipientType(details);
  errCnt += checkDuplicatedRecipients(details);
  errCnt += await checkAddress(details);
  errCnt += await checkDayDate(details);

  let inSendSession = promiseMap.get(tabId) ? true : false;
  let obj = {
    message: "SEND_WARNINGS",
    warnings: warnings,
    session: inSendSession,
    confirmation: (errCnt > 0 || prefs["alwaysPopup"])
  };

  return obj;
}

async function correctAndResumeSending(message) {
  let beforeSendResolve = promiseMap.get(message.tabId);
  if (beforeSendResolve) {
    if (message.confirmed) {
      let newDetails = [];
      if (Object.keys(message.warnings).length > 0) { //length == 0 means no warning and no popup
        warnings = message.warnings; //update warning info by user changes
        newDetails = await applyRecipientChanges(message.tabId);
      }

      browser.composeAction.disable(message.tabId);

      beforeSendResolve({
        cancel: false,
        details: newDetails
      });
    } else {
      browser.composeAction.enable(message.tabId); //if missing, toolbar button is grayed out but enable. it is W.A.

      beforeSendResolve({
        cancel: true
      });
    }

    promiseMap.delete(message.tabId);
  }

  return true;
}

async function getIDsAndABs() {
  let ids = await getIdentities();
  let abs = await getAddressBooks();
  let obj = {
    message: "SEND_IDS_AND_ABS",
    identities: ids,
    addressbooks: abs
  };

  return obj;
}

browser.runtime.onMessage.addListener(message => {
  let aPromise = null;
  switch (message.message) {
    case "GET_IDS_AND_ABS":
      aPromise = getIDsAndABs().then((obj) => {
        return obj;
      });

      /* Test code for promise reject */
      //aPromise = Promise.reject(new Error('For test'));

      break;
    case "GET_WARNINGS":
      aPromise = performChecking(message.tabId).then((obj) => {
        return obj;
      });
      break;
    case "USER_CHECKED":
      aPromise = correctAndResumeSending(message).then((obj) => {
        return obj;
      });
      break;
    default:
      aPromise = Promise.resolve(true);
      break;
  }

  return aPromise;
});

browser.storage.onChanged.addListener((changes, area) => {
  for (let item in changes) {
    let re = item.match(/cas_(.+)_mode/);
    if (re) {
      let id = re[1];
      loadCASModeForIdentity(id, changes[item].newValue);
    }
  }
});

browser.compose.onBeforeSend.addListener((tab, details) => {
  let tabId = tab.id;
  let id = details.identityId;

  let aPromise = new Promise(resolve => {
    promiseMap.set(tabId, resolve);
  });

  let check_mode = cas_modes[id] == "cas_common" ? cas_modes["common"] : cas_modes[id];
  if (check_mode != null) {
    browser.composeAction.enable(tabId);
    browser.composeAction.openPopup();
  } else { //check is disabled
    let resolve = promiseMap.get(tabId);
    if (resolve) {
      resolve({
        cancel: false,
      });
      promiseMap.delete(tabId);
    }
  }

  // Do NOT lose this Promise. Most of the compose window UI will be locked
  // until it is resolved. That's a very good way to annoy users.
  return aPromise;
});

function initWarnings() {
  warnings = {
    identity: "", //identity of the message
    attachExts: [], //array of attachments matched with NG file extensions or not matched with MUST file ones
    attachSize: 0, //set total size if it exceed the limit
    ngWordsBody: [], //NG words and occurrence [word] => occurrence
    mustWordsBody: [], //MUST words not found
    ngWordsSubject: [], //NG words and occurrence [word] => occurrence
    mustWordsSubject: [], //MUST words not found
    suppressCorrectNameWarn: false, //if true, recipient names will be corrected without notification
    correctNameTo: [], //recipient name correction. array of {index, oldName, newName, correct}
    correctNameCc: [], //recipient name correction. array of {index, oldName, newName, correct}
    correctNameReplyTo: [], //recipient name correction. array of {index, oldName, newName, correct}
    emptyTo: false, //mandatory field is empty or not
    emptyCc: false, //mandatory field is empty or not
    emptyBcc: false, //mandatory field is empty or not
    emptyReplyTo: false, //mandatory field is empty or not
    tooManyToCc: false, //many to/cc without bcc
    dupTo: [], //duplicated address and indexes. dupTo[addr] = {indexes, merge}
    dupCc: [], //duplicated address and indexes. dupCc[addr] = {indexes, merge}
    dupBcc: [], //duplicated address and indexes. dupBcc[addr] = {indexes, merge}
    dupReplyTo: [], //duplicated address and indexes. dupReplyTo[addr] = {indexes, merge}
    suppressDupAddrWarn: false, //if true, duplicated addresses will be removed without warning
    addrCheckTo: [], //array of error address. addrCheckTo[i] = {address, index, abookError, listError, send}
    addrCheckCc: [], //array of error address. addrCheckCc[i] = {address, index, abookError, listError, send}
    addrCheckBcc: [], //array of error address. addrCheckBcc[i] = {address, index, abookError, listError, send}
    addrCheckReplyTo: [], //array of error address. addrCheckReplyTo[i] = {address, index, abookError, listError, send}
    wrongDay: [], //array of wrong day date
    noteDay: [], //array of date matched with the predefined
    invalidDate: []
  };
}

async function loadCASModes() {
  let ids = await getIdentities();
  ids["common"] = "common";

  for (let id in ids) {
    let mode = "cas_" + id + "_mode";
    let result = await browser.storage.local.get(mode);
    let modeVal = result[mode];
    loadCASModeForIdentity(id, modeVal);
  }
}

function loadCASModeForIdentity(id, modeVal) {
  if (modeVal == 0) {
    cas_modes[id] = "cas_common";
  } else if (modeVal == 1) {
    cas_modes[id] = "cas_" + id;
  } else if (modeVal == 2) {
    cas_modes[id] = null; //no check
  } else { //mode is not defined for the id
    cas_modes[id] = "cas_common"; //use common
  }
}

async function loadPrefsForCommon() {
  await loadPrefsForCurrentIdentity("common");
}

async function loadPrefsForCurrentIdentity(id) {
  await loadCASModes();
  let key = cas_modes[id];

  if (key) {
    let result = await browser.storage.local.get(key);
    if (result[key]) {
      prefs = result[key];
      checkNewPrefs();
    } else if (key == "cas_common") { //prefs for common is not found. use default. will come here right after install.
      prefs = default_prefs;
      //set mode for id as use common
      let obj = {}
      let mode = "cas_" + id + "_mode";
      obj[mode] = 1;
      await browser.storage.local.set(obj);

      //save default prefs as common
      obj = {};
      obj[key] = prefs;
      await browser.storage.local.set(obj);
    }
  } else {
    prefs = null;
  }
}

//copy entity of default prefs in case new pref is added
function checkNewPrefs() {
  for (let key in default_prefs) {
    if (prefs[key] === undefined) {
      prefs[key] = default_prefs[key];
    }
  }
}

async function expandMailLists(details) {
  let abooks = await browser.addressBooks.list(true); //get address books with maillists included
  let mailLists = {};
  for (let i = 0; i < abooks.length; i++) {
    let abook = abooks[i];
    for (let j = 0; j < abook.mailingLists.length; j++) {
      mailLists[abook.mailingLists[j].name] = abook.mailingLists[j];
    }
  }

  details.to = expandMailListMain(details.to, mailLists);
  details.cc = expandMailListMain(details.cc, mailLists);
  details.bcc = expandMailListMain(details.bcc, mailLists);
  details.replyTo = expandMailListMain(details.replyTo, mailLists);

  return details;
}

function expandMailListMain(recipients, mailLists) {
  let ret = [];
  for (let i = 0; i < recipients.length; i++) {
    let contact = recipients[i];
    if (contact.indexOf("@") < 0) { //maillist
      let re = contact.match(/(.+) <.+>/); //maillist is represented as "list name <nick name>"
      let listName = "";
      if (re) {
        listName = re[1];
      } else { //just address
        listName = contact;
      }

      let mailList = mailLists[listName];
      if (mailList) {
        for (let j = 0; j < mailList.contacts.length; j++) {
          let child = mailList.contacts[j];
          let addr = child.properties.PrimaryEmail ? child.properties.PrimaryEmail : child.properties.SecondEmail;
          let name = child.properties.DisplayName;

          if (name && addr) {
            ret.push(name + " <" + addr + ">");
          } else if (addr) {
            ret.push(addr);
          } else {
            //what is this?
          }
        }
      } else {
        ret.push(contact);
      }
    } else { //address
      ret.push(contact);
    }
  }

  return ret;
}

async function getIdentities() {
  let accounts = await browser.accounts.list();
  let work = []; //already added identities
  let ret = [];
  for (let i = 0; i < accounts.length; i++) {
    let acc = accounts[i];
    let ids = acc.identities;
    for (let j = 0; j < ids.length; j++) {
      let email = ids[j].email;
      let name = ids[j].name;
      let id = ids[j].id;
      if (!work[id]) {
        ret[id] = name ?
          name + " <" + email + ">" :
          email;
        work[id] = true;
      }
    }
  }

  return ret;
}

async function getAddressBooks() {
  let ab = await browser.addressBooks.list();
  let ret = [];
  for (let i = 0; i < ab.length; i++) {
    ret[ab[i].id] = ab[i].name;
  }

  return ret;
}

async function checkIdentity(details) {
  let errCnt = 0;
  if (prefs.showIdentity) {
    let identityId = details.identityId;

    let accounts = await browser.accounts.list();
    let id = null;
    for (let i = 0; i < accounts.length; i++) {
      let ids = accounts[i].identities;
      for (let j = 0; j < ids.length; j++) {
        if (ids[j].id == identityId) {
          id = ids[j].name + " <" + ids[j].email + ">";
          errCnt = 1;
          break;
        }
      }
      if (id) break;
    }
    warnings.identity = id;
  } else {
    warnings.identity = null;
  }

  return errCnt;
}

async function applyRecipientChanges(tabId) {
  let details = await browser.compose.getComposeDetails(tabId);

  if (prefs.expandMailLists) details = await expandMailLists(details);

  let to = details.to;
  let cc = details.cc;
  let bcc = details.bcc;
  let replyTo = details.replyTo;

  let newDetails = {};

  //copy to work space
  let workTo = to.slice(0, to.length);
  let workCc = cc.slice(0, cc.length);
  let workBcc = bcc.slice(0, bcc.length);
  let workReplyTo = replyTo.slice(0, replyTo.length);

  let changed = false;
  changed = correctRecipientNames(workTo, warnings.correctNameTo) || changed;
  changed = removeDuplicatedRecipients(workTo, warnings.dupTo) || changed;
  changed = removeAddrCheckErrorRecipients(workTo, warnings.addrCheckTo) || changed;

  if (changed) {
    newDetails.to = [];
    for (let i = 0; i < workTo.length; i++) {
      if (workTo[i]) {
        newDetails.to.push(workTo[i]);
      }
    }
  }

  changed = false;
  changed = correctRecipientNames(workCc, warnings.correctNameCc) || changed;
  changed = removeDuplicatedRecipients(workCc, warnings.dupCc) || changed;
  changed = removeAddrCheckErrorRecipients(workCc, warnings.addrCheckCc) || changed;

  if (changed) {
    newDetails.cc = [];
    for (let i = 0; i < workCc.length; i++) {
      if (workCc[i]) {
        newDetails.cc.push(workCc[i]);
      }
    }
  }

  changed = false;
  changed = removeDuplicatedRecipients(workBcc, warnings.dupBcc) || changed;
  changed = removeAddrCheckErrorRecipients(workBcc, warnings.addrCheckBcc) || changed;

  if (changed) {
    newDetails.bcc = [];
    for (let i = 0; i < workBcc.length; i++) {
      if (workBcc[i]) {
        newDetails.bcc.push(workBcc[i]);
      }
    }
  }

  changed = false;
  changed = correctRecipientNames(workReplyTo, warnings.correctNameReplyTo) || changed;
  changed = removeDuplicatedRecipients(workReplyTo, warnings.dupReplyTo) || changed;
  changed = removeAddrCheckErrorRecipients(workReplyTo, warnings.addrCheckReplyTo) || changed;

  if (changed) {
    newDetails.replyTo = [];
    for (let i = 0; i < workReplyTo.length; i++) {
      if (workReplyTo[i]) {
        newDetails.replyTo.push(workReplyTo[i]);
      }
    }
  }

  return Object.keys(newDetails).length > 0 ? newDetails : null;
}

function correctRecipientNames(list, warning) {
  let changed = false;
  for (let i = 0; i < warning.length; i++) {
    let warn = warning[i];
    if (warn.correct) {
      list[warn.index] = warn.newName;
      changed = true;
    }
  }

  return changed;
}

function removeDuplicatedRecipients(list, warning) {
  let changed = false;
  for (let key in warning) {
    let warn = warning[key];
    if (warn.merge) {
      for (let i = 1; i < warn.indexes.length; i++) { //first one should keep. so start with i=1.
        list[warn.indexes[i]] = null;
      }
      changed = true;
    }
  }

  return changed;
}

function removeAddrCheckErrorRecipients(list, warning) {
  let changed = false;
  for (let i = 0; i < warning.length; i++) {
    let warn = warning[i];
    if (!warn.send) {
      list[warn.index] = null;
      changed = true;
    }
  }

  return changed;
}

//check attachment extension and size
async function checkAttachments(tabId) {
  //init
  warnings.attachExts = [];
  warnings.attachSize = 0;

  //prefs
  let exts = prefs.attachExts;
  let sizeLimit = prefs.attachSizeLimit; //Mega Bytes
  let blacklistCheck = prefs.attachBlacklistCheck;

  if (sizeLimit == 0 && !prefs.attachExtCheckEnable) {
    return 0;
  }

  let attachments = await browser.compose.listAttachments(tabId);
  let errCnt = 0;

  //make query for extension check
  let extsNum = exts.length;
  for (let i = 0; i < extsNum; i++) {
    let ext = exts[i].replace(/\s/g, "");
    ext = ext.replace(/^\*/, "");
    ext = ext.replace(/^\./, "");
    ext = ext.replace(/\./g, "\.");
    exts[i] = new RegExp(ext + "$", "");
  }

  let ngAttachments = [];

  let attachNum = attachments.length;
  let sumFileSize = 0;
  for (let i = 0; i < attachNum; i++) {
    let name = attachments[i].name;
    let hit = false;
    for (let j = 0; j < extsNum; j++) {
      hit = exts[j].test(name);
      if (hit) break;
    }
    if ((blacklistCheck && hit) || (!blacklistCheck && !hit)) {
      ngAttachments.push(name);
    }

    try {
      let file = await attachments[i].getFile();
      sumFileSize += file.size;
    } catch (e) {
      console.error("Cannot get a file object. Ignore file size.");
    }
  }

  //discard result since exts check is disabled
  if (!prefs.attachExtCheckEnable) {
    ngAttachments = [];
  }

  warnings.attachExts = ngAttachments;
  if (ngAttachments.length > 0) {
    errCnt = errCnt + 1;
  }

  sumFileSize = parseInt(sumFileSize * 10 / 1024 / 1024) / 10.0;
  if (sizeLimit > 0 && sumFileSize > sizeLimit) {
    warnings.attachSize = sumFileSize;
    errCnt = errCnt + 1;
  } else {
    warnings.attachSize = 0;
  }

  return errCnt;
}

async function checkWords(details) {
  //initialize global results
  warnings.ngWordsBody = [];
  warnings.ngWordsSubject = [];
  warnings.mustWordsBody = [];
  warnings.mustWordsSubject = [];

  //prefs
  let ngWords = prefs.ngWords;
  let mustWords = prefs.mustWords;
  let isRegExp = prefs.wordIsRegExp;
  let caseSense = prefs.wordCaseSense;
  let checkBody = prefs.wordCheckBody;
  let checkSubject = prefs.wordCheckSubject;
  let ignoreQuote = prefs.wordIgnoreQuote;
  let ngCheckEnable = prefs.wordNGCheckEnable;
  let mustCheckEnable = prefs.wordMustCheckEnable;

  let reFlag = caseSense ? "gm" : "gmi";

  let body = checkBody ? await prepareSearchString(details.body, ignoreQuote) : "";
  let subject = checkSubject ? details.subject : "";
  let errCnt = 0;
  if (ngCheckEnable) {
    for (let i = 0; i < ngWords.length; i++) {
      let query = ngWords[i];
      if (!isRegExp) {
        query = escapeRegxpSpecials(query);
      }

      if (checkBody) {
        let hits = await searchKeyword(body, query, reFlag);
        for (let word in hits) {
          warnings.ngWordsBody[word] = warnings.ngWordsBody[word] ?
            warnings.ngWordsBody[word] + hits[word] :
            hits[word];
        }
      }

      if (checkSubject) {
        let hits = await searchKeyword(subject, query, reFlag);
        for (let word in hits) {
          warnings.ngWordsSubject[word] = warnings.ngWordsSubject[word] ?
            warnings.ngWordsSubject[word] + hits[word] :
            hits[word];
        }
      }
    }

    if (Object.keys(warnings.ngWordsBody).length > 0) {
      errCnt = errCnt + 1;
    }
    if (Object.keys(warnings.ngWordsSubject).length > 0) {
      errCnt = errCnt + 1;
    }
  }


  if (mustCheckEnable) {
    for (let i = 0; i < mustWords.length; i++) {
      let query = mustWords[i];
      if (!isRegExp) {
        query = escapeRegxpSpecials(query);
      }

      if (checkBody) {
        let hits = await searchKeyword(body, query, reFlag);
        if (Object.keys(hits).length < 1) {
          warnings.mustWordsBody.push(mustWords[i]);
        }
      }

      if (checkSubject) {
        let hits = await searchKeyword(subject, query, reFlag);
        if (Object.keys(hits).length < 1) {
          warnings.mustWordsSubject.push(mustWords[i]);
        }
      }
    }

    if (warnings.mustWordsBody.length > 0) {
      errCnt = errCnt + 1;
    }
    if (warnings.mustWordsSubject.length > 0) {
      errCnt = errCnt + 1;
    }
  }

  return errCnt;
}

async function searchKeyword(str, keyword, reFlag) {
  let ret = [];

  let re = new RegExp(keyword, reFlag);
  let hits = str.match(re);

  if (hits) {
    for (let i = 0; i < hits.length; i++) {
      let word = hits[i];
      ret[word] = ret[word] ? ret[word] + 1 : 1;
    }
  }

  return ret;
}

async function prepareSearchString(htmlString, ignoreQuote) {
  let doc = new DOMParser().parseFromString(htmlString, "text/html");
  let bodyNode = doc.querySelector("body");

  if (ignoreQuote) {
    //ignore blockquotes (html)
    let blockquotes = bodyNode.getElementsByTagName("blockquote");
    for (let i = blockquotes.length - 1; i >= 0; i--) {
      blockquotes[i].remove();
    }

    //ignore blockquotes (plain text)
    let spans = bodyNode.querySelectorAll("span[_moz_quote]");
    for (let i = spans.length - 1; i >= 0; i--) {
      spans[i].remove();
    }

    //ignore quoted message (plain text)
    let qspans = bodyNode.getElementsByTagName("span");
    for (let i = qspans.length - 1; i >= 0; i--) {
      if (qspans[i].textContent && qspans[i].textContent.indexOf(">") == 0) {
        qspans[i].remove();
      }
    }

    //ignore signature (html)
    let sigs = bodyNode.getElementsByClassName("moz-signature");
    for (let i = sigs.length - 1; i >= 0; i--) {
      sigs[i].remove();
    }

    //ignore forwarded message (html/plain text)
    let fwd = bodyNode.getElementsByClassName("moz-forward-container");
    for (let i = fwd.length - 1; i >= 0; i--) {
      fwd[i].remove();
    }

    //ignore reply header (html/plain text)
    let rehdr = bodyNode.getElementsByClassName("moz-cite-prefix");
    for (let i = rehdr.length - 1; i >= 0; i--) {
      rehdr[i].remove();
    }
  }

  /*replace <br> to "\n"
   it is needed even if ignoreQuote == false
   */
  let brs = bodyNode.getElementsByTagName("br");
  for (let i = brs.length - 1; i >= 0; i--) {
    brs[i].parentNode.replaceChild(
      document.createTextNode("\n"),
      brs[i]
    );
  }

  let mailData = bodyNode.textContent;

  if (ignoreQuote) {
    //ignore sinature (plain text)
    let sigIndex = mailData.indexOf("-- \n");
    if (sigIndex > 0) {
      mailData = mailData.substring(0, sigIndex);
    }
  }

  return mailData;
}

function escapeRegxpSpecials(inputString) {
  const specials = [".", "\\", "^", "$", "*", "+", "?", "|", "(", ")", "[", "]", "{", "}"];
  var re = new RegExp("(\\" + specials.join("|\\") + ")", "g");
  inputString = inputString.replace(re, "\\$1");
  return inputString.replace(" ", "\\s+");
}

async function checkRecipientNames(details) {
  //Pref
  let mode = prefs.recNameMode; //0: correct, 1: remove, 2: nothing
  let removeNotInAb = prefs.recNameRemoveNotInAb;
  let suppress = prefs.recNameSuppressWarn;
  let abs = prefs.recNameAbs;
  warnings.suppressCorrectNameWarn = suppress;

  let to = details.to;
  let cc = details.cc;
  let replyTo = details.replyTo;
  //followup-to is not checked since it is not in compose window
  //bcc is not checked since it will no be seen a recipient

  switch (mode) {
    case 0:
      warnings.correctNameTo = await getRecipientNameCandidates(to, true, removeNotInAb, abs);
      warnings.correctNameCc = await getRecipientNameCandidates(cc, true, removeNotInAb, abs);
      warnings.correctNameReplyTo = await getRecipientNameCandidates(replyTo, true, removeNotInAb, abs);
      break;
    case 1:
      warnings.correctNameTo = await getRecipientNameCandidates(to, false, false, abs);
      warnings.correctNameCc = await getRecipientNameCandidates(cc, false, false, abs);
      warnings.correctNameReplyTo = await getRecipientNameCandidates(replyTo, false, false, abs);
      break;
    default:
      break;
  }

  let errCnt = 0;
  if (warnings.correctNameTo.length > 0) errCnt = errCnt + 1;
  if (warnings.correctNameCc.length > 0) errCnt = errCnt + 1;
  if (warnings.correctNameReplyTo.length > 0) errCnt = errCnt + 1;

  if (suppress) errCnt = 0;

  return errCnt;
}

async function getRecipientNameCandidates(addrList, correct, removeNotInAb, addrBooks) {
  let candidates = [];
  for (let i = 0; i < addrList.length; i++) {
    let contact = addrList[i];
    if (contact.indexOf("@") < 0) { //maybe maillist
      continue;
    }

    let re = null;
    let oldName = null;
    let addr = null;
    if (re = contact.match(/(.+) <(\S+)>/)) {
      oldName = re[1];
      addr = re[2];
    } else if (re = contact.match(/(\S+@\S+)/)) {
      /*
      Address without name. If user input address without name but wrapped by <>,
      the <> are removed by Thunderbird. So, the case will be in here too.
      */
      oldName = "";
      addr = re[1];
    }

    if (addr) {
      if (correct) {
        let contactNodes = await quickSearch(addrBooks, addr);
        let found = false;
        for (let j = 0; j < contactNodes.length; j++) {
          if (contactNodes[j].properties.PrimaryEmail == addr || contactNodes[j].properties.SecondEmail == addr) {
            let name = contactNodes[j].properties.DisplayName;
            found = true;
            if (oldName != name) {
              candidates.push({
                index: i,
                oldName: contact,
                newName: name + " <" + addr + ">",
                correct: true
              });
              break; //take first found contact as a candidate
            }
          }
        }
        if (!found && removeNotInAb) { //not found in address book
          candidates.push({
            index: i,
            oldName: contact,
            newName: addr,
            correct: true
          });
        }
      } else {
        candidates.push({
          index: i,
          oldName: contact,
          newName: addr,
          correct: true
        });
      }
    }
  }
  return candidates;
}

async function quickSearch(abIds, addr) {
  let nodes = [];
  for (let i = 0; i < abIds.length; i++) {
    let contacts = await browser.contacts.quickSearch(abIds[i], addr);
    nodes = nodes.concat(contacts);
  }

  return nodes;
}

function checkRecipientType(details) {
  //pref
  let needTo = prefs.needTo;
  let needCc = prefs.needCc;
  let needBcc = prefs.needBcc;
  let needReplyTo = prefs.needReplyTo;
  let limitToCc = prefs.limitToCc;

  let errCnt = 0;
  if (needTo && details.to.length < 1) {
    warnings.emptyTo = true;
    errCnt = errCnt + 1;
  } else {
    warnings.emptyTo = false;
  }

  if (needCc && details.cc.length < 1) {
    warnings.emptyCc = true;
    errCnt = errCnt + 1;
  } else {
    warnings.emptyCc = false;
  }

  if (needBcc && details.bcc.length < 1) {
    warnings.emptyBcc = true;
    errCnt = errCnt + 1;
  } else {
    warnings.emptyBcc = false;
  }

  if (needReplyTo && details.replyTo.length < 1) {
    warnings.emptyReplyTo = true;
    errCnt = errCnt + 1;
  } else {
    warnings.emptyReplyTo = false;
  }

  let numToCc = details.to.length + details.cc.length;
  if (limitToCc > 0 && limitToCc < numToCc && details.bcc.length < 1) {
    warnings.tooManyToCc = true;
    errCnt = errCnt + 1;
  } else {
    warnings.tooManyToCc = false;
  }

  return errCnt;
}

function checkDuplicatedRecipients(details) {
  //pref
  let checkDup = prefs.checkDup;
  warnings.suppressDupAddrWarn = prefs.dupSuppressWarn;

  if (!checkDup) {
    warnings.dupTo = [];
    warnings.dupCc = [];
    warnings.dupBcc = [];
    warnings.dupReplyTo = [];
    return 0;
  }

  let counts = countRecipients(details.to);
  for (let addr in counts) {
    if (counts[addr].length > 1) {
      warnings.dupTo[addr] = {
        indexes: counts[addr],
        merge: true
      };
    }
  }

  counts = countRecipients(details.cc);
  for (let addr in counts) {
    if (counts[addr].length > 1) {
      warnings.dupCc[addr] = {
        indexes: counts[addr],
        merge: true
      };
    }
  }

  counts = countRecipients(details.bcc);
  for (let addr in counts) {
    if (counts[addr].length > 1) {
      warnings.dupBcc[addr] = {
        indexes: counts[addr],
        merge: true
      };
    }
  }

  counts = countRecipients(details.replyTo);
  for (let addr in counts) {
    if (counts[addr].length > 1) {
      warnings.dupReplyTo[addr] = {
        indexes: counts[addr],
        merge: true
      };
    }
  }

  let errCnt = 0;
  if (Object.keys(warnings.dupTo).length > 0) errCnt = errCnt + 1;
  if (Object.keys(warnings.dupCc).length > 0) errCnt = errCnt + 1;
  if (Object.keys(warnings.dupBcc).length > 0) errCnt = errCnt + 1;
  if (Object.keys(warnings.dupReplyTo).length > 0) errCnt = errCnt + 1;

  return errCnt;
}

function countRecipients(addrList) {
  let work = [];
  for (let i = 0; i < addrList.length; i++) {
    let contact = addrList[i];
    let addr = "";
    let found = contact.match(/(.+) <(\S+)>/);
    if (found) { //Name <address> format
      addr = found[2];
    } else if (contact.indexOf("@") > 0) { //Just address
      addr = contact;
    }

    if (addr) {
      if (!work[addr]) {
        work[addr] = [];
      }
      work[addr].push(i);
    }
  }

  return work;
}

async function checkAddress(details) {
  //pref
  let mode = prefs.addrCheckMode;
  let abookIds = (mode == 1 && prefs.addrCheckAbEnable) ? prefs.addrCheckAbs : null;
  let abWhite = prefs.abWhite; //use address book as white list or not
  let addrList = (mode == 1 && prefs.addrCheckListEnable) ? prefs.addrList : null;
  let listWhite = prefs.listWhite; //use domain list as white list or not.
  let both = prefs.addrCheckBoth; //warn only when address book error and list error
  let excludeBcc = prefs.addrCheckExcludeBcc;

  warnings.addrCheckTo = [];
  warnings.addrCheckCc = [];
  warnings.addrCheckBcc = [];
  warnings.addrCheckReplyTo = [];

  if (!abookIds || !addrList) { //one check is disabled. ignore the "both" option.
    both = false;
  }

  if (mode == 0) {
    warnings.addrCheckTo = popupAllAddresses(details.to);
    warnings.addrCheckCc = popupAllAddresses(details.cc);
    if (!excludeBcc) warnings.addrCheckBcc = popupAllAddresses(details.bcc);
    warnings.addrCheckReplyTo = popupAllAddresses(details.replyTo);
  } else if (mode == 1) { //address book or list check
    warnings.addrCheckTo = await searchContactsForAddressCheck(details.to, abookIds, abWhite, addrList, listWhite, both);
    warnings.addrCheckCc = await searchContactsForAddressCheck(details.cc, abookIds, abWhite, addrList, listWhite, both);
    if (!excludeBcc) warnings.addrCheckBcc = await searchContactsForAddressCheck(details.bcc, abookIds, abWhite, addrList, listWhite, both);
    warnings.addrCheckReplyTo = await searchContactsForAddressCheck(details.replyTo, abookIds, abWhite, addrList, listWhite, both);
  }

  let errCnt = 0;
  if (warnings.addrCheckTo.length > 0) errCnt = errCnt + 1;
  if (warnings.addrCheckCc.length > 0) errCnt = errCnt + 1;
  if (warnings.addrCheckBcc.length > 0) errCnt = errCnt + 1;
  if (warnings.addrCheckReplyTo.length > 0) errCnt = errCnt + 1;

  return errCnt;
}

function popupAllAddresses(list) {
  let result = [];
  for (let i = 0; i < list.length; i++) {
    let addr = list[i];
    let noreply = (addr.split("@")[0].indexOf("noreply") >= 0) || (addr.split("@")[0].indexOf("no-reply") >= 0);
    result.push({
      address: addr,
      index: i,
      abookError: true,
      listError: true,
      send: !noreply //if address is noreply, sending is disabled by default
    });
  }

  return result;
}

async function searchContactsForAddressCheck(list, abookIds, abWhite, addrList, listWhite, both) {
  let result = [];

  for (let i = 0; i < list.length; i++) {
    let contact = list[i];
    if (contact.indexOf("@") < 0) { //maybe maillist
      continue;
    }

    let addr = null;
    let re = contact.match(/.+ <(\S+)>/);
    if (re) {
      addr = re[1];
    } else { //just address
      addr = contact;
    }

    let inAbook = abookIds ? await searchContactsFromAddressBook(abookIds, addr) : false;
    let inList = addrList ? searchContactsFromAddressList(addrList, addr) : false;

    let abookError = abookIds ? (abWhite && !inAbook) || (!abWhite && inAbook) : false;
    let listError = addrList ? (listWhite && !inList) || (!listWhite && inList) : false;

    let error = both ? (abookError && listError) : (abookError || listError);

    let noreply = (addr.split("@")[0].indexOf("noreply") >= 0) || (addr.split("@")[0].indexOf("no-reply") >= 0);
    if (noreply) { //noreply is always error.
      error = true;
      abookError = true;
      listError = true;
    }
    if (error) {
      result.push({
        address: contact,
        index: i,
        abookError: abookError,
        listError: listError,
        send: !noreply //if address is noreply, sending is disabled by default
      });
    }

  }

  return result;
}

async function searchContactsFromAddressBook(abookIds, addr) {
  let inAbook = false;
  let contactNodes = await quickSearch(abookIds, addr);
  for (let i = 0; i < contactNodes.length; i++) {
    if (contactNodes[i].properties.PrimaryEmail == addr || contactNodes[i].properties.SecondEmail == addr) {
      inAbook = true;
    }
  }

  return inAbook;
}

function searchContactsFromAddressList(addrList, addr) {
  let inList = false;
  for (let i = 0; i < addrList.length; i++) {
    let item = addrList[i];

    //convert domain to address pattern using wild card
    if (item.indexOf("@") < 0) {
      item = "*@" + item;
    } else if (item.indexOf("@") == 0) {
      item = "*" + item;
    }

    //escape for regexp
    item = escapeRegxpSpecials(item);
    //convert escaped wild card (\*) to regexp (\S*)
    item = item.replace(/\\\*/, "\\S*");

    let re = new RegExp("^" + item + "$", "i");
    inList = re.test(addr);

    if (inList) break;
  }

  return inList;
}

async function checkDayDate(details) {
  let checkDay = false;
  for (let i = 0; i < prefs.checkDay.length; i++) {
    checkDay = checkDay || prefs.checkDay[i];
  }

  warnings.wrongDay = {};
  warnings.noteDay = {};
  warnings.invalidDate = {};

  if (prefs.checkInvalidDate || prefs.checkWrongDay || checkDay) {
    let patterns = prefs.dayDate;
    let str = details.subject;
    str = " " + str + await prepareSearchString(details.body, true);

    for (let i = 0; i < patterns.length; i++) {
      await checkDateInString(str, patterns[i].pattern, patterns[i].backref);
    }
  }

  let errCnt = 0;
  if (Object.keys(warnings.wrongDay).length > 0) errCnt = errCnt + 1;
  if (Object.keys(warnings.noteDay).length > 0) errCnt = errCnt + 1;
  if (Object.keys(warnings.invalidDate).length > 0) errCnt = errCnt + 1;

  return errCnt;
}

async function checkDateInString(str, pattern, backref) {
  let monthDef = prefs.monthDef;
  let dateDef = prefs.dateDef;
  let dayDef = prefs.dayDef;

  let re = new RegExp(pattern, "gmi");
  let hits = null;
  while ((hits = re.exec(str)) !== null) {
    let month = searchDateDefinition(monthDef, hits[backref["month"]]);
    let date = searchDateDefinition(dateDef, hits[backref["date"]]) + 1;
    let day = backref["day"] != -1 ? searchDateDefinition(dayDef, hits[backref["day"]]) : -1;

    if (month < 0 || date < 1 || month > 11 || date > 31) {
      continue; //wrong match
    }
    let today = new Date();
    let year = today.getFullYear();
    let d = new Date(year, month, date);
    if (d < today) {
      d = new Date(year + 1, month, date);
    }

    let key = d.toISOString();
    if (d.getDate() != date) { //invalid date
      if (prefs.checkInvalidDate) {
        warnings.invalidDate[key] = {
          date: hits[0],
          correctDate: d.toLocaleDateString()
        };
      }
    } else {
      let correctDay = d.getDay();
      if (prefs.checkWrongDay && day >= 0 && day != correctDay) {
        warnings.wrongDay[key] = {
          date: hits[0],
          correctDay: correctDay,
          localeDate: d.toLocaleDateString()
        };
      }

      if (prefs.checkDay[correctDay]) {
        warnings.noteDay[key] = {
          date: hits[0],
          noteDay: correctDay,
          localeDate: d.toLocaleDateString()
        };
      }
    }
  }
}

function searchDateDefinition(def, key) {
  let index = -1;
  if (key) {
    for (let i = 0; i < def.length; i++) {
      let record = def[i];
      for (let j = 0; j < record.length; j++) {
        if (record[j].toLowerCase() == key.toLocaleLowerCase()) {
          index = i;
          break;
        }
      }
    }
  }
  return index;
}

init();
