// Handle identification of best selection
//   common.js
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


//// Utility functions


// Our prefs
var prefs = { debug: false };



// How to deal with newlines in the selection?
// Sometimes it's a space in a ref. that's been broken across lines, sometimes it's just a break.
// Let's go with presuming that there'll only be legitimate spaces causing breaks in file:: (and \\ & X:) URLs.
// Do it before the custom SnR so as to remove problematic CRs.
// We also need to cope with arbitrary text selection (for searches), so keep spaces if there's no protocol.
function unmangleNewlines( url )
{
    // backslashes have been converted by here
    var file_url  = (url.search(/^(file:|[A-Za-z]:|\/\/)/) == 0);   /* Looks like a file URL */
    var has_proto = (url.search(/^([A-Za-z]\w+:\/\/)/) == 0);       /* Looks like a standard URL */
    var url_like  = (url.search(/\/[A-Za-z0-9_.]+\//) >= 0);        /* Looks like a URL without a protocol */

    // If file URL or doesn't look like URL
    if (file_url || (!has_proto && !url_like))
        url = url.replace(/(\n|\r| )+/g, ' ');  // presume spaces as it looks like a file URL or arbitrary text
    else
        url = url.replace(/(\n|\r| )+/g, '');   // presume empty for normal URLs
    return url;
}


// Tidy up the selected string
function tidySelection( str )
{
    str = str.replace('\xAD','');                   // seen in Google 'did you mean' links
    str = str.replace('\xA0','');                   // seen in Thunderbird compose window
    str = str.replace(/\t/g, ' ');                  // tabs to space
    str = str.replace(/^[\n\r ]+/, '');             // strip leading space
    str = str.replace(/((\n|\r) *>[> ]*)+/g, '');   // remove standard quote marks
    str = str.replace(/[\n\r ]+$/, '');             // strip spaces at the end
    str = str.replace(/\\/g,'/');                   // backslash to forward slash

    // Do CR->space conversion when we know a bit more about the original URL and whether it ought to be space or ''
    return str;
}


// Perform an individual preference-defined search and replace operation on the given string
function singleSearchAndReplace( str, sandr )
{
    // Separate out lhs (regex) and rhs (repl)
    var barpos = sandr.search('\\|\\|');
    if (barpos != -1)
    {
        // Got 'em
        var restr = sandr.substr(0,barpos);
        var repl = sandr.substr(barpos+2);
        var reopt = '';

        // May have regex opts (e.g. 'g')
        // Use 'D' for debug to console
        var barpos = repl.search('\\|\\|');
        if (barpos != -1)
        {
            reopt = repl.substr(barpos+2);
            repl = repl.substr(0,barpos);
        }

        // Debug?
        var actualreopt = reopt.replace(/D/,'');
        var debug = (actualreopt != reopt);

        // Do it
        if (restr)
        {
            var regex = new RegExp( restr, actualreopt );
            if (regex)
            {
                var newstr = str.replace( regex, repl );
                if (debug)
                    console.log( "URL Link debug\nConversion: '" + sandr + "'\nFrom: '" + str + "'\nTo: '" + newstr + "'" );
                str = newstr;
            }
        }
    }
    return str;
}


// Perform the preference-defined search and replace operations on the given string
function customSearchAndReplace( str )
{
    // Process prefs
    if (prefs.hasOwnProperty("sandr"))
        for (let n in prefs.sandr)
            str = singleSearchAndReplace( str, prefs.sandr[n] );

    return str;
}



//// Browser page specific functionality


// Some sites (e.g., kelkoo) obfuscate their js links with base64!
function decode64(realinput)
{
    var keyStr = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=';
    var output = '';
    var chr1, chr2, chr3;
    var enc1, enc2, enc3, enc4;
    var i = 0;

    // remove all characters that are not A-Z, a-z, 0-9, +, /, or =
    var input = realinput.replace(/[^A-Za-z0-9\+\/\=]/g, '');
    if (input != realinput)
    {
        // Not Base64
        return '';
    }

    do {
        enc1 = keyStr.indexOf(input.charAt(i++));
        enc2 = keyStr.indexOf(input.charAt(i++));
        enc3 = keyStr.indexOf(input.charAt(i++));
        enc4 = keyStr.indexOf(input.charAt(i++));

        chr1 = (enc1 << 2) | (enc2 >> 4);
        chr2 = ((enc2 & 15) << 4) | (enc3 >> 2);
        chr3 = ((enc3 & 3) << 6) | enc4;

        output = output + String.fromCharCode(chr1);

        if (enc3 != 64) {
            output = output + String.fromCharCode(chr2);
        }
        if (enc4 != 64) {
            output = output + String.fromCharCode(chr3);
        }
    } while (i < input.length);

    return output;
}


// Find largest best javascript arg
function getBestJavascriptArg(url)
{
    // Avoid twatting the app. if a link that contains an embedded JS app. is clicked!
    if (url.length > 1024)
        return '';

    // Strip leader
    url = url.replace(/^javascript[:].*?\(/, '');

    // Loop through looking for best; '/' has precedence
    var haveSlash = false;
    var best = '';
    var start = 0;
    var pos = 0;
    var quote = '';
    while (pos < url.length)
    {
        // Backslash?
        if (url[pos] == '\\')
        {
            continue;
        }
        // Start of quote?
        else if (quote == ''  &&  (url[pos] == '\''  ||  url[pos] == '"'))
        {
            quote = url[pos];
            start = pos;
        }
        // End of quote?
        else if (quote != ''  &&  url[pos] == quote)
        {
            // We want this if it has a slash and our best doesn't,
            // or they both do/don't have slashes it's bigger than our best
            quote = '';
            var current = url.substr( start+1, pos-start-1 );
            var thisSlash = (current.match(/\//) == '/');
            if ( (!haveSlash && thisSlash)  ||
                 (haveSlash == thisSlash  &&  current.length > best.length) )
            {
                best = current;
                haveSlash = thisSlash;
            }
        }
        pos++;
    }

    // Is our best actually base64 (e.g,. kelkoo?)
    var decoded = fnxweb.urllink.decode64(best);
    if (decoded != '')
         best = decoded;

    return best;
}


// Strip bad leading and trailing characters
function unmangleURL( url, wasLink )
{
    // Strip bad leading characters
    // Allow '(' if there's a following ')' (e.g., wikipedia)
    var bracketed = (url.search(/\(.*\)/) != -1);
    var illegalChars = (bracketed  ?  /^[\.,\'\"\?!>\]]+/  :  /^[\.,\'\"\(\)\?!>\]]+/);
    url = url.replace(illegalChars, '');

    // How to deal with newlines in the selection?
    url = unmangleNewlines( url );

    // Perform custom search and replaces
    url = customSearchAndReplace(url);

    // Non-break spaces for within HTML (seen in TB)
    url = url.replace(/\xA0/g, ' ');

    // If it's a mail link in an actual hyperlink, strip off up to the '@' (convert mail link into web link)
    // If it's a textual mailto:, we'll activate it [if user wants a fake web link, don't select the "mailto:"!]
    if (wasLink  &&  url.search(/^mailto:/) == 0)
        url = url.replace(/^mailto:.*@/,'');

    // Remove any JavaScript waffle
    if (url.search(/^javascript[:]/) == 0)
    {
        // Get out first string arg.
        url = getBestJavascriptArg(url);

        // Full URL?  If not, prefix current site
        if (url.search(/^\w+:\/\//) == -1)
        {
            var thispage = window.content.location.href;
            if (url[0] == '/')
            {
                // Put site URL on front: '/some/dir' -> 'http:/somesite/some/dir'
                thispage = thispage.replace(/^(\w+:\/+.*?)\/.*/,"$1");
            }
            else
            {
                // Put local dir URL on front: 'some/sub/dir' -> 'http:/somesite/pagedir/some/sub/dir'
                thispage = thispage.replace(/^(\w+:\/+.*\/).*/,"$1");
            }
            url = thispage + url;
        }
    }

    // strip bad ending characters
    // Allow ')' if there's a preceeding '(' (e.g., wikipedia)
    illegalChars = (bracketed  ?  /[\.,\'\"\?!>\]]+$/  :  /[\.,\'\"\?!>\]\(\)]+$/);
    url = url.replace(illegalChars, '');

    return url;
}


// Figure out best guess link to use if triggered (info is menus.OnClickData)
function processSelection( info )
{
    // Determine official selected text
    let lnk = info.selectionText;

    if (prefs.debug)
        console.log( `URL Link: processSelection called with = '${lnk}'` );

    // ID target of click
    let isLink = (typeof info.linkUrl !== "undefined"  &&  info.linkUrl.length > 0);

    // Process text or hyperlink
    if (typeof lnk !== "undefined"  &&  lnk.length)
    {
        // Use selected text
        lnk = tidySelection( lnk );
    }
    else if (isLink)
    {
        // Fall-back to target of link if nothing else
        lnk = info.linkUrl;
    }

    // Anything at all?
    if (typeof lnk === "undefined")
        return "";

    // Final tidy-up (main extension code will have to fix up the final URL once prefix/suffix added)
    lnk = unmangleURL( lnk, isLink );

    // Done
    return lnk;
}
