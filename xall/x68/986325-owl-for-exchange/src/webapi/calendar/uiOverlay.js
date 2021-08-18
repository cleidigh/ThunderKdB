var gTextToHtmlConverter = Cc["@mozilla.org/txttohtmlconv;1"].getService(Ci.mozITXTToHTMLConv);
var gParserUtils = Cc["@mozilla.org/parserutils;1"].getService(Ci.nsIParserUtils);

/**
 * Get the X-ALT-DESC property of an item, but only if its FMTTYPE property
 * parameter is "text/html" or missing (because storage doesn't save it).
 */
function getDescriptionHTML(aItem) {
  return [null, "text/html"].includes(aItem.getPropertyParameter("X-ALT-DESC", "FMTTYPE")) ? aItem.getProperty("X-ALT-DESC") : null;
}

/**
 * Get a document fragment for the specified document containing the
 * (sanitised) HTML (where available) or text ("uplifted" to HTML).
 */
function textToHtmlDocumentFragment(aText, aDocument, aHTML) {
  if (!aHTML) {
    aHTML = gTextToHtmlConverter.scanTXT(aText, Ci.mozITXTToHTMLConv.kStructPhrase | Ci.mozITXTToHTMLConv.kGlyphSubstitution | Ci.mozITXTToHTMLConv.kURLs).replace(/\r?\n/g, "<br>");
  }
  // Sanitise and convert the HTML into a document fragment.
  let flags = gParserUtils.SanitizerDropForms | gParserUtils.SanitizerDropMedia;
  let context = aDocument.createElement("div");
  return gParserUtils.parseFragment(aHTML, flags, false, aDocument.documentURIObject, context);
}

function overlayListener(aDocument) {
  try {
    if (aDocument.documentURI == "chrome://messenger/content/messenger.xhtml") {
      let getPreviewForItem = aDocument.defaultView.getPreviewForItem;
      aDocument.defaultView.getPreviewForItem = function(aItem, aIsTooltip = true) {
        let preview = getPreviewForItem(aItem, aIsTooltip);
        let descriptionHTML = getDescriptionHTML(aItem);
        if (aIsTooltip && preview && aItem.getProperty("DESCRIPTION") && descriptionHTML) {
          let descriptionBox = preview.lastElementChild;
          descriptionBox.replaceChildren(textToHtmlDocumentFragment(null, aDocument, descriptionHTML));
          descriptionBox.style.whiteSpace = "normal";
        }
        return preview;
      };
      let modifyEventWithDialog = aDocument.defaultView.modifyEventWithDialog;
      aDocument.defaultView.modifyEventWithDialog = function(aItem, job = null, aPromptOccurrence, initialDate = null, aCounterProposal) {
        let calendar = aItem.calendar;
        if (calendar instanceof Ci.calISchedulingSupport) {
          if (calendar.isInvitation(aItem)) {
            aPromptOccurrence = false;
          }
        }
        modifyEventWithDialog(aItem, job, aPromptOccurrence, initialDate, aCounterProposal);
      };
    } else if (aDocument.documentURI == "chrome://calendar/content/calendar-summary-dialog.xhtml") {
      let onLoad = aDocument.defaultView.onLoad;
      aDocument.defaultView.onLoad = function() {
        aDocument.defaultView.outerWidth = Math.min(Services.prefs.getIntPref("owl.extensions.calendar-item-summary.width", 800), aDocument.defaultView.screen.availWidth);
        aDocument.defaultView.outerHeight = Math.min(Services.prefs.getIntPref("owl.extensions.calendar-item-summary.height", 1000), aDocument.defaultView.screen.availHeight);
        aDocument.defaultView.addEventListener("resize", function() {
          Services.prefs.setIntPref("extensions.owl.calendar-item-summary.width", aDocument.defaultView.outerWidth);
          Services.prefs.setIntPref("extensions.owl.calendar-item-summary.height", aDocument.defaultView.outerHeight);
        });
        onLoad();

        let itemSummary = aDocument.getElementById("calendar-item-summary");
        itemSummary.flex = 1;
        let item = itemSummary.item;
        if (item != item.parentItem) {
          let toolbarbutton = aDocument.createXULElement("toolbarbutton");
          toolbarbutton.id = "editmasterButton";
          toolbarbutton.className = "cal-event-toolbarbutton toolbarbutton-1 editmasterButton";
          toolbarbutton.setAttribute("label", aDocument.defaultView.cal.l10n.getString("calendar-occurrence-prompt", "buttons.single.parent.edit.label"));
          toolbarbutton.setAttribute("image", "chrome://calendar/skin/shared/icons/event.svg");
          aDocument.getElementById("summary-toolbar").appendChild(toolbarbutton);
          toolbarbutton.addEventListener("command", function() {
            aDocument.defaultView.opener.openEventDialog(item.parentItem, item.calendar, "view", function() {})
          });
        }

        let wrapper = itemSummary.querySelector(".item-description-wrapper");
        if (!wrapper) {
          return;
        }

        let frame = aDocument.createXULElement("iframe");
        frame.setAttribute("type", "content");
        frame.flex = 1;
        wrapper.firstElementChild.replaceWith(frame);
        frame.addEventListener("load", function() {
          let context = frame.contentDocument.createElement("div");
          frame.contentDocument.body.appendChild(textToHtmlDocumentFragment(item.getProperty("DESCRIPTION"), frame.contentDocument, getDescriptionHTML(item)));
          wrapper.style.border = "1px solid var(--field-border-color)";
          wrapper.style.boxSizing = "border-box";
          wrapper.style.margin = "2px 4px 0";
          wrapper.style.minHeight = "10em";
          wrapper.style.minWidth = "1px";
          wrapper.style.display = "-moz-box";
          for (let anchor of frame.contentDocument.links) {
            anchor.addEventListener("click", function(event) {
              aDocument.defaultView.launchBrowser(anchor.href, event);
            });
          }
        }, true);
      };
    } else if (aDocument.documentURI == "chrome://lightning/content/lightning-item-iframe.xhtml" && !aDocument.defaultView.gNewItemUI && aDocument.getElementById("item-description") instanceof aDocument.defaultView.HTMLTextAreaElement) {
      Services.scriptloader.loadSubScript("chrome://messenger/content/customizable-toolbar.js", aDocument.defaultView);
      aDocument.documentElement.appendChild(aDocument.defaultView.MozXULElement.parseXULToFragment(`
        <menupopup id="format-toolbar-context-menu">
          <menuitem id="CustomizeFormatToolbar"
                    label="&event.menu.view.toolbars.customize.label;"/>
        </menupopup>
      `, ["chrome://calendar/locale/calendar-event-dialog.dtd"]));
      aDocument.getElementById("CustomizeFormatToolbar").addEventListener("command", function() {
        let wintype = aDocument.documentElement.getAttribute("windowtype");
        wintype = wintype.replace(/:/g, "");

        aDocument.defaultView.openDialog(
          "chrome://messenger/content/customizeToolbar.xhtml",
          "CustomizeFormatToolbar" + wintype,
          "chrome,all,dependent",
          aDocument.getElementById("format-toolbox"),
          false,
          null,
          "dialog"
        );
      });
      // Insert our toolbar and editor.
      let descriptionTabPanel = aDocument.getElementById("event-grid-tabpanel-description");
      descriptionTabPanel.style.display = "-moz-box";
      descriptionTabPanel.setAttribute("orient", "vertical");
      descriptionTabPanel.appendChild(aDocument.defaultView.MozXULElement.parseXULToFragment(`
        <toolbox id="format-toolbox" mode="icons">
          <toolbar is="customizable-toolbar" id="format-toolbar"
                   class="chromeclass-toolbar themeable-full"
                   customizable="true" nowindowdrag="true"
                   defaultset="cut-button,copy-button,paste-button,separator,boldButton,italicButton,linkButton,separator,ulButton,olButton,outdentButton,indentButton,separator,AlignPopupButton,paragraphButton"
                   context="format-toolbar-context-menu">
            <toolbarbutton id="cut-button" class="toolbarbutton-1"
                           image="chrome://messenger/skin/icons/cut.svg"
                           command="cmd_cut"
                           tooltiptext="&cutButton.tooltip;"/>
            <toolbarbutton id="copy-button" class="toolbarbutton-1"
                           image="chrome://messenger/skin/icons/copy.svg"
                           command="cmd_copy"
                           tooltiptext="&copyButton.tooltip;"/>
            <toolbarbutton id="paste-button" class="toolbarbutton-1"
                           image="chrome://messenger/skin/icons/paste.svg"
                           command="cmd_paste"
                           tooltiptext="&pasteButton.tooltip;"/>
            <toolbarseparator class="toolbarseparator-standard"/>
            <toolbarbutton id="boldButton" class="formatting-button"
                           image="chrome://messenger/skin/icons/bold.svg"
                           tooltiptext="&boldToolbarCmd.tooltip;"
                           cmd="bold"/>
            <toolbarbutton id="italicButton" class="formatting-button"
                           image="chrome://messenger/skin/icons/italics.svg"
                           tooltiptext="&italicToolbarCmd.tooltip;"
                           cmd="italic"/>
            <toolbarbutton id="linkButton" class="formatting-button"
                           image="chrome://messenger/skin/icons/link.svg"
                           tooltiptext="&linkToolbarCmd.tooltip;"/>
            <toolbarseparator class="toolbarseparator-standard"/>
            <toolbarbutton id="ulButton" class="formatting-button"
                           image="chrome://messenger/skin/icons/bullet-list.svg"
                           tooltiptext="&bulletListToolbarCmd.tooltip;"
                           cmd="insertUnorderedList"/>
            <toolbarbutton id="olButton" class="formatting-button"
                           image="chrome://messenger/skin/icons/number-list.svg"
                           tooltiptext="&numberListToolbarCmd.tooltip;"
                           cmd="insertOrderedList"/>
            <toolbarbutton id="outdentButton" class="formatting-button"
                           image="chrome://messenger/skin/icons/outdent.svg"
                           tooltiptext="&outdentToolbarCmd.tooltip;"
                           cmd="outdent"/>
            <toolbarbutton id="indentButton" class="formatting-button"
                           image="chrome://messenger/skin/icons/indent.svg"
                           tooltiptext="&indentToolbarCmd.tooltip;"
                           cmd="indent"/>
            <toolbarbutton id="AlignPopupButton"
                           type="menu"
                           wantdropmarker="true"
                           class="formatting-button"
                           image="chrome://messenger/skin/icons/left-align.svg"
                           tooltiptext="&AlignPopupButton.tooltip;">
              <menupopup id="AlignPopup" style="-moz-context-properties: fill; fill: currentColor;">
                <menuitem id="AlignLeftItem" class="menuitem-iconic" label="&alignLeft.label;"
                          image="chrome://messenger/skin/icons/left-align.svg"
                          cmd="justifyLeft"
                          tooltiptext="&alignLeftButton.tooltip;"/>
                <menuitem id="AlignCenterItem" class="menuitem-iconic" label="&alignCenter.label;"
                          image="chrome://messenger/skin/icons/center-align.svg"
                          cmd="justifyCenter"
                          tooltiptext="&alignCenterButton.tooltip;"/>
                <menuitem id="AlignRightItem" class="menuitem-iconic" label="&alignRight.label;"
                          image="chrome://messenger/skin/icons/right-align.svg"
                          cmd="justifyRight"
                          tooltiptext="&alignRightButton.tooltip;"/>
                <menuitem id="AlignJustifyItem" class="menuitem-iconic" label="&alignJustify.label;"
                          image="chrome://messenger/skin/icons/justify.svg"
                          cmd="justifyFull"
                          tooltiptext="&alignJustifyButton.tooltip;"/>
              </menupopup>
            </toolbarbutton>
            <toolbarbutton id="paragraphButton"
                           type="menu"
                           wantdropmarker="true"
                           class="formatting-button"
                           image="chrome://messenger/skin/icons/size.svg"
                           tooltiptext="&ParagraphSelect.tooltip;">
              <menupopup id="paragraphPopup">
                <menuitem id="toolbarmenu_bodyText" label="&bodyTextCmd.label;" value="normal"/>
                <menuitem id="toolbarmenu_h1" label="&heading1Cmd.label;" value="h1"/>
                <menuitem id="toolbarmenu_h2" label="&heading2Cmd.label;" value="h2"/>
                <menuitem id="toolbarmenu_h3" label="&heading3Cmd.label;" value="h3"/>
                <menuitem id="toolbarmenu_h4" label="&heading4Cmd.label;" value="h4"/>
                <menuitem id="toolbarmenu_h5" label="&heading5Cmd.label;" value="h5"/>
                <menuitem id="toolbarmenu_h6" label="&heading6Cmd.label;" value="h6"/>
                <menuitem id="toolbarmenu_pre" label="&paragraphPreformatCmd.label;" value="pre"/>
              </menupopup>
            </toolbarbutton>
            <toolbarbutton id="smileButtonMenu"
                           type="menu"
                           wantdropmarker="true"
                           class="formatting-button"
                           image="chrome://messenger/skin/icons/smiley.svg"
                           tooltiptext="&SmileButton.tooltip;">
              <menupopup id="smileyPopup">
                <menuitem id="smileySmile" label="&#128513; &smiley1Cmd.label;"/>
                <menuitem id="smileyFrown" label="&#128577; &smiley2Cmd.label;"/>
                <menuitem id="smileyWink" label="&#128521; &smiley3Cmd.label;"/>
                <menuitem id="smileyTongue" label="&#128539; &smiley4Cmd.label;"/>
                <menuitem id="smileyLaughing" label="&#128514; &smiley5Cmd.label;"/>
                <menuitem id="smileyEmbarassed" label="&#128517; &smiley6Cmd.label;"/>
                <menuitem id="smileyUndecided" label="&#128533; &smiley7Cmd.label;"/>
                <menuitem id="smileySurprise" label="&#128558; &smiley8Cmd.label;"/>
                <menuitem id="smileyKiss" label="&#128536; &smiley9Cmd.label;"/>
                <menuitem id="smileyYell" label="&#128544; &smiley10Cmd.label;"/>
                <menuitem id="smileyCool" label="&#128526; &smiley11Cmd.label;"/>
                <menuitem id="smileyMoney" label="&#129297; &smiley12Cmd.label;"/>
                <menuitem id="smileyFoot" label="&#128556; &smiley13Cmd.label;"/>
                <menuitem id="smileyInnocent" label="&#128519; &smiley14Cmd.label;"/>
                <menuitem id="smileyCry" label="&#128557; &smiley15Cmd.label;"/>
                <menuitem id="smileySealed" label="&#128567; &smiley16Cmd.label;"/>
              </menupopup>
            </toolbarbutton>
          </toolbar>
          <toolbarpalette>
            <toolbarbutton id="underlineButton" class="formatting-button"
                           image="chrome://messenger/skin/icons/underline.svg"
                           tooltiptext="&underlineToolbarCmd.tooltip;"
                           cmd="underline"/>
          </toolbarpalette>
        </toolbox>
        <editor id="item-description-html"
                type="content"
                editortype="html"
                disable-on-readonly="true"
                flex="1"
                style="min-height: 27em; border: 1px solid var(--field-border-color); border-radius: 2px;"/>
      `, ["chrome://messenger/locale/messengercompose/messengercompose.dtd", "chrome://messenger/locale/messengercompose/editorOverlay.dtd"]));
      aDocument.getElementById("item-description").hidden = true;
      let editorElement = aDocument.getElementById("item-description-html");
      // Update toolbar button states as the user edits the content.
      editorElement.commandManager.addCommandObserver(function() {
        for (let toolbarbutton of descriptionTabPanel.querySelectorAll("toolbarbutton[cmd]")) {
          toolbarbutton.setAttribute("checked", editorElement.contentDocument.queryCommandState(toolbarbutton.getAttribute("cmd")));
        }
        for (let menuitem of aDocument.getElementById("AlignPopup").children) {
          if (editorElement.contentDocument.queryCommandState(menuitem.getAttribute("cmd"))) {
            aDocument.getElementById("AlignPopupButton").setAttribute("image", menuitem.getAttribute("image"));
            break;
          }
        }
      }, "cmd_bold");
      // Most controls simply execute a command on the editor.
      for (let uiElement of descriptionTabPanel.querySelectorAll("[cmd]")) {
        uiElement.addEventListener("command", function(event) {
          editorElement.contentDocument.execCommand(uiElement.getAttribute("cmd"), false, null);
        });
      }
      // Handle the create/remove link button.
      aDocument.getElementById("linkButton").addEventListener("command", function(event) {
        let bundle = Services.strings.createBundle("chrome://messenger/locale/messengercompose/editor.properties");
        let href = { value: "" };
        let editor = editorElement.getHTMLEditor(editorElement.contentWindow);
        let existingLink = editor.getSelectedElement("href");
        if (existingLink) {
          editor.selectElement(existingLink);
          href.value = existingLink.getAttribute("href");
        }
        let text = editorElement.contentWindow.getSelection().toString().trim() || href.value || bundle.GetStringFromName("EmptyHREFError");
        let title = bundle.GetStringFromName("Link");
        if (Services.prompt.prompt(aDocument.defaultView, title, text, href, null, {})) {
          if (!href.value) {
            // Remove the link
            editor.removeInlineProperty("href", "");
          } else if (editorElement.contentWindow.getSelection().isCollapsed) {
            // Insert a link with its href as the text
            let link = editor.createElementWithDefaults("a");
            link.setAttribute("href", href.value);
            link.textContent = href.value;
            editor.insertElementAtSelection(link, false);
          } else {
            // Change the href of the selection
            let link = editor.createElementWithDefaults("a");
            link.setAttribute("href", href.value);
            editor.insertLinkAroundSelection(link);
          }
        }
      });
      // Handle the paragraph popup.
      aDocument.getElementById("paragraphPopup").addEventListener("command", function(event) {
        // Rather unfortunately, execCommand doesn't allow resetting to normal.
        let params = Cu.createCommandParams();
        params.setStringValue("state_attribute", event.target.getAttribute("value"));
        let controller = aDocument.commandDispatcher.getControllerForCommand("cmd_paragraphState");
        controller.QueryInterface(Ci.nsICommandController).doCommandWithParams("cmd_paragraphState", params);
      });
      // Handle the smiley popup.
      aDocument.getElementById('smileyPopup').addEventListener("command", function(event) {
        editorElement.contentDocument.execCommand("insertText", false, event.target.getAttribute("label"));
      });
      // Handle the context menu.
      editorElement.addEventListener("contextmenu", function(event) {
        // Copied from editMenuOverlay.js
        let popup = aDocument.getElementById("textbox-contextmenu");
        if (!popup) {
          aDocument.documentElement.appendChild(aDocument.defaultView.MozXULElement.parseXULToFragment(`
            <menupopup id="textbox-contextmenu" class="textbox-contextmenu">
              <menuitem data-l10n-id="text-action-undo" command="cmd_undo"></menuitem>
              <menuseparator/>
              <menuitem data-l10n-id="text-action-cut" command="cmd_cut"></menuitem>
              <menuitem data-l10n-id="text-action-copy" command="cmd_copy"></menuitem>
              <menuitem data-l10n-id="text-action-paste" command="cmd_paste"></menuitem>
              <menuitem data-l10n-id="text-action-delete" command="cmd_delete"></menuitem>
              <menuseparator/>
              <menuitem data-l10n-id="text-action-select-all" command="cmd_selectAll"></menuitem>
            </menupopup>
          `));
          popup = aDocument.getElementById("textbox-contextmenu");
        }
        popup.openPopupAtScreen(event.screenX, event.screenY, true, event);
        event.preventDefault();
      });
      // Block HTTP requests from the edited document.
      let eventDialogRequestObserver = {
        observe(aSubject, aTopic, aData) {
          if (aTopic == "http-on-modify-request" && aSubject instanceof Ci.nsIChannel && aSubject.loadInfo && aSubject.loadInfo.loadingDocument && aSubject.loadInfo.loadingDocument == editorElement.contentDocument) {
            aSubject.cancel(Cr.NS_ERROR_ABORT);
          }
        },
      };
      Services.obs.addObserver(eventDialogRequestObserver, "http-on-modify-request");
      aDocument.defaultView.addEventListener("unload", function() {
        Services.obs.removeObserver(eventDialogRequestObserver, "http-on-modify-request");
      });
      let loadDialog = aDocument.defaultView.loadDialog;
      aDocument.defaultView.loadDialog = function(aItem) {
        loadDialog(aItem);
        if (!editorElement.getEditor(editorElement.contentWindow)) {
          editorElement.makeEditable("text/html", false);
        }
        let editor = editorElement.getHTMLEditor(editorElement.contentWindow);
        let docFragment = textToHtmlDocumentFragment(aItem.getProperty("DESCRIPTION"), editorElement.contentDocument, getDescriptionHTML(aItem));
        editor.flags = editor.eEditorMailMask | editor.eEditorNoCSSMask | editor.eEditorAllowInteraction;
        editor.enableUndo(false);
        editor.forceCompositionEnd();
        editor.rootElement.replaceChildren(docFragment);
        // This reinitialises the editor after we replaced its contents.
        editor.insertText("");
        editor.resetModificationCount();
        editor.enableUndo(true);
      }
      let saveDialog = aDocument.defaultView.saveDialog;
      aDocument.defaultView.saveDialog = function(aItem) {
        saveDialog(aItem);
        let editor = editorElement.getHTMLEditor(editorElement.contentWindow);
        if (editor.documentModified) {
          let mode = Ci.nsIDocumentEncoder.OutputFormatted | Ci.nsIDocumentEncoder.OutputWrap | Ci.nsIDocumentEncoder.OutputLFLineBreak | Ci.nsIDocumentEncoder.OutputNoScriptContent | Ci.nsIDocumentEncoder.OutputNoFramesContent | Ci.nsIDocumentEncoder.OutputBodyOnly;
          aItem.setProperty("DESCRIPTION", editor.outputToString("text/plain", mode));
          aItem.setProperty("X-ALT-DESC", editor.outputToString("text/html", mode));
          aItem.setPropertyParameter("X-ALT-DESC", "FMTTYPE", "text/html");
        }
      }
    }
  } catch (ex) {
    logError(ex);
  }
}

Services.obs.addObserver(overlayListener, "chrome-document-interactive");

for (let window of Services.ww.getWindowEnumerator()) {
  if (window.document.readyState != "loading") {
    overlayListener(window.document);
  }
}
