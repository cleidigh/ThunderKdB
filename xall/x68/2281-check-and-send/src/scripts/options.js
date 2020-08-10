var prefs = {};

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
  alwaysPopup: true
};

var currentIdentity = "common";

browser.runtime.onMessage.addListener(async message => {
  switch (message.message) {
    case "SEND_IDS_AND_ABS":
      buildAddressBooksBox("addrCheckAbs", message.addressbooks);
      buildAddressBooksBox("recNameAbs", message.addressbooks);
      await buildIdentityList(message.identities);
      break;
    default:
      break;
  }
});

function buildAddressBooksBox(boxId, addressbooks) {
  let box = document.getElementById(boxId);
  for (let id in addressbooks) {
    let name = addressbooks[id];
    let checkbox = document.createElement("input");
    checkbox.setAttribute("id", id);
    checkbox.setAttribute("name", boxId);
    checkbox.setAttribute("type", "checkbox");
    let label = document.createElement("label");
    label.textContent = name;
    let br = document.createElement("br");
    box.appendChild(checkbox);
    box.appendChild(label);
    box.appendChild(br);
  }
}

async function buildIdentityList(identities) {
  let select = document.getElementById("identity");
  for (let id in identities) {
    let option = document.createElement("option");
    option.textContent = identities[id];
    option.setAttribute("value", id);
    select.add(option);
  }
  select.selectedIndex = 0;

  await switchPrefsForId();
  select.addEventListener("change", switchPrefsForId);
  document.cas_form.casEnable[0].addEventListener("change", saveCASModePref);
  document.cas_form.casEnable[1].addEventListener("change", saveCASModePref);
  document.cas_form.casEnable[2].addEventListener("change", saveCASModePref);
}

async function switchPrefsForId() {
  let select = document.cas_form.identity;
  let index = select.selectedIndex;
  let val = select.options[index].value;

  currentIdentity = val;

  if (val == "common") {
    document.getElementById("casEnableCommon").setAttribute("class", "box-collapse");
  } else {
    document.getElementById("casEnableCommon").setAttribute("class", "box-visible");
  }

  await initCASMode();
  await initPrefs();

  updateDateInputFields(true);
}

async function initCASMode() {
  let select = document.cas_form.identity;
  let index = select.selectedIndex;
  let id = select.options[index].value;

  let mode = "cas_" + id + "_mode";
  let result = await browser.storage.local.get(mode);

  if (result && result[mode] < 3) {
    document.cas_form.casEnable[result[mode]].checked = true;
  } else if (id == "common") { //mode for common is not saved
    document.cas_form.casEnable[1].checked = true;
  } else { //mode for identity is not saved
    document.cas_form.casEnable[0].checked = true;
  }

  toggleConfigArea();
}

async function saveCASModePref() {
  toggleConfigArea();
  let str = "cas_" + currentIdentity + "_mode";
  let val = document.cas_form.casEnable.value;

  let obj = {};
  obj[str] = val;
  await browser.storage.local.set(obj);
}

function toggleConfigArea() {
  if (document.cas_form.casEnable[0].checked || document.cas_form.casEnable[2].checked) {
    document.getElementById("configArea").setAttribute("class", "box-collapse");
  } else {
    document.getElementById("configArea").setAttribute("class", "box-visible");
  }
}

async function initPrefs() {
  let prop = "cas_" + currentIdentity;
  let result = await browser.storage.local.get(prop);

  if (!result[prop]) { //prefs is not recorded
    //copy default prefs
    for (let key in default_prefs) {
      prefs[key] = default_prefs[key];
    }
  } else {
    prefs = result[prop];
  }

  //for (let key in prefs) {
  for (let key in default_prefs) { //use default_prefs in case pref is added in the future version
    let elem = document.getElementById(key);

    if (!elem) {
      continue;
    }

    let type = elem.getAttribute("type");
    let val = prefs[key];

    if (val === undefined) { //new pref
      val = default_prefs[key];
      prefs[key] = val;
    }

    switch (elem.localName) {
      case "input":
        if (/noteDay\d/.test(key)) {
          continue;
        } else if (type == "checkbox") {
          elem.checked = val ? true : false;
        } else if (type == "radio") {
          continue;
        } else if (type == "number") {
          elem.value = val;
        } else {
          elem.value = val ? val : "";
        }
        break;
      case "select":
        if (key == "addrList" || key == "attachExts" || key == "ngWords" || key == "mustWords") {
          fillSelectOptions(elem, val)
          continue; //no need to add event listener. event is triggered when the button is clicked.
        } else if (key == "abWhite" || key == "listWhite" || key == "attachBlacklistCheck") {
          prefs[key] ? elem.value = "true" : elem.value = "false";
        } else if (key == "dayDate") {
          if (val.length < 1) { //empty pref. save default.
            val = default_prefs[key];
            fillDayDateOptions(val);
            savePrefs();
          } else {
            fillDayDateOptions(val);
          }
          continue;
        } else {
          elem.value = val;
        }
        break;
      case "textarea":
        let str = formatJSONString(val);
        if (str) {
          elem.value = str;
        } else {
          //empty pref. save default.
          prefs[key] = default_prefs[key];
          elem.value = default_prefs[key];
          savePrefs();
        }
        document.getElementById(key + "Err").setAttribute("class", "box-collapse");
        break;
      default:
        continue;
    }

    elem.addEventListener("change", savePrefs);
  }

  //address check mode
  let index = isNaN(prefs["addrCheckMode"]) ? default_prefs["addrCheckMode"] : prefs["addrCheckMode"];
  document.cas_form.addrCheckMode[index].checked = true;
  document.cas_form.addrCheckMode[0].addEventListener("change", savePrefs);
  document.cas_form.addrCheckMode[1].addEventListener("change", savePrefs);
  document.cas_form.addrCheckMode[2].addEventListener("change", savePrefs);

  //recipient name check mode
  index = isNaN(prefs["recNameMode"]) ? default_prefs["recNameMode"] : prefs["recNameMode"];
  document.cas_form.recNameMode[index].checked = true;
  document.cas_form.recNameMode[0].addEventListener("change", savePrefs);
  document.cas_form.recNameMode[1].addEventListener("change", savePrefs);
  document.cas_form.recNameMode[2].addEventListener("change", savePrefs);

  //day check
  fillNoteDayCheckboxes();
  for (let i = 0; i < 7; i++) {
    document.cas_form.noteDay[i].addEventListener("change", savePrefs);
  }

  //address books for address check
  let checks = document.cas_form.addrCheckAbs;
  for (let i=0; i<checks.length; i++) {
    let check = checks[i];
    check.checked = (prefs["addrCheckAbs"].indexOf(check.id) != -1);
    check.addEventListener("change", savePrefs);
  }

  //address books for name check
  checks = document.cas_form.recNameAbs;
  for (let i=0; i<checks.length; i++) {
    let check = checks[i];
    check.checked = (prefs["recNameAbs"].indexOf(check.id) != -1);
    check.addEventListener("change", savePrefs);
  }
}

function fillNoteDayCheckboxes() {
  let val = prefs["checkDay"];
  if (val) {
    for (let i = 0; i < 7; i++) {
      let elem = document.getElementById("noteDay" + i);
      elem.checked = val[i] ? true : false;
    }
  }
}

function fillSelectOptions(elem, val) {
  //clear existing optons
  let length = elem.length;
  for (let i = length - 1; i >= 0; i--) {
    elem.remove(i);
  }

  //add new ones
  for (let i = 0; i < val.length; i++) {
    let opt = document.createElement("option");
    opt.textContent = val[i];
    elem.add(opt);
  }
}

function fillDayDateOptions(val) {
  //clear existing optons
  let elem = document.getElementById("dayDate");
  let length = elem.length;
  for (let i = length - 1; i >= 0; i--) {
    elem.remove(i);
  }

  //add new ones
  for (let i = 0; i < val.length; i++) {
    let opt = document.createElement("option");
    let record = val[i];
    let pattern = record.pattern;
    let month = record.backref.month.toString();
    let date = record.backref.date.toString();
    let day = record.backref.day.toString();
    updateDateRegExpEntry(elem, pattern, month, date, day, true);
  }
}

async function savePrefs() {
  let prop = "cas_" + currentIdentity;
  //for (let key in prefs) {
  for (let key in default_prefs) { //use default_prefs in case pref is added in the future version
    let elem = document.getElementById(key);

    if (!elem) continue;

    let type = elem.getAttribute("type");
    switch (elem.localName) {
      case "input":
        if (/noteDay\d/.test(key)) {
          continue;
        } else if (type == "checkbox") {
          prefs[key] = elem.checked ? true : false;
        } else if (type == "radio") {
          break;
        } else if (type == "number") {
          prefs[key] = Number.isNaN(elem.value) ? 0 : elem.value;
        } else {
          prefs[key] = elem.value ? elem.value : "";
        }
        break;
      case "select":
        if (key == "addrList" || key == "attachExts" || key == "ngWords" || key == "mustWords") {
          prefs[key] = getValueFromSelect(elem);
        } else if (key == "abWhite" || key == "listWhite" || key == "attachBlacklistCheck") {
          prefs[key] = (elem.value == "true");
        } else if (key == "dayDate") {
          prefs[key] = getDayDateValue();
        } else {
          prefs[key] = elem.value;
        }
        break;
      case "textarea":
        let value = parseJSONString(elem.value, key);
        if (value) {
          prefs[key] = value;
          document.getElementById(key + "Err").setAttribute("class", "box-collapse");
        } else { //invalid JSON string. rollback to old pref
          elem.value = formatJSONString(prefs[key]);
          document.getElementById(key + "Err").setAttribute("class", "box-visible");
        }
        break;
      default:
        break;
    }
  }

  //address check mode
  prefs["addrCheckMode"] = Number.parseInt(document.cas_form.addrCheckMode.value);

  //recipient name check mode
  prefs["recNameMode"] = Number.parseInt(document.cas_form.recNameMode.value);

  //day check
  saveNoteDayOptions();
  
  //address books for address check
  let checks = document.cas_form.addrCheckAbs;
  prefs["addrCheckAbs"] = [];
  for (let i=0; i<checks.length; i++) {
    let check = checks[i];
    if (check.checked) {
      prefs["addrCheckAbs"].push(check.id);
    }
  }

  //address books for name check
  checks = document.cas_form.recNameAbs;
  prefs["recNameAbs"] = [];
  for (let i=0; i<checks.length; i++) {
    let check = checks[i];
    if (check.checked) {
      prefs["recNameAbs"].push(check.id);
    }
  }

  let obj = {};
  obj[prop] = prefs;
  await browser.storage.local.set(obj);
}

function parseJSONString(str, elemId) {
  let value = null
  try {
    value = JSON.parse(str);
  } catch (e) {
    console.error(e);
    value = null;
  }

  let len = 0;
  if (elemId == "monthDef") {
    len = 12;
  } else if (elemId == "dateDef") {
    len = 31;
  } else if (elemId == "dayDef") {
    len = 7
  }

  if (!value || (value.length != len)) {
    value = null;
  }
  
  return value;
}

function saveNoteDayOptions() {
  if (!prefs["checkDay"]) prefs["checkDay"] = [];

  let val = prefs["checkDay"];
  for (let i = 0; i < 7; i++) {
    let elem = document.getElementById("noteDay" + i);
    val[i] = elem.checked;
  }
}

function getValueFromSelect(elem) {
  let ret = [];
  let opts = elem.options;
  for (let i = 0; i < opts.length; i++) {
    let val = opts[i].textContent;
    if (val) ret.push(val);
  }

  return ret;
}

function getDayDateValue() {
  let ret = [];
  let select = document.getElementById("dayDate");
  for (let i = 0; i < select.options.length; i++) {
    let opt = select.options[i];
    let obj = {
      pattern: opt.value,
      backref: {
        month: parseInt(opt.getAttribute("month")),
        date: parseInt(opt.getAttribute("date")),
        day: parseInt(opt.getAttribute("day")),
      }
    };
    ret.push(obj);
  }

  return ret;
}

function addSelectionOption(selectId) {
  let select = document.getElementById(selectId);
  let opt = document.createElement("option");
  let textField = document.getElementById(selectId + "Input");
  if (textField.value) {
    opt.textContent = textField.value;
    select.add(opt);
    textField.value = "";
    savePrefs();
  }
}

function deleteSelectionOption(selectId) {
  let select = document.getElementById(selectId);
  let index = select.selectedIndex;
  select.remove(index);
  savePrefs();
}

function registerEventListeners() {
  document.getElementById("addrListAdd").addEventListener("click", (event) => {
    addSelectionOption("addrList");
  });
  document.getElementById("addrListDel").addEventListener("click", (event) => {
    deleteSelectionOption("addrList");
  });

  document.getElementById("attachExtsAdd").addEventListener("click", (event) => {
    addSelectionOption("attachExts");
  });
  document.getElementById("attachExtsDel").addEventListener("click", (event) => {
    deleteSelectionOption("attachExts");
  });

  document.getElementById("ngWordsAdd").addEventListener("click", (event) => {
    addSelectionOption("ngWords");
  });
  document.getElementById("ngWordsDel").addEventListener("click", (event) => {
    deleteSelectionOption("ngWords");
  });

  document.getElementById("mustWordsAdd").addEventListener("click", (event) => {
    addSelectionOption("mustWords");
  });
  document.getElementById("mustWordsDel").addEventListener("click", (event) => {
    deleteSelectionOption("mustWords");
  });

  document.getElementById("dayDateAdd").addEventListener("click", (event) => {
    updateDateRegExp(true);
    updateDateInputFields(true);
  });
  document.getElementById("dayDateUpdate").addEventListener("click", (event) => {
    updateDateRegExp(false);
    updateDateInputFields(true);
  });
  document.getElementById("dayDateDel").addEventListener("click", (event) => {
    deleteSelectionOption("dayDate");
    updateDateInputFields(true);
  });
  document.getElementById("dayDate").addEventListener("click", (event) => {
    updateDateInputFields(false);
  });

}

function updateDateInputFields(init) {
  let select = document.getElementById("dayDate");
  let input = document.getElementById("dayDateInput");
  let backRefMonth = document.getElementById("dayDateMonth");
  let backRefDate = document.getElementById("dayDateDate");
  let backRefDay = document.getElementById("dayDateDay");

  if (init) {
    input.value = "";
    backRefMonth.value = "1";
    backRefDate.value = "2";
    backRefDay.value = "3";
  } else {
    let index = select.selectedIndex;
    let opt = select.options[index];
    if (opt) {
      input.value = opt.value;
      backRefMonth.value = opt.getAttribute("month");
      backRefDate.value = opt.getAttribute("date");
      backRefDay.value = opt.getAttribute("day");
    }
  }
}

function updateDateRegExp(add) {
  let select = document.getElementById("dayDate");
  let input = document.getElementById("dayDateInput").value;
  let backRefMonth = document.getElementById("dayDateMonth").value;
  let backRefDate = document.getElementById("dayDateDate").value;
  let backRefDay = document.getElementById("dayDateDay").value;

  let backRefChk = backRefMonth != backRefDate &&
    backRefDate != backRefDay &&
    backRefDay != backRefMonth;

  if (!input || !backRefChk) {
    console.log("Invalid RegExp");
  } else {
    updateDateRegExpEntry(select, input, backRefMonth, backRefDate, backRefDay, add);
    savePrefs();
  }
}

function updateDateRegExpEntry(select, pattern, month, date, day, add) {
  let str = pattern + " (month=$" + month + " date=$" + date;
  if (day != -1) str += " day=$" + day;
  str += ")";

  if (add) {
    let opt = document.createElement("option");
    opt.textContent = str;
    opt.value = pattern;
    opt.setAttribute("month", month);
    opt.setAttribute("date", date);
    opt.setAttribute("day", day);
    select.add(opt);
  } else {
    let index = select.selectedIndex;
    let opt = select.options[index];
    if (!opt) { //RegExp list is empty but a user click update
      opt = document.createElement("option");
      select.add(opt);
    }
    opt.textContent = str;
    opt.value = pattern;
    opt.setAttribute("month", month);
    opt.setAttribute("date", date);
    opt.setAttribute("day", day);
  }
}

function getDefaultDateDefinition() {
  let def = [];
  for (let i = 1; i <= 31; i++) {
    let record = [];
    record.push(i.toString());
    if (i < 10) {
      record.push("0" + i);
    }
    def.push(record);
  }

  return def;
}

function getDefaultMonthDefinition() {
  let def = [];
  for (let i = 1; i <= 12; i++) {
    let record = [];

    record.push(i.toString());
    if (i < 10) {
      record.push("0" + i);
    }
    record.push(browser.i18n.getMessage("casShortMonth" + (i - 1)));
    def.push(record);
  }

  return def;
}

function getDefaultDayDefinition() {
  let def = [];
  for (let i = 0; i < 7; i++) {
    let record = [];

    record.push(browser.i18n.getMessage("casShortDay" + i));
    def.push(record);
  }

  return def;
}

function formatJSONString(value) {
  let str = null;
  if (value.length > 0) {
    str = JSON.stringify(value);
    str = str.replace(/\[\[/g, "[\n  [");
    str = str.replace(/\]\]/g, "]\n]");
    str = str.replace(/],/g, "],\n  ");
  }

  return str;
}

function prepareDefaultPrefs() {
  default_prefs.monthDef = getDefaultMonthDefinition();
  default_prefs.dateDef = getDefaultDateDefinition();
  default_prefs.dayDef = getDefaultDayDefinition();
  let obj = {
    pattern: "(\\d+)\\/(\\d+)\\s*\\((\\S+)\\)",
    backref: {
      month: 1,
      date: 2,
      day: 3
    }
  };
  default_prefs.dayDate.push(obj);
}

async function init() {
  browser.runtime.sendMessage({
    message: "GET_IDS_AND_ABS"
  });

  prepareDefaultPrefs();

  translate();

  registerEventListeners();
}

init();
