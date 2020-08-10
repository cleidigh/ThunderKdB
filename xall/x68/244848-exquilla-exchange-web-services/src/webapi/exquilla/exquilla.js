var {Services} = ChromeUtils.import("resource://gre/modules/Services.jsm");
var {MailServices} = ChromeUtils.import("resource:///modules/MailServices.jsm");
var {FetchTicket, CheckLicense, AddTicketFromString, OpenPurchasePage, OpenManualAccountCreation, GetLicensedEmail} = ChromeUtils.import("resource://exquilla/License.jsm");
var {Utils} = ChromeUtils.import("resource://exquilla/ewsUtils.jsm");

var _log = null;
XPCOMUtils.defineLazyGetter(this, "log", () => {
  if (!_log) {
    let { configureLogging } = ChromeUtils.import("resource://exquilla/ewsUtils.jsm").Utils;
    _log = configureLogging("webapi");
  }
  return _log;
});

/**
 * Wraps any exceptions thrown by functions used by the settings page.
 *
 * @parameter aFuncton {Function} The function to wrap
 * @returns            {Function}
 *   @throws           {ExtensionError}
 *
 * The exceptions are logged and then everything except the message is
 * dropped as the exception has to be converted into an ExtensionError.
 */
function wrapExceptions(aFunction) {
  return async (...args) => {
    try {
      return await aFunction(...args);
    } catch (ex) {
      log.error(ex);
      throw new ExtensionUtils.ExtensionError(ex.message);
    }
  };
}

this.exquillaSettings = class extends ExtensionAPI {
  getAPI(context) {
    return {
      exquillaSettings: {
        getLicensedEmail: wrapExceptions(GetLicensedEmail),
        openManualAccountCreation: wrapExceptions(Utils.openAccountWizard),
        openPurchasePage: wrapExceptions(OpenPurchasePage),
        addTicketFromString: wrapExceptions(AddTicketFromString),
        checkLicense: wrapExceptions(CheckLicense),
        fetchTicket: wrapExceptions(FetchTicket),
        onLicenseChecked: new ExtensionCommon.EventManager({
          context: context,
          name: "exquilla.onLicenseChecked",
          register: listener => {
            Services.obs.addObserver(listener.async, "LicenseChecked");
            return () => {
              Services.obs.removeObserver(listener.async, "LicenseChecked");
            }
          },
        }).api(),
      }
    };
  }
};
