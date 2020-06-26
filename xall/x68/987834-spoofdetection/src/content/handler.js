import {Origin_Check} from "./origin_check.js";
import {TimeZoneCheck} from "./timezone_check.js";
import {API_Check} from "./api_check.js";
import {SPF_Check} from "./spf_check.js";
import {Blacklist_Check} from "./blacklist_check.js";
import {GetBlacklist} from "./blacklist_check.js";

let timeStamp = 1;
let api_value = 2;
let spf_value = 10;
let origin_value = 10;
let bl_value = 20;
let tz_value = 5;
let needed_score = 15;

function EVAL_MAIL(msgID, resultArray, fullMsg){
    let resulting_score = 0;

    let api_result = resultArray[0]; // score
    let spf_result = resultArray[1]; // pass / fail / no spf
    let origin_result = resultArray[2]; // pass / fail
    let blacklist_result = resultArray[3]; // pass / fail
    let timezone_result = resultArray[4]; // pass / fail / mapi

    browser.storage.local.get("Prefs").then((prefs) =>{
        let settings = prefs.Prefs;
        if(settings != null && settings != undefined){
            spf_value = parseInt(settings.spf_slider);
            api_value = parseInt(settings.api_slider);
            tz_value = parseInt(settings.tz_slider);
            bl_value = parseInt(settings.bl_slider);
            origin_value = parseInt(settings.origin_slider);
            needed_score = parseInt(settings.needed_score_slider);
        }

        if (api_result != null) {resulting_score = resulting_score + (parseFloat(api_result)*api_value);}

        if (spf_result == "fail") {
            resulting_score = resulting_score + spf_value;
        }

        if (origin_result == "fail") {
            resulting_score = resulting_score + origin_value;
        }

        if (blacklist_result == "fail") {
            resulting_score = resulting_score + bl_value;
        }

        if (timezone_result == "fail") {
            resulting_score = resulting_score + tz_value;
        }

        console.log(fullMsg);
        console.log("API: "+resultArray[0]+" | SPF: "+resultArray[1]+" | ORI: "+resultArray[2]+" | BL: "+resultArray[3]+" | TZ: "+resultArray[4]);
        console.log("Score is: "+resulting_score);
        if (resulting_score >= needed_score){
            browser.messages.update(msgID, { junk: true });
        }
    })
}

function BlacklistLoader(){
        // Get the Blacklist once here and not every time you want to check a mail
        // even when you dont get the newest version the old one should still be in the local storage
        // to avoid reloading the Blacklist every time that Thunderbird loses a connection or restarts we save a timestamp
        // to remember when we downloaded the last Blacklist and only when its more than an hour ago we load it again
        let time_now = Date.now();
        if ((timeStamp == 1) || ((time_now - timeStamp) >= 3600000)){
            GetBlacklist().then((blacklist) => {
                browser.storage.local.set({"Blacklist":blacklist});
            });
            timeStamp = time_now;
        }
}

async function Main() {
    // just to be sure that there is at all times a Blacklist in the storage
    if (browser.storage.local.get("Blacklist") == null){
        await BlacklistLoader();
    }

    // Check if the user does not want the external check
    let noAPI = false;
    browser.storage.local.get("Prefs").then((prefs) =>{
        let settings = prefs.Prefs;
        if(settings != null && settings != undefined) {
            noAPI = settings.localOnly;
        }
    });

    let messagePromise = browser.messages.query({"unread":true});
    await messagePromise.then( async (messageList) => {
        let listOfMails = messageList.messages;
        for await (let message of listOfMails) {
            let msgID = message.id;
            let fullMsgPromise = browser.messages.getFull(msgID);
            await fullMsgPromise.then( async (fullMsg) => {
                if (noAPI){
                    Promise.all([SPF_Check(fullMsg), Origin_Check(fullMsg), Blacklist_Check(fullMsg), TimeZoneCheck(fullMsg)]).then((resultarray) => {
                        console.log(resultarray);
                        // insert null as first item so that the eval function get the right sequence of results
                        resultarray.unshift(null);
                        EVAL_MAIL(msgID, resultarray, fullMsg);
                    }).catch(reason => {
                        console.log(reason)
                    });
                }else{
                    Promise.all([API_Check(message), SPF_Check(fullMsg), Origin_Check(fullMsg), Blacklist_Check(fullMsg), TimeZoneCheck(fullMsg)]).then((resultarray) => {
                        console.log(resultarray);
                        EVAL_MAIL(msgID, resultarray, fullMsg);
                    }).catch(reason => {
                        console.log(reason)
                    });
                }
            })
        }
    });
}

function Init(){
    BlacklistLoader();
    Main();
    let min_in_millisec = 60000;
    // the ID needs to be saved / existent to be able to be turned over to the clearInterval() function
    let blacklistIntervalID = window.setInterval(BlacklistLoader, (60 * min_in_millisec));
    let mainIntervalID = window.setInterval(Main, (3 * min_in_millisec));
}

// Should only be fired when Thunderbird starts
addEventListener("load", Init(), true);