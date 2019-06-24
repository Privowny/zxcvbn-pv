class HaveIBeenPwned {

  get URL() { return "https://api.pwnedpasswords.com/range/"; }

  request(obj) {
    return new Promise((resolve, reject) => {
        let xhr = new XMLHttpRequest();
        xhr.open(obj.method || "GET", obj.url);
        if (obj.headers) {
            Object.keys(obj.headers).forEach(key => {
                xhr.setRequestHeader(key, obj.headers[key]);
            });
        }
        xhr.onload = () => {
            if (xhr.status >= 200 && xhr.status < 300) {
                resolve(xhr.response);
            } else {
                reject(xhr.statusText);
            }
        };
        xhr.onerror = () => reject(xhr.statusText);
        xhr.send(obj.body);
    });
};


  async check(aPassword) {
    const sha1 = await this.digestSha1(aPassword);
    const url = this.URL + sha1.toUpperCase().substr(0, 5);
    const sha1Suffix = sha1.toUpperCase().substr(5);

    let rv = await this.request({url: url})
              .then((aPwnedList) => {
                const responseArray = aPwnedList.split("\r\n")
                                      .map(aValue => aValue.split(":"));
                const pwned = responseArray.some(aEntry => aEntry[0] === sha1Suffix);
                if (pwned) { 
                  return {
                    password: aPassword,
                    score: -1,
                    feedback: { warning: "leaked", suggestions: ["leaked"] }
                  };
                }
              })
            .catch(error => {
              console.log(error);
            });

    return rv;
  }

  async digestSha1(str) {
    const buf = await crypto.subtle.digest("SHA-1", new TextEncoder("utf-8").encode(str));
    return Array.prototype.map.call(new Uint8Array(buf), x=>(('00'+x.toString(16)).slice(-2))).join('');
  }
}
