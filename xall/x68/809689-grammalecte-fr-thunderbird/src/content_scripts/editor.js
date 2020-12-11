// JavaScript

// Editor for HTML page


"use strict";


// Exception list
var oGrammalecteExclusions = new Set([
    "twitter.com"
]);


var oGrammalecteMessages = {
    "no_text_area": "⛔ Aucun champ textuel défini. Les changements ne seront pas répercutés sur la zone d’où le texte a été extrait.",
    "format_warning": "❗ La zone de texte est un champ textuel enrichi. Les éléments de formatage direct (non textuels) sont susceptibles d’être effacés lors de la correction.",
    "excluded_site": "⛔ Renvoyer les corrections sur ce site s’avère difficile à cause des interférences possibles. La zone d’où a été extrait le texte ne sera pas modifiée. Vous pouvez copier le texte dans le presse-papiers avec le bouton 📋 ci-dessus."
};


/*
    Text Editor
*/
var oGrammalecteTextEditor = {

    dParagraphs: new Map(),

    loadText: function (sText) {
        // function also used by the text formatter
        this.dParagraphs.clear();
        if (typeof(sText) === "string") {
            let i = 0;
            let iStart = 0;
            let iEnd = 0;
            sText = this.purgeText(sText).normalize("NFC");
            while ((iEnd = sText.indexOf("\n", iStart)) !== -1) {
                this.dParagraphs.set(i, sText.slice(iStart, iEnd));
                i++;
                iStart = iEnd+1;
            }
            this.dParagraphs.set(i, sText.slice(iStart));
            //console.log("Paragraphs number: " + (i+1));
        }
        else {
            console.log("[Grammalecte] Error. This is not a text:", sText);
        }
    },

    getText: function () {
        return [...this.dParagraphs.values()].join("\n").normalize("NFC");
    },

    getParagraphs: function () {
        return this.dParagraphs.entries();
    },

    getParagraph: function (iParagraph) {
        return this.dParagraphs.get(iParagraph);
    },

    setParagraph: function (iParagraph, sParagraph) {
        this.dParagraphs.set(iParagraph, this.purgeText(sParagraph).normalize("NFC"));
    },

    purgeText: function (sText) {
        //console.log(sText);
        // return sText.replace(/&nbsp;/g, " ").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&amp;/g, "&").replace(/\r\n/g, "\n").replace(/\r/g, "\n"); // probably useless now
        return sText.replace(/\r\n/g, "\n").replace(/\r/g, "\n");
    },

    clear: function () {
        this.dParagraphs.clear();
    }
}


/*
    Editor for HTML page (Thunderbird or Iframe)
*/
class HTMLPageEditor {

	constructor (xWhat, xResultNode=null, bCheckSignature=true) {
        this.xWhat = xWhat;
        this.bIframe = false;
        this.bWrite = !oGrammalecteExclusions.has(document.location.host);
        //console.log(xWhat);
        if (xWhat.tagName  &&  xWhat.tagName == "IFRAME") {
            // iframe
            this.xDocument = xWhat.contentWindow.document;
            this.bIframe = true;
        }
        else if (xWhat instanceof HTMLDocument) {
            // page
            this.xDocument = xWhat;
        }
        else {
            console.log("[Grammalecte] HTMLPageEditor: unknown element");
        }
        this.xRootNode = this.xDocument.body;
        //console.log(this.xDocument.body);
        //console.log(this.xDocument.body.innerHTML);
        this.bResultInEvent = Boolean(this.xWhat.dataset && this.xWhat.dataset.grammalecte_result_via_event && this.xWhat.dataset.grammalecte_result_via_event == "true");
        this.xResultNode = false; // only useful for text analysed without node
        if (xResultNode instanceof HTMLElement) {
            this.xResultNode = xResultNode;
            this.bResultInEvent = true;
        }
        this.lNode = [];
        this.bCheckSignature = bCheckSignature;
        this._lParsableNodes = ["P", "LI", "H1", "H2", "H3", "H4", "H5", "H6"];
        this._lRootNodes = ["DIV", "UL", "OL", "BLOCKQUOTE"];
        if (!this.bWrite) {
            // we don’t write back to the page
            oGrammalecte.oGCPanel.addMessageToGCPanel(oGrammalecteMessages["excluded_site"]);
            oGrammalecte.oGCPanel.highlightClipboardButton();
        } else {
            oGrammalecte.oGCPanel.addMessageToGCPanel(oGrammalecteMessages["format_warning"]);
        }
        let sText = this.getTextFromPage();
        oGrammalecteTextEditor.loadText(sText);
    }

    * _getParsableNodes (xRootNode) {
        // recursive function
        try {
            for (let xNode of xRootNode.childNodes) {
                if (xNode.className !== "moz-cite-prefix" && xNode.className !== "moz-forward-container"
                    && ! (bThunderbird && xNode.tagName == "BLOCKQUOTE" && xNode.cite)
                    && ( xNode.nodeType == Node.TEXT_NODE || (xNode.nodeType == Node.ELEMENT_NODE && !xNode.textContent.startsWith(">")) )
                    && xNode.textContent !== "") {
                    // console.log("tag:", xNode.tagName, "class:", xNode.className, " nodeType:", xNode.nodeType, " type:", xNode.type);
                    if (xNode.tagName === undefined) {
                        if (!this.bCheckSignature && xNode.textContent.startsWith("-- ")) {
                            break;
                        }
                        yield xNode;
                    }
                    else if (this._lParsableNodes.includes(xNode.tagName)) {
                        yield xNode;
                    }
                    else if (this._lRootNodes.includes(xNode.tagName)) {
                        yield* this._getParsableNodes(xNode);
                    }
                }
            }
        }
        catch (e) {
            showError(e);
        }
    }

    getTextFromPage () {
        try {
            // return this.xRootNode.innerText;
            let sPageText = "";
            for (let xNode of this._getParsableNodes(this.xRootNode)) {
                if (xNode.textContent.trim() !== "") {
                    this.lNode.push(xNode);
                    sPageText += xNode.textContent.replace(/\n/g, "") + "\n";
                }
            }
            //console.log(sPageText);
            return sPageText.slice(0,-1).normalize("NFC");
        }
        catch (e) {
            showError(e);
            return "[Grammalecte] Erreur. Aucun texte récupéré.";
        }
    }

    getText () {
        return oGrammalecteTextEditor.getText();
    }

    getParagraph (iParagraph) {
        return oGrammalecteTextEditor.getParagraph(iParagraph);
    }

    setParagraph (iParagraph, sText) {
        try {
            oGrammalecteTextEditor.setParagraph(iParagraph, sText);
            if (this.bResultInEvent) {
                const xEvent = new CustomEvent("GrammalecteResult", { detail: JSON.stringify({ sType: "text", sText: oGrammalecteTextEditor.getText() }) });
                if (this.xResultNode) {
                    this.xResultNode.dispatchEvent(xEvent);
                } else {
                    this.xWhat.dispatchEvent(xEvent);
                }
                //console.log("[Grammalecte debug] Text sent to xWhat via event:", xEvent.detail);
            }
            else if (iParagraph < this.lNode.length) {
                this.lNode[iParagraph].textContent = oGrammalecteTextEditor.getParagraph(iParagraph);
            }
        }
        catch (e) {
            showError(e);
        }
    }

    loadText (sText) {
        oGrammalecteTextEditor.loadText(sText);
        this.write();
    }

    write () {
        if (!this.bWrite) {
            return;
        }
        for (let [i, sParagraph] of oGrammalecteTextEditor.getParagraphs()) {
            if (i < this.lNode.length) {
                this.lNode[iParagraph].textContent = sParagraph;
            }
        }
    }

    clear () {
        this.xDocument = null;
        this.xRootNode = null;
        this.lNode.length = 0;
        oGrammalecteTextEditor.clear();
    }
}


/*
    Editor for TextNode (Textarea or editable node)
*/
class TextNodeEditor {

    constructor (what, xResultNode=null) {
        this.xNode = null;
        this.bTextArea = false;
        this.bWrite = !oGrammalecteExclusions.has(document.location.host);
        this.bResultInEvent = false; // if true, the node content is not modified, but an event is dispatched on the node with the modified text
        this.xResultNode = null; // only useful for text analysed without node
        if (xResultNode instanceof HTMLElement) {
            this.xResultNode = xResultNode;
            this.bResultInEvent = true;
        }
        if (typeof(what) == "string") {
            // SIMPLE TEXT
            if (!this.xResultNode) {
                oGrammalecte.oGCPanel.addMessageToGCPanel(oGrammalecteMessages["no_text_area"]);
            }
            this.loadText(what);
        }
        else if (what.nodeType && what.nodeType === 1) {
            // NODE
            this.xNode = what;
            this.bResultInEvent = Boolean(this.xNode.dataset.grammalecte_result_via_event && this.xNode.dataset.grammalecte_result_via_event == "true");
            this.bTextArea = (this.xNode.tagName == "TEXTAREA" || this.xNode.tagName == "INPUT");
            if (this.bTextArea) {
                // text area
                this.xNode.disabled = true;
                this.loadText(this.xNode.value);
            }
            else {
                // editable node
                if (!this.bWrite) {
                    // we don’t write back to the page
                    oGrammalecte.oGCPanel.addMessageToGCPanel(oGrammalecteMessages["excluded_site"]);
                    oGrammalecte.oGCPanel.highlightClipboardButton();
                } else {
                    oGrammalecte.oGCPanel.addMessageToGCPanel(oGrammalecteMessages["format_warning"]);
                }
                this.loadText(this.xNode.innerText);
            }
        }
    }

    loadText (sText) {
        // function also used by the text formatter
        oGrammalecteTextEditor.loadText(sText);
        this.write();
    }

    clear () {
        if (this.xNode !== null) {
            this.xNode.disabled = false;
        }
        this.bTextArea = false;
        this.bResultInEvent = false;
        this.xNode = null;
        this.xResultNode = null;
        oGrammalecteTextEditor.clear();
    }

    getText () {
        return oGrammalecteTextEditor.getText();
    }

    setParagraph (iParagraph, sText) {
        oGrammalecteTextEditor.setParagraph(iParagraph, sText);
        this.write();
    }

    getParagraph (iParagraph) {
        return oGrammalecteTextEditor.getParagraph(iParagraph);
    }

    _eraseNodeContent () {
        while (this.xNode.firstChild) {
            this.xNode.removeChild(this.xNode.firstChild);
        }
    }

    write () {
        if (!this.bWrite) {
            return;
        }
        if (this.xNode !== null) {
            if (this.bResultInEvent) {
                const xEvent = new CustomEvent("GrammalecteResult", { detail: JSON.stringify({ sType: "text", sText: oGrammalecteTextEditor.getText() }) });
                this.xNode.dispatchEvent(xEvent);
                //console.log("[Grammalecte debug] Text sent to xNode via event:", xEvent.detail);
            }
            else if (this.bTextArea) {
                // Text area
                this.xNode.value = oGrammalecteTextEditor.getText();
                //console.log("[Grammalecte debug] text written in textarea:", oGrammalecteTextEditor.getText());
            }
            else {
                // Editable node
                this._eraseNodeContent();
                for (let [i, sParagraph] of oGrammalecteTextEditor.getParagraphs()) {
                    this.xNode.appendChild(document.createTextNode(sParagraph));
                    this.xNode.appendChild(document.createElement("br"));
                };
                //console.log("[Grammalecte debug] text written in editable node:", oGrammalecteTextEditor.getText());
            }
        }
        else if (this.xResultNode !== null) {
            const xEvent = new CustomEvent("GrammalecteResult", { detail: JSON.stringify({ sType: "text", sText: oGrammalecteTextEditor.getText() }) });
            this.xResultNode.dispatchEvent(xEvent);
            //console.log("[Grammalecte debug] Text sent to xResultNode via event:", xEvent.detail);
        }
    }
}
