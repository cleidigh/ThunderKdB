let login_btn = document.getElementById("login_btn");
let search_form = document.getElementById("search_form");
let login_form = document.getElementById("login_form");
let email_text = document.getElementById("email");
let logout_btn = document.getElementById("logout_btn");
let prev_btn = document.getElementById("prev");
let next_btn = document.getElementById("next");
let opp_prev_btn = document.getElementById("opportunity_prev");
let opp_next_btn = document.getElementById("opportunity_next");
let user_data;
let myHeaders = {
    'Accept': 'application/json',
};
let url = '';
let user_name = document.getElementById("user_name");
let password = document.getElementById("password");
let remember_me = document.getElementById("remember_me");
let skip = 0;                   //project skip index
let limit = 10;                 //project limit
let opp_skip = 0;               //opportunity skip index
let opp_limit = 10;             //opportunity limit index
let const_limit = 10;           //constant limit

//Error handling
onError = (e) => {
    console.error(e);
    alert("Please try after sometime...");
    document.getElementById("loader").style.display = "none";
    // close();
}

window.addEventListener('load', (event) => {
    const gettingStoredSettings = browser.storage.local.get();
    gettingStoredSettings.then(updateUI, onError);
    let email_action = document.querySelectorAll(".email-btn");
    let comment_action = document.querySelectorAll(".comment-btn");
    let project_comment_action = document.querySelectorAll(".project-comment-btn");
    let opportunity_comment_action = document.querySelectorAll(".opportunity-comment-btn");
    for (let i = 0; i < email_action.length; i++) {
        email_action[i].addEventListener('click', function (event) {
            exportEmail(email_action[i])
        });
        comment_action[i].addEventListener('click', function (event) {
            exportComment(comment_action[i], 'contact')
        });
    }
    for (let i = 0; i < project_comment_action.length; i++) {
        project_comment_action[i].addEventListener('click', function (event) {
            exportComment(project_comment_action[i], 'project')
        });
        opportunity_comment_action[i].addEventListener('click', function (event) {
            exportComment(opportunity_comment_action[i], 'opportunity')
        });
    }
});

//login authentication
login_btn.onclick = () => {
    if (user_name.value.trim() === "") {
        alert("UserName cannot be empty..");
        user_name.focus();
    } else if (password.value.trim() === "") {
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
                document.getElementById("response_container").style.display = "none";
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

// setting locally stored access token for api call or displaying authentication panel
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

//keyword search
email_text.onkeyup = () => {
    skip = 0;
    limit = 10;
    opp_skip = 0;
    opp_limit = 10;
    if (email_text.value.trim() != '') {
        customerSearch();
        projectSearch(skip, const_limit);
        opportunitySearch(opp_skip, const_limit);
    } else {
        document.getElementById("response_container").style.display = "none";
    }
};

//Customer search function
customerSearch = () => {
    let keyword = email_text.value.trim().split(" ");
    let search_query = 'where=[';
    if (keyword.length > 1) {
        for (let i = 0; i < keyword.length; i++) {
            if (i == 0) {
                search_query += '[{"property":"Customer.firstName","operator":"LIKE","value":"%' + keyword[i] + '%"},"and",{"property":"Customer.name","operator":"LIKE","value":"%' + keyword[i + 1] + '%"}],"or",{"property":"Customer.firm","operator":"LIKE","value":"%' + keyword[i] + '%"}';
            } else {
                search_query += ',"or",[{"property":"Customer.firstName","operator":"LIKE","value":"%' + keyword[i] + '%"},"and",{"property":"Customer.name","operator":"LIKE","value":"%' + keyword[i - 1] + '%"}],"or",{"property":"Customer.firm","operator":"LIKE","value":"%' + keyword[i] + '%"}';
            }
        }
    } else {
        search_query += '{"property":"Customer.name","operator":"LIKE","value":"%' + email_text.value + '%"},"or",{"property":"Customer.firstName","operator":"LIKE","value":"%' + email_text.value + '%"},"or",{"property":"Customer.firm","operator":"LIKE","value":"%' + email_text.value + '%"}';
    }
    search_query += ']';
    let url = encodeURI('https://api.kundenmeister.com/v13/model/Customer?' + search_query + '&select=["Customer.id","Customer.mail","Customer.firm","Customer.name","Customer.street","Customer.city","Customer.postalCode"]');
    //console.log(url);
    fetch(url, {
        method: "GET",
        headers: myHeaders,
    }).then((response) => {
        return response.json();
    }).then((result) => {
        //console.log(result);
        let child = document.querySelectorAll(".contact-list-item");
        let child_div = document.querySelectorAll(".custom-email-list-item");
        let child_action = document.querySelectorAll(".contact-actions");
        let email_action = document.querySelectorAll(".email-btn");
        let comment_action = document.querySelectorAll(".comment-btn");

        for (let i = 0; i < child.length; i++) {                    // clearing exist datas in the list
            if (child_div[i]) {
                child_div[i].innerHTML = "";
                child[i].style.display = "none";
                child_div[i].id = "";
            }
        }
        document.getElementById("contact_count").innerHTML = result.length;     // setting count of the results in display
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
            child_div[0].innerHTML = 'No such customer is available...';
            child_action[0].style.display = "none";
            child[0].style.display = "block";
        }

        document.getElementById("response_container").style.display = "block";
        document.getElementById("email_list").style.display = "block";
    });
}

//fetch previous set of project data function
prev_btn.onclick = () => {
    skip = skip - const_limit;
    projectSearch(skip, const_limit)
    limit = limit - const_limit;
    if (skip === 0)
        prev_btn.style.display = "none";
}

//fetch next set of project data function
next_btn.onclick = () => {
    skip = limit;
    projectSearch(skip, const_limit);
    limit = limit + const_limit;
    if (skip >= const_limit)
        prev_btn.style.display = "inline-block";
}

//Project search function
projectSearch = (skip_data, const_limit) => {
    let search_query = 'where=[{"property":"Project.name","operator":"LIKE","value":"%' + email_text.value + '%"}]&select=["Project.id","Project.number","Project.name"]&sort=[{"property":"Project.id","order":"desc"}]&limit=' + const_limit + '&skip=' + skip_data;
    let url = encodeURI('https://api.kundenmeister.com/v13/model/Project?' + search_query);
    // console.log(url);
    fetch(url, {
        method: "GET",
        headers: myHeaders,
    }).then((response) => {
        return response.json();
    }).then((result) => {
        //console.log(result);
        let child = document.querySelectorAll(".project-list-item");
        let child_div = document.querySelectorAll(".custom-project-list-item");
        let child_action = document.querySelectorAll(".project-actions");
        let comment_action = document.querySelectorAll(".project-comment-btn");

        if (limit === const_limit || (result && result.length > 0)) {
            for (let i = 0; i < child.length; i++) {                            // clearing exist datas in the list
                if (child_div[i]) {
                    child_div[i].innerHTML = "";
                    child[i].style.display = "none";
                    child_div[i].id = "";
                }
            }
            document.getElementById("project_count").innerHTML = result.length;     // setting count of the results in display
        }
        if (result && result.length > 0) {
            next_btn.style.display = "inline-block";
            let i = 0;
            while (result.length > i) {
                if (result[i]['Project.number'] != '')
                    child_div[i].innerHTML = '<div class="name-text">' + result[i]['Project.number'] + ' - ' + result[i]['Project.name'] + '</div>';
                else
                    child_div[i].innerHTML = '<div class="name-text">' + result[i]['Project.name'] + '</div>';
                child[i].style.display = "block";
                child_action[i].style.display = "inline-block";
                comment_action[i].id = "project_comment_" + result[i]['Project.id'];
                i++;
            }
        } else {
            if (limit === const_limit) {
                child_div[0].innerHTML = 'No such project is available...';
                child_action[0].style.display = "none";
                child[0].style.display = "block";
                next_btn.style.display = "none";
                prev_btn.style.display = "none";
            } else {
                skip = skip - const_limit;
                limit = limit - const_limit;
                if (skip === 0)
                    prev_btn.style.display = "none";
                alert("No more data available");
            }
        }

    });
}

//fetch previous set of opportunity data function
opp_prev_btn.onclick = () => {
    opp_skip = opp_skip - const_limit;
    opportunitySearch(opp_skip, const_limit)
    opp_limit = opp_limit - const_limit;
    if (opp_skip === 0)
        opp_prev_btn.style.display = "none";
}

//fetch next set of opportunity data function
opp_next_btn.onclick = () => {
    opp_skip = opp_limit;
    opportunitySearch(opp_skip, const_limit);
    opp_limit = opp_limit + const_limit;
    if (opp_skip >= const_limit)
        opp_prev_btn.style.display = "inline-block";
}

//Opportunity search function
opportunitySearch = (skip_data, const_limit) => {
    let search_query = 'where=[{"property":"Opportunity.name","operator":"LIKE","value":"%' + email_text.value + '%"}]&select=["Opportunity.id","Opportunity.name"]&sort=[{"property":"Opportunity.id","order":"desc"}]&limit=' + const_limit + '&skip=' + skip_data;
    let url = encodeURI('https://api.kundenmeister.com/v13/model/Opportunity?' + search_query);
    // console.log(url);
    fetch(url, {
        method: "GET",
        headers: myHeaders,
    }).then((response) => {
        return response.json();
    }).then((result) => {
        //console.log(result);
        let child = document.querySelectorAll(".opportunity-list-item");
        let child_div = document.querySelectorAll(".custom-opportunity-list-item");
        let child_action = document.querySelectorAll(".opportunity-actions");
        let comment_action = document.querySelectorAll(".opportunity-comment-btn");

        if (opp_limit === const_limit || (result && result.length > 0)) {                           // clearing exist datas in the list
            for (let i = 0; i < child.length; i++) {
                if (child_div[i]) {
                    child_div[i].innerHTML = "";
                    child[i].style.display = "none";
                    child_div[i].id = "";
                }
            }
            document.getElementById("opportunity_count").innerHTML = result.length;         // setting count of the results in display
        }
        if (result && result.length > 0) {
            opp_next_btn.style.display = "inline-block";
            let i = 0;
            while (result.length > i) {
                child_div[i].innerHTML = '<div class="name-text">' + result[i]['Opportunity.name'] + '</div>';
                child[i].style.display = "block";
                child_action[i].style.display = "inline-block";
                comment_action[i].id = "opportunity_comment_" + result[i]['Opportunity.id'];
                i++;
            }
        } else {
            if (opp_limit === const_limit) {
                child_div[0].innerHTML = 'No such opportunity is available...';
                child_action[0].style.display = "none";
                child[0].style.display = "block";
                opp_next_btn.style.display = "none";
                opp_prev_btn.style.display = "none";
            } else {
                opp_skip = opp_skip - const_limit;
                opp_limit = opp_limit - const_limit;
                if (opp_skip === 0)
                    opp_prev_btn.style.display = "none";
                alert("No more data available");
            }
        }

    });
}

//export emails to KundenMeister Email
exportEmail = (email_obj) => {
    let customer_id_arr = email_obj.id.split('_');
    browser.tabs.query({
        mailTab: true
    }).then(tabs => {
        let tabId = tabs[0].id;
        browser.mailTabs.getSelectedMessages(tabId).then((MessageList) => {
            let i = 0;
            let fetch_count = 0;
            let messageListItems = MessageList.messages;
            if (messageListItems.length > 0) {
                let message_count = messageListItems.length;
                document.getElementById("loader").style.display = "block";
                let messageId, bodyText, bodyTextArr, inner_text, emailObject, text_content;
                while (messageListItems.length > i) {
                    messageId = messageListItems[i].id;
                    browser.messages.getFull(messageId).then((MessagePart) => {
                        bodyText = "";

                        // extract message from messagepart starts
                        let parts_count = 0, child_parts_count, child_sub_part_count, child_sub_part_sub_count;
                        while (MessagePart.parts.length > parts_count) {
                            if (MessagePart.parts[parts_count].parts && MessagePart.parts[parts_count].parts.length > 0) {
                                child_parts_count = 0;
                                while (MessagePart.parts[parts_count].parts.length > child_parts_count) {
                                    if (MessagePart.parts[parts_count].parts[child_parts_count].parts && MessagePart.parts[parts_count].parts[child_parts_count].parts.length > 0) {
                                        child_sub_part_count = 0;
                                        while (MessagePart.parts[parts_count].parts[child_parts_count].parts.length > child_sub_part_count) {
                                            if (MessagePart.parts[parts_count].parts[child_parts_count].parts[child_sub_part_count].parts && MessagePart.parts[parts_count].parts[child_parts_count].parts[child_sub_part_count].parts.length > 0) {
                                                child_sub_part_sub_count = 0;
                                                while (MessagePart.parts[parts_count].parts[child_parts_count].parts[child_sub_part_count].parts.length > child_sub_part_sub_count) {
                                                    if (MessagePart.parts[parts_count].parts[child_parts_count].parts[child_sub_part_count].parts[child_sub_part_sub_count].contentType && MessagePart.parts[parts_count].parts[child_parts_count].parts[child_sub_part_count].parts[child_sub_part_sub_count].contentType === "text/html") {
                                                        if (bodyText === '') {
                                                            bodyText = MessagePart.parts[parts_count].parts[child_parts_count].parts[child_sub_part_count].parts[child_sub_part_sub_count].body.toString();
                                                            break;
                                                        }
                                                    }
                                                    child_sub_part_sub_count++;
                                                }
                                            } else {
                                                if (MessagePart.parts[parts_count].parts[child_parts_count].parts[child_sub_part_count].contentType && MessagePart.parts[parts_count].parts[child_parts_count].parts[child_sub_part_count].contentType === "text/html") {
                                                    if (bodyText === '') {
                                                        bodyText = MessagePart.parts[parts_count].parts[child_parts_count].parts[child_sub_part_count].body.toString();
                                                        break;
                                                    }
                                                }
                                            }
                                            child_sub_part_count++;
                                        }
                                    } else {
                                        if (MessagePart.parts[parts_count].parts[child_parts_count].contentType && MessagePart.parts[parts_count].parts[child_parts_count].contentType === "text/html") {
                                            if (bodyText === '') {
                                                bodyText = MessagePart.parts[parts_count].parts[child_parts_count].body.toString();
                                                break;
                                            }
                                        }
                                    }
                                    child_parts_count++;
                                }
                            } else {
                                if (MessagePart.parts[parts_count].contentType && MessagePart.parts[parts_count].contentType === "text/html") {
                                    if (bodyText === '') {
                                        bodyText = MessagePart.parts[parts_count].body.toString();
                                        break;
                                    }
                                }
                            }
                            parts_count++;
                        }

                        bodyTextArr = bodyText.toString().split("</style>");
                        if (bodyTextArr.length > 1) {
                            document.getElementById("body_text").innerHTML = bodyTextArr[1];
                        } else {
                            document.getElementById("body_text").innerHTML = bodyText;
                        }
                        inner_text = document.getElementById("body_text").innerText;
                        //text_content = document.getElementById("body_text").textContent;
                        inner_text = inner_text.replace(/\s\s+/g, "\n\n");
                        text_content = inner_text;
                        // extract message from messagepart ends

                        emailObject = {
                            "Mail.from": MessagePart.headers.from.toString(),
                            "Mail.to": MessagePart.headers['delivered-to'].toString(),
                            "Mail.customerId": customer_id_arr[1],
                            "Mail.subject": MessagePart.headers.subject.toString(),
                            "Mail.text": text_content,
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
                            if (result["Mail.id"]) {
                                notification("Mail exported successfully to KundenMeister mails", MessagePart.headers.subject.toString())
                                if (fetch_count === message_count - 1) {
                                    document.getElementById("loader").style.display = "none";
                                    close();
                                }
                                fetch_count++;
                            }
                        }).catch(onError);
                    }).catch(onError);
                    i++;
                }
                email_text.value = "";
            } else {
                alert("Please pick at least one email..");
            }
        });
    })
}

//export emails to KundenMeister Comments
exportComment = (comment_obj, type) => {
    // alert(comment_obj.id);
    let customer_id_arr = comment_obj.id.split('_');
    browser.tabs.query({
        mailTab: true
    }).then(tabs => {
        // console.log(tabs);
        let tabId = tabs[0].id;
        browser.mailTabs.getSelectedMessages(tabId).then((MessageList) => {
            let i = 0;
            let fetch_count = 0;
            let messageListItems = MessageList.messages;
            if (messageListItems.length > 0) {
                document.getElementById("loader").style.display = "block";
                let message_count = messageListItems.length;
                let messageId, bodyText, bodyTextArr, inner_text, commentObject, text_content;
                while (messageListItems.length > i) {
                    messageId = messageListItems[i].id;
                    browser.messages.getFull(messageId).then((MessagePart) => {
                        //console.log(MessagePart);
                        bodyText = "";

                        // extract message from messagepart starts
                        let parts_count = 0, child_parts_count, child_sub_part_count, child_sub_part_sub_count;
                        while (MessagePart.parts.length > parts_count) {
                            if (MessagePart.parts[parts_count].parts && MessagePart.parts[parts_count].parts.length > 0) {
                                child_parts_count = 0;
                                while (MessagePart.parts[parts_count].parts.length > child_parts_count) {
                                    if (MessagePart.parts[parts_count].parts[child_parts_count].parts && MessagePart.parts[parts_count].parts[child_parts_count].parts.length > 0) {
                                        child_sub_part_count = 0;
                                        while (MessagePart.parts[parts_count].parts[child_parts_count].parts.length > child_sub_part_count) {
                                            if (MessagePart.parts[parts_count].parts[child_parts_count].parts[child_sub_part_count].parts && MessagePart.parts[parts_count].parts[child_parts_count].parts[child_sub_part_count].parts.length > 0) {
                                                child_sub_part_sub_count = 0;
                                                while (MessagePart.parts[parts_count].parts[child_parts_count].parts[child_sub_part_count].parts.length > child_sub_part_sub_count) {
                                                    if (MessagePart.parts[parts_count].parts[child_parts_count].parts[child_sub_part_count].parts[child_sub_part_sub_count].contentType && MessagePart.parts[parts_count].parts[child_parts_count].parts[child_sub_part_count].parts[child_sub_part_sub_count].contentType === "text/html") {
                                                        if (bodyText === '') {
                                                            bodyText = MessagePart.parts[parts_count].parts[child_parts_count].parts[child_sub_part_count].parts[child_sub_part_sub_count].body.toString();
                                                            break;
                                                        }
                                                    }
                                                    child_sub_part_sub_count++;
                                                }
                                            } else {
                                                if (MessagePart.parts[parts_count].parts[child_parts_count].parts[child_sub_part_count].contentType && MessagePart.parts[parts_count].parts[child_parts_count].parts[child_sub_part_count].contentType === "text/html") {
                                                    if (bodyText === '') {
                                                        bodyText = MessagePart.parts[parts_count].parts[child_parts_count].parts[child_sub_part_count].body.toString();
                                                        break;
                                                    }
                                                }
                                            }
                                            child_sub_part_count++;
                                        }
                                    } else {
                                        if (MessagePart.parts[parts_count].parts[child_parts_count].contentType && MessagePart.parts[parts_count].parts[child_parts_count].contentType === "text/html") {
                                            if (bodyText === '') {
                                                bodyText = MessagePart.parts[parts_count].parts[child_parts_count].body.toString();
                                                break;
                                            }
                                        }
                                    }
                                    child_parts_count++;
                                }
                            } else {
                                if (MessagePart.parts[parts_count].contentType && MessagePart.parts[parts_count].contentType === "text/html") {
                                    if (bodyText === '') {
                                        bodyText = MessagePart.parts[parts_count].body.toString();
                                        break;
                                    }
                                }
                            }
                            parts_count++;
                        }

                        //console.log(bodyText);
                        bodyTextArr = bodyText.toString().split("</style>");
                        if (bodyTextArr.length > 1) {
                            document.getElementById("body_text").innerHTML = bodyTextArr[1];
                        } else {
                            document.getElementById("body_text").innerHTML = bodyText;
                        }
                        inner_text = document.getElementById("body_text").innerText;
                        //console.log(inner_text);
                        inner_text = inner_text.replace(/\s\s+/g, "\n\n");
                        if (MessagePart.headers.from) {
                            text_content = "From: " + MessagePart.headers.from.toString() + "\n";           //  append from email address
                        }
                        if (MessagePart.headers.subject) {
                            text_content += "Subject: " + MessagePart.headers.subject.toString() + "\n";    //  append subject
                        }
                        if (MessagePart.headers['delivered-to']) {
                            text_content += "To: " + MessagePart.headers['delivered-to'].toString() + "\n"; //  append to email address
                        }
                        text_content += inner_text;                                                          // append actually message
                        // extract message from messagepart ends

                        commentObject = {
                            "Comment.comment": text_content,
                            "Comment.userId": user_data.userId
                        };
                        if (type === "contact") {
                            commentObject["Comment.customerId"] = customer_id_arr[1];
                        } else if (type === "project") {
                            commentObject["Comment.projectId"] = customer_id_arr[2];
                        } else if (type === "opportunity") {
                            commentObject["Comment.opportunityId"] = customer_id_arr[2];
                        }
                        //console.log(commentObject);
                        url = "https://api.kundenmeister.com/v13/model/Comment";
                        fetch(url, {
                            method: "POST",
                            headers: myHeaders,
                            body: JSON.stringify(commentObject)
                        }).then((response) => {
                            return response.json();
                        }).then((result) => {
                            if (result["Comment.id"]) {
                                if (type === "contact") {
                                    notification("Mail exported successfully to KundenMeister comments", MessagePart.headers.subject.toString())
                                } else if (type === "project") {
                                    notification("Mail exported successfully to KundenMeister project comments", MessagePart.headers.subject.toString())
                                } else if (type === "opportunity") {
                                    notification("Mail exported successfully to KundenMeister opportunity comments", MessagePart.headers.subject.toString())
                                }
                                if (fetch_count === message_count - 1) {
                                    document.getElementById("loader").style.display = "none";
                                    close();
                                }
                                fetch_count++;
                            }
                        }).catch(onError);
                    }).catch(onError);
                    i++;
                }
                email_text.value = "";
            } else {
                alert("Please pick at least one email..")
            }
        });
    });
}

notification = (title, message) => {
    browser.notifications.create({
        "type": "basic",
        "title": title,
        "iconUrl": "icons/Kundenmeister.png",
        "message": "Subject: " + message
    });
}

close = () => {
    let getInfo = {populate: true, windowTypes: ['app', 'normal', 'panel', 'popup']}
    browser.windows.getCurrent(getInfo).then(response => {
        browser.windows.remove(response.id);
    });
}

