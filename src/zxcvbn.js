/*
 * @CLASS Main class for zxcvbn-pv
 */
class Zxcvbn {

  /*
   * @constructor
   */
  constructor(aLocale) {
    this.frequencyLists  = new ZxcvnFrequencyLists();
    this.adjacencyGraphs = new ZxcvbnAdjacencyGraphs();
    this.L10N            = new ZxcvbnL10N(aLocale);
    this.timeEstimates   = new ZxcvbnTimeEstimates(this.L10N.locale);
    this.scoring         = new ZxcvbnScoring(aLocale, this.adjacencyGraphs);
    this.matching        = new ZxcvbnMatching(this.frequencyLists, this.adjacencyGraphs, this.scoring);
    this.feedback        = new ZxcvbnFeedback(this.scoring);

    this.HaveIBeenPwned  = new HaveIBeenPwned();
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
   * @param {string} aPassword - the password to check
   * @rapam {Array} aSanitizedInputs - an extra array of strings as disctionary
   */
  async evaluate(aPassword, aSanitizedInputs) {
    // check against HaveIBennPwned password API
    let rv = await this.HaveIBeenPwned.check(aPassword);

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
