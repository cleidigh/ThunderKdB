pref("extensions.masterPasswordPlus.command", 0); //default command for toolbar button. 0=loging/logout; 1=lock window; 2=lock all windows; 3=lock all windows and logout
pref("extensions.masterPasswordPlus.commandloggedin", true); //use command only when logged in
pref("extensions.masterPasswordPlus.contextmenu", false);
pref("extensions.masterPasswordPlus.debug", 1); //type of messages shown in browser console. bitwise: 0 = off, 1 = errors, 2 = info messages, 4 = debug (this will flood with messages! it also triggers automtic open browser console)
pref("extensions.masterPasswordPlus.failedattempts", 5); //disable password field of locked windows after this many failed attempts.
pref("extensions.masterPasswordPlus.failedattemptstime", 10); //number of seconds to disable password field after reached failed attempts number. Use negative value to exponentially increase the timeout
pref("extensions.masterPasswordPlus.identify", ""); //MP prompt identification string
pref("extensions.masterPasswordPlus.idle", 3); //idle sensitivity
pref("extensions.masterPasswordPlus.lockhidetitle", true);
pref("extensions.masterPasswordPlus.lockhotkey", "ALT K");
pref("extensions.masterPasswordPlus.lockhotkeyenabled", 1);
pref("extensions.masterPasswordPlus.lockinactivity", true);
pref("extensions.masterPasswordPlus.lockincorrect", 3); //lock after NN incorrect password attempts
pref("extensions.masterPasswordPlus.locklogouthotkey", "ALT SHIFT L");
pref("extensions.masterPasswordPlus.locklogouthotkeyenabled", 1);
pref("extensions.masterPasswordPlus.lockminimize", false); //minimize on lock
pref("extensions.masterPasswordPlus.lockminimizeblur", true); //minimize on lock only when not in focus
pref("extensions.masterPasswordPlus.lockonminimize", 0); //lock on minimize
pref("extensions.masterPasswordPlus.lockonsleep", false); //lock on sleep
pref("extensions.masterPasswordPlus.lockonwslock", false); //lock on workstation lock (Win + L) Windows OS only
pref("extensions.masterPasswordPlus.lockrestore", true);
pref("extensions.masterPasswordPlus.locktimeout", 300);
pref("extensions.masterPasswordPlus.locktimer", false);
pref("extensions.masterPasswordPlus.lockwinhotkey", "ACCEL ALT K");
pref("extensions.masterPasswordPlus.lockwinhotkeyenabled", 1);
pref("extensions.masterPasswordPlus.logouthotkey", "ALT L");
pref("extensions.masterPasswordPlus.logouthotkeyenabled", 1);
pref("extensions.masterPasswordPlus.logoutinactivity", true);
pref("extensions.masterPasswordPlus.logoutonminimize", false); //logout on minimize
pref("extensions.masterPasswordPlus.logoutonsleep", true); //logout on sleep
pref("extensions.masterPasswordPlus.logoutonwslock", false); //logout on workstation lock (Win + L) Windows OS only
pref("extensions.masterPasswordPlus.logouttimeout", 300);
pref("extensions.masterPasswordPlus.logouttimer", false);
pref("extensions.masterPasswordPlus.protect", false);
pref("extensions.masterPasswordPlus.startup", false);
pref("extensions.masterPasswordPlus.startupfail", 1);
pref("extensions.masterPasswordPlus.startupincorrect", 3);
pref("extensions.masterPasswordPlus.startupshort", true);
pref("extensions.masterPasswordPlus.startuptimeout", 60);
pref("extensions.masterPasswordPlus.statusbar", false);
pref("extensions.masterPasswordPlus.statusbarpos", "");
pref("extensions.masterPasswordPlus.suppress", 0);
pref("extensions.masterPasswordPlus.suppressblink", true);
pref("extensions.masterPasswordPlus.suppressfocus", true);
pref("extensions.masterPasswordPlus.suppresspopup", true);
pref("extensions.masterPasswordPlus.suppresspopupremove", 30);
pref("extensions.masterPasswordPlus.suppresssound", true);
pref("extensions.masterPasswordPlus.suppresstemp", 10);
pref("extensions.masterPasswordPlus.suppresstimer", 10);
pref("extensions.masterPasswordPlus.toolsmenu", true);
pref("extensions.masterPasswordPlus.urlbar", true);
pref("extensions.masterPasswordPlus.urlbarpos", "0go-button");


//hidden settings
pref("extensions.masterPasswordPlus.hidenewmailalert", true); //hide new email alert box (TB only)
pref("extensions.masterPasswordPlus.hidenewmailballoon", true); //hide new email balloon popup (TB only)
pref("extensions.masterPasswordPlus.lockbgimage", true); //show locked background image?
pref("extensions.masterPasswordPlus.locktransparent", true); //windows vista/7 aero transparency of locked windows
pref("extensions.masterPasswordPlus.minimizenoflicker", true); //a work around of "flickering" effect when locking/unlocking minimized windows on WIndows 7+. When set to false, aero preview of minimized windows will not work properly
pref("extensions.masterPasswordPlus.nonlatinwarning", 2); //show warning icon when used non-latin letter in the password (0=off, 1=always, 2=full screen only)
pref("extensions.masterPasswordPlus.noworkaround", ""); //list of work around of conflicts with other extensions to ignore, separate by comma. Available: AeroBuddy
pref("extensions.masterPasswordPlus.persistnolock", true); //attempt remember the no-lock window flag between browser restart
pref("extensions.masterPasswordPlus.showchangeslog", 1); //show changes log after each update
pref("extensions.masterPasswordPlus.showlang", 2); //show current keyboard language (windows only)(0=off, 1=always, 2=full screen only)
pref("extensions.masterPasswordPlus.unlockSync", false); //foce sync on global unlock

/*
force MP login before listed windows opened.
will only affect when MP is logged and suppression active
enabled:
	0 = false
	1 = true
name:
	window.name

url:
	window.location.href

param:
	startup = on startup only if MP+ set to ask for password
	always = force always, even when logged in
	close = close window on cancel (note, this will not apply to "automatic" prompts)

you can combine parameters by separating them with | "always|close" = force always and close window
*/

pref("extensions.masterPasswordPlus.forceprompt", '[{"enabled":"1","name":"PassHash","url":"chrome://passhash/content/passhash-dialog.xul","param":""},{"enabled":"1","name":"FireFTP","url":"chrome://fireftp/content/fireftp.xul","param":""}]');


//internal settings, do not change
pref("extensions.masterPasswordPlus.locked", false);
pref("extensions.masterPasswordPlus.version", "firstinstall");
