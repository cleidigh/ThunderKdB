/*global log */
/*global customElements */

{
    function getChildNode(type) {
        log("debug: getChildNode() called with (" + type + ")", 6);
        const elementMapping = {
            "resubmit@ezamber.pl#actionSendNow": "ruleactiontarget-replyto",
            "resubmit@ezamber.pl#actionSendLater": "ruleactiontarget-replyto",
            "resubmit@ezamber.pl#actionCompose": "ruleactiontarget-replyto",
            "resubmit@ezamber.pl#actionSendNowMsg": "ruleactiontarget-replyto",
            "resubmit@ezamber.pl#actionSendLaterMsg": "ruleactiontarget-replyto",
            "resubmit@ezamber.pl#actionComposeMsg": "ruleactiontarget-replyto"
        };
        const elementName = elementMapping[type];
        log("debug: getChildNode(): elementName=" + elementName, 6);
        return elementName ? document.createXULElement(elementName) : null;
    }

    function patchRuleactiontargetWrapper() {
        "use strict";

        log("debug: patchRuleactiontargetWrapper() called", 6);

        let wrapper = customElements.get("ruleactiontarget-wrapper");
        log("debug: patchRuleactiontargetWrapper(): customElements.get('ruleactiontarget-wrapper') returned: " + wrapper, 7);
        if (wrapper) {
            let prevMethod = wrapper.prototype._getChildNode;
            log("debug: patchRuleactiontargetWrapper(): wrapper.prototype._getChildNode: " + prevMethod, 7);
            if (prevMethod) {
                wrapper.prototype._getChildNode = function(type) {
                    let element = getChildNode(type);
                    return element ? element : prevMethod(type);
                };
            }
        }
    }

    patchRuleactiontargetWrapper();
}

// vim: set expandtab tabstop=4 shiftwidth=4:
