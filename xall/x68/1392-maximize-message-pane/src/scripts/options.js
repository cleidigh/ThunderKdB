async function init() {
  translate();
  let result = await browser.storage.local.get("toolbar_cmd");
  let cmdRadio = document.mmp_form.command_opt;

  switch (result.toolbar_cmd) {
    case "MP":
      cmdRadio[0].checked = true;
      break;
    case "FP":
      cmdRadio[1].checked = true;
      break;
    case "TP":
      cmdRadio[2].checked = true;
      break;
    default:
      cmdRadio[0].checked = true;
      break;
  }

  let addCmdCheck = document.mmp_form.command_add_opt;
  result = await browser.storage.local.get("use_splitters");
  addCmdCheck[0].checked = result.use_splitters ? true : false;

  result = await browser.storage.local.get("use_msgheader");
  addCmdCheck[1].checked = result.use_msgheader ? true : false;

  let colCheck = document.mmp_form.col_comp;
  result = await browser.storage.local.get("col_folder");
  colCheck[0].checked = result.col_folder ? true : false;

  result = await browser.storage.local.get("col_header");
  colCheck[1].checked = result.col_header ? true : false;

  result = await browser.storage.local.get("col_attach");
  colCheck[2].checked = result.col_attach ? true : false;

  result = await browser.storage.local.get("col_ltn");
  colCheck[3].checked = result.col_ltn ? true : false;

  result = await browser.storage.local.get("col_other_en");
  colCheck[4].checked = result.col_other_en ? true : false;

  result = await browser.storage.local.get("col_other_elems");
  colCheck[5].value = result.col_other_elems ? result.col_other_elems : "";

  cmdRadio[0].addEventListener("change", inputChanged);
  cmdRadio[1].addEventListener("change", inputChanged);
  cmdRadio[2].addEventListener("change", inputChanged);
  
  addCmdCheck[0].addEventListener("change", inputChanged);
  addCmdCheck[1].addEventListener("change", inputChanged);

  colCheck[0].addEventListener("change", inputChanged);
  colCheck[1].addEventListener("change", inputChanged);
  colCheck[2].addEventListener("change", inputChanged);
  colCheck[3].addEventListener("change", inputChanged);
  colCheck[4].addEventListener("change", inputChanged);
  colCheck[5].addEventListener("change", inputChanged);
}

async function inputChanged(event) {
  let pref = null;
  switch (event.target.id) {
    case "cmd_max_msg_pane":
      pref = {
        toolbar_cmd: "MP"
      };
      break;
    case "cmd_tgl_fld_pane":
      pref = {
        toolbar_cmd: "FP"
      };
      break;
    case "cmd_tgl_msg_pane":
      pref = {
        toolbar_cmd: "TP"
      };
      break;
    case "use_splitters":
      pref = {
        use_splitters: (event.target.checked == true)
      };
      break;
    case "use_msgheader":
      pref = {
        use_msgheader: (event.target.checked == true)
      };
      break;
    case "col_folder":
      pref = {
        col_folder: (event.target.checked == true)
      };
      break;
    case "col_header":
      pref = {
        col_header: (event.target.checked == true)
      };
      break;
    case "col_attach":
      pref = {
        col_attach: (event.target.checked == true)
      };
      break;
    case "col_ltn":
      pref = {
        col_ltn: (event.target.checked == true)
      };
      break;
    case "col_other_en":
      pref = {
        col_other_en: (event.target.checked == true)
      };
      break;
    case "col_other_elems":
      pref = {
        col_other_elems: (event.target.value ? event.target.value : "")
      };
      break;
    default:
      pref = null;
      break;
  }
  if (pref) {
    await browser.storage.local.set(pref);
  }
}

init();
