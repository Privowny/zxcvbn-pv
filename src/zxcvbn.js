/*
 * @CLASS Main class for zxcvbn-pv
 */
class Zxcvbn {

  /*
   * @constructor
   *
   * @param {string} aLocale - "en", "fr", etc
   * @param {boolean} aDisableHaveIBeenPwned - true to disable calls to HaveIBeenPwned Password API
   */
  constructor(aLocale, aDisableHaveIBeenPwned = false) {
    this.frequencyLists  = new ZxcvnFrequencyLists();
    this.adjacencyGraphs = new ZxcvbnAdjacencyGraphs();
    this.L10N            = new ZxcvbnL10N(aLocale);
    this.timeEstimates   = new ZxcvbnTimeEstimates(this.L10N.locale);
    this.scoring         = new ZxcvbnScoring(aLocale, this.adjacencyGraphs);
    this.matching        = new ZxcvbnMatching(this.frequencyLists, this.adjacencyGraphs, this.scoring);
    this.feedback        = new ZxcvbnFeedback(this.scoring);

    this.HaveIBeenPwned  = aDisableHaveIBeenPwned
                           ? null
                           : new HaveIBeenPwned();
  }

  /*
   * Returns the current timestamp
   *
   * @returns {number}
   */
  getTime() {
    return (new Date()).getTime();
  }

  /*
   * Checks a password against HaveIBeenPwned and if the password is not
   * leaked, calls zxcvbn. Async.
   * 
   * See https://github.com/dropbox/zxcvbn/blob/master/README.md for more
   * information
   *
   * A new score value was added: -1, indicating HaveIBeenPwned reports the
   * password has leaked in a public database. It's then considered dangerous
   * to use and reported as such.
   *
   * @param {string} aPassword - the password to check
   * @rapam {Array} aSanitizedInputs - an extra array of strings as disctionary
   */
  async evaluate(aPassword, aSanitizedInputs) {
    // check against HaveIBennPwned password API
    let rv = this.HaveIBeenPwned
             ? await this.HaveIBeenPwned.check(aPassword)
             : null;

    // check against zxcvbn only if not leaked
    if (!rv) {
      // we need time estimates
      const start = this.getTime();

      // set extra dicts if any
      const sanitizedInputs = aSanitizedInputs || [];
      this.matching.setUserInputDictionary(sanitizedInputs);

      // call zxcvbn matching
      const matches = this.matching.omnimatch(aPassword);
      // then scoring
      rv = this.scoring.mostGuessableMatchSequence(aPassword, matches);

      // compute attack times
      rv.execTime = this.getTime() - start;
      const attackTimes = this.timeEstimates.estimateAttackTimes(rv.guesses);
      for (let prop in attackTimes) {
        rv[prop] = attackTimes[prop];
      }

      // gather feedback
      rv.feedback = this.feedback.getFeedback(rv.score, rv.sequence);
    }

    // localize warning and suggestions
    rv.feedback.warning = this.L10N.localize(rv.feedback.warning);
    for (let i = 0; i < rv.feedback.suggestions.length; i++)
      rv.feedback.suggestions[i] = this.L10N.localize(rv.feedback.suggestions[i]);

    return rv;
  }
}
