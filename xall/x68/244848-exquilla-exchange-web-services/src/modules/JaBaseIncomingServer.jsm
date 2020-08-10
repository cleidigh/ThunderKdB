/* -*- indent-tabs-mode: nil; js-indent-level: 2 -*- */
/* vim: set ts=2 et sw=2 tw=80 filetype=javascript: */
/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

const EXPORTED_SYMBOLS = ["JaBaseIncomingServer"];

var Cc = Components.classes;
var Ci = Components.interfaces;
var Cr = Components.results;
var Cu = Components.utils;

ChromeUtils.defineModuleGetter(this, "JSAccountUtils", "resource://exquilla/JSAccountUtils.jsm");

// A partial JavaScript implementation of the base server methods.

function JaBaseIncomingServer(aDelegator, aBaseInterfaces) {

// Typical boilerplate to include in all implementations.

  // Object delegating method calls to the appropriate XPCOM object.
  // Weak because it owns us.
  this._delegatorWeak = aDelegator.QueryInterface(Ci.nsISupportsWeakReference)
                                  .GetWeakReference();

}

JaBaseIncomingServer.Properties = {

  // The CPP object that delegates to CPP or JS.
  baseContractID:     "@mozilla.org/jacppincomingserverdelegator;1",

  // Interfaces implemented by the base CPP version of this object.
  baseInterfaces:     [ Ci.nsIMsgIncomingServer,
                        Ci.nsISupportsWeakReference,
                        Ci.msgIOverride,
                        Ci.nsISupports,
                        Ci.nsIInterfaceRequestor,
                        ],

  // We don't typically define this as a creatable component, but if we do use
  // these. Subclasses for particular account types require these defined for
  // that type.
  contractID:         "@mozilla.org/jsaccount/jaincomingserver;1",
  classID:            Components.ID("{697F0D83-162F-43B8-AE81-0E6E914A7251}"),
};

JaBaseIncomingServer.prototype = {
// Typical boilerplate to include in all implementations.
  __proto__: JSAccountUtils.makeCppDelegator(JaBaseIncomingServer.Properties),

  // Flag this item as CPP needs to delegate to JS.
  _JsPrototypeToDelegate: true,

  // QI to the interfaces.
  QueryInterface: ChromeUtils.generateQI(JaBaseIncomingServer.Properties.baseInterfaces),

  // Used to access an instance as JS, bypassing XPCOM.
  get wrappedJSObject() {
    return JSAccountUtils.strongJSObject(this);
  },

  // Accessor to the weak cpp delegator.
  get delegator() {
    return this._delegatorWeak.QueryReferent(Ci.nsISupports);
  },

  // Base implementation of methods with no overrides.
  get cppBase() {
    let delegator = this.delegator;
    if (delegator) {
      let cppBase = delegator.QueryInterface(Ci.msgIOverride).cppBase;
      for (let iface of JaBaseIncomingServer.Properties.baseInterfaces)
        cppBase instanceof iface;
      return cppBase;
    }
    throw Cr.NS_ERROR_FAILURE;
  },

  // Dynamically-generated list of delegate methods.
  delegateList: null,

  // Implementation in JS  (if any) of methods in XPCOM interfaces.

};
