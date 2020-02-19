/************************************************************************/
/*                                                                      */
/*      Calendar Tweaks  -  Thunderbird Extension  -  Calendar Views    */
/*                                                                      */
/*      Javascript for Calendar Views overlay                           */
/*                                                                      */
/*      Copyright (C) 2008-2020  by  DW-dev                             */
/*                                                                      */
/*      Last Edit  -  02 Feb 2020                                       */
/*                                                                      */
/************************************************************************/

/************************************************************************/
/*                                                                      */
/*  Modified Category Box Stack  -  see addRepeatEventIcons()           */
/*                                                                      */
/*  <xul:stack anoinid="category-box-stack">                            */
/*    <xul:calendar-category-box anonid="category-box">                 */
/*    </xul:calendar-category-box>                                      */
/*    <xul:hbox>                                                        */
/*      <hbox class="repeat-icons-box">                        New      */
/*      </hbox>                                                         */
/*      <xul:hbox class="alarm-icons-box">                              */
/*      </hbox>                                                         */
/*    </xul:hbox>                                                       */
/*  </xul:stack>                                                        */
/*                                                                      */
/************************************************************************/

/************************************************************************/
/*                                                                      */
/*  Modified Agenda Rich List Item  -  see restructureAgendaList()      */
/*                                                                      */
/*  <richlistitem is="agenda-richlist-item"                             */
/*      calendar="..." category="..." recurrence="...">     Attributes  */
/*    <hbox class="agenda-container-box">                               */
/*      <hbox>                                                          */
/*         <vbox>                                                       */
/*           <image class="agenda-calendar-image">                      */
/*           <spacer>                                                   */
/*         </vbox>                                                      */
/*      </hbox>                                                         */
/*      <vbox class="agenda-description">                               */
/*        <hbox  class="agenda-event-box-1">                  Class     */
/*          <image class="agenda-multiDayEvent-image">                  */
/*          <label class="agenda-event-start">...</label>               */
/*        </hbox>                                                       */
/*        <hbox class="agenda-event-box-2">                    New      */
/*          <vbox>                                             New      */
/*            <label class="agenda-event-title">...</label>             */
/*            <label class="agenda-event-title-2">...</label>  New      */
/*          </vbox>                                            New      */
/*          <hbox class="repeat-icons-box"></hbox>             New      */
/*          <hbox class="category-bkgd-box"></hbox>            New      */
/*        </hbox>                                              New      */
/*      </vbox>                                                         */
/*    </hbox>                                                           */
/*  </richlistitem>                                                     */
/*                                                                      */
/************************************************************************/

"use strict";

var calendarTweaks =
{
    appInfo: Components.classes["@mozilla.org/xre/app-info;1"].getService(Components.interfaces.nsIXULAppInfo),
    versionComparator: Components.classes["@mozilla.org/xpcom/version-comparator;1"].getService(Components.interfaces.nsIVersionComparator),
    tbVersion: "",
    
    prefs: Components.classes["@mozilla.org/preferences-service;1"].getService(Components.interfaces.nsIPrefService).getBranch("extensions.calendartweaks."),
    catprefs: Components.classes["@mozilla.org/preferences-service;1"].getService(Components.interfaces.nsIPrefService).getBranch("calendar.category.color."),
    
    winmed: Components.classes["@mozilla.org/appshell/window-mediator;1"].getService(Components.interfaces.nsIWindowMediator),
    
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
            
            calendarTweaks.setOptions();
            calendarTweaks.modifyRules();
            calendarTweaks.generateRules();
            
            calendarTweaks.refresh();
            
            calendarTweaks.addSelectedAttributes();
            calendarTweaks.addRepeatEventIcons();
            calendarTweaks.restructureAgendaList();
        }
    },
    
    /************************************************************************/
    
    /* Listen for calendar being added to composite calendar */
    
    compositeObserver:
    {
        QueryInterface: ChromeUtils.generateQI([Ci.calIObserver, Ci.calICompositeObserver]),
        
        // calIObserver:
        onStartBatch: function() {},
        onEndBatch: function() {},
        onLoad: function(aCalendar) {},
        onAddItem: function(aItem)
        {
            window.setTimeout(function()
            {
                calendarTweaks.addSelectedAttributes();
                calendarTweaks.addRepeatEventIcons();
                calendarTweaks.restructureAgendaList();
            },50);
        },
        onModifyItem: function(aNewItem, aOldItem)
        {
            window.setTimeout(function()
            {
                calendarTweaks.addSelectedAttributes();
                calendarTweaks.addRepeatEventIcons();
                calendarTweaks.restructureAgendaList();
            },50);
        },
        onDeleteItem: function(aDeletedItem) {},
        onError: function(aCalendar, aErrNo, aMessage) {},
        onPropertyChanged: function(aCalendar, aName, aValue, aOldValue)
        {
            window.setTimeout(function()
            {
                calendarTweaks.addSelectedAttributes();
                calendarTweaks.addRepeatEventIcons();
                calendarTweaks.restructureAgendaList();
            },50);
        },
        onPropertyDeleting: function(aCalendar, aName) {},
        
        // calICompositeObserver:
        onCalendarAdded: function (aCalendar)
        {
            calendarTweaks.setOptions();
            calendarTweaks.modifyRules();
            calendarTweaks.generateRules();
            
            calendarTweaks.refresh();
            
            calendarTweaks.addSelectedAttributes();
            calendarTweaks.addRepeatEventIcons();
            calendarTweaks.restructureAgendaList();
        },
        onCalendarRemoved: function (aCalendar) {},
        onDefaultCalendarChanged: function (aNewDefault) {}
    },
    
    /************************************************************************/
    
    /* Load function */
    
    onLoad: function()
    {
        window.removeEventListener("load",calendarTweaks.onLoad,false);
        
        /* Wait for Thunderbird to finish initializing calendar views */
        
        window.setTimeout(checkReady,10);
        
        function checkReady()
        {
            var ready,deck;
            
            ready = false;
             
            try
            {
                deck = getViewDeck();
                
                ready = true;
            }
            catch (e)
            { 
                window.setTimeout(checkReady,20);
                console.log("***** Check Ready");
            }
            
            if (ready) window.setTimeout(function() { calendarTweaks.initializeViews(); },0);  /* break execution */
        }
    },
    
    /************************************************************************/
    
    /* Initialize calendar views */
    
    initializeViews: function()
    {
        var observer;
        var viewType = new Array("day","week","multiweek","month");
        
        /* Determine Thunderbird version and set attribute */
        
        if (calendarTweaks.versionComparator.compare(calendarTweaks.appInfo.version,"68.0a1") >= 0) calendarTweaks.tbVersion = "68.0";
        else calendarTweaks.tbVersion = "68.0";
        
        document.getElementById("messengerWindow").setAttribute("calendartweaks-tbversion",calendarTweaks.tbVersion);
        
        /* Register preferences observer */
        
        calendarTweaks.prefsObserver.register();
        
        /* Add day select listener */
        
        getViewDeck().addEventListener("dayselect",function(event) { calendarTweaks.addSelectedAttributes(); },false);
        
        /* Add composite calendar observer */
        
        cal.view.getCompositeCalendar(window).addObserver(calendarTweaks.compositeObserver);
        
        /* Add calendar views mutation observer */
        
        observer = new document.defaultView.MutationObserver(
        function(mutations)
        {
            calendarTweaks.addSelectedAttributes();
            calendarTweaks.addRepeatEventIcons();
            calendarTweaks.restructureAgendaList();
        });
        
        observer.observe(document.getElementById("day-view"),{ subtree: true, childList: true });
        observer.observe(document.getElementById("week-view"),{ subtree: true, childList: true });
        observer.observe(document.getElementById("multiweek-view").children[0].children[1].children[1],{ subtree: true, attributes: true, attributeFilter: ["day"] });
        observer.observe(document.getElementById("month-view").children[0].children[1].children[1],{ subtree: true, attributes: true, attributeFilter: ["day"] });
        
        /* Switch to last selected view */
        
        window.setTimeout(
        function()
        {
            switchToView(viewType[+getViewDeck().selectedIndex]);
        },200);
        
        /* Apply styles to calendar views */
        
        window.setTimeout(
        function()
        {
            calendarTweaks.setOptions();
            calendarTweaks.modifyRules();
            calendarTweaks.generateRules();
            
            calendarTweaks.refresh();
            
            calendarTweaks.addSelectedAttributes();
            calendarTweaks.addRepeatEventIcons();
            calendarTweaks.restructureAgendaList();
        },300);
    },
    
    /************************************************************************/
    
    /* Set options on messenger window */
    
    setOptions: function()
    {
        var element;
        
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
    },
    
    /************************************************************************/
    
    /* Modify static CSS coloring rules for event boxes */
    
    modifyRules: function()
    {
        var i,j,rule,important;	
        
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
                        
                        if (rule.cssText.indexOf("minimonth-day") >= 0)
                        {
                            rule.style.setProperty("color",cal.view.getContrastingTextColor(calendarTweaks.prefs.getCharPref("todaydayboxcolor")),important);
                        }
                    }
                    
                    if (rule.cssText.indexOf("todaybordercolor") >= 0)
                    {
                        if (calendarTweaks.prefs.getBoolPref("bordertoday") && rule.cssText.indexOf("minimonth-day") < 0 ||
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
                        
                        if (rule.cssText.indexOf("minimonth-day") >= 0)
                        {
                            rule.style.setProperty("color",cal.view.getContrastingTextColor(calendarTweaks.prefs.getCharPref("seldaydayboxcolor")),important);
                        }
                    }
                    
                    if (rule.cssText.indexOf("seldaybordercolor") >= 0)
                    {
                        if (calendarTweaks.prefs.getBoolPref("borderselday") && rule.cssText.indexOf("minimonth-day") < 0 ||
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
    
    /************************************************************************/
    
    /* Generate dynamic CSS coloring rules for event boxes */
    
    generateRules: function()
    {
        var i,sheet,calendars,calendar,cssSafeId,categoryList,categoryName,backColor,foreColor;
        
        for (i = 0; i < document.styleSheets.length; i++)
        {
            if (document.styleSheets[i].href == "chrome://calendartweaks/skin/calendartweaks-calendar-views-generated.css")
            {
                sheet = document.styleSheets[i];
            }
        }
        
        while (sheet.cssRules.length > 0) sheet.deleteRule(0);
        
        /* Create category color variable if color not defined for category */
        
        categoryList = cal.category.fromPrefs();
        
        for (i = 0; i < categoryList.length; i++)
        {
            categoryName = cal.view.formatStringForCSSRule(categoryList[i]);
            
            try
            {
                backColor = calendarTweaks.catprefs.getCharPref(categoryName);  /* throws exception if color not defined for category */
            }
            catch (e)
            {
                document.documentElement.style.setProperty("--category-" + categoryName.toLowerCase() + "-color","#E0E0E0","");
            }
        }
        
        /* Day & Week Views - Apply calendar color to category box */
        
        calendars = cal.getCalendarManager().getCalendars({});
        
        for (calendar of calendars)
        {
            cssSafeId = cal.view.formatStringForCSSRule(calendar.id);
            
            sheet.insertRule("window[calendartweaks-eventbkgdcolor] calendar-editable-item[style*=\"--calendar-" + cssSafeId + "-backcolor\"] .category-color-box hbox " +
                             "{ background-color: var(--calendar-" + cssSafeId + "-backcolor); }",sheet.cssRules.length);  /* all day event */
            
            sheet.insertRule("window[calendartweaks-eventbkgdcolor] calendar-event-box[style*=\"--calendar-" + cssSafeId + "-backcolor\"] .category-color-box hbox " +
                             "{ background-color: var(--calendar-" + cssSafeId + "-backcolor); }",sheet.cssRules.length);  /* normal event */
        }
        
        /* Day & Week Views - Apply category color to item box*/
        
        categoryList = cal.category.fromPrefs();
        
        for (i = 0; i < categoryList.length; i++)
        {
            categoryName = cal.view.formatStringForCSSRule(categoryList[i]);
            
            backColor = calendarTweaks.catprefs.getCharPref(categoryName,"#E0E0E0");
            foreColor = cal.view.getContrastingTextColor(backColor);
            
            sheet.insertRule("window[calendartweaks-eventbkgdcolor] calendar-editable-item[categories^=\"" + categoryName + "\"] .calendar-color-box " +
                             "{ background-color: var(--category-" + categoryName + "-color); color: " + foreColor + "; }",sheet.cssRules.length);  /* all day event */
            
            sheet.insertRule("window[calendartweaks-eventbkgdcolor] calendar-event-box[categories^=\"" + categoryName + "\"] .calendar-color-box " +
                             "{ background-color: var(--category-" + categoryName + "-color); color: " + foreColor + "; }",sheet.cssRules.length);  /* normal event */
        }
        
        /* Multiweek & Month Views - Apply calendar color to category box */
        
        calendars = cal.getCalendarManager().getCalendars({});
        
        for (calendar of calendars)
        {
            cssSafeId = cal.view.formatStringForCSSRule(calendar.id);
            
            sheet.insertRule("window[calendartweaks-eventbkgdcolor] calendar-month-day-box-item[style*=\"--calendar-" + cssSafeId + "-backcolor\"] .category-color-box hbox " +
                             "{ background-color: var(--calendar-" + cssSafeId + "-backcolor); }",sheet.cssRules.length);  /* normal event */
        }
        
        /* Multiweek & Month Views - Apply category color to item box*/
        
        categoryList = cal.category.fromPrefs();
        
        for (i = 0; i < categoryList.length; i++)
        {
            categoryName = cal.view.formatStringForCSSRule(categoryList[i]);
            
            backColor = calendarTweaks.catprefs.getCharPref(categoryName,"#E0E0E0");
            foreColor = cal.view.getContrastingTextColor(backColor);
            
            sheet.insertRule("window[calendartweaks-eventbkgdcolor] calendar-month-day-box-item[categories^=\"" + categoryName + "\"] .calendar-color-box " +
                             "{ background-color: var(--category-" + categoryName + "-color); color: " + foreColor + "; }",sheet.cssRules.length);  /* normal event */
        }
        
        /* Today Pane - Apply calendar color to item box */
        
        calendars = cal.getCalendarManager().getCalendars({});
        
        for (calendar of calendars)
        {
            cssSafeId = cal.view.formatStringForCSSRule(calendar.id);
            
            backColor = calendar.getProperty("color") || "#a8c2e1";
            foreColor = cal.view.getContrastingTextColor(backColor);
            
            sheet.insertRule("window[calendartweaks-eventtodaypane] richlistitem[is=agenda-richlist-item][calendar=\"" + cssSafeId + "\"] .agenda-event-box-2 " +
                             "{ background-color: var(--calendar-" + cssSafeId + "-backcolor); color: " + foreColor + "; }",sheet.cssRules.length);
            
            sheet.insertRule("window richlistitem[is=agenda-richlist-item][calendar=\"" + cssSafeId + "\"] .agenda-calendar-image " +
                             "{ background-color: var(--calendar-" + cssSafeId + "-backcolor) !important; }",sheet.cssRules.length);
        }
        
        /* Today Pane - Apply category color to item box */
        
        categoryList = cal.category.fromPrefs();
        
        for (i = 0; i < categoryList.length; i++)
        {
            categoryName = cal.view.formatStringForCSSRule(categoryList[i]);
            
            backColor = calendarTweaks.catprefs.getCharPref(categoryName,"#E0E0E0");
            foreColor = cal.view.getContrastingTextColor(backColor);
            
            sheet.insertRule("window[calendartweaks-eventtodaypane][calendartweaks-eventbkgdcolor] richlistitem[is=agenda-richlist-item][category=\"" + categoryName + "\"] .agenda-event-box-2 " +
                             "{ background-color: var(--category-" + categoryName + "-color); color: " + foreColor + "; }",sheet.cssRules.length);
            
            sheet.insertRule("window[calendartweaks-eventbkgdcolor] richlistitem[is=agenda-richlist-item][category=\"" + categoryName + "\"] .agenda-calendar-image " +
                             "{ background-color: var(--category-" + categoryName + "-color) !important; }",sheet.cssRules.length);
        }
        
        /* Today Pane - Apply category color to category box */
        
        categoryList = cal.category.fromPrefs();
        
        for (i = 0; i < categoryList.length; i++)
        {
            categoryName = cal.view.formatStringForCSSRule(categoryList[i]);
            
            sheet.insertRule("window[calendartweaks-eventtodaypane] richlistitem[is=agenda-richlist-item][category=\"" + categoryName + "\"] .category-bkgd-box " +
                             "{ background-color: var(--category-" + categoryName + "-color); }",sheet.cssRules.length);
        }
        
        /* Today Pane - Apply calendar color to category box*/
        
        calendars = cal.getCalendarManager().getCalendars({});
        
        for (calendar of calendars)
        {
            cssSafeId = cal.view.formatStringForCSSRule(calendar.id);
            
            sheet.insertRule("window[calendartweaks-eventtodaypane][calendartweaks-eventbkgdcolor] richlistitem[is=agenda-richlist-item][calendar=\"" + cssSafeId + "\"] .category-bkgd-box " +
                             "{ background-color: var(--calendar-" + cssSafeId + "-backcolor); }",sheet.cssRules.length);
        }
    },
    
    /************************************************************************/
    
    /* Add selected attribute to selected calendar column and header */
    
    addSelectedAttributes: function()
    {
        var index,view,columns,col,bgbox,firstlinebox,labeldaybox;
        
        index = +getViewDeck().selectedIndex;
        
        /* Week View */
        
        if (index == 1)
        {
            view = document.getElementById("week-view");
            
            columns = view.querySelectorAll("calendar-event-column");
            
            for (col = 0; col < columns.length; col++)
            {
                bgbox = document.getAnonymousElementByAttribute(columns[col],"anonid","bgbox");
                
                firstlinebox = bgbox.children[0];
                
                if (firstlinebox.hasAttribute("selected")) columns[col].setAttribute("selected-column","true");
                else columns[col].removeAttribute("selected-column");
                
                labeldaybox = document.getElementById("week-view").getElementsByClassName("labeldaybox")[0];
                
                if (firstlinebox.hasAttribute("selected")) labeldaybox.children[col].setAttribute("selected-label","true");
                else labeldaybox.children[col].removeAttribute("selected-label");
            }
        }
    },
    
    /************************************************************************/
    
    /* Add repeating event icons */
    
    addRepeatEventIcons: function()
    {
        var i,index,view,columns,col,topbox,elements,alarmiconsbox,repeaticonsbox,backcolorbox,forecolor;
        
        index = +getViewDeck().selectedIndex;
        
        /* Day & Week Views */
        
        if (index == 0 || index == 1)
        {
            view = (index == 0) ? document.getElementById("day-view") : document.getElementById("week-view");
            
            columns = view.querySelectorAll("calendar-event-column");
            
            for (col = 0; col < columns.length; col++)
            {
                topbox = document.getAnonymousElementByAttribute(columns[col],"anonid","topbox");
            
                elements = topbox.querySelectorAll("calendar-event-box");
                
                for (i = 0; i < elements.length; i++)
                {
                    alarmiconsbox = document.getAnonymousElementByAttribute(elements[i],"anonid","alarm-icons-box");
                    if (alarmiconsbox.previousElementSibling.localName != "hbox")
                    {
                        repeaticonsbox = document.createElement("hbox");
                        repeaticonsbox.setAttribute("class","repeat-icons-box");
                        alarmiconsbox.parentNode.insertBefore(repeaticonsbox,alarmiconsbox);
                    }
                    
                    backcolorbox = document.getAnonymousElementByAttribute(elements[i],"anonid","event-container");
                    forecolor = calendarTweaks.getForeColor(backcolorbox);
                    calendarTweaks.setRecurrence(elements[i],forecolor);
                }
            }
        }
        
        /* Multiweek & Month Views */
        
        if (index == 2 || index == 3)
        {
            view = (index == 2) ? document.getElementById("multiweek-view") : document.getElementById("month-view");
            
            elements = view.querySelectorAll("calendar-month-day-box-item");
            
            for (i = 0; i < elements.length; i++)
            {
                alarmiconsbox = document.getAnonymousElementByAttribute(elements[i],"anonid","alarm-icons-box");
                if (alarmiconsbox.previousElementSibling == null)
                {
                    repeaticonsbox = document.createElement("hbox");
                    repeaticonsbox.setAttribute("class","repeat-icons-box");
                    alarmiconsbox.parentNode.insertBefore(repeaticonsbox,alarmiconsbox);
                }
                
                backcolorbox = document.getAnonymousElementByAttribute(elements[i],"anonid","event-container");
                forecolor = calendarTweaks.getForeColor(backcolorbox);
                calendarTweaks.setRecurrence(elements[i],forecolor);
            }
        }
    },
    
    /************************************************************************/
    
    /* Restructure agenda list items and add attributes */
    
    restructureAgendaList: function()
    {
        var i,elements,todaytomorrow,richlistbox,agendadesc,agendastart,agendatitle;
        var agendaeventbox2,vbox,agendatitle2,repeaticonsbox,categorybkgdbox;
        var calid,catname,backcolorbox,forecolor;
        var catnames = new Array();
        
        /* Today Pane  */
        
        todaytomorrow = true;
        
        richlistbox = document.getElementById("agenda-listbox");
        
        elements = richlistbox.querySelectorAll("richlistitem");
        
        for (i = 0; i < elements.length; i++)
        {
            if (elements[i].hasAttribute("id") && elements[i].getAttribute("id") == "nextweek-header")
            {
                todaytomorrow = false;
            }
            else if (elements[i].hasAttribute("is") && elements[i].getAttribute("is") == "agenda-allday-richlist-item")
            {
                if (todaytomorrow) elements[i].setAttribute("today-tomorrow","true");
            }
            else if (elements[i].hasAttribute("is") && elements[i].getAttribute("is") == "agenda-richlist-item")
            {
                if (todaytomorrow) elements[i].setAttribute("today-tomorrow","true");
                
                /* Restructure rich list item */
                
                agendadesc = elements[i].getElementsByClassName("agenda-description")[0];
                agendastart = elements[i].getElementsByClassName("agenda-event-start")[0];
                agendatitle = elements[i].getElementsByClassName("agenda-event-title")[0];
                
                if (agendadesc.children[1].localName == "label")
                {
                    agendadesc.children[0].setAttribute("class","agenda-event-box-1");
                    
                    agendaeventbox2 = document.createElement("hbox");
                    agendaeventbox2.setAttribute("class","agenda-event-box-2");
                    agendadesc.insertBefore(agendaeventbox2,agendatitle);
                    
                    vbox = document.createElement("vbox");
                    vbox.setAttribute("flex","1");
                    agendaeventbox2.appendChild(vbox);
                    
                    agendadesc.removeChild(agendatitle);
                    vbox.appendChild(agendatitle);
                    
                    agendatitle2 = document.createElement("label");
                    agendatitle2.setAttribute("class","agenda-event-title-2");
                    vbox.appendChild(agendatitle2);
                    
                    repeaticonsbox = document.createElement("hbox");
                    repeaticonsbox.setAttribute("class","repeat-icons-box");
                    agendaeventbox2.appendChild(repeaticonsbox);
                    
                    categorybkgdbox = document.createElement("hbox");
                    categorybkgdbox.setAttribute("class","category-bkgd-box");
                    agendaeventbox2.appendChild(categorybkgdbox);
                }
                
                if (todaytomorrow)
                {
                    if (agendastart.textContent.length > 5)
                    {
                        agendatitle.textContent = agendastart.textContent.substr(6);
                        agendatitle2.textContent = agendastart.textContent;
                        agendastart.textContent = agendastart.textContent.substr(0,5);
                    }
                }
                
                /* Add calendar id and category name atributes */
                
                calid = elements[i].mOccurrence.calendar.id;
                calid = cal.view.formatStringForCSSRule(calid);
                elements[i].setAttribute("calendar",calid);
                
                catnames = elements[i].mOccurrence.getCategories({});
                if (typeof catnames[0] != "undefined")
                {
                    catname = cal.view.formatStringForCSSRule(catnames[0]);
                    elements[i].setAttribute("category",catname);
                }
                
                /* Add recurrence attribute */
                
                backcolorbox = elements[i].getElementsByClassName("agenda-event-box-2")[0];
                forecolor = calendarTweaks.getForeColor(backcolorbox);
                calendarTweaks.setRecurrence(elements[i],forecolor);
            }
        }
    },
    
    /* Utility functions */
    
    getForeColor: function(backcolorbox)
    {
        var backcolor,r,g,b;
        var rgbColors = new Array();
        
        backcolor = window.getComputedStyle(backcolorbox,null).getPropertyValue("background-color");
        
        rgbColors = backcolor.match(/rgb\((\d+),\s(\d+),\s(\d+)\)/);
        
        if (rgbColors == null) return "#000000";
        
        r = (+rgbColors[1]).toString(16).toUpperCase();
        if (r.length < 2) r = "0" + r;
        g = (+rgbColors[2]).toString(16).toUpperCase();
        if (g.length < 2) g = "0" + g;
        b = (+rgbColors[3]).toString(16).toUpperCase();
        if (b.length < 2) b = "0" + b;
        
        return cal.view.getContrastingTextColor("#" + r + g + b);
    },
    
    setRecurrence: function(element,forecolor)
    {
        var item,type;
        
        item = element.mOccurrence;
        
        if (item.parentItem != item && item.parentItem.recurrenceInfo)
        {
            type = (item.parentItem.recurrenceInfo.getExceptionFor(item.recurrenceId)) ? "except" : "normal";
            
            element.setAttribute("recurrence",type + "-" + forecolor);
        }
    },
    
    /************************************************************************/
    
    /* Refresh display function */
    
    refresh: function()
    {
        /* Refresh calendar views */
        
        document.getElementById("day-view").refreshView();
        document.getElementById("week-view").refreshView();
        document.getElementById("multiweek-view").refreshView();
        document.getElementById("month-view").refreshView();
        
        /* Refresh today pane */
        
        agendaListbox.refreshCalendarQuery();
    },
    
    /************************************************************************/
    
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
