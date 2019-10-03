<?xml version="1.0" encoding="UTF-8"?>
<xsl:stylesheet version="1.0"
	xmlns:xsl="http://www.w3.org/1999/XSL/Transform">

	<!-- Agenda.xsl -->
	<!-- 2013-10-02  updated for url/location as active url -->
	<!-- http://www.w3schools.com/xml/default.asp -->
	<!-- http://www.w3schools.com/css/default.asp -->
	<!-- for extra spaces use &#160; instead of &nsp; -->

	<xsl:template match="/">
		<html>
			<head>
				<title>
					<xsl:value-of select="general/locale/title" />
				</title>
			</head>

			<body style="font-family:Arial;font-size:10pt;">

				<h3>
					ReminderFox -- <xsl:value-of select="general/locale/todaysAndUpcomings" />&#160; &#160;<xsl:value-of select="general/locale/reminders" />
				</h3>

				<table border="0" style="width: 100%;"> <!-- todays reminders -->
					<tr bgcolor="#C0C0C0">
						<th style="width: 10%;">
							<xsl:value-of select="general/date" />
						</th>
						<th>
							<xsl:value-of select="general/locale/todays" /> &#160; <xsl:value-of select="general/locale/reminders" />
						</th>
					</tr>

					<xsl:for-each select="general/reminders/today">

						<tr>
							<td valign='top'>
								<b>
									<!--xsl:value-of select="date"/><br/> <xsl:value-of select="date_shortDay"/> 
										&#160;&#160; -->
									<xsl:value-of select="date_time" />
								</b>
								<xsl:if test="endDate_ref &gt; 0">
									<br />
									<!--xsl:value-of select="endDate"/><br/> <xsl:value-of select="endDate_shortDay"/> 
										&#160;&#160; -->
									<xsl:value-of select="endDate_time" />
								</xsl:if>
							</td>

							<td valign='top' align='center'>
								<table border="0" style="width: 100%;" valign='top'>
									<tr>
										<td valign='top' align='center' style="width: 5%;"></td>
										<td valign='top'>
											<xsl:if test="completedDate_ref &gt; 0">
												<i>Completed: <xsl:value-of select="completedDate" /></i>
											</xsl:if>
										</td>
									</tr>

									<tr>
										<td valign='center' align='center' style="width: 5%;">
											<xsl:if test="calDAVid != ''">
												<span><img align="bottom" alt="" src="file:icons/iCal.png" style="vertical-align:bottom"/>
												<xsl:value-of select="calDAVid"/></span>
												<br />
											</xsl:if>

											<xsl:if test="messageID = 'M'">
												<img alt="" src="file:icons/mail.png" />
												<br />
											</xsl:if>
											<xsl:if test="remindUntilCompleted = 1">
												<img alt="" src="file:icons/ribbon-blue-small.png" />
												<br />
											</xsl:if>
											<xsl:if test="remindUntilCompleted = 2">
												<img alt="" src="file:icons/ribbon-red-small.png" />
												<br />
											</xsl:if>
										</td>

										<td valign='top'>
											<b>
												<xsl:choose>
													<xsl:when test="(priority = 'I')">
														<span style="color: red;">
															<xsl:value-of select="summary" />
														</span>
													</xsl:when>
													<xsl:otherwise>
														<xsl:value-of select="summary" />
													</xsl:otherwise>
												</xsl:choose>
											</b>
										</td>
									</tr>

									<tr>
										<td valign='top' align='center' style="width: 5%;">
											<xsl:if test="notes != ''">
												<img alt="" src="file:icons/notes.png" />
												<br />
											</xsl:if>
										</td>
										<td valign='top'>
											<xsl:if test="notes != ''">
												<xsl:value-of select="notes" />
											</xsl:if>
										</td>
									</tr>

									<tr>
										<td valign='top' align='center' style="width: 5%;">
											<xsl:if test="url != ''">
												<img alt="" src="file:icons/@.png" />
											</xsl:if>
										</td>
										<td valign='top'>
											<xsl:if test="url != ''">
												<html>
													<a href="{url}"><xsl:value-of select="url"/></a>
												</html>
											</xsl:if>
										</td>
									</tr>

									<tr>
										<td valign='top' align='center' style="width: 5%;">
											<xsl:if test="location != ''">
												<img alt="" src="file:icons/location.png" />
											</xsl:if>
										</td>
										<td valign='top'>
											<xsl:if test="location != ''">
												<a href="http://maps.google.com/maps?q={location}"><xsl:value-of select="location"/></a>
											</xsl:if>
										</td>
									</tr>


									<tr>
										<td valign='top' align='center' style="width: 5%;">
											<xsl:if test="categories != ''">
												<img   alt="" src="file:icons/category.png"/>
												<br/>
											</xsl:if>
										</td>
										<td valign='top' >
											<xsl:if test="categories != ''">
												<xsl:value-of select="categories"/>
											</xsl:if>
										</td>
									</tr>


								</table>

							</td>

						</tr>
						<tr>
							<td colspan="2">
								<hr />
							</td>
						</tr>
					</xsl:for-each>
				</table>	<!-- todays reminders -->

				<br />
				<br />

				<table border="0" style="width: 100%;"> <!-- upcoming reminders -->
					<tr bgcolor="#F0F0F0">
						<th style="width: 10%;">
							<xsl:value-of select="general/locale/date" />
						</th>
						<th>
							<xsl:value-of select="general/locale/upcomings" /> &#160; <xsl:value-of select="general/locale/reminders" />
						</th>
					</tr>

					<xsl:for-each select="general/reminders/upcoming">
						<tr>
							<td valign='top'>
								<b>
									<xsl:value-of select="date" />
									<br />
									<xsl:value-of select="date_shortDay" />&#160; <xsl:value-of select="date_time" />
								</b>
								<xsl:if test="endDate_ref &gt; 0">
									<br />
									<br />
									<xsl:value-of select="endDate" />
									<br />
									<xsl:value-of select="endDate_shortDay" />&#160; <xsl:value-of select="endDate_time" />
								</xsl:if>
							</td>

							<td valign='top' align='center'>
								<table border="0" style="width: 100%;" valign='top'>
									<tr>
										<td valign='top' align='center' style="width: 5%;"></td>
										<td valign='top'>
											<xsl:if test="completedDate_ref &gt; 0">
												<i>Completed: <xsl:value-of select="completedDate" /></i>
											</xsl:if>
										</td>
									</tr>

									<tr>
										<td valign='center' align='center' style="width: 5%;">
											<xsl:if test="calDAVid != ''">
												<span><img align="bottom" alt="" src="file:icons/iCal.png" style="vertical-align:bottom"/>
												<xsl:value-of select="calDAVid"/></span>
												<br />
											</xsl:if>

											<xsl:if test="messageID = 'M'">
												<img alt="" src="file:icons/mail.png" />
												<br />
											</xsl:if>
											<xsl:if test="remindUntilCompleted = 1">
												<img alt="" src="file:icons/ribbon-blue-small.png" />
												<br />
											</xsl:if>
											<xsl:if test="remindUntilCompleted = 2">
												<img alt="" src="file:icons/ribbon-red-small.png" />
												<br />
											</xsl:if>
										</td>

										<td valign='top'>
											<b>
												<xsl:choose>
													<xsl:when test="(priority = 'I')">
														<span style="color: red;">
															<xsl:value-of select="summary" />
														</span>
													</xsl:when>
													<xsl:otherwise>
														<xsl:value-of select="summary" />
													</xsl:otherwise>
												</xsl:choose>
											</b>
										</td>
									</tr>

									<tr>
										<td valign='top' align='center' style="width: 5%;">
											<xsl:if test="notes != ''">
												<img alt="" src="file:icons/notes.png" />
												<br />
											</xsl:if>
										</td>
										<td valign='top'>
											<xsl:if test="notes != ''">
												<xsl:value-of select="notes" />
											</xsl:if>
										</td>
									</tr>

									<tr>
										<td valign='top' align='center' style="width: 5%;">
											<xsl:if test="url != ''">
												<img alt="" src="file:icons/@.png" />
											</xsl:if>
										</td>
										<td valign='top'>
											<xsl:if test="url != ''">
												<html>
													<a href="{url}"><xsl:value-of select="url"/></a>
												</html>
											</xsl:if>
										</td>
									</tr>

									<tr>
										<td valign='top' align='center' style="width: 5%;">
											<xsl:if test="location != ''">
												<img alt="" src="file:icons/location.png" />
											</xsl:if>
										</td>
										<td valign='top'>
											<xsl:if test="location != ''">
												<a href="http://maps.google.com/maps?q={location}"><xsl:value-of select="location"/></a>
											</xsl:if>
										</td>
									</tr>

									<tr>
										<td valign='top' align='center' style="width: 5%;">
											<xsl:if test="categories != ''">
												<img   alt="" src="file:icons/category.png"/>
												<br/>
											</xsl:if>
										</td>
										<td valign='top' >
											<xsl:if test="categories != ''">
												<xsl:value-of select="categories"/>
											</xsl:if>
										</td>
									</tr>

								</table>

							</td>

						</tr>
						<tr>
							<td colspan="2">
								<hr />
							</td>
						</tr>
					</xsl:for-each>

				</table>  <!-- upcoming reminders -->

				<br />
				<br />


				<h3>
					ReminderFox -- <xsl:value-of select="general/locale/todos" />
				</h3>

				<table border="0" style="width: 100%;">  <!-- todos -->
					<tr bgcolor="#66CCFF">
						<th style="width: 10%;">
							<xsl:value-of select="general/locale/date" />
						</th>
						<th>
							<xsl:value-of select="general/locale/todos" />
						</th>
					</tr>

					<xsl:for-each select="general/reminders/todos">

						<tr>
							<td valign='top'>
								<b>
									<xsl:value-of select="date" />
									<br />
									<xsl:value-of select="date_shortDay" />&#160;&#160;	<xsl:value-of select="date_time" />
								</b>
								<xsl:if test="endDate_ref &gt; 0">
									<br />
									<br />
									<xsl:value-of select="endDate" />
									<br />
									<xsl:value-of select="endDate_shortDay" />&#160;&#160;	<xsl:value-of select="endDate_time" />
								</xsl:if>
							</td>

							<td valign='top' align='center'>
								<table border="0" style="width: 100%;" valign='top'>
									<tr>
										<td valign='top' align='center' style="width: 5%;"></td>
										<td valign='top'>
											<xsl:if test="completedDate_ref &gt; 0">
												<i>Completed: <xsl:value-of select="completedDate" /></i>
											</xsl:if>
										</td>
									</tr>

									<tr>
										<td valign='top' align='center' style="width: 5%;">

											<xsl:if test="calDAVid != ''">
												<span><img align="bottom" alt="" src="file:icons/iCal.png" style="vertical-align:bottom"/>
												<xsl:value-of select="calDAVid"/></span>
												<br />
											</xsl:if>

											<xsl:if test="messageID = 'M'">
												<img alt="" src="file:icons/mail.png" />
												<br />
											</xsl:if>
											<xsl:if test="remindUntilCompleted = 1">
												<img alt="" src="file:icons/ribbon-blue-small.png" />
												<br />
											</xsl:if>
											<xsl:if test="remindUntilCompleted = 2">
												<img alt="" src="file:icons/ribbon-red-small.png" />
												<br />
											</xsl:if>
										</td>

										<td valign='top'>
											<b>
												<xsl:choose>
													<xsl:when test="(priority = 'I')">
														<span style="color: red;">
															<xsl:value-of select="summary" />
														</span>
													</xsl:when>
													<xsl:otherwise>
														<xsl:value-of select="summary" />
													</xsl:otherwise>
												</xsl:choose>
											</b>
										</td>
									</tr>

									<tr>
										<td valign='top' align='center' style="width: 5%;">
											<xsl:if test="notes != ''">
												<img alt="" src="file:icons/notes.png" />
												<br />
											</xsl:if>
										</td>
										<td valign='top'>
											<xsl:if test="notes != ''">
												<xsl:value-of select="notes" />
											</xsl:if>
										</td>
									</tr>

									<tr>
										<td valign='top' align='center' style="width: 5%;">
											<xsl:if test="url != ''">
												<img alt="" src="file:icons/@.png" />
											</xsl:if>
										</td>
										<td valign='top'>
											<xsl:if test="url != ''">
												<html>
													<a href="{url}"><xsl:value-of select="url"/></a>
												</html>
											</xsl:if>
										</td>
									</tr>

									<tr>
										<td valign='top' align='center' style="width: 5%;">
											<xsl:if test="location != ''">
												<img alt="" src="file:icons/location.png" />
											</xsl:if>
										</td>
										<td valign='top'>
											<xsl:if test="location != ''">
												<a href="http://maps.google.com/maps?q={location}"><xsl:value-of select="location"/></a>
											</xsl:if>
										</td>
									</tr>

									<tr>
										<td valign='top' align='center' style="width: 5%;">
											<xsl:if test="categories != ''">
												<img   alt="" src="file:icons/category.png"/>
												<br/>
											</xsl:if>
										</td>
										<td valign='top' >
											<xsl:if test="categories != ''">
												<xsl:value-of select="categories"/>
											</xsl:if>
										</td>
									</tr>


								</table>

							</td>

						</tr>
						<tr>
							<td colspan="2">
								<hr />
							</td>
						</tr>
					</xsl:for-each>

				</table>  <!-- todos -->


				<p>
					<small><xsl:value-of select="general/date" /> -- <xsl:value-of select="general/time" />(<xsl:value-of select="general/xlsName" />)</small>
				</p>

			</body>
		</html>
	</xsl:template>

</xsl:stylesheet>
