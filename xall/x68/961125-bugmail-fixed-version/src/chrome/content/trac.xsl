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
 
 <xsl:variable name="min" select="'abcdefghijklmnopqrstuvwxyz'"/>
 <xsl:variable name="maj" select="'ABCDEFGHIJKLMNOPQRSTUVWXYZ'"/>
 
 <xsl:template match="/trac">
    <div xmlns="http://www.w3.org/1999/xhtml">
      &#160;<xsl:value-of select="component"/> |
      <span id="bug_type" class="{translate(type, $min, $maj)}"><xsl:value-of select="type"/></span>&#160;
      <span tooltip="Status" id="bug_status" class="{translate(status, $min, $maj)}"><xsl:value-of select="status"/></span>&#160;
      <span id="bug_resolution" class="{translate(resolution, $min, $maj)}"><xsl:value-of select="resolution"/></span>&#160;
      <span id="bug_priority" class="{translate(priority, $min, $maj)}"><xsl:value-of select="priority"/></span>&#160;|
      <xsl:value-of select="owner"/>
    </div>
 </xsl:template>
 
</xsl:stylesheet>
