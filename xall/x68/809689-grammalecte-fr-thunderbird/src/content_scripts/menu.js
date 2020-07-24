// JavaScript

/* jshint esversion:6, -W097 */
/* jslint esversion:6 */
/* global oGrammalecte, showError, window, document */

"use strict";


class GrammalecteButton {

    constructor () {
        // the pearl button
        this.xButton = oGrammalecte.createNode("div", { className: "grammalecte_menu_main_button", textContent: " " });
        this.xButton.onclick = () => {
            if (this.xTextNode) {
                oGrammalecte.startGCPanel(this.xTextNode);
            }
        };
        // about the text node
        this.xTextNode = null;
        // read user config
        this._bTextArea = true;
        this._bEditableNode = true;
        this._bIframe = false;
        if (bChrome) {
            browser.storage.local.get("ui_options", this.setOptions.bind(this));
        } else {
            browser.storage.local.get("ui_options").then(this.setOptions.bind(this), showError);
        }
    }

    setOptions (oOptions) {
        if (oOptions.hasOwnProperty("ui_options")) {
            this._bTextArea = oOptions.ui_options.textarea;
            this._bEditableNode = oOptions.ui_options.editablenode;
        }
    }

    examineNode (xNode) {
        if (!xNode || !xNode instanceof HTMLElement) {
            // not a node
            this.reject();
            return;
        }
        if (xNode === this.xTextNode) {
            // same node -> possibly click for resizing -> move it
            this.move();
            return;
        }
        if ( ( (xNode.tagName == "TEXTAREA" && this._bTextArea && xNode.getAttribute("spellcheck") !== "false")
               || (xNode.tagName == "IFRAME" && this._bIframe) )
             && !(xNode.dataset.grammalecte_button  &&  xNode.dataset.grammalecte_button == "false") ) {
            // textarea or iframe
            this.accept(xNode)
        }
        else if (xNode.isContentEditable && this._bEditableNode) {
            // editable node
            xNode = oGrammalecte.findOriginEditableNode(xNode);
            if ((xNode.tagName == "P" || xNode.tagName == "DIV") && !(xNode.dataset.grammalecte_button && xNode.dataset.grammalecte_button == "false")) {
                this.accept(xNode);
            } else {
                this.reject();
            }
        } else {
            this.reject();
        }
    }

    accept (xNode=null) {
        if (xNode) {
            this.xTextNode = xNode;
            this.xButton.style.display = "none"; // we hide it before showing it again to relaunch the animation
            this.move();
            this.xButton.style.display = "block";
        }
    }

    reject () {
        this.xTextNode = null;
        this.xButton.style.display = "none";
    }

    move () {
        if (this.xTextNode) {
            let oCoord = oGrammalecte.getElementCoord(this.xTextNode);
            this.xButton.style.top = `${oCoord.bottom}px`;
            this.xButton.style.left = `${oCoord.left}px`;
        }
    }

    insertIntoPage () {
        this.bShadow = document.body.createShadowRoot || document.body.attachShadow;
        if (this.bShadow) {
            this.xShadowHost = oGrammalecte.createNode("div", { id: "grammalecte_menu_main_button_shadow_host", style: "width:0; height:0;" });
            this.xShadowRoot = this.xShadowHost.attachShadow({ mode: "open" });
            oGrammalecte.createStyle("content_scripts/menu.css", null, this.xShadowRoot);
            this.xShadowRoot.appendChild(this.xButton);
            document.body.appendChild(this.xShadowHost);
        }
        else {
            if (!document.getElementById("grammalecte_cssmenu")) {
                oGrammalecte.createStyle("content_scripts/menu.css", "grammalecte_cssmenu", document.head);
            }
            document.body.appendChild(this.xButton);
        }
    }
}
