// JavaScript

class Editor {

    constructor (sLang) {
        this.xEditor = GetCurrentEditor();
        this.lNode = [];
        this.lParsableNodes = ["P", "LI"];
        this.lRootNodes = ["DIV", "UL", "OL"];
    };

    _getTextFromNode (xNode) {
        if ("innerHTML" in xNode) {
            return xNode.innerHTML;
        } else {
            return xNode.textContent;
        }
    };

    * _getParsableNodes (xRootNode=this.xEditor.rootElement) {
        // recursive function
        try {
            for (let xNode of xRootNode.childNodes) {
                if (xNode.className !== "moz-cite-prefix" && xNode.tagName !== "BLOCKQUOTE"
                    && (xNode.nodeType == Node.TEXT_NODE || (xNode.nodeType == Node.ELEMENT_NODE && !xNode.textContent.startsWith(">")))
                    && xNode.textContent !== "") {
                    if (xNode.tagName === undefined) {
                        if (!xGrammalectePrefs.getBoolPref("bCheckSignature") && xNode.textContent.startsWith("-- ")) {
                            break;
                        }
                        yield xNode;
                    } else if (this.lParsableNodes.includes(xNode.tagName)) {
                        yield xNode;
                    } else if (this.lRootNodes.includes(xNode.tagName)) {
                        yield* this._getParsableNodes(xNode);
                    }
                }
            }
        } catch (e) {
            console.error(e);
            // Cu.reportError(e);
        }
    };

    * getParagraphs () {
        try {
            let i = 0;
            for (let xNode of this._getParsableNodes()) {
                this.lNode.push(xNode);
                yield [i, this._getTextFromNode(xNode)];
                i += 1;
            }
        } catch (e) {
            console.error(e);
            // Cu.reportError(e);
        }
    };

    getContent () {
        try {
            let sContent = "";
            for (let [i, sHTML] of this.getParagraphs()) {
                if (sContent.length > 0) {
                    sContent += "\n";
                }
                sContent += sHTML;
            }
            return sContent;
        } catch (e) {
            console.error(e);
            // Cu.reportError(e);
        }
    };

    getParagraph (iPara) {
        try {
            return this._getTextFromNode(this.lNode[iPara]);
        } catch (e) {
            console.error(e);
            // Cu.reportError(e);
        }
    };

    writeParagraph (iPara, sText) {
        try {
            let xNode = this.lNode[iPara];
            if ("innerHTML" in xNode) {
                xNode.innerHTML = sText;
            } else {
                xNode.textContent = sText;
            }
        } catch (e) {
            console.error(e);
            // Cu.reportError(e);
        }
    };

    changeParagraph (iPara, sModif, iStart, iEnd) {
        let sText = this.getParagraph(iPara);
        this.writeParagraph(iPara, sText.slice(0, iStart) + sModif + sText.slice(iEnd));
    };

    getLangFromSpellChecker () {
        try {
            let gSpellChecker = this.xEditor.getInlineSpellChecker(true);
            let sLang = gSpellChecker.spellChecker.GetCurrentDictionary();
            return sLang.slice(0, 2);
        } catch (e) {
            console.error(e);
            // Cu.reportError(e);
        }
    };
}
