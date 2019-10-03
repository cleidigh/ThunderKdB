/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

/* global Components: false, dump: false */

'use strict';

Components.utils.import("chrome://tinyJsd/content/modules/tinyjsdCommon.jsm"); /* global TinyjsdCommon: false */

var inOutObj;
var fn;
var linenum;
var funcname;
var funcbody;
var conditional;
var funcvalidate;
var acceptBtn;

function onLoad() {
  inOutObj = window.arguments[0];
  fn = document.getElementById("filename");
  linenum = document.getElementById("linenum");
  conditional = document.getElementById("conditional");
  funcname = document.getElementById("funcname");
  funcbody = document.getElementById("funcbody");
  funcvalidate = document.getElementById("funcvalidate");
  acceptBtn = document.getElementById("breakpoint_properties").getButton("accept");

  fn.value = inOutObj.filename;
  linenum.value = inOutObj.linenum;

  if (inOutObj.cond) {
    conditional.setAttribute("checked", "true");
    enableCond();
  }

  if (inOutObj.condFunc) funcname.value = inOutObj.condFunc;
  if (inOutObj.condBody) funcbody.value = inOutObj.condBody;

  validateAcceptCriteria();

  inOutObj.returnState = false;
}

function enableCond() {
  if (conditional.checked) {
    funcname.removeAttribute("disabled");
    funcbody.removeAttribute("disabled");
  }
  else {
    funcname.setAttribute("disabled", "true");
    funcbody.setAttribute("disabled", "true");
  }
}

function enableAcceptBtn(enable) {
  if (enable) {
    acceptBtn.removeAttribute("disabled");
  }
  else
    acceptBtn.setAttribute("disabled", "true");

}

function validateAcceptCriteria() {
  if (fn.value.length == 0) {
    enableAcceptBtn(false);
    return false;
  }

  if (conditional.checked) {
    try {
      TinyjsdCommon.compileConditionalBp(funcname.value, funcbody.value);
    }
    catch (ex) {
      document.getElementById("errormsg").setAttribute("value", ex.toString());
      funcvalidate.removeAttribute("hidden");
      enableAcceptBtn(false);
      return false;
    }
  }

  enableAcceptBtn(true);
  funcvalidate.setAttribute("hidden", "true");
  return true;
}

function onAccept() {

  inOutObj.filename = fn.value;
  inOutObj.linenum = linenum.value;
  inOutObj.returnState = true;

  if (!validateAcceptCriteria()) return false;

  inOutObj.condFunc = funcname.value;
  inOutObj.condBody = funcbody.value;
  inOutObj.cond = conditional.checked;

  return true;
}
