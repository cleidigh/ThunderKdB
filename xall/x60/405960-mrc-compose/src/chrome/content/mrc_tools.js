
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
 * The Original Code is MRC Compose
 *
 * The Initial Developer of the Original Code is
 * Michel Renon (renon@mrc-consultant.net)
 * Portions created by the Initial Developer are Copyright (C) 2012
 * the Initial Developer. All Rights Reserved.
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



/*
 *
 * Javascript code for mrc_compose tools
 *
 *
 *
 *
 *
 */



var EXPORTED_SYMBOLS = ["mrcLog", "mrcLogError", "mrcPick"];



    /*
     * Utility to handle default values.
     * Used for simulating optional parameters in functions,
     * because they are available in Gecko 15.
     * From http://stackoverflow.com/a/894929
     */
function mrcPick(arg, def) {
    return (typeof arg !== "undefined" ? arg : def);
}

function mrcLogError(obj, context) {
    /*
        * Send information to the console.
        *
        * params :
        *   obj : text or exception
        *   context : text, (optionnal) some informationabout context of log
        */
    context = mrcPick(context, '');

    let message = "ERREUR MRC-COMPOSE : ";
    if (context != '')
        message += " : "+context+" : "

    if (obj.message) {
        Components.utils.reportError(message+obj.message);
    } else {
        Components.utils.reportError(message+obj);
    }
}

function mrcLog(obj, context) {
    /*
        * Send information to the console.
        *
        * params :
        *   obj : text, num, object or exception
        *   context : text, (optionnal) some information about context of log
        */
    // if (true) { // dev : show logs
    if (false) { // prod : no logs
        context = mrcPick(context, '');

        let message = "mrcCompose : ";
        if (context != '') {
            message += context+" : ";
        }
        if (message !== '') {
            console.log(message, obj);
        } else {
            console.log(obj);
        }
    }
}

