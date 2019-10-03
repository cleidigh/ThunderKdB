
/* ***** BEGIN LICENSE BLOCK *****
 * Version: MPL 1.1/GPL 2.0/LGPL 2.1
 *
 * The contents of this file are subject to the Mozilla Public License Version
 * 1.1 (the "License"); you may not use this file except in compliance with
 * the License. You may obtain a copy of the License at
 * http://www.mozilla.org/MPL/
 *
 * Software distributed under the License is distributed on an "AS IS" basis,
 * WITHOUT WARRANTY OF ANY KIND, either express or implied. See the License
 * for the specific language governing rights and limitations under the
 * License.
 *
 * The Original Code is OEone Calendar Code, released October 31st, 2001.
 *
 * The Initial Developer of the Original Code is
 * OEone Corporation.
 * Portions created by the Initial Developer are Copyright (C) 2001
 * the Initial Developer. All Rights Reserved.
 *
 * Contributor(s): Garth Smedley <garths@oeone.com>
 *                 Mike Potter <mikep@oeone.com>
 *                 Colin Phillips <colinp@oeone.com>
 *                 Karl Guertin <grayrest@grayrest.com> 
 *                 Mike Norton <xor@ivwnet.com>
 *                 ArentJan Banck <ajbanck@planet.nl> 
 *                 Eric Belhaire <belhaire@ief.u-psud.fr>
 *                 Matthew Willis <lilmatt@mozilla.com>
 *                 Joey Minta <jminta@gmail.com>
 *                 Dan Mosedale <dan.mosedale@oracle.com>
 *                 Philipp Kewisch <mozilla@kewis.ch>
   -
   - GanttView code  is based on various versions of Sunbird/Lighning views 
   - from  0.2 to present. Please contact me  if I have omitted or mistakenly
   - included a contributor.  
   -	Joe Brochu <ganttview@gmail.com>
   -
 * Alternatively, the contents of this file may be used under the terms of
 * either the GNU General Public License Version 2 or later (the "GPL"), or
 * the GNU Lesser General Public License Version 2.1 or later (the "LGPL"),
 * in which case the provisions of the GPL or the LGPL are applicable instead
 * of those above. If you wish to allow use of your version of this file only
 * under the terms of either the GPL or the LGPL, and not to allow others to
 * use your version of this file under the terms of the MPL, indicate your
 * decision by deleting the provisions above and replace them with the notice
 * and other provisions required by the GPL or the LGPL. If you do not delete
 * the provisions above, a recipient may use your version of this file under
 * the terms of any one of the MPL, the GPL or the LGPL.
 *
 * ***** END LICENSE BLOCK ***** */

/***** calendar
* AUTHOR
*   Joe Brochu <ganttview@gmail.com>
*
* NOTES
*   Support and experimental functions for GanttView
*
*   What is in this file:
*     - Global variables and functions - Called directly from the XUL
*  
* IMPLEMENTATION NOTES 
*
**********
*/

var EXPORTED_SYMBOLS = ["GanttView"];

ChromeUtils.import("resource://gre/modules/Services.jsm"); //required for version/app checking
ChromeUtils.import("resource://gre/modules/XPCOMUtils.jsm");
ChromeUtils.import("resource://gre/modules/Preferences.jsm");
ChromeUtils.import("resource:///modules/gloda/log4moz.js");
ChromeUtils.import("resource://calendar/modules/calUtils.jsm"); //required for cal.getPrefSafe() and GetWeekInfoService

/**
 *   GanttView namespace
 *
 */
 if ("undefined" == typeof(GanttView)) {
	  var GanttView = {
	    /**
	     * Initializes this object.
	     */
	    init : function() {

	    }
	  };
	 
	  /**
	   * Constructor.
	   */
	  (function() {
	    this.init();
	  }).apply(GanttView);
	};
  
GanttView.ganttDebug = Preferences.get("extensions.GanttView.debug", false); //cal.getPrefSafe("extensions.GanttView.debug", false);		

GanttView.dump = function ganttDump(aMessage, elem) {
  
  try {
    if (GanttView.ganttDebug) {
      if (elem) 
        aMessage = elem.getAttribute("id") + ": " + aMessage;
      getConsoleService().logStringMessage("GanttView: " + aMessage);
      dump("GanttView: " + aMessage + "\n"); 

    }
  } catch (e) {
  }
}

GanttView.dumpChange = function dumpChange(aEvent) {
  if (aEvent.attrName=="style")
    GanttView.dump("attrMod2 " + aEvent.attrName + aEvent.prevValue + " " + aEvent.newValue)
}

GanttView.togglePref = function togglePref(pref) {
  
  var currentState = Preferences.get(pref, false);	
  
  Preferences.set(pref, !currentState)
  
}

GanttView.removeExtraKids = function removeExtraKids(elem, startIndex) {
    if (!elem)
      return;
      
    var i=elem.childNodes.length
    
    while (i >= startIndex) {
      if ( i > 0){
        elem.removeChild(elem.childNodes[elem.childNodes.length-1]);
      }
      i--
    }
}

GanttView.removeEventSweepListeners = function removeEventSweepListeners() {
        //remove drag/drop listeners
        var calView = document.calendarView;
        if (calView) {
          window.removeEventListener("mousemove", calView.onEventSweepMouseMove, false);
          window.removeEventListener("mouseup", calView.onEventSweepMouseUp, false);				
        }
}

GanttView.isPointOverElement = function isPointOverElement(elem, pointX, pointY) {
  var bo = elem.boxObject;
  if (((pointX >= bo.screenX) && (pointX < bo.screenX + bo.width)) && ((pointY >= bo.screenY) && (pointY < bo.screenY + bo.height))) {
    return true;
  }
  return false;
}

GanttView.openPreferences = function openGanttPreferences() {
    // Check to see if the prefwindow is already open
    //var wm = Components.classes["@mozilla.org/appshell/window-mediator;1"]
    //                   .getService(Components.interfaces.nsIWindowMediator);

    var win = Services.wm.getMostRecentWindow("Ganttview:Preferences");

    if (win) {
        win.focus();
    } else {
        // The prefwindow should only be modal on non-instant-apply platforms
        var instApply = Preferences.get("browser.preferences.instantApply", false);

        var features = "chrome,titlebar,toolbar,centerscreen,dialog=no"
        //,toolbar,centerscreen,"
          //  + (instApply ? "dialog=no" : "modal");

        var url = "chrome://ganttview/content/preferences/ganttview-preferences.xul";
        //var url = "chrome://ganttview/content/preferences/preftest.xul";

        //window.openWindow()
        //runtime.openOptionsPage();
        window.openDialog(url, "Preferences", features);
        //openSubDialog(url, features);
    }
}

GanttView.weekNumber = function ganttWeekNumber(aDate, aFirstDayOfWeek) {
    
    if (!aDate)
      aDate = now();
    
    if (!aFirstDayOfWeek)
      aFirstDayOfWeek = 0;
      
    // var offsetDate = aDate.clone()
    // // Set offsetDate to last day of week, adjusted for aFirstDayOfWeek
    // offsetDate.day += (6 + aFirstDayOfWeek - aDate.weekday ) % 7
    
    // var weekNumber = Math.ceil((offsetDate.yearday)/7,1)
    
    //use getWeekInfoService.getWeekTitle() to match other views
    var weekNumber = cal.getWeekInfoService().getWeekTitle(aDate);
    
    return weekNumber
}


GanttView.compareItemBoxStart = function compareItemBoxStart(a, b) {
  //Sort Items by StartDate, sort same startdate items by EndDate
  if (a && b) {
    var diff = a.itemBoxStartColIndex-b.itemBoxStartColIndex;
    if (diff == 0) {
      //sort by end date
      var endDiff = a.itemBoxEndColIndex-b.itemBoxEndColIndex;

      if (endDiff == 0) {
        return 0;
      } else if (endDiff<0) {
        return -1;
      } else {
        return 1;
      }
    } else if (diff<0) {
      return -1;
    } else {
      return 1;
    }
  } else {
    return 0;
  }
}

GanttView.compareItemBoxCalendar = function compareItemBoxCalendar(a, b) {
  //Sort Items by Calendar
  if (a && b) {
    var aCal = a.occurrence.calendar.name;
    var bCal = b.occurrence.calendar.name;   
    
    if (aCal == bCal) {
      return 0;
    } else if (aCal > bCal) {
      return 1;
    } else {
      return -1;
    }
  } else {
    return 0;
  }
} 

GanttView.compareItemBoxTitleOrdinal = function compareItemBoxTitleOrdinal(a, b) {
  //Sort Items by numeric ordinal at start of title
  if (a && b) {
    var aTitle = a.occurrence.title;
    var bTitle = b.occurrence.title;
    
    var aOrd = parseFloat(aTitle);
    var bOrd = parseFloat(bTitle);  

    if ((aTitle == bTitle) || (isNaN(aOrd) && isNaN(bOrd))) {

      return 0;

      } else if ((aTitle > bTitle) || (isNaN(aOrd))) {


      return 1;
    } else {

      return -1;
    }
  } else {
    return 0;
  }
} 

GanttView.switchCalendarView = function gvSwitchCalendarView(aViewType, aForceView) {
  try {
    //var versionChecker = Services.vc; 
    //deprecated: Components.classes["@mozilla.org/xpcom/version-comparator;1"].getService(Components.interfaces.nsIVersionComparator);

    if (Services.vc.compare(Services.appinfo.platformVersion, "5.0b1") >= 0) {
        // code for >= 5.*
        switchCalendarView(aViewType, aForceView);
        
    } else {
        // code for <  5.*
        showCalendarView(aViewType);
    }
  } catch (e) {
      GanttView.dump("err " + aViewType)
      showCalendarView(aViewType);
  }
}
