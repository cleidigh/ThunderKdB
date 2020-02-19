// based on http://dxr.mozilla.org/comm-central/source/comm/mail/components/compose/content/addressingWidgetOverlay.js

"use strict";

if (typeof ChromeUtils === "object" && typeof ChromeUtils.import === "function") {
  // New way of importing in TB67+
  var { Services } = ChromeUtils.import("resource://gre/modules/Services.jsm");
  try {
    var { MailServices } = ChromeUtils.import("resource:///modules/MailServices.jsm"); // TB63+
  } catch(ex) {
    var { MailServices } = ChromeUtils.import("resource:///modules/mailServices.js");
  }
} else {
  var { Services } = Components.utils.import("resource://gre/modules/Services.jsm", null); // Gecko 2+ (TB3.3)
  var { MailServices } = Components.utils.import("resource:///modules/mailServices.js", null); // Gecko 5-63 (TB-63)
}

top.MAX_RECIPIENTS = 1; /* for the initial listitem created in the XUL */

var inputElementType = "";
var selectElementType = "";
var selectElementIndexTable = null;

var gNumberOfCols = 0;

var gDragService = Cc["@mozilla.org/widget/dragservice;1"].
                   getService(Ci.nsIDragService);

function awGetMaxRecipients()
{
  return top.MAX_RECIPIENTS;
}

function awGetNumberOfCols()
{
  if (gNumberOfCols === 0) {
    var listbox = document.getElementById("addressingWidget");
    // var listCols = listbox.getElementsByTagName("treecol");
    var listCols;
    if (gAppInfoID === THUNDERBIRD_ID) {
      listCols = listbox.getElementsByTagName("treecol");
    } else {
      listCols = listbox.getElementsByTagName("listcol");
    }
    gNumberOfCols = listCols.length;
    if (!gNumberOfCols) {
      // if no cols defined, that means we have only one!
      gNumberOfCols = 1;
    }
  }

  return gNumberOfCols;
}

/**
 * Adjust the default and minimum number of visible recipient rows for addressingWidget
 */
function awInitializeNumberOfRowsShown()
{
  let msgHeadersToolbar = document.getElementById("MsgHeadersToolbar");
  let addressingWidget = document.getElementById("addressingWidget");
  let addressingWidgetItem = addressingWidget.getElementsByClassName("addressingWidgetItem")[0];
  let awNumRowsShownDefault =
    Services.prefs.getIntPref("extensions.mailredirect.addresswidget.numRowsShownDefault");

  // Work around bug 966655: extraHeight 2 pixels for msgHeadersToolbar ensures
  // visibility of recipient rows per awNumRowsShownDefault and prevents scrollbar
  // on empty Address Widget, depending on OS screen resolution dpi scaling
  // (> 100%; thresholds differ).
  let extraHeight;
  if (gAppInfoID === THUNDERBIRD_ID) {
    extraHeight = 2;
  } else {
    extraHeight = 4;
  }

  // Set minimum number of rows shown for address widget, per hardwired
  // rows="1" attribute of addressingWidget, to prevent resizing the
  // subject and format toolbar over the address widget.
  // This lets users shrink the address widget to one row (with delicate UX)
  // and thus maximize the space available for composition body,
  // especially on small screens.
  let toolbarRect = msgHeadersToolbar.getBoundingClientRect();
  msgHeadersToolbar.minHeight = toolbarRect.height;

  // Set default number of rows shown for address widget.
  addressingWidget.setAttribute("rows", awNumRowsShownDefault);
  addressingWidget.height = awNumRowsShownDefault * addressingWidgetItem.getBoundingClientRect().height +
    extraHeight;

  // Update addressingWidget internals.
  awCreateOrRemoveDummyRows();
}

function awInputElementName()
{
  if (inputElementType === "") {
    inputElementType = document.getElementById("addressCol2#1").localName;
  }
  return inputElementType;
}

function awSelectElementName()
{
  if (selectElementType === "") {
    selectElementType = document.getElementById("addressCol1#1").localName;
  }
  return selectElementType;
}

// TODO: replace awGetSelectItemIndex with recipient type index constants

function awGetSelectItemIndex(itemData)
{
  if (selectElementIndexTable === null) {
    selectElementIndexTable = new Object();
    var selectElem = document.getElementById("addressCol1#1");
    for (var i = 0; i < selectElem.menupopup.childNodes.length; i++) {
      var aData = selectElem.menupopup.childNodes[i].getAttribute("value");
      selectElementIndexTable[aData] = i;
    }
  }

  return selectElementIndexTable[itemData];
}

function Recipients2CompFields(msgCompFields)
{
  if (!msgCompFields) {
    dumper.dump("Message Compose Error: msgCompFields is null (ExtractRecipients)");
    return;
  }

  var i = 1;
  var addrTo = "";
  var addrCc = "";
  var addrBcc = "";
  var to_Sep = "";
  var cc_Sep = "";
  var bcc_Sep = "";

  var recipientType;
  var inputField;
  var fieldValue;
  var recipient;
  while ((inputField = awGetInputElement(i))) {
    fieldValue = inputField.value;

    if (fieldValue !== "") {
      recipientType = awGetPopupElement(i).value;
      recipient = null;

      switch (recipientType) {
        case "addr_to"    :
        case "addr_cc"    :
        case "addr_bcc"   :
          try {
            let headerParser = MailServices.headerParser;
            recipient =
              headerParser.makeFromDisplayAddress(fieldValue, {}).map(fullValue =>
                headerParser.makeMimeAddress(fullValue.name, fullValue.email))
              .join(", ");
          } catch (ex) {
            recipient = fieldValue;
          }
          break;
      }

      switch (recipientType) {
        case "addr_to"    : addrTo += to_Sep + recipient; to_Sep = ",";    break;
        case "addr_cc"    : addrCc += cc_Sep + recipient; cc_Sep = ",";    break;
        case "addr_bcc"   : addrBcc += bcc_Sep + recipient; bcc_Sep = ","; break;
      }
    }
    i ++;
  }

  msgCompFields.to = addrTo;
  msgCompFields.cc = addrCc;
  msgCompFields.bcc = addrBcc;
}

function awSetInputAndPopupId(inputElem, popupElem, rowNumber)
{
  popupElem.id = "addressCol1#" + rowNumber;
  inputElem.id = "addressCol2#" + rowNumber;
  inputElem.setAttribute("aria-labelledby", popupElem.id);
}

/**
 * Set value of the recipient input field at row rowNumber and set up
 * the recipient type menulist.
 *
 * @param inputElem                 recipient input element
 * @param inputValue                recipient value (address)
 * @param popupElem                 recipient type menulist element
 * @param popupValue
 * @param aNotifyRecipientsChanged  Notify that the recipients have changed.
 *                                  Generally we notify unless recipients are
 *                                  added in batch when the caller takes care
 *                                  of the notification.
 */
function awSetInputAndPopupValue(inputElem, inputValue, popupElem, popupValue, rowNumber, aNotifyRecipientsChanged = true)
{
  inputElem.value = inputValue.trimLeft();

  popupElem.selectedItem = popupElem.menupopup.childNodes[awGetSelectItemIndex(popupValue)];

  if (rowNumber >= 0) {
    awSetInputAndPopupId(inputElem, popupElem, rowNumber);
  }

  _awSetAutoComplete(popupElem, inputElem);

  if (aNotifyRecipientsChanged) {
    onRecipientsChanged(true);
  }
}

function _awSetInputAndPopup(inputValue, popupValue, parentNode, templateNode)
{
  top.MAX_RECIPIENTS++;

  var newNode = templateNode.cloneNode(true);
  parentNode.appendChild(newNode); // we need to insert the new node before we set the value of the select element!

  var input = newNode.getElementsByTagName(awInputElementName());
  var select = newNode.getElementsByTagName(awSelectElementName());

  if (input && input.length === 1 && select && select.length === 1) {
    awSetInputAndPopupValue(input[0], inputValue, select[0], popupValue, top.MAX_RECIPIENTS)
  }
}

/**
 * Adds a batch of new rows matching recipientType and drops in the array of addresses.
 *
 * @param aRecipientType  Type of recipient, e.g. "addr_to".
 * @param aAddressArray   An array of recipient addresses (strings) to add.
 */
function awAddRecipientsArray(aRecipientType, aAddressArray)
{
  // Find rows that are empty so that we can fill them.
  let emptyRows = [];
  for (let row = 1; row <= top.MAX_RECIPIENTS; row ++) {
    if (awGetInputElement(row).value === "") {
      emptyRows.push(row);
    }
  }

  // Push the new recipients into the found empty rows or append new rows when needed.
  let row = 1;
  for (let address of aAddressArray) {
    if (emptyRows.length > 0) {
      row = emptyRows.shift();
    } else {
      awAppendNewRow(false);
      row = top.MAX_RECIPIENTS;
    }

    awSetInputAndPopupValue(awGetInputElement(row), address, awGetPopupElement(row), aRecipientType,
                            row, false);
  }

  // Be sure we still have an empty row left.
  if ((emptyRows.length === 0) && (awGetInputElement(top.MAX_RECIPIENTS).value !== "")) {
    // Insert empty row at the end and focus.
    awAppendNewRow(true);
    awSetInputAndPopupValue(awGetInputElement(top.MAX_RECIPIENTS), "",
    awGetPopupElement(top.MAX_RECIPIENTS), "addr_to",
    top.MAX_RECIPIENTS, false);
  } else {
    // Focus the next empty row, if any, or the pre-existing empty last row.
    row = (emptyRows.length > 0) ? emptyRows.shift() : top.MAX_RECIPIENTS;
    awSetFocus(row, awGetInputElement(row));
  }

  onRecipientsChanged(true);
}

/**
 * Adds a new row matching recipientType and drops in the single address.
 *
 * This is mostly used by addons, even though they should use AddRecipient().
 *
 * @param aRecipientType  Type of recipient, e.g. addr_to.
 * @param aAddress        A string with recipient address.
 */
function awAddRecipient(recipientType, address)
{
  for (var row = 1; row <= top.MAX_RECIPIENTS; row++) {
    if (awGetInputElement(row).value === "") {
      break;
    }
  }

  if (row > top.MAX_RECIPIENTS) {
    awAppendNewRow(false);
  }
  awSetInputAndPopupValue(awGetInputElement(row), address, awGetPopupElement(row), recipientType, row);

  /* be sure we still have an empty row left at the end */
  if (row === top.MAX_RECIPIENTS) {
    awAppendNewRow(true);
    awSetInputAndPopupValue(awGetInputElement(top.MAX_RECIPIENTS), "", awGetPopupElement(top.MAX_RECIPIENTS), recipientType, top.MAX_RECIPIENTS);
  }
}

function awCleanupRows()
{
  var maxRecipients = top.MAX_RECIPIENTS;
  var rowID = 1;

  for (var row = 1; row <= maxRecipients; row++) {
    var inputElem = awGetInputElement(row);
    if (inputElem.value === "" && row < maxRecipients) {
      awRemoveRow(awGetRowByInputElement(inputElem));
    } else {
      awSetInputAndPopupId(inputElem, awGetPopupElement(row), rowID);
      rowID++;
    }
  }
}

function awDeleteRow(rowToDelete)
{
  /* When we delete a row, we must reset the id of other rows in order to not break the sequence */
  var maxRecipients = top.MAX_RECIPIENTS;
  awRemoveRow(rowToDelete);

  // assume 2 column update (input and popup)
  for (var row = rowToDelete + 1; row <= maxRecipients; row++) {
    awSetInputAndPopupId(awGetInputElement(row), awGetPopupElement(row), (row-1));
  }
  updateSendLock();
}

function awClickEmptySpace(target, setFocus)
{
  if (gAppInfoID === THUNDERBIRD_ID) {
    if (document.getElementById("addressCol2#1").disabled ||
        target === null ||
        target.localName !== "hbox") {
      return;
    }
  } else {
    if (document.getElementById("addressCol2#1").disabled ||
        target === null ||
        (target.localName !== "listboxbody" &&
         target.localName !== "listcell" &&
         target.localName !== "listitem")) {
      return;
    }
  }

  let lastInput = awGetInputElement(top.MAX_RECIPIENTS);

  if (lastInput && lastInput.value) {
    awAppendNewRow(setFocus);
  } else {
    if (setFocus) {
      awSetFocusTo(lastInput);
    }
  }
}

function awReturnHit(inputElement)
{
  let row = awGetRowByInputElement(inputElement);
  let nextInput = awGetInputElement(row+1);

  if (!nextInput) {
    if (inputElement.value) {
      awAppendNewRow(true);
    }
  } else {
    nextInput.select();
    awSetFocusTo(nextInput);
  }
}

function awDeleteAddressOnClick(deleteAddressElement)
{
  awDeleteHit(deleteAddressElement.parentNode.parentNode
                                  .querySelector("textbox.textbox-addressingWidget"),
                                  true);
}

function awDeleteHit(inputElement, deleteForward = false)
{
  var row = awGetRowByInputElement(inputElement);

  // Don't delete the row if it's the last one remaining, just reset it.
  if (top.MAX_RECIPIENTS <= 1) {
    inputElement.value = "";
    onRecipientsChanged(true);
    updateSendLock();
    return;
  }

  // Set the focus to the input field of the next/previous row according to
  // the direction of deleting if possible.
  // Note: awSetFocusTo() is asynchronous, i.e. we'll focus after row removal.
  if (!deleteForward && row > 1 ||
      deleteForward && row == top.MAX_RECIPIENTS) {
    // We're deleting backwards, but not the first row,
    // or forwards on the last row: Focus previous row.
    awSetFocusTo(awGetInputElement(row - 1));
  } else {
    // We're deleting forwards, but not the last row,
    // or backwards on the first row: Focus next row.
    awSetFocusTo(awGetInputElement(row + 1));
  }

  // Delete the row.
  awDeleteRow(row);
}

// If we add a menulist to the DOM, it has some child nodes added to it
// by the menulist custom element. If we then clone the menulist and add
// it to the DOM again, more child nodes are added and we end up with
// bug 1525828. This function clones any menulist as it originally was.
function _menulistFriendlyClone(element)
{
  let clone = element.cloneNode(false);
  if (element.localName === "menulist") {
    clone.appendChild(element.menupopup.cloneNode(true));
    return clone;
  }
  for (let child of element.children) {
    clone.appendChild(_menulistFriendlyClone(child));
  }
  return clone;
}

function awAppendNewRow(setFocus)
{
  var listbox = document.getElementById("addressingWidget");
  var listitem1 = awGetListItem(1);

  if (listbox && listitem1) {
    var lastRecipientType = awGetPopupElement(top.MAX_RECIPIENTS).value;

    var nextDummy = awGetNextDummyRow();
    var newNode = _menulistFriendlyClone(listitem1);
    if (nextDummy) {
      listbox.replaceChild(newNode, nextDummy);
    } else {
      listbox.appendChild(newNode);
    }

    top.MAX_RECIPIENTS++;

    var input = newNode.getElementsByTagName(awInputElementName());
    if (input && input.length === 1) {
      input[0].value = "";

      // We always clone the first row.  The problem is that the first row
      // could be focused.  When we clone that row, we end up with a cloned
      // XUL textbox that has a focused attribute set.  Therefore we think
      // we're focused and don't properly refocus.  The best solution to this
      // would be to clone a template row that didn't really have any presentation,
      // rather than using the real visible first row of the listbox.
      //
      // For now we'll just put in a hack that ensures the focused attribute
      // is never copied when the node is cloned.
      if (input[0].getAttribute("focused") !== "") {
        input[0].removeAttribute("focused");
      }
    }
    var select = newNode.getElementsByTagName(awSelectElementName());
    if (select && select.length === 1) {
      select[0].selectedIndex = awGetSelectItemIndex(lastRecipientType);

      awSetInputAndPopupId(input[0], select[0], top.MAX_RECIPIENTS);

      if (input) {
        _awSetAutoComplete(select[0], input[0]);
      }
    }

    // focus on new input widget
    if (setFocus && input[0]) {
      awSetFocusTo(input[0]);
    }
  }
}

// functions for accessing the elements in the addressing widget

/**
 * Returns the recipient type popup for a row.
 *
 * @param row  Index of the recipient row to return. Starts at 1.
 * @return     This returns the menulist (not its child menupopup), despite the function name.
 */
function awGetPopupElement(row)
{
  return document.getElementById("addressCol1#" + row);
}

/**
 * Returns the recipient type popup for a row.
 *
 * @param row  Index of the recipient row to return. Starts at 1.
 * @return     This returns the menulist (not its child menupopup), despite the function name.
 */
function awGetInputElement(row)
{
  return document.getElementById("addressCol2#" + row);
}

function awGetListItem(row)
{
  var listbox = document.getElementById("addressingWidget");

  if (listbox && row > 0) {
    // var listitems = listbox.getElementsByTagName("richlistitem");
    var listitems;
    if (gAppInfoID === THUNDERBIRD_ID) {
      listitems = listbox.getElementsByTagName("richlistitem");
    } else {
      listitems = listbox.getElementsByTagName("listitem");
    }
    if (listitems && listitems.length >= row) {
      return listitems[row-1];
    }
  }
  return 0;
}

function awGetRowByInputElement(inputElement)
{
  var row = 0;
  if (inputElement) {
    var listitem = inputElement.parentNode.parentNode;
    while (listitem) {
      // if (listitem.localName === "richlistitem")
      if (listitem.localName === "richlistitem" ||
          listitem.localName === "listitem") {
        ++row;
      }
      listitem = listitem.previousSibling;
    }
  }
  return row;
}

function awRemoveRow(row)
{
  var listbox = document.getElementById("addressingWidget");

  awRemoveNodeAndChildren(listbox, awGetListItem(row));
  awFitDummyRows();

  top.MAX_RECIPIENTS--;
}

/**
 * Set focus to the specified element, typically a recipient input element.
 * We do this asynchronously to allow other processes like adding or removing rows
 * to complete before shifting focus.
 *
 * @param element  the element to receive focus asynchronously
 */
function awSetFocusTo(element)
{
  // Remember the (input) element to focus for asynchronous focusing, so that we
  // play safe if this gets called again and the original element gets removed
  // before we can focus it.
  top.awInputToFocus = element;
  setTimeout(_awSetFocusTo, 0);
}

function _awSetFocusTo()
{
  top.awInputToFocus.focus();
}

function awRemoveNodeAndChildren(parent, nodeToRemove)
{
  nodeToRemove.parentNode.removeChild(nodeToRemove);
}

function awSetFocus(row, inputElement)
{
  top.awRow = row;
  top.awInputElement = inputElement;
  setTimeout(function() { _awSetFocus() }, 0);
}

function _awSetFocus()
{
  var listbox = document.getElementById("addressingWidget");
  var theNewRow = awGetListItem(top.awRow);
  listbox.ensureElementIsVisible(theNewRow);
  top.awInputElement.focus();
}

function awGetNumberOfRecipients()
{
  return top.MAX_RECIPIENTS;
}

function DragOverAddressingWidget(event)
{
  var validFlavor = false;
  var dragSession = dragSession = gDragService.getCurrentSession();

  if (dragSession.isDataFlavorSupported("text/x-moz-address")) {
    validFlavor = true;
  }
  if (validFlavor) {
    dragSession.canDrop = true;
  }
}

function DropOnAddressingWidget(event)
{
  var dragSession = gDragService.getCurrentSession();

  var trans = Cc["@mozilla.org/widget/transferable;1"].
              createInstance(Ci.nsITransferable);
  trans.init(getLoadContext());
  trans.addDataFlavor("text/x-moz-address");

  for (var i = 0; i < dragSession.numDropItems; ++i) {
    dragSession.getData(trans, i);
    var dataObj = new Object();
    var bestFlavor = new Object();
    var len = new Object();
    trans.getAnyTransferData(bestFlavor, dataObj, len);
    if (dataObj) {
      dataObj = dataObj.value.QueryInterface(Ci.nsISupportsString);
    }
    if (!dataObj) {
      continue;
    }

    // pull the address out of the data object
    var address = dataObj.data.substring(0, len.value);
    if (!address) {
      continue;
    }
    DropRecipient(event.target, address);
  }
}

function DropRecipient(target, recipient)
{
  // break down and add each address
  return parseAndAddAddresses(recipient, awGetInputElement(top.MAX_RECIPIENTS).value);
}

function _awSetAutoComplete(selectElem, inputElem)
{
  let params = JSON.parse(inputElem.getAttribute("autocompletesearchparam"));
  params.type = selectElem.value;
  inputElem.setAttribute("autocompletesearchparam", JSON.stringify(params));
}

function awSetAutoComplete(rowNumber)
{
  var inputElem = awGetInputElement(rowNumber);
  var selectElem = awGetPopupElement(rowNumber);
  _awSetAutoComplete(selectElem, inputElem)
}

function awRecipientTextCommand(enterEvent, element)
{
  // Only add new row when enter was hit (not for tab/autocomplete select).
  if (enterEvent) {
    awReturnHit(element);
  }
}

// Called when an autocomplete session item is selected and the status of
// the session it was selected from is nsIAutoCompleteStatus::failureItems.
//
// As of this writing, the only way that can happen is when an LDAP
// autocomplete session returns an error to be displayed to the user.
//
// There are hardcoded messages in here, but these are just fallbacks for
// when string bundles have already failed us.
//
function awRecipientErrorCommand(errItem, element)
{
  // remove the angle brackets from the general error message to construct
  // the title for the alert.  someday we'll pass this info using a real
  // exception object, and then this code can go away.
  //
  var generalErrString;
  if (errItem.value !== "") {
    generalErrString = errItem.value.slice(1, errItem.value.length-1);
  } else {
    generalErrString = "Unknown LDAP server problem encountered";
  }

  // try and get the string of the specific error to contruct the complete
  // err msg, otherwise fall back to something generic.  This message is
  // handed to us as an nsISupportsString in the param slot of the
  // autocomplete error item, by agreement documented in
  // nsILDAPAutoCompFormatter.idl
  //
  var specificErrString = "";
  try {
    var specificError = errItem.param.QueryInterface(Ci.nsISupportsString);
    specificErrString = specificError.data;
  } catch (ex) { }
  if (specificErrString === "") {
    specificErrString = "Internal error";
  }

  Services.prompt.alert(window, generalErrString, specificErrString);
}

function awRecipientKeyPress(event, element)
{
  switch(event.key) {
    case "Enter":
    case "Tab":
      // str.includes is new to ECMAScript 6
      if (typeof String.prototype.includes !== "function") {
        dumper.dump("awRecipientKeyPress defineProperty includes");
        Object.defineProperty(String.prototype, "includes", {
          enumerable: false,
          configurable: true,
          writable: false,
          value: function() {
            "use strict";
            var start = 0;
            if (typeof arguments[1] === "number") {
              start = arguments[1];
            }
            if (this.length < arguments[0].length + start) {
              return false;
            } else {
              return this.indexOf(arguments[0], start) !== -1;
            }
          }
        });
      }
      // If the recipient input text contains a comma (we also convert pasted
      // line feeds into commas), check if multiple recipients and add them
      // accordingly. Handle semicolons too.
      if (element.value.includes(",") || element.value.includes(";")) {
        var addresses = element.value;
        element.value = ""; // Clear out the current line so we don't try to autocomplete it.
        parseAndAddAddresses(addresses, awGetPopupElement(awGetRowByInputElement(element)).value);
      } else if (event.key === "Tab") {
        // Do nothing
      } else if (event.key === "Enter") {
        awReturnHit(element);
      }

      break;
  }
}

function awRecipientKeyDown(event, inputElement)
{
  switch (event.key) {
    // Enable deletion of empty recipient rows.
    case "Delete":
    case "Backspace":
      if (inputElement.textLength == 1 && event.repeat) {
        // User is holding down Delete or Backspace to delete recipient text
        // inline and is now deleting the last character: Set flag to
        // temporarily block row deletion.
        top.awRecipientInlineDelete = true;
      }
      if (!inputElement.value && !event.altKey) {
        // When user presses DEL or BACKSPACE on an empty row, and it's not an
        // ongoing inline deletion, and not ALT+BACKSPACE for input undo,
        // we delete the row.
        if (top.awRecipientInlineDelete && !event.repeat) {
          // User has released and re-pressed Delete or Backspace key
          // after holding them down to delete recipient text inline:
          // unblock row deletion.
          top.awRecipientInlineDelete = false;
        }
        if (!top.awRecipientInlineDelete) {
          let deleteForward = (event.key == "Delete");
          awDeleteHit(inputElement, deleteForward);
        }
      }
      break;

    // Enable browsing the list of recipients up and down with cursor keys.
    case "ArrowDown":
    case "ArrowUp":
      // Only browse recipients if the autocomplete popup is not open.
      if (!inputElement.popupOpen) {
        let row = awGetRowByInputElement(inputElement);
        let down = (event.key == "ArrowDown");
        let noEdgeRow = down ? row < top.MAX_RECIPIENTS : row > 1;
        if (noEdgeRow) {
          let targetRow = down ? row + 1 : row - 1;
          awSetFocusTo(awGetInputElement(targetRow));
        }
      }
      break;
  }
}

/* ::::::::::: addressing widget dummy rows ::::::::::::::::: */

var gAWContentHeight = 0;
var gAWRowHeight = 0;

function awFitDummyRows()
{
  awCalcContentHeight();
  awCreateOrRemoveDummyRows();
}

function awCreateOrRemoveDummyRows()
{
  let listbox = document.getElementById("addressingWidget");
  let listboxHeight = listbox.getBoundingClientRect().height;
  // remove rows to remove scrollbar
  let kids = listbox.querySelectorAll("[_isDummyRow]");
  for (let i = kids.length-1; gAWContentHeight > listboxHeight && i >= 0; --i) {
    gAWContentHeight -= gAWRowHeight;
    kids[i].remove();
  }

  // add rows to fill space
  if (gAWRowHeight) {
    while (gAWContentHeight + gAWRowHeight < listboxHeight) {
      awCreateDummyItem(listbox);
      gAWContentHeight += gAWRowHeight;
    }
  }
}

function awCalcContentHeight()
{
  var listbox = document.getElementById("addressingWidget");
  // var items = listbox.getElementsByTagName("richlistitem");
  var items;
  if (gAppInfoID === THUNDERBIRD_ID) {
    var items = listbox.getElementsByTagName("richlistitem");
  } else {
    var items = listbox.getElementsByTagName("listitem");
  }

  gAWContentHeight = 0;
  if (items.length > 0) {
    // all rows are forced to a uniform height in xul listboxes, so
    // find the first listitem with a boxObject and use it as precedent
    var i = 0;
    do {
      gAWRowHeight = items[i].getBoundingClientRect().height;
      ++i;
    } while (i < items.length && !gAWRowHeight);
    gAWContentHeight = gAWRowHeight*items.length;
  }
}

function awCreateDummyItem(aParent)
{
  var listbox = document.getElementById("addressingWidget");
  // var item = listbox.getElementsByTagName("richlistitem")[0];
  var item = listbox.getElementsByClassName("addressingWidgetItem")[0]; // Works both for Thunderbird and SeaMonkey

  // var titem = document.createElement("richlistitem");
  var titem = (typeof document.createXULElement === "function")
    ? document.createXULElement(item.tagName)
    : document.createElement(item.tagName);
  titem.setAttribute("_isDummyRow", "true");
  titem.setAttribute("class", "dummy-row");
  titem.style.height = item.getBoundingClientRect().height + "px";

  for (let i = 0; i < awGetNumberOfCols(); i++) {
    let cell = awCreateDummyCell(titem);
    if (item.children[i].hasAttribute("style")) {
      cell.setAttribute("style", item.children[i].getAttribute("style"));
    }
    if (item.children[i].hasAttribute("flex")) {
      cell.setAttribute("flex", item.children[i].getAttribute("flex"));
    }
  }

  if (aParent) {
    aParent.appendChild(titem);
  }
  return titem;
}

function awCreateDummyCell(aParent)
{
  var cell = (typeof document.createXULElement === "function")
    ? document.createXULElement("hbox")
    : document.createElement("hbox");
  cell.setAttribute("class", "addressingWidgetCell dummy-row-cell");
  if (aParent) {
    aParent.appendChild(cell);
  }
  return cell;
}

function awGetNextDummyRow()
{
  // gets the next row from the top down
  return document.querySelector("#addressingWidget > [_isDummyRow]");
}

function awSizerListen()
{
  // when splitter is clicked, fill in necessary dummy rows each time the mouse is moved
  awCalcContentHeight(); // precalculate
  document.addEventListener("mousemove", awSizerMouseMove, true);
  document.addEventListener("mouseup", awSizerMouseUp, false);
}

function awSizerMouseMove()
{
  awCreateOrRemoveDummyRows();
}

function awSizerMouseUp()
{
  document.removeEventListener("mousemove", awSizerMouseMove, true);
  document.removeEventListener("mouseup", awSizerMouseUp, false);
}

function awSizerResized(aSplitter)
{
  // set the height on the listbox rather than on the toolbox
  var listbox = document.getElementById("addressingWidget");
  listbox.height = listbox.getBoundingClientRect().height;
  // remove all the heights set on the splitter's previous siblings
  for (let sib = aSplitter.previousSibling; sib; sib = sib.previousSibling) {
    sib.removeAttribute("height");
  }
}

// Given an arbitrary block of text like a comma delimited list of names or a names separated by spaces,
// we will try to autocomplete each of the names and then take the FIRST match for each name, adding it the
// addressing widget on the compose window.

var gAutomatedAutoCompleteListener = null;

function parseAndAddAddresses(addressText, recipientType)
{
  // strip any leading >> characters inserted by the autocomplete widget
  var strippedAddresses = addressText.replace(/.* >> /, "");

  let addresses = MailServices.headerParser.makeFromDisplayAddress(strippedAddresses);

  if (addresses.length > 0) {
    // we need to set up our own autocomplete session and search for results
    if (!gAutomatedAutoCompleteListener) {
      gAutomatedAutoCompleteListener = new AutomatedAutoCompleteHandler();
    }
    gAutomatedAutoCompleteListener.init(addresses.map(addr => addr.toString()), recipientType);
  }
}

function AutomatedAutoCompleteHandler()
{
}

// state driven self contained object which will autocomplete a block of addresses without any UI.
// force picks the first match and adds it to the addressing widget, then goes on to the next
// name to complete.

AutomatedAutoCompleteHandler.prototype =
{
  param: this,
  sessionName: null,
  namesToComplete: null,
  numNamesToComplete: 0,
  indexIntoNames: 0,
  finalAddresses: null,

  numSessionsToSearch: 0,
  numSessionsSearched: 0,
  recipientType: null,
  searchResults: null,

  init: function(namesToComplete, recipientType)
  {
    this.indexIntoNames = 0;
    this.numNamesToComplete = namesToComplete.length;
    this.namesToComplete = namesToComplete;
    this.finalAddresses = [];

    this.recipientType = recipientType ? recipientType : "addr_to";

    // set up the auto complete sessions to use
    this.autoCompleteNextAddress();
  },

  autoCompleteNextAddress: function()
  {
    this.numSessionsToSearch = 0;
    this.numSessionsSearched = 0;
    this.searchResults = [];

    if (this.indexIntoNames < this.numNamesToComplete) {
      if (this.namesToComplete[this.indexIntoNames]) {
        /* XXX This used to work, until switching to the new toolkit broke it
           We should fix it see bug 456550.
        if (typeof String.prototype.includes !== "function") {
          // dumper.dump("autoCompleteNextAddress defineProperty includes");
          Object.defineProperty(String.prototype, "includes", {
            enumerable: false,
            configurable: true,
            writable: false,
            value: function() {
              "use strict";
              var start = 0;
              if (typeof arguments[1] === "number") {
                start = arguments[1];
              }
              if (this.length < arguments[0].length + start) {
                return false;
              } else {
                return this.indexOf(arguments[0], start) !== -1;
              }
            }
          });
        }
        if (!this.namesToComplete[this.indexIntoNames].includes("@")) {
          // don't autocomplete if address has an @ sign in it
          // make sure total session count is updated before we kick off ANY actual searches
          if (gAutocompleteSession) {
            this.numSessionsToSearch++;
          }

          if (gLDAPSession && gCurrentAutocompleteDirectory) {
            this.numSessionsToSearch++;
          }

          if (gAutocompleteSession) {
             gAutocompleteSession.onAutoComplete(this.namesToComplete[this.indexIntoNames], null, this);
             // AB searches are actually synchronous. So by the time we get here we have already looked up results.

             // if we WERE going to also do an LDAP lookup, then check to see if we have a valid match in the AB, if we do
             // don't bother with the LDAP search too just return

             if (gLDAPSession && gCurrentAutocompleteDirectory && this.searchResults[0] && this.searchResults[0].defaultItemIndex !== -1) {
               this.processAllResults();
               return;
             }
          }

          if (gLDAPSession && gCurrentAutocompleteDirectory) {
            gLDAPSession.onStartLookup(this.namesToComplete[this.indexIntoNames], null, this);
          }
        }
        */

        if (!this.numSessionsToSearch) {
          this.processAllResults(); // ldap and ab are turned off, so leave text alone
        }
      }
    } else {
      this.finish();
    }
  },

  onStatus: function(aStatus)
  {
    return;
  },

  onAutoComplete: function(aResults, aStatus)
  {
    // store the results until all sessions are done and have reported in
    if (aResults) {
      this.searchResults[this.numSessionsSearched] = aResults;
    }

    this.numSessionsSearched++; // bump our counter

    if (this.numSessionsToSearch <= this.numSessionsSearched) {
      setTimeout(function() { gAutomatedAutoCompleteListener.processAllResults() } , 0); // we are all done
    }
  },

  processAllResults: function()
  {
    // Take the first result and add it to the compose window
    var addressToAdd;

    // loop through the results looking for the non default case (default case is the address book with only one match, the default domain)
    var sessionIndex;

    var searchResultsForSession;

    for (sessionIndex in this.searchResults) {
      searchResultsForSession = this.searchResults[sessionIndex];
      if (searchResultsForSession && searchResultsForSession.defaultItemIndex > -1) {
        addressToAdd = searchResultsForSession.items.QueryElementAt(searchResultsForSession.defaultItemIndex, Ci.nsIAutoCompleteItem).value;
        break;
      }
    }

    // still no match? loop through looking for the -1 default index
    if (!addressToAdd) {
      for (sessionIndex in this.searchResults) {
        searchResultsForSession = this.searchResults[sessionIndex];
        if (searchResultsForSession && searchResultsForSession.defaultItemIndex === -1) {
          addressToAdd = searchResultsForSession.items.QueryElementAt(0, Ci.nsIAutoCompleteItem).value;
          break;
        }
      }
    }

    // no matches anywhere...just use what we were given
    if (!addressToAdd) {
      addressToAdd = this.namesToComplete[this.indexIntoNames];
    }

    this.finalAddresses.push(addressToAdd);

    this.indexIntoNames++;
    this.autoCompleteNextAddress();
  },

  finish: function()
  {
    // This will now append all the recipients, set the focus on a new
    // available row, and make sure it is visible.
    awAddRecipientsArray(this.recipientType, this.finalAddresses);
  },

  QueryInterface: function(iid)
  {
    if (iid.equals(Ci.nsIAutoCompleteListener) ||
        iid.equals(Ci.nsISupports)) {
      return this;
    }
    throw Components.results.NS_NOINTERFACE;
  }
}

// Returns the load context for the current window
function getLoadContext()
{
  return window.QueryInterface(Ci.nsIInterfaceRequestor)
               .getInterface(Ci.nsIWebNavigation)
               .QueryInterface(Ci.nsILoadContext);
}
