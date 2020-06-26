// This Scripts functionality is for checking the origin of the mail

// This function primarely looks the mailrecords up.
// Afterwards it pushes one record a time to the GetSingleARecord.
// The answers from GetSingleARecord will then be used by GetRDAPFromIPForServer.
// To avoid data mistakes the functions (GetMailRecord, GetSingleARecord and GetRDAPFromIPForServer) must never be mixed.,
// Notice that there is no filter for error codes. If an error is given like 404 not found it will be filtered in compareing
// and displayed as "no record was found"
// @aDomain is the domain you want to know the mail-record from (must be a full domain name like "gmx.net")
export async function GetMailRecord(aDomain){
    let mailRecordPromise = new Promise((resolve, reject) => {
        let mxRecordArray = [];
        let mailRecordUrl = "https://dns.google.com/resolve?name="+aDomain+"&type=mx";
        $.ajax({
            url: mailRecordUrl,
            type:'get',
            dataType: "json",
            async:false,
            success: function(response){
                let answerArray = response.Answer;
                for (let i in answerArray) {
                    let possibleAddress = answerArray[i];
                    let mxRecordValRaw = possibleAddress.data;
                    // API returns (in this example for gmx.net: "10 mx01.emig.gmx.net."
                    // for the other results we check the answer resulting in us cutting the last dot and the stuff infront of the space
                    mxRecordValRaw = mxRecordValRaw.slice(0, -1);
                    let mxRecordValSplit = mxRecordValRaw.split(" ");
                    let mxRecordVal = "";
                    // "If it is stupid and it works it aint stupid!"
                    // mail record for a domain is unlikely to be shorter than the domain name itself
                    if (mxRecordValSplit[0].length < aDomain.length){
                        mxRecordVal = mxRecordValSplit[1];
                    } else {
                        mxRecordVal = mxRecordValSplit[0];
                    }
                    mxRecordArray.push(mxRecordVal);
                }
                if (mxRecordArray.length == 0){
                    reject("No mxRecord found!");
                } else {
                    resolve(mxRecordArray);
                }
            },
            error: function (response){
                reject("Unexpected Error: "+response);
            }
        });
    }).catch(reason => {
        console.log(reason)
    });
    return mailRecordPromise;
}

// This function gets the hostingIP from given address and puts it in the listOfIPs Array
// @anAddressArray is the array of addresses you want to know the A-Record from
export async function GetSingleARecord(anAddressArray){
    let listOfIPs = [];
    let aRecordPromise = new Promise((resolve, reject) => {
        for (let x in anAddressArray) {
            let anAddress = anAddressArray[x];
            let aRecordURL = "https://dns.google/resolve?name="+anAddress+"&type=a";
            $.ajax({
                url: aRecordURL,
                type: 'get',
                dataType: "json",
                async: false,
                success: function (response) {
                    let answerArray = response.Answer;
                    for (let j in answerArray) {
                        let currentElem = answerArray[j];
                        let ip = currentElem.data;
                        listOfIPs.push(ip);
                    }
                    if (listOfIPs.length == 0){
                        reject("No A-Record found!");
                    } else {
                        resolve(listOfIPs);
                    }
                },
                error: function (response){
                    reject("Unexpected Error: "+response);
                }
            });
        }
    }).catch(reason => {
        console.log(reason)
    });
    return aRecordPromise;
}

// This function gets the RDAP info from given ip and filters (if returned) the country out of it.
// If the country tag is not provided like in answers from ARIN, the function is set to look for the
// url from which the answer is coming from to distinguish which continent is hosting the IP.
// The country or continent answer will be pushed into an array variable for further use.
// @arrayOfIPs is the Array of IPs you want to know the RDAP info from
export async function GetRDAPFromIP(arrayOfIPs){
    let countryCodeArray = [];
    let rdapPromise = new Promise((resolve, reject) => {
        for (let y in arrayOfIPs){
            let anIP = arrayOfIPs[y];
            let rdapApiUrl = "https://rdap.db.ripe.net/ip/"+anIP;
            $.ajax({
                url: rdapApiUrl,
                type: 'get',
                dataType: "json",
                async: false,
                success: function (response) {
                    let country = response.country;
                    if(country == undefined){
                        // Some servers outside of the EU are not displaying the country Tag for those we use the
                        // port43 answer to determine from which authority we got the answer
                        let responseURL = response.port43; // port43 : "whois.arin.net"
                        let responseURLSplit = responseURL.split("."); //[whois, arin, net]
                        let responseServerVal = responseURLSplit[1];
                        countryCodeArray.push(responseServerVal);
                    }else {
                        countryCodeArray.push(country);
                    }
                    if (countryCodeArray.length == 0){
                        reject("No Country could be found!");
                    } else {
                        resolve(countryCodeArray);
                    }
                },
                error: function (response){
                    reject("Unexpected Error: "+response);
                }
            });
        }
    }).catch(reason => {
        console.log(reason)
    });
    return rdapPromise;
}

function GetReceivedIPs(msg){
    let receivedPromise = new Promise((resolve, reject) => {
        let receivedArray = msg.headers.received;
        let receivedIPs = [];
        for (let row of receivedArray){
            if (row.includes("[")) {
                let senderInfo = row.split("[");
                let splitIPString = senderInfo[1].split("]");
                let receivedFromIP = splitIPString[0];
                // countermessure to avoid local IPs like 192.168.1.12 and 127.0.0.1
                let counterValSplit = receivedFromIP.split(".");
                let counterVal = counterValSplit[0];
                if (counterVal == "192" || counterVal == "127") {
                    let firstSenderIP = senderInfo[0].split("[");
                    if (!(firstSenderIP[1] == undefined)) {
                        let senderIPArray = firstSenderIP[1].split("]");
                        let senderIP = senderIPArray[0];
                        receivedIPs.push(senderIP);
                    }
                } else {
                    receivedIPs.push(receivedFromIP);
                }
            }
        }
        if (receivedIPs.length == 0){
            reject("No IPs could be found within the received-header!");
        } else {
            resolve(receivedIPs);
        }
    }).catch(reason => {
        console.log(reason)
    });
    return receivedPromise;
}


export async function Origin_Check(aMail){
    let origin_Promise = new Promise((resolve) => {
        let origin_Result = "";
        let sender = aMail.headers["from"]; //Testmann Tester <email@example.com>
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
        let hostingCountries = [];
        GetMailRecord(domainName).then((recordArray) =>{
            // In case that there is no mailrecord of that domain
            GetSingleARecord(recordArray).then((ipArray) => {
                GetRDAPFromIP(ipArray).then((countryCodeArray) =>{
                    hostingCountries = countryCodeArray;
                    countryCodeArray = [];
                    GetReceivedIPs(aMail).then((receivedIPs) => {
                        GetRDAPFromIP(receivedIPs).then((countryCodeArray) =>{
                            //we only want the last waypoint (if the sender used the website) and the second last waypoint (if he used a client)
                            let lastTwoWaypoints = [];
                            lastTwoWaypoints.push(countryCodeArray[countryCodeArray.length-1]);
                            lastTwoWaypoints.push(countryCodeArray[countryCodeArray.length-2]);

                            let found = hostingCountries.some(x=> lastTwoWaypoints.includes(x));
                            if (found){
                                origin_Result = "pass";
                            } else {
                                origin_Result = "fail";
                            }
                            resolve(origin_Result);
                        }).catch(reason => {
                            console.log(reason)
                        });
                    }).catch(reason => {
                        console.log(reason)
                    });
                }).catch(reason => {
                    console.log(reason)
                });
            }).catch(reason => {
                console.log(reason)
            });
        }).catch(reason => {
            console.log(reason)
        });
    });
    return origin_Promise;
}