<?xml version="1.0" encoding="UTF-8"?>

<xsl:stylesheet version="1.0" xmlns:xsl="http://www.w3.org/1999/XSL/Transform">

  <!-- Installation_Details.xsl -->
  <!-- 2019-12 updated -->
  <!-- for extra spaces use &#160; instead of &nsp; -->

  <xsl:template match="/">
    <html>
      <head>
        <meta content="text/html; charset=UTF-8" http-equiv="content-type"/>
        <title><xsl:value-of select="general/locale/title"/></title>
      </head>
      <style type="text/css">
        body,
        html {
          margin: 0 auto !important;
          padding: 0 !important;
          font-family: Arial;
          font-size: 12pt;
        }
        h3 {
          margin: 1%;
        }
        table {
          font-family: Arial;
          font-size: 10pt;
          word-break: break-all;
          width: 80%;
          margin-left: 2%;
        }
      </style>

      <body>
        <h3>Reminderfox Agenda and Print -- Installation Details</h3>
        <p style="margin-left:20px;">

          <xsl:value-of select="general/date"/> -- <xsl:value-of select="general/time"/>
          <br/>
          <br/>
          <br/>

          <xsl:value-of select="general/template"/>
          <br/>

          <xsl:value-of select="general/version"/>
          <br/>

          <xsl:value-of select="general/app"/>
        </p>
      </body>
    </html>
  </xsl:template>
</xsl:stylesheet>
