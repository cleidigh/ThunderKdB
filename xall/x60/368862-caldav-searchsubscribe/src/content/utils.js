/* ***** BEGIN LICENSE BLOCK *****
 * Version: MPL 1.1/GPL 2.0/LGPL 2.1
 *
 * The contents of this file are subject to the Mozilla Public License Version
 * 1.1 (the "License"); you may not use this file except in compliance with
 * the License. You may obtain a copy of the License at
 * http://www.mozilla.org/MPL/
 *
 * Software distributed under the License is distributed on an "AS IS" basis,
 * WITHOUT WARRANTY OF ANY KIND, either express or implied. See the License
 * for the specific language governing rights and limitations under the
 * License.
 *
 * The Original Code is Sun Microsystems code.
 *
 * The Initial Developer of the Original Code is Sun Microsystems.
 * Portions created by the Initial Developer are Copyright (C) 2008
 * the Initial Developer. All Rights Reserved.
 *
 * Contributor(s):
 *   diesmo <partoche@yahoo.com>
 *
 * Alternatively, the contents of this file may be used under the terms of
 * either the GNU General Public License Version 2 or later (the "GPL"), or
 * the GNU Lesser General Public License Version 2.1 or later (the "LGPL"),
 * in which case the provisions of the GPL or the LGPL are applicable instead
 * of those above. If you wish to allow use of your version of this file only
 * under the terms of either the GPL or the LGPL, and not to allow others to
 * use your version of this file under the terms of the MPL, indicate your
 * decision by deleting the provisions above and replace them with the notice
 * and other provisions required by the GPL or the LGPL. If you do not delete
 * the provisions above, a recipient may use your version of this file under
 * the terms of any one of the MPL, the GPL or the LGPL.
 *
 * ***** END LICENSE BLOCK ***** */
 
function logIt(msg){
	//var tmpMsg = Array.join(arguments, " ");
	//Components.utils.reportError('CALDAVSEARCH - ' + tmpMsg);
	//cal.LOG('CALDAVSEARCH: '+tmpMsg);
}

function addTrailingSlash(str) {
    if(str.substr(-1) != '/') {
        return str + '/';
    }
    return str;
}

function removeTrailingSlash(str) {
    var res = str;
	while(res.substr(-1) == '/') {
        res = res.substring(0, res.length -1);
    }
    return res;
}

function getRandomColor() {
	const s_colors = ["#FFCCCC", "#FFCC99", "#FFFF99", "#FFFFCC", "#99FF99",
                      "#99FFFF", "#CCFFFF", "#CCCCFF", "#FFCCFF", "#FF6666",
                      "#FF9966", "#FFFF66", "#FFFF33", "#66FF99", "#33FFFF",
                      "#66FFFF", "#9999FF", "#FF99FF", "#FF0000", "#FF9900",
                      "#FFCC66", "#FFFF00", "#33FF33", "#66CCCC", "#33CCFF",
                      "#6666CC", "#CC66CC", "#CC0000", "#FF6600", "#FFCC33",
                      "#FFCC00", "#33CC00", "#00CCCC", "#3366FF", "#6633FF",
                      "#CC33CC", "#990000", "#CC6600", "#CC9933", "#999900",
                      "#009900", "#339999", "#3333FF", "#6600CC", "#993399",
                      "#660000", "#993300", "#996633", "#666600", "#006600",
                      "#336666", "#000099", "#333399", "#663366", "#330000",
                      "#663300", "#663333", "#333300", "#003300", "#003333",
                      "#000066", "#330099", "#330033"];
								  
	return s_colors[(new Date()).getUTCMilliseconds() % s_colors.length];
}
