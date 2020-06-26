const form19 = window.document.getElementById('form19');
form19.addEventListener('click', notifyBackgroundPage19);

function handleResponse19(message) {console.log(`Message from background19: ${message.response19}`)};

function notifyBackgroundPage19(e) {var sending19 = browser.runtime.sendMessage({execute19: "Executing from form19"});
                                                 sending19.then(handleResponse19);}