// WarnAttachment
// Jens Dede, 2020

const warnAttachmentCurrentLegacyMigrationVersion = 2

// We hijack the translation mechanism to have a single point of truth for the
// file extensions. Only defined for the default language: English
// Default settings
const warnAttachmentDefaultValues = {
    timeout: 3,
    warn: browser.i18n.getMessage("warningMessageTypes"),
    blocked : browser.i18n.getMessage("blockingMessageTypes"),
    user_warning_msg: "",
    user_blocked_msg: ""
}

// Migrate the preferences from old thunderbird versions (if available)
async function migratePrefs() {
    const results = await browser.storage.local.get("migratedLegacy");
    const currentMigration =
        results.migratedLegacy
        ? results.migratedLegacy
        : 0;

    if (currentMigration >= warnAttachmentCurrentLegacyMigrationVersion){
        // Nothing to migrate
        return;
    }

    let prefs = results.preferences || {}

    if (currentMigration < 1) {
        for (const prefName of Object.getOwnPropertyNames(warnAttachmentDefaultValues)){
            prefs[prefName] = await browser.LegacyPrefMigration.getPref(prefName);
            if (prefs[prefName] === undefined) {
                prefs[prefName] = warnAttachmentDefaultValues[prefName];
            }
        }
    }
    prefs.migratedLegacy = warnAttachmentCurrentLegacyMigrationVersion;
    await browser.storage.local.set(prefs);
    console.log("migration done");
}

// Callback for the opener
async function cb(o){
  // get all the settings
  let p_blocked = await browser.storage.local.get("blocked");
  let p_warn = await browser.storage.local.get("warn");
  let pref = await browser.storage.local.get("preferences");

  let blockedExt = p_blocked.blocked.toLowerCase().replace(/\s+/g, '').split(",");
  let warnExt = p_warn.warn.toLowerCase().replace(/\s+/g, '').split(",");

  // get the messages, overwrite if user-defined ones are available
  let p_user_warning = await browser.storage.local.get("user_warning_msg");
  let p_user_blocking = await browser.storage.local.get("user_blocked_msg");

  let warningMessage = browser.i18n.getMessage("warningText");
  if (p_user_warning.user_warning_msg != "" && p_user_warning.user_warning_msg !== undefined){
    warningMessage = p_user_warning.user_warning_msg;
  }

  let blockingMessage = browser.i18n.getMessage("blockingText");
  if (p_user_blocking.user_blocked_msg != "" && p_user_blocking.user_blocked_msg !== undefined){
    blockingMessage = p_user_blocking.user_blocked_msg;
  }

  // get the current file extension
  let attName = o.displayName ? o.displayName : o.name;
  let ext = attName.substring(attName.lastIndexOf(".")).toLowerCase();

  // check if a blocked file extension is used
  for (const p of blockedExt) {
      if ("."+p.toLowerCase() == ext.toLowerCase()){
          // blocked -> show message
          browser.DialogExperiment.getBlockingDialog(
              browser.i18n.getMessage("blockingTitle"),
              blockingMessage
          );
          return false;
      }
  }

  // check for warn extension
  for (const p of warnExt) {
      if ("."+p.toLowerCase() == ext.toLowerCase()){
          // show warning and open file if user marked the checkbox
          return browser.DialogExperiment.getWarningDialog(
              browser.i18n.getMessage("warningTitle"),
              warningMessage,
              browser.i18n.getMessage("warningTextHint")
          );
      }
  }

  // otherwise: open
  return true;
}

migratePrefs().catch(console.error);
browser.AttachmentHandler.onOpenAttachment.addListener(cb);

