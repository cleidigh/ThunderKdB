var {Services} = ChromeUtils.import("resource://gre/modules/Services.jsm");

var {ExtensionError} = ExtensionUtils;
/// A set of address book UIDs known to be global address lists.
var gAddressBooksAsReadOnly = new Set();

async function uiTweakListener(aDocument)
{
  if (/^chrome:\/\/messenger\/content\/addressbook\/ab((Edit|New)Card|(Edit|Mail)List)Dialog\.x(htm|u)l$/.test(aDocument.documentURI)) { // xul COMPAT for TB 68 (bug 1605845)
    aDocument.defaultView.GetDirectoryFromURI = function(aURI) {
      let directory = MailServices.ab.getDirectory(aURI);
      if (gAddressBooksAsReadOnly.has(directory.UID)) {
        directory = new Proxy(directory, {
          get(directory, property) {
            switch (property) {
            case "readOnly":
              return true;
            default:
              return directory[property];
            }
          },
        });
      }
      return directory;
    };
  }
}

Services.obs.addObserver(uiTweakListener, "chrome-document-interactive");

this.uiTweaks = class extends ExtensionAPI {
  getAPI(context) {
    return {
      uiTweaks: {
        genericAlert: function(aMessage, aTitle, aWindowType) {
          Services.prompt.alert(Services.wm.getMostRecentWindow(aWindowType), aTitle, aMessage);
        },
        markAddressBookAsReadOnly: function(aUID) {
          gAddressBooksAsReadOnly.add(aUID);
        },
        awaitSessionRestored: function() {
          // _restored will be true if the event has already fired.
          return Services.wm.getMostRecentWindow("mail:3pane").SessionStoreManager._restored || new Promise(resolve => {
            function observer() {
              Services.obs.removeObserver(observer, "mail-tabs-session-restored");
              resolve(true);
            }
            Services.obs.addObserver(observer, "mail-tabs-session-restored", false);
          });
        },
        ensureCalendarTodayPaneViews: function() {
          try {
            let mail3Pane = Services.wm.getMostRecentWindow("mail:3pane");
            if (mail3Pane.TodayPane && !mail3Pane.TodayPane.paneViews) {
              let {cal} = ChromeUtils.import("resource:///modules/calendar/calUtils.jsm");
              mail3Pane.TodayPane.paneViews = [
                cal.l10n.getCalString("eventsandtasks"),
                cal.l10n.getCalString("tasksonly"),
                cal.l10n.getCalString("eventsonly"),
              ];
            }
            if (mail3Pane.calendarTabMonitor && !mail3Pane.calendarTabMonitor._onTabSwitched) {
              mail3Pane.calendarTabMonitor._onTabSwitched = mail3Pane.calendarTabMonitor.onTabSwitched;
              mail3Pane.calendarTabMonitor.onTabSwitched = function(oldTab, newTab) {
                try {
                  this._onTabSwitched(oldTab, newTab);
                } catch (ex) {
                  console.error(ex);
                }
              };
            }
          } catch (ex) {
            throw new ExtensionError(ex.message);
          }
        },
      }
    };
  }
};
