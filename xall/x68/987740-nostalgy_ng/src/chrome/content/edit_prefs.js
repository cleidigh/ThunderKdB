/*
 * License:  see License.txt
 * Code until Nostalgy 0.3.0/Nostalgy 1.1.15: Zlib
 * Code additions for TB 78 or later: Creative Commons (CC BY-ND 4.0):
 *      Attribution-NoDerivatives 4.0 International (CC BY-ND 4.0) 
 
 * Contributors:  see Changes.txt
 */



var { Services } = ChromeUtils.import("resource://gre/modules/Services.jsm");

var { manage_emails } = ChromeUtils.import("chrome://nostalgy/content/manage_emails.jsm");


manage_emails.applyRule= function applyRule(rule) {
  let item = nostalgy_gList.selectedItem;
 // console.log("applyrule1");
  //console.log(this.getCurrentFolder());
  //console.log(item);
  let rule2apply = NostalgyRuleOfItem(item);
  //console.log(rule2apply);
  let currentFolder = this.getCurrentFolder();
 // console.log(currentFolder);
  this.showFolder(rule2apply.under);
  //NostalgyDoSearch(rule2apply.contains);
  var input = this.getMainWindowElement("qfb-qs-textbox");
  //input.value= rule2apply.contains;
  this.setQuickFilter(rule2apply);
  

}


var nostalgy_gList = null;
var nostalgy_ruleTableBody = null;

var nostalgy_wait_key = null;
var nostalgy_wait_key_old = "";
var nostalgy_key_rows = null;
var nostalgy_folder_select = null;
var nostalgy_kKeysPrefs = "extensions.nostalgy.keys.";
var nostalgy_kCustomActionsPrefs = "extensions.nostalgy.actions.";
var nostalgy_max_custom = (-1);

var nostalgy_js_quote = {
  '\b': '\\b',
  '\t': '\\t',
  '\n': '\\n',
  '\f': '\\f',
  '\r': '\\r',
  '"' : '\\"',
  '\\': '\\\\'
};

function NostalgyQuote(x) {
  if (/["\x00-\x20\\"]/.test(x)) {
    x = x.replace(/(["\x00-\x20\\>"])/g, function(a, b) {
      var c = nostalgy_js_quote[b];
      if (c) { return c; }
      c = b.charCodeAt();
      return '\\u00' +
	Math.floor(c / 16).toString(16) + (c % 16).toString(16);
    });
  }
  return '"' + x + '"';
};

function NostalgyExportRules() {
    var rules = NostalgyMkPrefStr();
    const gClipboardHelper = Components.classes["@mozilla.org/widget/clipboardhelper;1"]
                                   .getService(Components.interfaces.nsIClipboardHelper);
    gClipboardHelper.copyString(rules);
    alert("Rules are copied to clipboard");
};

function NostalgyImportRules() {
    var rules = NostalgyMkPrefStr();
    var s = prompt("You can paste here a set of rules created with the 'Export Rules' button.", rules);
    if (!s) return;

    s = s.replace(/([\x00-\x20>])/g,function(a,b){ return "" });
    if (confirm(
        "Do you want to install these rules?\n"+
            "This will overwrite your current set of rules.\n"
    )) {
        var r = NostalgyJSONEval(s);
        while (nostalgy_gList.getRowCount() > 0)
            nostalgy_gList.removeItemAt(0);
        var i;
        for (i = 0; i < r.length; i++) { NostalgyCreateItem(r[i]); }
    }
}

function NostalgySetItem(item, rule) {

  var f = item.childNodes.item(0);
 // console.log("FRS", item, f);
  var lab = "";
  if (rule.sender) lab = lab + "F";
  if (rule.recipients) lab = lab + "R";
  if (rule.subject) lab = lab + "S";

  //f.setAttribute("value", lab);
  f.textContent = lab;

  var text = document.createTextNode(lab);
//f.appendChild(text);
  //f.setAttribute("label", lab);
  //f.setAttribute("align", "center");
  //item.childNodes.item(1).setAttribute("label", rule.contains);
  f= item.childNodes.item(1);
  f.setAttribute("value", rule.contains);
  text = document.createTextNode(rule.contains);
  f.textContent =  rule.contains;
//f.appendChild(text);

  var u = "";
  if (rule.under) { u = rule.under; }  else {u = "";};
  f = item.childNodes.item(2);
  f.setAttribute("value", u);
  text = document.createTextNode(u);
  //f.appendChild(text);
  f.textContent =  NostalgyCrop(u);
  
  //item.childNodes.item(2).setAttribute("label", NostalgyCrop(u));

  f = item.childNodes.item(3);
  f.setAttribute("value", rule.folder);
  text = document.createTextNode(rule.folder);
  //f.appendChild(text);
  f.textContent =  NostalgyCrop(rule.folder);

//  item.childNodes.item(3).setAttribute("label", NostalgyCrop(rule.folder));
}

function NostalgyRuleOfItem(item) {
 var fields = item.childNodes[0].textContent;//getAttribute("textContent");
 return ({ folder: item.childNodes[3].textContent,//getAttribute("textContent"),
           under: item.childNodes[2].textContent,//getAttribute("textContent"),
	         contains: item.childNodes[1].textContent,//getAttribute("textContent"),
           sender: fields.indexOf("F") >= 0,
           recipients: fields.indexOf("R") >= 0,
           subject: fields.indexOf("S") >= 0 });
}



function highlight_row() {
    var table = document.getElementById('display-table');
    var cells = table.getElementsByTagName('td');

    for (var i = 0; i < cells.length; i++) {
        // Take each cell
        var cell = cells[i];
        // do something on onclick event for cell
        cell.onclick = function () {
            // Get the row id where the cell exists
            var rowId = this.parentNode.rowIndex;

            var rowsNotSelected = table.getElementsByTagName('tr');
            for (var row = 0; row < rowsNotSelected.length; row++) {
                rowsNotSelected[row].style.backgroundColor = "";
                rowsNotSelected[row].classList.remove('selected');
            }
            var rowSelected = table.getElementsByTagName('tr')[rowId];
            rowSelected.style.backgroundColor = "yellow";
            rowSelected.className += " selected";

            msg = 'The ID of the company is: ' + rowSelected.cells[0].innerHTML;
            msg += '\nThe cell value is: ' + this.innerHTML;
    //        alert(msg);
        }
    }

}
function NostalgyCreateItem(rule) {
/*
*/
//  var col, item = document.createXULElement("html:tr");
  var col, item = document.createElement("tr");
  item.setAttribute("height", "20px  !important");
 // var item = document.createXULElement("richlistitem");
//
  item.addEventListener("dblclick", function() { NostalgyDoEditItem(item); }, false);
//  col = document.createXULElement("html:td");
  col = document.createElement("td");
  col.setAttribute("style", "height:20px");

var highLight = 
function () {
    // Get the row id where the cell exists
  debugger;
    var table = nostalgy_gList;//document.getElementById('display-table');
    var cells = table.getElementsByTagName('td');
   var rowId = this.parentNode.rowIndex;
   nostalgy_gList.selectedIndex = rowId;
   //console.log("selected", rowId);


  
    var rows = nostalgy_gList.rows;//table.getElementsByTagName('tr');
    for (let row of rows) {
   //     rowsNotSelected[row].style.backgroundColor = "";
        row.classList.remove('selected');
    }
 /*   */
//    var rowSelected = table.getElementsByTagName('tr');//[rowId];
 //   rowSelected.style.backgroundColor = "yellow";
 //   rowSelected.className += " selected";
    this.parentNode.className += " selected";
 //   this.parentNode.className.style.backgroundColor = "yellow";

}

col.onclick = highLight;

//console.log("table", nostalgy_gList,nostalgy_gList.rows.length);

 
  item.appendChild(col);
//  col = document.createXULElement("html:td");
  col = document.createElement("td");
    col.setAttribute("style", "height:20px");
    col.onclick = highLight;
     item.appendChild(col);
//  col = document.createXULElement("html:td");
  col = document.createElement("td");
    col.setAttribute("style", "height:20px");
    col.onclick = highLight;
     item.appendChild(col);
  col = document.createElement("td");
 // col = document.createXULElement("html:td");
  col.setAttribute("style", "height:20px");
  col.onclick = highLight;
   item.appendChild(col);
//  item.appendChild(document.createXULElement("html:td"));
 // item.appendChild(document.createXULElement("html:td"));
//  item.appendChild(document.createXULElement("html:td"));

  // convert from previous version
  if (rule.field == "any") {
   rule.sender = true;
   rule.recipients = true;
   rule.subject = true;
  } else if (rule.field == "sender") rule.sender = true
  else if (rule.field == "subject") rule.subject = true;

  NostalgySetItem(item,rule);
  nostalgy_ruleTableBody.appendChild(item);

}


function NostalyStrOfRule(rule) {
    return (
        "{sender:"   + rule.sender           + "," +
        "recipients:"+ rule.recipients       + "," +
        "subject:"   + rule.subject          + "," +
        "contains:"  + NostalgyQuote(rule.contains) + "," +
        "under:"     + NostalgyQuote(rule.under)    + "," +
        "folder:"    + NostalgyQuote(rule.folder)   + "}"
    );
}

function NostalgyMkPrefStr() {
  var i;
  var cnt = nostalgy_gList.getRowCount();
  var res = "";
  for (i = 0; i < cnt; i++) {
    if (i > 0) res = res + ", ";
    res = res + NostalyStrOfRule(NostalgyRuleOfItem(nostalgy_gList.getItemAtIndex(i)));
  }
  return ("[" + res + "]");
}


function NostalgyEditRule(rule, accept) {
  window.openDialog("chrome://nostalgy/content/edit_rule.xhtml",
                     "_blank",
	             "dialog,chrome,modal,titlebar,resizable=yes",
	             rule,accept);
}

function NostalgyDoEditItem(item) {
  if (item) {
    NostalgyEditRule(NostalgyRuleOfItem(item), function(rule) { NostalgySetItem(item,rule); });
  }
}


function NostalgyDoNewRule() {
  NostalgyEditRule({ sender:true, recipients:true, subject:true,
             contains:"", folder:"", under:"" }, NostalgyCreateItem);
}



function NostalgyDoEdit() {
  debugger;
  let  item = nostalgy_gList.getItemAtIndex(nostalgy_gList.selectedIndex);

  NostalgyDoEditItem(item);
}

function NostalgySwapItems(idx1,idx2) {
  //console.log("swap",idx1, idx2 );
  var item1 = nostalgy_gList.getItemAtIndex(idx1);
  var item2 = nostalgy_gList.getItemAtIndex(idx2);
 // console.log("items", item1, item2, "rows", nostalgy_gList.rows);
//  nostalgy_gList.setItemAtIndex(item1,idx1);
//  nostalgy_gList.setItemAtIndex(item1,idx2);
let A = nostalgy_gList.rows;
//console.log("type", typeof(A));
A[idx2] = A.splice(idx1, 1, A[idx2])[0]; 
 //console.log("items", item1, item2);
  /*
  var rule1 = NostalgyRuleOfItem(item1);
  var rule2 = NostalgyRuleOfItem(item2);
  NostalgySetItem(item1,rule2);
  NostalgySetItem(item2,rule1);
  nostalgy_gList.selectedIndex = idx2;
//  nostalgy_gList.ensureIndexIsVisible(idx2);
*/
}

function NostalgyDoMoveUp(idx1,idx2) {
  var idx = nostalgy_gList.selectedIndex;
  if (idx == 0) return;
  let item = nostalgy_gList.getItemAtIndex(idx);
  let prev1 = item.previousSibling;
  //console.log("node", item, prev1,nostalgy_gList.rows );
  prev1.before(item);
  nostalgy_gList.selectedIndex--;
  //item.parentNode.insertBefore()
 // NostalgySwapItems(idx,idx-1);
}

function NostalgyDoMoveDown(idx1,idx2) {
  var idx = nostalgy_gList.selectedIndex;
  if (idx == nostalgy_gList.getRowCount() - 1) return;
  let item = nostalgy_gList.getItemAtIndex(idx);
  let prev1 = item.nextSibling;
  //console.log("node", item, prev1,nostalgy_gList.rows );
  prev1.after(item);
  nostalgy_gList.selectedIndex++;
 // NostalgySwapItems(idx,idx+1);
}

function onNostalgyAcceptChanges() {
  var prefs = PrefBranch();
  prefs.setCharPref("extensions.nostalgy.rules", NostalgyMkPrefStr());
  try {
      prefs.setIntPref("extensions.nostalgy.number_of_recent_folders", 0 + NostalgyEBI("number_of_recent_folders").value);
  } catch (exn) {
      NostalgyDebug(exn);
  }
  try {
      prefs.setIntPref("extensions.nostalgy.predict_max_addresses_to_update", 0 + NostalgyEBI("predict_max_addresses_to_update").value);
  } catch (exn) {
      NostalgyDebug(exn);
  }

  for (var n in nostalgy_completion_options)
    prefs.setBoolPref("extensions.nostalgy."+n,	NostalgyEBI(n).checked);

    prefs.setBoolPref("extensions.manage_emails.showCC",	NostalgyEBI("always_cc").checked);
    prefs.setBoolPref("extensions.manage_emails.showBCC",	NostalgyEBI("always_bcc").checked);  

  if (nostalgy_wait_key) { nostalgy_wait_key.value = nostalgy_wait_key_old; nostalgy_wait_key = null; }
  for (var i in nostalgy_keys) {
    let sKey= nostalgy_keys[i][0];
    let sValue= NostalgyEBI("key_" + nostalgy_keys[i][0]).value;
    prefs.setStringPref(nostalgy_kKeysPrefs+nostalgy_keys[i][0],
    NostalgyEBI("key_" + nostalgy_keys[i][0]).value);
  }

  var a = prefs.getChildList(nostalgy_kKeysPrefs, { });
  for (var i in a) {
    var id = a[i].substr(nostalgy_kKeysPrefs.length);
    if (id.substr(0,1) == "_") {
      try {
       prefs.clearUserPref(nostalgy_kKeysPrefs+id);
       prefs.clearUserPref(nostalgy_kCustomActionsPrefs+id);
      } catch (ex) { }
    }
  }

  var e = document.getElementsByTagName("label");
  for (var i = 0; i < e.length; i++)
   if (e[i].id.substr(0,5) == "key__") {
      var id = e[i].id.substr(4);
  //    console.log("custom action", e[i], e[i].parentNode.previousSibling);
      prefs.setStringPref(nostalgy_kKeysPrefs+id,e[i].value);
      prefs.setStringPref(nostalgy_kCustomActionsPrefs+id,e[i].parentNode.previousSibling.childNodes[0].value);
   }

  window.close();
}

manage_emails.ConvertToNewRule = function ConvertToNewRule() {
  var folder1 = NostalgyFullFolderName(window.arguments[1].lastFolder); // window.arguments[1].lastFolder
  var under1 = NostalgyFullFolderName(window.arguments[1].lastUnder);   // window.arguments[1].lastUnder
  NostalgyEditRule({ sender:true, recipients:true, subject:false,
             contains: window.arguments[1].lastContains, folder: folder1, under: under1 }, NostalgyCreateItem);
}

function NostalgyConvertToNewRule() {
  var folder1 = NostalgyFullFolderName(window.arguments[1].lastFolder); // window.arguments[1].lastFolder
  var under1 = NostalgyFullFolderName(window.arguments[1].lastUnder);   // window.arguments[1].lastUnder
  NostalgyEditRule({ sender:true, recipients:true, subject:false,
             contains: window.arguments[1].lastContains, folder: folder1, under: under1 }, NostalgyCreateItem);
}

function NostalgyDoDelete() {
  var idx = nostalgy_gList.selectedIndex;
  if (idx >= 0) {
    nostalgy_gList.getItemAtIndex(idx).remove();
    if (nostalgy_gList.getRowCount() <= idx) { idx = nostalgy_gList.getRowCount() - 1; }
    nostalgy_gList.selectedIndex = -1;
    //nostalgy_gList.select(idx);
  }
}

function NostalgyGetBoolPref(prefs,s) {
 var b = false;
 try {
  b=prefs.getBoolPref("extensions.nostalgy." + s); }
 catch (ex) { }
 return b;
}

function NostalgyGetIntPref(prefs,s,def) {
 var b = def;
 try {
     b=prefs.getIntPref("extensions.nostalgy." + s);
 }
 catch (ex) {
 }
 return b;
}

function NostalgyCreateElem(tag,attrs,children) {
 var x = document.createXULElement(tag);
 for (var a in attrs) x.setAttribute(a,attrs[a]);
 if (children) for (var i in children) x.appendChild(children[i]);
 return x;
}

function NostalgyCreateHTMLElem(tag,attrs,children) {
  var x = document.createElement(tag);
  for (var a in attrs) x.setAttribute(a,attrs[a]);
  if (children) for (var i in children) x.appendChild(children[i]);
  return x;
 }

function NostalgyCreateKeyRow(id,txt,v) {
  var is_custom = id.substr(0,1) == "_";
  var buttons = [ ];
  if (!is_custom)
   buttons.push(NostalgyCreateElem("label", { class:"text-link", value:"disable",
          onclick:"this.parentNode.previousSibling.value = '(disabled)';"}));
  else
   buttons.push(NostalgyCreateElem("label", { class:"text-link", value:"delete",
          onclick:"NostalgyRemoveRow(this.parentNode.parentNode);" }));
  let html1=  NostalgyCreateHTMLElem("tr",{ }, [
  //  NostalgyCreateHTMLElem("td",{ }, []),
    NostalgyCreateHTMLElem("td",{width: "30%" }, [NostalgyCreateElem("label", { value:txt })]),
    NostalgyCreateHTMLElem("td",{ }, [NostalgyCreateElem("label", { id:"key_" + id, class:"text-link",
                          value:v,
                          onclick:"NostalgyWaitKey(this);",
                          onblur:"NostalgyCancel(this);" })]),
   // NostalgyCreateElem("hbox", { }, buttons)
   NostalgyCreateHTMLElem("td",{ }, [buttons[0]])
  ])    ;

  return html1;
}

function NostalgyRemoveRow(r) {
  r.parentNode.removeChild(r);
}

function onNostalgyEditPrefsLoad() {
 document.addEventListener("dialogaccept", (event) => { onNostalgyAcceptChanges(); });
  NostalgyFolderSelectionBoxes();
 document.addEventListener("dialogextra2", (event) => { manage_emails.showHelpFile(); });


 nostalgy_gList = NostalgyEBI("display-table");
 nostalgy_gList.selectedIndex = -1;
 nostalgy_gList.getItemAtIndex = function(idx) {return nostalgy_gList.rows[idx];};
 nostalgy_gList.removeItemAt = function (idx) {nostalgy_gList.getItemAtIndex(idx).remove()}
 nostalgy_gList.setItemAtIndex = function(item, idx) { 
  // debugger;
   nostalgy_gList.rows[idx] = item;};
 nostalgy_gList.getRowCount = function() {return nostalgy_gList.rows.length;};
 nostalgy_gList.selected = function (idx) {
  nostalgy_gList.selectedIndex = idx;
  nostalgy_gList.rows[idx+1].className += " selected";
 };
 nostalgy_ruleTableBody = NostalgyEBI("nrules");
  nostalgy_folder_select = NostalgyEBI("folderselect");

  var prefs = PrefBranch();
  try {
   var r = NostalgyJSONEval(prefs.getStringPref("extensions.nostalgy.rules"));
   var i;
   for (i = 0; i < r.length; i++) { NostalgyCreateItem(r[i]); }
  } catch (ex) { }

 for (var n in nostalgy_completion_options)
   NostalgyEBI(n).checked = NostalgyGetBoolPref(prefs, n);


   NostalgyEBI("always_cc").checked = prefs.getBoolPref("extensions.manage_emails.showCC");
   
   NostalgyEBI("always_bcc").checked =  prefs.getBoolPref("extensions.manage_emails.showBCC");  



   NostalgyEBI("number_of_recent_folders").value = NostalgyGetIntPref(prefs, "number_of_recent_folders", 5);
 NostalgyEBI("predict_max_addresses_to_update").value = NostalgyGetIntPref(prefs, "predict_max_addresses_to_update", 100);

 nostalgy_key_rows = NostalgyEBI("nostalgy_key_rows");
 for (var i = 0; i < nostalgy_keys.length; i++) {
  var v = nostalgy_keys[i][2];
  try {
    v = prefs.getStringPref(nostalgy_kKeysPrefs + nostalgy_keys[i][0]);
  } catch (ex) { }
  nostalgy_key_rows.appendChild(NostalgyCreateKeyRow(nostalgy_keys[i][0],nostalgy_keys[i][1],v));
 }

 var a = prefs.getChildList(nostalgy_kKeysPrefs, { });
 for (var i in a) {
   var id = a[i].substr(nostalgy_kKeysPrefs.length);
   if (id.substr(0,1) == "_") {
     var n = parseInt(id.substr(1));
     try {
       if (n > nostalgy_max_custom) nostalgy_max_custom = n;
       var cmd = prefs.getStringPref(nostalgy_kCustomActionsPrefs + id);
       nostalgy_key_rows.appendChild(NostalgyCreateKeyRow(id,cmd,prefs.getStringPref(a[i])));
     } catch (ex) { }
   }
 }
 if (window.arguments) {  //coming from statusbar
 if (window.arguments[0] =="new") setTimeout(NostalgyDoNewRule,300);  // NostalgyDoNewRule();  
 //if (window.arguments[0] =="convert") setTimeout(NostalgyConvertToNewRule,300);  // NostalgyDoNewRule();  
 if (window.arguments[0] =="convert") setTimeout(manage_emails.ConvertToNewRule,300);  // NostalgyDoNewRule();  
}
}


function onNostalgyEditPrefsKeyPress(ev) {
  let inPrefWindow=true;
  try {
          let dummy=NostalgyEBI("number_of_recent_folders");
          if (dummy==null)  inPrefWindow=false;
  }

  catch (e) {
    inPrefWindow=false;
  };


  if (inPrefWindow) {
  // We don't want to act on Meta.  Necessary from thunderbird 18 on.
  if (ev.keyCode == KeyEvent.DOM_VK_META) return; 

  if (!nostalgy_wait_key && ((ev.keyCode == 46) || (ev.keyCode == 8))) NostalgyDoDelete();
  // should only to that in the relevant tab

  else if (nostalgy_wait_key && ev.keyCode == KeyEvent.DOM_VK_ESCAPE) {
    NostalgyStopEvent(ev);
    nostalgy_wait_key.value = nostalgy_wait_key_old;
    nostalgy_wait_key = null;
  } else if (nostalgy_wait_key) /* && (ev.keyCode != 13 || ev.ctrlKey || ev.altKey)) */ {
    NostalgyRecognize(ev,nostalgy_wait_key);
    nostalgy_wait_key = null;
  } else if (ev.keyCode == KeyEvent.DOM_VK_ESCAPE) {
    if
      (!confirm
       ("Do you really want to cancel all your changes to the preferences?"))
      NostalgyStopEvent(ev);
  }

}
}


function NostalgyRecognize(ev, tgt) {
  NostalgyStopEvent(ev);
  var k = NostalgyRecognizeKey(ev);
  if (k) tgt.value = k;
}

function NostalgyWaitKey(tgt) {
  if (nostalgy_wait_key) nostalgy_wait_key.value = nostalgy_wait_key_old;
  nostalgy_wait_key_old = tgt.value;
  tgt.value = "Enter key here";
  nostalgy_wait_key = tgt;
}

function NostalgyCancel(tgt) {
  if (tgt == nostalgy_wait_key) {
   var old = nostalgy_wait_key_old;
   setTimeout(function() {
      if (document.commandDispatcher.focusedElement != tgt) {
        tgt.value = old;
        if (tgt == nostalgy_wait_key) nostalgy_wait_key = null;
      }
   },500);
  }
}

function NostalgySelectFolder() {
  if (nostalgy_folder_select.value != "") {
    var folder = NostalgyResolveFolder(nostalgy_folder_select.value);
    if (folder) {
      var name = NostalgyFolderName(folder);
      nostalgy_max_custom++;
      var cmd = NostalgyEBI("cmdkind").selectedItem.value;
      nostalgy_key_rows.appendChild(NostalgyCreateKeyRow("_" + nostalgy_max_custom,cmd + " -> " + name,
                           "(disabled)"));
      nostalgy_folder_select.value = "";
      var e = NostalgyEBI("key__" + nostalgy_max_custom);
      e.focus();
      NostalgyWaitKey(e);
    }
  }
}

function NostalgySelectFolderForKey() {
//  console.log("NostalgySelectFolderForKey");
  if (nostalgy_folder_select.value != "") {
    let stpos = nostalgy_folder_select.value.indexOf(">>");
//    let foldername = attachment.url.substr(stpos+3);
    var folder = NostalgyResolveFolder(nostalgy_folder_select.value);
    if (folder) {
      var name = NostalgyFolderName(folder);
       nostalgy_folder_select.value = name;
    }
  }
}


function NostalgyDoRestart() {
  Components.classes["@mozilla.org/xre/app-info;1"].
  getService(Components.interfaces.nsIXULRuntime).invalidateCachesOnRestart();
  Services.startup.quit(Ci.nsIAppStartup.eRestart | Ci.nsIAppStartup.eForceQuit);
}


function NostalgyEmailRules() {
//  let fwd = self.document.getElementById('xnote-button-forward');
//  fwd.href = "mailto:?body=" + encodeURI( NostalgyMkPrefStr(););
var rules = NostalgyMkPrefStr();
}



//window.addEventListener("DOMContentLoaded", NostalgyDoNewRule, false);


window.addEventListener("load", onNostalgyEditPrefsLoad, false);
window.addEventListener("keypress", onNostalgyEditPrefsKeyPress, true);
