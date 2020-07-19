var {Services} = ChromeUtils.import("resource://gre/modules/Services.jsm");

var {ExtensionError} = ExtensionUtils;

this.uiTweaks = class extends ExtensionAPI {
  getAPI(context) {
    return {
      uiTweaks: {
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
