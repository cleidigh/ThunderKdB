var {AddonManager} = ChromeUtils.import("resource://gre/modules/AddonManager.jsm");

const kRecentlyInstalled = 15 * 60 * 1000; // 15 minutes

this.addonPrivate = class extends ExtensionAPI {
  getAPI(context) {
    return {
      addonPrivate: {
        isFirstRun: async function() {
          let addon = await AddonManager.getAddonByID(context.extension.id);
          return Date.now() - addon.installDate <= kRecentlyInstalled;
        },
      },
    };
  }
};
