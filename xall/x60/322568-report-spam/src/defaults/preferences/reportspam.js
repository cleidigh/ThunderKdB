// GUI prefs
pref('extensions.reportspam.showInToolbar', true);
pref('extensions.reportspam.showInMenu', true);

// Spam detector
pref('extensions.reportspam.spamDetector', 'X-Renater-Spam-State: ^\s*(?!0)\d+');
pref('extensions.reportspam.defaultHeaders', 'from to cc subject reply-to message-id list-post');

// Report spam
pref('extensions.reportspam.spam.reportMode', 'mail'); // could be http
pref('extensions.reportspam.spam.reportAddress', 'report-spam@report-spam.renater.fr');
pref('extensions.reportspam.spam.reportURL', '');
pref('extensions.reportspam.spam.tagAsJunk', false);
pref('extensions.reportspam.spam.moveToTrash', false);
pref('extensions.reportspam.spam.moveToFolder', false);
pref('extensions.reportspam.spam.moveToFolderTarget', '');

// Report phishing
pref('extensions.reportspam.phishing.enabled', false);
pref('extensions.reportspam.phishing.reportMode', 'mail');
pref('extensions.reportspam.phishing.reportAddress', '');
pref('extensions.reportspam.phishing.reportURL', '');
pref('extensions.reportspam.phishing.tagAsJunk', false);
pref('extensions.reportspam.phishing.moveToTrash', false);
pref('extensions.reportspam.phishing.moveToFolder', false);
pref('extensions.reportspam.phishing.moveToFolderTarget', '');

// Report ham
pref('extensions.reportspam.ham.reportMode', 'mail');
pref('extensions.reportspam.ham.reportAddress', 'report-ham@report-spam.renater.fr');
pref('extensions.reportspam.ham.reportURL', '');
