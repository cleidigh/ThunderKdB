// JavaScript

"use strict";


var oGrammalecteAPI = {
    // Thes script might be reloaded, don’t use const or let.

    // functions callable from within pages
    // to be sent to the content-cript via an event “GrammalecteCall”

    sVersion: "1.0",

    generateNodeId: function (xNode) {
        xNode.id = "grammalecte_generated_id_" + Date.now().toString(36) + "_" + (Math.floor(Math.random() * (1000000))).toString(36);
        console.log("[Grammalecte API] generated id:", xNode.id);
        return xNode.id;
    },

    openPanelForNode: function (vNode) {
        //  Parameter: a HTML node or the identifier of a HTML node
        if (vNode instanceof HTMLElement) {
            let sNodeId = vNode.id || this.generateNodeId(vNode);
            let xEvent = new CustomEvent("GrammalecteCall", { detail: JSON.stringify({sCommand: "openPanelForNode", sNodeId: sNodeId}) });
            document.dispatchEvent(xEvent);
        }
        else if (typeof(vNode) === "string" && document.getElementById(vNode)) {
            let xEvent = new CustomEvent("GrammalecteCall", { detail: JSON.stringify({sCommand: "openPanelForNode", sNodeId: vNode}) });
            document.dispatchEvent(xEvent);
        }
        else {
            console.log("[Grammalecte API] Error: parameter is not a HTML node with an identifier.");
        }
    },

    openPanelForText: function (sText, vNode=null) {
        //  Parameter: text to analyze, and optionaly a node to send results to.
        if (typeof(sText) === "string") {
            let sNodeId = "";
            if (vNode instanceof HTMLElement) {
                sNodeId = vNode.id || this.generateNodeId(vNode);
            }
            else if (typeof(vNode) === "string" && document.getElementById(vNode)) {
                sNodeId = vNode;
            }
            else {
                console.log("[Grammalecte API] No node identifier. No event, no result will be sent.")
            }
            let xEvent = new CustomEvent("GrammalecteCall", { detail: JSON.stringify({sCommand: "openPanelForText", sText: sText, sNodeId: sNodeId}) });
            document.dispatchEvent(xEvent);
        } else {
            console.log("[Grammalecte API] Error: parameter is not a text.");
        }
    },

    parseNode: function (vNode) {
        /*  Parameter: a HTML node (with a identifier) or the identifier of a HTML node.
            The result will be sent as an event “GrammalecteResult” to the node.
        */
        if (vNode instanceof HTMLElement) {
            let sNodeId = vNode.id || this.generateNodeId(vNode);
            let xEvent = new CustomEvent("GrammalecteCall", { detail: JSON.stringify({sCommand: "parseNode", sNodeId: sNodeId}) });
            document.dispatchEvent(xEvent);
        }
        else if (typeof(vNode) === "string" && document.getElementById(vNode)) {
            let xEvent = new CustomEvent("GrammalecteCall", { detail: JSON.stringify({sCommand: "parseNode", sNodeId: vNode}) });
            document.dispatchEvent(xEvent);
        }
        else {
            console.log("[Grammalecte API] Error: parameter is not a HTML node with an identifier.");
        }
    },

    parseText: function (sText, vNode) {
        //  Parameter: text to analyze, and a node to send results to.
        if (typeof(sText) === "string") {
            if (vNode instanceof HTMLElement) {
                let sNodeId = vNode.id || this.generateNodeId(vNode);
                let xEvent = new CustomEvent("GrammalecteCall", { detail: JSON.stringify({sCommand: "parseText", sText: sText, sNodeId: sNodeId}) });
                document.dispatchEvent(xEvent);
            }
            else if (typeof(vNode) === "string" && document.getElementById(vNode)) {
                let xEvent = new CustomEvent("GrammalecteCall", { detail: JSON.stringify({sCommand: "parseText", sText: sText, sNodeId: vNode}) });
                document.dispatchEvent(xEvent);
            }
            else {
                console.log("[Grammalecte API] Error: parameter is not a HTML node with an identifier.");
            }
        } else {
            console.log("[Grammalecte API] Error: parameter is not a text.");
        }
    },

    getSpellSuggestions: function (sWord, sDestination, sRequestId="") {
        /* parameters:
            - sWord (string)
            - sDestination: HTML identifier (string) -> the result will be sent as an event “GrammalecteResult” to destination node
            - sRequestId: custom identifier for the request (string) [default = ""]
        */
        if (typeof(sWord) === "string"  &&  typeof(sDestination) === "string"  &&  typeof(sRequestId) === "string") {
            let xEvent = new CustomEvent("GrammalecteCall", { detail: JSON.stringify({sCommand: "getSpellSuggestions", sWord: sWord, sDestination: sDestination, sRequestId: sRequestId}) });
            document.dispatchEvent(xEvent);
        } else {
            console.log("[Grammalecte API] Error: one or several parameters aren’t string.");
        }
    }
}

/*
    Tell to the webpage that the Grammalecte API is ready.
*/
document.dispatchEvent(new Event('GrammalecteLoaded'));

