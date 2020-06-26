const form15 = window.document.getElementById('form15');
form15.addEventListener('click', notifyBackgroundPage15);

function handleResponse15(message) {console.log(`Message from background15: ${message.response15}`)};

function notifyBackgroundPage15(e) {var sending15 = browser.runtime.sendMessage({execute15: "Executing from form15"});
                                                 sending15.then(handleResponse15);}