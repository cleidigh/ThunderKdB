// JavaScript

// Editor for HTML page


"use strict";


/*
    Editor for HTML page (Thunderbird or Iframe)
*/
class HTMLPageEditor {

	constructor (xDocument, bCheckSignature=false) {
        this.xDocument = xDocument;
        this.xRootNode = xDocument.body;
        //console.log(xDocument.body);
        //console.log(xDocument.body.innerHTML);
        this.lNode = [];
        this.bCheckSignature = bCheckSignature;
        this._lParsableNodes = ["P", "LI", "H1", "H2", "H3", "H4", "H5", "H6"];
        this._lRootNodes = ["DIV", "UL", "OL"];
        if (bThunderbird) {
            oGrammalecte.oGCPanel.addMessageToGCPanel("❗ Les éléments de formatage direct (non textuels) sont susceptibles d’être effacés lors de la correction.");
        }
    }

    * _getParsableNodes (xRootNode) {
        // recursive function
        try {
            for (let xNode of xRootNode.childNodes) {
                if (xNode.className !== "moz-cite-prefix" && xNode.tagName !== "BLOCKQUOTE"
                    && (xNode.nodeType == Node.TEXT_NODE || (xNode.nodeType == Node.ELEMENT_NODE && !xNode.textContent.startsWith(">")))
                    && xNode.textContent !== "") {
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

    * getParagraphs () {
        try {
            let i = 0;
            for (let xNode of this._getParsableNodes(this.xRootNode)) {
                this.lNode.push(xNode);
                yield [i, xNode.textContent];
                i += 1;
            }
        }
        catch (e) {
            showError(e);
        }
    }

    getText () {
        try {
            let sPageText = "";
            for (let [i, sLine] of this.getParagraphs()) {
                sPageText += sLine + "\n";
            }
            return sPageText.slice(0,-1).normalize("NFC");
        }
        catch (e) {
            showError(e);
        }
    }

    getParagraph (iPara) {
        try {
            return this.lNode[iPara].textContent;
        }
        catch (e) {
            showError(e);
        }
    }

    setParagraph (iPara, sText) {
        try {
            if (iPara < this.lNode.length) {
                this.lNode[iPara].textContent = oGrammalecte.purgeText(sText).normalize("NFC");
            }
        }
        catch (e) {
            showError(e);
        }
    }

    changeParagraph (iPara, sModif, iStart, iEnd) {
        let sText = this.getParagraph(iPara);
        this.writeParagraph(iPara, sText.slice(0, iStart) + sModif + sText.slice(iEnd));
    }

    loadText (sText) {
        let lParagraphs = sText.split("\n");
        for (let iPara = 0;  iPara < lParagraphs.length;  iPara++) {
            this.setParagraph(iPara, lParagraphs[iPara]);
        }
    }

    clear () {
        this.xDocument = null;
        this.xRootNode = null;
        this.lNode.length = 0;
    }
}


/*
    Editor for TextNode (Textarea or editable node)
*/
class TextNodeEditor {

    constructor (what, xResultNode=null) {
        this.xNode = null;
        this.dParagraph = new Map();
        this.bTextArea = false;
        this.bIframe = false;
        this.bResultInEvent = false; // if true, the node content is not modified, but an event is dispatched on the node with the modified text
        this.xResultNode = null; // only useful for text analysed without node
        if (xResultNode instanceof HTMLElement) {
            this.xResultNode = xResultNode;
            this.bResultInEvent = true;
        }
        if (typeof(what) == "string") {
            // SIMPLE TEXT
            if (!this.xResultNode) {
                oGrammalecte.oGCPanel.addMessageToGCPanel("⛔ Aucun champ textuel défini. Les changements ne seront pas répercutés sur la zone d’où le texte a été extrait.");
            }
            this.loadText(sText);
        }
        else if (what.nodeType && what.nodeType === 1) {
            // NODE
            this.xNode = what;
            this.bResultInEvent = Boolean(this.xNode.dataset.grammalecte_result_via_event && this.xNode.dataset.grammalecte_result_via_event == "true");
            this.bTextArea = (this.xNode.tagName == "TEXTAREA" || this.xNode.tagName == "INPUT");
            this.bIframe = (this.xNode.tagName == "IFRAME");
            if (this.bTextArea) {
                this.xNode.disabled = true;
                this.loadText(this.xNode.value);
            }
            else if (this.bIframe) {
                // iframe
                if (!this.bResultInEvent) {
                    oGrammalecte.oGCPanel.addMessageToGCPanel("⛔ La zone analysée est un cadre contenant une autre page web (“iframe”). Les changements faits ne peuvent être pas répercutés dans cette zone.");
                }
                this.loadText(this.xNode.contentWindow.document.body.innerText);
            }
            else {
                // editable node
                oGrammalecte.oGCPanel.addMessageToGCPanel("❗ La zone de texte analysée est un champ textuel enrichi susceptible de contenir des éléments non textuels qui seront effacés lors de la correction.");
                this.loadText(this.xNode.innerText);
            }
        }
    }

    loadText (sText) {
        // function also used by the text formatter
        if (typeof(sText) === "string") {
            this.dParagraph.clear();
            let i = 0;
            let iStart = 0;
            let iEnd = 0;
            sText = sText.replace(/\r\n/g, "\n").replace(/\r/g, "\n").normalize("NFC");
            while ((iEnd = sText.indexOf("\n", iStart)) !== -1) {
                this.dParagraph.set(i, sText.slice(iStart, iEnd));
                i++;
                iStart = iEnd+1;
            }
            this.dParagraph.set(i, sText.slice(iStart));
            //console.log("Paragraphs number: " + (i+1));
        }
        this.write();
    }

    clear () {
        if (this.xNode !== null) {
            this.xNode.disabled = false;
            this.bTextArea = false;
            this.bIframe = false;
            this.bResultInEvent = false;
            this.xNode = null;
            this.xResultNode = null;
        }
        this.dParagraph.clear();
    }

    getText () {
        return [...this.dParagraph.values()].join("\n").normalize("NFC");
    }

    setParagraph (iParagraph, sText) {
        this.dParagraph.set(iParagraph, oGrammalecte.purgeText(sText).normalize("NFC"));
        this.write();
    }

    getParagraph (iParaNum) {
        return this.dParagraph.get(iParaNum);
    }

    _eraseNodeContent () {
        while (this.xNode.firstChild) {
            this.xNode.removeChild(this.xNode.firstChild);
        }
    }

    write () {
        if (this.xNode !== null) {
            if (this.bResultInEvent) {
                const xEvent = new CustomEvent("GrammalecteResult", { detail: JSON.stringify({ sType: "text", sText: this.getText() }) });
                this.xNode.dispatchEvent(xEvent);
                //console.log("[Grammalecte debug] Text sent to xNode via event:", xEvent.detail);
            }
            else if (this.bTextArea) {
                this.xNode.value = this.getText();
                //console.log("[Grammalecte debug] text written in textarea:", this.getText());
            }
            else if (this.bIframe) {
                //console.log(this.getText());
            }
            else {
                this._eraseNodeContent();
                this.dParagraph.forEach((val, key) => {
                    this.xNode.appendChild(document.createTextNode(val.normalize("NFC")));
                    this.xNode.appendChild(document.createElement("br"));
                });
                //console.log("[Grammalecte debug] text written in editable node:", this.getText());
            }
        }
        else if (this.xResultNode !== null) {
            const xEvent = new CustomEvent("GrammalecteResult", { detail: JSON.stringify({ sType: "text", sText: this.getText() }) });
            this.xResultNode.dispatchEvent(xEvent);
            //console.log("[Grammalecte debug] Text sent to xResultNode via event:", xEvent.detail);
        }
    }
}
