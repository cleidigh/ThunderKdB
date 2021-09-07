#!/bin/sh
# Set this to the Thunderbird executable
TBEXE=/set/this/path/to/thunderbird
# Path to OWL checkout (include trailing /)
SOURCE=/set/this/path/to/owl/source/

# The rest should be working as-is
# Allow to pass a profile name as first commandline parameter
if [ -n "$1" ]; then
  TBPROFILENAME=$1
else
  # Profile name to be created. Random like test-jhFGUZL
  TBPROFILENAME=test-owl-`pwgen -1`
  $TBEXE -no-remote -CreateProfile $TBPROFILENAME
fi
PROFILEROOTDIR=~/.thunderbird/
# Path to profile directory (excluding or including trailing /)
TBPROFILEDIR=`ls -d1 $PROFILEROOTDIR/*.$TBPROFILENAME`

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
#user_pref("mailnews.auto_config_url", "");
#user_pref("mailnews.mx_service_url", "");
user_pref("app.update.auto", false);
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
echo Profile $TBPROFILENAME

$TBEXE -no-remote -P $TBPROFILENAME -jsconsole
