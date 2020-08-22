// JavaScript

/* jshint esversion:6, -W097 */
/* jslint esversion:6 */
/* global GrammalectePanel, oGrammalecte, oGrammalecteBackgroundPort, showError, window, document, console */

"use strict";

function onGrammalecteGCPanelClick (xEvent) {
    try {
        let xElem = xEvent.target;
        if (xElem.id) {
            if (xElem.id.startsWith("grammalecte_sugg")) {
                oGrammalecte.oGCPanel.applySuggestion(xElem.id);
            } else if (xElem.id === "grammalecte_tooltip_ignore") {
                oGrammalecte.oGCPanel.ignoreError(xElem.id);
            } else if (xElem.id.startsWith("grammalecte_check")) {
                oGrammalecte.oGCPanel.recheckParagraph(parseInt(xElem.dataset.para_num, 10));
            } else if (xElem.id.startsWith("grammalecte_hide")) {
                xElem.parentNode.parentNode.style.display = "none";
            } else if (xElem.id.startsWith("grammalecte_err")
                       && xElem.className !== "grammalecte_error_corrected"
                       && xElem.className !== "grammalecte_error_ignored") {
                oGrammalecte.oGCPanel.oTooltip.show(xElem.parentNode, xElem.id);
            } else if (xElem.id === "grammalecte_tooltip_url"  || xElem.id === "grammalecte_tooltip_db_search") {
                oGrammalecteBackgroundPort.openURL(xElem.dataset.url);
            } else {
                oGrammalecte.oGCPanel.oTooltip.hide();
            }
        } else {
            oGrammalecte.oGCPanel.oTooltip.hide();
        }
    }
    catch (e) {
        showError(e);
    }
}


class GrammalecteGrammarChecker extends GrammalectePanel {
    /*
        KEYS for identifiers:
            grammalecte_paragraph{Id} : [paragraph number]
            grammalecte_check{Id}     : [paragraph number]
            grammalecte_hide{Id}      : [paragraph number]
            grammalecte_error{Id}     : [paragraph number]-[error_number]
            grammalecte_sugg{Id}      : [paragraph number]-[error_number]--[suggestion_number]
    */

    constructor (...args) {
        super(...args);
        this.aIgnoredErrors = new Set();
        this.createMenu();
        this.xPanelContent.style.marginBottom = "6px";
        // Editor
        this.xGCPanelContent = oGrammalecte.createNode("div", {id: "grammalecte_gc_panel_content"});
        this.xParagraphList = oGrammalecte.createNode("div", {id: "grammalecte_paragraph_list"});
        this.xGCPanelContent.appendChild(this.xParagraphList);
        this.xPanelContent.addEventListener("click", onGrammalecteGCPanelClick, false);
        this.oTooltip = new GrammalecteTooltip(this.xParent, this.xGCPanelContent);
        this.xPanelContent.appendChild(this.xGCPanelContent);
        this.oTextControl = null;
        this.nLastResult = 0;
        this.iLastEditedParagraph = -1;
        this.nParagraph = 0;
        // Lexicographer
        this.nLxgCount = 0;
        this.xLxgPanelContent = oGrammalecte.createNode("div", {id: "grammalecte_lxg_panel_content"});
        this.xPanelContent.appendChild(this.xLxgPanelContent);
        // Conjugueur
        this.xConjPanelContent = oGrammalecte.createNode("div", {id: "grammalecte_conj_panel_content"});
        this.xConjPanelContent.innerHTML = sGrammalecteConjugueurHTML;  // @Reviewers: sGrammalecteConjugueurHTML is a const value defined in <content_scripts/html_src.js>
        this.xPanelContent.appendChild(this.xConjPanelContent);
        this.sVerb = "";
        this.bListenConj = false;
    }

    createMenu () {
        this.xMenu = oGrammalecte.createNode("div", {className: "grammalecte_panel_menu"});
        // tabs
        this.xTFButton = oGrammalecte.createNode("div", {className: "grammalecte_menu_button", textContent: "Formateur de texte"});
        this.xEditorButton = oGrammalecte.createNode("div", {className: "grammalecte_menu_button", textContent: "Éditeur"});
        this.xLxgButton = oGrammalecte.createNode("div", {className: "grammalecte_menu_button", textContent: "Lexicographe"});
        this.xConjButton = oGrammalecte.createNode("div", {className: "grammalecte_menu_button", textContent: "Conjugueur"});
        // buttons
        this.xLexEditButton = oGrammalecte.createNode("div", {className: "grammalecte_menu_subbutton", textContent: "ÉditLex", title: "Ouvrir l’éditeur lexical", style: "background-color: hsl(210, 50%, 40%)"});
        this.xLxgButton.appendChild(this.xLexEditButton);
        this.xAutoRefresh = oGrammalecte.createNode("div", {className: "grammalecte_menu_subbutton", textContent: "AutoRafr", title: "Auto-rafraîchissement de la correction grammaticale (3 s après la dernière frappe)"});
        this.xEditorButton.appendChild(this.xAutoRefresh);
        this.bAutoRefresh = oGrammalecte.bAutoRefresh;
        this.setAutoRefreshButton();
        this.xTFButton.onclick = () => {
            if (!this.bWorking) {
                oGrammalecte.createTFPanel();
                oGrammalecte.oTFPanel.start();
                oGrammalecte.oTFPanel.show();
            }
        };
        this.xEditorButton.onclick = () => {
            if (!this.bWorking) {
                this.showEditor();
            }
        };
        this.xAutoRefresh.onclick = () => {
            if (bThunderbird) {
                oGrammalecte.showMessage("À cause d’une limitation de Thunberbird, l’auto-rafraîchissement est indisponible. Si vous modifiez le texte dans ce panneau, cliquez sur le bouton ↻ pour relancer l’analyse grammaticale du paragraphe.")
                return;
            }
            this.bAutoRefresh = !this.bAutoRefresh;
            oGrammalecte.bAutoRefresh = this.bAutoRefresh;
            browser.storage.local.set({"autorefresh_option": this.bAutoRefresh});
            this.setAutoRefreshButton();
        }
        this.xLxgButton.onclick = () => {
            if (!this.bWorking) {
                this.showLexicographer();
                this.clearLexicographer();
                this.startWaitIcon();
                oGrammalecteBackgroundPort.getListOfTokens(this.oTextControl.getText());
                //oGrammalecteBackgroundPort.parseFull(this.oTextControl.getText())
            }
        };
        this.xConjButton.onclick = () => {
            if (!this.bWorking) {
                this.showConjugueur();
            }
        };
        this.xLexEditButton.onclick = () => {
            oGrammalecteBackgroundPort.openLexiconEditor();
        };
        // Add tabs to menu
        this.xMenu.appendChild(this.xTFButton);
        this.xMenu.appendChild(this.xEditorButton);
        this.xMenu.appendChild(this.xLxgButton);
        this.xMenu.appendChild(this.xConjButton);
        this.xPanelBar.appendChild(this.xMenu);
    }

    start (what, xResultNode=null) {
        this.oTooltip.hide();
        this.bWorking = false;
        this.clear();
        this.hideMessage();
        this.resetTimer();
        if (typeof(what) === "string") {
            if (what === "__ThunderbirdComposeWindow__") {
                // Thunderbird compose window
                this.oTextControl = new HTMLPageEditor(document);
            } else {
                this.oTextControl = new TextNodeEditor(what, xResultNode);
            }
        }
        else if (what.nodeType && what.nodeType === 1) {
            if (what.tagName == "IFRAME") {
                this.oTextControl = new HTMLPageEditor(what, xResultNode);
            }
            else {
                this.oTextControl = new TextNodeEditor(what, xResultNode);
            }
        }
        else {
            // error
            oGrammalecte.showMessage("[BUG] Analyse d’un élément inconnu…");
            console.log("[Grammalecte] Unknown element:", what);
        }
    }

    setAutoRefreshButton () {
        this.xAutoRefresh.style.backgroundColor = (this.bAutoRefresh) ? "hsl(150, 50%, 50%)" : "";
        this.xAutoRefresh.style.color = (this.bAutoRefresh) ? "hsl(150, 50%, 96%)" : "";
        this.xAutoRefresh.style.opacity = (this.bAutoRefresh) ? "1" : "";
    }

    recheckAll () {
        this.oTooltip.hide();
        this.showEditor();
        this.clear();
        this.startWaitIcon();
        this.resetTimer();
        oGrammalecteBackgroundPort.parseAndSpellcheck(this.oTextControl.getText(), "__GrammalectePanel__");
    }

    showEditor () {
        this.switchContentOn(this.xGCPanelContent, this.xEditorButton);
        this.switchContentOff(this.xLxgPanelContent, this.xLxgButton);
        this.switchContentOff(this.xConjPanelContent, this.xConjButton);
        this.xPanel.style.background = "";
    }

    showLexicographer () {
        this.switchContentOff(this.xGCPanelContent, this.xEditorButton);
        this.switchContentOn(this.xLxgPanelContent, this.xLxgButton);
        this.switchContentOff(this.xConjPanelContent, this.xConjButton);
        this.xPanel.style.background = "";
    }

    showConjugueur () {
        this.switchContentOff(this.xGCPanelContent, this.xEditorButton);
        this.switchContentOff(this.xLxgPanelContent, this.xLxgButton);
        this.switchContentOn(this.xConjPanelContent, this.xConjButton);
        this.xPanel.style.background = "linear-gradient(to bottom, hsla(0,0%,100%,1) 0%, hsla(0,0%,95%,1) 55%, hsla(0,0%,90%,1) 100%)";
        this.listenConj();
        if (!this.sVerb) {
            this.conjugateVerb("être");
        }
    }

    switchContentOn (xContent, xNodeButton) {
        xContent.style.display = "block";
        xNodeButton.style.backgroundColor = "hsl(210, 60%, 40%)";
        xNodeButton.style.textShadow = "2px 0 0 hsla(210, 40%, 35%, .5), -2px 0 0 hsla(210, 40%, 35%, .5), 0 2px 0 hsla(210, 40%, 35%, .5), 0 -2px 0 hsla(210, 40%, 35%, .5), 1px 1px hsla(210, 40%, 35%, .5), -1px -1px 0 hsla(210, 40%, 35%, .5), 1px -1px 0 hsla(210, 40%, 35%, .5), -1px 1px 0 hsla(210, 30%, 35%, .5)";
    }

    switchContentOff (xContent, xNodeButton) {
        xContent.style.display = "none";
        xNodeButton.style.backgroundColor = "";
        xNodeButton.style.textShadow = "";
    }

    clear () {
        while (this.xParagraphList.firstChild) {
            this.xParagraphList.removeChild(this.xParagraphList.firstChild);
        }
        this.aIgnoredErrors.clear();
    }

    hide () {
        if (bThunderbird) {
            oGrammalecte.showMessage("Veuillez patienter…");
            this.copyAllParagraphsToComposeWindow();
        }
        if (oGrammalecte.oTFPanel) { oGrammalecte.oTFPanel.hide(); }
        if (oGrammalecte.oMessageBox) { oGrammalecte.oMessageBox.hide(); }
        oGrammalecte.clearRightClickedNode();
        this.xPanel.style.display = "none";
        this.oTextControl.clear();
    }

    addParagraphResult (oResult) {
        try {
            this.resetTimer();
            if (oResult && (oResult.sParagraph.trim() !== "" || oResult.aGrammErr.length > 0 || oResult.aSpellErr.length > 0)) {
                let xNodeDiv = oGrammalecte.createNode("div", {className: "grammalecte_paragraph_block"});
                // actions
                let xActionsBar = oGrammalecte.createNode("div", {className: "grammalecte_paragraph_actions"});
                xActionsBar.appendChild(oGrammalecte.createNode("div", {id: "grammalecte_check" + oResult.iParaNum, className: "grammalecte_paragraph_button grammalecte_green", textContent: "↻", title: "Réanalyser…"}, {para_num: oResult.iParaNum}));
                xActionsBar.appendChild(oGrammalecte.createNode("div", {id: "grammalecte_hide" + oResult.iParaNum, className: "grammalecte_paragraph_button grammalecte_red", textContent: "×", title: "Cacher", style: "font-weight: bold;"}));
                // paragraph
                let xParagraph = oGrammalecte.createNode("p", {id: "grammalecte_paragraph"+oResult.iParaNum, className: "grammalecte_paragraph", lang: "fr", contentEditable: "true"}, {para_num: oResult.iParaNum});
                xParagraph.setAttribute("spellcheck", "false"); // doesn’t seem possible to use “spellcheck” as a common attribute.
                xParagraph.dataset.timer_id = "0";
                xParagraph.addEventListener("input", function (xEvent) {
                    if (this.bAutoRefresh) {
                        // timer for refreshing analysis
                        window.clearTimeout(parseInt(xParagraph.dataset.timer_id, 10));
                        xParagraph.dataset.timer_id = window.setTimeout(this.recheckParagraph.bind(this), 3000, oResult.iParaNum);
                        this.iLastEditedParagraph = oResult.iParaNum;
                    }
                    // write text
                    this.oTextControl.setParagraph(parseInt(xEvent.target.dataset.para_num, 10), xEvent.target.textContent);
                }.bind(this)
                , true);
                this._tagParagraph(xParagraph, oResult.sParagraph, oResult.iParaNum, oResult.aGrammErr, oResult.aSpellErr);
                // creation
                xNodeDiv.appendChild(xActionsBar);
                xNodeDiv.appendChild(xParagraph);
                this.xParagraphList.appendChild(xNodeDiv);
                this.nParagraph += 1;
            }
        }
        catch (e) {
            showError(e);
        }
    }

    resetTimer () {
        this.nLastResult = Date.now();
        window.clearTimeout(this.nTimer);
        this.nTimer = window.setTimeout(
            oGrammalecte.oGCPanel.showMessage.bind(this),
            5000,
            "Le serveur grammatical semble ne plus répondre.",
            "Arrêter et relancer le serveur grammatical.",
            "restartWorker"
        );
    }

    endTimer () {
        window.clearTimeout(this.nTimer);
    }

    recheckParagraph (iParaNum) {
        if (!this.bOpened) {
            return;
        }
        let sParagraphId = "grammalecte_paragraph" + iParaNum;
        let xParagraph = this.xParent.getElementById(sParagraphId);
        this._blockParagraph(xParagraph);
        if (bThunderbird) {
            // WORKAROUND: input event isn’t triggered by key input, so as textContent isn’t up to date, we do it now
            this.oTextControl.setParagraph(iParaNum, xParagraph.textContent);
        }
        let sText = this.oTextControl.getParagraph(iParaNum);
        oGrammalecteBackgroundPort.parseAndSpellcheck1(sText, "__GrammalectePanel__", sParagraphId);
    }

    refreshParagraph (sParagraphId, oResult) {
        // function called when results are sent by the Worker
        if (!this.bOpened) {
            return;
        }
        try {
            let xParagraph = this.xParent.getElementById(sParagraphId);
            // save caret position
            let [nStart, nEnd] = oGrammalecte.getCaretPosition(xParagraph);
            xParagraph.dataset.caret_position_start = nStart;
            xParagraph.dataset.caret_position_end = nEnd;
            // erase texte
            xParagraph.textContent = "";
            // recreate and retag
            let sParaNum = sParagraphId.slice(21);
            this._tagParagraph(xParagraph, oResult.sParagraph, sParaNum, oResult.aGrammErr, oResult.aSpellErr);
            this._freeParagraph(xParagraph, parseInt(sParaNum, 10));
        }
        catch (e) {
            showError(e);
        }
    }

    _tagParagraph (xParagraph, sParagraph, iParaNum, aSpellErr, aGrammErr) {
        try {
            if (aGrammErr.length === 0  &&  aSpellErr.length === 0) {
                xParagraph.textContent = sParagraph;
                return;
            }
            aGrammErr.push(...aSpellErr);
            aGrammErr.sort(function (a, b) {
                if (a["nStart"] < b["nStart"])
                    return -1;
                if (a["nStart"] > b["nStart"])
                    return 1;
                return 0;
            });
            let nErr = 0; // we count errors to give them an identifier
            let nEndLastErr = 0;
            for (let oErr of aGrammErr) {
                let nStart = oErr["nStart"];
                let nEnd = oErr["nEnd"];
                if (nStart >= nEndLastErr) {
                    oErr['sErrorId'] = iParaNum + "-" + nErr.toString(); // error identifier
                    oErr['sIgnoredKey'] = iParaNum + ":" + nStart.toString() + ":" + sParagraph.slice(nStart, nEnd);
                    if (nEndLastErr < nStart) {
                        xParagraph.appendChild(document.createTextNode(sParagraph.slice(nEndLastErr, nStart)));
                    }
                    xParagraph.appendChild(this._createError(sParagraph.slice(nStart, nEnd), oErr));
                    nEndLastErr = nEnd;
                }
                nErr += 1;
            }
            if (nEndLastErr <= sParagraph.length) {
                xParagraph.appendChild(document.createTextNode(sParagraph.slice(nEndLastErr)));
            }
        }
        catch (e) {
            showError(e);
        }
    }

    _createError (sUnderlined, oErr) {
        let xNodeErr = document.createElement("mark");
        xNodeErr.id = "grammalecte_err" + oErr['sErrorId'];
        xNodeErr.textContent = sUnderlined;
        xNodeErr.dataset.error_id = oErr['sErrorId'];
        xNodeErr.dataset.ignored_key = oErr['sIgnoredKey'];
        xNodeErr.dataset.error_type = (oErr['sType'] === "WORD") ? "spelling" : "grammar";
        if (this.aIgnoredErrors.has(xNodeErr.dataset.ignored_key)) {
            xNodeErr.className = "grammalecte_error_ignored";
        }
        else if (xNodeErr.dataset.error_type === "grammar") {
            xNodeErr.className = "grammalecte_error";
            xNodeErr.dataset.gc_message = oErr['sMessage'];
            xNodeErr.dataset.gc_url = oErr['URL'];
            if (xNodeErr.dataset.gc_message.includes(" #")) {
                xNodeErr.dataset.line_id = oErr['sLineId'];
                xNodeErr.dataset.rule_id = oErr['sRuleId'];
            }
            xNodeErr.dataset.suggestions = oErr["aSuggestions"].join("|");
            if (oErr.hasOwnProperty("aColor")  &&  Array.isArray(oErr["aColor"])  &&  oErr["aColor"].length === 3) {
                let sHue = oErr["aColor"][0].toString();
                let sSat = oErr["aColor"][1].toString();
                let sLum = oErr["aColor"][2].toString();
                xNodeErr.style.color = `hsl(${sHue}, ${sSat}%, 15%)`;
                xNodeErr.style.backgroundColor = `hsl(${sHue}, ${sSat}%, 85%)`;
                xNodeErr.style.borderBottom = `solid 2px hsl(${sHue}, ${sSat}%, ${sLum}%)`;
            }
        }
        else {
            xNodeErr.className = "grammalecte_spellerror";
        }
        return xNodeErr;
    }

    _blockParagraph (xParagraph) {
        xParagraph.contentEditable = "false";
        this.xParent.getElementById("grammalecte_check"+xParagraph.dataset.para_num).textContent = "!!";
        this.xParent.getElementById("grammalecte_check"+xParagraph.dataset.para_num).style.backgroundColor = "hsl(0, 50%, 50%)";
        this.xParent.getElementById("grammalecte_check"+xParagraph.dataset.para_num).style.boxShadow = "0 0 0 3px hsla(0, 0%, 50%, .2)";
        this.xParent.getElementById("grammalecte_check"+xParagraph.dataset.para_num).style.animation = "grammalecte-pulse 1s linear infinite";
    }

    _freeParagraph (xParagraph, iParaNum) {
        xParagraph.contentEditable = "true";
        if (iParaNum == this.iLastEditedParagraph && xParagraph.dataset.caret_position_start !== "-1") {
            let nStart = parseInt(xParagraph.dataset.caret_position_start, 10);
            let nEnd = parseInt(xParagraph.dataset.caret_position_end, 10);
            oGrammalecte.setCaretPosition(xParagraph, nStart, nEnd);
        }
        this.xParent.getElementById("grammalecte_check"+xParagraph.dataset.para_num).textContent = "↻";
        this.xParent.getElementById("grammalecte_check"+xParagraph.dataset.para_num).style.backgroundColor = "";
        this.xParent.getElementById("grammalecte_check"+xParagraph.dataset.para_num).style.animation = "";
        setTimeout(() => { this.xParent.getElementById("grammalecte_check"+xParagraph.dataset.para_num).style.boxShadow = ""; }, 500);
    }

    applySuggestion (sNodeSuggId) { // sugg
        try {
            let sErrorId = this.xParent.getElementById(sNodeSuggId).dataset.error_id;
            //let sParaNum = sErrorId.slice(0, sErrorId.indexOf("-"));
            let xNodeErr = this.xParent.getElementById("grammalecte_err" + sErrorId);
            xNodeErr.textContent = this.xParent.getElementById(sNodeSuggId).textContent;
            xNodeErr.className = "grammalecte_error_corrected";
            xNodeErr.removeAttribute("style");
            let iParaNum = parseInt(sErrorId.slice(0, sErrorId.indexOf("-")), 10);
            this.oTextControl.setParagraph(iParaNum, this.xParent.getElementById("grammalecte_paragraph" + iParaNum).textContent);
            this.oTooltip.hide();
            this.recheckParagraph(iParaNum);
            this.iLastEditedParagraph = iParaNum;
        }
        catch (e) {
            showError(e);
        }
    }

    ignoreError (sIgnoreButtonId) {  // ignore
        try {
            let sErrorId = this.xParent.getElementById(sIgnoreButtonId).dataset.error_id;
            let xNodeErr = this.xParent.getElementById("grammalecte_err" + sErrorId);
            this.aIgnoredErrors.add(xNodeErr.dataset.ignored_key);
            xNodeErr.className = "grammalecte_error_ignored";
            xNodeErr.removeAttribute("style");
            this.oTooltip.hide();
        }
        catch (e) {
            showError(e);
        }
    }

    addSummary () {
        // todo
    }

    copyAllParagraphsToComposeWindow () {
        // Thunderbird only
        // When closing the window, we change all nodes according to the content of paragraphs in the gc panel
        for (let iPara = 0;  iPara < this.nParagraph;  iPara++) {
            let sParagraphId = "grammalecte_paragraph"+iPara;
            if (this.xParent.getElementById(sParagraphId)) {
                this.oTextControl.setParagraph(iPara, this.xParent.getElementById(sParagraphId).textContent);
            }
        }
    }

    addMessageToGCPanel (sMessage) {
        let xNode = oGrammalecte.createNode("div", {className: "grammalecte_panel_flow_message", textContent: sMessage});
        this.xParagraphList.appendChild(xNode);
    }

    copyTextToClipboard () {
        this.startWaitIcon();
        try {
            let sText = "";
            // Dans un shadow, <this.xParent.getElementsByClassName> n’existe pas.
            let xElem = this.xParent.getElementById("grammalecte_gc_panel");
            for (let xNode of xElem.getElementsByClassName("grammalecte_paragraph")) {
                sText += xNode.textContent + "\n";
            }
            this._sendTextToClipboard(sText);
        }
        catch (e) {
            showError(e);
        }
        this.stopWaitIcon();
    }

    _sendTextToClipboard (sText)  {
        this.xClipboardButton.textContent = "⇒ presse-papiers";
        if (navigator.clipboard && navigator.clipboard.writeText) {
            // Firefox 63+, Chrome 66+
            // Working draft: https://developer.mozilla.org/en-US/docs/Web/API/Clipboard
            navigator.clipboard.writeText(sText)
            .then(
                (res) => { window.setTimeout(() => { this.xClipboardButton.textContent = "📋"; }, 2000); }
            )
            .catch(
                (e) => { showError(e); this._sendTextToClipboard(sText); }
            );
        } else {
            this._sendTextToClipboardFallback(sText);
        }
    }

    _sendTextToClipboardFallback (sText) {
        try {
            console.log("send text to clipboard fallback");
            // Copy to clipboard fallback
            // recipe from https://github.com/mdn/webextensions-examples/blob/master/context-menu-copy-link-with-types/clipboard-helper.js
            function setClipboardData (xEvent) {
                document.removeEventListener("copy", setClipboardData, true);
                xEvent.stopImmediatePropagation();
                xEvent.preventDefault();
                xEvent.clipboardData.setData("text/plain", sText);
            }
            document.addEventListener("copy", setClipboardData, true);
            document.execCommand("copy");
            window.setTimeout(() => { this.xClipboardButton.textContent = "📋"; }, 2000);
        }
        catch (e) {
            showError(e);
        }
    }

    // Lexicographer

    clearLexicographer () {
        this.nLxgCount = 0;
        while (this.xLxgPanelContent.firstChild) {
            this.xLxgPanelContent.removeChild(this.xLxgPanelContent.firstChild);
        }
    }

    addLxgSeparator (sText) {
        if (this.xLxgPanelContent.textContent !== "") {
            this.xLxgPanelContent.appendChild(oGrammalecte.createNode("div", {className: "grammalecte_lxg_separator", textContent: sText}));
        }
    }

    addMessageToLxgPanel (sMessage) {
        let xNode = oGrammalecte.createNode("div", {className: "grammalecte_panel_flow_message", textContent: sMessage});
        this.xLxgPanelContent.appendChild(xNode);
    }

    addListOfTokens (lToken) {
        try {
            if (lToken) {
                this.nLxgCount += 1;
                let xTokenList = oGrammalecte.createNode("div", {className: "grammalecte_lxg_list_of_tokens"});
                xTokenList.appendChild(oGrammalecte.createNode("div", {className: "grammalecte_lxg_list_num", textContent: this.nLxgCount}));
                for (let oToken of lToken) {
                    xTokenList.appendChild(this._createTokenBlock(oToken));
                }
                this.xLxgPanelContent.appendChild(xTokenList);
            }
        }
        catch (e) {
            showError(e);
        }
    }

    _createTokenBlock (oToken) {
        let xTokenBlock = oGrammalecte.createNode("div", {className: "grammalecte_lxg_token_block"});
        xTokenBlock.appendChild(this._createTokenDescr(oToken));
        if (oToken.aSubElem) {
            let xSubBlock = oGrammalecte.createNode("div", {className: "grammalecte_lxg_token_subblock"});
            for (let oSubElem of oToken.aSubElem) {
                xSubBlock.appendChild(this._createTokenDescr(oSubElem));
            }
            xTokenBlock.appendChild(xSubBlock);
        }
        return xTokenBlock;
    }

    _createTokenDescr (oToken) {
        try {
            let xTokenDescr = oGrammalecte.createNode("div", {className: "grammalecte_lxg_token_descr"});
            if (oToken.sType == "LOCP") {
                xTokenDescr.appendChild(oGrammalecte.createNode("div", {className: "grammalecte_lxg_token_also", textContent: "possiblement › "}));
            }
            xTokenDescr.appendChild(oGrammalecte.createNode("div", {className: "grammalecte_lxg_token grammalecte_lxg_token_" + oToken.sType, textContent: oToken.sValue}));
            xTokenDescr.appendChild(oGrammalecte.createNode("div", {className: "grammalecte_lxg_token_colon", textContent: ":"}));
            if (oToken.aLabel.length === 1) {
                xTokenDescr.appendChild(oGrammalecte.createNode("div", {className: "grammalecte_lxg_morph_elem_inline", textContent: oToken.aLabel[0]}));
            } else {
                let xMorphList = oGrammalecte.createNode("div", {className: "grammalecte_lxg_morph_list"});
                for (let sLabel of oToken.aLabel) {
                    xMorphList.appendChild(oGrammalecte.createNode("div", {className: "grammalecte_lxg_morph_elem", textContent: "• " + sLabel}));
                }
                xTokenDescr.appendChild(xMorphList);
            }
            return xTokenDescr;
        }
        catch (e) {
            showError(e);
        }
    }

    setHidden (sClass, bHidden) {
        let xPanelContent = this.xParent.getElementById('grammalecte_panel_content');
        for (let xNode of xPanelContent.getElementsByClassName(sClass)) {
            xNode.hidden = bHidden;
        }
    }

    // Conjugueur

    listenConj () {
        if (!this.bListenConj) {
            // button
            this.xParent.getElementById('grammalecte_conj_button').addEventListener("click", (e) => { this.conjugateVerb(); });
            // text field
            //this.xParent.getElementById('grammalecte_conj_verb').addEventListener("input", (e) => { this.conjugateVerb(); });
            // options
            this.xParent.getElementById('grammalecte_conj_oneg').addEventListener("click", (e) => { this.switchOption('grammalecte_conj_oneg'); this.updateConj(); });
            this.xParent.getElementById('grammalecte_conj_opro').addEventListener("click", (e) => { this.switchOption('grammalecte_conj_opro'); this.updateConj(); });
            this.xParent.getElementById('grammalecte_conj_oint').addEventListener("click", (e) => { this.switchOption('grammalecte_conj_oint'); this.updateConj(); });
            this.xParent.getElementById('grammalecte_conj_ofem').addEventListener("click", (e) => { this.switchOption('grammalecte_conj_ofem'); this.updateConj(); });
            this.xParent.getElementById('grammalecte_conj_otco').addEventListener("click", (e) => { this.switchOption('grammalecte_conj_otco'); this.updateConj(); });
            this.bListenConj = true;
        }
    }

    purgeInputText () {
        // Thunderbird don’t accept input fields
        // So we use editable node and we purge it
        let sVerb = this.xParent.getElementById('grammalecte_conj_verb').innerText;
        let nIndexCut = sVerb.indexOf("\n");
        if (nIndexCut != -1) {
            sVerb = sVerb.slice(0, nIndexCut);
        };
        this.xParent.getElementById('grammalecte_conj_verb').textContent = sVerb.trim();
    }

    switchOption (sOption) {
        if (this.xParent.getElementById(sOption).dataset.disabled == "off") {
            this.xParent.getElementById(sOption).dataset.selected = (this.xParent.getElementById(sOption).dataset.selected == "off") ? "on" : "off";
            this.xParent.getElementById(sOption).className = (this.xParent.getElementById(sOption).dataset.selected == "on") ? "grammalecte_conj_option_on" : "grammalecte_conj_option_off";
        }
    }

    resetOption (sOption) {
        this.xParent.getElementById(sOption).dataset.selected = "off";
        this.xParent.getElementById(sOption).dataset.disabled = "off";
        this.xParent.getElementById(sOption).style.color = "";
        this.xParent.getElementById(sOption).className = "grammalecte_conj_option_off";
    }

    selectOption (sOption) {
        this.xParent.getElementById(sOption).dataset.selected = "on";
        this.xParent.getElementById(sOption).className = "grammalecte_conj_option_on";
    }

    unselectOption (sOption) {
        this.xParent.getElementById(sOption).dataset.selected = "off";
        this.xParent.getElementById(sOption).className = "grammalecte_conj_option_off";
    }

    enableOption (sOption) {
        this.xParent.getElementById(sOption).dataset.disabled = "off";
        this.xParent.getElementById(sOption).style.color = "";
    }

    disableOption (sOption) {
        this.xParent.getElementById(sOption).dataset.disabled = "on";
        this.xParent.getElementById(sOption).style.color = "#CCC";
    }

    conjugateVerb (sVerb="") {
        try {
            if (!sVerb) {
                this.purgeInputText();
                sVerb = this.xParent.getElementById('grammalecte_conj_verb').textContent;
            }
            this.resetOption('grammalecte_conj_oneg');
            this.resetOption('grammalecte_conj_opro');
            this.resetOption('grammalecte_conj_oint');
            this.resetOption('grammalecte_conj_otco');
            this.resetOption('grammalecte_conj_ofem');
            // request analyzing
            sVerb = sVerb.trim().toLowerCase().replace(/’/g, "'").replace(/  +/g, " ");
            if (sVerb) {
                if (sVerb.startsWith("ne pas ")) {
                    this.selectOption('grammalecte_conj_oneg');
                    sVerb = sVerb.slice(7).trim();
                }
                if (sVerb.startsWith("se ")) {
                    this.selectOption('grammalecte_conj_opro');
                    sVerb = sVerb.slice(3).trim();
                }
                else if (sVerb.startsWith("s'")) {
                    this.selectOption('grammalecte_conj_opro');
                    sVerb = sVerb.slice(2).trim();
                }
                if (sVerb.endsWith("?")) {
                    this.selectOption('grammalecte_conj_oint');
                    sVerb = sVerb.slice(0,-1).trim();
                }
                if (sVerb) {
                    this.sVerb = sVerb;
                    this.updateConj(true);
                } else {
                    this.xParent.getElementById('grammalecte_conj_verb').textContent = "";
                }
            }
        }
        catch (e) {
            showError(e);
        }
    }

    updateConj (bStart=false) {
        let bPro = this.xParent.getElementById('grammalecte_conj_opro').dataset.selected == "on";
        let bNeg = this.xParent.getElementById('grammalecte_conj_oneg').dataset.selected == "on";
        let bTpsCo = this.xParent.getElementById('grammalecte_conj_otco').dataset.selected == "on";
        let bInt = this.xParent.getElementById('grammalecte_conj_oint').dataset.selected == "on";
        let bFem = this.xParent.getElementById('grammalecte_conj_ofem').dataset.selected == "on";
        if (this.sVerb) {
            oGrammalecteBackgroundPort.getVerb(this.sVerb, bStart, bPro, bNeg, bTpsCo, bInt, bFem);
        }
    }

    conjugateWith (oVerb, oConjTable) {
        // function called when results come from the Worker
        if (oVerb) {
            this.xParent.getElementById('grammalecte_conj_verb').style.color = "#999999";
            this.xParent.getElementById('grammalecte_conj_verb').textContent = "";
            this.xParent.getElementById('grammalecte_conj_verb_title').textContent = oVerb.sVerb;
            this.xParent.getElementById('grammalecte_conj_verb_info').textContent = oVerb.sInfo;
            this.xParent.getElementById('grammalecte_conj_opro').textContent = oVerb.sProLabel;
            if (oVerb.bUncomplete) {
                this.unselectOption('grammalecte_conj_opro');
                this.disableOption('grammalecte_conj_opro');
                this.unselectOption('grammalecte_conj_otco');
                this.disableOption('grammalecte_conj_otco');
                this.xParent.getElementById('grammalecte_conj_note').textContent = "Ce verbe n’a pas encore été vérifié. C’est pourquoi les options “pronominal” et “temps composés” sont désactivées.";
            } else {
                this.enableOption('grammalecte_conj_otco');
                if (oVerb.nPronominable == 0) {
                    this.enableOption('grammalecte_conj_opro');
                } else if (oVerb.nPronominable == 1) {
                    this.selectOption('grammalecte_conj_opro');
                    this.disableOption('grammalecte_conj_opro');
                } else { // -1 or error
                    this.unselectOption('grammalecte_conj_opro');
                    this.disableOption('grammalecte_conj_opro');
                }
                this.xParent.getElementById('grammalecte_conj_note').textContent = "❦";
            }
            this.displayConj(oConjTable);
        } else {
            this.xParent.getElementById('grammalecte_conj_verb').style.color = "#BB4411";
        }
    }

    displayConj (oConjTable) {
        // function called when results come from the Worker
        if (oConjTable === null) {
            return;
        }
        try {
            this.xParent.getElementById('grammalecte_conj_verb').textContent = "";
            // infinitif
            this.xParent.getElementById('grammalecte_conj_infi').textContent = oConjTable["infi"] || " "; // something or nbsp
            // participe présent
            this.xParent.getElementById('grammalecte_conj_ppre').textContent = oConjTable["ppre"] || " ";
            // participes passés
            this.xParent.getElementById('grammalecte_conj_ppas1').textContent = oConjTable["ppas1"] || " ";
            this.xParent.getElementById('grammalecte_conj_ppas2').textContent = oConjTable["ppas2"] || " ";
            this.xParent.getElementById('grammalecte_conj_ppas3').textContent = oConjTable["ppas3"] || " ";
            this.xParent.getElementById('grammalecte_conj_ppas4').textContent = oConjTable["ppas4"] || " ";
            // impératif
            this.xParent.getElementById('grammalecte_conj_t_impe').textContent = oConjTable["t_impe"] || " ";
            this.xParent.getElementById('grammalecte_conj_impe1').textContent = oConjTable["impe1"] || " ";
            this.xParent.getElementById('grammalecte_conj_impe2').textContent = oConjTable["impe2"] || " ";
            this.xParent.getElementById('grammalecte_conj_impe3').textContent = oConjTable["impe3"] || " ";
            // présent
            this.xParent.getElementById('grammalecte_conj_t_ipre').textContent = oConjTable["t_ipre"] || " ";
            this.xParent.getElementById('grammalecte_conj_ipre1').textContent = oConjTable["ipre1"] || " ";
            this.xParent.getElementById('grammalecte_conj_ipre2').textContent = oConjTable["ipre2"] || " ";
            this.xParent.getElementById('grammalecte_conj_ipre3').textContent = oConjTable["ipre3"] || " ";
            this.xParent.getElementById('grammalecte_conj_ipre4').textContent = oConjTable["ipre4"] || " ";
            this.xParent.getElementById('grammalecte_conj_ipre5').textContent = oConjTable["ipre5"] || " ";
            this.xParent.getElementById('grammalecte_conj_ipre6').textContent = oConjTable["ipre6"] || " ";
            // imparfait
            this.xParent.getElementById('grammalecte_conj_t_iimp').textContent = oConjTable["t_iimp"] || " ";
            this.xParent.getElementById('grammalecte_conj_iimp1').textContent = oConjTable["iimp1"] || " ";
            this.xParent.getElementById('grammalecte_conj_iimp2').textContent = oConjTable["iimp2"] || " ";
            this.xParent.getElementById('grammalecte_conj_iimp3').textContent = oConjTable["iimp3"] || " ";
            this.xParent.getElementById('grammalecte_conj_iimp4').textContent = oConjTable["iimp4"] || " ";
            this.xParent.getElementById('grammalecte_conj_iimp5').textContent = oConjTable["iimp5"] || " ";
            this.xParent.getElementById('grammalecte_conj_iimp6').textContent = oConjTable["iimp6"] || " ";
            // passé simple
            this.xParent.getElementById('grammalecte_conj_t_ipsi').textContent = oConjTable["t_ipsi"] || " ";
            this.xParent.getElementById('grammalecte_conj_ipsi1').textContent = oConjTable["ipsi1"] || " ";
            this.xParent.getElementById('grammalecte_conj_ipsi2').textContent = oConjTable["ipsi2"] || " ";
            this.xParent.getElementById('grammalecte_conj_ipsi3').textContent = oConjTable["ipsi3"] || " ";
            this.xParent.getElementById('grammalecte_conj_ipsi4').textContent = oConjTable["ipsi4"] || " ";
            this.xParent.getElementById('grammalecte_conj_ipsi5').textContent = oConjTable["ipsi5"] || " ";
            this.xParent.getElementById('grammalecte_conj_ipsi6').textContent = oConjTable["ipsi6"] || " ";
            // futur
            this.xParent.getElementById('grammalecte_conj_t_ifut').textContent = oConjTable["t_ifut"] || " ";
            this.xParent.getElementById('grammalecte_conj_ifut1').textContent = oConjTable["ifut1"] || " ";
            this.xParent.getElementById('grammalecte_conj_ifut2').textContent = oConjTable["ifut2"] || " ";
            this.xParent.getElementById('grammalecte_conj_ifut3').textContent = oConjTable["ifut3"] || " ";
            this.xParent.getElementById('grammalecte_conj_ifut4').textContent = oConjTable["ifut4"] || " ";
            this.xParent.getElementById('grammalecte_conj_ifut5').textContent = oConjTable["ifut5"] || " ";
            this.xParent.getElementById('grammalecte_conj_ifut6').textContent = oConjTable["ifut6"] || " ";
            // Conditionnel
            this.xParent.getElementById('grammalecte_conj_t_conda').textContent = oConjTable["t_conda"] || " ";
            this.xParent.getElementById('grammalecte_conj_conda1').textContent = oConjTable["conda1"] || " ";
            this.xParent.getElementById('grammalecte_conj_conda2').textContent = oConjTable["conda2"] || " ";
            this.xParent.getElementById('grammalecte_conj_conda3').textContent = oConjTable["conda3"] || " ";
            this.xParent.getElementById('grammalecte_conj_conda4').textContent = oConjTable["conda4"] || " ";
            this.xParent.getElementById('grammalecte_conj_conda5').textContent = oConjTable["conda5"] || " ";
            this.xParent.getElementById('grammalecte_conj_conda6').textContent = oConjTable["conda6"] || " ";
            this.xParent.getElementById('grammalecte_conj_t_condb').textContent = oConjTable["t_condb"] || " ";
            this.xParent.getElementById('grammalecte_conj_condb1').textContent = oConjTable["condb1"] || " ";
            this.xParent.getElementById('grammalecte_conj_condb2').textContent = oConjTable["condb2"] || " ";
            this.xParent.getElementById('grammalecte_conj_condb3').textContent = oConjTable["condb3"] || " ";
            this.xParent.getElementById('grammalecte_conj_condb4').textContent = oConjTable["condb4"] || " ";
            this.xParent.getElementById('grammalecte_conj_condb5').textContent = oConjTable["condb5"] || " ";
            this.xParent.getElementById('grammalecte_conj_condb6').textContent = oConjTable["condb6"] || " ";
            // subjonctif présent
            this.xParent.getElementById('grammalecte_conj_t_spre').textContent = oConjTable["t_spre"] || " ";
            this.xParent.getElementById('grammalecte_conj_spre1').textContent = oConjTable["spre1"] || " ";
            this.xParent.getElementById('grammalecte_conj_spre2').textContent = oConjTable["spre2"] || " ";
            this.xParent.getElementById('grammalecte_conj_spre3').textContent = oConjTable["spre3"] || " ";
            this.xParent.getElementById('grammalecte_conj_spre4').textContent = oConjTable["spre4"] || " ";
            this.xParent.getElementById('grammalecte_conj_spre5').textContent = oConjTable["spre5"] || " ";
            this.xParent.getElementById('grammalecte_conj_spre6').textContent = oConjTable["spre6"] || " ";
            // subjonctif imparfait
            this.xParent.getElementById('grammalecte_conj_t_simp').textContent = oConjTable["t_simp"] || " ";
            this.xParent.getElementById('grammalecte_conj_simp1').textContent = oConjTable["simp1"] || " ";
            this.xParent.getElementById('grammalecte_conj_simp2').textContent = oConjTable["simp2"] || " ";
            this.xParent.getElementById('grammalecte_conj_simp3').textContent = oConjTable["simp3"] || " ";
            this.xParent.getElementById('grammalecte_conj_simp4').textContent = oConjTable["simp4"] || " ";
            this.xParent.getElementById('grammalecte_conj_simp5').textContent = oConjTable["simp5"] || " ";
            this.xParent.getElementById('grammalecte_conj_simp6').textContent = oConjTable["simp6"] || " ";
        }
        catch (e) {
            showError(e);
        }
    }
}


class GrammalecteTooltip {

    constructor (xParent, xGCPanelContent) {
        this.xParent = xParent;
        this.sErrorId = null;
        this.xTooltip = oGrammalecte.createNode("div", {id: "grammalecte_tooltip"});
        this.xTooltipArrow = oGrammalecte.createNode("img", {
            id: "grammalecte_tooltip_arrow",
            src: "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAgAAAAICAYAAADED76LAAAABGdBTUEAALGPC/xhBQAAAAlwSFlzAAAOwAAADsABataJCQAAABl0RVh0U29mdHdhcmUAcGFpbnQubmV0IDQuMC4xNzNun2MAAAAnSURBVChTY/j//z8cq/kW/wdhZDEMSXRFWCVhGKwAmwQyHngFxf8B5fOGYfeFpYoAAAAASUVORK5CYII=",
            alt: "^",
        });
        // message
        let xMessageBlock = oGrammalecte.createNode("div", {id: "grammalecte_tooltip_message_block"});
        xMessageBlock.appendChild(oGrammalecte.createNode("div", {id: "grammalecte_tooltip_rule_id"}));
        xMessageBlock.appendChild(oGrammalecte.createNode("div", {id: "grammalecte_tooltip_message", textContent: "Erreur."}));
        this.xTooltip.appendChild(xMessageBlock);
        // suggestions
        this.xTooltip.appendChild(oGrammalecte.createNode("div", {id: "grammalecte_tooltip_sugg_title", textContent: "SUGGESTIONS :"}));
        this.xTooltipSuggBlock = oGrammalecte.createNode("div", {id: "grammalecte_tooltip_sugg_block"});
        this.xTooltip.appendChild(this.xTooltipSuggBlock);
        // actions
        let xActions = oGrammalecte.createNode("div", {id: "grammalecte_tooltip_actions"});
        xActions.appendChild(oGrammalecte.createNode("div", {id: "grammalecte_tooltip_ignore", textContent: "Ignorer"}));
        xActions.appendChild(oGrammalecte.createNode("div", {id: "grammalecte_tooltip_url", textContent: "Voulez-vous en savoir plus ?…"}, {url: ""}));
        xActions.appendChild(oGrammalecte.createNode("div", {id: "grammalecte_tooltip_db_search", textContent: "››"}, {url: ""}));
        this.xTooltip.appendChild(xActions);
        // add tooltip to the page
        xGCPanelContent.appendChild(this.xTooltip);
        xGCPanelContent.appendChild(this.xTooltipArrow);
    }

    show (xParagraph, sNodeErrorId) {  // err
        try {
            // we kill autorefresh for safety
            window.clearTimeout(parseInt(xParagraph.dataset.timer_id, 10));
            //
            let xNodeErr = this.xParent.getElementById(sNodeErrorId);
            this.sErrorId = xNodeErr.dataset.error_id; // we store error_id here to know if spell_suggestions are given to the right word.
            let nTooltipLeftLimit = oGrammalecte.oGCPanel.getWidth() - 330; // paragraph width - tooltip width
            let nArrowLimit = oGrammalecte.oGCPanel.getWidth() - 20;
            this.xTooltipArrow.style.top = (xNodeErr.offsetTop + 16) + "px";
            let nUsefulErrorWidth = ((xNodeErr.offsetLeft + xNodeErr.offsetWidth) > nArrowLimit) ? (nArrowLimit - xNodeErr.offsetLeft) : xNodeErr.offsetWidth;
            this.xTooltipArrow.style.left = (xNodeErr.offsetLeft + Math.floor((nUsefulErrorWidth / 2)) - 4) + "px"; // 4 is half the width of the arrow.
            this.xTooltip.style.top = (xNodeErr.offsetTop + 20) + "px";
            this.xTooltip.style.left = (xNodeErr.offsetLeft > nTooltipLeftLimit) ? nTooltipLeftLimit + "px" : xNodeErr.offsetLeft + "px";
            if (xNodeErr.dataset.error_type === "grammar") {
                // grammar error
                if (xNodeErr.dataset.gc_message.includes(" ##")) {
                    // display rule id
                    let n = xNodeErr.dataset.gc_message.indexOf(" ##");
                    this.xParent.getElementById("grammalecte_tooltip_message").textContent = xNodeErr.dataset.gc_message.slice(0, n);
                    this.xParent.getElementById("grammalecte_tooltip_rule_id").textContent = "Règle : " + xNodeErr.dataset.gc_message.slice(n+2);
                    this.xParent.getElementById("grammalecte_tooltip_rule_id").style.display = "block";
                } else {
                    this.xParent.getElementById("grammalecte_tooltip_message").textContent = xNodeErr.dataset.gc_message;
                    this.xParent.getElementById("grammalecte_tooltip_rule_id").style.display = "none";
                }
                if (xNodeErr.dataset.gc_url != "") {
                    this.xParent.getElementById("grammalecte_tooltip_url").dataset.url = xNodeErr.dataset.gc_url;
                    this.xParent.getElementById("grammalecte_tooltip_url").style.display = "inline";
                } else {
                    this.xParent.getElementById("grammalecte_tooltip_url").dataset.url = "";
                    this.xParent.getElementById("grammalecte_tooltip_url").style.display = "none";
                }
                this.xParent.getElementById("grammalecte_tooltip_db_search").style.display = "none";
                this.xParent.getElementById("grammalecte_tooltip_ignore").dataset.error_id = xNodeErr.dataset.error_id;
                let iSugg = 0;
                this.clearSuggestionBlock();
                if (xNodeErr.dataset.suggestions.length > 0) {
                    for (let sSugg of xNodeErr.dataset.suggestions.split("|")) {
                        this.xTooltipSuggBlock.appendChild(this._createSuggestion(xNodeErr.dataset.error_id, 0, iSugg, sSugg));
                        this.xTooltipSuggBlock.appendChild(document.createTextNode(" "));
                        iSugg += 1;
                    }
                } else {
                    this.xTooltipSuggBlock.textContent = "Aucune.";
                }
            }
            if (xNodeErr.dataset.error_type === "spelling") {
                // spelling mistake
                this.xParent.getElementById("grammalecte_tooltip_message").textContent = "Mot inconnu du dictionnaire.";
                this.xParent.getElementById("grammalecte_tooltip_ignore").dataset.error_id = xNodeErr.dataset.error_id;
                this.xParent.getElementById("grammalecte_tooltip_rule_id").style.display = "none";
                this.xParent.getElementById("grammalecte_tooltip_url").dataset.url = "";
                this.xParent.getElementById("grammalecte_tooltip_url").style.display = "none";
                this.xParent.getElementById("grammalecte_tooltip_db_search").style.display = "inline-block";
                this.xParent.getElementById("grammalecte_tooltip_db_search").dataset.url = "https://grammalecte.net/dictionary.php?prj=fr&lemma="+xNodeErr.textContent;
                this.clearSuggestionBlock();
                this.xTooltipSuggBlock.textContent = "Recherche de graphies possibles…";
                oGrammalecteBackgroundPort.getSpellSuggestions(xNodeErr.textContent, "__GrammalectePanel__", xNodeErr.dataset.error_id);
            }
            this.xTooltipArrow.style.display = "block";
            this.xTooltip.style.display = "block";
        }
        catch (e) {
            showError(e);
        }
    }

    clearSuggestionBlock () {
        while (this.xTooltipSuggBlock.firstChild) {
            this.xTooltipSuggBlock.removeChild(this.xTooltipSuggBlock.firstChild);
        }
    }

    hide () {
        this.xTooltipArrow.style.display = "none";
        this.xTooltip.style.display = "none";
    }

    _createSuggestion (sErrorId, iSuggBlock, iSugg, sSugg) {
        let xNodeSugg = document.createElement("div");
        xNodeSugg.id = "grammalecte_sugg" + sErrorId + "-" + iSuggBlock.toString() + "-" + iSugg.toString();
        xNodeSugg.className = "grammalecte_tooltip_sugg";
        xNodeSugg.dataset.error_id = sErrorId;
        xNodeSugg.textContent = sSugg;
        return xNodeSugg;
    }

    setSpellSuggestionsFor (sWord, aSugg, iSuggBlock, sErrorId) {
        // spell checking suggestions
        try {
            if (sErrorId === this.sErrorId) {
                let xSuggBlock = this.xParent.getElementById("grammalecte_tooltip_sugg_block");
                if (iSuggBlock == 0) {
                    xSuggBlock.textContent = "";
                }
                if (!aSugg || aSugg.length == 0) {
                    if (iSuggBlock == 0) {
                        xSuggBlock.appendChild(document.createTextNode("Aucune."));
                    }
                } else {
                    if (iSuggBlock > 0) {
                        xSuggBlock.appendChild(oGrammalecte.createNode("div", {className: "grammalecte_tooltip_other_sugg_title", textContent: "AUTRES SUGGESTIONS :"}));
                    }
                    let iSugg = 0;
                    for (let sSugg of aSugg) {
                        xSuggBlock.appendChild(this._createSuggestion(sErrorId, iSuggBlock, iSugg, sSugg));
                        xSuggBlock.appendChild(document.createTextNode(" "));
                        iSugg += 1;
                    }
                }
            }
        }
        catch (e) {
            let xSuggBlock = this.xParent.getElementById("grammalecte_tooltip_sugg_block");
            xSuggBlock.appendChild(document.createTextNode("# Oups. Le mécanisme de suggestion orthographique a rencontré un bug… (Ce module est encore en phase β.)"));
            showError(e);
        }
    }
}
