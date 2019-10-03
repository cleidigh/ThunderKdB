<?xml version="1.0" encoding="UTF-8"?>
<xsl:stylesheet version="1.0" xmlns:xsl="http://www.w3.org/1999/XSL/Transform">

<!-- 2012-08-06 gW -->
<!-- for extra spaces use &#160; instead of &nsp; -->

	<xsl:template match="/">
		<html>
		<head>
			<title><xsl:value-of select="general/locale/title"/></title>
		</head>
			<body>
				<h2>Reminderfox View and Print</h2>
				<table border="1">
					<tr bgcolor="#9acd32">

						<th style="width: 12%;">Date</th>
						<th style="width: 40%;">Summary</th>
						<th >Notes</th>
					</tr>
					<xsl:for-each select="general/reminders/event">
						<tr>
							<td>
								<xsl:value-of select="date"/>
							</td>
							<td>
								<xsl:value-of select="summary"/>
							</td>
							<td>
								<xsl:value-of select="notes"/>
							</td>
						</tr>
					</xsl:for-each>
				</table>
				<p>
					<small>
						<xsl:value-of select="general/date"/> -- <xsl:value-of select="general/time"/>
					</small>
				</p>
			</body>
		</html>
	</xsl:template>
</xsl:stylesheet>
