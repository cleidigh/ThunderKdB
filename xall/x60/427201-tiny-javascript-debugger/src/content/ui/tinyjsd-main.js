/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

/* global Components: false, dump: false */

'use strict';

const Cc = Components.classes;
const Ci = Components.interfaces;
const Cu = Components.utils;

Cu.import("resource://gre/modules/XPCOMUtils.jsm"); /* global XPCOMUtils: false */
Cu.import("resource://gre/modules/FileUtils.jsm"); /* global FileUtils: false */
Cu.import("chrome://tinyJsd/content/modules/tinyjsdCommon.jsm"); /* global TinyjsdCommon: false */

/* global watchListView: false, JSUnit: false */

const NS_LOCALFILEOUTPUTSTREAM_CONTRACTID = "@mozilla.org/network/file-output-stream;1";
const NS_STRING_INPUT_STREAM_CONTRACTID = "@mozilla.org/io/string-input-stream;1";
const NS_INPUT_STREAM_CHNL_CONTRACTID = "@mozilla.org/network/input-stream-channel;1";
const NS_IOSERVICE_CONTRACTID = "@mozilla.org/network/io-service;1";
const NS_SCRIPTABLEINPUTSTREAM_CONTRACTID = "@mozilla.org/scriptableinputstream;1";

const JS_VERSION = "latest";

const NO_STEP_MODE = 0;
const STEP_OVER = 1;
const STEP_INTO = 2;
const STEP_OUT = 3;

const URL_OK = RegExp("^(file|chrome|resource):/", "i");

var gTmp = null;
var gRefreshTimeout = null;

// debugging: 0 = off / 1 = on
const DEBUG_MODE = 0;

var TinyJsd = {
  DEBUG: function(str) {
    if (DEBUG_MODE) dump("tinyjsd: " + str + "\n");
  },


  scriptStopped: false,

  myWindow: window,
  stepMode: NO_STEP_MODE,
  scriptTag: 0,
  stackSize: 0,
  lastLine: -1,
  zoomFactor: 1.0,
  inspector: null,
  evalSandbox: null,

  debugFrame: null,
  findService: null,
  findStr: {
    value: ""
  },
  findMatchCase: {
    value: false
  },

  allBreakpoints: [],
  activeBreakpoints: [],
  scriptStack: [],
  allObjects: [],

  gScripts: [],

  onload: function() {

    this.initWindow();
    TinyjsdCommon.enableDebugger();
    this.initModule();
    this.loadConfig();

    var self = this;

    TinyjsdCommon.registerLogging({
      tinyjsd: DEBUG_MODE ? self : undefined,
      log: self.appendToResult,
      clear: self.clearResults
    });
    if (TinyjsdCommon.jsUnitEnabled()) {
      document.getElementById("run-jsunit").removeAttribute("hidden");
      this.cmdBox.value = "jsu " + TinyjsdCommon.getJsUnitMainFile();
    }

    this.newObjectHook(null);
    TinyjsdCommon.startupCompleted();
  },

  initModule: function() {
    this.dbg = TinyjsdCommon.getDebugger();

    this.bpBox.addEventListener("keypress",
      TinyJsd.onDeleteBreakpoint.bind(TinyJsd));

    this.wlMain.addEventListener("keypress",
      TinyJsd.onDeleteWatchList.bind(TinyJsd));

    this.inspector = Cc["@mozilla.org/jsinspector;1"].createInstance(Ci.nsIJSInspector);

    this.enableJsd();

    let nf = this.dbg.getNewestFrame();
    let glob = nf.script.global;
    this.dbg.removeDebuggee(glob); // do not debug myself
  },

  breakpointHook: {
    // Hook for breakpoints
    hit: function(frame) {
      var self = TinyJsd;
      self.DEBUG("breakpoint hit: func: " + frame.script.url);

      if (frame.script.url.search(URL_OK) < 0) return undefined;


      // check for and test conditional breakpoint
      let lineNum = self.getFrameLine(frame);
      self.DEBUG("breakpoint hit: line: " + lineNum);

      let bp = self.getBreakpoint(frame.script.url, lineNum);

      self.DEBUG("BreakpointHook - conditions: " + bp);

      if (!bp) return undefined;

      if (bp && bp.conditions && bp.conditions.enabled) {

        var cmd = TinyjsdCommon.getConditionalBp(
          bp.conditions.functionName,
          bp.conditions.functionBody);

        cmd += bp.conditions.functionName + "(0, " + frame.depth + ");";

        try {
          self.DEBUG("BreakpointHook - trying: " + cmd);
          let result = frame.eval(cmd, {
            url: "TinyJsd Breakpint Eval"
          }); // creates function

          // delete function again
          frame.eval(bp.conditions.functionName + " = undefined;");
          if ("return" in result) {
            // we only do not stop if we got a result (no exception) that is false
            self.DEBUG("BreakpointHook - result: " + result.return);
            if (result.return === false) {
              return undefined;
            }
          }
        }
        catch (ex) {
          self.DEBUG("BreakpointHook - got exception: " + ex.toString());
        }
      }

      self.enterDebugMode();
      self.doStop(frame, "breakpoint");

      return undefined;
    }
  },

  newObjectHook: function(obj) {
    try {
      this.DEBUG("newObjectHook: url=" + obj.script.source.url);
    }
    catch (x) {
      this.DEBUG("newObjectHook: obj=" + obj);
    }

    var self = this;

    this.findNewBreakpoints();

    function asyncLoadScripts() {
      if (self.checkNewScripts()) {
        self.refreshScriptsList(true);
      }
      gRefreshTimeout = null;
    }

    if (gRefreshTimeout === null) {
      gRefreshTimeout = TinyjsdCommon.setTimeout(asyncLoadScripts, 2000);
    }
  },

  enableJsd: function() {
    var self = this;

    if (!this.dbg.enabled) {
      this.DEBUG("enableJsd: turn dbg on");
      this.dbg.enabled = true;
    }
    else {
      this.DEBUG("enableJsd: already on");
    }

    TinyjsdCommon.addNewObjectListener(function _f(o) {
      return TinyJsd.newObjectHook(o);
    });
    this.dbg.uncaughtExceptionHook = this.reportDebuggerException.bind(this);
    this.dbg.onNewScript = this.newScriptHook.bind(this);
  },

  initWindow: function() {
    //this.DEBUG("initWindow");

    this.scriptsList = document.getElementById("tinyjsd-scripts");
    this.evalBox = document.getElementById('tinyjsd-textbox-eval');
    this.bpBox = document.getElementById('tinyjsd-breakpoints');
    this.wlBox = document.getElementById('watchlist_children');
    this.wlMain = document.getElementById('tinyjsd-watchlist');
    this.stackBox = document.getElementById("tinyjsd-stack");
    this.scriptTabs = document.getElementById("scriptTabs");
    this.scriptPanel = document.getElementById("scriptPanel");
    this.bcEnableSteps = document.getElementById("bcEnableSteps");
    this.menuErrorsTrace = document.getElementById("menu_traceErrors");
    this.menuNoErrors = document.getElementById("menu_noErrors");
    this.menuStopErrors = document.getElementById("menu_stopOnErrors");
    this.menuExcTrace = document.getElementById("menu_traceExceptions");
    this.menuNoExc = document.getElementById("menu_noExceptions");
    this.menuStopExc = document.getElementById("menu_stopOnExceptions");
    this.menuStopOnDebugger = document.getElementById("menu_stopOnDebuggerKeyword");
    this.sourceVisible = document.getElementById("bcSourceVisible");
    this.filterField = document.getElementById("script-filter");
    this.cmdBox = document.getElementById("tinyjsd-command");
    this.debuggerModeCheckbox = document.getElementById("tinyjsd-evaluate-in-debugger");
    if (DEBUG_MODE) this.debuggerModeCheckbox.removeAttribute("collapsed");

    this.wlTreeView = new watchListView();
    document.getElementById("tinyjsd-watchlist").view = this.wlTreeView;
    this.wlTreeView.addGlobalObj();

    this.bcEnableSteps.setAttribute("disabled", "true");
  },

  getStringBundle: function() {
    let strBundleService = Cc["@mozilla.org/intl/stringbundle;1"].getService();
    strBundleService = strBundleService.QueryInterface(Ci.nsIStringBundleService);
    this.stringBundle = strBundleService.createBundle("chrome://tinyJsd/locale/tinyjsd.properties");
  },

  refreshScriptsList: function(sortList) {
    this.DEBUG("refreshScriptsList: adding " + this.scriptStack.length + " items");

    var self = this;

    if (sortList) {
      this.scriptStack.sort(function _sort(a, b) {
        return self.getScriptName(a.toLowerCase()) < self.getScriptName(b.toLowerCase()) ? -1 : 1;
      });
    }

    let c = this.scriptsList.itemCount;

    for (let i = c; i > 0; i--) {
      this.scriptsList.removeItemAt(i - 1);
    }

    if (this.scriptsList.itemCount > 0) this.DEBUG("refreshScriptsList: could not remove all lines?!");

    let filter = RegExp(this.filterField.value, "i");

    for (let i = 0; i < this.scriptStack.length; i++) {
      let a = this.getScriptName(this.scriptStack[i]);
      //      this.DEBUG("script: "+a);

      if (a.length > 0 && a.search(filter) >= 0)
        this.scriptsList.appendItem(a, this.scriptStack[i]);
    }
  },

  onunload: function() {
    this.dbg.clearAllBreakpoints();
    this.saveConfig();
    TinyjsdCommon.stopDebugging();
    if (this.scriptStopped) this.leaveDebugMode();
  },

  loadConfig: function() {

    try {
      var cfgFile = FileUtils.getFile("ProfD", ["tinyJsd.json"]);

      if (cfgFile.exists()) {

        var ioServ = Cc[NS_IOSERVICE_CONTRACTID].getService(Ci.nsIIOService);

        var fileURI = ioServ.newFileURI(cfgFile);
        var fileChannel = ioServ.newChannel(fileURI.asciiSpec, null, null);

        var rawInStream = fileChannel.open();

        var scriptableInStream = Cc[NS_SCRIPTABLEINPUTSTREAM_CONTRACTID].createInstance(Ci.nsIScriptableInputStream);
        scriptableInStream.init(rawInStream);
        var available = scriptableInStream.available();
        var cfgContents = scriptableInStream.read(available);
        scriptableInStream.close();

        var cfg = JSON.parse(cfgContents);

        for (let i = 0; i < cfg.breakpoints.length; i++) {
          this.setBreakPoint(cfg.breakpoints[i].script, cfg.breakpoints[i].line, cfg.breakpoints[i].conditions);
        }

        for (let i = 0; i < cfg.watchlist.length; i++) {
          this.addWatchList(cfg.watchlist[i]);
        }
        this.updateWatchList();

        this.evalBox.value = cfg.scratchpad;

        if (cfg.uiZoomFactor) this.zoomFactor = cfg.uiZoomFactor;

        if (cfg.debugError) {
          if (cfg.debugError == 2) {
            this.enableStopErrors();
          }
          else
            this.enableTraceErrors();
        }

        if (cfg.debugThrows) {
          if (cfg.debugThrows == 2) {
            this.enableStopExceptions();
          }
          else {
            this.enableTraceExceptions();
          }
        }

        if (cfg.debuggerStatement) {
          this.enableStopDebugger();
        }
      }
    }
    catch (ex) {
      // ignore errors
    }
  },

  saveConfig: function() {
    const NS_RDONLY = 0x01;
    const NS_WRONLY = 0x02;
    const NS_CREATE_FILE = 0x08;
    const NS_TRUNCATE = 0x20;
    const DEFAULT_FILE_PERMS = -1;

    try {
      var outFile = FileUtils.getFile("ProfD", ["tinyJsd.json"]);

      var flags = NS_WRONLY | NS_CREATE_FILE | NS_TRUNCATE;

      var fileStream = Cc[NS_LOCALFILEOUTPUTSTREAM_CONTRACTID].createInstance(Ci.nsIFileOutputStream);

      fileStream.init(outFile, flags, DEFAULT_FILE_PERMS, 0);

      let debugError = 0;

      if (this.dbg.onDebuggerStatement && this.dbg.onError) {
        debugError = 2;
      }
      else if (this.dbg.onError) {
        debugError = 1;
      }

      let debugThrows = 0;
      if (this.dbg.onExceptionUnwind) {
        if (this.stopOnExceptions) {
          debugThrows = 2;
        }
        else
          debugThrows = 1;
      }

      let debuggerStatement = !(this.dbg.onDebuggerStatement == undefined);

      var cfg = {
        breakpoints: this.allBreakpoints,
        watchlist: [],
        scratchpad: this.evalBox.value,
        uiZoomFactor: this.zoomFactor,
        debugError: debugError,
        debugThrows: debugThrows,
        debuggerStatement: debuggerStatement
      };


      cfg.watchlist = [];
      let wl = this.wlTreeView.getWatchList();

      for (let i in wl) {
        if (wl[i] != "@this" && wl[i] != "@global") {
          cfg.watchlist.push(wl[i]);
        }
      }


      var outStr = JSON.stringify(cfg);

      fileStream.write(outStr, outStr.length);
      fileStream.flush();
      fileStream.close();
    }
    catch (ex) {
      this.DEBUG("saveConfig: error " + ex);
    }
  },

  displayMenuDebug: function() {

    // Exception menu entries
    if (this.dbg.onExceptionUnwind == undefined) {
      this.menuNoExc.setAttribute("checked", "true");
      this.menuExcTrace.setAttribute("checked", "false");
      this.menuStopExc.setAttribute("checked", "false");
    }
    else {
      if (!this.stopOnExceptions) {
        this.menuNoExc.setAttribute("checked", "false");
        this.menuExcTrace.setAttribute("checked", "true");
        this.menuStopExc.setAttribute("checked", "false");
      }
      else {
        this.menuNoExc.setAttribute("checked", "false");
        this.menuExcTrace.setAttribute("checked", "false");
        this.menuStopExc.setAttribute("checked", "true");
      }
    }


    // Error menu entries
    if (this.dbg.onError == undefined) {
      this.menuNoErrors.setAttribute("checked", "true");
      this.menuErrorsTrace.setAttribute("checked", "false");
      this.menuStopErrors.setAttribute("checked", "false");
    }
    else if (this.dbg.onError) {
      this.menuNoErrors.setAttribute("checked", "false");
      this.menuErrorsTrace.setAttribute("checked", "true");
      this.menuStopErrors.setAttribute("checked", "false");
    }
    else {
      this.menuNoErrors.setAttribute("checked", "false");
      this.menuErrorsTrace.setAttribute("checked", "false");
      this.menuStopErrors.setAttribute("checked", "true");
    }

    if (this.dbg.onDebuggerStatement == undefined) {
      this.menuStopOnDebugger.setAttribute("checked", "false");
    }
    else {
      this.menuStopOnDebugger.setAttribute("checked", "true");
    }

  },

  displayCtxMenuWl: function() {
    let delItem = document.getElementById("wl_ctx_deleteWatchlist");
    if (this.wlMain.view.selection.getRangeCount() == 0) {
      // nothing selected
      delItem.setAttribute("disabled", "true");
    }
    else if (this.canDeleteWatchList()) {
      delItem.removeAttribute("disabled");
    }
    else {
      delItem.setAttribute("disabled", "true");
    }
  },

  displayCtxMenuSrc: function() {
    let wlItem = document.getElementById("src_ctx_addWl");
    let currSel = this.scriptPanel.selectedPanel.firstChild.contentDocument.getSelection();
    if (currSel && currSel.toString().length > 0) {
      wlItem.removeAttribute("disabled");
    }
    else
      wlItem.setAttribute("disabled", "true");
  },

  watchlistFromSelection: function() {
    this.DEBUG("watchlistFromSelection:");
    var currSel = this.scriptPanel.selectedPanel.firstChild.contentDocument.getSelection();
    if (currSel && currSel.toString().length > 0)
      this.addWatchList(currSel.toString());
  },

  /**
   *  hook that is called from the debugger upon creation of every new script
   */
  newScriptHook: function(script, global) {
    var self = TinyJsd;
    self.DEBUG("newScriptHook");

    function recurFindBreakpoints(s) {
      self.DEBUG("searching in script " + s.url);
      for (let i in self.allBreakpoints) {
        if (s.url == self.allBreakpoints[i].script) {
          self.findNewBreakpoints(s);
        }
      }

      let cs = s.getChildScripts();
      for (let c in cs) {
        recurFindBreakpoints(cs[c]);
      }
    }

    recurFindBreakpoints(script);
  },

  /**
   *  find scripts that could be associated with breakpoint
   *
   *  script: optional script object. If specified, will only check for the
   *          provided script, otherwise all scripts are checked
   */
  findNewBreakpoints: function(script) {
    this.DEBUG("findNewBreakpoints");

    var bp = this.allBreakpoints;

    function trySetBreakpoints(script) {
      try {
        if (!script.url) return;
      }
      catch (ex) {
        return;
      }

      if (script.url.search(URL_OK) < 0) return;

      for (let i in bp) {
        if ((script.url == bp[i].script || script.url.endsWith(bp[i].script)) && bp[i].line >= script.startLine && bp[i].line <= (script.startLine + script.lineCount)) {

          TinyJsd.applyBreakpoint(script, bp[i].line);
        }
      }

      let cs = script.getChildScripts();
      for (let i in cs) {
        trySetBreakpoints(cs[i]);
      }
    }

    if (script) {
      trySetBreakpoints(script);
      return;
    }

    var self = this;

    for (let s in this.allBreakpoints) {

      let scripts = this.dbg.findScripts({
        url: this.allBreakpoints[s].script
      });

      for (let i in scripts) {

        try {
          this.DEBUG("found script: " + scripts[i].url);
        }
        catch (ex) {}

        let scriptFound = false;
        for (let j in this.allBreakpoints) {
          if (this.allBreakpoints[j].script == scripts[i]) {
            scriptFound = true;
            this.DEBUG("breakpoint found");
            break;
          }
        }

        if (scriptFound) continue;

        trySetBreakpoints(scripts[i]);
      }
    }
  },

  checkNewScripts: function() {
    // find all new scripts and add them for displaying
    this.DEBUG("checkNewScripts");

    var foundNewScript = false;

    function gatherAllScripts(script) {

      if (!script.url || (script.url.search(URL_OK) < 0)) return;

      if (script.url.length > 0 && self.scriptStack.indexOf(script.url) < 0) {
        self.scriptStack.push(script.url);
        foundNewScript = true;
      }

      let cs = script.getChildScripts();
      for (let i in cs) {
        gatherAllScripts(cs[i]);
      }
    }

    var self = this;

    let a = this.dbg.findScripts();

    let found = false;
    let prevUrl = null; // speedup: only look at each URL once

    for (let i in a) {
      try {
        if (prevUrl == a[i].url) continue;
      }
      catch (x) {
        continue;
      }

      prevUrl = a[i].url;

      for (let j in this.allObjects) {
        if (this.allObjects[j] == a[i]) {
          found = true;
          break;
        }
      }

      if (!found) {
        gatherAllScripts(a[i]);
      }
    }

    return foundNewScript;
  },


  getTextbox: function() {
    var startPos = this.evalBox.selectionStart;
    var endPos = this.evalBox.selectionEnd;
    var select = this.evalBox.value.substring(startPos, endPos);
    var textbox = this.evalBox.value;
    if (select) textbox = select;
    return textbox;
  },

  repeatChar: function(char, count) {
    count = Math.max(count || 0, 0);
    return new Array(count + 1).join(char);
  },

  padding: function(str, count, char) {
    if (Math.abs(count) <= str.length) {
      return str;
    }
    var m = Math.max((Math.abs(count) - str.length) || 0, 0);
    var pad = Array(m + 1).join(String(char || ' ').charAt(0));
    return (count < 0) ? pad + str : str + pad;
  },

  evaluate: function() {
    var cmd = this.getTextbox();
    this.DEBUG("eval: " + cmd);

    let v;
    if (DEBUG_MODE && this.debuggerModeCheckbox.checked) {
      this.evalCommand(cmd);
    }
    else if (this.scriptStopped) {
      v = this.doDebugEval(cmd);
    }
    else {
      v = this.evalNoContext(cmd);
    }

    let result;

    switch (typeof v) {
      case "number":
      case "string":
      case "boolean":
      case "undefined":
        result = v;
        break;
      case "object":
        switch (v.type) {
          case "exception":
            result = "** compile error **: " + v.message;
            break;
          case "Array":
            result = "[ Array (" + v.length + ") ]";
            break;
          default:
            result = "[ " + v.type + " ]";
        }
        break;
      default:
        result = "[ -" + v.type + "- ]";
    }

    this.appendToResult(result);
    this.updateWatchList();

  },

  runJsUnit: function() {
    try {
      Components.utils.import("resource://jsunit/jsunit-main.jsm");
    }
    catch (ex) {
      this.appendToResult("jsunit Add-on not installed");
      return;
    }

    try {
      JSUnit.executeScript(TinyjsdCommon.getJsUnitMainFile(), false, true);
    }
    catch (ex) {
      this.appendToResult("Exception occurred:\n" + ex.toString());
      this.appendToResult("** Tests aborted **\n");
    }
    JSUnit.printStats();

    try {
      this.updateWatchList();
    }
    catch (x) {}
  },

  createValueGrip: function(aValue) {
    if (aValue === null) return "null";

    let r;
    switch (typeof aValue) {
      case "boolean":
      case "string":
      case "undefined":
        return aValue;
      case "number":
        if (aValue === Infinity) {
          return "Infinity";
        }
        else if (aValue === -Infinity) {
          return "-Infinity";
        }
        else if (Number.isNaN(aValue)) {
          return "NaN";
        }
        else if (!aValue && 1 / aValue === -Infinity) {
          return "-0";
        }
        return aValue;
      case "object":
        r = {
          type: aValue.class,
          props: aValue.getOwnPropertyNames()
        };

        if (aValue.class == "Array" && "length" in r.props) {
          r.length = aValue.getOwnPropertyDescriptor("length").value;
        }
        return r;
      default:
        this.DEBUG("Failed to provide a grip for: " + aValue);
        return "(err)";
    }
  },

  createDbgValue: function(dbgResult) {
    if ("return" in dbgResult) {
      this.DEBUG("createDbgValue: got 'return' value");
      return this.createValueGrip(dbgResult.return);
    }
    else if ("throw" in dbgResult) {
      this.DEBUG("createDbgValue: got 'throw' value");
      let res = {
        type: "exception"
      };
      let prop = dbgResult.throw.getOwnPropertyNames();
      for (let i in prop) {
        res[prop[i]] = dbgResult.throw.getOwnPropertyDescriptor(prop[i]).value;
      }

      return res;
    }

    return null;
  },

  createSandboxValue: function(sandboxResult) {
    let dbgRes;

    if (sandboxResult === null) {
      return "null";
    }

    try {
      let dbgObj = this.dbg.makeGlobalObjectReference(window);
      dbgRes = dbgObj.makeDebuggeeValue(sandboxResult);
    }
    catch (ex) {
      dbgRes = sandboxResult;
    }
    return this.createValueGrip(dbgRes);
  },

  getWlResult: function(cmd) {

    try {
      if (this.evalFrame) {
        let result = this.evalFrame.eval(cmd);
        return this.createDbgValue(result);
      }
      else {
        let sandbox = this.getEvalSandbox();

        try {
          let result = Cu.evalInSandbox(cmd, sandbox, JS_VERSION, "chrome://tinyjsd/content/ui/tinyjsd-eval.js", 1);
          return this.createSandboxValue(result);
        }
        catch (ex) {
          this.DEBUG(ex);
          return {};
        }
      }

    }
    catch (ex) {
      return {
        type: "exception",
        message: ex.toString()
      };
    }
  },

  printProps: function(obj) {
    for (var i in obj) {
      this.appendToResult(i + "\t - " + this.createValueGrip(obj[i]));
    }
  },

  debuggerCommand: function(event) {
    if (event.keyCode == 13 && !event.ctrlKey) {
      event.preventDefault();
      this.performCommand(this.cmdBox.value);
    }
  },

  tab: function(event) {

    if (event.keyCode == 13 && event.ctrlKey) {
      event.preventDefault();
      this.evaluate();
    }

    if (event.keyCode == 9) {
      event.preventDefault();
      var scrollTopPos = this.evalBox.inputField.scrollTop;
      var text = this.evalBox.value;
      var startPos = this.evalBox.selectionStart;
      var endPos = this.evalBox.selectionEnd;
      var currentSelection = text.substring(startPos, endPos);
      var newSelection = "\t";
      var beforeSelection = text.substring(0, startPos);
      var afterSelection = text.substring(endPos, text.length);
      // remove tab (and nothing to insert)
      if (event.shiftKey) {
        beforeSelection = beforeSelection.replace(/(\t| {2}?)$/, "");
        newSelection = "";
        // unindent for selection
        if (currentSelection) {
          TinyJsd.edit('unindent');
          return;
        }
      }
      // indent for selection
      if (currentSelection) {
        TinyJsd.edit('indent');
        return;
      }
      // reassemble, set cursor position, keep scroll position
      this.evalBox.value = beforeSelection + newSelection + afterSelection;
      this.evalBox.selectionStart = this.evalBox.value.length - afterSelection.length;
      this.evalBox.selectionEnd = this.evalBox.value.length - afterSelection.length;
      this.evalBox.inputField.scrollTop = scrollTopPos;
    }
  },

  printThis: function() {
    this.DEBUG("printThis:");
    if (this.scriptStopped) {
      this.printProps(this.debugFrame.thisValue);
    }
  },

  printScope: function() {
    if (this.scriptStopped) {
      this.printProps(this.debugFrame.scope);
    }
  },

  inspectVariable: function(varname) {
    let code = "var ___tinyJsd_i; var ___tinyJsd_r=''; var ___tinyJsd_o=" + varname + ";" +
      "for (___tinyJsd_i in ___tinyJsd_o) {" +
      "try {" +
      "___tinyJsd_r += ___tinyJsd_i+':\\t'+___tinyJsd_o[___tinyJsd_i]+'\\n'" +
      "} catch (ex) { ___tinyJsd_r += ___tinyJsd_i+':\\n' }" +
      '}; ___tinyJsd_r;';
    this.DEBUG("inspectVariable: " + code);
    this.doDebugEval(code);
  },

  performCommand: function(cmdLine) {
    this.DEBUG("performCommand: " + cmdLine);
    cmdLine = cmdLine.replace(/^\s*/, "");
    var cmd = cmdLine.replace(/^(\S+)(\s+)(.*)/, "$1");
    var data = cmdLine.replace(/^\S+\s+/, "");

    this.DEBUG("performCommand: c=" + cmd + "  d=" + data);


    switch (cmd) {
      case "bp":
        this.doSetBreakPoint(data);
        break;
      case "wl":
        this.addWatchList(data);
        break;
      case "this":
        this.printThis();
        break;
      case "i":
        this.inspectVariable(data);
        break;
      case "e":
        this.evalCommand(data);
        break;
      case "scope":
        this.printScope();
        break;
    }
  },

  evalCommand: function(cmd) {
    try {
      let r = eval(cmd);
      this.appendToResult(r);
    }
    catch (ex) {
      this.appendToResult(ex);
    }
  },

  getEvalSandbox: function() {
    if (!this.evalSandbox) {
      this.evalSandbox = new Cu.Sandbox(window, {
        wantComponents: true,
        wantGlobalProperties: ["atob", "btoa", "XMLHttpRequest", "File"],
        sandboxName: "tinyjsdEval"
      });

      // make current window accessible to sandbox
      this.evalSandbox.window = window;
      try {
        Cu.evalInSandbox(
          "var JsdConsole = {}; Components.utils.import('chrome://tinyJsd/content/modules/tinyjsdCommon.jsm', JsdConsole);" +
          "JsdConsole = JsdConsole.JsdConsole;",
          this.evalSandbox, "latest");
      }
      catch (e) {
        this.appendToResult("Error in preparing sandbox: " + e.toString());
        return null;
      }
    }
    return this.evalSandbox;
  },

  evalNoContext: function(cmd) {
    //this.DEBUG("evalNoContext: "+cmd);

    let sandbox = this.getEvalSandbox();
    try {
      let val = Cu.evalInSandbox(cmd, sandbox, JS_VERSION, "chrome://tinyjsd/content/ui/tinyjsd-eval.js", 1);
      return this.createSandboxValue(val);
    }
    catch (ex) {
      return {
        type: "exception",
        message: ex.message + "\n" + ex.stack
      };
    }

  },

  doSetBreakPoint: function(bp) {
    this.DEBUG("doSetBreakPoint: " + bp);

    var line = bp.substr(bp.lastIndexOf(" ") + 1);
    var script = bp.substr(0, bp.lastIndexOf(" "));
    this.setBreakPoint(script, line);
  },

  applyBreakpoint: function(script, line) {
    this.DEBUG("applyBreakpoint: " + script.url + " / " + line);

    let l = line;
    let a = [];
    do {
      a = script.getLineOffsets(l);
      if (a.length > 0) {
        this.DEBUG("applyBreakpoint: file: " + script.url + " - " + l);

        let bp = script.getBreakpoints(a[0]);

        for (let i in bp) {
          if (bp[i] == this.breakpointHook) {
            // breakpoint already set, do nothing
            this.DEBUG("applyBreakpoint: already set");
            return;
          }
        }

        script.setBreakpoint(a[0], this.breakpointHook);
        this.activeBreakpoints.push({
          script: script,
          line: line,
          offset: a[0]
        });

      }
      ++l;
    }
    while (a.length == 0 && l <= script.lineCount + script.startLine);

  },

  getBreakpoint: function(filename, line, delta) {
    this.DEBUG("getBreakpoint: " + filename + " / " + line);

    if (!delta) delta = 0;

    for (let i = 0; i < this.allBreakpoints.length; i++) {
      if (this.allBreakpoints[i] && this.allBreakpoints[i].script == filename && Math.abs(this.allBreakpoints[i].line - line) <= delta) {
        return this.allBreakpoints[i];
      }
    }

    if (!delta) {
      return this.getBreakpoint(filename, line, 10);
    }
    return null;
  },

  /**
   * go through all scripts and apply function actionFunc(script) to the script
   */
  traverseAllScripts: function(actionFunc) {

    function getAllScripts(script, f) {
      try {
        f(script);
        let cs = script.getChildScripts();
        for (let i in cs) {
          getAllScripts(cs[i], f);
        }
      }
      catch (ex) {}
    }

    let a = this.dbg.findScripts();
    for (let i in a) {
      getAllScripts(a[i], actionFunc);
    }
  },


  setBreakPoint: function(script, line, cond) {
    this.DEBUG("setBreakPoint: " + line + " @ " + script);

    this.traverseAllScripts(
      function _set_Bp(s) {
        try {
          if (typeof(s.url) != "string") return;

          if ((s.url == script || s.url.endsWith(script)) && line >= s.startLine && line <= (s.startLine + s.lineCount)) {

            TinyJsd.applyBreakpoint(s, line);
          }
        }
        catch (ex) {}
      });

    this.allBreakpoints.push({
      script: script,
      line: line,
      conditions: cond
    });

    var scriptShort = script;
    if (scriptShort.lastIndexOf("/") > 0) {
      scriptShort = scriptShort.substr(scriptShort.lastIndexOf("/") + 1);
    }

    this.bpBox.appendItem(scriptShort + ": " + line, line + "@" + script);

    var sourceBox = this.getSourceBox(script);
    if (sourceBox) {
      this.DEBUG("setBreakPoint: sourceBox found");
      let l = sourceBox.contentDocument.getElementById("l" + line);
      if (l) {
        let node = l.firstChild;
        node.setAttribute("b", "t");
        node.firstChild.data = " B ";
      }
    }
  },

  deleteSelectedBreakpoints: function() {
    var deleteItems = [];
    for (let sel = 0; sel < this.bpBox.selectedItems.length; sel++) {
      this.DEBUG("deleteSelectedBreakpoints: sel: " + sel);

      let item = this.bpBox.getSelectedItem(sel);
      let line = item.value.substr(0, item.value.indexOf("@"));
      let file = unescape(item.value.substr(item.value.indexOf("@") + 1));
      this.DEBUG("onDeleteBreakpoint: " + file + "/" + line + ".");
      if (item.getAttribute("script") != "") {
        deleteItems.push({
          file: unescape(item.getAttribute("script")),
          line: line
        });
      }
      deleteItems.push({
        file: file,
        line: line
      });
    }

    for (let i = 0; i < deleteItems.length; i++) {
      this.deleteBreakPoint(deleteItems[i].file, deleteItems[i].line);
    }
  },

  deleteAllBreakpoints: function() {
    var deleteItems = [];
    for (var n = 0; n < this.bpBox.itemCount; n++) {
      let item = this.bpBox.getItemAtIndex(n);
      let line = item.value.substr(0, item.value.indexOf("@"));
      let file = unescape(item.value.substr(item.value.indexOf("@") + 1));
      this.DEBUG("onDeleteBreakpoint: " + file + "/" + line + ".");
      if (item.getAttribute("script") != "") {
        deleteItems.push({
          file: unescape(item.getAttribute("script")),
          line: line
        });
      }
      deleteItems.push({
        file: file,
        line: line
      });
    }

    for (var i in deleteItems) {
      this.deleteBreakPoint(deleteItems[i].file, deleteItems[i].line);
    }
  },

  onDeleteBreakpoint: function(event) {
    this.DEBUG("onDeleteBreakpoint: keyCode: " + event.keyCode);
    if (event.keyCode == 46) {
      // Delete key
      event.preventDefault();
      this.deleteSelectedBreakpoints();
    }
  },

  getSourceBox: function(inFile) {
    var file = escape(inFile);
    this.DEBUG("getSourceBox: " + file);
    var sourceBox = document.getElementById("src_" + file);

    if (!sourceBox) {
      file = this.getScriptName(file);
      var s = document.getElementsByTagName("iframe");
      for (let i in s) {
        if (s[i].id && s[i].id.startsWith("src_") && s[i].id.endsWith("/" + file)) {
          sourceBox = s[i];
          break;
        }
      }
    }
    return sourceBox;
  },

  deleteBreakPoint: function(file, line) {
    this.DEBUG("deleteBreakpoint: " + file + "/" + line);
    let fileName = file;
    let i;

    if (line >= 0) {
      var sourceBox = this.getSourceBox(fileName);
      if (sourceBox) {
        let l = sourceBox.contentDocument.getElementById("l" + line);
        if (l) {
          let node = l.firstChild;
          node.removeAttribute("b");
          node.firstChild.data = "   ";
        }
      }
    }

    let clearedScripts = [];

    let bp = this.activeBreakpoints;
    for (i = 0; i < bp.length; i++) {
      if (bp[i] && bp[i].script.url == fileName && bp[i].line == line) {
        this.DEBUG("clearing bp " + fileName + " / " + line + " / " + bp[i].offset);

        // Gecko 31: script.clearBreakpoint(handler, offset) doesn't work
        bp[i].script.clearAllBreakpoints();
        bp[i] = null;
      }
    }

    for (i = 0; i < this.allBreakpoints.length; i++) {
      if ((this.allBreakpoints[i].script == fileName ||
          unescape(this.allBreakpoints[i].script) == fileName) && (line == -1 || this.allBreakpoints[i].line == line)) {
        this.allBreakpoints[i] = null;
      }
    }

    i = 0;
    do {
      if (this.allBreakpoints[i] === null) {
        this.allBreakpoints.splice(i, 1);
        continue;
      }
      ++i;
    } while (i < this.allBreakpoints.length);

    i = 0;
    do {
      if (this.activeBreakpoints[i] === null) {
        this.activeBreakpoints.splice(i, 1);
        continue;
      }
      ++i;
    } while (i < this.activeBreakpoints.length);


    // re-add all breakpoints that were not deleted
    bp = this.activeBreakpoints;
    for (let j in bp) {
      if (clearedScripts[bp[j].script.url]) {
        this.DEBUG(" - re-added " + bp[j].script.url + " / " + bp[j].offset);
        bp[j].script.setBreakpoint(bp[j].offset, this.breakpointHook);
      }
    }

    let deleteArr = [];
    for (let i = 0; i < this.bpBox.itemCount; i++) {
      let item = this.bpBox.getItemAtIndex(i);
      if (item.value == line + "@" + fileName ||
        unescape(item.value) == line + "@" + fileName) deleteArr.push(item);
    }

    for (let i in deleteArr) {
      this.bpBox.removeItemAt(this.bpBox.getIndexOfItem(deleteArr[i]));
    }
  },

  addWatchList: function(wl) {
    this.DEBUG("addWatchList: " + wl);
    this.wlTreeView.appendWatch(wl);

    this.updateWatchList();

  },

  deleteSubTree: function(item) {
    let obj = item.firstChild.nextSibling;
    while (obj) {
      item.removeChild(obj);
      obj = item.firstChild.nextSibling;
    }

  },

  updateWatchList: function() {
    this.wlTreeView.updateAll();
  },


  wlHandleDblClick: function(event) {
    return;
  },

  onDeleteWatchList: function(event) {
    this.DEBUG("onDeleteWatchList: keyCode: " + event.keyCode);
    if (event.keyCode == 46) {
      // Delete selected item
      event.preventDefault();
      this.deleteSelectedWatchList();
    }
  },

  canDeleteWatchList: function() {

    var canDelete = false;
    var wlList = this.wlMain.view;

    var removeList = [];
    var rangeCount = wlList.selection.getRangeCount();
    for (let i = 0; i < rangeCount; i++) {
      var start = {};
      var end = {};
      wlList.selection.getRangeAt(i, start, end);
      for (var c = start.value; c <= end.value; c++) {
        if (this.wlTreeView.canDelete(c)) {
          canDelete = true;
        }
      }
    }

    return canDelete;
  },

  deleteSelectedWatchList: function() {
    var wlList = this.wlMain.view;

    var removeList = [];
    var rangeCount = wlList.selection.getRangeCount();
    for (let i = 0; i < rangeCount; i++) {
      var start = {};
      var end = {};
      wlList.selection.getRangeAt(i, start, end);
      for (var c = start.value; c <= end.value; c++) {
        removeList.push(c);
      }
    }

    this.wlTreeView.deleteItems(removeList);
  },

  deleteAllWatchList: function() {
    this.wlTreeView.deleteAllItems();
  },

  scriptsHandleDblClick: function(event) {
    this.DEBUG("scriptsHandleDblClick:");

    var listElem = event.originalTarget;
    event.stopPropagation();
    this.loadScript(listElem.value, -1, false);
  },

  scriptsOpenFile: function() {
    for (let sel = 0; sel < this.scriptsList.selectedItems.length; sel++) {
      let item = this.scriptsList.getSelectedItem(sel);
      let file = unescape(item.value);
      this.loadScript(file, -1, false);
    }
  },

  addWatchlist: function() {
    let promptSvc = Cc["@mozilla.org/embedcomp/prompt-service;1"].getService(Ci.nsIPromptService);
    let we = {
      value: ""
    };
    let dummy = {};

    let res = promptSvc.prompt(window,
      this.getString("watchExpression.prompt.title"),
      this.getString("watchExpression.prompt.message"),
      we,
      null,
      dummy);
    if (res) {
      if (we.value && we.value.length > 0) {
        this.addWatchList(we.value);
      }
    }
  },

  bpHandleDblClick: function(event) {
    this.DEBUG("bpHandleDblClick:");

    var listElem = event.originalTarget;
    event.stopPropagation();
    var script;
    var file = listElem.value.substr(listElem.value.indexOf("@") + 1);
    var line = listElem.value.substr(0, listElem.value.indexOf("@"));

    if (file.search(URL_OK) < 0) {
      for (script in this.scriptStack) {
        if (script.endsWith("/" + file)) {
          this.loadScript(script, line, false);
          return;
        }
      }

      window.alert(this.getString("fileNotFound", file));
    }
    else {
      this.loadScript(file, line, false);
    }
  },

  stackHandleDblClick: function(event) {
    var listElem = event.originalTarget;
    event.stopPropagation();
    this.changeDebugContext(listElem);
  },

  stackSetContext: function() {
    for (let sel = 0; sel < this.stackBox.selectedItems.length; sel++) {
      let item = this.stackBox.getSelectedItem(sel);
      this.changeDebugContext(item);
      break;
    }

  },

  changeDebugContext: function(listElem) {
    this.clearHighlight();
    var lineNum = listElem.getAttribute("lineNum");
    this.loadScript(listElem.value, lineNum, true);

    let stackItem = listElem.getAttribute("stackItem");
    let frme = this.debugFrame;
    let i = 0;
    while (frme) {
      if (i == stackItem) {
        this.evalFrame = frme;
        this.updateWatchList();
        return;
      }
      frme = frme.older;
      i++;
    }
  },

  checkBreakpoints: function() {
    // check if any future breakpoints can be turned into a real one

    let script, line;

    function _set_Bp(s) {
      try {
        if (typeof(s.url) != "string") return;
        if ((s.url == script || s.url.endsWith(script)) && line >= s.startLine && line <= (s.startLine + s.lineCount)) {

          TinyJsd.applyBreakpoint(s, line);
        }
      }
      catch (ex) {}
    }

    for (let j in this.allBreakpoints) {
      // try to activate any breakpoints
      script = this.allBreakpoints[j].script;
      line = this.allBreakpoints[j].line;

      this.traverseAllScripts(_set_Bp);
    }
  },

  onStepInto: function(currFrame) {
    this.DEBUG("onStepInto: " + this.lastLine + " - " + this.getFrameLine(currFrame));
    if (this.lastLine != this.getFrameLine(currFrame) || this.debugFrame != currFrame) {
      return this.doStop(currFrame, "step-into");
    }
    else
      return undefined;
  },

  onStepOver: function(currFrame) {
    this.DEBUG("onStepOver: " + this.lastLine + " - " + this.getFrameLine(currFrame) + " / " + (this.debugFrame == currFrame));
    if (this.debugFrame == currFrame && this.lastLine != this.getFrameLine(currFrame)) {
      return this.doStop(currFrame, "step-over");
    }
    else
      return undefined;
  },

  debuggerSteps: {
    handleStepOver: function() {
      try {
        return TinyJsd.onStepOver(this); //
      }
      catch (ex) {
        TinyJsd.DEBUG("step over: ex=" + ex.toString());
        return undefined;
      }
    },

    handleStepInto: function() {
      try {
        return TinyJsd.onStepInto(this); //
      }
      catch (ex) {
        TinyJsd.DEBUG("step into: ex=" + ex.toString());
        return undefined;
      }
    },

    handleStepOut: function() {
      TinyJsd.DEBUG("handleStepOut");
      return TinyJsd.doStop(this, "step-out");
    },

    removeStops: function() {
      TinyJsd.DEBUG("removeStops");
      this.onStep = undefined;
      this.onResume = undefined;
      this.onPop = undefined;
      TinyJsd.dbg.onEnterFrame = undefined;
    },

    handleNewFrame: function(frame) {
      TinyJsd.DEBUG("handleNewFrame: " + frame.script.url);
      if (frame.script.url.indexOf("/tinyjsd/") >= 0) {
        TinyJsd.DEBUG("handleNewFrame: ignoring TinyJsd");
        return null;
      }
      return TinyJsd.doStop(frame, "new-frame");
    }
  },

  doStop: function(frame, type) {
    this.DEBUG("doStop: " + type + " / " + frame.offset);

    // return if we're already debugging (this means we're called from a different
    // thread)
    if (this.scriptStopped) return undefined;

    if (type.search(/^(breakpoint|exception|error|debug-statement)$/) < 0 && this.stepMode == NO_STEP_MODE) {
      this.DEBUG("doStop -- detected continue");
      frame.onStep = undefined;
      frame.onResume = undefined;
      frame.onPop = undefined;
      return undefined;
    }

    try {
      this.debugFrame = frame;
      this.evalFrame = frame;
      //this.lastCallCount = frame.script.callCount;
      //this.scriptTag = frame.script.tag;
      this.lastLine = this.getFrameLine(frame);
      this.stackSize = frame.depth;
      this.scriptStopped = true;
      this.setContButton(this.scriptStopped);
      this.displaySourceCode();
      this.printStack();
      this.updateWatchList();

      this.inspector.enterNestedEventLoop({
        value: 0
      });
      // execution of debugged object waits here

      this.clearHighlight();
      this.clearStack();

      var self = this;

      if (this.stepMode == STEP_OVER) {
        frame.onStep = this.debuggerSteps.handleStepOver;
        this.dbg.onEnterFrame = undefined;
        if (frame.older) {
          frame.older.onResume = this.debuggerSteps.handleStepOut;
          frame.older.onStep = this.debuggerSteps.handleStepOut;
        }
      }
      else if (this.stepMode == STEP_INTO) {
        frame.onStep = this.debuggerSteps.handleStepInto;
        this.dbg.onEnterFrame = this.debuggerSteps.handleNewFrame;
        if (frame.older) {
          frame.older.onResume = this.debuggerSteps.handleStepOut;
          frame.older.onStep = this.debuggerSteps.handleStepOut;
        }
      }
      else if (this.stepMode == STEP_OUT) {
        frame.onStep = undefined;
        this.dbg.onEnterFrame = undefined;
        if (frame.older) {
          frame.older.onResume = this.debuggerSteps.handleStepOut;
          frame.older.onStep = this.debuggerSteps.handleStepOut;
        }
      }
      else {
        // stepMode == NO_STEP_MODE
        this.evalFrame = null;
        frame.onStep = undefined;
        frame.onResume = undefined;
        frame.onPop = undefined;

        if (frame.older) {
          frame.older.onPop = this.debuggerSteps.removeStops;
        }
        this.updateWatchList();
      }

      frame.onPop = this.debuggerSteps.removeStops;
    }
    catch (e) {
      this.DEBUG("doStop: error " + e.toString());
      this.DEBUG("doStop: error " + e.stack);
    }

    return undefined;
  },


  enterDebugMode: function() {
    this.myWindow.focus();
    this.myWindow.getAttention();
  },

  leaveDebugMode: function() {
    this.scriptStopped = false;
    this.setContButton(false);
    this.inspector.exitNestedEventLoop();
  },

  edit: function(val) {
    var scrollTopPos = this.evalBox.inputField.scrollTop;
    var selections;
    var text = this.evalBox.value;
    if (text.length < 1) return;
    var startPos = this.evalBox.selectionStart;
    var endPos = this.evalBox.selectionEnd;
    var selection = this.evalBox.value.substring(startPos, endPos);
    var newsel = "";
    if (!selection) {
      alert(this.getString("selectText"));
      return;
    }
    if (val == 'indent') {
      selections = selection.split("\n");
      for (let i = 0; i < selections.length; i++) {
        let part = selections[i];
        newsel += "\t" + part + "\n";
      }
      newsel = newsel.substring(0, newsel.length - 1);
    }
    if (val == 'unindent') {
      selections = selection.split("\n");
      for (let i = 0; i < selections.length; i++) {
        let part = selections[i];
        part = part.replace(/^(\t| {2}?)/, "");
        newsel += part + "\n";
      }
      newsel = newsel.substring(0, newsel.length - 1); // remove last newline
    }
    if (val == '//') {
      selections = selection.split("\n");
      var vMatch = selection.match(/^\s*\/\/\s?/);
      if (vMatch) {
        for (let i = 0; i < selections.length; i++) {
          let part = selections[i];
          vMatch = null;
          vMatch = part.match(/^\s*\/\/\s?/);
          if (vMatch)
            part = part.replace(/\/\/\s?/, "");
          newsel += part + "\n";
        }
        newsel = newsel.substring(0, newsel.length - 1); // remove last newline
      }
      else {
        for (let i = 0; i < selections.length; i++) {
          let part = selections[i];
          vMatch = null;
          vMatch = part.match(/^\s*/);
          part = part.replace(vMatch, vMatch + "// ");
          newsel += part + "\n";
        }
        newsel = newsel.substring(0, newsel.length - 1);
      }
    }
    if (val == 'breaks') {
      newsel = selection.replace(/{/g, "{\n");
      newsel = newsel.replace(/}/g, "\n}\n");
      newsel = newsel.replace(/;/g, ";\n");
    }
    if (val == 'unbreaks') {
      newsel = selection.replace(/\n|\r|\f/g, "");
    }
    if (val == 'enc') {
      newsel = encodeURIComponent(selection);
    }
    if (val == 'dec') {
      newsel = decodeURIComponent(selection);
    }
    var firstpart = text.substring(0, startPos);
    var lastpart = text.substring(endPos, text.length);
    this.evalBox.value = firstpart + newsel + lastpart;
    // set cursor
    this.evalBox.selectionStart = firstpart.length;
    this.evalBox.selectionEnd = this.evalBox.value.length - lastpart.length;
    this.evalBox.inputField.scrollTop = scrollTopPos;
  },

  wrap: function() {
    var textbox = encodeURIComponent(this.evalBox.value);
    textbox = decodeURIComponent(textbox);
    textbox = decodeURIComponent(textbox);
    textbox = "javascript:(function(){" + encodeURIComponent(textbox) + "})();";
    this.evalBox.value = textbox;
  },

  unwrap: function() {
    var textbox = encodeURIComponent(this.evalBox.value);
    textbox = decodeURIComponent(textbox);
    textbox = decodeURIComponent(textbox);
    textbox = textbox.replace(/javascript:\s*\(\s*function\s*\(\s*\)\s*{\s*/i, "");
    textbox = textbox.replace(/\s*}\s*\)\s*\(\s*\)\s*;\s*$/i, "");
    this.evalBox.value = textbox;
  },

  getString: function(arg, param) {

    try {
      if (!this.stringBundle) this.getStringBundle();

      if (param) {
        if (typeof(param) == "string") {
          return this.stringBundle.formatStringFromName(arg, [param], 1);
        }
        else
          return this.stringBundle.formatStringFromName(arg, param, param.length);
      }
      else {
        return this.stringBundle.GetStringFromName(arg);
      }
    }
    catch (ex) {
      this.DEBUG("Error in querying stringBundleService for string '" + arg + "': " + ex);
    }

    return "";
  },

  scrollToLine: function(line) {
    var lines = this.evalBox.value.split("\n");
    var lineHeight = this.evalBox.inputField.scrollHeight / lines.length;
    if (lines && lines[line - 1]) {
      try {
        var lineLength = lines[line - 1].length;
        var startPos = this.evalBox.selectionStart;
        var endPos = this.evalBox.selectionEnd;
        var selection = this.evalBox.value.substring(startPos, endPos);
        if (selection) {
          lineLength = selection.split("\n")[line - 1].length;
        }
        else startPos = 0;
        this.evalBox.focus();
        this.evalBox.inputField.scrollTop = (lineHeight * line) - lineHeight;
        if (selection)
          this.evalBox.inputField.scrollTop = (lineHeight *
            (line - 1 + this.evalBox.value.substring(0, startPos).split("\n").length)
          ) - lineHeight;
        for (var i = 0; i < line - 1; i++) {
          startPos += lines[i].length + 1;
        }
        endPos = startPos + lineLength + 1;
        this.evalBox.selectionStart = startPos;
        this.evalBox.selectionEnd = endPos;
      }
      catch (e) {}
    }
  },

  appendToResult: function(str) {
    var resultBox = document.getElementById('tinyjsd-textbox-result');
    resultBox.value += str + "\n";
  },

  doDebugEval: function(cmd) {
    if (this.debugFrame) {
      var doCmd = "let _TinyJsd = {}; Components.utils.import('chrome://tinyJsd/content/modules/tinyjsdCommon.jsm', _TinyJsd);\n";
      doCmd += "let JsdConsole = _TinyJsd.JsdConsole;\n";
      doCmd += cmd + ";\n";

      try {
        let cmdRes = this.evalFrame.eval(doCmd);
        return this.createDbgValue(cmdRes);

      }
      catch (ex) {
        this.DEBUG("doDebugEval: " + ex);
        return {
          type: "exception",
          message: ex.message + "\n" + ex.fileName + ": Line " + ex.lineNumber + "\n" + ex.stack
        };
      }
    }
    else
      this.appendToResult("** not in debug mode **");

    return "";
  },

  clearResults: function() {
    let res = document.getElementById("tinyjsd-textbox-result");
    res.value = "";
  },

  setContButton: function(stopped) {
    if (stopped) {
      this.bcEnableSteps.setAttribute("disabled", "false");
    }
    else
      this.bcEnableSteps.setAttribute("disabled", "true");
  },

  debugCont: function() {
    this.DEBUG("debugCont:");
    this.stepMode = NO_STEP_MODE;
    this.leaveDebugMode();
  },

  debugStepInto: function() {
    this.DEBUG("debugStepInto:");
    this.stepMode = STEP_INTO;
    this.leaveDebugMode();
  },

  debugStepOver: function() {
    this.DEBUG("debugStepOver:");
    this.stepMode = STEP_OVER;
    this.leaveDebugMode();
  },

  debugStepOut: function() {
    this.DEBUG("debugStepOut:");
    this.stepMode = STEP_OUT;
    this.leaveDebugMode();
  },

  getStackSize: function(scriptFrame) {
    let frame = scriptFrame;
    let stackSize = 0;
    while (frame) {
      ++stackSize;
      frame = frame.callingFrame;
    }
    return stackSize;
  },

  getScriptName: function(filename) {
    var i = filename.lastIndexOf("/");
    if (i < 0) return filename;

    return filename.substr(i + 1);
  },

  onCloseButton: function(script) {
    this.DEBUG("onCloseButton: script=" + script);
    var tab = document.getElementById("tab_" + script);
    var pnl = document.getElementById("pnl_" + script);
    var dispTab = null;
    if (tab.previousSibling) {
      dispTab = tab.previousSibling;
    }
    else if (tab.nextSibling) {
      dispTab = tab.nextSibling;
    }
    this.scriptPanel.removeChild(pnl);
    this.scriptTabs.removeChild(tab);

    if (dispTab) {
      this.showTab(this.scriptTabs.getIndexOfItem(dispTab));
    }
    else {
      this.sourceVisible.setAttribute("disabled", "true");
    }
  },

  onSelectButton: function(script) {
    this.DEBUG("onSelectButton: script=" + script);
    var tab = document.getElementById("tab_" + script);
    var idx = this.scriptTabs.getIndexOfItem(tab);
    this.showTab(idx);
  },

  showTab: function(index) {
    this.scriptPanel.selectedIndex = index;

    for (var i = 0; i < this.scriptTabs.childNodes.length; ++i) {
      let tb = this.scriptTabs.childNodes[i];
      tb.selected = false;
      tb.removeAttribute("selected");
      tb.removeAttribute("beforeselected");
      tb.removeAttribute("afterselected");
    }

    let tab = this.scriptTabs.childNodes[index];
    tab.selected = true;
    tab.setAttribute("selected", "true");
    if (tab.previousSibling)
      tab.previousSibling.setAttribute("beforeselected", "true");
    if (tab.nextSibling)
      tab.nextSibling.setAttribute("afterselected", "true");

    this.scriptTabs.selectedItem = tab;

    this.sourceVisible.setAttribute("disabled", "false");
  },

  onSourceCodeClick: function(event) {
    this.DEBUG("onSourceCodeClick:");

    if (event.button == 0) {
      // left mouse button
      if (event.originalTarget.localName == "margin") {
        event.stopPropagation();
        var line = event.originalTarget.parentNode;
        var lineNum = Number(line.id.substr(1));
        var scriptFullName = this.scriptTabs.selectedItem.id.substr(4);
        var scriptName = unescape(scriptFullName);

        this.DEBUG("onSourceCodeClick: scriptName = " + scriptName);
        var scriptShort = scriptName;
        if (scriptName.indexOf("/") >= 0) {
          scriptShort = scriptName.substr(scriptName.lastIndexOf("/") + 1);
        }

        var found = false;
        for (var b in (this.allBreakpoints)) {
          this.DEBUG("onSourceCodeClick: eval " + b);
          if ((this.allBreakpoints[b].script == scriptName) ||
            (this.allBreakpoints[b].script == scriptShort)) {
            this.DEBUG("onSourceCodeClick: found file " + scriptShort);
            if (this.allBreakpoints[b].line == lineNum) {
              this.DEBUG("onSourceCodeClick: remove Breakpoint at line " + lineNum);
              // delete: search for short and long name
              this.deleteBreakPoint(scriptShort, lineNum);
              this.deleteBreakPoint(scriptName, lineNum);
              found = true;
            }
          }
        }

        if (!found) {
          this.DEBUG("onSourceCodeClick: add bp " + lineNum);
          this.setBreakPoint(scriptName, lineNum);
        }
      }
    }
  },

  zoomOut: function() {
    this.DEBUG("zoomOut");
    // reduce text size
    this.zoomFactor -= 0.05;
    this.setZoomLevel();
  },

  zoomIn: function() {
    this.DEBUG("zoomIn");
    this.zoomFactor += 0.05;
    this.setZoomLevel();
  },

  zoomReset: function() {
    this.DEBUG("zoomReset");
    this.zoomFactor = 1.0;
    this.setZoomLevel();
  },

  setZoomLevel: function() {
    let i;
    for (i = 0; i < this.scriptTabs.childNodes.length; ++i) {
      let box = "src_" + TinyJsd.scriptTabs.childNodes[i].id.substr(4);
      let s = document.getElementById(box);
      let contViewer = s.docShell.contentViewer;
      try {
        // Gecko <= 33
        let docView = contViewer.QueryInterface(Ci.nsIMarkupDocumentViewer);
        docView.fullZoom = this.zoomFactor;
      }
      catch (ex) {
        // Gecko >= 34
        contViewer.fullZoom = this.zoomFactor;
      }
    }
  },

  findString: function() {

    let promptSvc = Cc["@mozilla.org/embedcomp/prompt-service;1"].getService(Ci.nsIPromptService);

    let res = promptSvc.prompt(window,
      this.getString("findString.prompt.title"),
      this.getString("findString.prompt.message"),
      this.findStr,
      this.getString("findString.prompt.matchCase"),
      this.findMatchCase);
    if (!res) return;

    if (!this.findService) {
      this.findService = Cc["@mozilla.org/embedcomp/find;1"].createInstance(Ci.nsIWebBrowserFind);
      this.findService.wrapFind = true;
    }

    let currWindow = this.scriptPanel.selectedPanel.firstChild.contentWindow;
    let frameSetter = this.findService.QueryInterface(Ci.nsIWebBrowserFindInFrames);
    frameSetter.rootSearchFrame = currWindow;
    frameSetter.currentSearchFrame = currWindow;

    this.findService.searchString = this.findStr.value;
    this.findService.matchCase = this.findMatchCase.value;
    this.findService.findNext();
  },

  findAgain: function() {
    if (this.findService) {
      let currWindow = this.scriptPanel.selectedPanel.firstChild.contentWindow;
      let frameSetter = this.findService.QueryInterface(Ci.nsIWebBrowserFindInFrames);
      frameSetter.rootSearchFrame = currWindow;
      frameSetter.currentSearchFrame = currWindow;

      this.findService.findNext();
    }
  },

  getFrameLine: function(frame) {
    try {
      return frame.script.getOffsetLocation(frame.offset).lineNumber;
    }
    catch (x) {
      return frame.script.getOffsetLine(frame.offset);
    }
  },

  displaySourceCode: function() {
    this.DEBUG("displaySourceCode: script: " + this.getFrameLine(this.debugFrame));
    this.loadScript(this.debugFrame.script.url,
      this.getFrameLine(this.debugFrame),
      true);

  },

  loadScript: function(scriptName, currLine, isCurrentFile) {
    this.DEBUG("loadScript: scriptName = " + scriptName);
    this.DEBUG("loadScript: shortScript = " + this.getScriptName(scriptName));

    var self = this;
    var countTries = 0;
    var escScriptName = escape(scriptName);

    var sourceBox = document.getElementById("src_" + escScriptName);
    if (!sourceBox) {
      var tabpanel = document.createElement('tabpanel');
      tabpanel.setAttribute("id", "pnl_" + escScriptName);

      sourceBox = document.createElement('iframe');
      sourceBox.setAttribute("flex", "1");
      sourceBox.setAttribute("showcaret", "true");
      sourceBox.setAttribute("id", "src_" + escScriptName);
      sourceBox.setAttribute("context", "sourcecode_contextMenu");
      sourceBox.addEventListener("click",
        function(event) {
          TinyJsd.onSourceCodeClick(event);
        },
        false);

      this.DEBUG("loadScript: ready for display");

      var tab = document.createElement('tab');
      tab.setAttribute("id", "tab_" + escScriptName);

      var label = document.createElement("label");
      tab.label = label;
      label.setAttribute("value", this.getScriptName(scriptName));
      label.setAttribute("crop", "center");
      label.setAttribute("flex", "1");
      label.addEventListener("click",
        function(event) {
          TinyJsd.onSelectButton(escScriptName);
        },
        false);
      tab.appendChild(label);

      var closeButton = document.createElement("image");
      closeButton.setAttribute("class", "tab-close-button");
      closeButton.addEventListener("click",
        function(event) {
          TinyJsd.onCloseButton(escScriptName);
        },
        false);

      tab.appendChild(closeButton);

      this.scriptTabs.appendChild(tab);
      tabpanel.appendChild(sourceBox);
      this.scriptPanel.appendChild(tabpanel);
      var idx = this.scriptTabs.getIndexOfItem(tab);
      this.showTab(idx);
    }
    else {
      this.onSelectButton(escScriptName);
    }

    var domW = sourceBox.contentWindow; // that's a DOM Window (nsIDOMWindow)

    var lineCount = -1;
    var url = scriptName;

    function scrollFunc(lineCount, fileAlreadyOpen) {
      // self.DEBUG("displaySourceCode: scrollFunc: "+lineCount+" / "+currLine);
      if (!fileAlreadyOpen && domW.scrollMaxY == 0) {
        if (++countTries > 20) return;
        TinyjsdCommon.setTimeout(function _f() {
          scrollFunc(lineCount);
        }, 100);
      }
      //self.DEBUG("scroll: "+domW.scrollMaxY+" / "+lineCount);

      self.setZoomLevel();
      let s = sourceBox.contentDocument.getElementById("source-listing");
      if (s) {
        s.setAttribute("lineCount", lineCount);
        s.setAttribute("currLine", currLine);
      }
      else
        self.DEBUG("scroll: s is undefined");

      if (currLine >= 0) {
        let l = sourceBox.contentDocument.getElementById("l" + currLine);
        if (l) {
          self.DEBUG("highlighting curr line");
          if (isCurrentFile) l.setAttribute("stoppedAt", "true");
          var parent = l.offsetParent;
          if ((l.clientHeight * currLine < parent.scrollTop) ||
            (l.clientHeight * (currLine - 1) > parent.scrollTop + parent.clientHeight)) {

            let li = sourceBox.contentDocument.getElementById("l" + Math.max(currLine - 3, 1));
            li.scrollIntoView(true);
          }
        }
        else
          self.DEBUG("scroll: l is undefined");
      }

      for (let i = 0; i < self.allBreakpoints.length; i++) {
        if ((url == self.allBreakpoints[i].script) || (url.endsWith("/" + self.allBreakpoints[i].script))) {
          let l = sourceBox.contentDocument.getElementById("l" + self.allBreakpoints[i].line);
          if (l) {
            let node = l.firstChild;
            node.setAttribute("b", "t");
            node.firstChild.data = " B ";
          }
        }
      }
    }

    let jpUrl = TinyjsdCommon.resolveJetpackPath(url);
    this.DEBUG("url: " + unescape(sourceBox.webNavigation.currentURI.path) + " <-> " + jpUrl);

    if (unescape(sourceBox.webNavigation.currentURI.path) == TinyjsdCommon.resolveJetpackPath(url)) {
      this.DEBUG("detected same url: " + sourceBox.contentDocument.getElementById("source-listing").getAttribute("lineCount"));

      let s = sourceBox.contentDocument.getElementById("source-listing");
      let lineCount = s.getAttribute("lineCount");
      this.clearStoppedAt(sourceBox);
      scrollFunc(lineCount, true);
      return;
    }

    this.DEBUG("loading url");

    domW.scrollMaxY = 0;
    let wn = sourceBox.webNavigation;
    TinyjsdCommon.registerCb(scrollFunc);
    wn.loadURI("tinyjsd:" + escape(url), 0, null, null, null);
  },


  clearStoppedAt: function(iframe) {
    let s = iframe.contentDocument.getElementById("source-listing");
    if (!s) return;
    let lastLine = s.getAttribute("currLine");
    let l = iframe.contentDocument.getElementById("l" + lastLine);
    if (!l) return;
    l.removeAttribute("stoppedAt");
  },

  clearHighlight: function() {
    this.DEBUG("clearStack");
    var srcBox = this.getSourceBox(this.evalFrame.script.url);
    if (srcBox)
      this.clearStoppedAt(srcBox);
  },

  clearStack: function() {
    while (this.stackBox.itemCount > 0) {
      this.stackBox.removeItemAt(0);
    }
  },

  printStack: function() {
    if (!this.debugFrame) return;
    this.DEBUG("printStack");

    try {
      this.clearStack();
      let i = 0;
      let frme = this.debugFrame;
      while (frme) {
        var e = this.stackBox.appendItem(this.getScriptName(frme.script.url) + ": " + this.getFrameLine(frme),
          frme.script.url);
        e.setAttribute("lineNum", this.getFrameLine(frme));
        e.setAttribute("stackItem", i);
        frme = frme.older;
        i++;
      }
    }
    catch (ex) {
      this.DEBUG("print-stack error: " + ex.toString());
    }
  },

  printError: function(message, fileName, line, pos, exception) {

    this.appendToResult(this.getString("formattedErrorMessage", [fileName, line]));
    this.appendToResult(message);
  },

  reportDebuggerException: function(ex) {
    this.appendToResult("Debugger error: " + ex.toString());
    this.appendToResult("  Stack: " + ex.stack);
  },

  printException: function(frame, value) {
    this.appendToResult(this.getString("formattedExceptionMessage", [frame.script.url, this.getFrameLine(frame)]));

    let desc = "";
    try {
      let name = TinyjsdCommon.getProperty(value, "name");
      let msg = TinyjsdCommon.getProperty(value, "message");

      desc += "Error name: " + name + "\n";
      desc += "Error message: " + msg + "\n";
      this.appendToResult(this.getString("formattedExceptionDetails", desc));
    }
    catch (ex) {
      this.appendToResult(ex.toString());
    }

    if (this.stopOnExceptions) {
      this.doStop(frame, "exception");
    }

    return undefined;
  },

  disableErrors: function() {
    this.dbg.onError = undefined;
  },

  enableTraceErrors: function() {
    this.DEBUG("enabled Error tracing");
    var self = this;
    this.dbg.onError = function(frame, report) {
      if (frame.script.url.search(URL_OK) < 0) return undefined;
      return self.printError(report.message, report.file, report.line, report.offset, report.exception);
    };
    this.dbg.onDebuggerStatement = undefined;
  },

  enableStopErrors: function() {
    var self = this;

    this.dbg.onError = function(frame, report) {
      if (frame.script.url.search(URL_OK) < 0) return undefined;
      self.printError(report.message, report.file, report.line, report.offset, report.exception);
      return self.doStop(frame, "error");
    };
  },

  enableStopDebugger: function() {
    var self = this;

    if (this.dbg.onDebuggerStatement == undefined) {
      this.dbg.onDebuggerStatement = function(frame) {
        if (frame.script.url.search(URL_OK) < 0) return undefined;
        self.doStop(frame, "debug-statement");
        return undefined;
      };
    }
    else {
      this.dbg.onDebuggerStatement = undefined;
    }
  },

  disableExceptions: function() {
    this.stopOnExceptions = false;
    this.dbg.onExceptionUnwind = undefined;
  },

  enableTraceExceptions: function() {
    var self = this;
    this.stopOnExceptions = false;
    this.dbg.onExceptionUnwind = function(frame, value) {
      if (frame.script.url.search(URL_OK) < 0) return undefined;

      return self.printException(frame, value);
    };
  },

  enableStopExceptions: function() {
    var self = this;
    this.stopOnExceptions = true;
    this.dbg.onExceptionUnwind = function(frame, value) {
      if (frame.script.url.search(URL_OK) < 0) return undefined;

      return self.printException(frame, value);
    };
  },

  displayMenuBreakpoints: function() {
    var delMnu = document.getElementById("menu_delBreakpoint");
    var propsMnu = document.getElementById("menu_modifyBreakpoint");

    if (this.bpBox.selectedCount == 0) {
      // nothing selected
      delMnu.setAttribute("disabled", "true");
    }
    else {
      delMnu.removeAttribute("disabled");
    }

    if (this.bpBox.selectedCount == 1) {
      // nothing selected
      propsMnu.removeAttribute("disabled");
    }
    else {
      propsMnu.setAttribute("disabled", "true");
    }
  },

  displayCtxMenuBp: function() {
    var propsMnu = document.getElementById("bp_ctx_modifyBreakpoint");
    if (this.bpBox.selectedCount == 1) {
      // nothing selected
      propsMnu.removeAttribute("disabled");
    }
    else {
      propsMnu.setAttribute("disabled", "true");
    }
  },

  newBreakpointDlg: function() {
    var o = {
      filename: "",
      linenum: 1,
      cond: false,
      condFunc: null,
      condBody: null
    };
    window.openDialog("chrome://tinyjsd/content/ui/breakpoint-details.xul", "",
      "chrome,dialog,modal,centerscreen", o);

    if (o.returnState) {
      this.setBreakPoint(o.filename, o.linenum);
    }
  },

  editBreakpointDlg: function() {
    let item = this.bpBox.selectedItem;
    let line = item.value.substr(0, item.value.indexOf("@"));
    let file = unescape(item.value.substr(item.value.indexOf("@") + 1));

    let bp = this.getBreakpoint(file, line);

    let conditional = false;
    let condFunc = null;
    let condBody = null;

    if (bp && bp.conditions) {
      conditional = bp.conditions.enabled;
      condFunc = bp.conditions.functionName;
      condBody = bp.conditions.functionBody;
    }

    var o = {
      filename: file,
      linenum: line,
      cond: conditional,
      condFunc: condFunc,
      condBody: condBody
    };
    window.openDialog("chrome://tinyjsd/content/ui/breakpoint-details.xul", "",
      "chrome,dialog,modal,centerscreen", o);

    if (o.returnState) {
      this.deleteSelectedBreakpoints();
      var cond = {
        enabled: o.cond,
        functionName: o.condFunc,
        functionBody: o.condBody
      };
      this.setBreakPoint(o.filename, o.linenum, cond);
    }
  },

  displayMenuWatchlist: function() {
    var delMnu = document.getElementById("menu_delWatchItem");

    if (this.wlMain.view.selection.getRangeCount() == 0) {
      // nothing selected
      delMnu.setAttribute("disabled", "true");
    }
    else if (this.canDeleteWatchList()) {
      delMnu.removeAttribute("disabled");
    }
    else {
      delMnu.setAttribute("disabled", "true");
    }
  },

  /* global undefinedFunc: false */
  /* eslint no-debugger: 0 */
  testFunc: function() {
    debugger;
    undefinedFunc();
    var a = 1;
    a++;
  }

};

function closeButton(script) {
  TinyJsd.onCloseButton(script);
}
