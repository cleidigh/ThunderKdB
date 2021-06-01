/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

try {
  if (typeof Cc === "undefined") var Cc = Components.classes;
  if (typeof Ci === "undefined") var Ci = Components.interfaces;
  if (typeof Cr === "undefined") var Cr = Components.results;
} catch (e) {}

var {
  Services
} = ChromeUtils.import("resource://gre/modules/Services.jsm");

if (typeof AttachmentFileMaker === "undefined") {
  dump("##AttachmentFileMaker Prototype Definition start##\n");

  function AttachmentFileMaker(currentfilenamepattern, folder, aewindow) {
    if ((typeof folder) === "string" || folder instanceof String) {
      this.destFolder = aewindow.fileObject;
      this.destFolder.initWithPath(folder);
    } else this.destFolder = folder;

    this.lastMadeAppendage = null;
    this.currentfilenamepattern = currentfilenamepattern;
    this.prefs = (aewindow) ? aewindow.prefs : new Object();

    this.OVERWRITEPOLICY_ASK = 0;
    this.OVERWRITEPOLICY_REPLACE = 1;
    this.OVERWRITEPOLICY_RENAME = 2;
    this.OVERWRITEPOLICY_IGNORE = 3;
  }

  AttachmentFileMaker.AttachmentFileMakerCache = function() {
    this.datetime = null;
    this.author = null;
    this.authoremail = null;
    this.subject = null;
    this.mailfolder = null;
    var that = this;
    this.toString = function() {
      return "[" + that.datetime + "," + that.author + "," + that
        .authoremail + "," + that.subject + "," + that.mailfolder + "]";
    }
  };

  AttachmentFileMaker.prototype.make = function(filename, metacache) {
    if (!filename) return false;

    var proposedfileobject = aewindow.fileObject;
    var count_pattern = this.prefs.get("filenamepattern.countpattern");

    proposedfileobject.initWithFile(this.destFolder);
    //aewindow.aedump("cfnp: "+this.currentfilenamepattern);
    var proposedappendage = this.substitutetokens(this.currentfilenamepattern
      .replace(/#count#/g, ""), this.destFolder, filename, 0, metacache);
    proposedfileobject.appendRelativePath(proposedappendage);

    if (aewindow.currentTask.overwritePolicy === this
      .OVERWRITEPOLICY_REPLACE) {
      aewindow.aedump(">> '" + proposedappendage +
        "' - replace so no need to check.  proceed\n", 1);
      this.lastMadeAppendage = proposedappendage;
      return proposedfileobject;
    }

    if (!proposedfileobject.exists()) {
      aewindow.aedump(">> '" + proposedappendage +
        "' doesn't exist so proceed\n", 1);
      this.lastMadeAppendage = proposedappendage;
      return proposedfileobject;
    } else if (aewindow.currentTask.overwritePolicy === this
      .OVERWRITEPOLICY_IGNORE) {
      aewindow.aedump(">> '" + proposedappendage +
        "' exists and policy is to skip so abort extraction\n", 1);
      return false;
    } else if (aewindow.currentTask.overwritePolicy === this
      .OVERWRITEPOLICY_ASK) {
      var flags = aewindow.promptService.BUTTON_TITLE_IS_STRING * aewindow
        .promptService.BUTTON_POS_0 +
        aewindow.promptService.BUTTON_TITLE_IS_STRING * aewindow.promptService
        .BUTTON_POS_1 +
        aewindow.promptService.BUTTON_TITLE_IS_STRING * aewindow.promptService
        .BUTTON_POS_2;

      var checkedstate = {};
      var selectedbutton = aewindow.promptService.confirmEx(window,
        aewindow.aeStringBundle.GetStringFromName("OverwriteDialogTitle"),
        aewindow.aeStringBundle.GetStringFromName("OverwriteDialogMessage")
        .replace(/%/g, proposedappendage),
        flags,
        aewindow.aeStringBundle.GetStringFromName("OverwriteDialogReplace"),
        aewindow.aeStringBundle.GetStringFromName("OverwriteDialogRename"),
        aewindow.aeStringBundle.GetStringFromName("OverwriteDialogIgnore"),
        aewindow.aeStringBundle.GetStringFromName(
          "OverwriteDialogDontAskAgain"),
        checkedstate);
      if (checkedstate.value === true) {
        this.prefs.set("overwritepolicy", selectedbutton + 1);
      }
      if (selectedbutton === 0) {
        this.lastMadeAppendage = proposedappendage;
        return proposedfileobject;
      }
      if (selectedbutton === 1) {
        return this.iterativegenerator(this.destFolder, filename,
          proposedfileobject, this.currentfilenamepattern.replace(
            /#count#/g, count_pattern), 1, metacache);
      }
      if (selectedbutton === 2) {
        return false;
      }
      return false;
    } else return this.iterativegenerator(this.destFolder, filename,
      proposedfileobject, this.currentfilenamepattern.replace(/#count#/g,
        count_pattern), 1, metacache);
  };


  AttachmentFileMaker.prototype.makeSaveMessage = function(metacache) {
    var proposedfileobject = aewindow.fileObject;
    var messagetext_pattern = this.prefs.get("filenamepattern.savemessage");
    var count_pattern = this.prefs.get(
      "filenamepattern.savemessage.countpattern");

    proposedfileobject.initWithFile(this.destFolder);

    var proposedappendage = this.substitutetokens(messagetext_pattern.replace(
      /#count#/g, ""), this.destFolder, "", 0, metacache);
    proposedfileobject.appendRelativePath(proposedappendage);

    if (!proposedfileobject.exists()) {
      this.lastMadeAppendage = proposedappendage;
      return proposedfileobject;
    } else return this.iterativegenerator(this.destFolder, "",
      proposedfileobject, messagetext_pattern.replace(/#count#/g,
        count_pattern), 1, metacache);
  };

  AttachmentFileMaker.prototype.DAYSUFFIX = Array("",
    "st", "nd", "rd", "th", "th", "th", "th", "th", "th", "th",
    "th", "th", "th", "th", "th", "th", "th", "th", "th", "th",
    "st", "nd", "rd", "th", "th", "th", "th", "th", "th", "th",
    "st");
  AttachmentFileMaker.prototype.SHORTDAYS = Array("Sun", "Mon", "Tue", "Wed",
    "Thu", "Fri", "Sat");
  AttachmentFileMaker.prototype.FULLDAYS = Array("Sunday", "Monday", "Tuesday",
    "Wednesday", "Thursday", "Friday", "Saturday");
  AttachmentFileMaker.prototype.SHORTMONTHS = Array("Jan", "Feb", "Mar", "Apr",
    "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec");
  AttachmentFileMaker.prototype.FULLMONTHS = Array("January", "Febuary",
    "March", "April", "May", "June", "July", "August", "September", "October",
    "November", "December");
  AttachmentFileMaker.prototype.AMPM = Array("AM", "PM", "am", "pm");

  AttachmentFileMaker.prototype.formatdatestring = function(format, date) {
    var out = "";
    var tmp;
    for (let i = 0; i < format.length; i++) {
      switch (format.charAt(i)) {
        //day
        case "d":
          out += (tmp = date.getDate()) < 10 ? "0" + tmp : tmp;
          break;
        case "D":
          out += this.SHORTDAYS[date.getDay()];
          break;
        case "j":
          out += date.getDate();
          break;
        case "l":
          out += this.FULLDAYS[date.getDay()];
          break;
        case "N":
          out += (tmp = date.getDay()) === 0 ? 7 : tmp;
          break;
        case "S":
          out += this.DAYSUFFIX[date.getDate()];
          break;
        case "w":
          out += date.getDay();
          break;
          //month
        case "F":
          out += this.FULLMONTHS[date.getMonth()];
          break;
          /*(this.dateStringBundle.GetStringFromName("month."+(date.getMonth()+1)+".name"));*/
        case "m":
          out += (tmp = date.getMonth() + 1) < 10 ? "0" + tmp : tmp;
          break;
        case "M":
          out += this.SHORTMONTHS[date.getMonth()];
          break;
        case "n":
          out += date.getMonth() + 1;
          break;
          //year
        case "Y":
          out += date.getFullYear();
          break;
        case "y":
          out += (tmp = date.getFullYear() % 100) < 10 ? "0" + tmp : tmp;
          break;
          //time
        case "a":
          out += this.AMPM[(date.getHours() < 12 ? 2 : 3)];
          break;
        case "A":
          out += this.AMPM[(date.getHours() < 12 ? 0 : 1)];
          break;
        case "g":
          out += (tmp = date.getHours() % 12) === 0 ? 12 : tmp;
          break;
        case "G":
          out += date.getHours();
          break;
        case "h":
          out += (tmp = ((tmp = date.getHours() % 12) === 0 ? 12 : tmp)) < 10 ?
            "0" + tmp : tmp;
          break;
        case "H":
          out += (tmp = date.getHours()) < 10 ? "0" + tmp : tmp;
          break;
        case "i":
          out += (tmp = date.getMinutes()) < 10 ? "0" + tmp : tmp;
          break;
        case "s":
          out += (tmp = date.getSeconds()) < 10 ? "0" + tmp : tmp;
          break;
          //full date/time
        case "U":
          out += date.valueOf() / 1000;
          break;
        default:
          out += format.charAt(i);
      }
    }
    return out;
  };

  AttachmentFileMaker.prototype.iterativegenerator = function(folder, file,
    proposedfileobject, filename_pattern, count, cache) {
    var proposedappendage;
    do {
      proposedfileobject.initWithFile(folder);
      proposedappendage = this.substitutetokens(filename_pattern, folder,
        file, count, cache);
      proposedfileobject.appendRelativePath(proposedappendage);
      count++;
    } while (proposedfileobject.exists())
    if (file !== "") aewindow.aedump(">> '" + proposedappendage +
      "' doesn't exist so proceed\n", 1);
    this.lastMadeAppendage = proposedappendage;
    return proposedfileobject;
  };

  AttachmentFileMaker.prototype.substitutetokens_sub = function(stringin,
    folder, filename, count, cache) {
    var extpart = "";
    if ((stringin.indexOf("#namepart#") > -1) || (stringin.indexOf(
        "#extpart#") > -1)) {
      var namepart;
      var liod = filename.lastIndexOf(".");
      if (liod > -1) {
        namepart = filename.substring(0, liod);
        extpart = filename.substring(liod);
      } else namepart = filename;
      stringin = stringin.replace(/#namepart#/g, namepart.replace(this
        .tokenregexs.dollars, "$$$$"));
    }
    stringin = stringin.replace(/#date#/g, cache.datetime)
      .replace(/#from#/g, cache.author)
      .replace(/#fromemail#/g, cache.authoremail)
      .replace(/#folder#/g, cache.mailfolder)
      .replace(/#subject#/g, cache.subject);

    return this.validateFileName(folder, stringin, extpart, count);
  };

  AttachmentFileMaker.prototype.generate = AttachmentFileMaker.prototype
    .substitutetokens_sub;

  AttachmentFileMaker.prototype.tokenregexs = {
    author: / <.*>|[\/\\#]+/g,
    authoremail: /.*<|>.*|[\/\\#]+/g,
    subject: /[\/\\#]+/g,
    folder: /[\/\\#]+/g,
    dollars: /\$/g
  }

  AttachmentFileMaker.prototype.substitutetokens = function(stringin, folder,
    filename, count, cache) {
    if (!cache) cache = new AttachmentFileMaker.AttachmentFileMakerCache();
    var msheader = aewindow.currentTask.getMessageHeader();
    if (!cache.datetime && (stringin.indexOf('#date#') > -1)) {
      cache.datetime = this.formatdatestring(this.prefs.get(
        "filenamepattern.datepattern"), new Date(msheader.dateInSeconds *
        1000));
    }
    if (!cache.author && (stringin.indexOf('#from#') > -1)) {
      cache.author = (msheader.mime2DecodedAuthor ? msheader
          .mime2DecodedAuthor + "" : "").replace(this.tokenregexs.author, "")
        .replace(this.tokenregexs.dollars, "$$$$");
    }
    if (!cache.authoremail && (stringin.indexOf('#fromemail#') > -1)) {
      cache.authoremail = (msheader.mime2DecodedAuthor ? msheader
          .mime2DecodedAuthor + "" : "").replace(this.tokenregexs.authoremail,
          "")
        .replace(this.tokenregexs.dollars, "$$$$");
    }
    /*if (!cache.recipients&&(stringin.indexOf('#toemail#')>-1)) {
      //cache.authoremail=(msheader.mime2DecodedAuthor?msheader.mime2DecodedRecipients+"":"").replace(/.*<|>.*|[\/\\#]+/g, "");
    }*/
    if (!cache.subject && (stringin.indexOf('#subject#') > -1)) {
      cache.subject = (msheader.mime2DecodedSubject ? msheader
          .mime2DecodedSubject + "" : "").replace(this.tokenregexs.subject,
          "_")
        .replace(this.tokenregexs.dollars, "$$$$");
      if (this.prefs.get("filenamepattern.cleansubject")) {
        var starts = this.prefs.get("filenamepattern.cleansubject.strings")
          .toLowerCase().split(',');
        cache.subject = this.cleanSubjectLine(cache.subject, starts);
      }
    }
    if (!cache.mailfolder && (stringin.indexOf('#folder#') > -1)) {
      cache.mailfolder = (msheader.folder ? msheader.folder.name + "" : "")
        .replace(this.tokenregexs.folder, "")
        .replace(this.tokenregexs.dollars, "$$$$");
    }

    aewindow.aedump("cache: " + cache + "\n", 3);
    //aewindow.aedump("m2da: "+msheader.mime2DecodedAuthor+", a: "+msheader.author+"\n",0);
    return this.substitutetokens_sub(stringin, folder, filename, count,
    cache);
  };

  AttachmentFileMaker.prototype.cleanSubjectLine = function(subject, starts) {
    var morework;
    if (subject === null) return "";
    do {
      morework = false;
      if (subject.length === 0) break;
      if (subject.charAt(0) === '[' && subject.charAt(subject.length - 1) ===
        ']') {
        subject = subject.substring(1, subject.length - 1);
        morework = true;
      }
      for (let i = 0; i < starts.length && !morework; i++) {
        if (subject.toLowerCase().indexOf(starts[i]) === 0) {
          subject = subject.substring(starts[i].length);
          morework = true;
        }
      }
    } while (morework);
    return subject;
  };

  AttachmentFileMaker.prototype.isValidFilenamePattern = function(fnp) {
    return (fnp && (fnp.indexOf("%") !== -1 || fnp.indexOf("#count#") !== -1));
  };

  AttachmentFileMaker.prototype.fixFilenamePattern = function(fnp) {
    if (!fnp || this.isValidFilenamePattern(fnp)) return fnp;
    var expi = fnp.lastIndexOf("#extpart#");
    if (expi === -1) expi = fnp.lastIndexOf(".");
    if (expi !== -1) return fnp.substring(0, expi) + "#count#" + fnp.substring(
      expi, fnp.length);
    else return fnp + "#count#";
  };

  AttachmentFileMaker.prototype.isValidCountPattern = function(cp) {
    return (cp && (cp.indexOf("%") !== -1));
  };

  AttachmentFileMaker.prototype.fixCountPattern = function(cp) {
    return (!cp || this.isValidCountPattern(cp)) ? cp : cp + "%";
  };

  /* *** contribution below from Matteo F Zazzetta.  Support functions to rewritten validateFilename() 
   *** code rewritten slightly 20/8/08 to reduce lines and complexity and use built in js functions instead. 
   */

  AttachmentFileMaker.prototype.countOccurrences = function(string, substring,
    rep) {

    function StrIdx(i, s, r) {
      this.idx = i;
      this.string = s;
      this.replace = r;
      this.toString = function() {
        return this.idx + " " + this.string + " " + this.replace;
      };
    };

    var idx = 0;
    var arr = new Array();
    while ((idx = string.indexOf(substring, idx)) >= 0) {
      arr.push(new StrIdx(idx++, substring, rep));
    }
    return arr;
  };

  AttachmentFileMaker.prototype.reconstructString = function(string, idxarr) {
    var rs = string;
    var offset = 0;
    for (let i = 0; i < idxarr.length; i++) {
      var pos = offset + idxarr[i].idx;
      if (pos < rs.length) {
        rs = (pos > 0 ? rs.substring(0, pos) : "") + idxarr[i].replace + rs
          .substring(pos);
      } else {
        rs += idxarr[i].replace;
      }
      offset += (idxarr[i].replace.length - idxarr[i].string.length);
    }
    return rs;
  };

  /* function below based on seamonkey/toolkit/content/contentAreaUtils.js but modifed to take into not filter out folder seperators*/

  AttachmentFileMaker.prototype.validateFileName = function(folder, aFileName,
    extpart, count) {

    function joinArrs(a1, a2) {
      return a1.concat(a2).sort(function(a, b) {
        return a.idx - b.idx;
      });
    }

    count = "" + count;
    if (navigator.appVersion.indexOf("Windows") !== -1) {
      aFileName = aFileName.replace(/[\"]+/g, "'") /*  " = '      */
        .replace(/[\*\:\?\t\v]+/g, " ") /*  * : ? tab vtab =   */
        .replace(/[\<]+/g, "(") /*  < = (      */
        .replace(/[\>]+/g, ")") /*  > = )      */
        .replace(/[\/\|]+/g, "_"); /*  /| = _         */
      var comp = (folder === null || folder.path === null ? "" : folder.path) +
        "\\" + aFileName;
      comp = comp.replace(/\\/g, "");
      var len1 = comp.length;
      var len2 = comp.replace(/%/g, count).replace(/#extpart#/g, extpart
        .replace(this.tokenregexs.dollars, "$$$$")).length;
      var len3 = comp.replace(/%|#extpart#/g, "").length;
      if (len2 >= 250) {
        var splits = aFileName.split("\\");
        var cd = 0;
        var totlen = aFileName.length - 2 * splits.length + 1 + len3 - len1;
        var charsToDelete = len2 - 250;
        var remainToDelete = charsToDelete;
        if (charsToDelete <= totlen) {
          var newfn = "";
          for (let i = 0; i < splits.length; i++) {
            var arr = joinArrs(this.countOccurrences(splits[i], "%", count),
              this.countOccurrences(splits[i], "#extpart#", extpart));

            splits[i] = splits[i].replace(/%|#extpart#/g, "");
            cd = (i === splits.length - 1) ? remainToDelete : Math.min(Math
              .ceil((splits[i].length - 1) / totlen * charsToDelete),
              splits[i].length - 1);
            remainToDelete -= cd;
            splits[i] = this.reconstructString(splits[i].substring(0, splits[
              i].length - cd), arr);
            newfn += (i === 0 ? "" : "\\") + splits[i];
          }
          aFileName = newfn;
        }
      } else aFileName = aFileName.replace(/%/g, count).replace(/#extpart#/g,
        extpart.replace(this.tokenregexs.dollars, "$$$$"));
      aFileName = aFileName.replace(/[\. ]+\\/g, "\\");
    } else {
      if (navigator.appVersion.indexOf("Macintosh") !== -1) aFileName =
        aFileName.replace(/[\:]+/g, "_"); /*   : = _   */
      aFileName = aFileName.replace(/%/g, count).replace(/#extpart#/g, extpart
        .replace(this.tokenregexs.dollars, "$$$$"));
    }
    return aFileName;
  }
  /* ** contribution from Matteo F Zazzetta end ** */
  dump("##AttachmentFileMaker Prototype Definition end##\n");
};

/* *************** end of AttachmentFileMaker class ************************* */