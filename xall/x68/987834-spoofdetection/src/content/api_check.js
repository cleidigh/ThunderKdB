export function API_Check(message) {
    let apiPromise = new Promise((resolve, reject) => {
        let messageID = message.id;
        let rawPromise = browser.messages.getRaw(messageID);
        rawPromise.then((rawMail) => {
            $.ajax({
                url: "https://spamcheck.postmarkapp.com/filter",
                type: "POST",
                dataType: "json",
                processData: false,
                data: JSON.stringify({"email": rawMail, "options": "short"}),
                headers: {
                    "Accept": "application/json",
                    "Content-Type": "application/json"
                },
                success: function (response) {
                    let score = response.score;
                    resolve(score);
                },
                error: function (response) {
                    reject(response);
                }
            })
        })
    });
    return apiPromise;
}