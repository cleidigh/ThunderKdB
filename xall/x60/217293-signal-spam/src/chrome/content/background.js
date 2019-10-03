var PARAM;
var notificationBox;
var phishingNotification=null;
var lastPhishDetected=null;

function storeLocalParams()
{

}

function loadLocalParams()
{

}

function loadParams(callback)
{
    verifrom.console.log(1,'loadParams - load from URI');
    // Load JSON parameters file from VERIFROM server
    try {

        var req = new XMLHttpRequest();
        req.open("GET", extensionConfig.jsonConfig.url+"?time="+Date.now());
        req.onreadystatechange=function()
        {
            if (req.readyState==4)
            {
                var store;
                switch (req.status)
                {
                    case 200:
                        verifrom.console.log(1,'loadParams - success');
                        if (typeof req.response==='string')
                        {
                            verifrom.console.log(1,'JSON parameters not parsed - try to parse it anyway');
                            PARAM=JSON.parse(req.response);
                        }
                        else if (typeof req.response==='object')
                            PARAM=req.response;
                        else throw "PARAM request replied with unexpected type";
                        storeLocalParams();

                        /*store = localforage.createInstance({
                            name: "signalspamParams"
                            });
                        store.setItem("signalspamParams",JSON.stringify(PARAM));*/

                        if (typeof callback==='function')
                            callback(true);
                        break;
                    default:
                        console.error('loadParams - Failure for getting extension parameters');

                        loadLocalParams();

                        /*store = localforage.createInstance({
                            name: "signalspamParams"
                        });
                        store.getItem("signalspamParams").then(function(storedPARAM){
                            if (storedPARAM && typeof storedPARAM === 'string')
                            {
                                PARAM=JSON.parse(storedPARAM);
                                verifrom.console.log(1,'Retrieved configuration parameters from local storage');
                                if (typeof callback==='function')
                                    callback(true);
                            } else {
                                console.error('Failed retrieving params from local storage',PARAM,store);
                            }
                        });*/

                        // Fallback to the last saved configuration file or at least local file
                        break;
                }
            }
        };
        req.send();

    } catch (err)
    {
        verifrom.console.log(1,'loadParams - Exception including parameters :',err);
    }
}

function checkPartialDisplay()
{
    return true;
}

/******************************************************************************
 * Extract links from mail displayed in messagepane
 * @param element, partialExtract
 */

function getMailLinks(element, partialExtract)
{
    var urlArray=new Array();
    var urlElementsArray=new Array();
    var uniqueUrlArray;
    var uniqueUrlElementsArray;
    var tagsAttrList;
    var tagsAttrPartialList=PARAM.TAGSATTRPARTIALLIST_CONST;
    var mailLink="";
    var originalLink="";
    var mailLinkScheme="";

    tagsAttrList=PARAM.TAGSATTRLIST_CONST;

    // If the email is partially displayed, we do not include all tags
    if (checkPartialDisplay()===true || partialExtract===true)
    {
        tagsAttrList=tagsAttrPartialList;
        verifrom.console.log(2,'Message not fully displayed as sender is not approved');
    }
    verifrom.console.log(5,'search links in ',element);
    if (element)
    {
        for (var i=0;i<tagsAttrList.length;i++)
        {
            for (var j=1;j<tagsAttrList[i].length;j++)
            {
                var tagAttr=tagsAttrList[i][0]+"["+tagsAttrList[i][j]+"]";
                verifrom.console.log(4,'search for links '+tagAttr);

                // Search for each tag containing links to external content in the email body
                var linksInElement=element.querySelectorAll(tagAttr);
                for (var k=0;k<linksInElement.length;k++)
                {
                    mailLink=linksInElement[k].getAttribute(tagsAttrList[i][j]);
                    originalLink=mailLink;
                    // Extract the URL scheme for link checking when clicked
                    mailLinkScheme=mailLink.trim().match(/([^:]*):.{1,}$/);
                    if (mailLinkScheme)
                        mailLinkScheme=mailLinkScheme[1];
                    else mailLinkScheme="http";

                    if (mailLink && mailLinkScheme.match(/^https?/i))
                    {
                        mailLink=mailLink.replace(new RegExp(PARAM.ALL_REPLACE_CONST1, PARAM.ALL_REPLACE_CONST11),PARAM.ALL_REPLACE_CONST2).replace(new RegExp(PARAM.ALL_REPLACE_CONST3,PARAM.ALL_REPLACE_CONST33), PARAM.ALL_REPLACE_CONST4);
                        verifrom.console.log(5,'link raw                = ['+mailLink+']');
                        urlArray.push(mailLinkScheme+'://'+mailLink);
                        urlElementsArray.push({url:mailLinkScheme+'://'+mailLink, element:linksInElement[k]});
                        verifrom.console.log(4,'add Link ',mailLink);
                    }
                }
            }
        }
        urlArray.sort();
        urlElementsArray.sort(function (a,b) {
            if (a.url<b.url) return -1;
            else if (a.url>b.url) return 1;
            else return 0;
        });
        // remove duplicates
        uniqueUrlArray=new Array();
        uniqueUrlElementsArray=new Array();
        if (urlArray.length>0)
        {
            uniqueUrlArray[0]=urlArray[0];
            uniqueUrlElementsArray[0]=[];
            uniqueUrlElementsArray[0][0]=urlElementsArray[0].element;
            for (var i=1;i<urlArray.length;i++)
            {
                if (urlArray[i]!==uniqueUrlArray[uniqueUrlArray.length-1])
                {
                    uniqueUrlArray.push(urlArray[i]);
                    if (uniqueUrlElementsArray[i]===undefined) uniqueUrlElementsArray[uniqueUrlArray.length-1]=[];
                }
                uniqueUrlElementsArray[uniqueUrlArray.length-1].push(urlElementsArray[i].element);
            }
        }
    }
    return {urlArray:uniqueUrlArray, urlElementsArray:uniqueUrlElementsArray};
}

function alertOnPhishingSuspect(emailDOMElement, linksToAlert, elementsToAlert, linksHash, win)
{
    verifrom.console.log(2,'alertOnPhishingSuspect - PHISHING detected');
    try {
        var style=emailDOMElement.ownerDocument.createElement("style");
        style.innerHTML='[signalspam-tip] {\
        position: relative;\
        cursor: no-drop;\
        border-bottom: 2px dotted #BE0044;\
        z-index: 2147483647;\
        }\
        \
        [signalspam-tip]:before {\
            content: "⬅⚠︎";\
            position: absolute;\
            top: 5px;\
            left: 101%;\
            font-size: 1em;\
            color: #BE0044;\
            z-index: 2147483647;\
        }\
        ';
        emailDOMElement.appendChild(style);

        /*var trash_div = emailDOMElement.ownerDocument.createElement('div');
        emailDOMElement.appendChild(trash_div);
        emailDOMElement.removeChild(trash_div);*/
        for (var i=0;i<elementsToAlert.length;i++)
        {
            if (elementsToAlert[i])
            {
                if (elementsToAlert[i].length)
                    for (var j=0;j<elementsToAlert[i].length;j++)
                        if (elementsToAlert[i][j].setAttribute)
                            elementsToAlert[i][j].setAttribute(verifrom.appInfo.extensionName+'-tip','warning');
                else if (elementsToAlert[i].setAttribute)
                        elementsToAlert[i].setAttribute(verifrom.appInfo.extensionName+'-tip','warning');
            }
        }
        showNotification(win);
        lastPhishDetected={emailDOMElement:emailDOMElement, linksToAlert:linksToAlert, elementsToAlert:elementsToAlert, linksHash:linksHash};
        verifromSafeBrowsing.postMessage({'event':'PHISHING_EMAIL_SIDEBAR','eventDetail':extensionConfig.appInfo.environment, 'links':linksToAlert}, {channel: "PhishingDetection"});
    } catch(e) {
        verifrom.console.error(2,'Exception displaying phishing alert',e);
    }
}


var lastCheckId;

/**************************************************
 * startMailCheck
 * @param emailDOMElement
 */
function startMailCheck(emailDOMElement, win)
{
    var phishingAlert=false;
    var linksToAlert=[];
    var elementsToAlert=[];
    var linksHash=[];


    var id = lastCheckId = Date.now();

    // function will be called if an email is displayed (caller : checkMailIsDisplayed)
    // get clicable links
    verifrom.console.log(3,'startMailCheck - get links');
    var mailLinks=getMailLinks(emailDOMElement, true);

    verifrom.console.log(3,'got links');
    checkHostPathCombination(mailLinks.urlArray, id,
        function onSuspect(message){
            if (message.id < lastCheckId)
                return;
            phishingAlert=true;
            for (var k=0;k<message.suspects.length;k++)
            {
                i=message.suspects[k].index;
                if (mailLinks.urlArray[i])
                    linksToAlert.push(mailLinks.urlArray[i]);
                if (mailLinks.urlElementsArray[i])
                    elementsToAlert.push(mailLinks.urlElementsArray[i]);
                if (message.suspects[k].hash)
                    linksHash.push(message.suspects[k].hash);
                verifrom.console.log(4,"URL : "+mailLinks.urlArray[i]+" phishing");
            }
            mailLinks=null;
            alertOnPhishingSuspect(emailDOMElement, linksToAlert, elementsToAlert, linksHash, win);
        }
    );
}

function checkHostPathCombination(mailLinks, id, onSuspectCallback)
{
    verifrom.console.log(3,'checkHostPathCombination');
    verifromSafeBrowsing.addListener("checkHostPathCombination", function(message) {
       if (message.phishingAlert===true)
       {
           verifrom.console.log(2,'checkHostPathCombination - suspect email');
           onSuspectCallback(message);
       } else mailLinks=null;
    });
    verifrom.console.log(3,'checkHostPathCombination - post message to VSB worker');
    verifromSafeBrowsing.postMessage({mailLinks:mailLinks,id:id},{"channel":"checkHostPathCombination"});
}

function markAsSpam(selectedMessage, messageFolder, callback) {
    try {
        if (typeof selectedMessage.setStringProperty === 'function' && typeof selectedMessage.folder !== 'undefined') {

            //var aMsgHdr=selectedMessage.folder.msgDatabase.GetMsgHdrForKey(selectedMessage.messageKey);

            var prefs = Components.classes["@mozilla.org/preferences-service;1"]
                .getService(Components.interfaces.nsIPrefService)
                .getBranch("");

            var aJunkMsgHdrs = Components.classes["@mozilla.org/array;1"]
                .createInstance(Components.interfaces.nsIMutableArray);
            /*var aGoodMsgHdrs = Components.classes["@mozilla.org/array;1"]
             .createInstance(Components.interfaces.nsIMutableArray);*/
            aJunkMsgHdrs.appendElement(selectedMessage,false);

            try {
                var markAsReadOnSpam=prefs.getBoolPref("mail.spam.markAsReadOnSpam");
                if (markAsReadOnSpam===true) {
                    selectedMessage.markRead(true);
                    selectedMessage.folder.markMessagesRead(aJunkMsgHdrs, true);
                    //selectedMessage.folder.msgDatabase.MarkRead(selectedMessage.messageKey,true,null);
                    //selectedMessage.folder.msgDatabase.MarkHdrRead (selectedMessage, true, null);
                    //selectedMessage.folder.msgDatabase.Commit(Components.interfaces.nsMsgDBCommitType.kSessionCommit);
                }

                var nsIJunkMailPlugin = Components.interfaces.nsIJunkMailPlugin;
                if (nsIJunkMailPlugin && typeof nsIJunkMailPlugin.IS_SPAM_SCORE !== 'undefined' && selectedMessage.folder && selectedMessage.folder.msgDatabase) {
                    selectedMessage.setStringProperty("junkscore", nsIJunkMailPlugin.IS_SPAM_SCORE);
                    selectedMessage.setStringProperty('junkpercent', '100');
                    selectedMessage.setStringProperty("junkscoreorigin", "user");
                    //selectedMessage.folder.msgDatabase.setStringPropertyByHdr(selectedMessage,"junkscore", nsIJunkMailPlugin.IS_SPAM_SCORE);
                    //selectedMessage.folder.msgDatabase.setStringPropertyByHdr(selectedMessage,'junkpercent', '100');
                    //selectedMessage.folder.msgDatabase.setStringPropertyByHdr(selectedMessage,"junkscoreorigin", "user");
                    selectedMessage.folder.setJunkScoreForMessages(aJunkMsgHdrs,nsIJunkMailPlugin.IS_SPAM_SCORE);
                    //selectedMessage.folder.msgDatabase.Commit(Components.interfaces.nsMsgDBCommitType.kSessionCommit);
                }
                selectedMessage.folder.msgDatabase.updateHdrInCache(selectedMessage.folder.URI,selectedMessage,false);
            } catch(e) {
                verifrom.console.error(0,'markAsSpam - Exception trying to apply new properties',e);
            }

            if (prefs.getBoolPref("extensions.signalspam.movereport")===true) {
                var manualMark=prefs.getBoolPref("mail.spam.manualMark");
                var manualMarkMode=prefs.getIntPref("mail.spam.manualMarkMode");
                if (manualMark===true) {
                    var destFolder;
                    //Components.utils.import("resource:///modules/mailServices.js");
                    var copyService = Components.classes["@mozilla.org/messenger/messagecopyservice;1"].getService(Components.interfaces.nsIMsgCopyService);

                    if (manualMarkMode!==1) // Move to Spam folder
                    {
                        destFolder = findJunkFolder(selectedMessage.folder.rootFolder);
                        if (!destFolder) // POP3 probably...
                            destFolder = findTrashFolder(selectedMessage.folder.rootFolder); // move to Trash
                    } else if (manualMarkMode===1) {
                        destFolder = findTrashFolder(selectedMessage.folder.rootFolder);
                    }
                    if (destFolder && destFolder !== selectedMessage.folder) {
                        verifrom.console.log(4, 'markAsSpam - move message into junk folder');
                        /*var listen = {
                            OnStartCopy: function () {
                                verifrom.console.log(4,"OnStartCopy",arguments)
                            },
                            OnStopCopy: function () {
                                verifrom.console.log(4,"OnStopCopy",arguments);
                            },
                            OnProgress: function () {
                                verifrom.console.log(4,"OnProgress",arguments)
                            }
                        };*/

                        copyService.CopyMessages(selectedMessage.folder, aJunkMsgHdrs, destFolder, true, null, msgWindow, true);
                    }
                    else verifrom.console.log(2, 'markAsSpam - destFolder not found or the same as current message folder');
                    copyService = null;
                    destFolder = null;
                }
            }
            prefs=null;
            aJunkMsgHdrs=null;

            /*var messageClassifier=new MessageClassifier(selectedMessage.folder,1);
             var aSpamSettings=selectedMessage.folder.server.spamSettings;
             messageClassifier.analyzeMessage(selectedMessage, aSpamSettings);*/

            //performActionsOnJunkMsgs(selectedMessage.folder, aJunkMsgHdrs, aGoodMsgHdrs);*/
        } else {
            verifrom.console.log(4, 'markAsSpam - selectedMessage is not a message object => no action');
        }
    }
    catch (e){
        verifrom.console.error(0,'markAsSpam - Exception',e);
    } finally {
        callback();
    }
}

function channelObject(folder, selectedMessage)
{
    this.messagesSrc=new Object();
    this.folder=folder;
    this.selectedMessage=selectedMessage;
    this.onDataAvailable=function(request, context, inputStream, offset, count) {
        if (!context)
            return 0;
        var inStream = Components.classes["@mozilla.org/scriptableinputstream;1"].
        createInstance(Components.interfaces.nsIScriptableInputStream);
        inStream.init(inputStream);
        context.QueryInterface(Components.interfaces.nsISupportsString);
        this.messagesSrc[context.data] += inStream.read(count);
    }
    this.onStartRequest=function(request, context) {
        if (!context)
            return 0;
        context.QueryInterface(Components.interfaces.nsISupportsString);
        this.messagesSrc[context.data] = "";
    }
    this.onStopRequest=function(request, context, statusCode) {
        if (!context)
            return 0;
        if (statusCode != Components.results.NS_OK) {
            verifrom.console.error(1,"Message content retrieving error",statusCode);
            return 0;
        }
        context.QueryInterface(Components.interfaces.nsISupportsString);
        markAsSpam(selectedMessage,this.folder,function(){
            sendToServer(this.messagesSrc[context.data], this.folder, this.selectedMessage);
        }.bind(this));
    }
}

function reportEmail(cause)
{
    verifrom.console.log(4,'reportEmail',gFolderDisplay);

    var prefs = Components.classes["@mozilla.org/preferences-service;1"]
        .getService(Components.interfaces.nsIPrefService)
        .getBranch("");

    if (prefs.getBoolPref("extensions.signalspam.userauthentified")!==true)
    {
        verifrom.console.log(2,'do_cmd_signalspamPreferences', arguments);
        openPreferences("error");
        return;
    }

    try {
        var vSelectedMessages = gFolderDisplay.selectedMessageUris;
        if (vSelectedMessages.length == 0)
            return;

        var oSelectedMessages = gFolderDisplay.selectedMessages;

        //Components.interfaces.nsMsgFolderFlags.Junk & gFolderDisplay.displayedFolder.flags
        var progressBar=document.querySelector("#signalspam-statusbar");
        progressBar.hidden=false;

        const IOServiceContractID = "@mozilla.org/network/io-service;1";
        const nsIIOService = Components.interfaces.nsIIOService;
        const mailSessionContractID = "@mozilla.org/messenger/services/session;1";
        const nsIMsgMailSession = Components.interfaces.nsIMsgMailSession;
        var mailSession = Components.classes[mailSessionContractID].getService(nsIMsgMailSession);
        var ioService = Components.classes[IOServiceContractID].getService(nsIIOService);

        //vSelectedMessages.forEach(function(selectedMessage) {
        for (var i=0;i<vSelectedMessages.length;i++)
        {
            try {
                var selectedMessageUri=vSelectedMessages[i];
                var selectedMessage=oSelectedMessages[i];
                var folder=(Components.interfaces.nsMsgFolderFlags.Junk & selectedMessage.folder.flags) ? 1 : 2;
                var vUrl = mailSession.ConvertMsgURIToMsgURL(selectedMessageUri, msgWindow);
                var realUri = ioService.newURI(vUrl, null, null);
                var channel = ioService.newChannelFromURI(realUri); //,null,null,null);
                var nsStr = Components.classes["@mozilla.org/supports-string;1"].createInstance(Components.interfaces.nsISupportsString);
                nsStr.data = selectedMessage;
                var channelInstance=new channelObject(folder, (prefs.getBoolPref("extensions.signalspam.movereport")===true && cause!=='hdrJunkButton') ? selectedMessage : {messageKey:selectedMessage.messageKey});
                channel.asyncOpen(channelInstance, nsStr);
            } catch(e)
            {
                verifrom.console.error(0,'Exception 1 getting emails',e);
                continue;
            }
        }
    } catch(e)
    {
        progressBar.hidden=true;
        verifrom.console.error(0,'Exception 2 getting emails',e);
    }
}

function sendToServer(data, folder, messageObject)
{
    var progressBar=document.querySelector("#signalspam-statusbar");
    progressBar.hidden=false;

    try {
        var prefs = Components.classes["@mozilla.org/preferences-service;1"]
            .getService(Components.interfaces.nsIPrefService)
            .getBranch("");

        var preferences=document.querySelectorAll('preference');

        verifrom.console.log(4,'sendToServer');
        if (messageObject)
        {
            verifrom.console.log(4,'Message to report and move : ('+messageObject.messageKey+') '+messageObject.subject+' move ?'+(folder!==1?true:false));

        }
        var password;
        var userid=prefs.getCharPref("extensions.signalspam.userid");
        var loginInfo=verifrom.credentials.get(userid);
        var password = loginInfo ? loginInfo.password : prefs.getCharPref("extensions.signalspam.password");

        verifromSafeBrowsing.addListener("PayloadPosted"+messageObject.messageKey, handleReportResponse.bind((folder!==1 ? messageObject : null)));
        verifromSafeBrowsing.postMessage({'action':'signalEmail', key:messageObject.messageKey, email:data, folder:folder, username:userid, password:password}, {channel:"postSignal"});
    } catch(e)
    {
        progressBar.hidden=true;
        verifrom.console.error(0,'Exception posting emails',e);
    }
}

function findJunkFolder(rootFolder)
{
    return rootFolder.getFolderWithFlags(Components.interfaces.nsMsgFolderFlags.Junk);
}

function findTrashFolder(rootFolder)
{
    return rootFolder.getFolderWithFlags(Components.interfaces.nsMsgFolderFlags.Trash);
}

function handleReportResponse(message)
{
    var progressBar=document.querySelector("#signalspam-statusbar");
    progressBar.hidden=true;

    verifromSafeBrowsing.removeListener("PayloadPosted"+message.key)
    switch (message.response)
    {
        case 200:
        case 201:
        case 202:
            verifrom.console.log(2,'handleReportResponse - report posted to server');
            /*if (this && this.folder && this.folder.rootFolder)
            {
                verifrom.console.log(4,'handleReportResponse - will move message ('+this.messageKey+') '+this.subject);
                Components.utils.import("resource:///modules/mailServices.js");

                var msgArray = Components.classes["@mozilla.org/array;1"].createInstance(Components.interfaces.nsIMutableArray);
                msgArray.appendElement(this, false);

                //var copyService = MailServices.copy; // nsIMsgCopyService
                var copyService=Components.classes["@mozilla.org/messenger/messagecopyservice;1"].getService(Components.interfaces.nsIMsgCopyService);
                var destFolder = findJunkFolder(this.folder.rootFolder);
                if (destFolder){
                    verifrom.console.log(4,'handleReportResponse - move message into junk folder');
                    copyService.CopyMessages(this.folder, msgArray, destFolder, true, null, null, true);
                }
                else verifrom.console.log(2,'handleReportResponse - did not find junk folder to move the message into');
                msg=null;
                copyService=null;
                destFolder=null;
            } else verifrom.console.log(4,'handleReportResponse - no message to move',this);*/
            /*
            Before 2.1.0
            var prefs = Components.classes["@mozilla.org/preferences-service;1"]
                .getService(Components.interfaces.nsIPrefService)
                .getBranch("");
            if (this && this.folder && prefs.getBoolPref("extensions.signalspam.movereport")===true)
                goDoCommand('cmd_markAsJunk');*/

            break;
        case 401:
        case 302:
            verifrom.console.log(2,'handleReportResponse - report was not posted to server', message);
            openPreferences("error");
        default:
            break;
        case 'exception':
            verifrom.console.error(1,'handleReportResponse - Exception encountered while posting report', message);
            break;
    }
}

function reportFalsePositive(command)
{
    verifrom.console.log(1,'reportFalsePositive - command',command);
    hideNotifications();
    if (!lastPhishDetected)
    {
        verifrom.console.log(1,'reportFalsePositive - lastPhishDetected is null');
        return;
    }
    var elementsToAlert=lastPhishDetected.elementsToAlert;
    for (var i=0;i<elementsToAlert.length;i++)
    {
        if (elementsToAlert[i])
        {
            if (elementsToAlert[i].length)
                for (var j=0;j<elementsToAlert[i].length;j++)
                    if (elementsToAlert[i][j].removeAttribute)
                        elementsToAlert[i][j].removeAttribute(verifrom.appInfo.extensionName+'-tip','warning');
                    else if (elementsToAlert[i].removeAttribute)
                        elementsToAlert[i].removeAttribute(verifrom.appInfo.extensionName+'-tip','warning');
        }
    }
    // send falsePositiveReport message to safe browsing worker
    verifromSafeBrowsing.postMessage({'phishingLinks':lastPhishDetected.linksToAlert,'phishingHashes':lastPhishDetected.linksHash},{"channel":"falsePositiveReport"});
}

/******************************************************************************
 * Event handler when a message is loaded in messagepane
 * @param event
 */
function onMessageLoadHandler(event)
{
    verifrom.console.log(2,'onMessageLoadHandler');
    var doc = event.originalTarget;  // doc is document that triggered "onload" event
    startMailCheck(doc.body, this);
    event.originalTarget.defaultView.addEventListener("unload", onMessageUnloadHandler, true);
}

/******************************************************************************
 * Event handler when a message is unloaded from messagepane
 * @param event
 */
function onMessageUnloadHandler(event)
{
    event.originalTarget.defaultView.removeEventListener("unload", onMessageUnloadHandler, true);
    verifrom.console.log(4,'onMessageUnloadHandler',event);
    hideNotifications(this);
    lastPhishDetected=null;
}

function emailInspector(doc, win, handler)
{
    this.doc=doc || document;
    this.win=win || window;
    this.handler=handler || onMessageLoadHandler;
    this.listener1=false;
    this.listener2=false;

    this.start=function() {
        verifrom.console.log(4,'emailInspector - start',this);
        var appcontent = this.doc.getElementById("appcontent"); // browser app content
        if (appcontent && !this.listener1) {
            appcontent.addEventListener("OMContentLoaded", this.handler, true);
            this.listener1=true;
        }
        var messagepane = this.doc.getElementById("messagepane"); // thunderbird message pane
        if(messagepane && !this.listener2) {
            messagepane.addEventListener("load", this.handler, true);
            this.listener2=true;
        }
    };
    this.stop=function() {
        verifrom.console.log(4,'emailInspector - stop',this);
        var appcontent = this.doc.getElementById("appcontent"); // browser app content
        if (appcontent && this.listener1) {
            appcontent.removeEventListener("OMContentLoaded", this.handler, true);
            this.listener1=false;
        }
        var messagepane = this.doc.getElementById("messagepane"); // thunderbird message pane
        if(messagepane && this.listener2) {
            messagepane.removeEventListener("load", this.handler, true);
            this.listener2=false;
        }
        this.doc=null; this.win=null; this.handler=null;
    }
}


/*function startEmailInspection(doc, win)
{
    var appcontent = (doc || document).getElementById("appcontent"); // browser app content
    if (appcontent) {
        appcontent.addEventListener("OMContentLoaded", onMessageLoadHandler, true);
    }
    var messagepane = (doc || document).getElementById("messagepane"); // thunderbird message pane
    if(messagepane) {
        messagepane.addEventListener("load", onMessageLoadHandler.bind(win), true);
    }
}

function stopEmailInspection(doc, win)
{
    var appcontent = (doc || document).getElementById("appcontent"); // browser app content
    if (appcontent) {
        appcontent.removeEventListener("OMContentLoaded", onMessageLoadHandler);
    }
    var messagepane = (doc || document).getElementById("messagepane"); // thunderbird message pane
    if(messagepane) {
        messagepane.removeEventListener("load", onMessageLoadHandler.bind(win));
    }
}*/

function showNotification(win)
{
    notificationBox=(win.document || document).querySelector('#msgNotificationBar');
    phishingNotification.hidden=false;
    if (notificationBox)
        notificationBox.appendChild(phishingNotification);
    else verifrom.console.error(1,'showNotification - notification box not found',notificationBox);
}

function hideNotifications(win)
{
    notificationBox=(win || window).document.querySelector('#msgNotificationBar');
    phishingNotification.hidden=true;
    if (notificationBox)
        notificationBox.removeAllNotifications();
    else verifrom.console.error(1,'hideNotifications - notification box not found',notificationBox);
}

function prepare(doc)
{
    if (phishingNotification) return;
    phishingNotification=(doc || document).querySelector('#signalspam-alert-notification').cloneNode(true);
}