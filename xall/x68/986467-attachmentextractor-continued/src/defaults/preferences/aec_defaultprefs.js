/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

/* General pane */
pref("extensions.attachextract_cont.defaultsavepath","");
pref("extensions.attachextract_cont.defaultsavepath.relative","");
pref("extensions.attachextract_cont.defaultsavepath.relative.key","");

pref("extensions.attachextract_cont.overwritepolicy",0);

pref("extensions.attachextract_cont.actionafterextract.markread",false);
pref("extensions.attachextract_cont.actionafterextract.deletemessage",false);
pref("extensions.attachextract_cont.actionafterextract.detach",false);
pref("extensions.attachextract_cont.actionafterextract.detach.withoutconfirm",false);
pref("extensions.attachextract_cont.actionafterextract.detach.warning",true);
pref("extensions.attachextract_cont.notifywhendone",true);

pref("extensions.attachextract_cont.actionafterextract.savemessage",false);

/* Folder pane */
pref("extensions.attachextract_cont.savepathmru.enabled",true);
pref("extensions.attachextract_cont.savepathmru.count",5);

pref("extensions.attachextract_cont.suggestfolder.disregardduplicates",true);
pref("extensions.attachextract_cont.suggestfolder.maxmatches",10);

/* Filename pattern pane */
pref("extensions.attachextract_cont.filenamepattern.askalwaysfnp",true);
pref("extensions.attachextract_cont.filenamepattern","#namepart##count##extpart#");
pref("extensions.attachextract_cont.filenamepattern.countpattern","-%");
pref("extensions.attachextract_cont.filenamepattern.datepattern","D M d Y");
pref("extensions.attachextract_cont.filenamepattern.cleansubject",false);
pref("extensions.attachextract_cont.filenamepattern.cleansubject.strings","aw: ,re: ,fw: ,fwd: ");
pref("extensions.attachextract_cont.filenamepattern.savemessage","#subject##count#.html");
pref("extensions.attachextract_cont.filenamepattern.savemessage.countpattern","-%");

/* Auto pane */
pref("extensions.attachextract_cont.autoextract.enabled",false);

pref("extensions.attachextract_cont.autoextract.onattachmentsonly",true);
pref("extensions.attachextract_cont.autoextract.waitforall",false);

pref("extensions.attachextract_cont.autoextract.savepath","");
pref("extensions.attachextract_cont.autoextract.savepath.relative","");
pref("extensions.attachextract_cont.autoextract.savepath.relative.key","");

pref("extensions.attachextract_cont.autoextract.ontriggeronly",true);
pref("extensions.attachextract_cont.autoextract.triggertag","ae_autoextract");

pref("extensions.attachextract_cont.autoextract.overwritepolicy",2);

pref("extensions.attachextract_cont.autoextract.markread",false);
pref("extensions.attachextract_cont.autoextract.deletemessage",false);
pref("extensions.attachextract_cont.autoextract.detach",false);
pref("extensions.attachextract_cont.autoextract.detach.withoutconfirm",false);

pref("extensions.attachextract_cont.autoextract.cleartag",false);

pref("extensions.attachextract_cont.autoextract.savemessage",false);
pref("extensions.attachextract_cont.autoextract.filenamepattern","");

/* Advanced pane */
pref("extensions.attachextract_cont.includeenabled",0);
pref("extensions.attachextract_cont.includepatterns","*.jpeg;*.jpg;*.png");
pref("extensions.attachextract_cont.excludepatterns","*.bat;*.exe;*.eml");

pref("extensions.attachextract_cont.extract.enabled",true);

pref("extensions.attachextract_cont.returnreceipts.enabled",false);
pref("extensions.attachextract_cont.returnreceipts.override",false);

pref("extensions.attachextract_cont.queuerequests",true);

pref("extensions.attachextract_cont.progressdialog.showtext",true);
pref("extensions.attachextract_cont.extractinlinetoo",false);

pref("extensions.attachextract_cont.reportgen.enabled",false);
pref("extensions.attachextract_cont.reportgen.thumbnail", true);
pref("extensions.attachextract_cont.reportgen.reportname", "aec_report.html");
pref("extensions.attachextract_cont.reportgen.append", true);

pref("extensions.attachextract_cont.debug",false);
pref("extensions.attachextract_cont.debugonstart",false);

/* hidden prefs */
pref("extensions.attachextract_cont.nextattachmentdelay",5);
pref("extensions.attachextract_cont.nextmessagedelay",50);
pref("extensions.attachextract_cont.dontloadimages",true);
