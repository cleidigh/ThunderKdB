const form2 = window.document.getElementById('form2');
form2.addEventListener('click', notifyBackgroundPage2);

function handleResponse2(message) {console.log(`Message from background2: ${message.response2}`)};

function notifyBackgroundPage2(e) {var sending2 = browser.runtime.sendMessage({execute2: "Executing from form2"});
                                                 sending2.then(handleResponse2);}