/* ***** ATTENTION CRACKERS *****
 *
 * Yes, it is all here, everything that you need to remove ExQuilla licenses.
 *
 * In case you are not aware, I have put much of my time into helping create
 * Thunderbird, and this addon is how I pay for my work and how I can live.
 * So how about a little favor. Just use your cleverness to use ExQuilla
 * yourself for free, and don't use the information here to broadly "help"
 * the rest of the world with cracked versions. After all, Thunderbird is free
 * due to the efforts of people like me and others. So please just help
 * yourself without adding your own effort to bring everything down
 * by undermining my source of income.
 *
 * If you really want to help the cause of free software, since you were
 * clever enough to find this code, why don't you come join us and help
 * build a better Thunderbird? Heck, I'll even give you a free legitimate
 * ExQuilla license if you just help a little with the core product!
 *
 * Ben Bucksch
 * ExQuilla developer and core Thunderbird developer
 */

var { XPCOMUtils } = ChromeUtils.import("resource://gre/modules/XPCOMUtils.jsm");
var { Services } = ChromeUtils.import("resource://gre/modules/Services.jsm");
var { setTimeout, setInterval, clearInterval } = ChromeUtils.import("resource://gre/modules/Timer.jsm");
var { MailServices } = ChromeUtils.import("resource:///modules/MailServices.jsm");
var { Utils } = ChromeUtils.import("resource://exquilla/ewsUtils.jsm");
Utils.importLocally(this);

var _log = null;
XPCOMUtils.defineLazyGetter(this, "log", () => {
  if (!_log) {
    _log = configureLogging("license");
  }
  return _log;
});

Cu.importGlobalProperties(["crypto", "fetch", "URLSearchParams"]);

var EXPORTED_SYMBOLS = ["EnsureLicensed", "FetchTicket", "CheckLicense", "AddTicketFromString", "OpenPurchasePage", "GetLicensedEmail", "exquillaSettings"];

const kSoonExpiringPollInterval = 24 * 60 * 60 * 1000; // 1 day
const kSoonExpiring = 14 * 24 * 60 * 60 * 1000; // 2 weeks
const kOld = -14 * 24 * 60 * 60 * 1000; // 2 weeks ago

const kGetLicenseURL = "https://www.exquilla.com/?";
const kLicenseServerURL = "https://api.beonex.com/exquilla-license/";
const kPublicKey = "data:application/octet-stream;base64,MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEAuqQSFfW5+O5xYfGJiArAMQ/RJ2PFe6W3uoy8lfdVEYOg3RMkzDOl5zosr/8IzDztBpVNmsSsBZb90BsSoBL+41vIv2hN2AEsWcUBN6S5LZDDCxxYs1QFzxIMDx+RiKSP1KbhWXx+VGJr6BMgctx/gzrSaQVzBtF+HEEnd1Umpm8hhOyloqySAo8sOjQ48sP517jXvy4Vv8oscVvqUdbITBEzOjW1UxSPMBcexeeRLd/S0T6eAwwtK2y0Rop2kjKpC7FcA0or10MpBY4DSii/gqtpl91yV8s9dgUpPuxkm86r0IUkRG6HMz7LJCsvPeBVf9kllyCHiytLzz2FUrnQpQIDAQAB";

/// The crypto key for verifying ticket signatures
var gKeyPromise = null;
/// Cache in EnsureLicensed() to avoid re-validating the ticket cryptographically for every server call
var gLastTicket = false;
/// A promise that resolves when a ticket refresh finishes
var gFetchingTicket = null;
/// Whether this user is known to have had a trial license
var gHadTrial = false;

async function onInitLicense() {
  NextPoll();
  setInterval(NextPoll, kSoonExpiringPollInterval);
}
Services.tm.dispatchToMainThread(onInitLicense);

/**
 * Downloads a new license ticket if the poll interval has elasped.
 *
 * This is the public function that you should call from outside this module.
 * This is called for every server call, so it should be efficient.
 *
 * @returns {Boolean}
 */
async function EnsureLicensed()
{
  let ticket = gLastTicket;
  if (ticket && ticket.valid && !ticket.requiresRefresh) {
    return true;
  }
  ticket = await CheckLicense();
  gLastTicket = ticket;
  if (ticket && ticket.valid && !ticket.requiresRefresh) {
    return true;
  }
  if (ticket.expiredIn < kOld) {
    // We lost that user. Stop polling.
    return false;
  }
  try {
    ticket = await FetchTicket();
  } catch (ex) {
    log.error(ex);
  }
  if (!ticket || !ticket.valid) {
    return false;
  }
  return true;
}

/**
 * Polls for a new ticket, if the ticket is expired or expiring soon.
 */
async function NextPoll()
{
  let ticket = await CheckLicense();
  if (ticket.status == "normal" && !ticket.requiresRefresh) {
    return;
  }
  try {
    await FetchTicket();
  } catch (ex) {
    log.error(ex);
  }
}

function getGlobalPrimaryIdentity() {
  try {
    let identity = MailServices.accounts.defaultAccount.defaultIdentity;
    if (identity.email) {
      return identity;
    }
  } catch (ex) {
  }
  try {
    for (let identity of /* COMPAT for TB 68 */toArray(MailServices.accounts.allIdentities, Ci.nsIMsgIdentity)) {
      if (identity.email) {
        return identity;
      }
    }
  } catch (ex) {
  }
  let identity = { email: "", fullName: "" };
  let userInfo = Cc["@mozilla.org/userinfo;1"].getService(Ci.nsIUserInfo);
  try {
    identity.email = userInfo.emailAddress;
  } catch (ex) {
  }
  try {
    identity.fullName = userInfo.fullname;
  } catch (ex) {
  }
  return identity;
}

/**
 * Downloads a new license ticket, but avoids downloading twice in parallel.
 */
function FetchTicket()
{
  if (!gFetchingTicket) {
    gFetchingTicket = (async () => {
      try {
        return await FetchTicketUnqueued();
      } finally {
        gFetchingTicket = null;
      }
    })();
  }
  return gFetchingTicket;
}

/**
 * Downloads a new license ticket.
 */
async function FetchTicketUnqueued()
{
  try {
    let servers = [];
    for (let account of /* COMPAT for TB 68 */toArray(MailServices.accounts.accounts, Ci.nsIMsgAccount)) {
      if (account.incomingServer.type == "exquilla") {
        servers.push(account.incomingServer);
      }
    }
    if (!servers.length) {
      return;
    }

    let identity = getGlobalPrimaryIdentity();
    let email = identity.email;
    let name = identity.fullName;
    let tbVersion = parseInt(Services.appinfo.version);

    let aliasesSet = new Set();
    for (let server of servers) {
      for (let identity of /* COMPAT for TB 68 */toArray(MailServices.accounts.getIdentitiesForServer(server), Ci.nsIMsgIdentity)) {
        aliasesSet.add(identity.email);
      }
    }
    aliasesSet.delete(email);
    let aliases = [...aliasesSet].join(",");

    let url = kLicenseServerURL + "ticket/" + email + "?" +
      new URLSearchParams({
        tbversion: tbVersion,
        name: name,
        aliases: aliases,
      });
    let response = await fetch(url, { cache: "reload" });
    if (response.ok) {
      let ticket = await response.json();
      Services.prefs.setStringPref("extensions.exquilla.ticket", JSON.stringify(ticket));
    } else if (response.status == 410) { // Gone
      // Server explicitly deletes the license/ticket, e.g. after a refund.
      // (We use a specific error code for this, because we don't want
      // this purge to happen accidentally, even after a server bug.)
      Services.prefs.setStringPref("extensions.exquilla.ticket", "");
    } else if (response.status == 404) {
      // Continue to call startTrial()
    } else {
      throw new Error(response.statusText + " (HTTP " + response.status + ")");
    }
    let ticket = await CheckLicense();
    if (!ticket.valid) {
      await startTrial(aliases);
      ticket = await CheckLicense();
    }
    Services.obs.notifyObservers(null, "LicenseChecked", JSON.stringify(ticket));
    return ticket;
  } catch (ex) {
    try {
      Services.obs.notifyObservers(null, "LicenseChecked", JSON.stringify(await CheckLicense()));
    } catch (ex2) {
      log.error(ex2);
    }
    throw ex;
  }
}

async function startTrial(aAliases) {
  if (gHadTrial) {
    return;
  }
  gHadTrial = true; // avoid firing several server calls in parallel
  if (Services.prefs.getStringPref("extensions.exquilla.ticket", "")) {
    // already had a trial
    return;
  }

  let tbVersion = parseInt(Services.appinfo.version);

  let identity = getGlobalPrimaryIdentity();
  let email = identity.email;
  let name = identity.fullName;

  let url = kLicenseServerURL + "start-trial/" + email + "?" +
    new URLSearchParams({
      tbversion: tbVersion,
      name: name,
      aliases: aAliases,
    });
  let response = await fetch(url);
  if (response.ok) {
    let ticket = await response.json();
    Services.prefs.setStringPref("extensions.exquilla.ticket", JSON.stringify(ticket));
  } else {
    throw new Error(response.statusText + " (HTTP " + response.status + ")");
  }
}

function BadTicket(status) {
  this.expiredIn = 0;
  this.valid = false;
  this.status = status || "missing";
}

/**
 * Manually add a ticket from an email.
 */
async function AddTicketFromString(aTicket)
{
  await VerifyTicketSignature(aTicket);
  Services.prefs.setStringPref("extensions.exquilla.ticket", aTicket);
  Services.obs.notifyObservers(null, "LicenseChecked", JSON.stringify(await CheckLicense()));
}

/**
 * Checks the saved ticket to see whether it is valid.
 */
async function CheckLicense()
{
  let ticket = Services.prefs.getStringPref("extensions.exquilla.ticket", "");
  if (!ticket) {
    return new BadTicket();
  }
  try {
    ticket = await VerifyTicketSignature(ticket);
  } catch (ex) {
    log.error(ex);
    Services.prefs.setStringPref("extensions.exquilla.ticket", "");
    return new BadTicket();
  }
  ticket.end = Date.parse(ticket.end);
  ticket.refresh = Date.parse(ticket.refresh);
  ticket.expiredIn = ticket.end - Date.now();
  ticket.valid = ticket.expiredIn > 0;
  ticket.requiresRefresh = ticket.valid && ticket.refresh < Date.now(); // ticket expired. poll on every call.
  if (!ticket.valid) {
    ticket.status = "expired";
  } else if (ticket.expiredIn > kSoonExpiring) {
    ticket.status = "normal";
  } else {
    ticket.status = "expiring";
  }
  return ticket;
}

/**
 * Verify a ticket.
 *
 * @param aTicket {String}  The JSON encoded ticket to verify
 *   json         {String}  The JSON of the data
 *   signature    {String}  The RSA signature of the JSON
 * @returns       {Object?} The decoded JSON
 * @throws        {Error}   If the ticket is invalid
 * */
async function VerifyTicketSignature(aTicket)
{
  let ticket = JSON.parse(aTicket);
  if (typeof ticket.json != "string" || typeof ticket.signature != "string") {
    throw new Error("Required properties not found on ticket");
  }
  let algorithm = {
    name: "RSA-PSS",
    modulusLength: 1024,
    publicExponent: Uint8Array.from([1, 0, 1]),
    hash: { name: "SHA-256" },
    saltLength: 222,
  };
  if (!gKeyPromise) {
    let response = await fetch(kPublicKey);
    let keyArrayBuffer = await response.arrayBuffer();
    gKeyPromise = crypto.subtle.importKey("spki", keyArrayBuffer, algorithm, false, ["verify"]);
  }
  let signatureArrayBuffer = new Uint8Array(ticket.signature.length / 2);
  for (let i = 0; i < signatureArrayBuffer.length; i++) {
    signatureArrayBuffer[i] = parseInt(ticket.signature.substr(i * 2, 2), 16);
  }
  let key = await gKeyPromise;
  if (!await crypto.subtle.verify(algorithm, key, signatureArrayBuffer, (new TextEncoder).encode(ticket.json))) {
    throw new Error("Ticket signature verification failed");
  }
  ticket = JSON.parse(ticket.json);
  if (ticket.version != parseInt(Services.appinfo.version)) {
    throw new Error("Ticket version is incorrect");
  }
  return ticket;
}


// How often to poll after the user clicked [Purchase]
const kPurchasePollInterval = 10 * 1000; // 10 seconds
// For how long to poll after the user clicked [Purchase]
const kPurchasePollFor = 30 * 60 * 1000; // 30 minutes

// Called from [Purchase] button in license bar and in settings page
async function OpenPurchasePage() {
  let identity = getGlobalPrimaryIdentity();
  let uri = Services.io.newURI(kGetLicenseURL + new URLSearchParams({
    email: identity.email,
    name: identity.fullName,
    lang: Services.locale.appLocaleAsLangTag,
  }) + "#purchase");
  Cc["@mozilla.org/uriloader/external-protocol-service;1"].getService(Ci.nsIExternalProtocolService).loadURI(uri);

  let purchasePoller = setInterval(async () => {
    try {
      await FetchTicket();
    } catch (ex) {
      log.error(ex);
    }
  }, kPurchasePollInterval);
  setTimeout(() => {
    clearInterval(purchasePoller);
  }, kPurchasePollFor);
}

function GetLicensedEmail()
{
  for (let account of /* COMPAT for TB 68 */toArray(MailServices.accounts.accounts, Ci.nsIMsgAccount)) {
    if (account.incomingServer.type == "exquilla") {
      return /* COMPAT for TB 68 */toArray(account.identities, Ci.nsIMsgIdentity)[0].email;
    }
  }
  return "";
}

/**
 * Logs any exceptions thrown by functions used by the settings page.
 *
 * @parameter aFuncton {Function} The function to wrap
 * @returns            {Function}
 *
 * This is here because the settings page doesn't have access to logging,
 * and the equivalent function in webapi/exquilla/exquilla.js has to drop
 * everything except the exception message anyway.
 */
function wrapExceptions(aFunction) {
  return async (...args) => {
    try {
      return await aFunction(...args);
    } catch (ex) {
      log.error(ex);
      throw ex;
    }
  };
}

/**
 * This object mirrors the `exquillaSettings` WebExperiment API.
 */
var exquillaSettings = {
  fetchTicket: wrapExceptions(FetchTicket),
  checkLicense: wrapExceptions(CheckLicense),
  addTicketFromString: wrapExceptions(AddTicketFromString),
  openPurchasePage: wrapExceptions(OpenPurchasePage),
  openManualAccountCreation: wrapExceptions(openAccountWizard),
  getLicensedEmail: wrapExceptions(GetLicensedEmail),
  onLicenseChecked: {
    addListener: function(aListener) {
      Services.obs.addObserver(aListener, "LicenseChecked");
    },
    removeListener: function(aListener) {
      Services.obs.removeObserver(aListener, "LicenseChecked");
    },
  },
};
