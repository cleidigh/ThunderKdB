let login_btn = document.getElementById("login_btn");
let search_form = document.getElementById("search_form");
let login_form = document.getElementById("login_form");
let email_text = document.getElementById("email");
let logout_btn = document.getElementById("logout_btn");
let user_data;
let myHeaders = {
    'Accept': 'application/json',
};
let url = '';
let user_name = document.getElementById("user_name");
let password = document.getElementById("password");
let remember_me = document.getElementById("remember_me");

onError = (e) => {
    console.error(e);
}
window.addEventListener('load', (event) => {
    const gettingStoredSettings = browser.storage.local.get();
    gettingStoredSettings.then(updateUI, onError);
    let email_action = document.querySelectorAll(".email-btn");
    let comment_action = document.querySelectorAll(".comment-btn");
    for (let i = 0; i < email_action.length; i++) {
        email_action[i].addEventListener('click', function (event) {
            export_email(email_action[i])
        });
        comment_action[i].addEventListener('click', function (event) {
            export_comment(comment_action[i])
        });
    }

});

//login authentication
login_btn.onclick = () => {
    if (user_name.value.trim() == "") {
        alert("UserName cannot be empty..");
        user_name.focus();
    } else if (password.value.trim() == "") {
        alert("Password cannot be empty..");
        password.focus();
    } else {
        let authentication_data = {
            "username": user_name.value.trim(),
            "password": password.value.trim(),
            "isWithUserData": 0
        }
        url = "https://api.kundenmeister.com/v13/auth/user";
        fetch(url, {
            method: "POST",
            headers: myHeaders,
            body: JSON.stringify(authentication_data)
        }).then((response) => {
            return response.json();
        }).then((result) => {
            if (result.userId) {
                user_data = result;
                if (remember_me.checked) {
                    const gettingStoredSettings = browser.storage.local.get();
                    gettingStoredSettings.then(checkCredentialsExist, onError);
                } else {
                    browser.storage.local.set({
                        authCredentials: {}
                    });
                }
                myHeaders['token'] = result.accessToken;
                login_form.style.display = "none";
                search_form.style.display = "block";
                email_text.value = "";
                document.getElementById("email_list").style.display = "none";
                email_text.value = "";
            } else {
                alert(result.message);
            }
        }).catch(onError);
    }
}

//key storing in local system
checkCredentialsExist = (restoredSettings) => {
    browser.storage.local.set({
        authCredentials: {
            token: user_data.accessToken,
            userId: user_data.userId
        }
    });

}

//logout
logout_btn.onclick = () => {
    browser.storage.local.set({
        authCredentials: {}
    }).then(function () {
        user_name.value = "";
        password.value = "";
        login_form.style.display = "block";
        search_form.style.display = "none";
    });
}
updateUI = (restoredSettings) => {
    if (restoredSettings.authCredentials && restoredSettings.authCredentials.token) {
        myHeaders['token'] = restoredSettings.authCredentials.token;
        document.getElementById("login_form").style.display = "none";
        document.getElementById("search_form").style.display = "block";
        user_data = restoredSettings.authCredentials;
    } else {
        document.getElementById("login_form").style.display = "block ";
    }
}
//contact keyword search
email_text.onkeyup = () => {
    if (email_text.value.trim() != '') {
        let keyword = email_text.value.trim().split(" ");
        let search_query = 'where=[';
        if (keyword.length > 1) {
            for (let i = 0; i < keyword.length; i++) {
                if (i == 0) {
                    search_query += '[{"property":"Customer.firstName","operator":"LIKE","value":"' + keyword[i] + '"},"and",{"property":"Customer.name","operator":"LIKE","value":"%' + keyword[i + 1] + '%"}]';
                } else {
                    search_query += ',"or",[{"property":"Customer.firstName","operator":"LIKE","value":"' + keyword[i] + '"},"and",{"property":"Customer.name","operator":"LIKE","value":"%' + keyword[i - 1] + '%"}]';
                }
            }
            search_query += ',"or",{"property":"Customer.firm","operator":"LIKE","value":"%' + email_text.value + '%"}';
        } else {
            search_query += '{"property":"Customer.name","operator":"LIKE","value":"%' + email_text.value + '%"},"or",{"property":"Customer.firstName","operator":"LIKE","value":"%' + email_text.value + '%"},"or",{"property":"Customer.firm","operator":"LIKE","value":"%' + email_text.value + '%"}';
        }

        search_query += ']';
        let url = 'https://api.kundenmeister.com/v13/model/Customer?' + search_query + '&select=["Customer.id","Customer.mail","Customer.firm","Customer.name","Customer.street","Customer.city","Customer.postalCode"]';
        // console.log(url);
        fetch(url, {
            method: "GET",
            headers: myHeaders,
        }).then((response) => {
            return response.json();
        }).then((result) => {
            // let append_text = '<li class="custom-email-list-item">No such Customer available..</li>';
            let child = document.querySelectorAll("li");
            let child_div = document.querySelectorAll(".custom-email-list-item");
            let child_action = document.querySelectorAll(".save-actions");
            let email_action = document.querySelectorAll(".email-btn");
            let comment_action = document.querySelectorAll(".comment-btn");

            for (let i = 0; i < child.length; i++) {
                child_div[i].innerHTML = "";
                child[i].style.display = "none";
                child_div[i].id = "";
            }
            if (result && result.length > 0) {
                let i = 0;
                while (result.length > i) {
                    child_div[i].innerHTML = '<div class="company-text">' + result[i]['Customer.firm'] + '</div><div class="name-text">' + result[i]['Customer.name'] + '</div><div class="email-text">' + result[i]['Customer.mail'] + '</div><div class="location-text">' + result[i]['Customer.street'] + ' ' + result[i]['Customer.city'] + '</div>';
                    child[i].style.display = "block";
                    child_action[i].style.display = "inline-block";
                    email_action[i].id = "email_" + result[i]['Customer.id'];
                    comment_action[i].id = "comment_" + result[i]['Customer.id'];
                    i++;
                }
            } else {
                child_div[0].innerHTML = 'No such Customer available..';
                child_action[0].style.display = "none";
                child[0].style.display = "block";
            }
            document.getElementById("email_list").style.display = "block";
        }).catch(onError);
    } else {
        document.getElementById("email_list").style.display = "none";
    }
};

//export emails to KundenMeister Email
export_email = (email_obj) => {
    let customer_id_arr = email_obj.id.split('_');
    browser.tabs.query({
        mailTab: true
    }).then(tabs => {
        let tabId = tabs[0].id;
        browser.mailTabs.getSelectedMessages(tabId).then((MessageList) => {
            let i = 0;
            let messageListItems = MessageList.messages;
            if (messageListItems.length > 0) {
                while (messageListItems.length > i) {
                    let messageId = messageListItems[i].id;
                    browser.messages.getFull(messageId).then((MessagePart) => {
                        let bodyText = "";
                        if (MessagePart.parts[0].parts) {
                            bodyText = MessagePart.parts[0].parts[0].body;
                        } else {
                            bodyText = MessagePart.parts[0].body;
                        }
                        let emailObject = {
                            "Mail.from": MessagePart.headers.from.toString(),
                            "Mail.to": MessagePart.headers['delivered-to'].toString(),
                            "Mail.customerId": customer_id_arr[1],
                            "Mail.subject": MessagePart.headers.subject.toString(),
                            "Mail.text": bodyText.toString(),
                            "Mail.userId": user_data.userId
                        };
                        //console.log(emailObject);
                        url = "https://api.kundenmeister.com/v13/model/Mail"
                        fetch(url, {
                            method: "POST",
                            headers: myHeaders,
                            body: JSON.stringify(emailObject)
                        }).then((response) => {
                            return response.json();
                        }).then((result) => {
                            //alert(result);
                            //console.log(result);
                        }).catch(onError);
                    }).catch(onError);
                    i++;
                }
                browser.notifications.create({
                    "type": "basic",
                    "title": "Email Export",
                    "iconUrl": "icons/Kundenmeister.png",
                    "message": "Emails exported successfully to KundenMeister emails"
                });
                document.getElementById("email_list").style.display = "none";
                email_text.value = "";
                minimize();
            } else {
                alert("Please pick at least one email..");
            }
        });
    })
}

//export emails to KundenMeister Comments
export_comment = (comment_obj) => {
    let customer_id_arr = comment_obj.id.split('_');
    browser.tabs.query({
        mailTab: true
    }).then(tabs => {
        // console.log(tabs);
        let tabId = tabs[0].id;
        browser.mailTabs.getSelectedMessages(tabId).then((MessageList) => {
            let i = 0;
            let messageListItems = MessageList.messages;
            // console.log(messageListItems);
            if (messageListItems.length > 0) {
                while (messageListItems.length > i) {
                    let messageId = messageListItems[i].id;
                    browser.messages.getFull(messageId).then((MessagePart) => {
                        //console.log(MessagePart);
                        let bodyText = "";
                        if (MessagePart.parts[0].parts) {
                            bodyText = MessagePart.parts[0].parts[0].body;
                        } else {
                            bodyText = MessagePart.parts[0].body;
                        }
                        bodyText = "Subject: " + MessagePart.headers.subject.toString() + "\n" + bodyText;
                        let commentObject = {
                            "Comment.customerId": customer_id_arr[1],
                            "Comment.comment": bodyText.toString(),
                            "Comment.userId": user_data.userId
                        };
                        url = "https://api.kundenmeister.com/v13/model/Comment";
                        fetch(url, {
                            method: "POST",
                            headers: myHeaders,
                            body: JSON.stringify(commentObject)
                        }).then((response) => {
                            return response.json();
                        }).then((result) => {
                            //alert(result);
                            //console.log(result)
                        }).catch(onError);
                    }).catch(onError);
                    i++;
                }
                browser.notifications.create({
                    "type": "basic",
                    "title": "Email Export",
                    "iconUrl": "icons/Kundenmeister.png",
                    "message": "Emails exported successfully to KundenMeister comments"
                });
                document.getElementById("email_list").style.display = "none";
                email_text.value = "";
                minimize();
            } else {
                alert("Please pick at least one email..")
            }
        });
    });
}

//minimzing the popup
let getInfo = {'populate': false, "windowTypes": ["popup"]}
minimize = () => {
    browser.windows.getCurrent(getInfo).then(response => {
        let updateInfo = {state: "minimized"};
        browser.windows.update(response.id, updateInfo);
    });
}

