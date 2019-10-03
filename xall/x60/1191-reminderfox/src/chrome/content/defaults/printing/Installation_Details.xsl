<?xml version="1.0" encoding="UTF-8"?>
<xsl:stylesheet version="1.0" xmlns:xsl="http://www.w3.org/1999/XSL/Transform">

<!-- 2012-08-06 gW -->
<!-- for multiple spaces use &#160; instead of &nsp; -->

	<xsl:template match="/">
		<html>
			<head>
				<title><xsl:value-of select="general/locale/title"/></title>
			</head>
			<body>
				<h3>Reminderfox View and Print -- Installation Details</h3>

				<small>
					<xsl:value-of select="general/date"/>&#160;&#160;--&#160;&#160; &quot;<xsl:value-of select="general/time"/>&quot;
					<br/>
					<xsl:value-of select="general/xlsName"/>
					<br/>
					<xsl:value-of select="general/template"/>
					<br/>
					<xsl:value-of select="general/version"/>
					<br/>
					<xsl:value-of select="general/app"/>
				</small>
			</body>
		</html>
	</xsl:template>
</xsl:stylesheet>
