/************************************************************************/
/*                                                                      */
/*      Calendar Tweaks  -  Thunderbird Extension  -  Calendar Views    */
/*                                                                      */
/*      Javascript for Calendar Views overlay                           */
/*                                                                      */
/*      Copyright (C) 2008-2018  by  DW-dev                             */
/*                                                                      */
/*      Last Edit  -  05 Sep 2018                                       */
/*                                                                      */
/************************************************************************/

"use strict";

var calendarTweaks =
{
    appInfo: Components.classes["@mozilla.org/xre/app-info;1"].getService(Components.interfaces.nsIXULAppInfo),
    versionComparator: Components.classes["@mozilla.org/xpcom/version-comparator;1"].getService(Components.interfaces.nsIVersionComparator),
    tbVersion: "",
    
    prefs: Components.classes["@mozilla.org/preferences-service;1"].getService(Components.interfaces.nsIPrefService).getBranch("extensions.calendartweaks."),
    
    winmed: Components.classes["@mozilla.org/appshell/window-mediator;1"].getService(Components.interfaces.nsIWindowMediator),
    
    // consoleService: Components.classes["@mozilla.org/consoleservice;1"].getService(Components.interfaces.nsIConsoleService),
    
    // calendarTweaks.consoleService.logStringMessage("Error Console Message");
    
    /************************************************************************/
    
    /* Listen for changes to settings */
    
    prefsObserver:
    {
        register: function()
        {
            /* Add the observer */
            calendarTweaks.prefs.addObserver("",this,false);
        },
        
        observe: function(subject,topic,data)
        {
            if (topic != "nsPref:changed") return;
            
            /* Style calendar views */
            
            window.setTimeout(function() { calendarTweaks.calendarViews(); },100);
            
            /* Refresh display */
            
            window.setTimeout(function() { calendarTweaks.refresh(); },200);
        }
    },
    
    /************************************************************************/
    
    /* Listen for calendar being added to composite calendar */
    
    compositeObserver:
    {
        QueryInterface: XPCOMUtils.generateQI([Components.interfaces.calIObserver, Components.interfaces.calICompositeObserver]),
        
        // calIObserver:
        onStartBatch: function() {},
        onEndBatch: function() {},
        onLoad: function(aCalendar) {},
        onAddItem: function(aItem) {},
        onModifyItem: function(aNewItem, aOldItem) {},
        onDeleteItem: function(aDeletedItem) {},
        onError: function(aCalendar, aErrNo, aMessage) {},
        onPropertyChanged: function(aCalendar, aName, aValue, aOldValue)
        {
            window.setTimeout(function() { calendarTweaks.refresh(); },100);
        },
        onPropertyDeleting: function(aCalendar, aName) {},
        
        // calICompositeObserver:
        onCalendarAdded: function (aCalendar)
        {
            window.setTimeout(function() { calendarTweaks.refresh(); },100);
        },
        onCalendarRemoved: function (aCalendar) {},
        onDefaultCalendarChanged: function (aNewDefault) {}
    },
    
    /************************************************************************/
    
    /* Load function */
    
    onLoad: function()
    {
        var lastSelectedIndex;
        var viewType = new Array("day","week","multiweek","month");
        
        window.removeEventListener("load",calendarTweaks.onLoad,false);
        
        /* Determine Thunderbird version and set attribute */
        
        if (calendarTweaks.versionComparator.compare(calendarTweaks.appInfo.version,"60.0a1") >= 0) calendarTweaks.tbVersion = "60.0";
        else if (calendarTweaks.versionComparator.compare(calendarTweaks.appInfo.version,"38.0a1") >= 0) calendarTweaks.tbVersion = "38.0";
        else if (calendarTweaks.versionComparator.compare(calendarTweaks.appInfo.version,"31.0a1") >= 0) calendarTweaks.tbVersion = "31.0";
        else calendarTweaks.tbVersion = "24.0";
        
        document.getElementById("messengerWindow").setAttribute("calendartweaks-tbversion",calendarTweaks.tbVersion);
        
        /* Register preferences observer */
        
        calendarTweaks.prefsObserver.register();
        
        /* Add composite calendar observer */
        
        if (calendarTweaks.tbVersion >= +"60.0") cal.view.getCompositeCalendar(window).addObserver(calendarTweaks.compositeObserver);
        else getCompositeCalendar().addObserver(calendarTweaks.compositeObserver);
        
        /* Redefine category management observer observe and update functions and re-initialize */
        
        categoryManagement.observe =
        function cM_observe(aSubject, aTopic, aPrefName)
        {
            this.updateStyleSheetForCategory(aPrefName);
            
            agendaListbox.refreshCalendarQuery();
        }
        
        categoryManagement.updateStyleSheetForCategory =
        function cM_updateStyleSheetForCategory(aCatName)
        {
            if (!(aCatName in categoryManagement.categoryStyleCache)) {
                // We haven't created a rule for this category yet, do so now.
                let sheet = getViewStyleSheet();
                let ruleString = '.category-color-box[categories~="' + aCatName + '"] {} ';
                let ruleIndex = sheet.insertRule(ruleString, sheet.cssRules.length);
                
                this.categoryStyleCache[aCatName] = sheet.cssRules[ruleIndex];
            }
            
            let color;
            if (calendarTweaks.tbVersion >= +"31.0") color = Preferences.get("calendar.category.color." + aCatName) || "";
            else color = cal.getPrefSafe("calendar.category.color." + aCatName) || "";
            this.categoryStyleCache[aCatName].style.backgroundColor = color;
            if (calendarTweaks.tbVersion >= +"60.0") this.categoryStyleCache[aCatName].style.color = cal.view.getContrastingTextColor(color);
            else this.categoryStyleCache[aCatName].style.color = cal.getContrastingTextColor(color);
        }
        
        categoryManagement.initCategories();
        
        /* Remember last selected view */
        
        lastSelectedIndex = +getViewDeck().selectedIndex;
        
        /* Select last selected view */
        
        window.setTimeout(function() { switchToView(viewType[lastSelectedIndex]); },100);
        
        /* Style calendar views */
        
        window.setTimeout(function() { calendarTweaks.calendarViews(); },200);
        
        /* Refresh display */
        
        window.setTimeout(function() { calendarTweaks.refresh(); },300);
    },
    
    /************************************************************************/
    
    /* Calendar styling function */
    
    calendarViews: function()
    {
        var i,j,element,rule,important;
        
        /* Use new 'Today' style (Month/Multiweek/Week Views & Mini-Month) */
        
        if (calendarTweaks.prefs.getBoolPref("newtoday"))
        {
            element = document.getElementById("messengerWindow");
            element.setAttribute("calendartweaks-newtoday","");
        }
        else
        {
            element = document.getElementById("messengerWindow");
            element.removeAttribute("calendartweaks-newtoday");
        }
        
        /* Use new 'Selected Day' style (Month/Multiweek/Week Views & Mini-Month) */
        
        if (calendarTweaks.prefs.getBoolPref("newselday"))
        {
            element = document.getElementById("messengerWindow");
            element.setAttribute("calendartweaks-newselday","");
        }
        else
        {
            element = document.getElementById("messengerWindow");
            element.removeAttribute("calendartweaks-newselday");
        }
        
        /* Show 'Today' and 'Selected Day' styles on day view (Day View) */
        
        if (calendarTweaks.prefs.getBoolPref("showondayview"))
        {
            element = document.getElementById("messengerWindow");
            element.setAttribute("calendartweaks-showondayview","");
        }
        else
        {
            element = document.getElementById("messengerWindow");
            element.removeAttribute("calendartweaks-showondayview");
        }
        
        /* Add background on box date labels (Month/Multiweek Views) */
        
        if (calendarTweaks.prefs.getBoolPref("datelabelbkgd"))
        {
            element = document.getElementById("messengerWindow");
            element.setAttribute("calendartweaks-datelabelbkgd","");
        }
        else
        {
            element = document.getElementById("messengerWindow");
            element.removeAttribute("calendartweaks-datelabelbkgd");
        }
        
        /* Set more distinct shading on other months (Month View) */
        
        if (calendarTweaks.prefs.getBoolPref("distinctother"))
        {
            element = document.getElementById("messengerWindow");
            element.setAttribute("calendartweaks-distinctother","");
        }
        else
        {
            element = document.getElementById("messengerWindow");
            element.removeAttribute("calendartweaks-distinctother");
        }
        
        /* Add label for all day events row/column (Week/Day Views) */
        
        if (calendarTweaks.prefs.getBoolPref("alldaylabel"))
        {
            element = document.getElementById("messengerWindow");
            element.setAttribute("calendartweaks-alldaylabel","");
        }
        else
        {
            element = document.getElementById("messengerWindow");
            element.removeAttribute("calendartweaks-alldaylabel");
        }
        
        /* Add border around selected events (All Views) */
        
        if (calendarTweaks.prefs.getBoolPref("eventborder"))
        {
            element = document.getElementById("messengerWindow");
            element.setAttribute("calendartweaks-eventborder","");
        }
        else
        {
            element = document.getElementById("messengerWindow");
            element.removeAttribute("calendartweaks-eventborder");
        }
        
        /* Show time and event on single line if no date (Today Pane) */
        
        if (calendarTweaks.prefs.getBoolPref("eventsingleline"))
        {
            element = document.getElementById("messengerWindow");
            element.setAttribute("calendartweaks-eventsingleline","");
        }
        else
        {
            element = document.getElementById("messengerWindow");
            element.removeAttribute("calendartweaks-eventsingleline");
        }
        
        /* Reduce height of events (Month/Multiweek Views) (Today Pane) */
        
        if (calendarTweaks.prefs.getBoolPref("eventreduceheight"))
        {
            element = document.getElementById("messengerWindow");
            element.setAttribute("calendartweaks-eventreduceheight","");
        }
        else
        {
            element = document.getElementById("messengerWindow");
            element.removeAttribute("calendartweaks-eventreduceheight");
        }
        
        /* Apply calendar event styling to event list (Today Pane) */
        
        if (calendarTweaks.prefs.getBoolPref("eventtodaypane"))
        {
            element = document.getElementById("messengerWindow");
            element.setAttribute("calendartweaks-eventtodaypane","");
        }
        else
        {
            element = document.getElementById("messengerWindow");
            element.removeAttribute("calendartweaks-eventtodaypane");
        }
        
        /* Apply category color to event backgrounds (All Views & Today Pane) */
        
        if (calendarTweaks.prefs.getBoolPref("eventbkgdcolor"))
        {
            element = document.getElementById("messengerWindow");
            element.setAttribute("calendartweaks-eventbkgdcolor","");
        }
        else
        {
            element = document.getElementById("messengerWindow");
            element.removeAttribute("calendartweaks-eventbkgdcolor");
        }
        
        /* Use calendar color if no category color (All Views & Today Pane) */
        
        if (calendarTweaks.prefs.getBoolPref("eventbkgdnocat"))
        {
            element = document.getElementById("messengerWindow");
            element.setAttribute("calendartweaks-eventbkgdnocat","");
        }
        else
        {
            element = document.getElementById("messengerWindow");
            element.removeAttribute("calendartweaks-eventbkgdnocat");
        }
        
        /* Add icon for repeating events that are not exceptions (All Views) */
        
        if (calendarTweaks.prefs.getBoolPref("repeatnormal"))
        {
            element = document.getElementById("messengerWindow");
            element.setAttribute("calendartweaks-repeatnormal","");
        }
        else
        {
            element = document.getElementById("messengerWindow");
            element.removeAttribute("calendartweaks-repeatnormal");
        }
        
        /* Add icon for repeating events that are exceptions (All Views) */
        
        if (calendarTweaks.prefs.getBoolPref("repeatexcept"))  
        {
            element = document.getElementById("messengerWindow");
            element.setAttribute("calendartweaks-repeatexcept","");
        }
        else
        {
            element = document.getElementById("messengerWindow");
            element.removeAttribute("calendartweaks-repeatexcept");
        }
        
        /* Apply New Today Colors */
        
        for (i = 0; i < document.styleSheets.length; i++)
        {
            if (document.styleSheets[i].href == "chrome://calendartweaks/skin/calendartweaks-calendar-views.css")
            {
                for (j = 0; j < document.styleSheets[i].cssRules.length; j++)
                {
                    rule = document.styleSheets[i].cssRules[j];
                    
                    if (rule.cssText.indexOf("(!)") >= 0) important = "important"; else important = "";
                        
                    if (rule.cssText.indexOf("todayheadercolor") >= 0)
                    {
                        rule.style.setProperty("background-color",calendarTweaks.prefs.getCharPref("todayheadercolor"),important);
                    }
                    
                    if (rule.cssText.indexOf("todaydayboxcolor") >= 0)
                    {
                        rule.style.setProperty("background-color",calendarTweaks.prefs.getCharPref("todaydayboxcolor"),important);
                    }
                    
                    if (rule.cssText.indexOf("todaybordercolor") >= 0)
                    {
                        if (calendarTweaks.prefs.getBoolPref("borderallviews") && rule.cssText.indexOf("minimonth-day") < 0 ||
                            calendarTweaks.prefs.getBoolPref("borderminimonth") && rule.cssText.indexOf("minimonth-day") >= 0)
                        {
                            if (rule.cssText.indexOf("border-color") >= 0) rule.style.setProperty("border-color",calendarTweaks.prefs.getCharPref("todaybordercolor"),important);
                            if (rule.cssText.indexOf("border-left-color") >= 0) rule.style.setProperty("border-left-color",calendarTweaks.prefs.getCharPref("todaybordercolor"),important);
                            if (rule.cssText.indexOf("border-right-color") >= 0) rule.style.setProperty("border-right-color",calendarTweaks.prefs.getCharPref("todaybordercolor"),important);
                            if (rule.cssText.indexOf("border-top-color") >= 0) rule.style.setProperty("border-top-color",calendarTweaks.prefs.getCharPref("todaybordercolor"),important);
                            if (rule.cssText.indexOf("border-bottom-color") >= 0) rule.style.setProperty("border-bottom-color",calendarTweaks.prefs.getCharPref("todaybordercolor"),important);
                        }
                        else
                        {
                            if (rule.cssText.indexOf("border-color") >= 0) rule.style.setProperty("border-color","#D2D2D2",important);
                            if (rule.cssText.indexOf("border-left-color") >= 0) rule.style.setProperty("border-left-color","#D2D2D2",important);
                            if (rule.cssText.indexOf("border-right-color") >= 0) rule.style.setProperty("border-right-color","#D2D2D2",important);
                            if (rule.cssText.indexOf("border-top-color") >= 0) rule.style.setProperty("border-top-color","#D2D2D2",important);
                            if (rule.cssText.indexOf("border-bottom-color") >= 0) rule.style.setProperty("border-bottom-color","#D2D2D2",important);
                        }
                    }
                }
            }
        }
        
        /* Apply New Selected Day Colors */
        
        for (i = 0; i < document.styleSheets.length; i++)
        {
            if (document.styleSheets[i].href == "chrome://calendartweaks/skin/calendartweaks-calendar-views.css")
            {
                for (j = 0; j < document.styleSheets[i].cssRules.length; j++)
                {
                    rule = document.styleSheets[i].cssRules[j];
                    
                    if (rule.cssText.indexOf("(!)") >= 0) important = "important"; else important = "";
                    
                    if (rule.cssText.indexOf("seldayheadercolor") >= 0)
                    {
                        rule.style.setProperty("background-color",calendarTweaks.prefs.getCharPref("seldayheadercolor"),important);
                    }
                    
                    if (rule.cssText.indexOf("seldaydayboxcolor") >= 0)
                    {
                        rule.style.setProperty("background-color",calendarTweaks.prefs.getCharPref("seldaydayboxcolor"),important);
                    }
                    
                    if (rule.cssText.indexOf("seldaybordercolor") >= 0)
                    {
                        if (calendarTweaks.prefs.getBoolPref("borderallviews") && rule.cssText.indexOf("minimonth-day") < 0 ||
                            calendarTweaks.prefs.getBoolPref("borderminimonth") && rule.cssText.indexOf("minimonth-day") >= 0)
                        {
                            if (rule.cssText.indexOf("border-color") >= 0) rule.style.setProperty("border-color",calendarTweaks.prefs.getCharPref("seldaybordercolor"),important);
                            if (rule.cssText.indexOf("border-left-color") >= 0) rule.style.setProperty("border-left-color",calendarTweaks.prefs.getCharPref("seldaybordercolor"),important);
                            if (rule.cssText.indexOf("border-right-color") >= 0) rule.style.setProperty("border-right-color",calendarTweaks.prefs.getCharPref("seldaybordercolor"),important);
                            if (rule.cssText.indexOf("border-top-color") >= 0) rule.style.setProperty("border-top-color",calendarTweaks.prefs.getCharPref("seldaybordercolor"),important);
                            if (rule.cssText.indexOf("border-bottom-color") >= 0) rule.style.setProperty("border-bottom-color",calendarTweaks.prefs.getCharPref("seldaybordercolor"),important);
                        }
                        else
                        {
                            if (rule.cssText.indexOf("border-color") >= 0) rule.style.setProperty("border-color","#D2D2D2",important);
                            if (rule.cssText.indexOf("border-left-color") >= 0) rule.style.setProperty("border-left-color","#D2D2D2",important);
                            if (rule.cssText.indexOf("border-right-color") >= 0) rule.style.setProperty("border-right-color","#D2D2D2",important);
                            if (rule.cssText.indexOf("border-top-color") >= 0) rule.style.setProperty("border-top-color","#D2D2D2",important);
                            if (rule.cssText.indexOf("border-bottom-color") >= 0) rule.style.setProperty("border-bottom-color","#D2D2D2",important);
                        }
                    }
                }
            }
        }
    },
    
    /* Refresh display function */
    
    refresh: function()
    {
        /* Refresh calendar views */
        
        document.getElementById("day-view").refreshView();
        document.getElementById("week-view").refreshView();
        document.getElementById("multiweek-view").refreshView();
        document.getElementById("month-view").refreshView();
        
        /* Refresh agenda list */
        
        agendaListbox.refreshCalendarQuery();
    },
    
    /* Main menu command function */
    
    cmdOptions: function()
    {
        var optionsWindow;
        
        optionsWindow = calendarTweaks.winmed.getMostRecentWindow("calendartweaks-options");
        
        if (optionsWindow) optionsWindow.focus();
        else window.openDialog("chrome://calendartweaks/content/calendartweaks-options.xul","","chrome,dialog,titlebar,centerscreen",null);
    }
};

window.addEventListener("load",calendarTweaks.onLoad,false);
