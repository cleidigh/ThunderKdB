/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this file,
 * You can obtain one at http://mozilla.org/MPL/2.0/. */

/** Helper functions for LDAP */

EXPORTED_SYMBOLS = ["ldap"];
ldap = {} || ldap;

cal.xml.evalXPath = function evaluateXPath(aNode, aExpr, aResolver, aType) {
    const XPR = Components.interfaces.nsIDOMXPathResult;
    let doc = (aNode.ownerDocument ? aNode.ownerDocument : aNode);
    let resolver = aResolver || doc.createNSResolver(doc.documentElement);
    let resultType = aType || XPR.ANY_TYPE;

    let result = doc.evaluate(aExpr, aNode, resolver, resultType, null);
    let returnResult, next;
    switch (result.resultType) {
        case XPR.NUMBER_TYPE:
            returnResult = result.numberValue;
            break;
        case XPR.STRING_TYPE:
            returnResult = result.stringValue;
            break;
        case XPR.BOOLEAN_TYPE:
            returnResult = result.booleanValue;
            break;
        case XPR.UNORDERED_NODE_ITERATOR_TYPE:
        case XPR.ORDERED_NODE_ITERATOR_TYPE:
        case XPR.ORDERED_NODE_ITERATOR_TYPE:
            returnResult = [];
            while ((next = result.iterateNext())) {
                if (next instanceof Components.interfaces.nsIDOMText) {
                    returnResult.push(next.wholeText);
                } else if (next instanceof Components.interfaces.nsIDOMAttr) {
                    returnResult.push(next.value);
                } else {
                    returnResult.push(next);
                }
            }
            break;
        case XPR.UNORDERED_NODE_SNAPSHOT_TYPE:
        case XPR.ORDERED_NODE_SNAPSHOT_TYPE:
            returnResult = [];
            for (let i = 0; i < result.snapshotLength; i++) {
                next = result.snapshotItem(i);
                if (next instanceof Components.interfaces.nsIDOMText) {
                    returnResult.push(next.wholeText);
                } else if (next instanceof Components.interfaces.nsIDOMAttr) {
                    returnResult.push(next.value);
                } else {
                    returnResult.push(next);
                }
            }
            break;
        case XPR.ANY_UNORDERED_NODE_TYPE:
        case XPR.FIRST_ORDERED_NODE_TYPE:
            returnResult = result.singleNodeValue;
            break;
        default:
            returnResult = null;
            break;
    }

    if (Array.isArray(returnResult) && returnResult.length == 0) {
        returnResult = null;
    }

    return returnResult;
};