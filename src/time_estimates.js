/*
 * Copyright (c) 2012-2016 Dan Wheeler and Dropbox, Inc.
 *
 * Permission is hereby granted, free of charge, to any person obtaining
 * a copy of this software and associated documentation files (the
 * "Software"), to deal in the Software without restriction, including
 * without limitation the rights to use, copy, modify, merge, publish,
 * distribute, sublicense, and/or sell copies of the Software, and to
 * permit persons to whom the Software is furnished to do so, subject to
 * the following conditions:
 *
 * The above copyright notice and this permission notice shall be
 * included in all copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND,
 * EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
 * MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND
 * NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE
 * LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION
 * OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION
 * WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
 */

class ZxcvbnTimeEstimates {

  constructor(aLocale) {
    this.locale = aLocale;
  }

  get DELTA() { return 5; }

  estimateAttackTimes(aGuesses) {
    const crack_times_seconds = {
        online_throttling_100_per_hour: aGuesses / (100 / 3600),
        online_no_throttling_10_per_second: aGuesses / 10,
        offline_slow_hashing_1e4_per_second: aGuesses / 1e4,
        offline_fast_hashing_1e10_per_second: aGuesses / 1e10
      };

    const crack_times_display = {};
    for (let scenario in crack_times_seconds) {
      const seconds = crack_times_seconds[scenario];
      crack_times_display[scenario] = this.displayTime(seconds);
    }

    return {
      crack_times_seconds: crack_times_seconds,
      crack_times_display: crack_times_display,
      score: this.guessesToScore(aGuesses)
    };
  }

  guessesToScore(aGuesses) {
    if (aGuesses < 1e3 + this.DELTA) {
      return 0;
    }

    if (aGuesses < 1e6 + this.DELTA) {
      return 1;
    }

    if (aGuesses < 1e8 + this.DELTA) {
      return 2;
    }

    if (aGuesses < 1e10 + this.DELTA) {
      return 3;
    }

    return 4;
  }

  displayTime(aSeconds) {
    const minute = 60;
    const hour = minute * 60;
    const day = hour * 24;
    const month = day * 31;
    const year = month * 12;
    const century = year * 100;

    let display_str = "";

    if (aSeconds < 1) {
      display_str = this.locale["lessThanASecond"];
    }
    else if (aSeconds < minute) {
      const v = Math.round(aSeconds);
      display_str = v + " " + ((v > 1) ? this.locale["seconds"] : this.locale["second"]);
    }
    else if (aSeconds < hour) {
      const v = Math.round(aSeconds / minute);
      display_str = v + " " + ((v > 1) ? this.locale["minutes"] : this.locale["minute"]);
    }
    else if (aSeconds < day) {
      const v = Math.round(aSeconds / hour);
      display_str = v + " " + ((v > 1) ? this.locale["hours"] : this.locale["hour"]);
    }
    else if (aSeconds < month) {
      const v = Math.round(aSeconds / day);
      display_str = v + " " + ((v > 1) ? this.locale["days"] : this.locale["day"]);
    }
    else if (aSeconds < year) {
      const v = Math.round(aSeconds / month);
      display_str = v + " " + ((v > 1) ? this.locale["months"] : this.locale["month"]);
    }
    else if (aSeconds < century) {
      const v = Math.round(aSeconds / year);
      display_str = v + " " + ((v > 1) ? this.locale["years"] : this.locale["year"]);
    }
    else {
      const v = Math.round(aSeconds / century);
      display_str = (v > 1) ? this.locale["centuries"] : this.locale["century"];
    }

    return display_str;
  }
}
