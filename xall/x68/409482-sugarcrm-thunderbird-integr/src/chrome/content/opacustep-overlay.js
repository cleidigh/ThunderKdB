/*********************************************************************************
 * The contents of this file are subject to the Opacus Licence, available at
 * http://www.opacus.co.uk/licence or available on request.
 * By installing or using this file, You have unconditionally agreed to the
 * terms and conditions of the License, and You may not use this file except in
 * compliance with the License.  Under the terms of the license, You shall not,
 * among other things: 1) sublicense, resell, rent, lease, redistribute, assign
 * or otherwise transfer Your rights to the Software. Use of the Software
 * may be subject to applicable fees and any use of the Software without first
 * paying applicable fees is strictly prohibited.  You do not have the right to
 * remove Opacus copyrights from the source code.
 *
 * The software is provided "as is", without warranty of any kind, express or
 * implied, including but not limited to the warranties of merchantability,
 * fitness for a particular purpose and noninfringement. In no event shall the
 * authors or copyright holders be liable for any claim, damages or other
 * liability, whether in an action of contract, tort or otherwise, arising from,
 * out of or in connection with the software or the use or other dealings in
 * the software.
 *
 * Portions created by Opacus are Copyright (C) 2011 Mathew Bland, Jonathan Cutting
 * Opacus Ltd.
 * All Rights Reserved.
 ********************************************************************************/
var opacustep = {
  accountLinks : ['bugs','cases','opportunities','contacts','project','project_task','quotes'],
  contactLinks : ['bugs','cases','opportunities','project','quotes'],
  leadLinks : ['opportunities'],
  keyFlag : false,
  onlineStatus : true,
  twoWaySync : false,
  sugarCardsToDelete : [],
  users : [],
  sugarPermanentRemovals : [],
  tbirdCardsToDelete : Components.classes["@mozilla.org/array;1"]  
                              .createInstance(Components.interfaces.nsIMutableArray),
  cardCounter : [0,0,0,0,0,0],
  abSyncs : 0,
  mailUniq : 0,
  started : false,
  loginTimeout : 120000,
  syncLock: true,
  lastLogin : '',
  sugarcrmwins: '',
  status: '',
  progress: '',
  statusIcon: '',
  progressContainer: '',
  debug: false,
  searchableModules : [],
  moduleLabels : [],
  domain_blacklist : [],
  email_blacklist : [],
  custom_modules : '[]',
  customSelectedModules : [],
  opacus_ldap   : '',
  opacus_ldap_key : '',
  licence   : '',
  webservice    :   '',
  sugarurl  :   '',
  sugarurlOrig  :   '',
  sugarcrm_username :   '',
  sugarcrm_password :   '',
  sugarcrm_password_plain : '',
  session_id    :   '',
  sugarObjects  :   '',
  autoSugarObjects  :   '',
  allowNotify   :   true,
  totalMails    :   '',
  totalCalls    :   '',
  searchObject  :   '',
  user_id       :   '',
  user_default_team_id : '',
  opacus_notify :   '',
  opacus_cases  :   '',
  addBcc        :   '',
  auto_archive  :   '',
  auto_archive_attachments  :   '',
  server_info   :   '',
  mailsToTag    :   '',
  mails         :   '',
  outboundMail  :   '',
  windows       :   '',
  mac           :   '',
  firstMessageHeader:   '',
  searchChildren    : 0,
  bulkNoArchived    : 0,
  totalBulkMails    : 0,
  searchesReturned  : 0,
  myContactsOnly : '',
  fixNotifications : true,
  justStarted   : true,
  useStoredId   : true,
  searchOnOpen  : false,
  syncAtStart   : false,
  syncHourly    : false,
  syncInProgress : false,
  ignoreConverted   : true,
  successfulConnection : false,
  suppressLicenseErrors : false,
  honourSyncToOutlook : '',
  sendAndArchiveStatus: 'unknown',
  timer : Components.classes["@mozilla.org/timer;1"].createInstance(Components.interfaces.nsITimer),
  contactTimer : Components.classes["@mozilla.org/timer;1"].createInstance(Components.interfaces.nsITimer),
  passwordManager: Components.classes["@mozilla.org/login-manager;1"].getService(Components.interfaces.nsILoginManager),
  prefs: Components.classes["@mozilla.org/preferences-service;1"]
         .getService(Components.interfaces.nsIPrefService)
         .getBranch("extensions.opacustep.")
         .QueryInterface(Components.interfaces.nsIPrefBranch),
  mailNewsPrefs: Components.classes["@mozilla.org/preferences-service;1"]
         .getService(Components.interfaces.nsIPrefService)
         .getBranch("mailnews.")
         .QueryInterface(Components.interfaces.nsIPrefBranch),
  console : Components.classes["@mozilla.org/consoleservice;1"]
                                 .getService(Components.interfaces.nsIConsoleService),
  promptService : Components.classes["@mozilla.org/embedcomp/prompt-service;1"]
                              .getService(Components.interfaces.nsIPromptService),
  alertsService : false,

  onLoad: function() {
    // alertsService breaks on Mac 10.7 with tbird 8.0
    try{
        opacustep.alertsService = Components.classes["@mozilla.org/alerts-service;1"].  
                getService(Components.interfaces.nsIAlertsService);
    }
    catch(ex){}
    // DB not supported in earlier versions of tbird
    try{
        Components.utils.import("resource://gre/modules/Services.jsm");  
        Components.utils.import("resource://gre/modules/FileUtils.jsm");  
          
        var ostpBase = FileUtils.getFile("ProfD", ["opacustep.sqlite"]);  
        opacustep.db = Services.storage.openDatabase(ostpBase);
        var newTable = "CREATE TABLE IF NOT EXISTS deleted_records (id TEXT,module_name TEXT,first_name TEXT,last_name TEXT,status TEXT)";
        var stmt = opacustep.db.createStatement(newTable);
        stmt.executeAsync({
            handleResult: function(aResultSet) {
            },
            handleError: function(aError) {
                opacustep.db = false;
            },  
            handleCompletion: function(aReason) {
            }
        });
    }
    catch(ex){
        opacustep.db = false;
    }
    // Need a quasi-unique identifier to stop users of multiple tbirds/ostp setups from auto
    // archiving mail in each tbird sent folder.
    try{
        opacustep.mailUniq = opacustep.prefs.getIntPref('opacusMailUniq');
    }
    catch(ex){
        opacustep.mailUniq = parseInt(Math.random() * 10000, 10);
        opacustep.prefs.setIntPref("opacusMailUniq", opacustep.mailUniq);
    }
    if(opacustep.mailUniq == 'none' || opacustep.mailUniq === 0){
        opacustep.mailUniq = parseInt(Math.random() * 10000, 10);
        opacustep.prefs.setIntPref("opacusMailUniq", opacustep.mailUniq);
    }
    // Add our custom header to the custom headers pref
    try{
        var prefCheck = opacustep.mailNewsPrefs.getCharPref('customDBHeaders');
        if(prefCheck.toLowerCase().indexOf('x-opacus-archived') == -1){
            if(prefCheck.toString() === ''){
                opacustep.mailNewsPrefs.setCharPref('customDBHeaders', 'x-opacus-archived');
            } else {
                opacustep.mailNewsPrefs.setCharPref('customDBHeaders', prefCheck.toString() + ' x-opacus-archived');
            }
        }
    }
    catch(ex){
        opacustep.mailNewsPrefs.setCharPref('customDBHeaders', 'x-opacus-archived');
    }

    var appInfo = Components.classes["@mozilla.org/xre/app-info;1"]
                        .getService(Components.interfaces.nsIXULAppInfo);
    var versionChecker = Components.classes["@mozilla.org/xpcom/version-comparator;1"]
                               .getService(Components.interfaces.nsIVersionComparator);
    if(versionChecker.compare(appInfo.version, "17") >= 0) {
        opacustep.fixNotifications = false;
    }
    // initialization code
    opacustep.initialized = true;
    opacustep.strings = Services.strings.createBundle("chrome://opacustep/locale/strings.properties");
    //opacustep.strings = document.getElementById("opacus_strings");
    opacustep.licence = new opacusteplicence();
    // Set up address book listener for removed contacts
    opacustep.abListen = new opacustepab();
    opacustep.abListen.startListening(opacustep.abListen);

    Components.utils.import("resource://gre/modules/AddonManager.jsm");
    AddonManager.getAddonByID("opacustep@opacus.co.uk").then(function(addon) {
        var current = addon.version;
        opacustep.runAtStart(current);
    });

    // Tags
    var tagService = Components. classes["@mozilla.org/messenger/tagservice;1"].
                 getService (Components.interfaces.nsIMsgTagService);
    if(tagService.getKeyForTag('OpacusArchived') === ''){
        tagService.addTag ("OpacusArchived", "#666600", '');
    }
    opacustep.mailsToTag = Components.classes["@mozilla.org/array;1"].
                createInstance(Components.interfaces.nsIMutableArray);

    
    // Listener for new mail - auto archive
    var newMailListener = {  
        msgAdded: function(aMsgHdr) {
                var autoMail = new opacustepMail();
                if((aMsgHdr.folder.flags & 0x1000) == 0x1000){
                    // It's an inbox
                    if(aMsgHdr.flags & 0x10000){
                        // It's a new message
                        if(aMsgHdr.folder.server.type != 'rss'){
                            // It's not a newsgroup folder
                            var doArchive = false;
                            var author = aMsgHdr.mime2DecodedAuthor !== '' ? aMsgHdr.mime2DecodedAuthor : aMsgHdr.author;
                            if(opacustep.auto_archive){
                                autoMail.displayRecipients = false;
                                autoMail.email_id = false;
                                autoMail.uri = aMsgHdr.folder.getUriForMsg(aMsgHdr);
                                autoMail.type = 'auto';
                                autoMail.parseHeader();
                                doArchive = opacustep.allowAddress(autoMail.author);
                            }
                            if(doArchive){
                                autoMail.inboundAutoArchive(true);
                                opacustep.setStatus(opacustep.strings.GetStringFromName('autoArchiving'));
                            } else if(opacustep.opacus_notify){
                                var subject = aMsgHdr.mime2DecodedSubject !== '' ? aMsgHdr.mime2DecodedSubject : aMsgHdr.subject;
                                opacustep.notifyUser('newmail',subject + "\n" + author.replace(/&#039;/g,"'"));
                            }
                        }
                    }
                } else if((aMsgHdr.folder.flags & 0x0200) == 0x0200) {
                    // Check for custom header and flag as archived if present and correct.
                    // See opacustep-compose.js for more details.
                    var headerName = 'x-opacus-archived';
                    var headerProperty = aMsgHdr.getStringProperty(headerName);
                    if(headerProperty !== '' && headerProperty != 'none'){
                        if(headerProperty != 'deferred' + opacustep.mailUniq.toString()){
                            var tagHeaders = Components.classes["@mozilla.org/array;1"].
                                createInstance(Components.interfaces.nsIMutableArray);
                            tagHeaders.appendElement(aMsgHdr,false);
                            aMsgHdr.folder.addKeywordsToMessages(tagHeaders,'OpacusArchived');
                        } else {
                            autoMail.displayRecipients = true;
                            autoMail.email_id = false;
                            autoMail.uri = aMsgHdr.folder.getUriForMsg(aMsgHdr);
                            autoMail.type = 'auto';
                            autoMail.parseHeader();
                            autoMail.inboundAutoArchive(true);
                            opacustep.setStatus(opacustep.strings.GetStringFromName('autoArchiving'));
                        }
                    }
                }
            }
    };
    opacustep.notificationService = Components.classes["@mozilla.org/messenger/msgnotificationservice;1"]  
                                        .getService(Components.interfaces.nsIMsgFolderNotificationService);
    opacustep.notificationService.addListener(newMailListener, opacustep.notificationService.msgAdded);
  },
  
  setUserList: function(response,extraData){
      dump(JSON.stringify(response));
  },

  runAtStart: function(thisVersion){
    try{
        opacustep.windows = (navigator.platform.indexOf('Win') != -1)? true : false;
        opacustep.mac = (navigator.platform.indexOf('Mac') != -1)? true : false;
    }
    catch(ex){}
    var ver = -1, firstrun = true;
    try{
      ver = opacustep.prefs.getCharPref("version");  
      firstrun = opacustep.prefs.getBoolPref("firstrun"); 
    }catch(e){  
      //nothing  
    } finally {
      if(firstrun){
        opacustep.addButtons();
      }
      if (firstrun  || ver != thisVersion){ 
        opacustep.prefs.setBoolPref("firstrun",false);  
        opacustep.prefs.setCharPref("version",thisVersion);
        opacustep.showInfoTab("chrome://opacustep/content/version.html");    
      }

      if(!firstrun){
        // Update the server details from the preferences
        opacustep.updateServerInfo(false);
      }     
    }
  },

  serverInfo_callback: function(response,extraData){
        opacustep.server_info = response;
        opacustep.status = document.getElementById('opacusStatusText');
        opacustep.progress = document.getElementById('opacusStatusProgress');
        opacustep.progressContainer = document.getElementById('opacusStatusProgressContainer');
        opacustep.statusIcon = document.getElementById('opacusStatusIcon');
        if(typeof(opacustep.server_info.flavor) !== 'undefined'){
            var timerEvent = {
                notify: function(timer) {
                    opacustep.contactTimer.cancel();
                    if(opacustep.syncAtStart && opacustep.justStarted){
                        opacustep.contactSync();
                    }
                    if(opacustep.syncHourly){
                        opacustep.scheduleSync();
                    }
                    opacustep.justStarted = false;
                }
            };
            // Fire sync
            opacustep.contactTimer.initWithCallback(timerEvent,10000,Components.interfaces.nsITimer.TYPE_ONE_SHOT);
        }
  },

  scheduleSync: function(){
        var timerEvent = {
            notify: function(timer) {
                opacustep.contactTimer.cancel();
                opacustep.contactSync();
                opacustep.scheduleSync();
            }
        };
        opacustep.contactTimer.initWithCallback(timerEvent,3600000,Components.interfaces.nsITimer.TYPE_ONE_SHOT);
  },

  showPreferences: function(){
    window.openDialog("chrome://opacustep/content/opacustep-options.xul","","chrome,resizable=yes,titlebar,modal,toolbar,centerscreen");
  },

  showInfoTab: function(url){ 
    var tabmail = document.getElementById("tabmail");  
    if (!tabmail) {  
      // Try opening new tabs in an existing 3pane window  
      var mail3PaneWindow = Components.classes["@mozilla.org/appshell/window-mediator;1"]  
          .getService(Components.interfaces.nsIWindowMediator)  
          .getMostRecentWindow("mail:3pane");  
      if (mail3PaneWindow) {  
        tabmail = mail3PaneWindow.document.getElementById("tabmail");  
        mail3PaneWindow.focus();  
      }  
    }  
      
    if (tabmail) {
      tabmail.openTab("contentTab", {contentPage: url});  
    } else { 
      window.openDialog("chrome://messenger/content/", "_blank",  
        "chrome,dialog=no,all", null, {
            tabType: "contentTab",  
            tabParams: {
                contentPage: url
            }
        }
      );
    }
  },

  optionsLoad: function(optionsWindow){
    opacustep.domain_blacklist = [];
    opacustep.email_blacklist = [];
    optionsWindow.document.getElementById('passwordsugarcrm_password').value = opacustep.sugarcrm_password_plain;
    if(opacustep.sugarcrmwins){
        optionsWindow.document.getElementById('sugarcrmwins').setAttribute('selected',true);
        optionsWindow.document.getElementById('thunderbirdwins').setAttribute('selected',false);
    } else {
        optionsWindow.document.getElementById('thunderbirdwins').setAttribute('selected',true);
        optionsWindow.document.getElementById('sugarcrmwins').setAttribute('selected',false);
    }
    if(optionsWindow.document.getElementById('checkopacus_ldap').checked === false){
        optionsWindow.document.getElementById('ldap_key_box').hidden = true;
    }
    if(opacustep.db !== false){
        optionsWindow.document.getElementById('deleteOptions').hidden =false;
    }
    if(optionsWindow.document.getElementById('checkopacus_syncdeletions').checked === false){
        optionsWindow.document.getElementById('menulist_threshold').disabled = true;
    }
    optionsWindow.prefsObject = new opacustepPrefs(optionsWindow);
    optionsWindow.prefsObject.checkLicence(optionsWindow.document);
    optionsWindow.sizeToContent();
  },


    link: function(identifier) {
        if(identifier.indexOf('http') == -1){
            var idArray = identifier.split(':');
            var sugarUri = opacustep.sugarurl.replace('/service/v4/rest.php','');
            identifier = sugarUri + '/index.php?action=DetailView&module=' + idArray[0] + '&record=' + idArray[1];
            if (opacustep.server_info.version.substring(0,1) > 6) {
                identifier = sugarUri + '/#' + idArray[0] + '/' + idArray[1];
            }
        }
        var extProtocolSvc = Components.classes["@mozilla.org/uriloader/external-protocol-service;1"]
            .getService(Components.interfaces.nsIExternalProtocolService);
        var ioService = Components.classes["@mozilla.org/network/io-service;1"]
            .getService(Components.interfaces.nsIIOService);
        var uri = ioService.newURI(identifier, null, null);
        extProtocolSvc.loadURI(uri);
    },
  
    addButtons: function() {
        try {
            var buttonIds = [
                "opacustep-archive",
                "opacustep-contactsync",
                "opacustep-createButton"
            ];
            var afterId = "button-tag";
            var navBar  = document.getElementById("mail-bar3");
            var curSet  = navBar.currentSet.split(",");
            buttonIds.forEach(function (item, all) {
                if (curSet.indexOf(item) !== -1) {
                    curSet.splice(curSet.indexOf(item), 1);
                }
            }, this);

            if (curSet.indexOf(buttonIds[0]) == -1) {
                var pos = curSet.indexOf(afterId) + 1 || curSet.length;
                var set = curSet.slice(0, pos).concat(buttonIds).concat(curSet.slice(pos));

                navBar.setAttribute("currentset", set.join(","));
                navBar.currentSet = set.join(",");
                document.persist(navBar.id, "currentset");
                try {
                    BrowserToolboxCustomizeDone(true);
                }
                catch (e) {}
            }
        }
        catch(e) {}
        opacustep.prefs.setBoolPref('addButtons',true);
    },

    updateServerInfo: function(optionsWindow) {
        var logins;
        opacustep.webservice = '';
        opacustep.sugarurl = opacustep.prefs.getCharPref("sugarcrm_url").replace(/\/$/,'');
        opacustep.sugarurlOrig = opacustep.prefs.getCharPref("sugarcrm_url").replace(/\/$/,'');
        opacustep.sugarcrm_username = opacustep.prefs.getCharPref("sugarcrm_username");
        opacustep.licence_key = opacustep.prefs.getCharPref("opacus_licence_key").replace(/^\s\s*/,'').replace(/\s\s*$/,'');
        opacustep.auto_archive = opacustep.prefs.getBoolPref("auto_archive");
        opacustep.auto_archive_attachments = opacustep.prefs.getBoolPref("auto_archive_attachments");
        opacustep.opacus_notify = opacustep.prefs.getBoolPref("opacus_notify");
        opacustep.opacus_cases = opacustep.prefs.getBoolPref("opacus_cases");
        opacustep.addBcc = opacustep.prefs.getBoolPref("opacus_addbcc");
        opacustep.opacus_ldap = opacustep.prefs.getBoolPref("opacus_ldap");
        opacustep.opacus_ldap_key = opacustep.prefs.getCharPref("opacus_ldap_key");
        opacustep.useStoredId = opacustep.prefs.getBoolPref("opacus_usestoredid");
        opacustep.searchOnOpen = opacustep.prefs.getBoolPref("opacus_searchonopen");
        opacustep.syncAtStart = opacustep.prefs.getBoolPref("opacus_syncatstart");
        opacustep.syncHourly = opacustep.prefs.getBoolPref("opacus_synchourly");
        opacustep.twoWaySync = opacustep.prefs.getBoolPref("opacus_twowaysync");
        opacustep.ignoreConverted = opacustep.prefs.getBoolPref("ignoreConverted");
        var blacklist = opacustep.prefs.getCharPref("opacus_blacklist").replace("\r\n","\n").replace("\r","\n").split("\n");
        var line='';
        for(var i in blacklist){
            line = blacklist[i].toLowerCase().toString().replace(/^\s\s*/,'').replace(/\s\s*$/,'');
            if(line.match(/^\S+@\S+$/)){
                opacustep.email_blacklist.push(line);
            } else if(line.match(/^\S+$/)){
                opacustep.domain_blacklist.push(line.toLowerCase());
            }
        }

        // Test to see if we have turned off restrictive controls in Sync, and set Sugar sync to start of epoch to pull down refresh.
        var myContactsOnly = opacustep.prefs.getBoolPref("opacus_mycontactsonly");
        if(myContactsOnly === false && opacustep.myContactsOnly === true){
            opacustep.prefs.setCharPref('sugarcrmLastSync','1970-01-01 00:00:00');
            opacustep.prefs.setCharPref('sugarcrmLastLeadSync','1970-01-01 00:00:00');
        }
        opacustep.myContactsOnly = opacustep.prefs.getBoolPref("opacus_mycontactsonly");
        var honourSyncToOutlook = opacustep.prefs.getBoolPref("opacus_honoursynctooutlook");
        if(honourSyncToOutlook === false && opacustep.honourSyncToOutlook === true){
            opacustep.prefs.setCharPref('sugarcrmLastSync','1970-01-01 00:00:00');
        }
        opacustep.honourSyncToOutlook = opacustep.prefs.getBoolPref("opacus_honoursynctooutlook");

        opacustep.session_id = '';
        opacustep.started = false;
        if(optionsWindow){
            optionsWindow.prefsObject.saveSettings();
            var sugarPassword = optionsWindow.document.getElementById('passwordsugarcrm_password').value;
            if(sugarPassword !== ''){
                var nsLoginInfo = new Components.Constructor("@mozilla.org/login-manager/loginInfo;1",  
                    Components.interfaces.nsILoginInfo,  
                    "init"); 
                var sugarLogin = new nsLoginInfo('chrome://opacustep',  
                    null, 'SugarCRM Login',
                    opacustep.sugarcrm_username, sugarPassword, '', ''); 
                // Remove old login
                try {  
                    // Find users for this extension   
                    logins = opacustep.passwordManager.getAllLogins();
                    for (i = 0; i < logins.length; i++) {  
                        if (logins[i].hostname == 'chrome://opacustep' && logins[i].username == opacustep.sugarcrm_username) {  
                            opacustep.passwordManager.removeLogin(logins[i]);  
                            break;  
                        }  
                    }  
                }  
                catch(ex) {} 
                // Add new login
                opacustep.passwordManager.addLogin(sugarLogin);
            }
        }

        try {     
            // Find users for the given parameters  
            logins = opacustep.passwordManager.getAllLogins();
            for (i = 0; i < logins.length; i++) {  
                if (logins[i].hostname == 'chrome://opacustep' && logins[i].username == opacustep.sugarcrm_username) {  
                    opacustep.sugarcrm_password_plain = logins[i].password;
                    break;  
                }  
            }  
        }  
        catch(ex) {}

        var crypt = new opacustepcrypt();
        if(opacustep.opacus_ldap){
            opacustep.sugarcrm_password = crypt.ldapEncrypt(opacustep.sugarcrm_password_plain,opacustep.opacus_ldap_key);
        } else {
            opacustep.sugarcrm_password = crypt.encrypt(opacustep.sugarcrm_password_plain);
        }

        opacustep.webservice = new opacusteprest(); 
        opacustep.webservice.setCredentials(opacustep.sugarurl,opacustep.sugarcrm_username,opacustep.sugarcrm_password);
        var serverEvent = {
            notify: function(timer) {
                var i;
                opacustep.timer.cancel();
                if(!opacustep.licence.check(opacustep.sugarurlOrig.toLowerCase(),opacustep.sugarcrm_username.toLowerCase())){
                    // Check auto renew on license
                    opacustep.prefsObject = new opacustepPrefs();
                    opacustep.prefsObject.initCheck();
                }
                // Wait until after possible changes have been saved before loading in the custom modules
                opacustep.custom_modules = JSON.parse(opacustep.prefs.getCharPref("sugarcrm_custom_modules"));
                opacustep.searchableModules = new Array('Leads','Bugs','Contacts','Accounts','Cases','Opportunities','Project','ProjectTask');
                opacustep.moduleLabels = [];
                opacustep.sugarcrmwins = opacustep.prefs.getBoolPref("sugarcrmwins");
                if(typeof(opacustep.server_info.flavor) !== 'undefined' && opacustep.server_info.flavor != 'CE'){
                    opacustep.searchableModules.push('Quotes');
                }
                for(i in opacustep.searchableModules){
                    opacustep.moduleLabels[opacustep.searchableModules[i]] = opacustep.strings.GetStringFromName(opacustep.searchableModules[i]);
                }
                for(i in opacustep.custom_modules){
                    var custom_module = opacustep.custom_modules[i];
                    if(custom_module.checked == true){
                        if(custom_module.label === ''){
                            custom_module.label = custom_module.module;
                        }
                        opacustep.customSelectedModules.push(custom_module.module.toLowerCase());
                        opacustep.searchableModules.push(custom_module.module);
                        opacustep.moduleLabels[custom_module.module] = custom_module.label;
                    }
                }
            }
        };
        var infoEvent = {
            notify: function(timer) {
                opacustep.timer.cancel();
                if(navigator.onLine){
                    opacustep.webservice.callback = opacustep.serverInfo_callback;
                    opacustep.webservice.get_server_info('');
                } else {
                    // Run callback to start contact sync scheduler
                    opacustep.serverInfo_callback({"flavor":"none"},'');
                    opacustep.onlineStatus = false;
                }
                opacustep.timer.initWithCallback(serverEvent,400,Components.interfaces.nsITimer.TYPE_ONE_SHOT);
            }
        };
        opacustep.timer.initWithCallback(infoEvent,150,Components.interfaces.nsITimer.TYPE_ONE_SHOT);

        // end of removed try - catch block

        return false;
    },

    sendAndArchive: function(composeWindow){
        if(navigator.onLine){
            if(opacustep.licence.check(opacustep.sugarurlOrig.toLowerCase(),opacustep.sugarcrm_username.toLowerCase())){
                opacustep.webservice.login();
                opacustep.sendAndArchiveStatus = 'unknown';
                this.mails = [];
                this.mails[0] = new opacustepMail();
                if(this.mails[0].populateFromCompose(composeWindow)){
                    this.mails[0].displayRecipients = true;
                    this.mails[0].direction = 'outbound';
                    this.mails[0].type = 'standard';
                    this.mails[0].composeWindow = composeWindow;
                    this.searchObject = new opacustepsearch(this,this.mails[0].searchSuggestion,this.mails[0].subject);
                    this.mails[0].allowEdit = true;
                    this.searchObject.allowEdit = true;
                    this.searchObject.search();
                }
            }
        }
    },

    sendAndAutoArchive: function(composeWindow){
        if(opacustep.licence.check(opacustep.sugarurlOrig.toLowerCase(),opacustep.sugarcrm_username.toLowerCase())){
            if(navigator.onLine && opacustep.mailNewsPrefs.getBoolPref('sendInBackground') === false){
                opacustep.setStatus(opacustep.strings.GetStringFromName('autoArchiving'));
                composeWindow.document.getElementById('opacustep-send-archive').disabled = true;
                opacustep.webservice.login();
                opacustep.sendAndArchiveStatus = 'unknown';
                var autoOutboundMail = new opacustepMail();
                autoOutboundMail.composeWindow = composeWindow;
                autoOutboundMail.outboundAutoArchive(composeWindow);
            } else {
                opacustep.sendAndArchiveStatus = 'deferred' + opacustep.mailUniq.toString();
                try{
                    composeWindow.document.getElementById('button-send').doCommand();
                }
                catch(ex){
                    composeWindow.GenericSendMessage.apply();
                }
            }
        }
    },

    allowAddress: function(addressToCheck){
        var i;
        var addressArray = addressToCheck.toString().split(/@/);
        var doArchive = true;
        for(i in opacustep.domain_blacklist){
            if(opacustep.domain_blacklist[i] == addressArray[1]){
                doArchive = false;
            }
        }
        for(i in opacustep.email_blacklist){
            if(opacustep.email_blacklist[i] == addressToCheck.toString()){
                doArchive = false;
            }
        }
        return doArchive;
    },

    getRelated: function(){
        try
        {
            var mail = new opacustepMail();
            mail.uri    = gFolderDisplay.selectedMessageUris[0];
            mail.findRelatedRecords();  
        }
        catch (ex){}        
    },

    archive: function(bulk) {
        if (navigator.onLine) {
            opacustep.searchesReturned = 0;
            opacustep.bulkNoArchived = 0;
            if (opacustep.licence.check(opacustep.sugarurlOrig.toLowerCase(),opacustep.sugarcrm_username.toLowerCase())) {
                // Function called from the main window that pops up the search window
                this.MessageURIArray = '';
                try
                {
                    this.MessageURIArray = gFolderDisplay.selectedMessageUris;
                }
                catch (ex){}

                if(this.MessageURIArray !== null){
                    opacustep.webservice.login();
                    this.mails = Array();
                    for(var i=0;i<this.MessageURIArray.length;i++){
                        this.mails[i]       = new opacustepMail();
                        this.mails[i].creator   = this;
                        this.mails[i].uri   = this.MessageURIArray[i];
                        this.mails[i].type = 'standard';
                        this.mails[i].direction = 'inbound';
                    }
                    this.mails[0].parseHeader();
                    opacustep.firstMessageHeader = this.mails[0].msgHeader;
                    var folderType = opacustep.firstMessageHeader.folder.displayRecipients;
                    for(var j in this.mails){
                        this.mails[j].displayRecipients = folderType;
                    }
                    if(bulk){
                        opacustep.setStatus(opacustep.strings.GetStringFromName('autoArchiving'));
                        opacustep.totalMails = this.mails.length;
                        opacustep.totalBulkMails = this.mails.length;
                        if(opacustep.totalMails > 100){
                            opacustep.loginTimeout = 360000;
                        }
                        if(opacustep.totalMails > 1000){
                            opacustep.loginTimeout = 600000;
                        }
                        for(var k in this.mails){
                            this.mails[k].type = 'bulkauto';
                            if(k === 0){
                                this.mails[k].inboundAutoArchive(true);
                            } else {
                                this.mails[k].inboundAutoArchive(false);
                            }
                        }
                    } else {
                        this.mails[0].suggestSearch(folderType);
                        this.searchObject = new opacustepsearch(this,this.mails[0].searchSuggestion,this.mails[0].subject);
                        //if(this.mails.length == 1 && this.fiveOrLater){
                        if(this.mails.length == 1){
                            this.mails[0].allowEdit = true;
                            this.searchObject.allowEdit = true;
                        }
                        this.searchObject.search();
                    }
                } else {
                    opacustep.notifyUser('error',opacustep.strings.GetStringFromName('notifyNoMessages'));
                }
            }
        }
    },

    archiveMails: function() {
        var doAttachments = this.searchObject.searchWindow.document.getElementById('doAttachments').checked;
        var forceRearchive = this.searchObject.searchWindow.document.getElementById('forceRearchive').checked;
        var selectedObjects = this.searchObject.searchWindow.document.getElementById('resultList').selectedItems;
        var sugarObjects = [];
        if (selectedObjects !== null) {
            for (var b in selectedObjects) {
                if (selectedObjects[b].id) {
                    sugarObjects.push(selectedObjects[b].id);
                }
            }
        }

        if(sugarObjects.length == 0 && (this.mails[0].email_id === false || this.mails[0].allowEdit === false)){
            opacustep.searchObject.searchWindow.document.getElementById('archive_button').disabled=false;
            opacustep.notifyUser('error',opacustep.strings.GetStringFromName('notifyNoSugarObjects'));
            return false;
        }
        opacustep.totalMails = this.mails.length;
        opacustep.searchObject.searchWindow.document.getElementById('feedback').setAttribute('mode','undetermined');
        opacustep.searchObject.searchWindow.document.getElementById('archive_button').setAttribute('label',opacustep.strings.GetStringFromName('archiving'));
        for(var i=0;i<this.mails.length;i++){
            this.mails[i].worker = new opacusteprest();
            this.mails[i].worker.setCredentials(opacustep.sugarurl,opacustep.sugarcrm_username,opacustep.sugarcrm_password);
            this.mails[i].sugarObjects = sugarObjects;
            this.mails[i].doAttachments = doAttachments;
            if(opacustep.licence.check(opacustep.sugarurlOrig.toLowerCase(),opacustep.sugarcrm_username.toLowerCase())){
                if(this.mails[i].direction == 'outbound'){
                    this.mails[i].unixTime = Math.round(new Date().getTime() / 1000);
                    var newHtml = opacustep.searchObject.searchWindow.document.getElementById('opacusEditmail').contentDocument.documentElement.innerHTML;
                    var newSubject = opacustep.searchObject.searchWindow.document.getElementById('opacusEditSubject').value;
                    var attList = opacustep.searchObject.searchWindow.document.getElementById('allattachments');
                    var selectedAttachments = attList.selectedItems; 
                    if (selectedAttachments !== null) {
                        this.mails[i].attachmentsNames = [];
                        for (var j in selectedAttachments) {
                            if (selectedAttachments[j].value) {
                                this.mails[i].attachmentNames.push(selectedAttachments[j].value);
                            }
                        }
                    }
                    if(this.mails[i].origHtml != newHtml){
                        this.mails[i].html = newHtml;
                    }
                    if(this.mails[i].subject != newSubject){
                        this.mails[i].subject = newSubject;
                    }
                    this.mails[i].worker.callback = this.mails[i].archive_callback;
                    this.mails[i].worker.archive(this.mails[i]);
                } else {
                    this.mails[i].forceRearchive = forceRearchive;
                    this.mails[i].archiveMail();
                }
            }
        }
    },

    wrapUp: function(mailObject) {
        var type = mailObject.type;
        var direction = mailObject.direction;
        if(direction != 'outbound'){
            try {
                var tagArray = Components.classes["@mozilla.org/array;1"].createInstance(Components.interfaces.nsIMutableArray);
                tagArray.appendElement(mailObject.msgHeader, false);
                opacustep.firstMessageHeader.folder.addKeywordsToMessages(tagArray,'OpacusArchived');
                if(mailObject.email_id !== false && mailObject.email_id != 'false'){
                    mailObject.msgHeader.folder.msgDatabase.setStringProperty(mailObject.msgHeader.messageKey,'opacus-archived',mailObject.email_id);
                    mailObject.msgHeader.folder.msgDatabase = null;
                }
            }
            catch(e){}
        }
        if(type == 'standard' || type == 'bulkauto'){
            opacustep.totalMails--;
            if(type == 'bulkauto'){
                opacustep.setStatus(opacustep.strings.GetStringFromName('autoArchiving') +
                    " " + (opacustep.totalBulkMails - opacustep.totalMails) + '/' + opacustep.totalBulkMails);
            }
            if(opacustep.totalMails > 0){
                return;
            }
        }
        opacustep.loginTimeout = 120000;
        var totalMails = 1;
        if(type == 'bulkauto'){
            totalMails = (opacustep.totalBulkMails - opacustep.bulkNoArchived);
        } else if(type == 'standard' && direction=='inbound'){
            totalMails = this.mails.length;
        }
        var plural=opacustep.strings.GetStringFromName('plural');
        if(totalMails == 1){
            plural = '';
        }

        if(type != 'auto'){
            opacustep.mails = '';
            opacustep.setStatus('hidden');
            opacustep.notifyUser('notify',totalMails + ' '+
                opacustep.strings.GetStringFromName('email') +
                plural + ' ' +
                opacustep.strings.GetStringFromName('verifyArchived'));
            if(type != 'bulkauto'){
                this.searchObject.searchWindowClose();
            }
        }
    },

    create: function(type,source){
        if(navigator.onLine){
            var sugarObject = new opacustepCreate();
            if(source == 'email'){
                sugarObject.action = 'createFromEmail';
            }
            sugarObject.type = type;
            sugarObject.init();
        }
    },

    quickEdit: function(id){
        var idArr = id.split(':');
        var sugarObject = new opacustepCreate();
        sugarObject.action = 'edit';
        sugarObject.type = idArr[0].replace(/ies$/,'y').replace(/s$/,'');
        sugarObject.id = idArr[1];
        sugarObject.init();
    },

    setStatus: function(message){
        if(message == 'hidden'){
            opacustep.status.hidden = true;
            opacustep.progressContainer.hidden = true;
            opacustep.statusIcon.hidden = true;
            opacustep.status.setAttribute('label','...');
            //opacustep.progress.setAttribute('mode','determined');
        } else {
            opacustep.status.hidden = false;
            opacustep.progressContainer.hidden = false;
            opacustep.statusIcon.hidden = false;
            opacustep.status.setAttribute('label',message);
            //opacustep.progress.setAttribute('mode','undetermined');
        }
    },

    notifyUser: function(type,message){
        // Set up function and timer to handle lack of new line support in XUL notify window
        var fixNotifyTimer = Components.classes["@mozilla.org/timer;1"].createInstance(Components.interfaces.nsITimer);
        function fixAlertNotification() {
            //seek for alert window
            var fixed= false;
            var winEnum = Components.classes["@mozilla.org/appshell/window-mediator;1"]
                .getService(Components.interfaces.nsIWindowMediator)
                .getXULWindowEnumerator(null);
            var win = null;
            while (winEnum.hasMoreElements())
                try { win = winEnum.getNext()
                        .QueryInterface(Components.interfaces.nsIXULWindow).docShell
                        .QueryInterface(Components.interfaces.nsIInterfaceRequestor)
                        .getInterface(Components.interfaces.nsIDOMWindow);
                    if(win.location == 'chrome://global/content/alerts/alert.xul'){
                        var orgLabel = win.document.getElementById('alertTextLabel');
                        var txt = orgLabel.value.split("\n"); //get original value, as lines
                        orgLabel.value = txt[0];//set original label to first line
                        //add subsequent lines
                        for(var i = 1 ; i < txt.length ; i++){
                            var label = orgLabel.cloneNode(true);
                            label.value = txt[i];
                            orgLabel.parentNode.appendChild(label);
                        }
                        //update alert size and position
                        win.onAlertLoad();
                        fixed = true;
                        break;
                    }
                }
            catch(e){ } //important: hide exceptions

            if (!fixed){
                var notifyEvent = {
                    notify: function(timer) {
                        fixNotifyTimer.cancel();
                        if(opacustep.fixNotifications){
                            fixAlertNotification();
                        }
                    }
                };
                fixNotifyTimer.initWithCallback(notifyEvent,100,Components.interfaces.nsITimer.TYPE_ONE_SHOT);
            }
        } 
        if(opacustep.allowNotify || type == 'critical'){
            // TODO We can specify different images depending on notification type
            var title=opacustep.strings.GetStringFromName('notification');
            var image = (opacustep.windows)? 'chrome://global/skin/icons/information-32.png' : 'chrome://global/skin/icons/information-48.png';
            switch(type){
                case 'error' :
                    image = (opacustep.windows)? 'chrome://global/skin/icons/Warning.png' : 'chrome://global/skin/icons/warning-large.png';
                    title = opacustep.strings.GetStringFromName('error');
                    break;
                case 'critical' :
                    image = (opacustep.windows)? 'chrome://global/skin/icons/Warning.png' : 'chrome://global/skin/icons/warning-large.png';
                    title = opacustep.strings.GetStringFromName('critical');
                    break;
                case 'newmail' :
                    image = 'chrome://messenger/skin/icons/new-mail-alert.png';
                    title = opacustep.strings.GetStringFromName('newmail');
                    break;
                case 'sync' :
                    title = opacustep.strings.GetStringFromName('absync');
                    break;
                default:
            }
            try{
                if(type == 'prompt' || opacustep.alertsService === false){
                    opacustep.promptService.alert(null,title,message);
                } else {
                    opacustep.alertsService.showAlertNotification(image,title,message);
                }
            }
            catch(ex){
            }
            // Set up timer to find notification window and fix newlines
            var fixEvent = {
                notify: function(timer){
                    fixNotifyTimer.cancel();
                    if(opacustep.fixNotifications){
                        fixAlertNotification();
                    }
                }
            };
            fixNotifyTimer.initWithCallback(fixEvent,20,Components.interfaces.nsITimer.TYPE_ONE_SHOT);
            opacustep.allowNotify = false;
        }
        var timerEvent = {
            notify: function(timer) {
                opacustep.timer.cancel();
                opacustep.allowNotify =true;
            }
        };
        opacustep.timer.initWithCallback(timerEvent,1000,Components.interfaces.nsITimer.TYPE_ONE_SHOT);
    },
    // Contact Synchronisation
    contactSync:  function(){
        if(navigator.onLine){
            if(opacustep.syncInProgress === false){
                opacustep.syncInProgress = true;
                opacustep.abSyncs = 0;
                opacustep.cardCounter   =   [0,0,0,0,0,0];
                opacustep.syncLock = true;
                opacustep.sugarCardsToDelete = [];
                opacustep.tbirdCardsToDelete = [];
                opacustep.sugarPermanentRemovals = [];

                if(opacustep.db !== false){
                    var selectQuery = "SELECT * FROM deleted_records WHERE status IN ('toDelete','deleted') GROUP BY id||module_name||status";
                    var statement = opacustep.db.createStatement(selectQuery);
                    statement.executeAsync({
                        handleResult: function(aResultSet) { 
                            for (var row = aResultSet.getNextRow(); row; row = aResultSet.getNextRow()) {  
                                if(row.getResultByName("status") == 'toDelete'){
                                    if(opacustep.twoWaySync !== false){
                                        var value = {   
                                            'id': row.getResultByName("id"),
                                            'module_name': row.getResultByName("module_name"),
                                            'first_name': row.getResultByName("first_name"),
                                            'last_name': row.getResultByName("last_name")
                                        };
                                        opacustep.sugarCardsToDelete.push(value);
                                    }
                                } else {
                                    opacustep.sugarPermanentRemovals.push(row.getResultByName("module_name") + ':' +row.getResultByName("id"));
                                }
                            }
                        },  

                        handleError: function(aError) {
                            opacustep.syncLock = false;
                            // Log this 
                        },  

                        handleCompletion: function(aReason) { 
                            if (aReason != Components.interfaces.mozIStorageStatementCallback.REASON_FINISHED) { 
                                // Log this
                            } else {
                                //dump(JSON.stringify(opacustep.sugarPermanentRemovals));
                                opacustep.syncLock = false;
                            }
                        }  
                    });
                } else {
                    opacustep.syncLock = false;
                }

                var syncType = opacustep.prefs.getCharPref('opacus_syncmodules');
                var ab = new opacustepab();
                if(syncType == 'contacts'){
                    ab.sync('Contacts');
                } else if(syncType == 'leads'){
                    ab.sync('Leads');
                } else {
                    ab.sync('Contacts');
                    var leadsAb = new opacustepab();
                    leadsAb.sync('Leads');
                }
            }
        }
    }, 
};
window.addEventListener("load", function() {opacustep.onLoad();}, false);
window.addEventListener("online", function () {
    if(opacustep.onlineStatus === false){
        opacustep.updateServerInfo();
        opacustep.onlineStatus = true;
    }
}, false); 
window.addEventListener("offline", function () {opacustep.onlineStatus = false;}, false);  
