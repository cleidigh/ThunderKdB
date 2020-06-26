/* ***** ATTENTION CRACKERS *****
 *
 * Yes, it is all here, everything that you need to remove Owl licenses.
 *
 * In case you are not aware, I have put much of my time into helping create
 * Thunderbird, and this addon is how I pay for my work and how I can live.
 * So how about a little favor. Just use your cleverness to use Owl
 * yourself for free, and don't use the information here to broadly "help"
 * the rest of the world with cracked versions. After all, Thunderbird is free
 * due to the efforts of people like me and others. So please just help
 * yourself without adding your own effort to bring everything down
 * by undermining my source of income.
 *
 * If you really want to help the cause of free software, since you were
 * clever enough to find this code, why don't you come join us and help
 * build a better Thunderbird? Heck, I'll even give you a free legitimate
 * Owl license if you just help a little with the core product!
 *
 * Ben Bucksch
 * Owl developer and core Thunderbird developer
 */

const kSoonExpiringPollInterval = 24 * 60 * 60 * 1000; // 1 day
const kSoonExpiring = 14 * 24 * 60 * 60 * 1000; // 2 weeks
const kOld = -14 * 24 * 60 * 60 * 1000; // 2 weeks ago

const kGetLicenseURL = kProduction != "test"
  ? "https://www.beonex.com/owl/?"
  : "https://www.beonex.com/test-owl/?";
const kLicenseServerURL = kProduction != "test"
  ? "https://api.beonex.com/owl-license/"
  : "https://api.beonex.com/owl-license-test/";
const kPublicKey = kProduction != "test"
  ? "data:application/octet-stream;base64,MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEAkw0daPqAZYCjW1gM2+LGiwHUwxcAR45fokGO9CCNSsTtN3gVK07OJT26f0dVa1pUeRKHsMsd8QpPTBlZnl8zE9mYEZKyuwZbwE49VoxD2Fm3pIwxyJ9ZvSU2YPRAA93gt67IhPQYneuKcra9kAjC1VvVcXAGFzbjZIZggPzUa6qHKP4gTTm0RK5uRrnqPugLgYTBMlSYtQWj3d9OmrFlq6Pv9YWDVZZRUujdRNGl4B876KfmK19t747hztLN3Qe+CzFKtI+5d3ldu9YzkQAtsmk6P8Pqj8ZypE2f23PM0uCIo6pDj6bGygX+i0UzExozIfgWtC/FqXDd4Lf2rB21CwIDAQAB"
  : "data:application/octet-stream;base64,MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEAwmNAZKbDE1KyL+Ttt74NR0vssYVFzyvKTQ58l8UwQI8ixf/M270HycwgE4YRrU4555w+QS3rcacsI3rGcqXph6PLrRVr7IXEjMyXqUs6xkfgmtYK/eb+ILks/OoXFxFmhwrEbIfZZ4B6SdaNBj2JbFiE7eQGKpxC4G9/hAX398W4RZh8It3Z9Nkx7c96REgmB2iYfiArdov4D4saroL1iTqevKnp1+N0oWOxwvSfnAT6v7anKHJbTndR6TrKRzaLNgu3hWserh5zyC5qM5MIt7cq4hTsF1rn2b5Pyevbq/GGPjNq/PjQ6AzKKC1iYaeZvfR3ubasSCj96ju7Y7vh6wIDAQAB";

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
addEventListener("DOMContentLoaded", onInitLicense);

/**
 * Downloads a new license ticket if the poll interval has elasped.
 *
 * This is the public function that you should call from outside this module.
 * This is called for every server call, so it should be efficient.
 *
 * @param aServerId {String} The key of the server
 * @throws {Error} If there is no valid license
 */
async function EnsureLicensed(aServerId)
{
  let ticket = gLastTicket;
  if (ticket && ticket.valid && !ticket.requiresRefresh) {
    return;
  }
  ticket = await CheckLicense();
  gLastTicket = ticket;
  if (ticket && ticket.valid && !ticket.requiresRefresh) {
    return;
  }
  if (ticket.expiredIn < kOld) {
    // We lost that user. Stop polling.
    let ex = new OwlError("no-valid-license");
    ex.report = false;
    throw ex;
  }
  ticket = await FetchTicket();
  if (!ticket || !ticket.valid) {
    let ex = new OwlError("no-valid-license");
    ex.report = false;
    throw ex;
  }
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
    logError(ex);
  }
}

/**
 * Downloads a new license ticket, but avoids downloading twice in parallel.
 *
 * @returns {Promise} (i.e. call `await FetchTicket()`, i.e. treat as async function)
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
    let servers = await browser.incomingServer.getServersOfTypes(["owl", "owl-ews"]);
    if (!servers.length) {
      return;
    }

    let identity = await browser.incomingServer.getGlobalPrimaryIdentity();
    let email = identity.email;
    let name = identity.fullName;
    let browserInfo = await browser.runtime.getBrowserInfo();
    let tbVersion = parseInt(browserInfo.version);

    let aliasesSet = new Set();
    for (let serverId of servers) {
      let identities = await browser.incomingServer.getIdentities(serverId);
      for (let identity of identities) {
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
      await browser.extPrefs.setStringValue("ticket", JSON.stringify(ticket));
    } else if (response.status == 410) { // Gone
      // Server explicitly deletes the license/ticket, e.g. after a refund.
      // (We use a specific error code for this, because we don't want
      // this purge to happen accidentally, even after a server bug.)
      await browser.extPrefs.setStringValue("ticket", "");
    }
    let ticket = await CheckLicense();
    if (!ticket.valid) {
      await startTrial(aliases);
      ticket = await CheckLicense();
    }
    notifyGlobalObservers("LicenseChecked", ticket);
    return ticket;
  } catch (ex) {
    try {
      notifyGlobalObservers("LicenseChecked", await CheckLicense());
    } catch (ex2) {
      logError(ex2);
    }
    throw ex;
  }
}

async function startTrial(aAliases) {
  if (gHadTrial) {
    return;
  }
  gHadTrial = true; // avoid firing several server calls in parallel
  if (await browser.extPrefs.getStringValue("ticket")) {
    // already had a trial
    return;
  }

  let browserInfo = await browser.runtime.getBrowserInfo();
  let tbVersion = parseInt(browserInfo.version);

  let identity = await browser.incomingServer.getGlobalPrimaryIdentity();
  let email = identity.email;
  let name = identity.fullName;

  let url = kLicenseServerURL + "start-trial/" + email + "?" +
    new URLSearchParams({
      tbversion: tbVersion,
      name: name,
      aliases: aAliases,
    });
  let response = await fetch(url);
  if (!response.ok) {
    return;
  }
  let ticket = await response.json();
  await browser.extPrefs.setStringValue("ticket", JSON.stringify(ticket));

  if (await browser.addonPrivate.isFirstRun()) {
    OpenPurchasePage("welcome");
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
  await browser.extPrefs.setStringValue("ticket", aTicket);
  notifyGlobalObservers("LicenseChecked", await CheckLicense());
}

/**
 * Checks the saved ticket to see whether it is valid.
 */
async function CheckLicense()
{
  let ticket = await browser.extPrefs.getStringValue("ticket");
  if (!ticket) {
    return new BadTicket();
  }
  try {
    ticket = await VerifyTicketSignature(ticket);
  } catch (ex) {
    ex.parameters = ticket;
    logError(ex);
    await browser.extPrefs.setStringValue("ticket", "");
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
  let browserInfo = await browser.runtime.getBrowserInfo();
  if (ticket.version != parseInt(browserInfo.version)) {
    throw new Error("Ticket version is incorrect");
  }
  return ticket;
}


// How often to poll after the user clicked [Purchase]
const kPurchasePollInterval = 10 * 1000; // 10 seconds
// For how long to poll after the user clicked [Purchase]
const kPurchasePollFor = 30 * 60 * 1000; // 30 minutes

// Called from [Purchase] button in license bar and in settings page
async function OpenPurchasePage(mode) {
  let identity = await browser.incomingServer.getGlobalPrimaryIdentity();
  let servers = await browser.incomingServer.getServersOfTypes(["owl", "owl-ews"]);
  if (servers.length) {
    let identities = await browser.incomingServer.getIdentities(servers[0]);
    if (identities.length) {
      identity = identities[0];
    }
  }
  browser.external.openLink(kGetLicenseURL + new URLSearchParams({
    email: identity.email,
    name: identity.fullName,
    lang: browser.i18n.getMessage("extLocale"),
    goal: mode,
  }) + "#" + (mode || "purchase"));

  let purchasePoller = setInterval(async () => {
    try {
      await FetchTicket();
    } catch (ex) {
      logError(ex);
    }
  }, kPurchasePollInterval);
  setTimeout(() => {
    clearInterval(purchasePoller);
  }, kPurchasePollFor);
}
