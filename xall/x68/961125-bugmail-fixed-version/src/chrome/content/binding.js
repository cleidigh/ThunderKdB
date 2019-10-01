/*
 Open Mashups Runtime
    Copyright (C) 2008  Orange Labs

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

    Initial author is Fabrice Desré - fabrice.desre@orange-ftgroup.com
    */
function xsltBinding() {
  this.loaded = 0;
  this.needed = 0;
  this.xsl = null;
  this.src = null;
  this.callback = null;
  this.params = null;
  this.doc = document;
}

xsltBinding.prototype = {

  init: function(pid, psrc, pxsl, cb, params) {
    this.id = pid;
    this.loaded = 0;
    this.needed = 2;
    this.callback = cb;
    this.params = params;
    this.xsl_uri = pxsl;
    this.src_uri = psrc;
    var self = this;
    this.xslreq = new XMLHttpRequest();
    this.xslreq.overrideMimeType("text/xml");
    this.xslreq.open('GET', pxsl, true); 
    this.xslreq.onload = function() {
      self.loaded += 1;
      if (self.loaded == self.needed)
      self.refresh();
    }
    this.xslreq.send(null);
    this.srcreq = new XMLHttpRequest();
    this.srcreq.overrideMimeType("text/xml");
    this.srcreq.open('GET', psrc, true); 
    this.srcreq.onload = function() {
      self.loaded += 1;
      if (self.loaded == self.needed)
      self.refresh();
    }
    this.srcreq.send(null);
  },
  
  initWithSrc: function(pid, psrc, pxsl, cb, params) {
    this.id = pid;
    this.loaded = 0;
    this.needed = 1;
    this.callback = cb;
    this.params = params;
    this.xsl_uri = pxsl;
    this.src_uri = "";
    this.src = psrc;
    this.xslreq = new XMLHttpRequest();
    this.xslreq.open('GET', pxsl, true); 
    var self = this;
    this.xslreq.onload = function() {
      self.loaded += 1;
      if (self.loaded == self.needed)
        self.refresh();
    }
    this.xslreq.send(null);
  },
  
  initWithDoc: function(doc, pid, psrc, pxsl, cb, params) {
    this.doc = doc;
    this.init(pid, psrc, pxsl, cb, params);
  },
  
  initSrcWithDoc: function(doc, pid, psrc, pxsl, cb, params) {
    this.doc = doc;
    this.initWithSrc(pid, psrc, pxsl, cb, params);
  },
  
  refresh: function() {
    this.xsl = this.xslreq.responseXML;
    if (!this.src)
      this.src = this.srcreq.responseXML;
    parent = this.doc.getElementById(this.id);
    while (parent.firstChild)
      parent.removeChild(parent.firstChild);
    var xsltproc = new XSLTProcessor();
    try {
      xsltproc.importStylesheet(this.xsl);
      if (this.params != null)
      for (par in this.params) {
        xsltproc.setParameter(null, par, this.params[par]);
      }
      var res = xsltproc.transformToFragment(this.src, this.doc);
    } catch(e) {
      dump("-- error in xsltBinding::refresh() " + e + "\n");
      dump("xsl : " + this.xsl_uri + "\n");
      dump("src : " + this.src_uri + "\n");
      return;
    }
    var nodes = res.childNodes;
    var i = 0;
    var max = nodes.length;
    while (i < max) {
      parent.appendChild(nodes.item(0));
          i++;
    }
    this.callback();
  },
  
  handleEvent: function() {
    this.binding.loaded += 1;
    if (this.binding.loaded == this.binding.needed)
      this.binding.refresh();
  },
  
  getData: function() {
    return this.src;
  },
  
  getXSL: function() {
    return this.xsl;
  }
}
