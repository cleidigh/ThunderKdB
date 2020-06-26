const form5 = window.document.getElementById('form5');
form5.addEventListener('click', notifyBackgroundPage5);

function handleResponse5(message) {console.log(`Message from background5: ${message.response5}`)};

function notifyBackgroundPage5(e) {var sending5 = browser.runtime.sendMessage({execute5: "Executing from form5"});
                                                 sending5.then(handleResponse5);}