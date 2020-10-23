// * Software:	Thunderbird Add-on "TRANSLITERUSSIAN"
// * Version:	0.4 beta
// * Date:		2020-10-21
// * Author:	Vlad Koutsenok (www.koutsenok.de)
// * File:		newmessage.js

var element = document.getElementById("transliterussian");
var button_newmessage = document.getElementById("button_newmessage");

var vorlastchar = "";

function createNewMessage(){
	browser.compose.beginNew({body: element.value});
}

function translate(e){
	
	var is2char = null;
	var flag = 1;
	var flag2 = 0;
	var text = element.value;
	var latinchar = e.data;
	var translatechar = "";
	var position = e.target.selectionStart;

	switch(latinchar) {
		
		// Cases [a, ja, ya]
		case "A":
			if(vorlastchar == String.fromCharCode(1081)){ 			// "j"
				translatechar = String.fromCharCode(1103);			// "я"
				is2char = true;
			} 
			else if(vorlastchar == String.fromCharCode(1049)){		// "J"
				translatechar = String.fromCharCode(1071);			// "Я"
				is2char = true;
			}
			else if(vorlastchar == String.fromCharCode(1099)){		// "y"
				translatechar = String.fromCharCode(1103);			// "я"
				is2char = true;
			} 
			else if(vorlastchar == String.fromCharCode(1067)){		// "Y"
				translatechar = String.fromCharCode(1071);			// "Я"
				is2char = true;
			} 
			else translatechar = String.fromCharCode(1040);			// "A"
			break;
		case "a":
			if(vorlastchar == String.fromCharCode(1081)){			// "j"
				translatechar = String.fromCharCode(1103);			// "я"
				is2char = true;
			} 
			else if(vorlastchar == String.fromCharCode(1049)){		// "J"
				translatechar = String.fromCharCode(1071);			// "Я"
				is2char = true;
			}
			else if(vorlastchar == String.fromCharCode(1099)){		// "y"
				translatechar = String.fromCharCode(1103);			// "я"
				is2char = true;
			} 
			else if(vorlastchar == String.fromCharCode(1067)){		// "Y"
				translatechar = String.fromCharCode(1071);			// "Я"
				is2char = true;
			} 			
			else translatechar = String.fromCharCode(1072);			// "a"
			break;
		// Cases [h, zh, ch, sh, shh]
		case "h":
			if(vorlastchar == String.fromCharCode(1079)){			// "c"
				translatechar = String.fromCharCode(1095);			// "ч"
				is2char = true;
			} 
			else if(vorlastchar == String.fromCharCode(1047)){		// "C"
				translatechar = String.fromCharCode(1063);			// "Ч"
				is2char = true;
			} 
			else if(vorlastchar == String.fromCharCode(1089)){		// "s"
				translatechar = String.fromCharCode(1096);			// "ш"
				is2char = true;
			} 
			else if(vorlastchar == String.fromCharCode(1057)){		// "S"
				translatechar = String.fromCharCode(1064);			// "Ш"
				is2char = true;
			} 
			else if(vorlastchar == String.fromCharCode(1094)){		// "z"
				translatechar = String.fromCharCode(1078);			// "ж"
				is2char = true;
			} 
			else if(vorlastchar == String.fromCharCode(1062)){		// "Z"
				translatechar = String.fromCharCode(1046);			// "Ж"
				is2char = true;
			}
			else if(vorlastchar == String.fromCharCode(1096)){		// "ш"
				translatechar = String.fromCharCode(1097);			// "щ"
				is2char = true;
			}
			else if(vorlastchar == String.fromCharCode(1064)){		// "Ш"
				translatechar = String.fromCharCode(1065);			// "Щ"
				is2char = true;
			}
			else translatechar = String.fromCharCode(1093);			// "x"
			break;
		case "H":
			if(vorlastchar == String.fromCharCode(1079)){			// "c"
				translatechar = String.fromCharCode(1095);			// "ч"
				is2char = true;
			} 
			else if(vorlastchar == String.fromCharCode(1047)){		// "C"
				translatechar = String.fromCharCode(1063);			// "Ч"
				is2char = true;
			} 
			else if(vorlastchar == String.fromCharCode(1089)){		// "s"
				translatechar = String.fromCharCode(1096);			// "ш"
				is2char = true;
			} 
			else if(vorlastchar == String.fromCharCode(1057)){		// "S"
				translatechar = String.fromCharCode(1064);			// "Ш"
				is2char = true;
			} 
			else if(vorlastchar == String.fromCharCode(1094)){		// "z"
				translatechar = String.fromCharCode(1078);			// "ж"
				is2char = true;
			} 
			else if(vorlastchar == String.fromCharCode(1062)){		// "Z"
				translatechar = String.fromCharCode(1046);			// "Ж"
				is2char = true;
			}
			else if(vorlastchar == String.fromCharCode(1096)){		// "ш"
				translatechar = String.fromCharCode(1097);			// "щ"
				is2char = true;
			}
			else if(vorlastchar == String.fromCharCode(1064)){		// "Ш"
				translatechar = String.fromCharCode(1065);			// "Щ"
				is2char = true;
			}
			else translatechar = String.fromCharCode(1061);			// "X"
			break;
		case "B":
			translatechar = String.fromCharCode(1041);
			break;
		case "b":
			translatechar = String.fromCharCode(1073);
			break;
		case "C":
			translatechar = String.fromCharCode(1047);
			break;			
		case "c":
			translatechar = String.fromCharCode(1079);
			break;
		case "D":
			translatechar = String.fromCharCode(1044);
			break;
		case "d":
			translatechar = String.fromCharCode(1076);
			break;
		// Cases [e, je]
		case "E":
			if(vorlastchar == String.fromCharCode(1081)){			// "j"
				translatechar = String.fromCharCode(1101);
				is2char = true;
			} 
			else if(vorlastchar == String.fromCharCode(1049)){		// "J"
				translatechar = String.fromCharCode(1069);
				is2char = true;
			} 
			else translatechar = String.fromCharCode(1045);
			break;			
		case "e":
			if(vorlastchar == String.fromCharCode(1081)){			// "j"
				translatechar = String.fromCharCode(1101);
				is2char = true;
			} 
			else if(vorlastchar == String.fromCharCode(1049)){		// "J"
				translatechar = String.fromCharCode(1069);
				is2char = true;
			} 
			else translatechar = String.fromCharCode(1077);
			break;
		case "F":
			translatechar = String.fromCharCode(1060);
			break;
		case "f":
			translatechar = String.fromCharCode(1092);
			break;
		case "G":
			translatechar = String.fromCharCode(1043);
			break;			
		case "g":
			translatechar = String.fromCharCode(1075);
			break;
		case "I":
			translatechar = String.fromCharCode(1048);
			break;
		case "i":
			translatechar = String.fromCharCode(1080);
			break;
		case "J":
			translatechar = String.fromCharCode(1049);
			break;			
		case "j":
			translatechar = String.fromCharCode(1081);
			break;
		case "K":
			translatechar = String.fromCharCode(1050);
			break;
		case "k":
			translatechar = String.fromCharCode(1082);
			break;
		case "L":
			translatechar = String.fromCharCode(1051);
			break;			
		case "l":
			translatechar = String.fromCharCode(1083);
			break;
		case "M":
			translatechar = String.fromCharCode(1052);
			break;
		case "m":
			translatechar = String.fromCharCode(1084);
			break;
		case "N":
			translatechar = String.fromCharCode(1053);
			break;			
		case "n":
			translatechar = String.fromCharCode(1085);
			break;
		// Cases [o, jo, yo]
		case "O":
			if(vorlastchar == String.fromCharCode(1081)){ 			// "j"
				translatechar = String.fromCharCode(1105);
				is2char = true;
			} 
			else if(vorlastchar == String.fromCharCode(1049)){		// "J"
				translatechar = String.fromCharCode(1025);
				is2char = true;
			}
			else if(vorlastchar == String.fromCharCode(1099)){		// "y"
				translatechar = String.fromCharCode(1105);
				is2char = true;
			} 
			else if(vorlastchar == String.fromCharCode(1067)){		// "Y"
				translatechar = String.fromCharCode(1025);	
				is2char = true;
			} 
			else translatechar = String.fromCharCode(1054);
			break;
		case "o":
			if(vorlastchar == String.fromCharCode(1081)){ 			// "j"
				translatechar = String.fromCharCode(1105);
				is2char = true;
			} 
			else if(vorlastchar == String.fromCharCode(1049)){		// "J"
				translatechar = String.fromCharCode(1025);
				is2char = true;
			}
			else if(vorlastchar == String.fromCharCode(1099)){		// "y"
				translatechar = String.fromCharCode(1105);
				is2char = true;
			} 
			else if(vorlastchar == String.fromCharCode(1067)){		// "Y"
				translatechar = String.fromCharCode(1025);	
				is2char = true;
			} 
			else translatechar = String.fromCharCode(1086);
			break;
		case "P":
			translatechar = String.fromCharCode(1055);
			break;			
		case "p":
			translatechar = String.fromCharCode(1087);
			break;
		case "R":
			translatechar = String.fromCharCode(1056);
			break;
		case "r":
			translatechar = String.fromCharCode(1088);
			break;
		case "S":
			translatechar = String.fromCharCode(1057);
			break;			
		case "s":
			translatechar = String.fromCharCode(1089);
			break;
		case "T":
			translatechar = String.fromCharCode(1058);
			break;
		case "t":
			translatechar = String.fromCharCode(1090);
			break;
		// Cases [u, ju, yu]
		case "U":
			if(vorlastchar == String.fromCharCode(1081)){ 			// "j"
				translatechar = String.fromCharCode(1102);
				is2char = true;
			} 
			else if(vorlastchar == String.fromCharCode(1049)){		// "J"
				translatechar = String.fromCharCode(1070);
				is2char = true;
			}
			else if(vorlastchar == String.fromCharCode(1099)){		// "y"
				translatechar = String.fromCharCode(1102);
				is2char = true;
			} 
			else if(vorlastchar == String.fromCharCode(1067)){		// "Y"
				translatechar = String.fromCharCode(1070);	
				is2char = true;
			} 
			else translatechar = String.fromCharCode(1059);
			break;			
		case "u":
			if(vorlastchar == String.fromCharCode(1081)){ 			// "j"
				translatechar = String.fromCharCode(1102);
				is2char = true;
			} 
			else if(vorlastchar == String.fromCharCode(1049)){		// "J"
				translatechar = String.fromCharCode(1070);
				is2char = true;
			}
			else if(vorlastchar == String.fromCharCode(1099)){		// "y"
				translatechar = String.fromCharCode(1102);
				is2char = true;
			} 
			else if(vorlastchar == String.fromCharCode(1067)){		// "Y"
				translatechar = String.fromCharCode(1070);	
				is2char = true;
			} 
			else translatechar = String.fromCharCode(1091);
			break;
		case "V":
			translatechar = String.fromCharCode(1042);
			break;
		case "v":
			translatechar = String.fromCharCode(1074);
			break;
		case "W":
			translatechar = String.fromCharCode(1065);
			break;			
		case "w":
			translatechar = String.fromCharCode(1097);
			break;
		case "X":
			translatechar = String.fromCharCode(1061);
			break;
		case "x":
			translatechar = String.fromCharCode(1093);
			break;
		case "Y":
			translatechar = String.fromCharCode(1067);
			break;			
		case "y":
			translatechar = String.fromCharCode(1099);
			break;
		case "Z":
			translatechar = String.fromCharCode(1062);
			break;
		case "z":
			translatechar = String.fromCharCode(1094);
			break;
		case "Ä":
			translatechar = String.fromCharCode(1069);
			break;			
		case "ä":
			translatechar = String.fromCharCode(1101);
			break;
		case "Ö":
			translatechar = String.fromCharCode(1025);
			break;
		case "ö":
			translatechar = String.fromCharCode(1105);
			break;
		case "Ü":
			translatechar = String.fromCharCode(1070);
			break;			
		case "ü":
			translatechar = String.fromCharCode(1102);
			break;
		case "#":
			if(vorlastchar == String.fromCharCode(1098)){ 			// "#"
				translatechar = String.fromCharCode(1066);
				is2char = true;
			}
			else translatechar = String.fromCharCode(1098);
			break;
		case "'":
			if(vorlastchar == String.fromCharCode(1100)){ 			// "'"
				translatechar = String.fromCharCode(1068);
				is2char = true;
			}
			else translatechar = String.fromCharCode(1100);
			break;
		default:
			if(latinchar == null){
				flag = 0;
			}
			else{
				translatechar = latinchar;
				flag = 1;
			}
	} 
	vorlastchar = translatechar;
	
	if(is2char){
		flag = 2;
		flag2 = 1;
	}
	
	element.value = text.substring(0, position - flag) + translatechar + text.substring(position);
	element.setSelectionRange(position - flag2, position - flag2);
	is2char = false;
}

element.addEventListener("input", translate);

button_newmessage.addEventListener("click", createNewMessage);