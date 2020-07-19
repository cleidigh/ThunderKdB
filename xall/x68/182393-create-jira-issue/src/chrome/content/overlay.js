/* Thunderbird Plugin: Create Jira Issue
 *
 * This Plugin is able to create Jira-Issues out of an email.
 * Furthermore the content of an email can be added to an issue
 * as a comment.
 *
 * Requirements:
 * - Jira 4.4 and above
 * - Thunderbird 68+
 *
 * Authors: catworkx® GmbH, Hamburg
 * 		   Sebastian Gerdes <sebastian.gerdes_AT_catworkx.de>
 *         Holger Lehmann <holger.lehmann_AT_catworkx.de>
 *
 */

var EXPORTED_SYMBOLS = [ "createjiraissue" ];
// Variable mimeMsg is not undeclared in chrome/content/progress.js line 16.
// Fix taken from lightning source
if (typeof(mimeMsg) === 'undefined')
  (typeof(window) !== 'undefined') ? this.mimeMsg = {} : mimeMsg = {};

Components.utils.import("resource:///modules/gloda/mimemsg.js", mimeMsg);
// EPOQ CHANGES START
Components.utils.import("chrome://createjiraissue/content/epoq/transwindow.js");
Components.utils.import("chrome://createjiraissue/content/epoq/htmltable2jiratext.js");
// EPOQ CHANGES END
var consoleService = Components.classes["@mozilla.org/consoleservice;1"].getService(Components.interfaces.nsIConsoleService);
//consoleService.logStringMessage("[overlay.js]: loading begin");

var createjiraissue = {

    error: false,
	selectedAttachments: [],
	attachments: [],
	attachmentsDone: false,
	dialogWindow: null,
	messageURI: null,
	header: null,
	aConsoleService: Components.classes["@mozilla.org/consoleservice;1"].getService(Components.interfaces.nsIConsoleService),

    createDialog: function(){
    	createjiraissue.prefs = Components.classes["@mozilla.org/preferences-service;1"].getService(Components.interfaces.nsIPrefService);
		createjiraissue.prefs = createjiraissue.prefs.getBranch("extensions.createjiraissue.");
		var wizard = createjiraissue.prefs.getBoolPref("wizard");
		if ( wizard != true ) {
			var dlg = window.openDialog("chrome://createjiraissue/content/options.xul", "createjiraissuePreferences", "chrome, titlebar, toolbar, dialog=yes, resizable=yes","paneSettingsSplash");
			dlg.sizeToContent();
			dlg.focus();
		}
		createjiraissue.restCreateDialog();
    },

    commentDialog: function(){
    	createjiraissue.prefs = Components.classes["@mozilla.org/preferences-service;1"].getService(Components.interfaces.nsIPrefService);
		createjiraissue.prefs = createjiraissue.prefs.getBranch("extensions.createjiraissue.");
		var wizard = createjiraissue.prefs.getBoolPref("wizard");
		if ( wizard != true ) {
			var dlg = window.openDialog("chrome://createjiraissue/content/options.xul", "createjiraissuePreferences", "chrome, titlebar, toolbar, dialog=yes, resizable=yes","paneSettingsSplash");
			dlg.sizeToContent();
			dlg.focus();
		}
		createjiraissue.restCommentDialog();
    },

    loadSettings: function(){
		createjiraissue.strings = document.getElementById("createjiraissue_overlay_strings");
	    createjiraissue.promptService = Components.classes["@mozilla.org/embedcomp/prompt-service;1"].getService(Components.interfaces.nsIPromptService);
	    createjiraissue.alertService = Components.classes["@mozilla.org/alerts-service;1"].getService(Components.interfaces.nsIAlertsService);

		// get preferences
		createjiraissue.prefs = Components.classes["@mozilla.org/preferences-service;1"].getService(Components.interfaces.nsIPrefService);
		createjiraissue.prefs = createjiraissue.prefs.getBranch("extensions.createjiraissue.");
	    createjiraissue.jiraurl = createjiraissue.prefs.getCharPref("jiraurl");
		createjiraissue.projectmappingstring = createjiraissue.prefs.getCharPref("projectmapping");

		// get username and password from password manager
		var loginManager = Components.classes["@mozilla.org/login-manager;1"].getService(Components.interfaces.nsILoginManager);
		//var nsLoginInfo = new Components.Constructor("@mozilla.org/login-manager/loginInfo;1", Components.interfaces.nsILoginInfo, "init");
		var logins = loginManager.findLogins("chrome://createjiraissue", null, "Jira Login");
		if (logins.length > 0) {
			createjiraissue.username = logins[0].username;
			createjiraissue.password = logins[0].password;
			createjiraissue.error = false;
		} else {
	        window.openDialog("chrome://createjiraissue/content/options.xul", "createjiraissuePreferences", "chrome, titlebar, toolbar, dialog=yes, resizable=yes").focus();
			createjiraissue.error = true;
			return;
	    }
		/* unused as of now
		 * createjiraissue.prefs.getCharPref("months") == null ||
		 * createjiraissue.prefs.getCharPref("months") == "" ||
		 */
		if ( createjiraissue.prefs.getCharPref("language") == null ||
				createjiraissue.prefs.getCharPref("language") == "" ||
				createjiraissue.prefs.getCharPref("decimalsep") == null ||
				createjiraissue.prefs.getCharPref("decimalsep") == "" ) {
			window.openDialog("chrome://createjiraissue/content/options.xul", "createjiraissuePreferences", "chrome, titlebar, toolbar, dialog=yes, resizable=yes","paneSettingsLanguage").focus();
			createjiraissue.error = true;
			return;
		}
	},


	loadInitData: function(){
        //createjiraissue.LOG("loadInitData: start");
    	createjiraissue.loadSettings();

		var mappingArray = new Array();
        var lines = createjiraissue.projectmappingstring.split('\n');
        for (var i = 0; i < lines.length; ++i) {
            var l = lines[i].split('|');
            mappingArray[i] = l;
        }
        createjiraissue.projectmapping = mappingArray;
		createjiraissue.getMailContent();
        createjiraissue.token = null;
        createjiraissue.projCounter = 0;
        createjiraissue.issuetypes = new Array();
        createjiraissue.jiraLogin();

		if (createjiraissue.token == null) {
			createjiraissue.error = true;
			return false;
		}

        // load Jira projects
        createjiraissue.jiraLoadProjects();

        // sort array
        createjiraissue.projects.sort();

        // get preselected project
		createjiraissue.selectedproject = "";
        for (var x = 0; x < mappingArray.length; x++) {
            if (createjiraissue.mailfrom.search(mappingArray[x][0]) != -1){
                 createjiraissue.selectedproject = mappingArray[x][1];
            }
        }
        //createjiraissue.LOG("loadInitData: end");
	},

    getMailContent: function(){
    	//createjiraissue.aConsoleService.logStringMessage("[getMailContent]: start");

        var MessageURI = gFolderDisplay.selectedMessageUris[0];
        createjiraissue.messageURI = MessageURI;
        var msg = messenger.messageServiceFromURI(MessageURI);
        createjiraissue.header = msg.messageURIToMsgHdr(MessageURI);

        var subject = createjiraissue.header.mime2DecodedSubject;
        var from = createjiraissue.header.mime2DecodedAuthor;
        var to = createjiraissue.header.mime2DecodedRecipients;
		var cclist = createjiraissue.header.ccList.replace(",",",\n\t\t");
		var bcclist = createjiraissue.header.bccList.replace(",",",\n\t\t");

        var msgdate = new Date( createjiraissue.header.date/1000);

        createjiraissue.mailsubject = createjiraissue.header.mime2DecodedSubject;
        createjiraissue.mailfrom = createjiraissue.header.author;
        createjiraissue.from = from;

        createjiraissue.mailbodyprefix = 'Date:\t\t' + msgdate + '\n' + 'Subject:\t' + subject + '\n' + 'From:\t' + from + '\n' + 'To:\t\t' + to;
		if (cclist != "") {
			createjiraissue.mailbodyprefix = createjiraissue.mailbodyprefix + '\n' + 'Cc:\t\t' + cclist;
		}
		if (bcclist != "") {
			createjiraissue.mailbodyprefix = createjiraissue.mailbodyprefix + '\n' + 'Bcc:\t\t' + bcclist;
		}

		createjiraissue.mailbodyprefix = createjiraissue.mailbodyprefix +
		'\n--------------------------------------------------------------------------------------------\n\n';

		createjiraissue.mailbodyprefixWiki = "||Date:|" + msgdate + "|\n";
		createjiraissue.mailbodyprefixWiki = createjiraissue.mailbodyprefixWiki + "||Subject:|" + subject + "|\n";
		createjiraissue.mailbodyprefixWiki = createjiraissue.mailbodyprefixWiki + "||From:|" + from + "|\n";
		createjiraissue.mailbodyprefixWiki = createjiraissue.mailbodyprefixWiki + "||To:|" + to + "|\n";
		if (cclist != "") {
			createjiraissue.mailbodyprefixWiki = createjiraissue.mailbodyprefixWiki + "||Cc:|" + createjiraissue.header.ccList + "|\n";
		}
		if (bcclist != "") {
			createjiraissue.mailbodyprefixWiki = createjiraissue.mailbodyprefixWiki + "||Bcc:|" + createjiraissue.header.bccList + "|\n";
		}
		createjiraissue.mailbodyprefixWiki = createjiraissue.mailbodyprefixWiki + "----\n\n";

		var doc = document.getElementById("messagepane").contentDocument;
    // EPOQ CHANGES START
		var mailbodyhtml = null;
		createjiraissue.mailbody = mailbodyhtml;
		var selection = doc.getSelection();
		if (selection.rangeCount > 0) {
      var rangei = selection.getRangeAt(0);
      var clonedSelection = rangei.cloneContents();
      var docy = document.implementation.createHTMLDocument("New Document");
      var div = docy.createElement('div');
      div.appendChild(clonedSelection);
      var doctype = document.implementation.createDocumentType( 'html', '', '');
      var dom = document.implementation.createDocument('', 'html', doctype);
      dom.documentElement.appendChild(div);
      createjiraissue.jiratable = htmltable2jiratext(dom.getElementsByTagName("tr"));
      if (createjiraissue.jiratable == "") {
        createjiraissue.jiratable = htmlrow2jiratext(dom.getElementsByTagName("th"));
        createjiraissue.jiratable += htmlrow2jiratext(dom.getElementsByTagName("td"));
      };
      createjiraissue.jiratable = htmlremovetable(dom) + createjiraissue.jiratable;
			var range = selection.getRangeAt(0);
			if (!range.collapsed) {
				var text = selection.toString().replace(/[\n\r]+/g, "\n");
        			var rangeText = range.toString();
        			var selectionText = selection.toString();
				// As a quick workaround use the one that has newlines if the other doesn't.
				var rangeHasNewline = rangeText.indexOf('\n') != -1;
				var selectionHasNewline = selectionText.indexOf('\n') != -1;
				if(rangeHasNewline && !selectionHasNewline) {
					text = rangeText.replace(/[\n\r]+/g, "\n");
				}
				if(!rangeHasNewline && selectionHasNewline) {
					text = selectionText.replace(/[\n\r]+/g, "\n");
				}

				mailbodyhtml = text;
				createjiraissue.mailbody = mailbodyhtml;
			}
		}

		if (mailbodyhtml == null) {
			// Selection.toString() preserves newline, Range.toString() does
			// not.
			// So we change the selection temporarily.
			var r = doc.createRange();
			r.selectNodeContents(doc.body);
			selection.removeAllRanges();
			selection.addRange(r);
			mailbodyhtml = selection.toString();
      var rangei = selection.getRangeAt(0);
      var clonedSelection = rangei.cloneContents();
      var docy = document.implementation.createHTMLDocument("New Document");
      var div = docy.createElement('div');
      div.appendChild(clonedSelection);
      var doctype = document.implementation.createDocumentType( 'html', '', '');
      var dom = document.implementation.createDocument('', 'html', doctype);
      dom.documentElement.appendChild(div);
      createjiraissue.jiratable = htmltable2jiratext(dom.getElementsByTagName("tr"));
      if (createjiraissue.jiratable == "") {
        createjiraissue.jiratable = htmlrow2jiratext(dom.getElementsByTagName("th"));
        createjiraissue.jiratable += htmlrow2jiratext(dom.getElementsByTagName("td"));
      };
      createjiraissue.jiratable = htmlremovetable(dom) + createjiraissue.jiratable;
			createjiraissue.mailbody = mailbodyhtml;
			selection.removeAllRanges();
		}
		// EPOQ CHANGES END
        //createjiraissue.LOG(createjiraissue.mailbodyhtml);

        // remove html tags
		// EPOQ CHANGES START
		// SUG-25: Thunderbird: Plugin shouldn't remove html tags
        // createjiraissue.mailbody = mailbodyhtml.replace(/<([^>]+)>/g, '');
		// EPOQ CHANGES END
        // trim
        createjiraissue.mailbody = createjiraissue.mailbody.replace(/^\s*|\s*$/g, "");
        // remove extra newlines
        // createjiraissue.mailbody = createjiraissue.mailbody.replace(/[\n\r]+/g, "\n");
        // render some html entities
        createjiraissue.mailbody = createjiraissue.mailbody.replace(/\&gt;/g, ">").replace(/\&lt;/g, "<").replace(/\&nbsp;/g, " ");
        //createjiraissue.aConsoleService.logStringMessage(createjiraissue.mailbody);
        //createjiraissue.aConsoleService.logStringMessage("[getMailContent]: end");
    },

    registerAttachments: function (message, mimeMessage) {
    	//createjiraissue.aConsoleService.logStringMessage("[registerAttachments]: start"); //DEBUG
        var attachments = createjiraissue.mimeMessageGetAttachments(mimeMessage);
        createjiraissue.attachments = attachments;
        createjiraissue.attachmentsDone = true;
    	//createjiraissue.aConsoleService.logStringMessage("[registerAttachments]: attachments.length" + attachments.length); //DEBUG
    	//createjiraissue.aConsoleService.logStringMessage("[registerAttachments]: createjiraissue.attachments.length" + createjiraissue.attachments.length); //DEBUG
		if ( createjiraissue.dialogWindow ) {
	        //createjiraissue.aConsoleService.logStringMessage("[registerAttachments]: _showAttachments"); // DEBUG
			createjiraissue.dialogWindow._showAttachments();
		} else {
	    	createjiraissue.aConsoleService.logStringMessage("[registerAttachments]: ERROR: dialog is: " + createjiraissue.dialogWindow); // ERROR
		}
	    //createjiraissue.aConsoleService.logStringMessage("[registerAttachments]: end"); // DEBUG
    },

    /**
     * Recursively walk down a MimeMessage to find something that looks like an
     * attachment.
     * @param {MimeMessage} aMsg The MimeMessage to examine
     * @return {MimeMessageAttachment list} All the "real" attachments that have
     * been found
     * @see https://dev.mozilla.jp/localmdc/localmdc_2730.html
     */
    mimeMessageGetAttachments: function (aMsg) {
      //EPOQ CHANGE START
      var MessageURI = gFolderDisplay.selectedMessageUris[0];
      var doc = document.getElementById("messagepane").contentDocument;
      var inlineimages = doc.body.getElementsByTagName("img");
      var allAttachments = aMsg.allUserAttachments;

      var tmpAttachments = [];

      function findBycontentTypeRecursive(array, contentType) {
        if (array.parts) {
          findBycontentTypeRecursive(array.parts, contentType);
        };
        for (let index = 0; index < array.length; index++) {
          const element = array[index];
          if (array[index].parts) {
            findBycontentTypeRecursive(array[index].parts, contentType);
          };
          if (element["contentType"].includes(contentType)) {
            tmpAttachments.push(element);
            allAttachments.push(element);
            return element;
            if (element.children) {
              const found = findBycontentTypeRecursive(element.children, contentType);

              if (found) {
                return found;
              }
            }
          }
        }
      };
      findBycontentTypeRecursive(aMsg, "image");
      for (i = 0; i < inlineimages.length; i++) {
        var srcurl = inlineimages[i].src;
        var tempobject = {};
        tempobject.url = srcurl;
        var srcquery = [];
        srcquery = srcurl.split("?")[1];
        if (typeof srcquery !== 'undefined' && srcquery.length > 0) {
            var srcparams = [];
            srcparams = srcquery.split("&");
            if (typeof srcparams !== 'undefined' && srcparams.length > 0) {
                for (j = 0; j < srcparams.length; j++) {
                  if (srcparams[j].split("=")[0] == "part") {
                    tempobject.partName = srcparams[j].split("=")[1];
                  } else {
                    tempobject.partName = "";
                  };
                  if (srcparams[j].split("=")[0] == "filename") {
                    tempobject.name = srcparams[j].split("=")[1];
                  } else {
                    tempobject.name = "INL#" + i + "_" + srcurl.substr(srcurl.length - 10);
                  };
                };
              } else {
                tempobject.name = "INL#" + i + "_" + srcurl.substr(srcurl.length - 10);
              };
          } else {
            tempobject.name = "INL#" + i + "_" + srcurl.substr(srcurl.length - 10);
          };
        var found = false;
        for (var k = 0; k < allAttachments.length; k++) {
          if (allAttachments[k].url == tempobject.url) {
            found = true;
            k = allAttachments.length;
          };
        };
        if (!found) {
        allAttachments.push(tempobject);
        };
      };
      for (var l = 0; l < allAttachments.length; l++) {
        if (typeof allAttachments[l].url === 'undefined' || allAttachments[l].url === "") {
          allAttachments.splice(l, 1);
        };
      };
      return allAttachments;
      //EPOQ CHANGE END
    	/*
    	 * the filter function stopped working after TB 60
    	 * returning an Part 1.2 like attachments seem not to have had any impact to any older TB version anyway
    	 *
    	createjiraissue.aConsoleService.logStringMessage("[mimeMessageGetAttachments]: start");
    	var attachments = new Array();
    	var attachment;
    	var msgAttachments = aMsg.allAttachments;
    	createjiraissue.aConsoleService.logStringMessage("[mimeMessageGetAttachments]: msgAttachments: " + msgAttachments);
    	// This first step filters out "Part 1.2"-like attachments.
    	try {
    		for (attachment in msgAttachments) {
    			createjiraissue.aConsoleService.logStringMessage("[mimeMessageGetAttachments]: attachment.isRealAttachment " + attachment.isRealAttachment);
    			if (attachment.isRealAttachment) {
    		    	createjiraissue.aConsoleService.logStringMessage("[mimeMessageGetAttachments]: adding attachment " + attachment);
    				attachments.push(attachment);
    			} else {
    				createjiraissue.aConsoleService.logStringMessage("[mimeMessageGetAttachments]: skipping attachment " + attachment);
    			}
    		}
    	} catch (e) {
    		createjiraissue.aConsoleService.logStringMessage("[mimeMessageGetAttachments]: ERROR: bad attachment ?\n" + e + "\n" + attachment);
    		return new Array();
    	}
    	createjiraissue.aConsoleService.logStringMessage("[mimeMessageGetAttachments]: attachments:" + attachments);
    	createjiraissue.aConsoleService.logStringMessage("[mimeMessageGetAttachments]: end");
    	return attachments;
    	*/
    },

    printXml: function(doc){
        var s = new XMLSerializer();
        createjiraissue.LOG(s.serializeToString(doc));
    },

    attachFiles: function(issueKey){
    	// attaches the globally available attachments
    	// createjiraissue.selectedAttachments and createjiraissue.attachments are used
    	//createjiraissue.aConsoleService.logStringMessage("[attachFiles]: selectedAttachments: " + createjiraissue.selectedAttachments);
    	//createjiraissue.aConsoleService.logStringMessage("[attachFiles]: attachments: " + createjiraissue.attachments);
    	var selectedIds = new Array();
    	if ( createjiraissue.selectedAttachments ) {
        	var i, item;
        	var max = createjiraissue.selectedAttachments.length;
        	for (i=0;i<max;i++){
        		item = createjiraissue.selectedAttachments[i];
        		//alert("item " + item);
        		//alert("hasChildNodes " + item.hasChildNodes());
        		var cells = item.getElementsByTagName("listcell");
        		//alert("cells " + cells);
        		selectedIds.push(cells[0].getAttribute("label"));
        		/*
        		if ( cells ) {
        			var j, cell;
        			var maxcells = cells.length;
        			for (j=0;j<maxcells;j++){
        				cell = cells[j];
        				alert("cell " + cell);
        				alert("label " + cell.label);
        				alert("getAttribute label " + cell.getAttribute("label"));
        			}
        		}
        		*/
        	}
    	}
    	/*
    	alert("selectedIds: " + selectedIds);
    	var i;
    	for(i=0;i<selectedIds.length;i++) {
    		alert(createjiraissue.attachments[selectedIds[i]]);
    	}
    	*/
		var attachmentWindow = window.openDialog("chrome://createjiraissue/content/attachFiles.xul", "Attachments", "chrome, dialog, resizable=yes", this, selectedIds, createjiraissue.attachments).focus();
    	return;
    },

    getAttachmentContent: function() {
           //createjiraissue.aConsoleService.logStringMessage("[getAttachmentContent]: start"); // DEBUG
           //createjiraissue.aConsoleService.logStringMessage("[getAttachmentContent]: dlg: " + createjiraissue.dialogWindow); // DEBUG
           try {
        	var progressWindow = window.openDialog("chrome://createjiraissue/content/progress.xul", "Attachments", "chrome, dialog, resizable=yes", this, createjiraissue.header).focus();
            /*
        	var _cnt = 0;
        	createjiraissue.aConsoleService.logStringMessage("[getAttachmentContent]: start attachments");

        	// handle attachments prior to body modifications
        	//createjiraissue.attachmentsDone = false;
        	mimeMsg.MsgHdrToMimeMessage(createjiraissue.header, createjiraissue, createjiraissue.registerAttachments, true);
        	while ( createjiraissue.attachmentsDone == false ) {
        		window.setTimeout(function () {  }, 1000); // wait ...
        		createjiraissue.aConsoleService.logStringMessage("[getAttachmentContent]: wait for attachments: " + _cnt);
        		_cnt++;
        		// FIXME: display a status message
        	}
        	createjiraissue.aConsoleService.logStringMessage("[getAttachmentContent]: end attachments");
        	*/
        } catch(e) {
        	createjiraissue.aConsoleService.logStringMessage("[getAttachmentContent]: ERROR: when finding attachments: " + e);
        }
        //createjiraissue.aConsoleService.logStringMessage("[getAttachmentContent]: end"); // DEBUG
    },

    restCreateDialog: function(){
    	createjiraissue.loadSettings();
		if (createjiraissue.error) {
			return;
		}
		createjiraissue.getMailContent();

		// open dialog windows and pass projects, issue types and mail content
        var params = {
        		from: createjiraissue.from,
            issueSubject: createjiraissue.mailsubject,
            issueDescription: createjiraissue.mailbody,
      			issueDescriptionPrefix: createjiraissue.mailbodyprefix,
      			issueDescriptionPrefixWiki: createjiraissue.mailbodyprefixWiki,
      			prefs: createjiraissue.prefs,
            jiraurl: createjiraissue.jiraurl,
            username: createjiraissue.username,
            password: createjiraissue.password,
            projectmappingstring: createjiraissue.projectmappingstring,
            selectedproject: createjiraissue.selectedproject,
            attachments: createjiraissue.attachments,
            messageURI: createjiraissue.messageURI,
            out: null
        };
	var dlg = window.openDialog("chrome://createjiraissue/content/restCreateDialog.xul", "restCreateDialog", "chrome, dialog, resizable=yes", params);
	dlg.focus();
	//createjiraissue.aConsoleService.logStringMessage("[restCreateDialog]: dlg:" + dlg); // DEBUG
	createjiraissue.dialogWindow = dlg;
	createjiraissue.getAttachmentContent();
	},

    restCommentDialog: function(){
    	createjiraissue.loadSettings();
		if (createjiraissue.error) {
			return;
		}
		createjiraissue.getMailContent();

		// open dialog windows and pass projects, issue types and mail content
        var params = {
        		from: createjiraissue.from,
            issueSubject: createjiraissue.mailsubject,
            issueDescription: createjiraissue.mailbody,
            issueDescriptionJiraTable: createjiraissue.jiratable,
      			issueDescriptionPrefix: createjiraissue.mailbodyprefix,
      			issueDescriptionPrefixWiki: createjiraissue.mailbodyprefixWiki,
      			prefs: createjiraissue.prefs,
            jiraurl: createjiraissue.jiraurl,
            username: createjiraissue.username,
            password: createjiraissue.password,
            projectmappingstring: createjiraissue.projectmappingstring,
            selectedproject: createjiraissue.selectedproject,
            attachments: createjiraissue.attachments,
            messageURI: createjiraissue.messageURI,
            out: null
        };
	var dlg = window.openDialog("chrome://createjiraissue/content/restCommentDialog.xul", "restCommentDialog", "chrome, dialog, resizable=yes", params);
	dlg.focus();
	//createjiraissue.aConsoleService.logStringMessage("[restCommentDialog]: dlg:" + dlg); // DEBUG
	createjiraissue.dialogWindow = dlg;
	createjiraissue.getAttachmentContent();
	}
  // EPOQ CHANGES START
,
getParams: function() {
  createjiraissue.loadSettings();
  if (createjiraissue.error) {
    return;
  }
  return {
    prefs: createjiraissue.prefs,
          jiraurl: createjiraissue.jiraurl,
          username: createjiraissue.username,
          password: createjiraissue.password,
      };
},

setIssueCommentHashes: function(uri, indexed) {
  createjiraissue.issueCommentHashes = {
    uri: uri,
    indexed: indexed
  }
},
// EPOQ CHANGES END
};

//consoleService.logStringMessage("[overlay.js]: createjiraissue: " + createjiraissue);
//consoleService.logStringMessage("[overlay.js]: done loading");
// EPOQ CHANGES START
if(!transwindow.initTimer) {
	transwindow.initTimer = true;
	DEBUG("registering transwindow timer");
	setInterval(function() {
		if(typeof(transwindow.request) == "undefined") return;
		if(transwindow.request.ok) {
			//LOG("request!");
			var uri = transwindow.request.uri;
			var text = transwindow.request.text;
			transwindow.request.ok = false;
			LOG("RECEIVED TRANSWINDOW REQUEST " + uri);
			createjiraissue.restCommentDialog(uri, text);
		}
	}, 500);
}
// EPOQ CHANGES END
