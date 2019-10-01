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
<xsl:stylesheet xmlns:xsl="http://www.w3.org/1999/XSL/Transform"
                xmlns:h="http://www.w3.org/1999/xhtml"
                version="1.0">
 
 <xsl:variable name="min" select="'abcdefghijklmnopqrstuvwxyz'"/>
 <xsl:variable name="maj" select="'ABCDEFGHIJKLMNOPQRSTUVWXYZ'"/>
 
 <xsl:template name="getField">
   <xsl:param name="name" select="''"/>
   <xsl:choose>
    <xsl:when test="//*[@headers=$name]"><xsl:value-of select="//*[@headers=$name]"/></xsl:when>
    <xsl:when test="//*[@id=$name]"><xsl:value-of select="//*[@id=$name]"/></xsl:when>
   </xsl:choose>
 </xsl:template>
 
 <xsl:template name="getFieldUpper">
   <xsl:param name="name" select="''"/>
   <xsl:choose>
    <xsl:when test="//*[@headers=$name]"><xsl:value-of select="translate(//*[@headers=$name], $min, $maj)"/></xsl:when>
    <xsl:when test="//*[@id=$name]"><xsl:value-of select="translate(//*[@id=$name], $min, $maj)"/></xsl:when>
   </xsl:choose>
 </xsl:template>
 
 <xsl:template match="/">
    <xsl:variable name="bug_status">
      <xsl:call-template name="getFieldUpper">
        <xsl:with-param name="name" select="'status'"/>
      </xsl:call-template>
    </xsl:variable>
    <xsl:variable name="assignedto">
      <xsl:call-template name="getField">
        <xsl:with-param name="name" select="'assignedto'"/>
      </xsl:call-template>
    </xsl:variable>
    <xsl:variable name="category">
      <xsl:call-template name="getField">
        <xsl:with-param name="name" select="'category'"/>
      </xsl:call-template>
    </xsl:variable>
    <div xmlns="http://www.w3.org/1999/xhtml">
      &#160;<xsl:value-of name="name" select="$category"/> |
      <span id="bug_status" class="{$bug_status}"><xsl:value-of select="$bug_status"/></span>&#160;|
      <xsl:value-of select="$assignedto"/>
    </div>
 </xsl:template>
 
</xsl:stylesheet>
