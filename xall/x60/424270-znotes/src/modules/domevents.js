/* ***** BEGIN LICENSE BLOCK *****
 *
 * Version: GPL 3.0
 *
 * ZNotes
 * Copyright (C) 2012 Alexander Kapitman
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with this program.  If not, see <http://www.gnu.org/licenses/>.
 *
 * The Original Code is ZNotes.
 *
 * Initial Developer(s):
 *   Alexander Kapitman <akman.ru@gmail.com>
 *
 * Portions created by the Initial Developer are Copyright (C) 2014
 * the Initial Developer. All Rights Reserved.
 *
 * Contributor(s):
 *
 * ***** END LICENSE BLOCK ***** */

const EXPORTED_SYMBOLS = ["DOMEvents"];

var Cc = Components.classes;
var Ci = Components.interfaces;
var Cr = Components.results;
var Cu = Components.utils;

if ( !ru ) var ru = {};
if ( !ru.akman ) ru.akman = {};
if ( !ru.akman.znotes ) ru.akman.znotes = {};

Cu.import( "resource://znotes/utils.js", ru.akman.znotes );

/**
 *  @see https://developer.mozilla.org/en-US/docs/Web/Events
 */
var DOMEvents = function() {

  var Utils = ru.akman.znotes.Utils;
  var log = Utils.getLogger( "modules.domevents" );

  var events = [

    // Standard events

    "abort",
    "afterprint",
    "animationend",
    "animationiteration",
    "animationstart",
    "audioprocess",
    "beforeprint",
    "beforeunload",
    "beginEvent",
    "blocked",
    "blur",
    "cached",
    "canplay",
    "canplaythrough",
    "change",
    "chargingchange",
    "chargingtimechange",
    "checking",
    "click",
    "close",
    "compassneedscalibration",
    "complete",
    "compositionend",
    "compositionstart",
    "compositionupdate",
    "contextmenu",
    "copy",
    "cut",
    "dblclick",
    "devicelight",
    "devicemotion",
    "deviceorientation",
    "deviceproximity",
    "dischargingtimechange",
    "DOMActivate",
    "DOMAttributeNameChanged",
    "DOMAttrModified",
    "DOMCharacterDataModified",
    "DOMContentLoaded",
    "DOMElementNameChanged",
    "DOMFocusIn",
    "DOMFocusOut",
    "DOMNodeInserted",
    "DOMNodeInsertedIntoDocument",
    "DOMNodeRemoved",
    "DOMNodeRemovedFromDocument",
    "DOMSubtreeModified",
    "downloading",
    "drag",
    "dragend",
    "dragenter",
    "dragleave",
    "dragover",
    "dragstart",
    "drop",
    "durationchange",
    "emptied",
    "ended",
    "endEvent",
    "error",
    "focus",
    "focusin",
    "focusout",
    "fullscreenchange",
    "fullscreenerror",
    "gamepadconnected",
    "gamepaddisconnected",
    "hashchange",
    "input",
    "invalid",
    "keydown",
    "keypress",
    "keyup",
    "levelchange",
    "load",
    "loadeddata",
    "loadedmetadata",
    "loadend",
    "loadstart",
    "message",
    "mousedown",
    "mouseenter",
    "mouseleave",
    "mousemove",
    "mouseout",
    "mouseover",
    "mouseup",
    "noupdate",
    "obsolete",
    "offline",
    "online",
    "open",
    "orientationchange",
    "pagehide",
    "pageshow",
    "paste",
    "pause",
    "pointerlockchange",
    "pointerlockerror",
    "play",
    "playing",
    "popstate",
    "progress",
    "progress",
    "ratechange",
    "readystatechange",
    "repeatEvent",
    "reset",
    "resize",
    "scroll",
    "seeked",
    "seeking",
    "select",
    "show",
    "stalled",
    "storage",
    "submit",
    "success",
    "suspend",
    "SVGAbort",
    "SVGError",
    "SVGLoad",
    "SVGResize",
    "SVGScroll",
    "SVGUnload",
    "SVGZoom",
    "timeout",
    "timeupdate",
    "touchcancel",
    "touchend",
    "touchenter",
    "touchleave",
    "touchmove",
    "touchstart",
    "transitionend",
    "unload",
    "updateready",
    "upgradeneeded",
    "userproximity",
    "versionchange",
    "visibilitychange",
    "volumechange",
    "waiting",
    "wheel",

    // Non-standard events

    "afterscriptexecute",
    "beforescriptexecute",
    "cardstatechange",
    "change",
    "connectionInfoUpdate",
    "cfstatechange",
    "datachange",
    "dataerror",
    "DOMMouseScroll",
    "dragdrop",
    "dragexit",
    "draggesture",
    "icccardlockerror",
    "iccinfochange",
    "localized",
    "mousewheel",
    "MozAudioAvailable",
    "MozBeforeResize",
    "mozbrowserclose",
    "mozbrowsercontextmenu",
    "mozbrowsererror",
    "mozbrowsericonchange",
    "mozbrowserlocationchange",
    "mozbrowserloadend",
    "mozbrowserloadstart",
    "mozbrowseropenwindow",
    "mozbrowsersecuritychange",
    "mozbrowsershowmodalprompt",
    "mozbrowsertitlechange",
    "MozGamepadButtonDown",
    "MozGamepadButtonUp",
    "MozMousePixelScroll",
    "MozOrientation",
    "MozScrolledAreaChanged",
    "moztimechange",
    "MozTouchDown",
    "MozTouchMove",
    "MozTouchUp",
    "alerting",
    "busy",
    "callschanged",
    "onconnected",
    "connecting",
    "delivered",
    "dialing",
    "disabled",
    "disconnected",
    "disconnecting",
    "enabled",
    "error",
    "held",
    "holding",
    "incoming",
    "received",
    "resuming",
    "sent",
    "statechange",
    "statuschange",
    "overflow",
    "smartcard-insert",
    "smartcard-remove",
    "stkcommand",
    "stksessionend",
    "text",
    "underflow",
    "uploadprogress",
    "ussdreceived",
    "voicechange"
  ];

  function getEventHandlers() {
    var name, result = {};
    for each ( name in events ) {
      name = "on" + name.toLowerCase();
      if ( !( name in result ) ) {
        result[name] = null;
      }
    }
    return result;
  };

  return {
    getEventHandlers: getEventHandlers
  };

}();
