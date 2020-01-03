/*jslint browser: true, unparam: true */
/*global Components */
/*global log */
/*global MailUtils */
/*global CheckForMessageIdInFolder */

function Resubmit() {
    "use strict";

    var Cc = Components.classes,
        Ci = Components.interfaces,
        self = this,
        prefs = Cc["@mozilla.org/preferences-service;1"]
            .getService(Ci.nsIPrefService)
            .getBranch("extensions.resubmit."),
        composeEnabled,         // extensions.resubmit.compose.enabled
        composeMaxWindows,      // extensions.resubmit.compose.max_windows
        sendNowEnabled,         // extensions.resubmit.sendnow.enabled
        sendNowMaxMessages,     // extensions.resubmit.sendnow.max_messages
        sendLaterEnabled,       // extensions.resubmit.sendlater.enabled
        sendLaterMaxMessages,   // extensions.resubmit.sendlater.max_messages
        MimeMsg = {};

    self.initialized = false;
    self.name = Resubmit;

    self.Modes = {
        SendNow:    0,
        SendLater:  1,
        Compose:    2
    };

    MimeMsg = ChromeUtils.import("resource:///modules/gloda/mimemsg.js");
    ChromeUtils.import("resource:///modules/MailUtils.jsm");

    (function readPrefs() {

        self.readPrefs = readPrefs;

        try { // composeEnabled
            composeEnabled = prefs.getBoolPref("compose.enabled");
            log("debug: readPrefs(): retrieved preference (extensions.resubmit.compose.enabled)", 4);
        } catch (e) {
            log("error: readPrefs(): failed to retrieve preference (extensions.resubmit.compose.enabled): " + e, 1);
            composeEnabled = true;
        }
        log("debug: assigned composeEnabled = " + composeEnabled, 7);
        try { // composeMaxWindows
            composeMaxWindows = prefs.getIntPref("compose.max_windows");
            log("debug: readPrefs(): retrieved preference (extensions.resubmit.compose.max_windows)", 4);
        } catch (e) {
            log("error: readPrefs(): failed to retrieve preference (extensions.resubmit.compose.max_windows): " + e, 1);
            composeMaxWindows = "5";
        }
        log("debug: assigned composeMaxWindows = " + composeMaxWindows, 7);
        try { // sendNowEnabled
            sendNowEnabled = prefs.getBoolPref("sendnow.enabled");
            log("debug: readPrefs(): retrieved preference (extensions.resubmit.sendnow.enabled)", 4);
        } catch (e) {
            log("error: readPrefs(): failed to retrieve preference (extensions.resubmit.sendnow.enabled): " + e, 1);
            sendNowEnabled = true;
        }
        log("debug: assigned sendNowEnabled = " + sendNowEnabled, 7);
        try { // sendNowMaxMessages
            sendNowMaxMessages = prefs.getIntPref("sendnow.max_messages");
            log("debug: readPrefs(): retrieved preference (extensions.resubmit.sendnow.max_messages)", 4);
        } catch (e) {
            log("error: readPrefs(): failed to retrieve preference (extensions.resubmit.sendnow.max_messages): " + e, 1);
            sendNowMaxMessages = "1";
        }
        log("debug: assigned sendNowMaxMessages = " + sendNowMaxMessages, 7);
        try { // sendLaterEnabled
            sendLaterEnabled = prefs.getBoolPref("sendlater.enabled");
            log("debug: readPrefs(): retrieved preference (extensions.resubmit.sendlater.enabled)", 4);
        } catch (e) {
            log("error: readPrefs(): failed to retrieve preference (extensions.resubmit.sendlater.enabled): " + e, 1);
            sendLaterEnabled = true;
        }
        log("debug: assigned sendLaterEnabled = " + sendLaterEnabled, 7);
        try { // sendLaterMaxMessages
            sendLaterMaxMessages = prefs.getIntPref("sendlater.max_messages");
            log("debug: readPrefs(): retrieved preference (extensions.resubmit.sendlater.max_messages)", 4);
        } catch (e) {
            log("error: readPrefs(): failed to retrieve preference (extensions.resubmit.sendlater.max_messages): " + e, 1);
            sendLaterMaxMessages = "1";
        }
        log("debug: readPrefs(): asigned sendLaterMaxMessages = " + sendLaterMaxMessages, 7);
    }());


    function ProgressListener(aBatchWin, aCompletionFun) {
        log("debug: ProgressListener(): called with (" + aBatchWin + ", "
            + aCompletionFun + ")", 5);
        this.batchWin = aBatchWin;
        this.notifyComplete = function () { aCompletionFun(); };
        log("debug: ProgressListener(): initialized", 7);
    }

    ProgressListener.prototype = {
        onStateChange: function (aWebProgress, aRequest, aStateFlags, aStatus) {
            log("debug: ProgressListener.onStateChange(): called with ("
                + aWebProgress + ", " + aRequest + ", "  + aStateFlags + ", "
                + aStatus + ")", 5);
        },
        onProgressChange: function (aWebProgress, aRequest, aCurSelfProgress,
                                    aMaxSelfProgress, aCurTotalProgress,
                                    aMaxTotalProgress) {
            log("debug: ProgressListener.onProgress(): called with ("
                + aWebProgress + ", " + aRequest + ", "  + aCurSelfProgress
                + ", " + aMaxSelfProgress + ", "  + aCurTotalProgress + ", "
                + aMaxTotalProgress + ")", 5);
            log("debug: ProgressListener.onProgress(): aMaxTotalProgress == " + aMaxTotalProgress, 7);
            if (aMaxTotalProgress === -1) {
                log("debug: ProgressListener.onProgress(): if (aMaxTotalProgress == -1) { ...", 6);
                this.batchWin.setProgress(100);
                log("debug: ProgressListener.onProgress(): invoking this.notifyComplete()", 6);
                this.notifyComplete();
                log("debug: ProgressListener.onProgress(): returned from this.notifyComplete()", 7);
            } else {
                log("debug: ProgressListener.onProgress(): if (aMaxTotalProgress == -1) { ... } else { ... ", 6);
                if (aMaxSelfProgress > 0) {
                    this.batchWin.setProgress((100 * aCurSelfProgress) / aMaxSelfProgress);
                }
            }
        },
        onLocationChange: function (aWebProgress, aRequest, aLocation) {
            log("debug: ProgressListener.onLocationChange(): called with ("
                + aWebProgress + ", " + aRequest + ", "  + aLocation + ")", 5);
        },
        onStatusChange: function (aWebProgress, aRequest, aStatus, aMessage) {
            log("debug: ProgressListener.onStatusChange(): called with ("
                + aWebProgress + ", " + aRequest + ", "  + aStatus + ", "
                + aMessage + ")", 5);
            this.batchWin.setStatus(aMessage);
        },
        onSecurityChange: function (aWebProgress, aRequest, aState) {
            log("debug: ProgressListener.onSecurityChange(): called with ("
                + aWebProgress + ", " + aRequest + ", "  + aState + ")", 5);
        }
    };

    function initMsgCompFields(aFields, aTplHdr, aTplMsg, aAttachment) {
        var mimeConverter,
            tplHdrs,
            attachments,
            i,
            key,
            tplHdrMap;

        log("debug: initMsgCompFields(): called with (" + aFields + ", "
            + aTplHdr + ", "  + aTplMsg + ", " + aAttachment + ")", 5);

        mimeConverter = Cc["@mozilla.org/messenger/mimeconverter;1"]
            .createInstance(Ci.nsIMimeConverter);
        tplHdrs = aTplMsg.headers;
        attachments = aTplMsg.allUserAttachments || aTplMsg.allAttachments;
        tplHdrMap = {
            'from'                  : 'from',
            'reply-to'              : 'replyTo',
            'to'                    : 'to',
            'cc'                    : 'cc',
            'bcc'                   : 'bcc',
            'fcc'                   : 'fcc',
            'fcc2'                  : 'fcc2',
            'date'                  : undefined,
            'user-agent'            : undefined,
            'mime-version'          : undefined,
            'newsgroups'            : 'newsgroups',
          // aFields.newshost = ???;
          // aFields.newspostUrl = ???;
          // aFields.followupTo = ???;

            'subject'               : 'subject',

            'organization'          : 'organization',
            'references'            : 'references',
            'priority'              : 'priority',
            'message-id'            : 'messageId'
          // aFields.characterSet = ???;

          // aFields.templateName = ???;
          // aFields.draftId = ???;

          // aFields.returnReceipt = ???;
          // aFields.receiptHeaderType = ???;
          // aFields.DSN = ???;
          // aFields.attachVCard = ???;
          // aFields.forcePlainText = ???;
          // aFields.useMultipartAlternative = ???;
          // aFields.bodyIsAsciiOnly = ???;
          // aFields.forceMsgEncoding = ???;

          // aFields.otherRandomHeaders = ???;

          // aFields.senderReply = ???;
          // aFields.allReply = ???;
          // aFields.listReply = ???;

          // aFields.body = ???;
        };

        for (i = 0; i < attachments.length; i += 1) {
            aFields.addAttachment(attachments[i]);
        }
        if (aAttachment !== null) {
            aFields.addAttachment(aAttachment);
        }
        //aFields.templateName     = aTplMsg.partName;

        for (key in tplHdrs) {
            if (tplHdrs.hasOwnProperty(key)) {
                if (tplHdrMap[key] !== undefined) {
                    aFields[tplHdrMap[key]] = mimeConverter.decodeMimeHeader(
                        tplHdrs[key],
                        aFields.defaultCharacterSet,
                        false,
                        false
                    );
                }
            }
        }

        // aFields.from = ???;
        // aFields.replyTo = ;
        // aFields.to = ???;
        // aFields.cc = ???;
        // aFields.bcc = ???;

        // aFields.fcc = ???;
        // aFields.fcc2 = ???;

        // aFields.newsgroups = ???;
        // aFields.newshost = ???;
        // aFields.newspostUrl = ???;
        // aFields.followupTo = ???;

        // aFields.subject = ???;

        // aFields.organization = ???;
        // aFields.references = ???;
        // aFields.priority = ???;
        // aFields.messageId = ???;
        // aFields.characterSet = ???;
        aFields.characterSet = 'utf-8';

        // aFields.templateName = ???;aTplHdr.folder.generateMessageURI(aTplHdr.messageKey);
        // aFields.draftId = ???;

        // aFields.returnReceipt = ???;
        // aFields.receiptHeaderType = ???;
        //aFields.DSN = true;
        aFields.attachVCard = false;
        aFields.forcePlainText = true;
        aFields.useMultipartAlternative = true;
        aFields.bodyIsAsciiOnly = false;
        aFields.forceMsgEncoding = true;
        //aFields.needToCheckCharset = ???;

        // aFields.otherRandomHeaders = ???;

        // aFields.senderReply = ???;
        // aFields.allReply = ???;
        // aFields.listReply = ???;

        aFields.body = aTplMsg.coerceBodyToPlaintext(aTplHdr.folder);
        log("debug: initMsgCompFields(): aFields.body='''\n" + aFields.body + "\n'''", 6);

        return aFields;
    }

    function initMsgComposeParams(aParams, aTplHdr) {
        var folder,
            identity;

        log("debug: initMsgComposeParams(): called with (" + aParams + ", "
            + aTplHdr + ")", 5);

        folder = aTplHdr.folder;
        identity = folder.customIdentity || MailUtils.getIdentityForServer(folder.server);

        aParams.composeFields    = Cc["@mozilla.org/messengercompose/composefields;1"]
                                    .createInstance(Ci.nsIMsgCompFields);
        aParams.type             = Ci.nsIMsgCompType.Template;
        //aParams.format           = Ci.nsIMsgCompFormat.Default;
        aParams.format           = Ci.nsIMsgCompFormat.PlainText;
        aParams.originalMsgURI   = aTplHdr.folder.generateMessageURI(aTplHdr.messageKey);
        aParams.identity         = identity;
        aParams.origMsgHdr       = aTplHdr;
    }

    function parseTemplateUrl(aTplUrl) {
        var uriParts,
            tplFolderUri,
            tplUriTail,
            tplUriArgs,
            info = {},
            i,
            parts;

        log("debug: parseTemplateUrl(): called with (" + aTplUrl + ")", 5);

        uriParts = aTplUrl.split("?", 2);
        tplFolderUri = uriParts[0];
        tplUriTail = uriParts[1];
        tplUriArgs = tplUriTail.split("&");

        info.folderURI = tplFolderUri;
        for (i = 0; i < tplUriArgs.length; i += 1) {
            parts =  tplUriArgs[i].split("=");
            info[parts[0]] = parts[1];
        }
        return info;
    }

    function Submitter(aCompletionFun, aBatchWin, aDeliverMode) {
        var me = this;

        log("debug: Submitter(): called with (" + aCompletionFun + ", "
            + aBatchWin + ", " + aDeliverMode + ")", 5);

        log("debug: Submitter(): initializing", 7);
        this.notifyComplete = function () { aCompletionFun(); };
        this.sendMsgsInProgress = 0;
        this.batchWin = aBatchWin;
        this.deliverMode = aDeliverMode;
        log("debug: Submitter(): creating ProgressListener", 6);
        this.progressListener = new ProgressListener(this.batchWin, function () { me.onMsgSent(); });
        log("debug: Submitter(): initialized", 7);
    }

    Submitter.prototype = {
        onMsgSent: function () {
            this.sendMsgsInProgress -= 1;
            log("debug: Submitter.onMsgSent(): invoking this.notifyComplete()", 6);
            this.notifyComplete();
            log("debug: Submitter.onMsgSent(): returned from this.notifyComplete()", 7);
        },
        sendMsg: function (aMsgCompose, aDeliverMode, aIdentity, aAccount, aWindow, aProgress) {
            var me = this;
            log("debug: Submitter.sendMsg(): called with (" + aMsgCompose
                 + ", " + aDeliverMode + ", " + aIdentity + ", " + aAccount
                 + ", " + aWindow + ", " + aProgress + ")", 5);
            log("debug: Submitter.sendMsg(): this.sendMsgsInProgress == " + this.sendMsgsInProgress, 7);
            // Prevent multiple simultaneous calls to aMsgCompose.SendMsg().
            if (this.sendMsgsInProgress < 1) {
                this.sendMsgsInProgress += 1;
                log("debug: Submitter.sendMsg(): invoking aMsgCompose.SendMsg()", 6);
                aMsgCompose.SendMsg(aDeliverMode, aIdentity, aAccount, aWindow, aProgress);
                log("debug: Submitter.sendMsg(): returned from aMsgCompose.SendMsg()", 7);
            } else {
                log("debug: Submitter.sendMsg(): invoking window.setTimeout( { me.sendMsg(...); })", 6);
                window.setTimeout(function () {
                    me.sendMsg(aMsgCompose, aDeliverMode, aIdentity, aAccount, aWindow, aProgress);
                }, 50);
                log("debug: Submitter.sendMsg(): returned from window.setTimeout( { me.sendMsg(...); })", 7);
            }
        },
        apply: function (aTplHdr, aTplMsg, aAttachment) {
            var msgCompose = Cc["@mozilla.org/messengercompose/compose;1"]
                    .createInstance(Ci.nsIMsgCompose),
                msgComposeParams = Cc["@mozilla.org/messengercompose/composeparams;1"]
                    .createInstance(Ci.nsIMsgComposeParams),
                progress = Cc["@mozilla.org/messenger/progress;1"]
                    .createInstance(Ci.nsIMsgProgress);

            progress.registerListener(this.progressListener);

            initMsgComposeParams(msgComposeParams, aTplHdr);
            msgCompose.initialize(msgComposeParams);
            initMsgCompFields(msgComposeParams.composeFields, aTplHdr, aTplMsg, aAttachment);
            this.sendMsg(msgCompose, this.deliverMode, msgComposeParams.identity, "", null, progress);
        }
    };

    function Composer(aCompletionFun, aBatchWin) {
        var me = this;
        log("debug: Composer(): called with (" + aCompletionFun + ", "
            + aBatchWin + ")", 5);
        log("debug: Composer(): initializing", 7);
        this.notifyComplete = function () { aCompletionFun(); };
        this.windowsOpened = 0;
        this.batchWin = aBatchWin;
        log("debug: Composer(): creating ProgressListener", 6);
        this.progressListener = new ProgressListener(this.batchWin, function () { me.onMsgComposed(); });
        log("debug: Composer(): initialized", 7);
    }

    Composer.prototype = {
        onMsgComposed: function () {
            this.windowsOpened -= 1;
            log("debug: Composer.onMsgComposed(): invoking this.notifyComplete()", 6);
            this.notifyComplete();
            log("debug: Composer.onMsgComposed(): returned from this.notifyComplete()", 7);
        },
        openComposeWindow: function (aService, aWindowURL, aParams) {
            var me = this,
                fun,
                url;
            if (this.windowsOpened < composeMaxWindows) {
                if (aWindowURL) {
                    url = aWindowURL;
                } else {
                    url = "chrome://messenger/content/messengercompose/messengercompose.xul";
                }
                this.windowsOpened += 1;
                window.openDialog(url, "_blank", "", aParams, function () { me.onMsgComposed(); });
            } else {
                window.setTimeout(function () {
                    me.openComposeWindow(aService, aWindowURL, aParams);
                }, 500);
            }
        },
        apply: function (aTplHdr, aTplMsg, aAttachment) {
            var msgComposeSvc = Cc["@mozilla.org/messengercompose;1"]
                    .getService(Ci.nsIMsgComposeService),
                msgComposeParams = Cc["@mozilla.org/messengercompose/composeparams;1"]
                    .createInstance(Ci.nsIMsgComposeParams);

            initMsgComposeParams(msgComposeParams, aTplHdr);
            initMsgCompFields(msgComposeParams.composeFields, aTplHdr, aTplMsg, aAttachment);
            this.openComposeWindow(msgComposeSvc, null, msgComposeParams);
        }
    };

    function Collector(aCompletionFun,aReattach) {
        log("debug: Collector(): called with (" + aCompletionFun + ", " + aReattach + ")", 5);
        log("debug: Collector(): initializing attributes", 6);
        this.notifyComplete = function () { aCompletionFun(); };
        this.attachments = [];
        this.reattach = aReattach;
        log("debug: Collector(): initialized", 6);
    }

    Collector.prototype = {
        apply: function (aMsgHdr, aMimeMsg) {
            var attachments = aMimeMsg.allUserAttachments || aMimeMsg.allAttachments,
                attachment,
                i;
            log("debug: Collector.apply(): attachments.length = " + attachments.length, 7);
            if(this.reattach) {
                for (i = 0; i < attachments.length; i += 1) {
                    attachment = attachments[i];
                    if (attachment.contentType === "message/rfc822") {
                        log("debug: Collector.apply(): adding attachment", 6);
                        this.attachments.push(attachment);
                    }
                }
            } else {
                log("debug: Collector.apply(): creating attachment from message", 6);
                attachment = Cc["@mozilla.org/messengercompose/attachment;1"]
                    .createInstance(Components.interfaces.nsIMsgAttachment);
                attachment.url = aMsgHdr.folder.getUriForMsg(aMsgHdr);
                attachment.name = aMsgHdr.subject + ".eml";
                log("debug: Collector.apply(): adding attachment", 6);
                this.attachments.push(attachment);
            }
            log("debug: Collector.apply(): invoking this.notifyComplete()", 6);
            this.notifyComplete();
            log("debug: Collector.apply(): returned from this.notifyComplete()", 7);
        }
    };

    /**
     * Usage: action = new FilterAction(...)
     */
    function FilterAction(aId, aName, aMode, aFlag, aReattach) {
        log("debug: FilterAction(): called with (" + aId + ", " + aName + ", "
            + aMode + ", " + aFlag + ", " + aReattach + ")", 5);
        log("debug: FilterAction(): initializing attributes", 6);
        this.id = aId;
        this.name = aName;
        this.mode = aMode;
        this.isAvailable = aFlag;
        this.reattach = aReattach;
        this.maxConcurrentTasks = 1;
        log("debug: FilterAction(): aMode == " + aMode, 7);
        log("debug: FilterAction(): aReattach == " + aReattach, 7);
        switch (aMode) {
        case self.Modes.SendNow:
            log("debug: FilterAction(): this.deliverMode = Ci.nsIMsgCompDeliverMode.Now", 6);
            this.deliverMode = Ci.nsIMsgCompDeliverMode.Now;
            log("debug: FilterAction(): selecting Submitter as a backend", 6);
            this.createSubmitter = function (aCompletionFun, aBatchWin) {
                return new Submitter(aCompletionFun, aBatchWin, this.deliverMode);
            };
            this.maxConcurrentTasks = sendNowMaxMessages;
            break;
        case self.Modes.SendLater:
            log("debug: FilterAction(): this.deliverMode = Ci.nsIMsgCompDeliverMode.Later", 6);
            this.deliverMode = Ci.nsIMsgCompDeliverMode.Later;
            log("debug: FilterAction(): selecting Submitter as a backend", 6);
            this.createSubmitter = function (aCompletionFun, aBatchWin) {
                return new Submitter(aCompletionFun, aBatchWin, this.deliverMode);
            };
            this.maxConcurrentTasks = sendLaterMaxMessages;
            break;
        case self.Modes.Compose:
            log("debug: FilterAction(): selecting Composer as a backend", 6);
            this.createSubmitter = function (aCompletionFun, aBatchWin) {
                return new Composer(aCompletionFun, aBatchWin);
            };
            this.maxConcurrentTasks = composeMaxWindows;
            break;
        default:
            log("error: FilterAction(): invalid value '" + aMode + "' for aMode argument", 1);
            throw "invalid value '" + aMode + "' for aMode argument";
        }
        log("debug: FilterAction(): this.maxConcurrentTasks == " + this.maxConcurrentTasks, 7);
        log("debug: FilterAction(): initialized", 6);
    }

    FilterAction.prototype = {
        isAsync: true,
        apply: function (aMsgHdrs, aActionValue, aListener, aType, aMsgWindow) {
            var me = this,
                info = parseTemplateUrl(aActionValue),
                folder = MailUtils.getExistingFolder(info.folderURI),
                tplHdr = CheckForMessageIdInFolder(folder, info.messageId),
                collector,
                collectorReturnCount,
                collectorCallCount,
                collectionCanceled,
                submitter,
                submitterReturnCount,
                submitterCallCount,
                submissionCanceled,
                batchWin;

            function cancelMessageSubmissions() {
                log("debug: cancelMessageSubmissions(): called with ()", 5);
                submissionCanceled = true;
                log("debug: cancelMessageSubmission(): submissionCanceled == " + submissionCanceled, 7);
            }

            function onMessageSubmitted() {
                var totalProgress;
                log("debug: onMessageSubmitted(): called with ()", 5);
                log("debug: onMessageSubmitted(): incrementing submitterReturnCount", 6);
                submitterReturnCount += 1;
                log("debug: onMessageSubmitted(): submitterReturnCount == " + submitterReturnCount, 7);
                totalProgress = (100 * submitterReturnCount) / collector.attachments.length;
                log("debug: onMessageSubmitted(): totalProgress == " + totalProgress, 7);
                log("debug: onMessageSubmitted(): invoking batchWin.setTotalProgress()", 6);
                batchWin.setTotalProgress(totalProgress);
                log("debug: onMessageSubmitted(): returned from batchWin.setTotalProgress()", 7);
            }

            function submitNextMessage(aCompletionFun) {
                var callback, attachment;
                log("debug: submitNextMessage(): called with (" + aCompletionFun + ")", 5);
                if (submissionCanceled) {
                    log("debug: submitNextMessage(): if (submissionCanceled == true) { ...", 6);
                    log("debug: submitNextMessage(): return", 6);
                    return;
                }
                log("debug: submitNextMessage(): submitterReturnCount == " + submitterReturnCount, 7);
                log("debug: submitNextMessage(): submitterCallCount == " + submitterCallCount, 7);
                log("debug: submitNextMessage(): collector.attachments.length == " + collector.attachments.length, 7);
                if (submitterReturnCount < collector.attachments.length) {
                    log("debug: submitNextMessage(): if (submitterReturnCount < collector.attachments.length) { ...", 6);
                    if (submitterCallCount < collector.attachments.length) {
                        log("debug: submitNextMessage(): if (submitterReturnCount < collector.attachments.length) { ...", 6);
                        log("debug: submitNextMessage(): me.maxConcurrentTasks == " + me.maxConcurrentTasks, 7);
                        if ((submitterCallCount - submitterReturnCount) < me.maxConcurrentTasks) {
                            log("debug: submitNextMessage(): if ((submitterCallCount - submitterReturnCount) < me.maxConcurrentTasks) { ...", 6);
                            attachment = collector.attachments[submitterCallCount];
                            callback = function (aTplHdr, aTplMsg) {
                                submitter.apply(aTplHdr, aTplMsg, attachment);
                            };
                            //msgHdr = aMsgHdrs.queryElementAt(submitterReturnCount, Ci.nsIMsgDBHdr);
                            log("debug: submitNextMessage(): incrementing submitterCallCount()", 6);
                            submitterCallCount += 1;
                            log("debug: submitNextMessage(): submitterCallCount == " + submitterCallCount, 7);
                            log("debug: submitNextMessage(): calling MimeMsg.MsgHdrToMimeMessage()", 6);
                            MimeMsg.MsgHdrToMimeMessage(tplHdr, submitter, callback, true);
                            log("debug: submitNextMessage(): returned from MimeMsg.MsgHdrToMimeMessage()", 7);
                        }
                    }
                    log("debug: submitNextMessage(): invoking window.setTimeout( { submitNextMessage(...); } )", 6);
                    window.setTimeout(function () { submitNextMessage(function () { aCompletionFun(); }); }, 50, false);
                    log("debug: submitNextMessage(): returned from window.setTimeout( { submitNextMessage(...); } )", 7);
                } else {
                    log("debug: submitNextMessage(): if (submitterReturnCount < collector.attachments.length) { ... } else { ...", 6);
                    log("debug: submitNextMessage(): invoking batchWin.setStatus()", 6);
                    batchWin.setStatus("Submitting messages... done");
                    log("debug: submitNextMessage(): returned from batchWin.setStatus()", 7);
                    log("debug: submitNextMessage(): invoking aCompletionFun()", 6);
                    aCompletionFun();
                    log("debug: submitNextMessage(): returned from aCompletionFun()", 7);
                }
            }

            function submitMessages(aCompletionFun) {
                log("debug: submiteMessages(): called with (" + aCompletionFun + ")", 5);
                log("debug: submitMessages(): creating Submitter", 6);
                submitter = me.createSubmitter(function () { onMessageSubmitted(); }, batchWin);
                log("debug: submitMessages(): resetting submitter counters and flags", 6);
                submissionCanceled = false;
                submitterReturnCount = submitterCallCount = 0;
                log("debug: invoking batchWin.setStatus()", 6);
                batchWin.setStatus("Submitting messages... ");
                log("debug: returned from batchWin.setStatus()", 7);
                log("debug: invoking batchWin.setProgress()", 6);
                batchWin.setProgress(0);
                log("debug: returned from batchWin.setProgress()", 7);
                log("debug: invoking batchWin.setTotalProgress()", 6);
                batchWin.setTotalProgress(0);
                log("debug: returned from batchWin.setTotalProgress()", 7);
                log("debug: submitMessages(): invoking submitNextMessage()", 6);
                submitNextMessage(aCompletionFun);
                log("debug: submitMessages(): returned from submitNextMessage()", 7);
            }

            function onSubmissionComplete() {
                log("debug: onSubmissionComplete(): called with ()", 5);
                log("debug: onSubmissionComplete(): messages submitted... ", 4);
                log("debug: onSubmissionComplete(): invoking batchWin.batchDone()", 6);
                batchWin.batchDone();
                log("debug: onSubmissionComplete(): returned from batchWin.batchDone()", 7);
                log("debug: onSubmissionComplete(): invoking aListener.OnStopCopy()", 6);
                aListener.OnStopCopy(0);
                log("debug: onSubmissionComplete(): returned from aListener.OnStopCopy()", 7);
            }

            function cancelAttachmentCollection() {
                log("debug: cancelAttachmentCollection(): called with ()", 5);
                collectionCanceled = true;
                log("debug: cancelAttachmentCollection(): collectionCanceled == " + collectionCanceled, 7);
            }

            function onAttachmentCollected() {
                log("debug: onAttachmentCollected(): called with ()", 5);
                log("debug: onAttachmentCollected(): incrementing collectorReturnCount", 6);
                collectorReturnCount += 1;
                log("debug: onAttachmentCollected(): collectorReturnCount == " + collectorReturnCount, 7);
                log("debug: onAttachmentCollected(): invoking batchWin.setProgress()", 6);
                batchWin.setProgress((100 * collectorReturnCount) / aMsgHdrs.length);
                log("debug: onAttachmentCollected(): returned from batchWin.setProgress()", 7);
            }

            function collectNextAttachment(aCompletionFun) {
                var msgHdr;
                log("debug: collectNextAttachment(): called with (" + aCompletionFun + ")", 5);
                if (collectionCanceled) {
                    log("debug: collectNextAttachment(): if (collectionCanceled == true) { ...", 6);
                    log("debug: collectNextAttachment(): return", 6);
                    return;
                }
                log("debug: collectNextAttachment(): collectorReturnCount == " + collectorReturnCount, 7);
                log("debug: collectNextAttachment(): aMsgHdrs.length == " + aMsgHdrs.length, 7);
                if (collectorReturnCount < aMsgHdrs.length) {
                    log("debug: collectNextAttachment(): if (collectorReturnCount < aMsgHdrs.length) { ...", 6);
                    log("debug: collectNextAttachment(): collectorCallCount == " + collectorCallCount, 7);
                    if (collectorReturnCount === collectorCallCount) {
                        log("debug: collectNextAttachment(): if (collectorReturnCount == collectorCallCount) { ...", 6);
                        msgHdr = aMsgHdrs.queryElementAt(collectorReturnCount, Ci.nsIMsgDBHdr);
                        collectorCallCount += 1;
                        log("debug: collectNextAttachment(): invoking MimeMsg.MsgHdrToMimeMessage()", 6);
                        MimeMsg.MsgHdrToMimeMessage(msgHdr, collector, collector.apply, true);
                        log("debug: collectNextAttachment(): returned from MimeMsg.MsgHdrToMimeMessage()", 7);
                    }
                    window.setTimeout(function () { collectNextAttachment(function () { aCompletionFun(); }); }, 50, false);
                } else {
                    log("debug: collectNextAttachment(): if (collectorReturnCount < aMsgHdrs.length) { ... } else { ...", 6);
                    batchWin.setStatus("Collecting attachments... done");
                    log("debug: collectNextAttachment(): invoking aCompletionFun()", 6);
                    aCompletionFun();
                    log("debug: collectNextAttachment(): returned from aCompletionFun()", 7);
                }
            }

            function collectAttachments(aCompletionFun) {
                log("debug: collectAttachments(): called with (" + aCompletionFun + ")", 5);
                log("debug: collectAttachments(): creating Collector", 6);
                collector = new Collector(function () { onAttachmentCollected(); }, me.reattach);
                log("debug: collectAttachments(): created Collector", 7);
                log("debug: collectAttachments(): reseting collector flags and counters", 6);
                collectionCanceled = false;
                collectorReturnCount = collectorCallCount = 0;
                log("debug: collectAttachments(): invoking batchWin.setProgress()", 6);
                batchWin.setProgress(0);
                log("debug: collectAttachments(): returned from batchWin.setProgress()", 7);
                log("debug: collectAttachments(): invoking collectNextAttachment()", 6);
                collectNextAttachment(function () { aCompletionFun(); });
                log("debug: collectAttachments(): returned from collectNextAttachment()", 7);
            }

            function onCollectionComplete() {
                log("debug: onCollectionComplete(): called with ()", 5);
                log("debug: onCollectionComplete(): attachments collected... ", 4);
                log("debug: onCollectionComplete(): starting message submission... ", 4);
                log("debug: onCollectionComplete(): invoking submitMessages()", 6);
                submitMessages(function () { onSubmissionComplete(); });
                log("debug: onCollectionComplete(): returned from submitMessages()", 7);
            }

            function cancelJobs() {
                log("debug: cancelJobs(): called with ()", 5);
                log("debug: cancelJobs(): cancelling jobs... ", 4);
                log("debug: cancelJobs(): invoking cancelMessageSubmission()", 6);
                cancelMessageSubmissions();
                log("debug: cancelJobs(): returned from cancelMessageSubmission()", 7);
                log("debug: cancelJobs(): invoking cancelAttachmentCollection()", 6);
                cancelAttachmentCollection();
                log("debug: cancelJobs(): returned from cancelAttachmentCollection()", 7);
            }

            function onBatchWinCancel() {
                log("debug: onBatchWinCancel(): called with ()", 5);
                log("debug: onBatchWinCancel(): invoking cancelJobs()", 6);
                cancelJobs();
                log("debug: onBatchWinCancel(): returned from cancelJobs()", 6);
                log("debug: onBatchWinCancel(): invoking batchWin.close()", 6);
                batchWin.close();
                log("debug: onBatchWinCancel(): returned from batchWin.close()", 7);
            }

            function onBatchWinLoad(e) {
                log("debug: onBatchWinLoad(): called with ()", 5);
                log("debug: onBatchWinLoad(): invoking batchWin.setCancelCallback()", 6);
                batchWin.setCancelCallback(function () { onBatchWinCancel(); });
                log("debug: onBatchWinLoad(): returned from batchWin.setCancelCallback()", 7);
                log("debug: onBatchWinLoad(): collecting attachments... ", 4);
                log("debug: onBatchWinLoad(): invoking collectAttachments()", 6);
                collectAttachments(function () { onCollectionComplete(); });
                log("debug: onBatchWinLoad(): returned from collectAttachments()", 7);
            }

            function onBatchWinClose(e) {
                log("debug: onBatchWinClose(): called with ()", 5);
                log("debug: onBatchWinClose(): invoking cancelJobs()", 6);
                cancelJobs();
                log("debug: onBatchWinClose(): returned from cancelJobs()", 7);
            }

            function onBatchWinUnload(e) {
                log("debug: onBatchWinUnload(): called with ()", 5);
            }

            // re-read preferences such that we don't have to restart TB
            self.readPrefs();

            log("debug: creating batchWnd window", 4);
            batchWin = window.openDialog("chrome://resubmit/content/batch.xul", "_blank");
            log("debug: created batchWnd window", 7);
            log("debug: adding eventHandlers to batchWnd window", 4);
            log("debug: invoking batchWin.addEventListener('load', ...)", 6);
            batchWin.addEventListener("load", function (e) { onBatchWinLoad(e);  }, false);
            log("debug: returned from batchWin.addEventListener('load', ...)", 7);
            log("debug: invoking batchWin.addEventListener('close', ...)", 6);
            batchWin.addEventListener("close", function (e) { onBatchWinClose(e);  }, false);
            log("debug: returned from batchWin.addEventListener('close', ...)", 7);
            log("debug: invoking batchWin.addEventListener('unload', ...)", 6);
            batchWin.addEventListener("unload", function (e) { onBatchWinUnload(e);  }, false);
            log("debug: returned from batchWin.addEventListener('unload', ...)", 7);
            log("debug: added eventHandlers to batchWnd window", 7);
        },
        isValidForType: function (type, scope) {
            return this.isAvailable;
        },
        validateActionValue: function (value, folder, type) {
            return null;
        },
        allowDuplicates: false,
        needsBody: true
    };

    self.init = function () {
        self.strings = Services.strings.createBundle("chrome://resubmit/locale/resubmit.properties");

        var filterService = Cc["@mozilla.org/messenger/services/filters;1"]
                .getService(Ci.nsIMsgFilterService),
            actionComposeAtt,
            actionSendNowAtt,
            actionSendLaterAtt,
            actionComposeMsg,
            actionSendNowMsg,
            actionSendLaterMsg;

        // Create custom a actions
        actionSendNowAtt = new FilterAction(
            "resubmit@ezamber.pl#actionSendNow",
            self.strings.GetStringFromName("resubmit.sendnow.name"),
            self.Modes.SendNow,
            sendNowEnabled,
            true
        );
        actionSendLaterAtt = new FilterAction(
            "resubmit@ezamber.pl#actionSendLater",
            self.strings.GetStringFromName("resubmit.sendlater.name"),
            self.Modes.SendLater,
            sendLaterEnabled,
            true
        );
        actionComposeAtt = new FilterAction(
            "resubmit@ezamber.pl#actionCompose",
            self.strings.GetStringFromName("resubmit.compose.name"),
            self.Modes.Compose,
            composeEnabled,
            true
        );
        actionSendNowMsg = new FilterAction(
            "resubmit@ezamber.pl#actionSendNowMsg",
            self.strings.GetStringFromName("resubmit.sendnowmsg.name"),
            self.Modes.SendNow,
            sendNowEnabled,
            false
        );
        actionSendLaterMsg = new FilterAction(
            "resubmit@ezamber.pl#actionSendLaterMsg",
            self.strings.GetStringFromName("resubmit.sendlatermsg.name"),
            self.Modes.SendLater,
            sendLaterEnabled,
            false
        );
        actionComposeMsg = new FilterAction(
            "resubmit@ezamber.pl#actionComposeMsg",
            self.strings.GetStringFromName("resubmit.composemsg.name"),
            self.Modes.Compose,
            composeEnabled,
            false
        );

        // Register custom actions
        filterService.addCustomAction(actionComposeAtt);
        filterService.addCustomAction(actionSendNowAtt);
        filterService.addCustomAction(actionSendLaterAtt);
        filterService.addCustomAction(actionComposeMsg);
        filterService.addCustomAction(actionSendNowMsg);
        filterService.addCustomAction(actionSendLaterMsg);
    };

    self.onLoad = function (e) {
        if (self.initialized) {
            return;
        }
        self.init();
        self.initialized = true;
    };
}

(function () {
    "use strict";
    var resubmit = new Resubmit();
    window.addEventListener("load", function (e) { resubmit.onLoad(e); }, false);
}());
// vim: set expandtab tabstop=4 shiftwidth=4:
