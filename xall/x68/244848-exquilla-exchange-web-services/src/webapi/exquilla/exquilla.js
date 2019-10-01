var {Services} = ChromeUtils.import("resource://gre/modules/Services.jsm");
var {MailServices} = ChromeUtils.import("resource:///modules/MailServices.jsm");
var {FetchTicket, CheckLicense, OpenPurchasePage} = ChromeUtils.import("resource://exquilla/License.jsm");

this.exquillaSettings = class extends ExtensionAPI {
  getAPI(context) {
    return {
      exquillaSettings: {
        anyExQuillaAccountConfigured: AnyExQuillaAccountConfigured,
        openManualAccountCreation: OpenManualAccountCreation,
        openPurchasePage: OpenPurchasePage,
        addTicketFromString: AddTicketFromString,
        checkLicense: CheckLicense,
        fetchTicket: FetchTicket,
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
