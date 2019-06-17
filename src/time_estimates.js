export class ZxcvbnTimeEstimates {

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
    if (aGuesses < 1e3 + DELTA) {
      return 0;
    }

    if (aGuesses < 1e6 + DELTA) {
      return 1;
    }

    if (aGuesses < 1e8 + DELTA) {
      return 2;
    }

    if (aGuesses < 1e10 + DELTA) {
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

    if (seconds < 1) {
      display_str = aLocale["lessThanASecond"];
    }
    else if (seconds < minute) {
      const v = Math.round(seconds);
      display_str = v + " " + ((v > 1) ? aLocale["seconds"] : aLocale["second"]);
    }
    else if (seconds < hour) {
      const v = Math.round(seconds / minute);
      display_str = v + " " + ((v > 1) ? aLocale["minutes"] : aLocale["minute"]);
    }
    else if (seconds < day) {
      const v = Math.round(seconds / hour);
      display_str = v + " " + ((v > 1) ? aLocale["hours"] : aLocale["hour"]);
    }
    else if (seconds < month) {
      const v = Math.round(seconds / day);
      display_str = v + " " + ((v > 1) ? aLocale["days"] : aLocale["day"]);
    }
    else if (seconds < year) {
      const v = Math.round(seconds / month);
      display_str = v + " " + ((v > 1) ? aLocale["months"] : aLocale["month"]);
    }
    else if (seconds < century) {
      const v = Math.round(seconds / year);
      display_str = v + " " + ((v > 1) ? aLocale["years"] : aLocale["year"]);
    }
    else {
      display_str = (v > 1) ? aLocale["centuries"] : aLocale["century"];
    }

    return display_str;
  }
}
