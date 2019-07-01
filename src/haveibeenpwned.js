/*
 * @CLASS Helper class for HaveIBeenPwned
 */
class HaveIBeenPwned {

  /*
   * @constructor
   *
   */
  constructor() {
    // HaveIBeenPwned password API
    // Cf. https://haveibeenpwned.com/API/v2#PwnedPasswords
    this.kHAVEIBEENPWNED_PASSWORD_API_URL = "https://api.pwnedpasswords.com/range/";
  }

  /*
   * Helper for XMLHttpRequest.
   *
   * @param {Object} aObject - url (string), method (string), headers (string[]), body (any)
   * @returns {Promise}
   */
  request(aObj) {
    return new Promise((resolve, reject) => {
        let xhr = new XMLHttpRequest();
        xhr.open(aObj.method || "GET", aObj.url);
        if (aObj.headers) {
            Object.keys(aObj.headers).forEach(key => {
                xhr.setRequestHeader(key, aObj.headers[key]);
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
        xhr.send(aObj.body);
    });
  };

  /*
   * Checks a password against HaveIBeenPwned. Async.
   *
   * @param {string} aPassword - the password to check
   * @returns {Object}
   */
  async check(aPassword) {
    // compute SHA-1 digest
    const sha1 = (await this.digestSha1(aPassword)).toUpperCase();
    // form API url with first 5 chars of SHA-1 digest
    const url = this.kHAVEIBEENPWNED_PASSWORD_API_URL + sha1.substr(0, 5);
    // preserve the rest
    const sha1Suffix = sha1.substr(5);

    const requestDetails = {
      url : url
    };

    let rv = await this.request(requestDetails)
      .then((aPwnedList) => {
        // checks if the SHA-1 suffix is present in the answer
        const responseArray = aPwnedList.split("\r\n")
                              .map(aValue => aValue.split(":"));
        const leaked = responseArray.some(aEntry => aEntry[0] === sha1Suffix);
        if (leaked) {
          // it is...
          return {
            password: aPassword,
            score: -1,
            feedback: { warning: "leaked", suggestions: [] }
          };
        }
      })
    .catch(error => {
      console.log(error);
    });

    return rv;
  }

  /*
   * Computes a SHA-1 digest through crypto.subtle builtin browser lib. Async.
   *
   * @param {string} aString
   * @returns {string}
   */
  async digestSha1(aString) {
    const buf = await crypto.subtle.digest("SHA-1", new TextEncoder("utf-8").encode(aString));
    return Array.prototype.map.call(new Uint8Array(buf), x=>(('00'+x.toString(16)).slice(-2))).join('');
  }
}
