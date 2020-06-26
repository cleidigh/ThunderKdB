export function SPF_Check(email){
    let spf_Promise = new Promise((resolve) => {
        let spf;
        if (email.headers["received-spf"]) {
            let spf_Array = email.headers["received-spf"];
            let spf_Answer = spf_Array[0].split(" (")[0];
            if (spf_Answer == "pass") {
                //SPF passed
                spf = "pass"
            } else {
                //SPF failed
                spf = "fail"
            }
        } else {
            // no SPF in mail headers
            spf = "no spf"
        }
        resolve(spf)
    });
    return spf_Promise;
}
