import {GetMailRecord, GetRDAPFromIP, GetSingleARecord} from "./origin_check.js";

const ARIN = ["-1100", "-1000", "-0900", "-0800", "-0700", "-0600", "-0500", "-0400", "-0330", "-0300", "+1200"];
const APNIC = ["-1100", "-1000", "-0900", "+0400", "+0430", "+0500", "+0530", "+0545", "+0600", "+0630", "+0700", "+0800",
    "+0900", "+0930", "+1000", "+1030", "+1100", "+1200", "+1300"];
const RIPE = ["-0400", "-0300", "-0100", "+0000", "-0", "+0100", "+0200", "+0300", "+0330", "+0400", "+0500", "+0600", "+0700",
    "+0800", "+0900", "+1000", "+1100", "+1200"];
const AfriNIC = ["-0100", "+0000", "-0", "+0100", "+0200", "+0300", "+0400"];
const LACNIC = ["-0800", "-0700", "-0600", "-0500", "-0400", "-0300", "-0200"];

// check Date header for timezone (DATE IS FAKEABLE first two received headers are more reliable)
function GetTimeZoneArray(aMail) {
    let timezonePromise = new Promise((resolve, reject) => {
        let timezones = [];
        let date = new Date();
        let year = date.getFullYear();

        let receivedArray = aMail.headers.received;
        for (let row of receivedArray) {
            let avoidip6Split = row.split(year); // Be aware that messages from another year may result in error (Problematic scene: winter holidays)
            if (avoidip6Split[1] == undefined){
                avoidip6Split = row.split(year-1);
            }
            let lastPart = avoidip6Split[avoidip6Split.length-1];
            let timeSplitted = lastPart.split(":");
            let secAndZone = timeSplitted[2];
            let zone = secAndZone.substring(3);

            if (zone.length != 5) {
                let zonesplit = zone.split(" ");
                zone = zonesplit[0];
            }
            timezones.push(zone);
        }

        if (timezones.length == 0) {
            reject("No Timezone found");
        } else {
            resolve(timezones);
        }
    });

    return timezonePromise;

}

function NumberToZone(numberArray) {
    let switchPromise = new Promise((resolve) => {
        let returnArray = [];
        for (let number of numberArray) {
            if (ARIN.includes(number) && !(returnArray.includes("arin"))) {
                returnArray.push("arin");
            }

            if (APNIC.includes(number) && !(returnArray.includes("apnic"))) {
                returnArray.push("apnic");
            }

            if (RIPE.includes(number) && !(returnArray.includes("ripe"))) {
                returnArray.push("ripe");
            }

            if (LACNIC.includes(number) && !(returnArray.includes("lacnic"))) {
                returnArray.push("lacnic");
            }

            if (AfriNIC.includes(number) && !(returnArray.includes("afrinic"))) {
                returnArray.push("afrinic");
            }

        }
        resolve(returnArray);
    });
    return switchPromise
}

function CheckForRipe(arrayOfCountryCodes) {
    let matchuppromise = new Promise(resolve => {
        let returnArray = [];
        for (let cc of arrayOfCountryCodes) {
            if (cc == "arin") {
                returnArray.push("arin");
            } else if (cc == "apnic") {
                returnArray.push("apnic");
            } else if (cc == "lacnic") {
                returnArray.push("lacnic");
            } else if (cc == "afrinic") {
                returnArray.push("afrinic");
            } else {
                returnArray.push("ripe");
            }
        }
        resolve(returnArray);
    });
    return matchuppromise;
}

/**
 * @return {boolean}
 */
function Mapi_PreCheck(aMailMessage) {
    let receivedArray = aMailMessage.headers.received;
    let arrayLength = receivedArray.length;

    let startingwaypoint = receivedArray[arrayLength-1];
    if(startingwaypoint.includes("mapi")){
        return false;
    }else if (arrayLength >= 2){
        let secondwaypoint = receivedArray[arrayLength-2];
        return !secondwaypoint.includes("mapi");
    }else{
        return true;
    }
}

/*
    This check most likely needs to be changed... there is a problem with the outlook (former hotmail) mails because
    the servers are in the USA but the mail starting point can be somewhere else. This problem was put aside through
    the check for mapi (Messaging Application Programming Interface from Microsoft) all mails based on mapi will be
    ignored in the timezone check.
 */
export function TimeZoneCheck(aMessage) {
    let checkingPromise = new Promise((resolve, reject) => {
        let timezone_result;
        if (Mapi_PreCheck(aMessage)) {
            GetTimeZoneArray(aMessage).then((timezones) => {
                let lastTwoWaypoints = [];
                let zoneArray = [];
                lastTwoWaypoints.push(timezones[timezones.length - 2]);
                lastTwoWaypoints.push(timezones[timezones.length - 1]);
                NumberToZone(lastTwoWaypoints).then((timezoneArray) => {
                    zoneArray = timezoneArray;

                    let sender = aMessage.headers["from"]; //Testmann Tester <email@example.com>
                    let splitString = sender.toString().split("@");
                    let domainName = "";
                    //the following is to avoid this scenario: From: "Bugzilla@Mozilla" <bugzilla-daemon@mozilla.org>
                    if (splitString.length == 3){
                        domainName = splitString[2];
                    }else{
                        domainName = splitString[1]; // example.com
                    }
                    if (domainName.includes(">")) {
                        domainName = domainName.replace(">", "");
                    }
                    GetMailRecord(domainName).then((recordArray) => {
                        GetSingleARecord(recordArray).then((ipArray) => {
                            GetRDAPFromIP(ipArray).then((countryCodeArray) => {
                                CheckForRipe(countryCodeArray).then((advisedCCArray) => {
                                    let found = advisedCCArray.some(x => zoneArray.includes(x));
                                    if (found) {
                                        timezone_result = "pass";
                                    } else {
                                        timezone_result = "fail";
                                    }
                                    resolve(timezone_result);
                                })
                            })
                        })
                    })
                })

            })
        }else{
            resolve("mapi");
        }
    });
    return checkingPromise;
}