/************************************************************************/
/*                                                                      */
/*      Calendar Tweaks  -  Thunderbird Extension  -  Options           */
/*                                                                      */
/*      Javascript for Options dialog                                   */
/*                                                                      */
/*      Copyright (C) 2008-2018  by  DW-dev                             */
/*                                                                      */
/*      Last Edit  -  05 Sep 2018                                       */
/*                                                                      */
/************************************************************************/

"use strict";

var calendarTweaksOptions =
{
    appInfo: Components.classes["@mozilla.org/xre/app-info;1"].getService(Components.interfaces.nsIXULAppInfo),
    versionComparator: Components.classes["@mozilla.org/xpcom/version-comparator;1"].getService(Components.interfaces.nsIVersionComparator),
    tbVersion: "",
    
    prefs: Components.classes["@mozilla.org/preferences-service;1"].getService(Components.interfaces.nsIPrefService).getBranch("extensions.calendartweaks."),
    
    pickerButton: null,
    
    // promptService: Components.classes["@mozilla.org/embedcomp/prompt-service;1"].getService(Components.interfaces.nsIPromptService),
    // consoleService: Components.classes["@mozilla.org/consoleservice;1"].getService(Components.interfaces.nsIConsoleService),
    
    // calendarTweaksOptions.promptService.alert(window,"Alert Title", "Alert Message");
    // calendarTweaksOptions.consoleService.logStringMessage("Error Console Message");
    
    initPrefs: function()
    {
        var checkbox,checkstate;
        
        /* Determine Thunderbird version and set attribute */
        
        if (calendarTweaksOptions.versionComparator.compare(calendarTweaksOptions.appInfo.version,"60.0a1") >= 0) calendarTweaksOptions.tbVersion = "60.0";
        else if (calendarTweaksOptions.versionComparator.compare(calendarTweaksOptions.appInfo.version,"38.0a1") >= 0) calendarTweaksOptions.tbVersion = "38.0";
        else if (calendarTweaksOptions.versionComparator.compare(calendarTweaksOptions.appInfo.version,"31.0a1") >= 0) calendarTweaksOptions.tbVersion = "31.0";
        else calendarTweaksOptions.tbVersion = "24.0";
        
        document.getElementById("calendartweaks-options").setAttribute("calendartweaks-tbversion",calendarTweaksOptions.tbVersion);
        
        /* Add listener for mousedown on picker panel */
        
        document.getElementById("calendartweaks-picker-panel").addEventListener("mousedown",calendarTweaksOptions.pickerPanelMouseDown,false);
        
        /* Add listeners for popupshowing on standard/background palettes */
        
        document.getElementById("calendartweaks-picker-normalpalette").addEventListener("popupshowing",calendarTweaksOptions.pickerPaletteShowing,false);
        document.getElementById("calendartweaks-picker-dayboxpalette").addEventListener("popupshowing",calendarTweaksOptions.pickerPaletteShowing,false);
        
        /* Today and Selection */
        
        checkbox = document.getElementById("calendartweaks-newtoday");
        try
        {
            checkstate = calendarTweaksOptions.prefs.getBoolPref("newtoday");
            checkbox.checked = checkstate;
        }
        catch(e)
        {
            checkbox.checked = true;
        }
        
        checkbox = document.getElementById("calendartweaks-newselday");
        try
        {
            checkstate = calendarTweaksOptions.prefs.getBoolPref("newselday");
            checkbox.checked = checkstate;
        }
        catch(e)
        {
            checkbox.checked = true;
        }
        
        checkbox = document.getElementById("calendartweaks-showondayview");
        try
        {
            checkstate = calendarTweaksOptions.prefs.getBoolPref("showondayview");
            checkbox.checked = checkstate;
        }
        catch(e)
        {
            checkbox.checked = true;
        }
        
        /* Miscellaneous */
        
        checkbox = document.getElementById("calendartweaks-datelabelbkgd");
        try
        {
            checkstate = calendarTweaksOptions.prefs.getBoolPref("datelabelbkgd");
            checkbox.checked = checkstate;
        }
        catch(e)
        {
            checkbox.checked = true;
        }
        
        checkbox = document.getElementById("calendartweaks-distinctother");
        try
        {
            checkstate = calendarTweaksOptions.prefs.getBoolPref("distinctother");
            checkbox.checked = checkstate;
        }
        catch(e)
        {
            checkbox.checked = true;
        }
        
        checkbox = document.getElementById("calendartweaks-alldaylabel");
        try
        {
            checkstate = calendarTweaksOptions.prefs.getBoolPref("alldaylabel");
            checkbox.checked = checkstate;
        }
        catch(e)
        {
            checkbox.checked = true;
        }
        
        /* Event Styles */
        
        checkbox = document.getElementById("calendartweaks-eventborder");
        try
        {
            checkstate = calendarTweaksOptions.prefs.getBoolPref("eventborder");
            checkbox.checked = checkstate;
        }
        catch(e)
        {
            checkbox.checked = true;
        }
        
        checkbox = document.getElementById("calendartweaks-eventsingleline");
        try
        {
            checkstate = calendarTweaksOptions.prefs.getBoolPref("eventsingleline");
            checkbox.checked = checkstate;
        }
        catch(e)
        {
            checkbox.checked = true;
        }
        
        checkbox = document.getElementById("calendartweaks-eventreduceheight");
        try
        {
            checkstate = calendarTweaksOptions.prefs.getBoolPref("eventreduceheight");
            checkbox.checked = checkstate;
        }
        catch(e)
        {
            checkbox.checked = false;
        }
        
        checkbox = document.getElementById("calendartweaks-eventtodaypane");
        try
        {
            checkstate = calendarTweaksOptions.prefs.getBoolPref("eventtodaypane");
            checkbox.checked = checkstate;
        }
        catch(e)
        {
            checkbox.checked = false;
        }
        
        checkbox = document.getElementById("calendartweaks-eventbkgdcolor");
        try
        {
            checkstate = calendarTweaksOptions.prefs.getBoolPref("eventbkgdcolor");
            checkbox.checked = checkstate;
        }
        catch(e)
        {
            checkbox.checked = false;
        }
        
        checkbox = document.getElementById("calendartweaks-eventbkgdnocat");
        try
        {
            checkstate = calendarTweaksOptions.prefs.getBoolPref("eventbkgdnocat");
            checkbox.checked = checkstate;
        }
        catch(e)
        {
            checkbox.checked = false;
        }
        calendarTweaksOptions.setEventBkgdNocatState();
        
        /* Repeating Events */
        
        checkbox = document.getElementById("calendartweaks-repeatnormal");
        try
        {
            checkstate = calendarTweaksOptions.prefs.getBoolPref("repeatnormal");
            checkbox.checked = checkstate;
        }
        catch(e)
        {
            checkbox.checked = true;
        }
        
        checkbox = document.getElementById("calendartweaks-repeatexcept");
        try
        {
            checkstate = calendarTweaksOptions.prefs.getBoolPref("repeatexcept");
            checkbox.checked = checkstate;
        }
        catch(e)
        {
            checkbox.checked = true;
        }
        
        /* Today Colors */
        
        try
        {
            calendarTweaksOptions.pickerSetColor("calendartweaks-todayheadercolor",calendarTweaksOptions.prefs.getCharPref("todayheadercolor"));
        }
        catch(e)
        {
            calendarTweaksOptions.pickerSetColor("calendartweaks-todayheadercolor","#FFC0C0");
        }
        
        try
        {
            calendarTweaksOptions.pickerSetColor("calendartweaks-todaydayboxcolor",calendarTweaksOptions.prefs.getCharPref("todaydayboxcolor"));
        }
        catch(e)
        {
            calendarTweaksOptions.pickerSetColor("calendartweaks-todaydayboxcolor","#FFF0F0");
        }
        
        try
        {
            calendarTweaksOptions.pickerSetColor("calendartweaks-todaybordercolor",calendarTweaksOptions.prefs.getCharPref("todaybordercolor"));
        }
        catch(e)
        {
            calendarTweaksOptions.pickerSetColor("calendartweaks-todaybordercolor","#FFA0A0");
        }
        
        /* Selected Day Colors */
        
        try
        {
            calendarTweaksOptions.pickerSetColor("calendartweaks-seldayheadercolor",calendarTweaksOptions.prefs.getCharPref("seldayheadercolor"));
        }
        catch(e)
        {
            calendarTweaksOptions.pickerSetColor("calendartweaks-seldayheadercolor","#FFE696");
        }
        
        try
        {
            calendarTweaksOptions.pickerSetColor("calendartweaks-seldaydayboxcolor",calendarTweaksOptions.prefs.getCharPref("seldaydayboxcolor"));
        }
        catch(e)
        {
            calendarTweaksOptions.pickerSetColor("calendartweaks-seldaydayboxcolor","#FFFAE8");
        }
        
        try
        {
            calendarTweaksOptions.pickerSetColor("calendartweaks-seldaybordercolor",calendarTweaksOptions.prefs.getCharPref("seldaybordercolor"));
        }
        catch(e)
        {
            calendarTweaksOptions.pickerSetColor("calendartweaks-seldaybordercolor","#E8D088");
        }
        
        /* Border Settings */
        
        checkbox = document.getElementById("calendartweaks-borderallviews");
        try
        {
            checkstate = calendarTweaksOptions.prefs.getBoolPref("borderallviews");
            checkbox.checked = checkstate;
        }
        catch(e)
        {
            checkbox.checked = false;
        }
        
        checkbox = document.getElementById("calendartweaks-borderminimonth");
        try
        {
            checkstate = calendarTweaksOptions.prefs.getBoolPref("borderminimonth");
            checkbox.checked = checkstate;
        }
        catch(e)
        {
            checkbox.checked = true;
        }
    },
    
    setEventBkgdNocatState: function(element)
    {
        document.getElementById("calendartweaks-eventbkgdnocat").disabled = !document.getElementById("calendartweaks-eventbkgdcolor").checked;
    },
    
    restoreDefaultColors: function(style)
    {
        if (style == 1)  /* Calendar Tweaks */
        {
            calendarTweaksOptions.pickerSetColor("calendartweaks-todayheadercolor","#FFC0C0");  /* Today - MW/Month - Date Header */
            calendarTweaksOptions.pickerSetColor("calendartweaks-todaydayboxcolor","#FFF0F0");  /* Today - MW/Month - Day Box */
            calendarTweaksOptions.pickerSetColor("calendartweaks-todaybordercolor","#FFA0A0");  /* Today - MW/Month - Borders (on) */
            
            calendarTweaksOptions.pickerSetColor("calendartweaks-seldayheadercolor","#FFE696");  /* SelDay - MW/Month - Date Header */
            calendarTweaksOptions.pickerSetColor("calendartweaks-seldaydayboxcolor","#FFFAE8");  /* SelDay - MW/Month - Day Box */
            calendarTweaksOptions.pickerSetColor("calendartweaks-seldaybordercolor","#E8D088");  /* SelDay - Mini-Month - Borders (on) */
            
            document.getElementById("calendartweaks-borderallviews").checked = false;
            document.getElementById("calendartweaks-borderminimonth").checked = true;
        }
        else /* style == 2 */  /* Lightning 6.2 */
        {
            calendarTweaksOptions.pickerSetColor("calendartweaks-todayheadercolor","#D2E3F3");  /* Today - MW/Month - Date Header */
            calendarTweaksOptions.pickerSetColor("calendartweaks-todaydayboxcolor","#E1F0FD");  /* Today - MW/Month - Day Box */
            calendarTweaksOptions.pickerSetColor("calendartweaks-todaybordercolor","#7FB9EE");  /* Today - MW/Month - Borders */
            
            calendarTweaksOptions.pickerSetColor("calendartweaks-seldayheadercolor","#F2EDB2");  /* SelDay - MW/Month - Date Header */
            calendarTweaksOptions.pickerSetColor("calendartweaks-seldaydayboxcolor","#FFFCD8");  /* SelDay - MW/Month - Day Box */
            calendarTweaksOptions.pickerSetColor("calendartweaks-seldaybordercolor","#D9C585");  /* SelDay - Mini-Month - Borders */
            
            document.getElementById("calendartweaks-borderallviews").checked = true;
            document.getElementById("calendartweaks-borderminimonth").checked = true;
        }
    },
    
    savePrefs: function()
    {
        /* Today and Selection */
        
        calendarTweaksOptions.prefs.setBoolPref("newtoday",document.getElementById("calendartweaks-newtoday").checked);
        calendarTweaksOptions.prefs.setBoolPref("newselday",document.getElementById("calendartweaks-newselday").checked);
        calendarTweaksOptions.prefs.setBoolPref("showondayview",document.getElementById("calendartweaks-showondayview").checked);
        
        /* Miscellanous */
        
        calendarTweaksOptions.prefs.setBoolPref("datelabelbkgd",document.getElementById("calendartweaks-datelabelbkgd").checked);
        calendarTweaksOptions.prefs.setBoolPref("distinctother",document.getElementById("calendartweaks-distinctother").checked);
        calendarTweaksOptions.prefs.setBoolPref("alldaylabel",document.getElementById("calendartweaks-alldaylabel").checked);
        
        /* Event Styles */
        
        calendarTweaksOptions.prefs.setBoolPref("eventborder",document.getElementById("calendartweaks-eventborder").checked);
        calendarTweaksOptions.prefs.setBoolPref("eventsingleline",document.getElementById("calendartweaks-eventsingleline").checked);
        calendarTweaksOptions.prefs.setBoolPref("eventreduceheight",document.getElementById("calendartweaks-eventreduceheight").checked);
        calendarTweaksOptions.prefs.setBoolPref("eventtodaypane",document.getElementById("calendartweaks-eventtodaypane").checked);
        calendarTweaksOptions.prefs.setBoolPref("eventbkgdcolor",document.getElementById("calendartweaks-eventbkgdcolor").checked);
        calendarTweaksOptions.prefs.setBoolPref("eventbkgdnocat",document.getElementById("calendartweaks-eventbkgdnocat").checked);
        
        /* Repeating Events */
        
        calendarTweaksOptions.prefs.setBoolPref("repeatnormal",document.getElementById("calendartweaks-repeatnormal").checked);
        calendarTweaksOptions.prefs.setBoolPref("repeatexcept",document.getElementById("calendartweaks-repeatexcept").checked);
        
        /* Today Colors */
        
        calendarTweaksOptions.prefs.setCharPref("todayheadercolor",calendarTweaksOptions.pickerGetColor("calendartweaks-todayheadercolor"));
        calendarTweaksOptions.prefs.setCharPref("todaydayboxcolor",calendarTweaksOptions.pickerGetColor("calendartweaks-todaydayboxcolor"));
        calendarTweaksOptions.prefs.setCharPref("todaybordercolor",calendarTweaksOptions.pickerGetColor("calendartweaks-todaybordercolor"));
        
        /* Selected Day Colors */
        
        calendarTweaksOptions.prefs.setCharPref("seldayheadercolor",calendarTweaksOptions.pickerGetColor("calendartweaks-seldayheadercolor"));
        calendarTweaksOptions.prefs.setCharPref("seldaydayboxcolor",calendarTweaksOptions.pickerGetColor("calendartweaks-seldaydayboxcolor"));
        calendarTweaksOptions.prefs.setCharPref("seldaybordercolor",calendarTweaksOptions.pickerGetColor("calendartweaks-seldaybordercolor"));
        
        /* Border Settings */
        
        calendarTweaksOptions.prefs.setBoolPref("borderallviews",document.getElementById("calendartweaks-borderallviews").checked);
        calendarTweaksOptions.prefs.setBoolPref("borderminimonth",document.getElementById("calendartweaks-borderminimonth").checked);
    },
    
    /********************************************************************/
    
    /* Color picker functions */
    
    pickerOpen: function(button)
    {
        var index,hbox,r,g,b;
        var rgbColors = new Array();
        var HSV = new Object();
        
        document.getElementById("calendartweaks-picker-panel").hidePopup();
        
        calendarTweaksOptions.pickerButton = button;
        
        if (button.id.indexOf("header") >= 0)
        {
            document.getElementById("calendartweaks-picker-headertitle").hidden = false;
            document.getElementById("calendartweaks-picker-dayboxtitle").hidden = true;
            document.getElementById("calendartweaks-picker-bordertitle").hidden = true;
            
            document.getElementById("calendartweaks-picker-normalpalette").hidden = false;
            document.getElementById("calendartweaks-picker-dayboxpalette").hidden = true;
            
            document.getElementById("calendartweaks-picker-checkbox").hidden = false;
        }
        else if (button.id.indexOf("daybox") >= 0)
        {
            document.getElementById("calendartweaks-picker-headertitle").hidden = true;
            document.getElementById("calendartweaks-picker-dayboxtitle").hidden = false;
            document.getElementById("calendartweaks-picker-bordertitle").hidden = true;
            
            document.getElementById("calendartweaks-picker-normalpalette").hidden = true;
            document.getElementById("calendartweaks-picker-dayboxpalette").hidden = false;
            
            document.getElementById("calendartweaks-picker-checkbox").hidden = true;
        }
        else /* border */
        {
            document.getElementById("calendartweaks-picker-headertitle").hidden = true;
            document.getElementById("calendartweaks-picker-dayboxtitle").hidden = true;
            document.getElementById("calendartweaks-picker-bordertitle").hidden = false;
            
            document.getElementById("calendartweaks-picker-normalpalette").hidden = false;
            document.getElementById("calendartweaks-picker-dayboxpalette").hidden = true;
            
            document.getElementById("calendartweaks-picker-checkbox").hidden = true;
        }
        
        document.getElementById("calendartweaks-picker-panel").openPopup(button,"after_start",0,1,false,false,null);
        
        hbox = document.getAnonymousElementByAttribute(button,"class","box-inherit button-box");
        rgbColors = hbox.style.getPropertyValue("background-color").match(/rgb\((\d+),\s(\d+),\s(\d+)\)/);
        
        r = Number(rgbColors[1]);
        g = Number(rgbColors[2]);
        b = Number(rgbColors[3]);
        
        calendarTweaksOptions.pickerRGBtoHSV(r,g,b,HSV);
        calendarTweaksOptions.pickerUpdateElements(r,g,b,HSV.h,HSV.s,HSV.v);
        
        document.getElementById("calendartweaks-picker-autodaybox").checked = calendarTweaksOptions.prefs.getBoolPref("picker-autodaybox");
        
        window.addEventListener("keypress",calendarTweaksOptions.pickerReturn,true);
    },
    
    pickerRGBScaleChange: function()
    {
        var r,g,b;
        var HSV = new Object();
        
        r = document.getElementById("calendartweaks-picker-scale-r").value;
        g = document.getElementById("calendartweaks-picker-scale-g").value;
        b = document.getElementById("calendartweaks-picker-scale-b").value;
        
        calendarTweaksOptions.pickerRGBtoHSV(r,g,b,HSV);
        calendarTweaksOptions.pickerUpdateElements(r,g,b,HSV.h,HSV.s,HSV.v);
    },
    
    pickerHSVScaleChange: function()
    {
        var h,s,v;
        var RGB = new Object();
        
        h = document.getElementById("calendartweaks-picker-scale-h").value;
        s = document.getElementById("calendartweaks-picker-scale-s").value;
        v = document.getElementById("calendartweaks-picker-scale-v").value;
        
        calendarTweaksOptions.pickerHSVtoRGB(h,s,v,RGB);
        calendarTweaksOptions.pickerUpdateElements(RGB.r,RGB.g,RGB.b,h,s,v);
    },
    
    pickerRGBValueChange: function()
    {
        var r,g,b;
        var HSV = new Object();
        
        r = document.getElementById("calendartweaks-picker-value-r").value;
        g = document.getElementById("calendartweaks-picker-value-g").value;
        b = document.getElementById("calendartweaks-picker-value-b").value;
        
        calendarTweaksOptions.pickerRGBtoHSV(r,g,b,HSV);
        calendarTweaksOptions.pickerUpdateElements(r,g,b,HSV.h,HSV.s,HSV.v);
    },
    
    pickerHSVValueChange: function()
    {
        var h,s,v;
        var RGB = new Object();
        
        h = document.getElementById("calendartweaks-picker-value-h").value;
        s = document.getElementById("calendartweaks-picker-value-s").value;
        v = document.getElementById("calendartweaks-picker-value-v").value;
        
        calendarTweaksOptions.pickerHSVtoRGB(h,s,v,RGB);
        calendarTweaksOptions.pickerUpdateElements(RGB.r,RGB.g,RGB.b,h,s,v);
    },
    
    pickerHexStrChange: function()
    {
        var hexstr,i,value,r,g,b;
        var HSV = new Object();
        
        hexstr = document.getElementById("calendartweaks-picker-hexstr").value;
        
        for (i = 0; i < hexstr.length; i++)
        {
            if (hexstr.charAt(i) >= "0" && hexstr.charAt(i) <= "9") continue;
            if (hexstr.charAt(i) >= "A" && hexstr.charAt(i) <= "F") continue;
            if (hexstr.charAt(i) >= "a" && hexstr.charAt(i) <= "f") continue;
            hexstr = hexstr.substr(0,i) + hexstr.substr(i+1);
            i--;
        }
        
        hexstr = hexstr.toUpperCase();
        hexstr = hexstr.substr(-6);
        while (hexstr.length < 6) hexstr = "0" + hexstr;
        
        i = document.getElementById("calendartweaks-picker-hexstr").selectionEnd;
        i += 6-document.getElementById("calendartweaks-picker-hexstr").textLength;
        document.getElementById("calendartweaks-picker-hexstr").value = hexstr; 
        document.getElementById("calendartweaks-picker-hexstr").selectionEnd = i;
        
        value = parseInt(hexstr,16);
        
        r = (value >> 16) & 0xFF;
        g = (value >> 8) & 0xFF;
        b =  value & 0xFF;
        
        calendarTweaksOptions.pickerRGBtoHSV(r,g,b,HSV);
        calendarTweaksOptions.pickerUpdateElements(r,g,b,HSV.h,HSV.s,HSV.v);
    },
    
    pickerPaletteChange: function()
    {
        var button,hexstr,value,r,g,b;
        var HSV = new Object();
        
        /* Gets called twice for each change to palette color - may be bug in <colorpicker> */
        
        button = calendarTweaksOptions.pickerButton;
        
        if (button.id.indexOf("header") >= 0) hexstr = document.getElementById("calendartweaks-picker-normalpalette").color.substr(1);
        else if (button.id.indexOf("daybox") >= 0) hexstr = document.getElementById("calendartweaks-picker-dayboxpalette").color.substr(1);
        else /* border */ hexstr = document.getElementById("calendartweaks-picker-normalpalette").color.substr(1);
        
        value = parseInt(hexstr,16);
        
        r = (value >> 16) & 0xFF;
        g = (value >> 8) & 0xFF;
        b =  value & 0xFF;
        
        calendarTweaksOptions.pickerRGBtoHSV(r,g,b,HSV);
        calendarTweaksOptions.pickerUpdateElements(r,g,b,HSV.h,HSV.s,HSV.v);
    },
    
    pickerAutoDayBoxChange: function()
    {
        var r,g,b;
        var HSV = new Object();
        
        if (document.getElementById("calendartweaks-picker-normalpalette").open ||
            document.getElementById("calendartweaks-picker-dayboxpalette").open)
        {
            document.getElementById("calendartweaks-picker-autodaybox").checked = !document.getElementById("calendartweaks-picker-autodaybox").checked;
            
            document.getElementById("calendartweaks-picker-normalpalette").hidePopup();
            document.getElementById("calendartweaks-picker-dayboxpalette").hidePopup();
        }
        else
        {
            calendarTweaksOptions.prefs.setBoolPref("picker-autodaybox",document.getElementById("calendartweaks-picker-autodaybox").checked);
            
            r = document.getElementById("calendartweaks-picker-scale-r").value;
            g = document.getElementById("calendartweaks-picker-scale-g").value;
            b = document.getElementById("calendartweaks-picker-scale-b").value;
            
            calendarTweaksOptions.pickerRGBtoHSV(r,g,b,HSV);
            calendarTweaksOptions.pickerUpdateElements(r,g,b,HSV.h,HSV.s,HSV.v);
        }
    },
    
    pickerUpdateElements: function(r,g,b,h,s,v)
    {
        var value,hexlo,hexhi,hexstr,i,button,style,index;
        var RGB = new Object();
        var HSV = new Object();
        
        var normalPaletteColors = new Array(
            "FFFFFF","CCCCCC","C0C0C0","999999","666666","333333","000000",
            "FFCCCC","FF6666","FF0000","CC0000","990000","660000","330000",
            "FFCC99","FF9966","FF9900","FF6600","CC6600","993300","663300",
            "FFFF99","FFFF66","FFCC66","FFCC33","CC9933","996633","663333",
            "FFFFCC","FFFF33","FFFF00","FFCC00","999900","666600","333300",
            "99FF99","66FF99","33FF33","33CC00","009900","006600","003300",
            "99FFFF","33FFFF","66CCCC","00CCCC","339999","336666","003333", 
            "CCFFFF","66FFFF","33CCFF","3366FF","3333FF","000099","000066", 
            "CCCCFF","9999FF","6666CC","6633FF","6600CC","333399","330099",
            "FFCCFF","FF99FF","CC66CC","CC33CC","993399","663366","330033");
        
        var dayboxPaletteColors = new Array(
            "FFFFFF","F7F7F7","F8F8F8","EFEFEF","E7E7E7","DFDFDF","D7D7D7",
            "FFF7F7","FFE7E7","FFD7D7","F7D7D7","EFD7D7","E7D7D7","DFD7D7",
            "FFF7EF","FFEFE7","FFEFD7","FFE7D7","F7E7D7","EFDFD7","E7DFD7",
            "FFFFEF","FFFFE7","FFF7E7","FFF7DF","F7EFDF","EFE7DF","E7DFDF",
            "FFFFF7","FFFFDF","FFFFD7","FFF7D7","EFEFD7","E7E7D7","DFDFD7",
            "EFFFEF","E7FFEF","DFFFDF","DFF7D7","D7EFD7","D7E7D7","D7DFD7",
            "EFFFFF","DFFFFF","E7F7F7","D7F7F7","DFEFEF","DFE7E7","D7DFDF",
            "F7FFFF","E7FFFF","DFF7FF","DFE7FF","DFDFFF","D7D7EF","D7D7E7",
            "F7F7FF","EFEFFF","E7E7F7","E7DFFF","E7D7F7","DFDFEF","DFD7EF",
            "FFF7FF","FFEFFF","F7E7F7","F7DFF7","EFDFEF","E7DFE7","DFD7DF");
        
        /* Update RGB scales and values */
        
        document.getElementById("calendartweaks-picker-scale-r").value = r;
        document.getElementById("calendartweaks-picker-scale-g").value = g;
        document.getElementById("calendartweaks-picker-scale-b").value = b;
        
        document.getElementById("calendartweaks-picker-value-r").value = r;
        document.getElementById("calendartweaks-picker-value-g").value = g;
        document.getElementById("calendartweaks-picker-value-b").value = b;
        
        hexlo = calendarTweaksOptions.pickerMakeHexStr(0,g,b);
        hexhi = calendarTweaksOptions.pickerMakeHexStr(255,g,b);
        document.getElementById("calendartweaks-picker-scale-r").style.setProperty("background-image","-moz-linear-gradient(left,#" + hexlo + ",#" + hexhi + ")","");
        
        hexlo = calendarTweaksOptions.pickerMakeHexStr(r,0,b);
        hexhi = calendarTweaksOptions.pickerMakeHexStr(r,255,b);
        document.getElementById("calendartweaks-picker-scale-g").style.setProperty("background-image","-moz-linear-gradient(left,#" + hexlo + ",#" + hexhi + ")","");
        
        hexlo = calendarTweaksOptions.pickerMakeHexStr(r,g,0);
        hexhi = calendarTweaksOptions.pickerMakeHexStr(r,g,255);
        document.getElementById("calendartweaks-picker-scale-b").style.setProperty("background-image","-moz-linear-gradient(left,#" + hexlo + ",#" + hexhi + ")","");
        
        /* Update HSV scales and values */
        
        document.getElementById("calendartweaks-picker-scale-h").value = h;
        document.getElementById("calendartweaks-picker-scale-s").value = s;
        document.getElementById("calendartweaks-picker-scale-v").value = v;
        
        document.getElementById("calendartweaks-picker-value-h").value = h;
        document.getElementById("calendartweaks-picker-value-s").value = s;
        document.getElementById("calendartweaks-picker-value-v").value = v;
        
        document.getElementById("calendartweaks-picker-scale-h").style.setProperty("background-image","-moz-linear-gradient(left,red,yellow,lime,aqua,blue,fuchsia,red)","");
        
        calendarTweaksOptions.pickerHSVtoRGB(0,0,v,RGB);
        hexlo = calendarTweaksOptions.pickerMakeHexStr(RGB.r,RGB.g,RGB.b);
        calendarTweaksOptions.pickerHSVtoRGB(h,100,v,RGB);
        hexhi = calendarTweaksOptions.pickerMakeHexStr(RGB.r,RGB.g,RGB.b);
        document.getElementById("calendartweaks-picker-scale-s").style.setProperty("background-image","-moz-linear-gradient(left,#" + hexlo + ",#" + hexhi + ")","");
        
        calendarTweaksOptions.pickerHSVtoRGB(h,s,100,RGB);
        hexhi = calendarTweaksOptions.pickerMakeHexStr(RGB.r,RGB.g,RGB.b);
        document.getElementById("calendartweaks-picker-scale-v").style.setProperty("background-image","-moz-linear-gradient(left,#000000,#" + hexhi + ")","");
        
        /* Update hex string */
        
        r = document.getElementById("calendartweaks-picker-scale-r").value;
        g = document.getElementById("calendartweaks-picker-scale-g").value;
        b = document.getElementById("calendartweaks-picker-scale-b").value;
        
        hexstr = calendarTweaksOptions.pickerMakeHexStr(r,g,b);
        
        document.getElementById("calendartweaks-picker-hexstr").value = hexstr; 
        
        /* Update palette and sample */
        
        button = calendarTweaksOptions.pickerButton;
        
        if (button.id.indexOf("today") >= 0) style = "today"; else style = "selday";
        
        if (button.id.indexOf("header") >= 0)
        {
            for (i = 0; i < normalPaletteColors.length; i++) if (hexstr == normalPaletteColors[i]) break;
            
            if (i < normalPaletteColors.length) document.getElementById("calendartweaks-picker-normalpalette").color = "#" + hexstr;
            else
            {
                document.getElementById("calendartweaks-picker-normalpalette").color = "";
                if (document.getElementById("calendartweaks-picker-normalpalette").mPicker.mSelectedCell)
                    document.getElementById("calendartweaks-picker-normalpalette").mPicker.mSelectedCell.removeAttribute("selected");
            }
            
            if (calendarTweaksOptions.prefs.getBoolPref("picker-autodaybox"))
                calendarTweaksOptions.pickerSetColor("calendartweaks-" + style + "dayboxcolor",calendarTweaksOptions.pickerAutoDayBoxColor("#" + hexstr));
                
            document.getElementById("calendartweaks-picker-sampleheader").style.setProperty("background-color","#" + hexstr,"");
            document.getElementById("calendartweaks-picker-sampledaybox").style.setProperty("background-color",calendarTweaksOptions.pickerGetColor("calendartweaks-" + style + "dayboxcolor"),"");
            document.getElementById("calendartweaks-picker-sampleborder").style.setProperty("border","1px solid " + calendarTweaksOptions.pickerGetColor("calendartweaks-" + style + "bordercolor"),"");
        }
        else if (button.id.indexOf("daybox") >= 0)
        {
            for (i = 0; i < dayboxPaletteColors.length; i++) if (hexstr == dayboxPaletteColors[i]) break;
            
            if (i < dayboxPaletteColors.length) document.getElementById("calendartweaks-picker-dayboxpalette").color = "#" + hexstr;
            else
            {
                document.getElementById("calendartweaks-picker-dayboxpalette").color = "";
                if (document.getElementById("calendartweaks-picker-dayboxpalette").mPicker.mSelectedCell)
                    document.getElementById("calendartweaks-picker-dayboxpalette").mPicker.mSelectedCell.removeAttribute("selected");
            }
            
            document.getElementById("calendartweaks-picker-sampleheader").style.setProperty("background-color",calendarTweaksOptions.pickerGetColor("calendartweaks-" + style + "headercolor"),"");
            document.getElementById("calendartweaks-picker-sampledaybox").style.setProperty("background-color","#" + hexstr,"");
            document.getElementById("calendartweaks-picker-sampleborder").style.setProperty("border","1px solid " + calendarTweaksOptions.pickerGetColor("calendartweaks-" + style + "bordercolor"),"");
        }
        else /* border */
        {
            for (i = 0; i < normalPaletteColors.length; i++) if (hexstr == normalPaletteColors[i]) break;
            
            if (i < normalPaletteColors.length) document.getElementById("calendartweaks-picker-normalpalette").color = "#" + hexstr;
            else
            {
                document.getElementById("calendartweaks-picker-normalpalette").color = "";
                if (document.getElementById("calendartweaks-picker-normalpalette").mPicker.mSelectedCell)
                    document.getElementById("calendartweaks-picker-normalpalette").mPicker.mSelectedCell.removeAttribute("selected");
            }
            
            document.getElementById("calendartweaks-picker-sampleheader").style.setProperty("background-color",calendarTweaksOptions.pickerGetColor("calendartweaks-" + style + "headercolor"),"");
            document.getElementById("calendartweaks-picker-sampledaybox").style.setProperty("background-color",calendarTweaksOptions.pickerGetColor("calendartweaks-" + style + "dayboxcolor"),"");
            document.getElementById("calendartweaks-picker-sampleborder").style.setProperty("border","1px solid #" + hexstr,"");
        }
    },
    
    pickerPanelMouseDown: function(event)
    {
        if (document.getElementById("calendartweaks-picker-normalpalette").open ||
            document.getElementById("calendartweaks-picker-dayboxpalette").open)
        {
            if (event.originalTarget.id == "calendartweaks-picker-okay" ||
                event.originalTarget.id == "calendartweaks-picker-cancel" ||
                event.originalTarget.id == "calendartweaks-picker-autodaybox")
            {
                /* keep palette open so it can be detected by pickerOkay/pickerClose/pickerAutoDayBoxChange */
            }
            else
            {
                document.getElementById("calendartweaks-picker-normalpalette").hidePopup();
                document.getElementById("calendartweaks-picker-dayboxpalette").hidePopup();
            }
        }
    },
    
    pickerPaletteShowing: function(event)
    {
        var separator;
        
        separator = document.getElementById("calendartweaks-picker-separator");
        
        event.originalTarget.moveTo(separator.boxObject.screenX+6,separator.boxObject.screenY+6);
    },
    
    pickerClose: function()
    {
        if (document.getElementById("calendartweaks-picker-normalpalette").open ||
            document.getElementById("calendartweaks-picker-dayboxpalette").open)
        {
            document.getElementById("calendartweaks-picker-normalpalette").hidePopup();
            document.getElementById("calendartweaks-picker-dayboxpalette").hidePopup();
        }
        else document.getElementById("calendartweaks-picker-panel").hidePopup();
        
        window.removeEventListener("keypress",calendarTweaksOptions.pickerReturn,true);
    },
    
    pickerOkay: function()
    {
        var button,hexstr,hbox;
        
        if (document.getElementById("calendartweaks-picker-normalpalette").open ||
            document.getElementById("calendartweaks-picker-dayboxpalette").open)
        {
            document.getElementById("calendartweaks-picker-normalpalette").hidePopup();
            document.getElementById("calendartweaks-picker-dayboxpalette").hidePopup();
        }
        else
        {
            button = calendarTweaksOptions.pickerButton;
            
            hexstr = document.getElementById("calendartweaks-picker-hexstr").value;
            
            hbox = document.getAnonymousElementByAttribute(button,"class","box-inherit button-box");
            hbox.style.setProperty("background-color","#" + hexstr,"");
            
            document.getElementById("calendartweaks-picker-panel").hidePopup();
        }
        
        window.removeEventListener("keypress",calendarTweaksOptions.pickerReturn,true);
    },
    
    pickerReturn: function (event)
    {
        if (event.keyCode == event.DOM_VK_RETURN)
        {
            calendarTweaksOptions.pickerOkay();
            
            event.preventDefault();
            event.stopPropagation();
        }
    },
    
    pickerGetColor: function(pickerId)
    {
        var button,hbox,r,g,b,hexstr;
        var rgbColors = new Array();
        
        button = document.getElementById(pickerId);
        
        hbox = document.getAnonymousElementByAttribute(button,"class","box-inherit button-box");
        rgbColors = hbox.style.getPropertyValue("background-color").match(/rgb\((\d+),\s(\d+),\s(\d+)\)/);
        
        r = Number(rgbColors[1]).toString(16).toUpperCase();
        if (r.length < 2) r = "0" + r;
        g = Number(rgbColors[2]).toString(16).toUpperCase();
        if (g.length < 2) g = "0" + g;
        b = Number(rgbColors[3]).toString(16).toUpperCase();
        if (b.length < 2) b = "0" + b;
        
        hexstr = r + g + b;
        
        return ("#" + hexstr);
    },
    
    pickerSetColor: function(pickerId,color)
    {
        var button,hbox;
        
        button = document.getElementById(pickerId);
        
        hbox = document.getAnonymousElementByAttribute(button,"class","box-inherit button-box");
        hbox.style.setProperty("background-color",color,"");
    },
    
    pickerAutoDayBoxColor: function(headercolor)
    {
        var red,green,blue;
        
        red = parseInt(headercolor.substr(1,2),16);
        red = (255-Math.round((255-red)/6.375)).toString(16).toUpperCase();
        
        green = parseInt(headercolor.substr(3,2),16);
        green = (255-Math.round((255-green)/6.375)).toString(16).toUpperCase();
        
        blue = parseInt(headercolor.substr(5,2),16);
        blue = (255-Math.round((255-blue)/6.375)).toString(16).toUpperCase();
        
        return ("#" + red + green + blue);
    },
    
    pickerMakeHexStr: function(r,g,b)
    {
        var hexstr;
        
        r = r.toString(16).toUpperCase();
        if (r.length < 2) r = "0" + r;
        g = g.toString(16).toUpperCase();
        if (g.length < 2) g = "0" + g;
        b = b.toString(16).toUpperCase();
        if (b.length < 2) b = "0" + b;
        
        hexstr = "" + r + g + b;
        
        return hexstr;
    },
        
    pickerRGBtoHSV: function(r,g,b,HSV)
    {
        var min,max,chroma,h,s,v;
        
        r = r/255;
        g = g/255;
        b = b/255;
        
        min = Math.min(r,g,b);
        max = Math.max(r,g,b);
        chroma = max-min;
        
        v = max;
        
        if (chroma == 0) s = 0;
        else s = chroma/max;
        
        if (chroma == 0) h = 0;                 /* greys */
        else if (r == max) h = (g-b)/chroma+0;  /* between yellow and magenta */
        else if (g == max) h = (b-r)/chroma+2;  /* between cyan and yellow */
        else if (b == max) h = (r-g)/chroma+4;  /* between magenta and cyan */
        if (h < 0) h = h+6;
        h = h/6;
        
        HSV.h = Math.round(h*360);
        HSV.s = Math.round(s*100);
        HSV.v = Math.round(v*100);
    },
    
    pickerHSVtoRGB: function(h,s,v,RGB)
    {
        var i,f,chroma,x0,x1,r,g,b;
        
        h = h/360;
        s = s/100;
        v = v/100;
        
        i = Math.floor(h*6);
        f = h*6-i;
        chroma = v*s;
        x0 = chroma*f;
        x1 = chroma*(1-f);
        
        switch (i%6)
        {
            case 0: r = chroma; g = x0; b = 0; break;
            case 1: r = x1; g = chroma; b = 0; break;
            case 2: r = 0; g = chroma; b = x0; break;
            case 3: r = 0; g = x1; b = chroma; break;
            case 4: r = x0; g = 0; b = chroma; break;
            case 5: r = chroma; g = 0; b = x1; break;
        }
        
        r = r+(v-chroma);
        g = g+(v-chroma);
        b = b+(v-chroma);
        
        RGB.r = Math.round(r*255);
        RGB.g = Math.round(g*255);
        RGB.b = Math.round(b*255);
    }
};
