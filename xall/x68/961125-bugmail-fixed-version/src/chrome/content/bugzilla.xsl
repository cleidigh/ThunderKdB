<?xml version="1.0"?>
<!--
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
-->
<!DOCTYPE xsl:stylesheet SYSTEM "chrome://bugmail/locale/bugmail.dtd">
<xsl:stylesheet xmlns:xsl="http://www.w3.org/1999/XSL/Transform" version="1.0">
 
 <xsl:template match="/bugzilla">
    <xsl:apply-templates select="bug"/>
 </xsl:template>
 
 <xsl:template match="bug[not(@error)]">
    <div xmlns="http://www.w3.org/1999/xhtml">
      &#160;<xsl:value-of select="product"/> / <xsl:value-of select="component"/> |
      <span id="bug_status" class="{bug_status}"><xsl:value-of select="bug_status"/></span>&#160;
      <span id="bug_resolution" class="{resolution}"><xsl:value-of select="resolution"/></span> |
      <a href="mailto:{assigned_to}"><xsl:value-of select="assigned_to/@name"/></a> |
      <span id="bug_keywords"><xsl:value-of select="keywords"/></span> |
    </div>
 </xsl:template>
 
 <xsl:template match="bug[@error]">
    <div xmlns="http://www.w3.org/1999/xhtml">
      <span class="security-error">&security.error;</span>&#160;
      <button onclick="bugzillaEngine.askLogin()">&security.login;</button>
    </div>
 </xsl:template>
</xsl:stylesheet>
