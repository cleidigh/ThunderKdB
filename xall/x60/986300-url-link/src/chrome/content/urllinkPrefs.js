/* Copyright (c) 2006  Neil Bird
 *   $Id$
 *
 * This library is free software; you can redistribute it and/or
 * modify it under the terms of the GNU Lesser General Public
 * License as published by the Free Software Foundation; either
 * version 2.1 of the License, or (at your option) any later version.
 *
 * This library is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the GNU
 * Lesser General Public License for more details.
 *
 * You should have received a copy of the GNU Lesser General Public
 * License along with this library; if not, write to the Free Software
 * Foundation, Inc., 59 Temple Place, Suite 330, Boston, MA  02111-1307  USA
 */

with (fnxweb.urllink)
{
    var menuitemsListbox; /* = document.getElementById("urllinkMenuItems"); */
    var newmenuitembox;
    var sandritemsListbox;
    var newsandritembox;
    var topmenu;
    var newwindow;
    var forcesubmenu;
    var openoptions;
}


fnxweb.urllink.openNewWindow = function(url)
{
    if (fnxweb.urllink.common.inThunderbird())
    {
        // Have to hope browser has URL Link installed as well for now ...
        fnxweb.urllink.common.launchExternalURL(url);
    }
    else
    {
        // [culled from Download Manager/downbarpref]
        // If I open it from my preferences window the "about" window is modal for some reason
        // open it from the browser window, it is not modal
        var wm = Components.classes["@mozilla.org/appshell/window-mediator;1"].getService(Components.interfaces.nsIWindowMediator);
        var wrecent = wm.getMostRecentWindow("navigator:browser");
        wrecent.open(url);
    }
}


fnxweb.urllink.itemUp = function(listbox)
{
    var idx = listbox.selectedIndex;
    if (idx >= 1)
    {
        var item = listbox.removeItemAt(idx);
        idx--;
        listbox.insertItemAt( idx, item.getAttribute("label"), item.getAttribute("value") );
        listbox.selectedIndex = idx;
        listbox.ensureIndexIsVisible( idx );
    }
}


fnxweb.urllink.itemDown = function(listbox)
{
    var idx = listbox.selectedIndex;
    if (idx != -1  &&  idx < listbox.getRowCount() - 1)
    {
        var item = listbox.removeItemAt(idx);
        idx++;
        if (idx == listbox.getRowCount())
        {
            listbox.appendItem( item.getAttribute("label"), item.getAttribute("value") );
        }
        else
        {
            listbox.insertItemAt( idx, item.getAttribute("label"), item.getAttribute("value") );
        }
        listbox.selectedIndex = idx;
        listbox.ensureIndexIsVisible( idx );
    }
}


fnxweb.urllink.setDefaults = function(listbox,defaults)
{
    while (listbox.getRowCount() > 0)
    {
        listbox.removeItemAt(0);
    }
    for (var i=0; i<defaults.length; i++)
    {
        listbox.appendItem( defaults[i], "" );
    }
}

fnxweb.urllink.setMenuDefaults = function()
{
    fnxweb.urllink.setDefaults( fnxweb.urllink.menuitemsListbox, fnxweb.urllink.common.defaultMenuItems );
}

fnxweb.urllink.setSandrDefaults = function()
{
    fnxweb.urllink.setDefaults( fnxweb.urllink.sandritemsListbox, fnxweb.urllink.common.defaultSandrItems );
}



fnxweb.urllink.deleteItem = function(listbox)
{
    var idx = listbox.selectedIndex;
    if (idx != -1)
    {
        listbox.removeItemAt(idx);
        var size = listbox.getRowCount();
        if (idx >= 0 && idx < size)
        {
            listbox.selectedIndex = idx;
        }
        else if (idx >= size)
        {
            listbox.selectedIndex = listbox.getRowCount() - 1;
        }
        else if (size)
        {
            listbox.selectdeIndex = 0;
        }
    }
}


fnxweb.urllink.addItem = function(listbox,newitembox,force)
{
    var newitem = newitembox.value;
    var selecteditem = "";
    var idx = listbox.selectedIndex;
    if (idx != -1)
    {
        selecteditem = listbox.getItemAtIndex(idx).getAttribute("label");
    }
    if (newitem != ""  &&  (force  ||  newitem != selecteditem))
    {
        listbox.appendItem(newitem,"");
        var idx = listbox.getRowCount() - 1;
        listbox.selectedIndex = idx;
        listbox.ensureIndexIsVisible( idx );
        newitembox.value = "";
    }
}


/* Click on menu items list */
fnxweb.urllink.onPrefsMenuSelect = function()
{
    var me = fnxweb.urllink;
    /* Set text entry to selection for 'editing' of exiting entries */
    var idx = me.menuitemsListbox.selectedIndex;
    if (idx != -1)
    {
        me.newmenuitembox.value = me.menuitemsListbox.getItemAtIndex(idx).getAttribute("label");
    }
}


/* Click on search-and-replace items list */
fnxweb.urllink.onPrefsSandrSelect = function()
{
    var me = fnxweb.urllink;
    /* Set text entry to selection for 'editing' of exiting entries */
    var idx = me.sandritemsListbox.selectedIndex;
    if (idx != -1)
    {
        me.newsandritembox.value = me.sandritemsListbox.getItemAtIndex(idx).getAttribute("label");
    }
}


fnxweb.urllink.loadPrefs = function()
{
    var me = fnxweb.urllink;
    var mc = me.common;
    if (!me.menuitemsListbox)
    {
        mc.Init();

        me.menuitemsListbox = document.getElementById("urllinkMenuItems");
        me.newmenuitembox = document.getElementById("urllinkNewMenuItem");
        me.sandritemsListbox = document.getElementById("urllinkSandrItems");
        me.newsandritembox = document.getElementById("urllinkNewSandrItem");
        me.topmenu = document.getElementById("urllinkTopmenu");
        me.newwindow = document.getElementById("urllinkNewWindow");
        me.forcesubmenu = document.getElementById("urllinkForceSubmenu");
        me.openoptions = document.getElementById("urllinkOpenOptions");
        me.menuitemsListbox.addEventListener("select",me.onPrefsMenuSelect, false);
        me.sandritemsListbox.addEventListener("select",me.onPrefsSandrSelect, false);
    }

    /* Set up submenu */
    if (mc.prefs.getPrefType("submenu.0") != mc.nsIPrefBranch.PREF_STRING)
    {
        /* Nothing yet */
        me.setDefaults( me.menuitemsListbox, mc.defaultMenuItems );
    }
    else
    {
        /* Clear list */
        while (me.menuitemsListbox.getRowCount() > 0)
        {
            me.menuitemsListbox.removeItemAt(0);
        }

        /* Read prefs into list */
        var n = 0;
        while (mc.prefs.getPrefType("submenu."+n) == mc.nsIPrefBranch.PREF_STRING)
        {
            try
            {
                me.menuitemsListbox.appendItem( mc.prefs.getCharPref("submenu."+n), "" );
            }
            catch (err)
            {}
            n++;
        }
    }

    /* Set up submenu */
    if (mc.prefs.getPrefType("sandr.0") != mc.nsIPrefBranch.PREF_STRING)
    {
        /* Nothing yet */
        me.setDefaults( me.sandritemsListbox, mc.defaultSandrItems );
    }
    else
    {
        /* Clear list */
        while (me.sandritemsListbox.getRowCount() > 0)
        {
            me.sandritemsListbox.removeItemAt(0);
        }

        /* Read prefs into list */
        var n = 0;
        while (mc.prefs.getPrefType("sandr."+n) == mc.nsIPrefBranch.PREF_STRING)
        {
            try
            {
                me.sandritemsListbox.appendItem( mc.prefs.getCharPref("sandr."+n), "" );
            }
            catch (err)
            {}
            n++;
        }
    }

    /* And the rest */
    me.topmenu.checked = mc.prefs.getBoolPref("topmenu");
    me.newwindow.checked = mc.prefs.getBoolPref("newwindow");
    me.forcesubmenu.checked = mc.prefs.getBoolPref("forcesubmenu");
    if (mc.prefs.getBoolPref("hidetab"))
        me.openoptions.selectedIndex = 1;  /* hide tab */
    else if (mc.prefs.getBoolPref("hideopen"))
        me.openoptions.selectedIndex = 2;  /* hide open */
    else
        me.openoptions.selectedIndex = 0;  /* have both */
}


fnxweb.urllink.setPrefs = function(doclose)
{
    var me = fnxweb.urllink;
    var mc = me.common;

    /* Blat current prefs */
    var n = 0;
    while (mc.prefs.getPrefType("submenu."+n) == mc.nsIPrefBranch.PREF_STRING)
    {
        if (mc.prefs.prefHasUserValue("submenu."+n))
        {
            mc.prefs.clearUserPref("submenu."+n);
        }
        n++;
    }
    n = 0;
    while (mc.prefs.getPrefType("sandr."+n) == mc.nsIPrefBranch.PREF_STRING)
    {
        if (mc.prefs.prefHasUserValue("sandr."+n))
        {
            mc.prefs.clearUserPref("sandr."+n);
        }
        n++;
    }

    /* Replace prefs */
    n = 0;
    while (n < me.menuitemsListbox.getRowCount())
    {
        mc.prefs.setCharPref( "submenu."+n, me.menuitemsListbox.getItemAtIndex(n).getAttribute("label") );
        n++;
    }
    n = 0;
    while (n < me.sandritemsListbox.getRowCount())
    {
        mc.prefs.setCharPref( "sandr."+n, me.sandritemsListbox.getItemAtIndex(n).getAttribute("label") );
        n++;
    }
    mc.prefs.setBoolPref("topmenu", me.topmenu.checked);
    mc.prefs.setBoolPref("newwindow", me.newwindow.checked);
    mc.prefs.setBoolPref("forcesubmenu", me.forcesubmenu.checked);
    switch (me.openoptions.selectedIndex)
    {
        case 1:
            mc.prefs.setBoolPref("hidetab", true);
            mc.prefs.setBoolPref("hideopen", false);
            break;
        case 2:
            mc.prefs.setBoolPref("hidetab", false);
            mc.prefs.setBoolPref("hideopen", true);
            break;
        default:
            mc.prefs.setBoolPref("hidetab", false);
            mc.prefs.setBoolPref("hideopen", false);
    }

    /* Done */
    if (doclose)
    {
        window.close();
    }
}
