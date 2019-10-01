#!/bin/sh
# Set this to the Owl source code checkout
SOURCE=/set/this/path/to/owl/source/
# Set this to the Thunderbird executable
TBEXE=/set/this/path/to/thunderbird
# Profile name to be created. Random like test-jhFGUZL
TBPROFILENAME=test-owl-`pwgen -1`
# Path to profile directory (excluding or including trailing /)
TBPROFILEDIR=`$TBEXE -no-remote -CreateProfile $TBPROFILENAME 2>&1|sed -e "s|.*'/|/|" -e "s|/prefs.js'||" -e "/Gtk-Message.*/d"`

mkdir -p $TBPROFILEDIR/extensions
# If you prefer, adapt to copy the XPI instead. But that's more work so why bother?
echo -n $SOURCE >$TBPROFILEDIR/extensions/owl@beonex.com

cat <<EOF >>$TBPROFILEDIR/prefs.js
user_pref("extensions.autoDisableScopes", 14);
user_pref("devtools.debugger.prompt-connection", false);
user_pref("mail.shell.checkDefaultClient", false);
user_pref("general.warnOnAboutConfig", false);
user_pref("mailnews.auto_config.fetchFromISP.enabled", false);
user_pref("mailnews.auto_config.fetchFromISP.sendEmailAddress", false);
user_pref("mailnews.auto_config.guess.enabled", false);
user_pref("mailnews.auto_config_url", "");
user_pref("mailnews.mx_service_url", "");
EOF
cat <<EOF >>$TBPROFILEDIR/xulstore.json
{
   "chrome://messenger/content/messenger.xul" : {
      "mail-toolbar-menubar2" : {
         "autohide" : "false"
      },
      "today-pane-panel" : {
         "collapsedinmodes" : "mail"
      }
   }
}
EOF

$TBEXE -no-remote -P $TBPROFILENAME -jsconsole
