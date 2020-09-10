var default_prefs = {
  priorityButtonEn: true,
  deleteButtonEn: true,
  delCheckStar: true,
  delCheckPriority: 2,
  delCheckIgnoreJunk: true,
  autoRewriteMode: 0, //0: no, 1: all, 2: IMAP only
  trashOnRewrite: false,
  readOtherHeaders: false
};

async function init() {
  translate();

  //setup radio option
  let result = await browser.storage.local.get("autoRewriteMode");
  if (result.autoRewriteMode === undefined) {
    document.psw_form.autoRewriteMode.value = default_prefs.autoRewriteMode.toString();
  } else {
    document.psw_form.autoRewriteMode.value = result.autoRewriteMode.toString();
  }

  for (let i = 0; i < document.psw_form.autoRewriteMode.length; i++) {
    document.psw_form.autoRewriteMode[i].addEventListener("change", async () => {
      let val = document.psw_form.autoRewriteMode.value;
      await browser.storage.local.set({
        autoRewriteMode: parseInt(val)
      });
    });
  }

  //setup other options
  let keys = [
    "priorityButtonEn",
    "deleteButtonEn",
    "delCheckStar",
    "delCheckPriority",
    "delCheckIgnoreJunk",
    "trashOnRewrite",
    "readOtherHeaders"
  ];

  for (let i = 0; i < keys.length; i++) {
    let key = keys[i];
    result = await browser.storage.local.get(key);
    let prefVal = result[key] === undefined ? default_prefs[key] : result[key];

    //set option ui
    let elem = document.getElementById(key);
    if (elem.localName === "select") {
      elem.value = prefVal.toString();
    } else {
      elem.checked = prefVal;
    }

    //set callback
    elem.addEventListener("change", async (event) => {
      let target = event.target;
      let newVal = null;
      if (target.localName === "select") {
        newVal = target.value; 
      } else {
        newVal = target.checked; 
      }

      let obj = {};
      obj[target.id] = newVal;
      await browser.storage.local.set(obj);
    });
  }
}

init();
