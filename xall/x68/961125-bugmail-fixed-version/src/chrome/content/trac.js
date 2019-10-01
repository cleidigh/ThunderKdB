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
    Contributor: Ted Gifford - tedfordgif@gmail.com
*/

var tracEngine = {
  iconURL : "chrome://bugmail/skin/trac.png",
  
  isBug: function(mailURI, headers) {
	//dump("tracEngine::isBug(" + mailURI + ")");
	var product = headers.extractHeader("X-Trac-Ticket-URL", false);
    return (product && product.length > 0);
    // return false;
  },
  
  getBugURI: function(mailURI, headers) {
    var uri = headers.extractHeader("X-Trac-Ticket-URL", false).split('#')[0];
    return uri + "?format=tab";
  },
  
  updateUI: function(doc, text) {
    var lines = text.split(/\r\n/);
	var bugDoc = document.implementation.createDocument(null, "trac", null);
	var head = lines[0].split('\t');
    lines.shift();
	var content = lines.join("\r\n").replace(/\t/g,"\b");
    var commaRe = /"[^"]+"/gm;
    var result;
    while ((result = commaRe.exec(content)) != null)
      content = content.substring(0,result.index) + result[0].replace(/[\b]/gm,"\t") + content.substring(commaRe.lastIndex);
    content = content.split("\b");
	for (var i = 0; i < head.length; i++) {
	  var elem = bugDoc.createElement(head[i]);
	  elem.appendChild(bugDoc.createTextNode(content[i]));
	  bugDoc.documentElement.appendChild(elem);
	}
	var binding = new xsltBinding();
	binding.initWithSrc("bugmail-info", bugDoc, "chrome://bugmail/content/trac.xsl",
						function() {}, []);
  }
}

bugmail.addEngine(tracEngine);