/* Copyright (c) 2006  Neil Bird  <mozilla@fnxweb.com>
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


fnxweb.urllink.MailInit = function()
{
    fnxweb.urllink.common.Init();

    var context = document.getElementById('messagePaneContext');    /* TB 2 */
    if (!context)
        context = document.getElementById('mailContext');           /* TB 3 */
    if (!context)
        context = document.getElementById('msgComposeContext');     /* TB 2 compose */
    if (context)
        context.addEventListener('popupshowing',fnxweb.urllink.MailContext,false);
}

/* Every time a new window is made, MailInit will be called */
window.addEventListener('load',fnxweb.urllink.MailInit,false);


/* raw version */
fnxweb.urllink.rawOpenNewWindowWith = function(url)
{
    if (!fnxweb.urllink.common.isInThunderbird)
    {
        /* Local browser (e.g., SeaMonkey) - (from contentAreaUtils.js) to not sec. check file: URIs */
        if (url.search(/^file:/) == -1)
            urlSecurityCheck(url, document);

        /* if and only if the current window is a browser window and it has a document with a character
         * set, then extract the current charset menu setting from the current document and use it to
         * initialize the new browser window...
         */
        var charsetArg = null;
        var wintype = document.firstChild.getAttribute('windowtype');
        if (wintype == 'navigator:browser')
            charsetArg = 'charset=' + window._content.document.characterSet;

        /* Open window with full-fat version of the routine, not vanilla window.open, so as to pass all info.
         * NB - URL has been constructed from our own prefs. & user's selection at user's behest and so is safe.
         *      Ref. validator info/warning "`openDialog` called with non-literal parameter."
         */
        var referrer = fnxweb.urllink.common.getReferrer();
        window.openDialog(getBrowserURL(), '_blank', 'chrome,all,dialog=no', url, charsetArg, referrer);
    }
    else
    {
        /* In Thunderbird, so open externally */
        fnxweb.urllink.common.launchExternalURL(url);
    }
}


/* Selection ranges can contain spans of children;  this decodes them */
fnxweb.urllink.spanString = function(span)
{
    var me = fnxweb.urllink;
    var text = '';
    var nodes = span.childNodes.length;
    for (var n = 0;  n < nodes;  ++n)
    {
        var bit = span.childNodes[n];
        if (bit.data)
        {
            text += bit.data;
        }
        else if (bit.className)
        {
            if (bit.className.search(/^moz-txt-link/) == 0 || bit.className.search(/^moz-txt-tag/) == 0)
            {
                text += bit.innerHTML;
            }
            else if (bit.className.search(/^moz-txt-slash/) == 0)
            {
                text += me.spanString(bit);
            }
        }
    }

    return text;
}


/* Add a new text fragment to the existing text */
fnxweb.urllink.addNewText = function( text, newtext )
{
    /* Add spaces in between fragments, unless fragment starts a new line */
    /* Actually, don't;  seem to get text split in TB3 into fragments that then
     * don't want spaces inserted between them.  Can't remember why I thought this was
     * a good idea, so remove it until that use case surfaces again, then try to
     * differentiate!
    var textsep = (text.val == ''  ||  newtext.search(/^\n/) == 0  ?  ''  :  ' ');
     */

    /* If we've been passed some HTML, then certain characters will have been escaped
     * by Thunderbird;  we'll have been passed the raw 'fixed' HTML as opposed to the
     * display text, which is wht we want, so undo the escape.  TBD - there may
     * be more that just '&' that we care about
     */
    newtext = newtext.replace( /&amp;/g, '&' );

    /* If we have a \n\r span in our URL, it's a link that's been broken across lines.
     * Now, Outlook generally just splits links, and will often lose any split space
     * in lieu of the newline.  So we can't tell whether the thing was split 'cos it
     * was too long, or split on a space.
     * What we'll do, is if there are spaces elsewhere in the selection, presume there
     * was a split-on-space and add in a missing space before the newline (as it won't
     * have split on a word if it could have done so no a space).  Else, if no spaces,
     * we'll presume it was a long URL that just been split 'cos Outlook is rubbish,
     * and join the frags with no editing.
     * Since we're dealing with spaces/new-lines at this point, we also need to copy the
     * quote-removal code from common, as that needs to be dnoe herebefore we can remove
     * any rogue newlines:  we remove those here as they're no longer useful, but common
     * will later on try to convert them to spaces (as that's what Firefox needs()).
     */
    newtext = newtext.replace(/((\n|\r) *>[> ]*)+/g, '\n');
    if (newtext.search(/[\n\r]/) != -1)
    {
        /* Have a newline, so make a tentive version of what we want */
        var temp = text.val + newtext;
        temp = temp.replace(/^[\n\r ]+/, '');         /* strip leading space */
        if (temp.search(/ /) != -1)
        {
            /* Have spaces in the string, so presume split on space
             * Need to cope with newtext *starting* with the \n
             */
            newtext = newtext.replace( /(^|[^ ])[\n\r]+/g, "$1 \n" );
        }
    }

    /* Now remove any newlines left that will otherwise end up as spaces */
    newtext = newtext.replace( /[\n\r]+/g, '' );

    /* Do it */
    text.val += /* textsep + */ newtext;
}


/* Process a node's children */
fnxweb.urllink.selectionStringFrag = function( frag, text, recurse )
{
    if (recurse >= 10)
        return;

    var me = fnxweb.urllink;
    var nodes = frag.val.childNodes.length;

    for (var n = 0;  n < nodes;  ++n)
    {
        var bit = frag.val.childNodes[n];
        if (bit.data)
        {
            me.addNewText( text, bit.data );
        }
        else if (bit.className)
        {
            if (bit.className.search(/^moz-txt-link/) == 0  ||  bit.className.search(/^moz-txt-tag/) == 0)
            {
                me.addNewText( text, bit.innerHTML );
            }
            else if (bit.className.search(/^moz-txt-slash/) == 0)
            {
                me.addNewText( text, me.spanString(bit) );
            }
        }
        else if (bit.childNodes  &&  bit.childNodes.length)
        {
            var newfrag = {val : bit };
            me.selectionStringFrag( newfrag, text, recurse+1 );
        }
    }
}


/* Raw access to text of a selection.
 * Default toString op. mangles \n to space
 */
fnxweb.urllink.selectionString = function(sel)
{
    var me = fnxweb.urllink;
    var ranges = sel.rangeCount;
    var text = {val  : ''};
    for (var r = 0;  r < ranges;  ++r)
    {
        var range = sel.getRangeAt(r);
        var frag = {val : range.cloneContents()};
        me.selectionStringFrag( frag, text, 0 );
    }

    /* This can end up empty (!);  seemingly when the view is pseudo-HTML and the quoted text is the blue line.
     * Fall back to toString();  annoyingly, in this instance the pigging thing does have the '\n's in  :-/
     */
    if (text.val == '')
        text.val = sel.toString();

    return text.val;
}


/* Raw version of comm/nsContextMenu.js:searchSelected
 * Now using mail/base/content/nsContextMenu.js
 */
fnxweb.urllink.rawSearchSelected = function()
{
    var focusedWindow = document.commandDispatcher.focusedWindow;
    /* var searchStr = focusedWindow.__proto__.getSelection.call(focusedWindow); */
    var searchStr = focusedWindow.getSelection();
    /* searchStr = searchStr.toString(); */
    searchStr = fnxweb.urllink.selectionString(searchStr);
    if (searchStr != '')
        searchStr = fnxweb.urllink.common.tidySelection(searchStr);
    return searchStr;
}


/* strip bad leading and trailing characters
 * assume no leading/terminating white space (searchSelected() removes this)
 * as a work-around of a seeming bug in Moz. which gives us " " in lieu of
 * <CR> from some emails.
 */
fnxweb.urllink.unmangleURL = function(url,wasLink)
{
    /* Remove OutLook delims. now */
    url = url.replace(/^[< ]+(.*)[ >]+$/, "$1");

    /* How to deal with newlines in the selection? */
    url = fnxweb.urllink.common.unmangleNewlines( url );

    /* Perform custom search and replaces */
    url = fnxweb.urllink.common.customSearchAndReplace(url);

    /* strip bad leading characters */
    url = url.replace(/^[\.,\'\"\)\?!>\]]+/, '');
    /* strip bad ending characters */
    url = url.replace(/[\.,\'\"\)\?!>\]]+$/, '');

    /* If it's a mail link in an actual hyperlink, strip off up to the '@' (convert mail link into web link)
     * If it's a textual mailto:, we'll activate it [if user wants a fake web link, don't select the "mailto:"!]
     */
    if (wasLink  &&  url.search(/^mailto:/) == 0)
        url = url.replace(/^mailto:.*@/,'');

    return url;
}


/* Called on popup display */
fnxweb.urllink.MailContext = function()
{
    var me = fnxweb.urllink;
    var mc = me.common;
    var isTextOrUrlSelection = false, isURL = false;
    var forcesubmenu = mc.prefs.getBoolPref('forcesubmenu');

    if (mc.isDefined('gContextMenu'))
    {
        /* TB2 has isTextSelected, TB3 has isContentSelected */
        isTextOrUrlSelection = ( gContextMenu.isTextSelected || gContextMenu.onLink || gContextMenu.isContentSelected );
        if (isTextOrUrlSelection)
        {
            /* See if selection looks like a URL
             * Always use selection if it exists
             */
            var sel;
            if (gContextMenu.isTextSelected  ||  gContextMenu.isContentSelected)
            {
                sel = me.rawSearchSelected();
                if (sel != '')
                    sel = me.unmangleURL(sel,false);
            }
            else if (gContextMenu.onLink)
            {
                wasLink = true;
                sel = gContextMenu.link.href;
                /* Only do mailto: links */
                if (sel.search(/^mailto:/) != 0)
                    isTextOrUrlSelection = false;
            }
        }
    }
    else
    {
        /* No context menu item (?);  come here for Compose window popup */
        sel = me.rawSearchSelected();
        if (sel != '')
        {
            isTextOrUrlSelection = true;
            sel = me.unmangleURL(sel,false);
        }
    }
    if (isTextOrUrlSelection && sel.search(/^(mailto:|\w+:\/\/|www\.|ftp\.|.*@)/) == 0)
        isURL = true;

    /* Visible if selection and looks like URL */
    for (var i=0; i<mc.MailMenuItems.length; i++)
    {
        var menuitem = document.getElementById(mc.MailMenuItems[i] + mc.menuPos());
        if (menuitem)
        {
            menuitem.hidden = !(isTextOrUrlSelection && isURL);
        }
        menuitem = document.getElementById(mc.MailMenuItems[i] + mc.menuPosAlt());
        if (menuitem)
        {
            menuitem.hidden = true;
        }
    }

    /* Visible if selection and doesn't look like URL, or forced */
    if (forcesubmenu  ||  ! (!isTextOrUrlSelection || isURL))
    {
        /* Alternate menus not hidden;  regenerate from current prefs. */
        for (var i=0; i<mc.AlternateMailMenus.length; i++)
        {
            mc.regenerateMenu( mc.AlternateMailMenus[i] + mc.menuPos(), fnxweb.urllink.MailOpenLink, 0 );
        }
    }
    for (var i=0; i<mc.AlternateMailMenuItems.length; i++)
    {
        var menuitem = document.getElementById(mc.AlternateMailMenuItems[i] + mc.menuPos());
        if (menuitem)
        {
            menuitem.hidden = !forcesubmenu  &&  (!isTextOrUrlSelection || isURL);
        }
        menuitem = document.getElementById(mc.AlternateMailMenuItems[i] + mc.menuPosAlt());
        if (menuitem)
        {
            menuitem.hidden = true;
        }
    }

    /* Hide separators if both of the above hidden */
    {
        for (var i=0; i<2; i++)
        {
            var menuitem = document.getElementById(mc.MailMenuSep + i + mc.menuPos());
            if (menuitem)
            {
                menuitem.hidden =
                    !forcesubmenu  &&
                    (!(isTextOrUrlSelection && isURL))  &&
                    (!isTextOrUrlSelection || isURL);
            }
            menuitem = document.getElementById(mc.MailMenuSep + i + mc.menuPosAlt());
            if (menuitem)
            {
                menuitem.hidden = true;
            }
        }
    }
}


fnxweb.urllink.MailOpenLink = function(event,astab,format)  /* event/astab not used in mailer */
{
    var me = fnxweb.urllink;
    var mc = me.common;
    var wasLink = false;
    var selURL;
    var prefix = {val:''};
    var suffix = {val:''};

    /* Determine prefix/suffix by splitting on '*' */
    mc.splitFormat( format, prefix, suffix );

    /* TB2 has isTextSelected, TB3 has isContentSelected */
    if (!mc.isDefined('gContextMenu')  ||
            gContextMenu  &&  (gContextMenu.isTextSelected || gContextMenu.isContentSelected))
    {
        selURL = me.rawSearchSelected();
    }
    else if (gContextMenu.onLink)
    {
        wasLink = true;
        selURL = gContextMenu.link.href;
    }
    if (selURL == '')
        return;
    selURL = me.unmangleURL(selURL,wasLink);
    me.rawOpenNewWindowWith( fnxweb.urllink.common.fixURL( prefix.val + selURL + suffix.val ) );
}
