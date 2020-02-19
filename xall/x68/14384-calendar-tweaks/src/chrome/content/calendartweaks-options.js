/************************************************************************/
/*                                                                      */
/*      Calendar Tweaks  -  Thunderbird Extension  -  Options           */
/*                                                                      */
/*      Javascript for Options dialog                                   */
/*                                                                      */
/*      Copyright (C) 2008-2019  by  DW-dev                             */
/*                                                                      */
/*      Last Edit  -  26 Nov 2019                                       */
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
    
    /********************************************************************/
    
    /* Initialise preferences */
    
    initPrefs: function()
    {
        var checkbox,checkstate;
        
        /* Determine Thunderbird version and set attribute */
        
        if (calendarTweaksOptions.versionComparator.compare(calendarTweaksOptions.appInfo.version,"68.0a1") >= 0) calendarTweaksOptions.tbVersion = "68.0";
        else calendarTweaksOptions.tbVersion = "68.0";
        
        document.getElementById("calendartweaks-options").setAttribute("calendartweaks-tbversion",calendarTweaksOptions.tbVersion);
        
        /* Add listener for dialog accept button (OK) */
        
        document.addEventListener("dialogaccept",
        function(event)
        {
            calendarTweaksOptions.savePrefs();
        });
        
        /* Add listener for dialog extra1 button (Apply) */
        
        document.addEventListener("dialogextra1",
        function(event)
        {
            calendarTweaksOptions.savePrefs();
            
            event.preventDefault();  /* prevent dialog closing */
        });
        
        /* Add listeners for click on normal/daybox palette panels */
        
        document.getElementById("calendartweaks-picker-normalpalette-panel").addEventListener("click",calendarTweaksOptions.pickerPaletteChange,false);
        document.getElementById("calendartweaks-picker-dayboxpalette-panel").addEventListener("click",calendarTweaksOptions.pickerPaletteChange,false);
        
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
        
        checkbox = document.getElementById("calendartweaks-bordertoday");
        try
        {
            checkstate = calendarTweaksOptions.prefs.getBoolPref("bordertoday");
            checkbox.checked = checkstate;
        }
        catch(e)
        {
            checkbox.checked = false;
        }
        
        checkbox = document.getElementById("calendartweaks-borderselday");
        try
        {
            checkstate = calendarTweaksOptions.prefs.getBoolPref("borderselday");
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
            
            document.getElementById("calendartweaks-bordertoday").checked = false;
            document.getElementById("calendartweaks-borderselday").checked = false;
            document.getElementById("calendartweaks-borderminimonth").checked = true;
        }
        else /* style == 2 */  /* Lightning 68.2.1 */
        {
            calendarTweaksOptions.pickerSetColor("calendartweaks-todayheadercolor","#D2E3F3");  /* Today - MW/Month - Date Header */
            calendarTweaksOptions.pickerSetColor("calendartweaks-todaydayboxcolor","#E1F0FD");  /* Today - MW/Month - Day Box */
            calendarTweaksOptions.pickerSetColor("calendartweaks-todaybordercolor","#7FB9EE");  /* Today - MW/Month - Borders */
            
            calendarTweaksOptions.pickerSetColor("calendartweaks-seldayheadercolor","#F2EDB2");  /* SelDay - MW/Month - Date Header */
            calendarTweaksOptions.pickerSetColor("calendartweaks-seldaydayboxcolor","#FFFCD8");  /* SelDay - MW/Month - Day Box */
            calendarTweaksOptions.pickerSetColor("calendartweaks-seldaybordercolor","#D9C585");  /* SelDay - Mini-Month - Borders */
            
            document.getElementById("calendartweaks-bordertoday").checked = true;
            document.getElementById("calendartweaks-borderselday").checked = false;
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
        
        calendarTweaksOptions.prefs.setBoolPref("bordertoday",document.getElementById("calendartweaks-bordertoday").checked);
        calendarTweaksOptions.prefs.setBoolPref("borderselday",document.getElementById("calendartweaks-borderselday").checked);
        calendarTweaksOptions.prefs.setBoolPref("borderminimonth",document.getElementById("calendartweaks-borderminimonth").checked);
    },
    
    /********************************************************************/
    
    /* Color picker functions */
    
    pickerOpen: function(pickerbutton)
    {
        var index,r,g,b,hexstr,element;
        var rgbColors = new Array();
        var HSV = new Object();
        
        document.getElementById("calendartweaks-picker-panel").hidePopup();
        
        calendarTweaksOptions.pickerButton = pickerbutton;
        
        rgbColors = pickerbutton.children[0].style.getPropertyValue("background-color").match(/rgb\((\d+),\s(\d+),\s(\d+)\)/);
        
        r = Number(rgbColors[1]);
        g = Number(rgbColors[2]);
        b = Number(rgbColors[3]);
        
        hexstr = calendarTweaksOptions.pickerMakeHexStr(r,g,b);
        
        if (pickerbutton.id.indexOf("header") >= 0)
        {
            document.getElementById("calendartweaks-picker-headertitle").hidden = false;
            document.getElementById("calendartweaks-picker-dayboxtitle").hidden = true;
            document.getElementById("calendartweaks-picker-bordertitle").hidden = true;
            
            document.getElementById("calendartweaks-picker-normalpalette").hidden = false;
            document.getElementById("calendartweaks-picker-dayboxpalette").hidden = true;
            
            document.getElementById("calendartweaks-picker-separator-3").hidden = false;
            document.getElementById("calendartweaks-picker-autodaybox-box").hidden = false;
            
            element = document.getElementById("calendartweaks-picker-normalpalette-panel").getElementsByAttribute("color","#" + hexstr).item(0);
            if (element != null) document.getElementById("calendartweaks-picker-normalpalette").children[0].style.setProperty("background-color","#" + hexstr,"");
            else document.getElementById("calendartweaks-picker-normalpalette").children[0].style.setProperty("background-color","#E1E1E1","");
        }
        else if (pickerbutton.id.indexOf("daybox") >= 0)
        {
            document.getElementById("calendartweaks-picker-headertitle").hidden = true;
            document.getElementById("calendartweaks-picker-dayboxtitle").hidden = false;
            document.getElementById("calendartweaks-picker-bordertitle").hidden = true;
            
            document.getElementById("calendartweaks-picker-normalpalette").hidden = true;
            document.getElementById("calendartweaks-picker-dayboxpalette").hidden = false;
            
            document.getElementById("calendartweaks-picker-separator-3").hidden = true;
            document.getElementById("calendartweaks-picker-autodaybox-box").hidden = true;
            
            element = document.getElementById("calendartweaks-picker-dayboxpalette-panel").getElementsByAttribute("color","#" + hexstr).item(0);
            if (element != null) document.getElementById("calendartweaks-picker-dayboxpalette").children[0].style.setProperty("background-color","#" + hexstr,"");
            else document.getElementById("calendartweaks-picker-dayboxpalette").children[0].style.setProperty("background-color","#E1E1E1","");
        }
        else /* border */
        {
            document.getElementById("calendartweaks-picker-separator-3").hidden = true;
            document.getElementById("calendartweaks-picker-headertitle").hidden = true;
            document.getElementById("calendartweaks-picker-dayboxtitle").hidden = true;
            document.getElementById("calendartweaks-picker-bordertitle").hidden = false;
            
            document.getElementById("calendartweaks-picker-normalpalette").hidden = false;
            document.getElementById("calendartweaks-picker-dayboxpalette").hidden = true;
            
            document.getElementById("calendartweaks-picker-separator-3").hidden = true;
            document.getElementById("calendartweaks-picker-autodaybox-box").hidden = true;
            
            element = document.getElementById("calendartweaks-picker-normalpalette-panel").getElementsByAttribute("color","#" + hexstr).item(0);
            if (element != null) document.getElementById("calendartweaks-picker-normalpalette").children[0].style.setProperty("background-color","#" + hexstr,"");
            else document.getElementById("calendartweaks-picker-normalpalette").children[0].style.setProperty("background-color","#E1E1E1","");
        }
        
        document.getElementById("calendartweaks-picker-autodaybox").checked = calendarTweaksOptions.prefs.getBoolPref("picker-autodaybox");
        
        document.getElementById("calendartweaks-picker-panel").openPopup(pickerbutton,"after_end",-1,1,false,false,null);
        
        calendarTweaksOptions.pickerRGBtoHSV(r,g,b,HSV);
        calendarTweaksOptions.pickerUpdateElements(r,g,b,HSV.h,HSV.s,HSV.v);
        
        document.getElementById("calendartweaks-picker-autodaybox").checked = calendarTweaksOptions.prefs.getBoolPref("picker-autodaybox");
        
        window.addEventListener("keypress",calendarTweaksOptions.pickerReturn,true);
    },
    
    pickerRGBScaleChange: function()
    {
        var r,g,b;
        var HSV = new Object();
        
        r = +document.getElementById("calendartweaks-picker-r-scale").value;
        g = +document.getElementById("calendartweaks-picker-g-scale").value;
        b = +document.getElementById("calendartweaks-picker-b-scale").value;
        
        calendarTweaksOptions.pickerRGBtoHSV(r,g,b,HSV);
        calendarTweaksOptions.pickerUpdateElements(r,g,b,HSV.h,HSV.s,HSV.v);
    },
    
    pickerHSVScaleChange: function()
    {
        var h,s,v;
        var RGB = new Object();
        
        h = +document.getElementById("calendartweaks-picker-h-scale").value;
        s = +document.getElementById("calendartweaks-picker-s-scale").value;
        v = +document.getElementById("calendartweaks-picker-v-scale").value;
        
        calendarTweaksOptions.pickerHSVtoRGB(h,s,v,RGB);
        calendarTweaksOptions.pickerUpdateElements(RGB.r,RGB.g,RGB.b,h,s,v);
    },
    
    pickerRGBValueChange: function()
    {
        var r,g,b;
        var HSV = new Object();
        
        if (+document.getElementById("calendartweaks-picker-r-value").value < 0) document.getElementById("calendartweaks-picker-r-value").value = 0;
        if (+document.getElementById("calendartweaks-picker-g-value").value < 0) document.getElementById("calendartweaks-picker-g-value").value = 0;
        if (+document.getElementById("calendartweaks-picker-b-value").value < 0) document.getElementById("calendartweaks-picker-b-value").value = 0;
        
        if (+document.getElementById("calendartweaks-picker-r-value").value > 255) document.getElementById("calendartweaks-picker-r-value").value = 255;
        if (+document.getElementById("calendartweaks-picker-g-value").value > 255) document.getElementById("calendartweaks-picker-g-value").value = 255;
        if (+document.getElementById("calendartweaks-picker-b-value").value > 255) document.getElementById("calendartweaks-picker-b-value").value = 255;
        
        r = +document.getElementById("calendartweaks-picker-r-value").value;
        g = +document.getElementById("calendartweaks-picker-g-value").value;
        b = +document.getElementById("calendartweaks-picker-b-value").value;
        
        calendarTweaksOptions.pickerRGBtoHSV(r,g,b,HSV);
        calendarTweaksOptions.pickerUpdateElements(r,g,b,HSV.h,HSV.s,HSV.v);
    },
    
    pickerHSVValueChange: function()
    {
        var h,s,v;
        var RGB = new Object();
        
        if (+document.getElementById("calendartweaks-picker-h-value").value < 0) document.getElementById("calendartweaks-picker-h-value").value = 0;
        if (+document.getElementById("calendartweaks-picker-s-value").value < 0) document.getElementById("calendartweaks-picker-s-value").value = 0;
        if (+document.getElementById("calendartweaks-picker-v-value").value < 0) document.getElementById("calendartweaks-picker-v-value").value = 0;
        
        if (+document.getElementById("calendartweaks-picker-h-value").value > 360) document.getElementById("calendartweaks-picker-h-value").value = 360;
        if (+document.getElementById("calendartweaks-picker-s-value").value > 100) document.getElementById("calendartweaks-picker-s-value").value = 100;
        if (+document.getElementById("calendartweaks-picker-v-value").value > 100) document.getElementById("calendartweaks-picker-v-value").value = 100;
        
        h = +document.getElementById("calendartweaks-picker-h-value").value;
        s = +document.getElementById("calendartweaks-picker-s-value").value;
        v = +document.getElementById("calendartweaks-picker-v-value").value;
        
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
    
    pickerPaletteOpen: function(palettebutton)
    {
        var r,g,b,hexstr,element;
        var rgbColors = new Array();
        
        rgbColors = palettebutton.children[0].style.getPropertyValue("background-color").match(/rgb\((\d+),\s(\d+),\s(\d+)\)/);
        
        r = Number(rgbColors[1]);
        g = Number(rgbColors[2]);
        b = Number(rgbColors[3]);
        
        hexstr = calendarTweaksOptions.pickerMakeHexStr(r,g,b);
        
        document.getElementById("calendartweaks-picker-normalpalette-panel").hidePopup();
        document.getElementById("calendartweaks-picker-dayboxpalette-panel").hidePopup();
        
        if (palettebutton.id.indexOf("normal") >= 0)
        {
            element = document.getElementById("calendartweaks-picker-normalpalette-panel").getElementsByAttribute("selected","true").item(0);
            if (element != null) element.removeAttribute("selected");
            
            element = document.getElementById("calendartweaks-picker-normalpalette-panel").getElementsByAttribute("color","#" + hexstr).item(0);
            if (element != null) element.setAttribute("selected","true");
            
            document.getElementById("calendartweaks-picker-normalpalette-panel").openPopup(palettebutton,"after_start",-2,10,false,false,null);
        }
        else
        {
            element = document.getElementById("calendartweaks-picker-dayboxpalette-panel").getElementsByAttribute("selected","true").item(0);
            if (element != null) element.removeAttribute("selected");
            
            element = document.getElementById("calendartweaks-picker-dayboxpalette-panel").getElementsByAttribute("color","#" + hexstr).item(0);
            if (element != null) element.setAttribute("selected","true");
            
            document.getElementById("calendartweaks-picker-dayboxpalette-panel").openPopup(palettebutton,"after_start",-2,10,false,false,null);
        }
    },
    
    pickerPaletteChange: function(event)
    {
        var pickerbutton,hexstr,value,r,g,b;
        var HSV = new Object();
        
        pickerbutton = calendarTweaksOptions.pickerButton;
        
        if (pickerbutton.id.indexOf("header") >= 0 || pickerbutton.id.indexOf("border") >= 0)
        {
            hexstr = event.target.getAttribute("color").substr(1);
            
            document.getElementById("calendartweaks-picker-normalpalette").children[0].style.setProperty("background-color","#" + hexstr,"");
            
            document.getElementById("calendartweaks-picker-normalpalette-panel").hidePopup();
        }
        else /* daybox */
        {
            hexstr = event.target.getAttribute("color").substr(1);
            
            document.getElementById("calendartweaks-picker-dayboxpalette").children[0].style.setProperty("background-color","#" + hexstr,"");
            
            document.getElementById("calendartweaks-picker-dayboxpalette-panel").hidePopup();
        }
        
        value = parseInt(hexstr,16);
        
        r = (value >> 16) & 0xFF;
        g = (value >> 8) & 0xFF;
        b = value & 0xFF;
        
        calendarTweaksOptions.pickerRGBtoHSV(r,g,b,HSV);
        calendarTweaksOptions.pickerUpdateElements(r,g,b,HSV.h,HSV.s,HSV.v);
    },
    
    pickerAutoDayBoxChange: function()
    {
        var r,g,b;
        var HSV = new Object();
        
        calendarTweaksOptions.prefs.setBoolPref("picker-autodaybox",document.getElementById("calendartweaks-picker-autodaybox").checked);
        
        r = +document.getElementById("calendartweaks-picker-r-scale").value;
        g = +document.getElementById("calendartweaks-picker-g-scale").value;
        b = +document.getElementById("calendartweaks-picker-b-scale").value;
        
        calendarTweaksOptions.pickerRGBtoHSV(r,g,b,HSV);
        calendarTweaksOptions.pickerUpdateElements(r,g,b,HSV.h,HSV.s,HSV.v);
    },
    
    pickerUpdateElements: function(r,g,b,h,s,v)
    {
        var i,pickerbutton,hexlo,hexhi,hexstr,element,day;
        var RGB = new Object();
        
        pickerbutton = calendarTweaksOptions.pickerButton;
        
        /* Update RGB scales and values */
        
        document.getElementById("calendartweaks-picker-r-scale").value = r;
        document.getElementById("calendartweaks-picker-g-scale").value = g;
        document.getElementById("calendartweaks-picker-b-scale").value = b;
        
        document.getElementById("calendartweaks-picker-r-value").value = r;
        document.getElementById("calendartweaks-picker-g-value").value = g;
        document.getElementById("calendartweaks-picker-b-value").value = b;
        
        hexlo = calendarTweaksOptions.pickerMakeHexStr(0,g,b);
        hexhi = calendarTweaksOptions.pickerMakeHexStr(255,g,b);
        document.getElementById("calendartweaks-picker-r-scale").style.setProperty("--r-scale-image","-moz-linear-gradient(left,#" + hexlo + ",#" + hexhi + ")","");
        
        hexlo = calendarTweaksOptions.pickerMakeHexStr(r,0,b);
        hexhi = calendarTweaksOptions.pickerMakeHexStr(r,255,b);
        document.getElementById("calendartweaks-picker-g-scale").style.setProperty("--g-scale-image","-moz-linear-gradient(left,#" + hexlo + ",#" + hexhi + ")","");
        
        hexlo = calendarTweaksOptions.pickerMakeHexStr(r,g,0);
        hexhi = calendarTweaksOptions.pickerMakeHexStr(r,g,255);
        document.getElementById("calendartweaks-picker-b-scale").style.setProperty("--b-scale-image","-moz-linear-gradient(left,#" + hexlo + ",#" + hexhi + ")","");
        
        /* Update HSV scales and values */
        
        document.getElementById("calendartweaks-picker-h-scale").value = h;
        document.getElementById("calendartweaks-picker-s-scale").value = s;
        document.getElementById("calendartweaks-picker-v-scale").value = v;
        
        document.getElementById("calendartweaks-picker-h-value").value = h;
        document.getElementById("calendartweaks-picker-s-value").value = s;
        document.getElementById("calendartweaks-picker-v-value").value = v;
        
        document.getElementById("calendartweaks-picker-h-scale").style.setProperty("--h-scale-image","-moz-linear-gradient(left,red,yellow,lime,aqua,blue,fuchsia,red)","");
        
        calendarTweaksOptions.pickerHSVtoRGB(0,0,v,RGB);
        hexlo = calendarTweaksOptions.pickerMakeHexStr(RGB.r,RGB.g,RGB.b);
        calendarTweaksOptions.pickerHSVtoRGB(h,100,v,RGB);
        hexhi = calendarTweaksOptions.pickerMakeHexStr(RGB.r,RGB.g,RGB.b);
        document.getElementById("calendartweaks-picker-s-scale").style.setProperty("--s-scale-image","-moz-linear-gradient(left,#" + hexlo + ",#" + hexhi + ")","");
        
        calendarTweaksOptions.pickerHSVtoRGB(h,s,100,RGB);
        hexhi = calendarTweaksOptions.pickerMakeHexStr(RGB.r,RGB.g,RGB.b);
        document.getElementById("calendartweaks-picker-v-scale").style.setProperty("--v-scale-image","-moz-linear-gradient(left,#000000,#" + hexhi + ")","");
        
        /* Update hex string */
        
        hexstr = calendarTweaksOptions.pickerMakeHexStr(r,g,b);
        document.getElementById("calendartweaks-picker-hexstr").value = hexstr; 
        
        /* Update palette*/
        
        if (pickerbutton.id.indexOf("header") >= 0 || pickerbutton.id.indexOf("border") >= 0)
        {
            element = document.getElementById("calendartweaks-picker-normalpalette-panel").getElementsByAttribute("color","#" + hexstr).item(0);
            if (element != null) document.getElementById("calendartweaks-picker-normalpalette").children[0].style.setProperty("background-color","#" + hexstr,"");
            else document.getElementById("calendartweaks-picker-normalpalette").children[0].style.setProperty("background-color","#E1E1E1","");
        }
        else /* daybox */
        {
            element = document.getElementById("calendartweaks-picker-dayboxpalette-panel").getElementsByAttribute("color","#" + hexstr).item(0);
            if (element != null) document.getElementById("calendartweaks-picker-dayboxpalette").children[0].style.setProperty("background-color","#" + hexstr,"");
            else document.getElementById("calendartweaks-picker-dayboxpalette").children[0].style.setProperty("background-color","#E1E1E1","");
        }
        
        /* Update sample */
        
        if (pickerbutton.id.indexOf("today") >= 0) day = "today"; else day = "selday";
        
        if (pickerbutton.id.indexOf("header") >= 0)
        {
            document.getElementById("calendartweaks-picker-sampleheader").style.setProperty("background-color","#" + hexstr,"");
            
            if (calendarTweaksOptions.prefs.getBoolPref("picker-autodaybox"))
            {
                document.getElementById("calendartweaks-picker-sampledaybox").style.setProperty("background-color",calendarTweaksOptions.autoDayBoxColor("#" + hexstr),"");
            }
            else document.getElementById("calendartweaks-picker-sampledaybox").style.setProperty("background-color",calendarTweaksOptions.pickerGetColor("calendartweaks-" + day + "dayboxcolor"),"");
            
            document.getElementById("calendartweaks-picker-sampleborder").style.setProperty("border","1px solid " + calendarTweaksOptions.pickerGetColor("calendartweaks-" + day + "bordercolor"),"");
        }
        else if (pickerbutton.id.indexOf("daybox") >= 0)
        {
            document.getElementById("calendartweaks-picker-sampleheader").style.setProperty("background-color",calendarTweaksOptions.pickerGetColor("calendartweaks-" + day + "headercolor"),"");
            
            document.getElementById("calendartweaks-picker-sampledaybox").style.setProperty("background-color","#" + hexstr,"");
            
            document.getElementById("calendartweaks-picker-sampleborder").style.setProperty("border","1px solid " + calendarTweaksOptions.pickerGetColor("calendartweaks-" + day + "bordercolor"),"");
        }
        else /* border */
        {
            document.getElementById("calendartweaks-picker-sampleheader").style.setProperty("background-color",calendarTweaksOptions.pickerGetColor("calendartweaks-" + day + "headercolor"),"");
            
            document.getElementById("calendartweaks-picker-sampledaybox").style.setProperty("background-color",calendarTweaksOptions.pickerGetColor("calendartweaks-" + day + "dayboxcolor"),"");
            
            document.getElementById("calendartweaks-picker-sampleborder").style.setProperty("border","1px solid #" + hexstr,"");
        }
    },
    
    pickerClose: function()
    {
        document.getElementById("calendartweaks-picker-panel").hidePopup();
        
        window.removeEventListener("keypress",calendarTweaksOptions.pickerReturn,true);
    },
    
    pickerOkay: function()
    {
        var pickerbutton,hexstr;
        
        pickerbutton = calendarTweaksOptions.pickerButton;
        
        hexstr = document.getElementById("calendartweaks-picker-hexstr").value;
        
        pickerbutton.children[0].style.setProperty("background-color","#" + hexstr,"");
        
        document.getElementById("calendartweaks-picker-panel").hidePopup();
        
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
        var pickerbutton,r,g,b,hexstr;
        var rgbColors = new Array();
        
        pickerbutton = document.getElementById(pickerId);
        
        rgbColors = pickerbutton.children[0].style.getPropertyValue("background-color").match(/rgb\((\d+),\s(\d+),\s(\d+)\)/);
        
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
        var pickerbutton;
        
        pickerbutton = document.getElementById(pickerId);
        
        pickerbutton.children[0].style.setProperty("background-color",color,"");
    },
    
    autoDayBoxColor: function(fontcolor)
    {
        var red,green,blue;
        
        red = parseInt(fontcolor.substr(1,2),16);
        red = (255-Math.round((255-red)/8.5)).toString(16).toUpperCase();
        
        green = parseInt(fontcolor.substr(3,2),16);
        green = (255-Math.round((255-green)/8.5)).toString(16).toUpperCase();
        
        blue = parseInt(fontcolor.substr(5,2),16);
        blue = (255-Math.round((255-blue)/8.5)).toString(16).toUpperCase();
        
        if (fontcolor == "#000000") red = green = blue = "FF";
        
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
