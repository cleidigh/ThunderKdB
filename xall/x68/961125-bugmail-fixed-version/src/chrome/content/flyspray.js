/*
bugmail extension for Thunderbird
    
    Copyright (C) 2008  Fabrice Desré

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

var flysprayEngine = {
  iconURL : "chrome://bugmail/skin/flyspray.png",
  
  isBug: function(mailURI, headers) {
	var mailer = headers.extractHeader("X-Mailer", false);
    if (mailer && mailer.length > 0 && mailer == 'Flyspray') {
	  return true;
	}
	// check URI format. May lead to false positives
	var doc = document.getElementById('messagepane').contentDocument;
    var nb = doc.evaluate("count(//A/@href[contains(., 'do=details')])", doc, null,
                           1, // was: Components.interfaces.nsIDOMXPathResult.NUMBER_TYPE,
                           null).numberValue;
	return (nb > 0);
  },
  
  getBugURI: function(mailURI, headers) {
    var doc = document.getElementById('messagepane').contentDocument;
    var uri = doc.evaluate("//A/@href[contains(., 'do=details')]", doc, null,
                           2, // was: Components.interfaces.nsIDOMXPathResult.STRING_TYPE,
                           null).stringValue;
	return uri.split('#')[0];
  },
  
  updateUI: function(doc, text) {
	var content = bugmail.loadHiddenIFrame(text);
	var binding = new xsltBinding();
	binding.initWithSrc("bugmail-info", content, "chrome://bugmail/content/flyspray.xsl",
						function() {}, []);
  }
}

bugmail.addEngine(flysprayEngine);