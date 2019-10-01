/*
bugmail extension for Thunderbird
    
    Copyright (C) 2008-2009  Fabrice Desré

    This program is free software: you can redistribute it and/or modify
    it under the terms of the GNU General Public License as published by
    the Free Software Foundation, either version 3 of the License, or
    (at your option) any later version.

    This program is distributed in the hope that it will be useful,
    but WITHOUT ANY WARRANTY; without even the implied warranty of
    MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
    GNU General Public License for more details.

    You should have received a copy of the GNU General Public License
    along with this program.  If not, see <http://www.gnu.org/licenses/>.

    Initial author is Fabrice Desré - fabrice.desre@gmail.com
*/

var launchpadEngine = {
  iconURL : "chrome://bugmail/skin/launchpad.png",
  
  isBug: function(mailURI, headers) {
    var mailer = headers.extractHeader("X-Launchpad-Bug", false);
    return (mailer && mailer.length > 0);
  },
  
  getBugURI: function(mailURI, headers) {
    var doc = document.getElementById('messagepane').contentDocument;
    var uri = doc.evaluate("//A/@href[contains(., 'https://bugs.launchpad.net/bugs/')]", doc, null,
                           2, // was: Components.interfaces.nsIDOMXPathResult.STRING_TYPE,
                           null).stringValue;
	return "http://feeds.launchpad.net/bugs/" + uri.split('/').reverse()[0] + "/bug.atom";
  },
  
  updateUI: function(doc, text) {
    var content = doc.evaluate("/a:feed/a:entry/a:content[@type='html']", doc,
				function(pfx) { return "http://www.w3.org/2005/Atom";},
		       2, // was: Components.interfaces.nsIDOMXPathResult.STRING_TYPE,
		       null).stringValue.replace(/&nbsp;/g, "&#160;");
    var parser = new DOMParser();
    var desc = parser.parseFromString(content, "text/xml");
    desc.documentElement.setAttribute("class", "launchpad");
    document.getElementById("bugmail-info").appendChild(document.importNode(desc.documentElement, true));
    document.getElementById("bugmail-details").removeAttribute("collapsed");
  },
  
  toogleDetails: function() {
    var content = document.getElementById("bugmail-info").firstChild;
    var cvalue = content.getAttribute("class");
    if (cvalue == "launchpad") {
      content.setAttribute("class", "launchpad-full");
    }
    else {
      content.setAttribute("class", "launchpad");
    }
  }
}

bugmail.addEngine(launchpadEngine);