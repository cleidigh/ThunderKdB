/**
 * This package provides the main add-on functionality needed for
 * finding the best QR code version, processing event data and
 * generating QR code in tooltips.
 */
var lightningQRCode = {

	/* Some important functions need to reference a window's document */
	document: null,

	/* URI to CSS file */
	cssURI: Cc["@mozilla.org/network/io-service;1"].getService(Ci.nsIIOService)
		.newURI(__SCRIPT_URI_SPEC__ + "/../data/lightning-qrcode.css", null, null),

	/* Preferences */
	prefs: Cc["@mozilla.org/preferences-service;1"].getService(Ci.nsIPrefService)
		.getBranch("extensions.lightning-qrcode.").QueryInterface(Ci.nsIPrefBranch),
	logging: false,
	techinfo: false,
	copydelay: 0,
	copycolor: "#FF0000",
	padding: 4,
	usedesc: true,
	useorganizer: false,
	useattendees: false,
	usealarms: false,
	observer: {
		observe: function(subject, topic, data) {
			if (topic != "nsPref:changed")
				return;
			switch(data) {
			case "logging":
				lightningQRCode.logging = lightningQRCode.prefs.getBoolPref("logging");
				if (lightningQRCode.logging)
					lightningQRCode.log("Logging turned on.");
				else
					lightningQRCode.log("Logging turned off.", true);
				break;
			case "techinfo":
				lightningQRCode.techinfo = lightningQRCode.prefs.getBoolPref("techinfo");
				if (lightningQRCode.techinfo)
					lightningQRCode.log("Technical info will be displayed.");
				else
					lightningQRCode.log("Technical info will be hidden.");
				break;
			case "copydelay":
				lightningQRCode.copydelay = lightningQRCode.prefs.getIntPref("copydelay");
				lightningQRCode.log("Copy to clipboard delay set to "
									+ lightningQRCode.copydelay + " seconds.");
				break;
			case "copycolor":
				lightningQRCode.copycolor = lightningQRCode.prefs.getCharPref("copycolor");
				lightningQRCode.log("Clipboard copy notification color set to "
									+ lightningQRCode.copycolor + ".");
				break;
			case "padding":
				lightningQRCode.padding = lightningQRCode.prefs.getIntPref("padding");
				lightningQRCode.log("Image padding set to "
									+ lightningQRCode.padding + " pixel.");
				break;
			case "usedesc":
				lightningQRCode.usedesc = lightningQRCode.prefs.getBoolPref("usedesc");
				if (lightningQRCode.usedesc)
					lightningQRCode.log("Event description will be used for QR code generation.");
				else
					lightningQRCode.log("Event description will not be used for QR code generation.");
				break;
			case "useorganizer":
				lightningQRCode.useorganizer = lightningQRCode.prefs.getBoolPref("useorganizer");
				if (lightningQRCode.useorganizer)
					lightningQRCode.log("Organizer field will be used for QR code generation.");
				else
					lightningQRCode.log("Organizer field will not be used for QR code generation.");
				break;
			case "useattendees":
				lightningQRCode.useattendees = lightningQRCode.prefs.getBoolPref("useattendees");
				if (lightningQRCode.useattendees)
					lightningQRCode.log("Attendees fields will be used for QR code generation.");
				else
					lightningQRCode.log("Attendees fields will not be used for QR code generation.");
				break;
			case "usealarms":
				lightningQRCode.usealarms = lightningQRCode.prefs.getBoolPref("usealarms");
				if (lightningQRCode.usealarms)
					lightningQRCode.log("Alarm fields will be used for QR code generation.");
				else
					lightningQRCode.log("Alarm fields will not be used for QR code generation.");
				break;
			}
		}
	},


	/**
	 * QR Code maximum data capacity for each version, taken from
	 * http://www.denso-wave.com/qrcode/vertable1-e.html. Each table
	 * entry has the following layout:
	 *
	 * Version number, number of modules (e.g. 21 => 21x21 modules),
	 * then 4 lines for each ECC level (L, M, Q, H), where each column
	 * contains the maximum amount of Data bits, Numeric, Alphanumeric,
	 * Binary and Kanji.
	 */
	version_table_data: [
		1, 21,
		152, 41, 25, 17, 10,
		128, 34, 20, 14, 8,
		104, 27, 16, 11, 7,
		72, 17, 10, 7, 4,

		2, 25,
		272, 77, 47, 32, 20,
		224, 63, 38, 26, 16,
		176, 48, 29, 20, 12,
		128, 34, 20, 14, 8,

		3, 29,
		440, 127, 77, 53, 32,
		352, 101, 61, 42, 26,
		272, 77, 47, 32, 20,
		208, 58, 35, 24, 15,

		4, 33,
		640, 187, 114, 78, 48,
		512, 149, 90, 62, 38,
		384, 111, 67, 46, 28,
		288, 82, 50, 34, 21,

		5, 37,
		864, 255, 154, 106, 65,
		688, 202, 122, 84, 52,
		496, 144, 87, 60, 37,
		368, 106, 64, 44, 27,

		6, 41,
		1088, 322, 195, 134, 82,
		864, 255, 154, 106, 65,
		608, 178, 108, 74, 45,
		480, 139, 84, 58, 36,

		7, 45,
		1248, 370, 224, 154, 95,
		992, 293, 178, 122, 75,
		704, 207, 125, 86, 53,
		528, 154, 93, 64, 39,

		8, 49,
		1552, 461, 279, 192, 118,
		1232, 365, 221, 152, 93,
		880, 259, 157, 108, 66,
		688, 202, 122, 84, 52,

		9, 53,
		1856, 552, 335, 230, 141,
		1456, 432, 262, 180, 111,
		1056, 312, 189, 130, 80,
		800, 235, 143, 98, 60,

		10, 57,
		2192, 652, 395, 271, 167,
		1728, 513, 311, 213, 131,
		1232, 364, 221, 151, 93,
		976, 288, 174, 119, 74,

		11, 61,
		2592, 772, 468, 321, 198,
		2032, 604, 366, 251, 155,
		1440, 427, 259, 177, 109,
		1120, 331, 200, 137, 85,

		12, 65,
		2960, 883, 535, 367, 226,
		2320, 691, 419, 287, 177,
		1648, 489, 296, 203, 125,
		1264, 374, 227, 155, 96,

		13, 69,
		3424, 1022, 619, 425, 262,
		2672, 796, 483, 331, 204,
		1952, 580, 352, 241, 149,
		1440, 427, 259, 177, 109,

		14, 73,
		3688, 1101, 667, 458, 282,
		2920, 871, 528, 362, 223,
		2088, 621, 376, 258, 159,
		1576, 468, 283, 194, 120,

		15, 77,
		4184, 1250, 758, 520, 320,
		3320, 991, 600, 412, 254,
		2360, 703, 426, 292, 180,
		1784, 530, 321, 220, 136,

		16, 81,
		4712, 1408, 854, 586, 361,
		3624, 1082, 656, 450, 277,
		2600, 775, 470, 322, 198,
		2024, 602, 365, 250, 154,

		17, 85,
		5176, 1548, 938, 644, 397,
		4056, 1212, 734, 504, 310,
		2936, 876, 531, 364, 224,
		2264, 674, 408, 280, 173,

		18, 89,
		5768, 1725, 1046, 718, 442,
		4504, 1346, 816, 560, 345,
		3176, 948, 574, 394, 243,
		2504, 746, 452, 310, 191,

		19, 93,
		6360, 1903, 1153, 792, 488,
		5016, 1500, 909, 624, 384,
		3560, 1063, 644, 442, 272,
		2728, 813, 493, 338, 208,

		20, 97,
		6888, 2061, 1249, 858, 528,
		5352, 1600, 970, 666, 410,
		3880, 1159, 702, 482, 297,
		3080, 919, 557, 382, 235,

		21, 101,
		7456, 2232, 1352, 929, 572,
		5712, 1708, 1035, 711, 438,
		4096, 1224, 742, 509, 314,
		3248, 969, 587, 403, 248,

		22, 105,
		8048, 2409, 1460, 1003, 618,
		6256, 1872, 1134, 779, 480,
		4544, 1358, 823, 565, 348,
		3536, 1056, 640, 439, 270,

		23, 109,
		8752, 2620, 1588, 1091, 672,
		6880, 2059, 1248, 857, 528,
		4912, 1468, 890, 611, 376,
		3712, 1108, 672, 461, 284,

		24, 113,
		9392, 2812, 1704, 1171, 721,
		7312, 2188, 1326, 911, 561,
		5312, 1588, 963, 661, 407,
		4112, 1228, 744, 511, 315,

		25, 117,
		10208, 3057, 1853, 1273, 784,
		8000, 2395, 1451, 997, 614,
		5744, 1718, 1041, 715, 440,
		4304, 1286, 779, 535, 330,

		26, 121,
		10960, 3283, 1990, 1367, 842,
		8496, 2544, 1542, 1059, 652,
		6032, 1804, 1094, 751, 462,
		4768, 1425, 864, 593, 365,

		27, 125,
		11744, 3514, 2132, 1465, 902,
		9024, 2701, 1637, 1125, 692,
		6464, 1933, 1172, 805, 496,
		5024, 1501, 910, 625, 385,

		28, 129,
		12248, 3669, 2223, 1528, 940,
		9544, 2857, 1732, 1190, 732,
		6968, 2085, 1263, 868, 534,
		5288, 1581, 958, 658, 405,

		29, 133,
		13048, 3909, 2369, 1628, 1002,
		10136, 3035, 1839, 1264, 778,
		7288, 2181, 1322, 908, 559,
		5608, 1677, 1016, 698, 430,

		30, 137,
		13880, 4158, 2520, 1732, 1066,
		10984, 3289, 1994, 1370, 843,
		7880, 2358, 1429, 982, 604,
		5960, 1782, 1080, 742, 457,

		31, 141,
		14744, 4417, 2677, 1840, 1132,
		11640, 3486, 2113, 1452, 894,
		8264, 2473, 1499, 1030, 634,
		6344, 1897, 1150, 790, 486,

		32, 145,
		15640, 4686, 2840, 1952, 1201,
		12328, 3693, 2238, 1538, 947,
		8920, 2670, 1618, 1112, 684,
		6760, 2022, 1226, 842, 518,

		33, 149,
		16568, 4965, 3009, 2068, 1273,
		13048, 3909, 2369, 1628, 1002,
		9368, 2805, 1700, 1168, 719,
		7208, 2157, 1307, 898, 553,

		34, 153,
		17528, 5253, 3183, 2188, 1347,
		13800, 4134, 2506, 1722, 1060,
		9848, 2949, 1787, 1228, 756,
		7688, 2301, 1394, 958, 590,

		35, 157,
		18448, 5529, 3351, 2303, 1417,
		14496, 4343, 2632, 1809, 1113,
		10288, 3081, 1867, 1283, 790,
		7888, 2361, 1431, 983, 605,

		36, 161,
		19472, 5836, 3537, 2431, 1496,
		15312, 4588, 2780, 1911, 1176,
		10832, 3244, 1966, 1351, 832,
		8432, 2524, 1530, 1051, 647,

		37, 165,
		20528, 6153, 3729, 2563, 1577,
		15936, 4775, 2894, 1989, 1224,
		11408, 3417, 2071, 1423, 876,
		8768, 2625, 1591, 1093, 673,

		38, 169,
		21616, 6479, 3927, 2699, 1661,
		16816, 5039, 3054, 2099, 1292,
		12016, 3599, 2181, 1499, 923,
		9136, 2735, 1658, 1139, 701,

		39, 173,
		22496, 6743, 4087, 2809, 1729,
		17728, 5313, 3220, 2213, 1362,
		12656, 3791, 2298, 1579, 972,
		9776, 2927, 1774, 1219, 750,

		40, 177,
		23648, 7089, 4296, 2953, 1817,
		18672, 5596, 3391, 2331, 1435,
		13328, 3993, 2420, 1663, 1024,
		10208, 3057, 1852, 1273, 784
	],

	/* available error correction levels, from lowest to highest */
	ecLevels: ['L', 'M', 'Q', 'H'],

	/* available data types in the exact order they appear in the table */
	dataTypes: ['data bits', 'numeric', 'alphanumeric', 'binary', 'kanji'],

	/* Check whether version is known and valid. */
	isValidVersion: function(version) {
		return (version > 0 && version <= 40);
	},

	/* Check whether error correction level is valid. */
	isValidECLevel: function(ecLevel) {
		for (const ec of lightningQRCode.ecLevels) {
			if (ecLevel == ec)
				return true;
		}
		return false;
	},

	/* Check whether data type is valid. */
	isValidDataType: function(dataType) {
		for (const dt of lightningQRCode.dataTypes) {
			if (dataType == dt)
				return true;
		}
		return false;
	},

	/* Log message to console service */
	log: function(message, ignorepref) {
		ignorepref = ignorepref || false;
		if (! lightningQRCode.logging && ! ignorepref)
			return;
		Cc["@mozilla.org/consoleservice;1"].getService(Ci.nsIConsoleService)
			.logStringMessage("lightningQRCode: " + message);
	},

	/* Return a string representation of the QR code version data */
	versionDataToString: function(vd) {
		var out = '';
		out += 'Version: ' + vd['number'] + "\n";
		out += 'Modules: ' + vd['modules'] + 'x' + vd['modules'] + "\n";

		out += "Maximum capacities by EC Level:\n";
		out += "EC\tBits\tNumeric\tAlphanumeric\tBinary\tKanji\n";
		for (const ec of lightningQRCode.ecLevels) {
			out += ec + "\t";
			for (const dt of lightningQRCode.dataTypes) {
				out += vd[ec][dt] + "\t";
			}
			out += "\n";
		}
		return out;
	},

	/**
	 * Extract data for specified version from the table and make an
	 * easy-to-use object from it.
	 */
	getVersionData: function(number) {
		if (!lightningQRCode.isValidVersion(number))
			throw new Error('Version "' + number + '" unknown.');
		var version = new Object();
		var version_offset = (number - 1) * 22;
		version['number'] = number;
		version['modules'] = lightningQRCode.version_table_data[version_offset + 1];

		var ec_offset = version_offset + 2;
		for (const ec of lightningQRCode.ecLevels) {
			version[ec] = [];
			version[ec]['data bits'] = lightningQRCode.version_table_data[ec_offset];
			version[ec]['numeric'] = lightningQRCode.version_table_data[ec_offset + 1];
			version[ec]['alphanumeric'] = lightningQRCode.version_table_data[ec_offset + 2];
			version[ec]['binary'] = lightningQRCode.version_table_data[ec_offset + 3];
			version[ec]['kanji'] = lightningQRCode.version_table_data[ec_offset + 4];
			ec_offset += 5;
		}
		return version;
	},

	/**
	 * Find the smallest version the data fits in. If no error correction
	 * level is specified, use the lowest. Returns the QR code version or
	 * 0 if not found, meaning the data is too big and should be truncated
	 * or treated otherwise.
	 */
	findSmallestVersion: function(data, ecLevel, dataType) {
		dataType = dataType || 'binary';
		ecLevel = ecLevel || 'L';

		// for a bit of optimization, save time by looking at the biggest
		// QR code size first, in case the QR code does not fit into any
		// version
		var maxvd = lightningQRCode.getVersionData(40);
		if (data.length > maxvd[ecLevel][dataType]) {
			return 0;
		}

		// now simply start with the smallest version, there's not much
		// time wasted here
		for (var i = 1; i <= 40; i++) {
			var vd = lightningQRCode.getVersionData(i);
			if (data.length <= vd[ecLevel][dataType]) {
				return i;
			}
		}

		// we should never get this far, but for safety's sake
		return 0;
	},


	/* Takes an image data URL and copies it to the system clipboard,
	 * so that it can be pasted in another application */
	copyToClipboard: function(imagedata) {
		const io         = Cc["@mozilla.org/network/io-service;1"].getService(Ci.nsIIOService);
		const channel    = io.newChannel(imagedata, null, null);
		const input      = channel.open();
		const imgTools   = Cc["@mozilla.org/image/tools;1"].getService(Ci.imgITools);
        const threadManager = Cc["@mozilla.org/thread-manager;1"].getService();

        const callback = {
            onImageReady(container, status) {
                if (!container)
                    return;

                const wrapped = Cc["@mozilla.org/supports-interface-pointer;1"]
                      .createInstance(Ci.nsISupportsInterfacePointer);
                wrapped.data = container;

                const trans = Cc["@mozilla.org/widget/transferable;1"]
                      .createInstance(Ci.nsITransferable);
                trans.addDataFlavor(channel.contentType);
                trans.setTransferData(channel.contentType, wrapped, channel.contentLength);

		        const clipid = Ci.nsIClipboard;
		        const clip   = Cc["@mozilla.org/widget/clipboard;1"].getService(clipid);
		        clip.setData(trans, null, clipid.kGlobalClipboard);
            }
        };

		imgTools.decodeImageAsync(input, channel.contentType,
                                  callback, threadManager.currentThread);
	},


	/* Returns the best magnification factor to use for a given QR
	 * code version */
	findBestCellSize: function(version) {
		// default cellsize
		var cellsize = 4;
		if (lightningQRCode.isValidVersion(version)) {
			if (version >= 15)
				cellsize = 3;
			if (version >= 25)
				cellsize = 2;
		}
		return cellsize;
	},

	/**
	 * Generate the QR code as a GIF image using the error correction
	 * level specified. Automatically find the smallest version the QR
	 * code fits in. Cellsize and margin influence the total size of the
	 * image.
	 * Returns null if the QR code could not be generated, else an
	 * array containing the base64 image data as well as the image
	 * width and height.
	 */
	createQRCode: function(text, version, ecLevel, cellsize, margin) {
		var qr = qrcode(version, ecLevel);
		qr.addData(text);
		qr.make();
		return qr.createGif(cellsize, margin);
	},

	/**
	 * Create a VEVENT ICS string for an event, stripping off all
	 * unnecessary information that can or will not be used by barcode
	 * scanners.
	 */
	createEventIcsString: function(event) {
		if (lightningQRCode.logging) {
			/* log original string */
			var origvevent = event.icalComponent.toString();
			lightningQRCode.log('Original VEVENT data (' + origvevent.length + " chars):\n"
								+ origvevent);
		}
		event.removeAllAttachments();
		event.removeAllRelations();
		event.recurrenceId = null;
		event.setCategories(0, []);
		var wanted_properties = ['DTSTART', 'DTEND', 'SUMMARY', 'LOCATION'];
		if (lightningQRCode.usedesc)
			wanted_properties.push('DESCRIPTION');
		if (lightningQRCode.useorganizer) {
			/* keep organizer, but only the mail address */
			wanted_properties.push('ORGANIZER');
			if (event.organizer) {
				event.organizer.commonName = null;
				event.organizer.role = null;
				event.organizer.participationStatus = null;
				event.organizer.isOrganizer = true;
				event.organizer.rsvp = null;
			}
		} else {
			event.organizer = null;
		}
		if (lightningQRCode.useattendees) {
			/* keep attendees, but only their mail addresses */
			wanted_properties.push('ATTENDEE');

			var attendees = event.getAttendees({});
			for (const attendee of attendees) {
				attendee.commonName = null;
				attendee.role = null;
				attendee.participationStatus = null;
				attendee.rsvp = null;
			}
		} else {
			event.removeAllAttendees();
		}
		if (lightningQRCode.usealarms) {
			/* keep alarms, but only the really necessary fields */
			wanted_properties.push('VALARM');

			var alarms = event.getAlarms({});
			for (const alarm of alarms) {
				/* alarms should only be DISPLAYed, no AUDIO or EMAIL etc. */
				alarm.action = 'DISPLAY';
				alarm.description = '-';
				alarm.clearAttendees();
				alarm.clearAttachments();
				var propenum = alarm.propertyEnumerator;
				while (alarm.propertyEnumerator.hasMoreElements()) {
					alarm.deleteProperty(bagenum.getNext());
				}
			}
		} else {
			event.clearAlarms();
		}
		var bagenum = event.propertyEnumerator;
		while(bagenum.hasMoreElements()) {
			var iprop = bagenum.getNext().QueryInterface(Ci.nsIProperty);
			var del = true;
			for (const propname of wanted_properties) {
				/* do not delete wanted properties */
				if (iprop.name == propname)
					del = false;
				else  /* property will be deleted, further checks can be skipped */
					continue;

				/* rtrim whitespace from location, summary and description */
				if (iprop.name == 'DESCRIPTION'
					|| iprop.name == 'SUMMARY'
					|| iprop.name == 'LOCATION') {
					var value = iprop.value;
					if (value) {
						/* Reduce whitespace after enumeration bullets */
						value = value.replace(/•\s\s+/g, '•  ');
						value = value.replace(/\*\s\s+/g, '*  ');
						value = value.replace(/-\s\s+/g, '-  ');
						value = value.replace(/–\s\s+/g, '–  ');
						/* Replace tabs with 4 spaces */
						value = value.replace(/\t/g, '    ');
						/* Trim whitespace at the beginning and the end */
						value = value.replace(/^\s+/g, '');
						value = value.replace(/\s+$/g, '');
						event.setProperty(iprop.name, value);
					}
					/* property was matched, so skip further iterations */
					break;
				}
			}
			if (del == true) {
				event.deleteProperty(iprop.name);
			}
		}

		/* let calendar create an icalComponent string */
		var text = event.icalComponent.toString();

		/* Some additional fields still need removal after
		 * converting them to a string. They are neither needed
		 * nor used for import and waste valueable space for QR
		 * code generation. */
		var extrafields = ['X-MOZ-LASTACK', 'LAST-MODIFIED', 'DTSTAMP'];
		for (const ef of extrafields) {
			text = text.replace(new RegExp(ef + '[^\r\n]+\r\n+', 'g'), '');
		}
		lightningQRCode.log('Filtered VEVENT data ('
							+ text.length + " chars):\n" + text);
		return text;
	},

	/**
	 * Encode a javascript string to a UTF-8 bytestream. Algorithm see
	 * http://www.herongyang.com/Unicode/UTF-8-UTF-8-Encoding-Algorithm.html
	 */
	encodeUTF8: function(text) {
		var utftext = "";
		for (var n = 0; n < text.length; n++) {
			var c = text.charCodeAt(n);
			if (c < 128) {
				// chars with codes from 0 to 127 need 1 byte only
				utftext += String.fromCharCode(c);
			} else if (c > 127 && c < 2048) {
				// chars with codes 128 to 2047 need 2 bytes in UTF-8
				utftext += String.fromCharCode((c >> 6) | 192);
				utftext += String.fromCharCode((c & 63) | 128);
			} else if (c > 2047 && c < 65536) {
				// chars with codes from 2048 to 65535 need 3 bytes
				utftext += String.fromCharCode((c >> 12) | 224);
				utftext += String.fromCharCode(((c >> 6) & 63) | 128);
				utftext += String.fromCharCode((c & 63) | 128);
			} else {
				// the remaining cases will require 4 bytes
				utftext += String.fromCharCode((c >> 18) | 240);
				utftext += String.fromCharCode(((c >> 12) & 63) | 128);
				utftext += String.fromCharCode(((c >> 6) & 63) | 128);
				utftext += String.fromCharCode((c & 63) | 128);
			}
		}
		return utftext;
	},


	/**
	 * Get QR code for the event as an image in a vbox. If generating
	 * the QR code is not possible, use an explanatory message
	 * instead.
	 */
	getQRCodeForEvent: function(aItem) {
		if (aItem) {
			/* Stuff QR code image and information in a vbox */
			var vbox = lightningQRCode.document.createElement('vbox');
			vbox.setAttribute('class', 'tooltipBox');
			vbox.setAttribute('align', 'end');

			/* Clone the event and strip off all unnecessary properties */
			var vevent = lightningQRCode.createEventIcsString(aItem.clone());
			vevent = lightningQRCode.encodeUTF8(vevent);

			/* Find the smallest QR code version the vevent string fits in */
			var mode = 'binary';
			var ecLevel = 'L';
			version = lightningQRCode.findSmallestVersion(vevent, ecLevel, mode);
			if (version != 0) {
				/* Create QR code */
				lightningQRCode.log('Creating QRCode using version ' + version);
				try {
					var cellsize = lightningQRCode.findBestCellSize(version);
					var qrcodeImage = lightningQRCode
						.createQRCode(vevent, version, ecLevel, cellsize, lightningQRCode.padding);
					if (qrcodeImage) {
						/* Append the image */
						var image = lightningQRCode.document.createElement('image');
						image.setAttribute('id', 'lightning-qrcode-image');
						image.setAttribute('src', 'data:image/gif;base64,' + qrcodeImage[0]);
						/* Add 2 pixels to width and height to account for the 1px border */
						image.setAttribute('width', qrcodeImage[1] + 2);
						image.setAttribute('height', qrcodeImage[2] + 2);
						vbox.appendChild(image);

						/* Append QR code information */
						if(lightningQRCode.techinfo) {
							try {
								var versionData = lightningQRCode.getVersionData(version);
								var hbox = lightningQRCode.document.createElement('hbox');
								hbox.setAttribute('id', 'lightning-qrcode-info-hbox');
								var label = lightningQRCode.document.createElement('label');
								label.setAttribute('id', 'lightning-qrcode-info-label');
								label.textContent = 'v' + version + ' ['
									+ versionData['modules'] + 'x' + versionData['modules'] + '] '
									+ vevent.length + '/' + versionData[ecLevel][mode] + ' '
									+ _('bytes');
								vbox.appendChild(label);
							} catch(ex) {
								lightningQRCode.log('Error appending QR code information.');
							}
						}
					} else {
						throw("NULL was returned instead of the QR code image, "
							  + "and there was no other exception raised by the generator "
							  + "function. Everything should have worked according to the tests, "
							  + "so I really don't know how such a thing could happen.");
					}
				} catch(ex) {  /* something went wrong, no QR code was generated */
					lightningQRCode.log('Could not create QRCode, version=' + version
										+ ', data length: ' + vevent.length);
					lightningQRCode.log(ex);
					var hbox = lightningQRCode.document.createElement('hbox');
					hbox.setAttribute('id', 'lightning-qrcode-message-hbox');
					hbox.setAttribute('align', 'center');
					var label = lightningQRCode.document.createElement('label');
					label.textContent = _('error-generating-string');
					label.setAttribute('id', 'lightning-qrcode-error-label');
					hbox.appendChild(label);
					vbox.appendChild(hbox);
				}
			} else {          /* text too long to fit into QR code */
				lightningQRCode.log('Text too long to fit into QR code:' + vevent.length);
				var hbox = lightningQRCode.document.createElement('hbox');
				hbox.setAttribute('id', 'lightning-qrcode-message-hbox');
				hbox.setAttribute('align', 'center');
				var label = lightningQRCode.document.createElement('label');
				label.textContent = _('too-much-data');
				label.setAttribute('id', 'lightning-qrcode-too-much-data-label');
				hbox.appendChild(label);
				vbox.appendChild(hbox);
			}
			return vbox;
		} else {
			return null;
		}
	},


	/**
	 * Get the current image data from the QR code image src, or null if unavailable
	 */
	getQRCodeImageSrc: function() {
		try {
			return lightningQRCode.document.getElementById('lightning-qrcode-image').getAttribute('src');
		} catch(ex) {
			return null;
		}
	},


	/**
	 * Attach a copy timer to the tooltip. If it fires, copy the QR
	 * code image to the clipboard.
	 */
	attachCopyTimer: function(aToolTip) {
		/* Sanity check */
		if (aToolTip == null)
			return false;

		/* Cancel and delete any existing timer */
		if (lightningQRCode.copyTimer != undefined) {
			lightningQRCode.copyTimer.cancel();
			lightningQRCode.copyTimer = null;
		}

		/* Define the timer event. Copy to clipboard if the tooltip is showing or open */
		var timerEvent = {
			notify: function(timer) {
				if (aToolTip.state == 'open' || aToolTip.state == 'showing') {
					var imagedata = lightningQRCode.getQRCodeImageSrc();
					if (imagedata != null) {
						lightningQRCode.copyToClipboard(imagedata);
						var image = lightningQRCode.document.getElementById('lightning-qrcode-image');
						if (image != null)
							image.setAttribute('style', 'border-color:' + lightningQRCode.copycolor);
						lightningQRCode.log('QR Code image copied to the clipboard.');
					} else
						lightningQRCode.log('No image data to copy to the clipboard.');
				} else {
					lightningQRCode.log('Copy timer expired.');
				}
			}
		}

		/* Finally setup the timer */
		var timer = Cc['@mozilla.org/timer;1'].createInstance(Ci.nsITimer);
		timer.initWithCallback(timerEvent,
							   lightningQRCode.copydelay * 1000,
							   Ci.nsITimer.TYPE_ONE_SHOT);
		lightningQRCode.log('Activated copy timer, with '
							+ lightningQRCode.copydelay + ' second(s) delay.');

		/* Hold a reference to the timer, so it can't get deleted */
		lightningQRCode.copyTimer = timer;
	},


	/**
	 * We define our own showToolTip function here, which takes the
	 * original tooltip elements and puts the QR Code image at the
	 * left side. This way, we're less likely to run into troubles
	 * with the tooltip being cut off, and additionally we don't have
	 * to change the original tooltip elements.
	 */
	showToolTip: function(aToolTip, aItem) {
		if (lightningQRCode.document.defaultView === undefined) {
			lightningQRCode.log("defaultView is undefined!");
			return false;
		}

		/* call original function to generate the event data */
		if (! lightningQRCode.document.defaultView.calShowToolTip(aToolTip, aItem)) {
			lightningQRCode.log("No original showToolTip() to call!");
			return false;
		}

		/* do qrcode stuff */
		if (aItem) {
			var qrcodeBox;
			if (lightningQRCode.document.defaultView.cal.item.isEvent(aItem))
				qrcodeBox = lightningQRCode.getQRCodeForEvent(aItem);
			else
				return true;

			/* find original tooltip vbox */
			var calToolTipBox = null;
			if (qrcodeBox) {
				var tooltipElements = aToolTip.getElementsByClassName('tooltipBox');
				for (const el of tooltipElements) {
					if (el.tagName == 'vbox') {
						calToolTipBox = aToolTip.removeChild(el);
						break;
					}
				}
			}

			/* reorganize the layout so that QR code and event data are
			 * situated side by side */
			if (calToolTipBox) {
				var separator = lightningQRCode.document.createElement('separator');
				separator.setAttribute('class', 'thin');
				separator.orient = 'vertical';
				var commonBox = lightningQRCode.document.createElement('hbox');
				commonBox.setAttribute('id', 'commonToolTipBox');
				commonBox.appendChild(qrcodeBox);
				commonBox.appendChild(separator);
				commonBox.appendChild(calToolTipBox);
				aToolTip.appendChild(commonBox);
				aToolTip.maxWidth = 1000;

				/* Attach a copy timer to the tooltip */
				if (lightningQRCode.copydelay > 0)
					lightningQRCode.attachCopyTimer(aToolTip);

				return true;
			}
		}
		return false;
	},


	/**
	 * Replace lightning's showToolTip() function with our own.
	 * See <lightning_extension>/chrome/calendar/content/calendar/mouseoverPreviews.js
	 * for original function.
	 */
	main: function(win) {
		if (win.showToolTip != lightningQRCode.showToolTip) {
			/* Load translations; We need to do it here because for some
			 * strange reason it always returns 'en' in bootstrap.js
			 * startup() */
			lightningQRCode.log("Loading translations.");
			include("lib/l10n.js");
			l10n("lightning-qrcode.properties");

			/* Replace tooltip function */
			lightningQRCode.log("Replacing original showToolTip() function.");
			lightningQRCode.document = win.document;
			win.calShowToolTip = win.showToolTip;
			win.showToolTip = lightningQRCode.showToolTip;
		}
	}
}
