// URL Link preference editing control
//   preferences.js
//
// Copyright (C) Neil Bird
//
// This library is free software; you can redistribute it and/or
// modify it under the terms of the GNU Lesser General Public
// License as published by the Free Software Foundation; either
// version 2.1 of the License, or (at your option) any later version.
//
// This library is distributed in the hope that it will be useful,
// but WITHOUT ANY WARRANTY; without even the implied warranty of
// MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the GNU
// Lesser General Public License for more details.
//
// You should have received a copy of the GNU Lesser General Public
// License along with this library; if not, write to the Free Software
// Foundation, Inc., 59 Temple Place, Suite 330, Boston, MA  02111-1307  USA


// Current prefs
var prefs = {};
let debugPrefs =
    {"debug":true,"firsttime":false,"forcesubmenu":false,"hideopen":false,"hidetab":false,"inbackground":false,"lastversion":"3.0.0","newwindow":false,"topmenu":true,"submenus":["--DIAGNOSTIC MODE--","&www.*","www.*.&com","www.*.&org","www.*.&net","&ftp.*","--","In &Google|https://www.google.com/search?q=*&source-id=mozilla%20firefox&start=0","In Wi&kipedia|https://en.wikipedia.org/wiki/special:search?search=*&sourceid=mozilla-search"],"sandr":["^//||file:///","^([A-Za-z]:)||file:///$1"]};

// Plus
var plusChar = "➕";

// Comms to extension
var comms = null;



// Dragging starts
function onDragStart(ev) {
    // Flag origin
    ev.dataTransfer.setData("text", ev.target.id);
    if (prefs.debug)
        console.log("URL Link dragging '" + ev.target.id + "'");

    // Stop entries being editable;  it causes a distracting drop-caret in them,
    // and *can* mean the dragged LI's ID gets added to the text (‽)
    let entries = document.querySelectorAll("li.li-data .entry");
    for (let entry = 0;  entry < entries.length;  ++entry)
        entries[entry].contentEditable = false;
}


// Make entries editable again
function onDragEnd(v)
{
    if (prefs.debug)
        console.log("URL Link drag ending");

    let entries = document.querySelectorAll("li.li-data .entry");
    for (let entry = 0;  entry < entries.length;  ++entry)
        entries[entry].contentEditable = true;
}


// Dragging over possible target
function onDragOver(ev)
{
    ev.preventDefault();
}


// Finished dragging
function onDrop(ev)
{
    // Handle event, ID origin
    ev.preventDefault();
    let originId = ev.dataTransfer.getData("text");
    let origin = document.getElementById(originId);
    let originText = origin.querySelector(".entry");

    // Fix up CSS
    onDragLeave(ev);
    onDragEnd(ev);

    // Correctly ID target
    let target = ev.target;
    if (target.tagName.search(/^li$/i) !== 0)
        target = target.closest("li");
    if (target === null  ||  target.id.match(/add$/))
        return;
    let targetText = target.querySelector(".entry");

    if (prefs.debug)
        console.log("URL Link dragged to '" + target.id + "' (" + target.tagName + ")");

    // ID start and stop as ints
    let bits = originId.match(/^([^0-9]+)(.*)/);
    let set = bits[1];
    let originIndex = parseInt( bits[2] );
    bits = target.id.match(/^([^0-9]+)([0-9]+)(.*)/);
    let targetIndex = parseInt( bits[2] );

    if (prefs.debug)
        console.log("URL Link dragged index " + originIndex + " to " + targetIndex);

    // Dropped into a separator, and dragging up?
    if (bits[3].length > 0  &&  originIndex > targetIndex)
        targetIndex++;  // Dropped onto a separator;  this way around, the target is the thing below it

    // Shuffling up or down?  (down is increasing index)
    if (originIndex === targetIndex)
    {
        // No change
        return;
    }
    else if (originIndex < targetIndex)
    {
        // Moving from top down, so shuffle up
        let moveText = originText.innerText;
        let item = document.getElementById( set + originIndex );
        let itemText = item.querySelector(".entry");
        for (let index = originIndex+1;  index <= targetIndex;  ++index)
        {
            let nextItem = document.getElementById( set + index );
            let nextText = nextItem.querySelector(".entry");
            itemText.innerText = nextText.innerText;
            item = nextItem;
            itemText = nextText;
        }
        itemText.innerText = moveText;
    }
    else
    {
        // Moving from bottom up, so shuffle down
        let moveText = originText.innerText;
        let item = document.getElementById( set + originIndex );
        let itemText = item.querySelector(".entry");
        for (let index = originIndex-1;  index >= targetIndex;  --index)
        {
            let nextItem = document.getElementById( set + index );
            let nextText = nextItem.querySelector(".entry");
            itemText.innerText = nextText.innerText;
            item = nextItem;
            itemText = nextText;
        }
        itemText.innerText = moveText;
    }
}


// Entered item while dragging
function onDragEnter(ev)
{
    // If a valid item, highlight it as a target
    let target = ev.target;
    if ((target.tagName && target.tagName.search(/^(li|div|span|svg|path)$/i) === 0 )  ||
        target.nodeName.search(/^(#text)$/i) === 0)
    {
        if (!target.tagName)
            target = target.parentNode;
        if (target.tagName.search(/^li$/i) !== 0)
            target = target.closest("li");
        if (target !== null)
            target.className += " dragging";
    }
}


// Left item while dragging
function onDragLeave(ev)
{
    // If current is a valid item, stop highlighting it as a target
    let target = ev.target;
    if ((target.tagName && target.tagName.search(/^(li|div|span|svg|path)$/i) === 0 )  ||
        target.nodeName.search(/^(#text)$/i) === 0)
    {
        if (!target.tagName)
            target = target.parentNode;
        if (target.tagName.search(/^li$/i) !== 0)
            target = target.closest("li");
        if (target !== null)
            target.className = target.className.replace(/ dragging\b/,'');
    }
}



// Click on a tab selection button
function selectTab(ev, tabName)
{
    if (prefs.debug)
        console.log("URL Link " + tabName + " selected");

    // Set all buttons as non-current
    let tabContent = document.getElementsByClassName("tab-content");
    for (let tab = 0; tab < tabContent.length; tab++)
        tabContent[tab].style.display = "none";

    // Hide all tabs
    let tabLinks = document.getElementsByClassName("tab-link");
    for (let tab = 0; tab < tabLinks.length; tab++) {
        tabLinks[tab].className = tabLinks[tab].className.replace(/ active\b/g, "");
    }

    // Show selected tab
    document.getElementById(tabName + "-tab").style.display = "block";

    // Flag active button
    ev.currentTarget.className += " active";
}


// Delete a li
function deleteEntry( li )
{
    if (prefs.debug)
        console.log("URL Link deleting " + li.id);

    // Delete the li and its following separator
    let parent = li.parentNode;
    let sep = li.nextSibling;
    parent.removeChild( li );
    parent.removeChild( sep );

    // Renumber the lis
    let item = 0;
    let lis = parent.querySelectorAll( "li" );
    for (let idx = 0;  idx < lis.length;  ++idx)
    {
        // Split current id into <name><num><suffix>
        // We have, e.g., manu1, menu1sep, menu2, menu2sep, ... menuN, menuNsep, menuN+1add
        let bits = lis[idx].id.match(/^([^0-9]+)([0-9]+)(.*)/);
        if (!bits[3])
            bits[3] = "";
        if (bits[3] === ""  ||  bits[3] === "add")
            ++item;
        lis[idx].id = bits[1] + item + bits[3];
    }
}


// Make delete button stub in a LI work
function setDeletable( li )
{
    let button = li.querySelector("span.for-delete-button");
    if (button)
    {
        button.className = "delete-button";
        button.title = browser.i18n.getMessage("prefs-delete");
        button.addEventListener( "click", event => {
            deleteEntry( li );
        } );
    }
}


// Add drag thumb button to li
function addThumb( li )
{
    let span = document.createElement("span");
    span.className = "thumb";
    span.title = "";

    let thumb = document.createElementNS( "http://www.w3.org/2000/svg", "svg" );
    thumb.viewBox = "0 0 24 24";
    let path = document.createElementNS( "http://www.w3.org/2000/svg", "path" );
    path.setAttributeNS( null, "d",
        "M7,19V17H9V19H7M11,19V17H13V19H11M15,19V17H17V19H15M7,15V13H9V15H7M11,15V13H13V15H11M15,15V13H17V15H15M7,11V9H9V11H7M11,11V9H13V11H11M15,11V9H17V11H15M7,7V5H9V7H7M11,7V5H13V7H11M15,7V5H17V7H15Z" );
    thumb.appendChild( path );
    span.appendChild( thumb );

    li.appendChild( span );
}


// Create a menu list item
function createLi( n, list, listtype, cls, text )
{
    let li = document.createElement("li");

    // List entry?
    if (listtype !== "sep")
    {
        // Delete button (or space for it for the add entry)
        let span = document.createElement("span");
        span.className = "for-delete-button";
        span.appendChild( document.createTextNode("✖") );
        li.appendChild( span );
        if (listtype !== "add")
        {
            li.draggable = true;
            setDeletable( li );
        }

        // Entry itself
        let entry = document.createElement("span");
        entry.className = "entry";
        entry.appendChild( document.createTextNode(text) );
        li.appendChild( entry );

        // Drag button
        if (listtype !== "add")
            addThumb( li );
    }
    else
    {
        // Separator: span in a div in a li
        let div = document.createElement("div");
        let span = document.createElement("span");
        span.appendChild( document.createTextNode(" ") );
        div.appendChild( span );
        li.appendChild( div );
    }

    // And the rest of the attributes; drag stuff if it's not the "add" line
    li.className = cls;
    li.id        = list + n + listtype;

    return li;
}


// Editable entries
function makeEditable( li )
{
    // Editable
    let text = li.querySelector(".entry");
    text.contentEditable = true;

    // Disable drag pre-edit, as it prevents correct caret location on click
    text.addEventListener( "mouseenter", event => {
        li.draggable = false;
    });
    text.addEventListener( "mouseleave", event => {
        li.draggable = true;
    });

    // Flag via colour when editing.
    // Add-item one needs to bin its + when editing it.
    text.addEventListener( "click", event => {
        if (prefs.debug)
            console.log("URL Link editing " + text.closest("li").id);
        text.className += " editing";
        text.setAttribute( "data-originaltext", text.textContent );
        if (text.className.match(/\bediting\b/)  &&  text.textContent == plusChar)
            text.textContent = "";
    });

    // Handler for finishing up
    function finishEditing( event )
    {
        if (prefs.debug)
            console.log("URL Link finished editing " + li.id);

        // Tidy up
        let text = event.target;
        text.textContent = event.target.textContent.replace(/[\r\n]/g,"");
        text.className = event.target.className.replace(/ editing\b/g,"");

        // Was it an additional one?
        if (li.id.match(/add\b/))
        {
            // Yes;  if empty, just put back
            if (text.textContent == "" || text.textContent == plusChar)
            {
                if (prefs.debug)
                    console.log("URL Link edited new but left it blank");
                text.textContent = plusChar;
            }
            else
            {
                if (prefs.debug)
                    console.log("URL Link added new entry");

                // Make it a normal one
                li.id = li.id.replace(/add\b/g,"");
                li.draggable = true;
                setDeletable( li );
                addThumb( li );

                // Add a new +;  need to ID whether menu or sandr
                let list = text.closest("ul");
                let size = list.querySelectorAll("li.li-data").length;
                let tab = list.parentNode;
                if (tab.id.search("menu") >= 0)
                    addPlusEntry( list, size, "menu" );
                else
                    addPlusEntry( list, size, "sandr" );
            }
        }
    }

    // Enter/escape will stop editing
    text.addEventListener( "keypress", event => {
        if (event.keyCode == 10 || event.keyCode == 13 || event.keyCode == 27)
        {
            // Reset if using Escape
            if (event.keyCode == 27)
            {
                let original = event.target.getAttribute( "data-originaltext" );
                if (original)
                {
                    event.target.textContent = original;
                    event.target.removeAttribute( "data-originaltext" );
                }
            }

            // Finish
            event.preventDefault();
            event.target.blur();
        }
    });

    // Catch end of edit due to loss of focus too
    text.addEventListener( "blur", event => {
        finishEditing( event );
    });
}


// Add a new + entry
function addPlusEntry( list, n, type )
{
    list.appendChild( createLi( n, type, "sep", "li-sep", "" ) );
    let li = createLi( parseInt(n)+1, type, "add", "li-data", plusChar );
    makeEditable( li );
    list.appendChild( li );
}


// Apply prefs. to page
function displayPrefs()
{
    if (prefs.debug)
        console.log("URL Link loading preferences to preferences page");

    // Working OK?
    if (prefs.hasOwnProperty("lastversion"))
    {
        if (prefs.debug)
            console.log("URL Link preferences found");

        // Delete existing items
        let items = document.querySelectorAll("div.tab-content li");
        for (let n = items.length-1;  n >= 0;  --n)
            items[n].parentNode.removeChild( items[n] );

        // Find & populate menu list
        let list = document.querySelector("#menu-tab ul");
        for (let n in prefs.submenus)
        {
            if (n > 0)
                list.appendChild( createLi( n, "menu", "sep", "li-sep", "" ) );
            let li = createLi( parseInt(n)+1, "menu", "", "li-data", prefs.submenus[n] );
            makeEditable( li );
            list.appendChild( li );
        }

        // Allow for adding a new one
        addPlusEntry( list, prefs.submenus.length, "menu" );

        // Find & populate search & replace list
        list = document.querySelector("#sandr-tab ul");
        for (let n in prefs.sandr)
        {
            if (n > 0)
                list.appendChild( createLi( n, "sandr", "sep", "li-sep", "" ) );
            let li = createLi( parseInt(n)+1, "sandr", "", "li-data", prefs.sandr[n] );
            makeEditable( li );
            list.appendChild( li );
        }

        // Allow for adding a new one
        addPlusEntry( list, prefs.sandr.length, "sandr" );

        // Populate basic flags
        document.getElementById("option-new-window").checked      = prefs.newwindow;
        document.getElementById("option-force-sub-menu").checked  = prefs.forcesubmenu;
        document.getElementById("option-background-tabs").checked = prefs.inbackground;
        document.getElementById("option-debug").checked           = prefs.debug;

        // Clear menu control
        items = document.querySelectorAll("input.menu-options");
        for (let n = items.length-1;  n >= 0;  --n)
            items[n].checked = false;

        // Repopulate menu control
        if (prefs.hidetab)
            document.getElementById("option-hide-tab").checked = true;  // hide tab
        else if (prefs.hideopen)
            document.getElementById("option-hide-open").checked = true;  // hide open
        else
            document.getElementById("option-both-options").checked = true;  // have both
    }
}


// Load prefs. to page
function savePrefs()
{
    if (prefs.debug)
        console.log("URL Link saving preferences");

    // Working OK?
    if (prefs.hasOwnProperty("lastversion"))
    {
        // Process menu items
        prefs.submenus = [];
        let items = document.querySelectorAll("#menu-tab li");
        for (let n = 0;  n < items.length;  ++n)
            if (!items[n].className.match(/sep$/))
            {
                let text = items[n].querySelector(".entry");
                let str = text.textContent;
                if (str !== plusChar)
                    prefs.submenus.push( str );
            }

        // Process search and replace items
        prefs.sandr = [];
        items = document.querySelectorAll("#sandr-tab li");
        for (let n = 0;  n < items.length;  ++n)
            if (!items[n].className.match(/sep$/))
            {
                let text = items[n].querySelector(".entry");
                let str = text.textContent;
                if (str !== plusChar)
                    prefs.sandr.push( str );
            }

        // Process basic flags
        prefs.newwindow    = document.getElementById("option-new-window").checked;
        prefs.forcesubmenu = document.getElementById("option-force-sub-menu").checked;
        prefs.inbackground = document.getElementById("option-background-tabs").checked;
        prefs.debug        = document.getElementById("option-debug").checked;

        // Process menu control
        if (document.getElementById("option-hide-tab").checked)  // hide tab
        {
            prefs.hidetab = true;
            prefs.hideopen = false;
        }
        else if (document.getElementById("option-hide-open").checked)  // hide open
        {
            prefs.hidetab = false;
            prefs.hideopen = true;
        }
        else if (document.getElementById("option-both-options").checked)  // have both
        {
            prefs.hidetab = false;
            prefs.hideopen = false;
        }

        // OK, now save them
        if (prefs.debug)
            console.log( "URL Link new preferences: " + JSON.stringify( prefs ) );
        browser.storage.local.set({"preferences": prefs});

        // Tell application they've changed
        comms.postMessage({"message":"urllink-prefs-changed", "prefs": prefs});
    }
}


// Handle messages from extension
function onMessage( message )
{
    if (prefs.debug)
        console.log("URL Link preferences message from extension: " + JSON.stringify(message));

    if (message["message"] === "urllink-prefs-defaults")
    {
        // Display defaults from extension (but only display - keep saved prefs intact until save)
        let currentPrefs = prefs;
        prefs = message["prefs"];
        displayPrefs();
        prefs = currentPrefs;
    }
}


// On page load
function preparePage(ev)
{
    // Set the first button/tab as active, and monitor it
    let menu_button = document.getElementById("menu-tab-button");
    menu_button.addEventListener( "click",  event => { selectTab(event,"menu") } );
    menu_button.click();

    // Monitor second button
    document.getElementById("sandr-tab-button").addEventListener( "click", event => { selectTab(event,"sandr") } );

    // Monitor main buttons
    document.getElementById("prefs-save").addEventListener( "click", event => {
        // Save
        event.preventDefault();
        savePrefs();
    });
    document.getElementById("prefs-defaults").addEventListener( "click", event => {
        // Request defaults
        event.preventDefault();
        comms.postMessage({"message":"urllink-prefs-defaults-req"});
    });
    document.getElementById("prefs-cancel").addEventListener( "click", event => {
        // Undo edits
        event.preventDefault();
        displayPrefs();
    });

    // Load prefs.
    if (typeof(browser) !== "undefined")
    {
        // Extension
        browser.storage.local.get("preferences").then( results => {
            // Have something
            if (results.hasOwnProperty("preferences"))
                prefs = results["preferences"];

            // Apply prefs.
            displayPrefs();
        });

        // Connection to extension
        comms = browser.runtime.connect({name:"urllink-comms"});

        // Listen to extension
        comms.onMessage.addListener( message => onMessage( message ) );

        // Attempt reconnection on failure
        comms.onDisconnect.addListener( p => {
            console.warn("URL Link preferences window re-establishing connection");
            comms = browser.runtime.connect({name:"urllink-comms"});
        });

        // i18n
        // Look for data-i18n attributes, and look those up (or use the token if lookup fails due to no translation)
        for (let elem of document.querySelectorAll( "[data-i18n]" ))
        {
            // Look up translation for main text
            let key = elem.getAttribute('data-i18n');
            let i18n = "[i18n:" + key + "]";
            if (key  &&  key.length)
            {
                let text = browser.i18n.getMessage(key);
                if (text  &&  text.length)
                    i18n = text;
            }

            // Apply it
            // Things like inputs can trigger translation with value equal "i18n"
            if (typeof elem.value !== 'undefined' && elem.value === 'i18n')
                elem.value = i18n;
            else
                elem.innerText = i18n;
        }

        // Again for tooltips
        for (let elem of document.querySelectorAll( "[data-title-i18n]" ))
        {
            let key = elem.getAttribute('data-title-i18n');
            let i18n = "[i18n:" + key + "]";
            if (key  &&  key.length)
            {
                let text = browser.i18n.getMessage(key);
                if (text  &&  text.length)
                    i18n = text;
            }

            // Apply it
            elem.title = i18n;
        }
    }
    else
    {
        // Local debug
        console.warn("URL Link preferences page - diagnostic mode");
        prefs = debugPrefs;
        displayPrefs();
    }

    // Drag handling
    document.addEventListener( "dragstart", onDragStart );
    document.addEventListener( "drop",      onDrop );
    document.addEventListener( "dragover",  onDragOver );
    document.addEventListener( "dragenter", onDragEnter );
    document.addEventListener( "dragleave", onDragLeave );
    document.addEventListener( "dragend",   onDragEnd );
}


document.addEventListener("DOMContentLoaded", preparePage);
