/*
 * @CLASS Main class for zxcvbn-pv
 */
class Zxcvbn {

  /*
   * @constructor
   */
  constructor() {
    this.frequencyLists  = new ZxcvnFrequencyLists();
    this.adjacencyGraphs = new ZxcvbnAdjacencyGraphs();
    this.timeEstimates   = new ZxcvbnTimeEstimates([]);
    this.scoring         = new ZxcvbnScoring("en", this.adjacencyGraphs);
    this.matching        = new ZxcvbnMatching(this.frequencyLists, this.adjacencyGraphs, this.scoring);
    this.feedback        = new ZxcvbnFeedback(this.scoring);
  }

  getTime() {
    return (new Date()).getTime();
  }

  evaluate(aPassword, aSanitizedInputs) {
    const start = this.getTime();

    const sanitizedInputs = aSanitizedInputs || [];
    this.matching.setUserInputDictionary(sanitizedInputs);

    const matches = this.matching.omnimatch(aPassword);
    const rv = this.scoring.mostGuessableMatchSequence(aPassword, matches);

    result.execTime = this.getTime() - start;
    const attackTimes = this.timeEstimates.estimateAttackTimes(rv.guesses);
    for (let prop in attackTimes) {
      rv[prop] = attackTimes[prop];
    }

    rv.feedback = this.feedback.getFeedback(rv.score, rv.sequence);

    return rv;
  }
}
