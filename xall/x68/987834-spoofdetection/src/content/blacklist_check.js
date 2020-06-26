
export async function GetBlacklist(){
    let getBLPromise = new Promise((resolve, reject) => {
        $.ajax({
            url: "https://talosintelligence.com/documents/ip-blacklist",
            type: 'get',
            async: false,
            success: function(response){
                let blArray = response.split("\n");
                resolve(blArray);
            },
            error: function(response){
                reject(response);
            }
        })
    }).catch(reason => {
        console.log(reason)
    });
    return getBLPromise;
}

function GetReceivedIPs(msg){
    let receivedPromise = new Promise((resolve, reject) => {
        let receivedArray = msg.headers.received;
        let receivedIPs = [];
        for (let row of receivedArray){
            if (row.includes("(")) {
                let senderInfo = row.split("(");
                let receivedFromIP = "";
                if (senderInfo[1].includes("[")) {
                    let splitIPString = senderInfo[1].split("[");
                    let ipValArray = splitIPString[1].split("]");
                    receivedFromIP = ipValArray[0];
                } else {
                    let splitIPString = senderInfo[1].split(")");
                    receivedFromIP = splitIPString[0];
                }
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

export function Blacklist_Check(mailMessage){
    let blacklist_Promise = new Promise((resolve) => {
        let blacklist_result = "";
        GetReceivedIPs(mailMessage).then((receivedIPs) => {
            browser.storage.local.get("Blacklist")
                .then((blacklist) => {
                    let blArray = Object.values(blacklist);
                    let found = receivedIPs.some(x=> blArray.includes(x));
                    if (found){
                        blacklist_result = "fail";
                    } else {
                        blacklist_result = "pass";
                    }
                    resolve(blacklist_result);
                })
        }).catch(reason => {
            console.log(reason)
        });
    });
    return blacklist_Promise;
}