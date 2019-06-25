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

/*
 * @CLASS Scoring class for zxcvbn-pv
 */
class ZxcvbnScoring {

  /*
   * @constructor
   *
   * @param {string} aLocale - the identifier of the locale to use
   * @param {ZxcvbnAdjacencyGraphs} aAdjacencyGraphs
   */
  constructor(aLocale, aAdjacencyGraphs) {
    this.adjacencyGraphs = aAdjacencyGraphs;

    this.BRUTEFORCE_CARDINALITY = 10;
    this.MIN_GUESSES_BEFORE_GROWING_SEQUENCE = 10000;
    this.MIN_SUBMATCH_GUESSES_SINGLE_CHAR = 10;
    this.MIN_SUBMATCH_GUESSES_MULTI_CHAR = 50;

    this.MIN_YEAR_SPACE = 20;

    this.REFERENCE_YEAR = new Date().getFullYear();
    let keyboard = "qwerty";
    switch (aLocale) {
      case "fr-FR":
      case "fr":
        keyboard = "azerty";
        break;

      default: break;
    }
    this.KEYBOARD_AVERAGE_DEGREE     = this.calcAverageDegree(this.adjacencyGraphs[keyboard]);
    this.KEYPAD_AVERAGE_DEGREE       = this.calcAverageDegree(this.adjacencyGraphs.keypad);
    this.KEYBOARD_STARTING_POSITIONS = Object.values(this.adjacencyGraphs[keyboard]).length;
    this.KEYPAD_STARTING_POSITIONS   = Object.values(this.adjacencyGraphs.keypad).length;

    this.START_UPPER = /^[A-Z][^A-Z]+$/ ;
    this.END_UPPER   = /^[^A-Z]+[A-Z]$/ ;
    this.ALL_UPPER   = /^[^a-z]+$/ ;
    this.ALL_LOWER   = /^[^A-Z]+$/ ;
  }

  // on qwerty, 'g' has degree 6, being adjacent to 'ftyhbv'. '\' has degree 1.
  // this calculates the average over all keys.
  /*
   * @param {Object} aGraph - an ajacency graph
   * @returns {number}
   */
  calcAverageDegree(aGraph) {
    let average = 0;
    Object.values(aGraph).forEach((neighbors) => {
      average += neighbors.filter(v => v).length;
    });

    return average / Object.keys(aGraph).length;
  }

  /*
   * Binomial coefficients
   *
   * @param {number} n
   * @param {number} k
   * @returns {number}
   */
  nCk(n, k) {
    // http://blog.plover.com/math/choose.html
    if (k > n) {
      return 0;
    }

    if (k == 0) {
      return 1;
    }

    let r = 1;
    for (let d = 1; d <= k; d++) {
      r *= n / d;
      n--;
    }

    return r;
  }

  /*
   * Ugly factorial computation
   *
   * @param {number} n
   * @returns {number}
   */
  factorial(n) {
    // unoptimized, called only on small n
    if (n < 2)
      return 1;

    let rv = 1;
    for (let i = 2; i <=n; i++) {
      rv *= i;
    }

    return rv;
  }

  // ------------------------------------------------------------------------------
  // search --- most guessable match sequence -------------------------------------
  // ------------------------------------------------------------------------------
  //
  // takes a sequence of overlapping matches, returns the non-overlapping sequence with
  // minimum guesses. the following is a O(l_max * (n + m)) dynamic programming algorithm
  // for a length-n password with m candidate matches. l_max is the maximum optimal
  // sequence length spanning each prefix of the password. In practice it rarely exceeds 5 and the
  // search terminates rapidly.
  //
  // the optimal "minimum guesses" sequence is here defined to be the sequence that
  // minimizes the following function:
  //
  //    g = l! * Product(m.guesses for m in sequence) + D^(l - 1)
  //
  // where l is the length of the sequence.
  //
  // the factorial term is the number of ways to order l patterns.
  //
  // the D^(l-1) term is another length penalty, roughly capturing the idea that an
  // attacker will try lower-length sequences first before trying length-l sequences.
  //
  // for example, consider a sequence that is date-repeat-dictionary.
  //  - an attacker would need to try other date-repeat-dictionary combinations,
  //    hence the product term.
  //  - an attacker would need to try repeat-date-dictionary, dictionary-repeat-date,
  //    ..., hence the factorial term.
  //  - an attacker would also likely try length-1 (dictionary) and length-2 (dictionary-date)
  //    sequences before length-3. assuming at minimum D guesses per pattern type,
  //    D^(l-1) approximates Sum(D^i for i in [1..l-1]
  //
  // ------------------------------------------------------------------------------
  /*
   * @param {string} aPassword - password
   * @param {Array} aMatches - sequence of overlapping matches
   * @param {Array} aExcludeAdditive
   */
  mostGuessableMatchSequence(aPassword, aMatches, aExcludeAdditive = false) {
    const n = aPassword.length;

    // partition matches into sublists according to ending index j
    const matches_by_j = new Array(n);
    for (let i = 0; i < n; i++)
      matches_by_j[i] = [];

    aMatches.forEach((aMatch) => {
      matches_by_j[aMatch.j].push(aMatch);
    });

    // small detail: for deterministic output, sort each sublist by i.
    matches_by_j.forEach((aLst) => {
      aLst.sort(function(m1, m2) {
        return m1.i - m2.i;
      });
    });

    const fillArrayWithEmptyObject = (aArray) => {
      for (let i = 0; i < aArray.length; i++)
        aArray[i] = {};
    }

    const optimal = {
        // optimal.m[k][l] holds final match in the best length-l match sequence covering the
        // password prefix up to k, inclusive.
        // if there is no length-l sequence that scores better (fewer guesses) than
        // a shorter match sequence spanning the same prefix, optimal.m[k][l] is undefined.
        m:  new Array(n),
        // same structure as optimal.m -- holds the product term Prod(m.guesses for m in sequence).
        // optimal.pi allows for fast (non-looping) updates to the minimization function.
        pi: new Array(n),
        // same structure as optimal.m -- holds the overall metric.
        g:  new Array(n)
    };
    fillArrayWithEmptyObject(optimal.m);
    fillArrayWithEmptyObject(optimal.pi);
    fillArrayWithEmptyObject(optimal.g);

    // helper: considers whether a length-l sequence ending at match m is better (fewer guesses)
    // than previously encountered sequences, updating state if so.
    const update = (aMatch, aLength) => {
      const k = aMatch.j;
      let pi = this.estimateGuesses(aMatch, aPassword);
      if (aLength > 1) {
        // we're considering a length-l sequence ending with match m:
        // obtain the product term in the minimization function by multiplying m's guesses
        // by the product of the length-(l-1) sequence ending just before m, at m.i - 1.
        if (aMatch.i == 1 || !optimal.pi[aMatch.i - 1]) {
          let a = 0;
          a = 1;
        }
        pi *= optimal.pi[aMatch.i - 1][aLength - 1];
      }

      // calculate the minimization func
      let g = this.factorial(aLength) * pi;
      if (!aExcludeAdditive) {
        g += Math.pow(this.MIN_GUESSES_BEFORE_GROWING_SEQUENCE, aLength - 1);
      }

      // update state if new best.
      // first see if any competing sequences covering this prefix, with l or fewer matches,
      // fare better than this sequence. if so, skip it and return.
      const ref = optimal.g[k];
      for (let competing_l in ref) {
        const competing_g = ref[competing_l];
        if (competing_l > aLength) {
          continue;
        }
        if (competing_g <= g) {
          return;
        }
      }

      // this sequence might be part of the final optimal sequence.
      optimal.g[k][aLength]  = g;
      optimal.m[k][aLength]  = aMatch;
      optimal.pi[k][aLength] = pi;
    }

    // helper: evaluate bruteforce matches ending at k.
    const bruteforceUpdate = (k) => {
      // see if a single bruteforce match spanning the k-prefix is optimal.
      let m = makeBruteforceMatch(0, k);
      update(m, 1);

      let u, ref;
      // WARNING: the following line is ugly but does matter because k can be 0, below the initial
      // value of i. In that case, the array is browsed in descending order from 1 to 0...
      for (let i = u = 1, ref = k; 1 <= ref ? u <= ref : u >= ref; i = 1 <= ref ? ++u : --u) {
        // generate k bruteforce matches, spanning from (i=1, j=k) up to (i=k, j=k).
        // see if adding these new matches to any of the sequences in optimal[i-1]
        // leads to new bests.
        const match = makeBruteforceMatch(i, k);
        const ref = optimal.m[i - 1];
        for (let l in ref) {
          const last_m = ref[l];
          l = parseInt(l);
          // corner: an optimal sequence will never have two adjacent bruteforce matches.
          // it is strictly better to have a single bruteforce match spanning the same region:
          // same contribution to the guess product with a lower length.
          // --> safe to skip those cases.
          if (last_m.pattern == "bruteforce") {
            continue;
          }
          // try adding m to this length-l sequence.
          update(match, l + 1);
        }
      }
    }

    // helper: make bruteforce match objects spanning i to j, inclusive.
    const makeBruteforceMatch = (i, j) => {
      return {
        pattern: "bruteforce",
        token: aPassword.slice(i, j + 1 ),
        i: i,
        j: j
      };
    }

    // helper: step backwards through optimal.m starting at the end,
    // constructing the final optimal match sequence.
    const unwind = (n) => {
      const optimal_match_sequence = [];
      let k = n - 1;

      // find the final best sequence length and score
      let l = undefined;
      let g = Infinity;
      const ref = optimal.g[k];
      for (let candidate_l in ref) {
        const candidate_g = ref[candidate_l];
        if (candidate_g < g) {
          l = candidate_l;
          g = candidate_g;
        }
      }

      while (k >= 0) {
        const m = optimal.m[k][l];
        optimal_match_sequence.unshift(m);
        k = m.i - 1;
        l--;
      }
      return optimal_match_sequence;
    }

    for (let i = 0; i < n; i++) {
      for (let w = 0; w < matches_by_j[i].length; w++) {
        const match = matches_by_j[i][w];
        if (match.i > 0) {
          for (let l in optimal.m[match.i - 1]) {
            l = parseInt(l);
            update(match, l + 1);
          }
        } else {
          update(match, 1);
        }
      }
      bruteforceUpdate(i)
    }

    const optimalMatchSequence = unwind(n);
    const optimal_l = optimalMatchSequence.length;

    let guesses = 0;
    if (!aPassword.length) {
      // corner: empty password
      guesses = 1;
    } else {
      guesses = optimal.g[n - 1][optimal_l];
    }

    // final result object
    return {
      password:      aPassword,
      guesses:       guesses,
      guesses_log10: Math.log10(guesses),
      sequence:      optimalMatchSequence
    };
  }

  // ------------------------------------------------------------------------------
  // guess estimation -- one function per match pattern ---------------------------
  // ------------------------------------------------------------------------------
  /*
   * @param {Object} aMatch
   * @param {string} aPassword
   * @returns {number}
   */
  estimateGuesses(aMatch, aPassword) {
    if (aMatch.guesses != null) {
      // a match's guess estimate doesn't change. cache it.
      return aMatch.guesses;
    }

    // 
    let min_guesses = 1;
    if (aMatch.token.length < aPassword.length) {
      min_guesses = (aMatch.token.length == 1)
                    ? this.MIN_SUBMATCH_GUESSES_SINGLE_CHAR
                    : this.MIN_SUBMATCH_GUESSES_MULTI_CHAR;
    }

    const estimation_functions = {
        bruteforce: this.bruteforceGuesses,
        dictionary: this.dictionaryGuesses,
        spatial:    this.spatialGuesses,
        repeat:     this.repeatGuesses,
        sequence:   this.sequenceGuesses,
        regex:      this.regexGuesses,
        date:       this.dateGuesses
    };

    try {
      const guesses = estimation_functions[aMatch.pattern].call(this, aMatch);

      aMatch.guesses = Math.max(guesses, min_guesses);
      aMatch.guesses_log10 = Math.log10(aMatch.guesses);
    } catch(e) {
      console.error(e);
    }
    return aMatch.guesses;
  }

  /*
   * @param {Object} aMatch
   * @returns {number}
   */
  bruteforceGuesses(aMatch) {
    let guesses = Math.pow(this.BRUTEFORCE_CARDINALITY, aMatch.token.length);
    if (guesses === Number.POSITIVE_INFINITY) {
      guesses = Number.MAX_VALUE;
    }

    // small detail: make bruteforce matches at minimum one guess bigger than smallest allowed
    // submatch guesses, such that non-bruteforce submatches over the same [i..j] take precedence.
    const min_guesses = aMatch.token.length === 1
          ? this.MIN_SUBMATCH_GUESSES_SINGLE_CHAR + 1
          : this.MIN_SUBMATCH_GUESSES_MULTI_CHAR + 1;
    return Math.max(guesses, min_guesses);
  }

  /*
   * @param {Object} aMatch
   * @returns {number}
   */
  repeatGuesses(aMatch) {
    return aMatch.base_guesses * aMatch.repeat_count;
  }

  /*
   * @param {Object} aMatch
   * @returns {number}
   */
  sequenceGuesses(aMatch) {
    const first_chr = aMatch.token.charAt(0).toLowerCase();
    // lower guesses for obvious starting points
    let base_guesses = 0;
    if (first_chr == "a"
        || first_chr == "z"
        || first_chr == "0"
        || first_chr == "1"
        || first_chr == "9") {
      base_guesses = 4;
    } else {
      if (first_chr.match(/\d/)) {
        // digits
        base_guesses = 10;
      } else {
        // could give a higher base for uppercase,
        // assigning 26 to both upper and lower sequences is more conservative.
        base_guesses = 26;
      }
    }

    if (!aMatch.ascending) {
      // need to try a descending sequence in addition to every ascending sequence ->
      // 2x guesses
      base_guesses *= 2
    }
    return base_guesses * aMatch.token.length;
  }

  /*
   * @param {Object} aMatch
   * @returns {number}
   */
  regexGuesses(aMatch) {
    const char_class_bases = {
        alpha_lower:  26,
        alpha_upper:  26,
        alpha:        52,
        alphanumeric: 62,
        digits:       10,
        symbols:      33
      };

    if (match.regex_name in char_class_bases) {
      return Math.pow(char_class_bases[aMatch.regex_name], aMatch.token.length);
    }

    switch (aMatch.regex_name) {
      case 'recent_year':
        {
          // conservative estimate of year space: num years from REFERENCE_YEAR.
          // if year is close to REFERENCE_YEAR, estimate a year space of MIN_YEAR_SPACE.
          let year_space = Math.abs(parseInt(aMatch.regex_match[0]) - this.REFERENCE_YEAR);
          year_space = Math.max(year_space, this.MIN_YEAR_SPACE);
          return year_space;
        }

      default:
        throw "ZxcvbnScoring:regexGuesses: unknown regex name";
    }
  }

  /*
   * @param {Object} aMatch
   * @returns {number}
   */
  dateGuesses(aMatch) {
    // base guesses: (year distance from REFERENCE_YEAR) * num_days * num_years
    const year_space = Math.max(Math.abs(aMatch.year - this.REFERENCE_YEAR), this.MIN_YEAR_SPACE);
    let guesses = year_space * 365;
    if (aMatch.separator) {
      // add factor of 4 for separator selection (one of ~4 choices)
      guesses *= 4;
    }
    return guesses;
  }

  /*
   * @param {Object} aMatch
   * @returns {number}
   */
  spatialGuesses(aMatch) {
    const ref = aMatch.graph;
    const isAlphaKeyboard =  (ref === "qwerty" || ref === "dvorak" || ref === "azerty");
    const s = isAlphaKeyboard ? this.KEYBOARD_STARTING_POSITIONS : this.KEYPAD_STARTING_POSITIONS;
    const d = isAlphaKeyboard ? this.KEYBOARD_AVERAGE_DEGREE     : this.KEYPAD_AVERAGE_DEGREE;

    let guesses = 0;
    const L = aMatch.token.length;
    const t = aMatch.turns;

    // estimate the number of possible patterns w/ length L or less with t turns or less.
    for (let i = 2; i <= L; i++) {
      const possible_turns = Math.min(t, i - 1);
      for (let j = 1; j <= possible_turns; j++) {
        guesses += this.nCk(i - 1, j - 1) * s * Math.pow(d, j)
      }
    }

    // add extra guesses for shifted keys. (% instead of 5, A instead of a.)
    // math is similar to extra guesses of l33t substitutions in dictionary matches.
    if (aMatch.shifted_count) {
      const S = aMatch.shifted_count;
      // # unshifted count
      const U = aMatch.token.length - S;
      if (!S || !U) {
        guesses *= 2;
      } else {
        let shifted_variations = 0;
        for (let i = 1; i <= Math.min(S, U); i++) {
          shifted_variations += this.nCk(s + U, i);
        }
        guesses *= shifted_variations;
      }
    }

    return guesses;
  }

  /*
   * @param {Object} aMatch
   * @returns {number}
   */
  dictionaryGuesses(aMatch) {
    // keep these as properties for display purposes
    aMatch.base_guesses = aMatch.rank;
    aMatch.uppercase_variations = this.uppercaseVariations(aMatch);
    aMatch.l33t_variations = this.l33tVariations(aMatch);
    const reversed_variations = aMatch.reversed && 2 || 1;
    return aMatch.base_guesses * aMatch.uppercase_variations * aMatch.l33t_variations * reversed_variations;
  }

  /*
   * @param {Object} aMatch
   * @returns {number}
   */
  uppercaseVariations(aMatch) {
    const word = aMatch.token;
    if (word.match(this.ALL_LOWER) || word.toLowerCase() === word) {
      return 1;
    }

    // a capitalized word is the most common capitalization scheme,
    // so it only doubles the search space (uncapitalized + capitalized).
    // allcaps and end-capitalized are common enough too, underestimate as 2x factor to be safe.
    if (word.match(this.START_UPPER)
        || word.match(this.END_UPPER)
        || word.match(this.ALL_UPPER)) {
      return 2;
    }

    // otherwise calculate the number of ways to capitalize U+L uppercase+lowercase letters
    // with U uppercase letters or less. or, if there's more uppercase than lower (for eg. PASSwORD),
    // the number of ways to lowercase U+L letters with L lowercase letters or less.
    const matchUpperAlpha = word.match( /[A-Z]/g );
    const U = matchUpperAlpha ? matchUpperAlpha.length : 0;
    const matchLowerAlpha = word.match( /[a-z]/g );
    const L = matchLowerAlpha ? matchLowerAlpha.length : 0;

    let variations = 0;
    for (let i = 1; i <= Math.min(U, L); i++) {
      variations += this.nCk(U + L, i);
    }

    return variations;
  }

  /*
   * @param {Object} aMatch
   * @returns {number}
   */
  l33tVariations(aMatch) {
    if (!aMatch.l33t) {
      return 1;
    }

    let variations = 1;
    const chrs = aMatch.token.toLowerCase().split('');
    for (let subbed in aMatch.sub) {
      const unsubbed = aMatch.sub[subbed];
      // lower-case match.token before calculating: capitalization shouldn't affect l33t calc.
      const S = chrs.filter(c => c == subbed).length;
      const U = chrs.filter(c => c == unsubbed).length;

      if (!S || !U) {
        // for this sub, password is either fully subbed (444) or fully unsubbed (aaa)
        // treat that as doubling the space (attacker needs to try fully subbed chars in addition to
        // unsubbed.)
        variations *= 2;
      } else {
        // this case is similar to capitalization:
        // with aa44a, U = 3, S = 2, attacker needs to try unsubbed + one sub + two subs
        const p = Math.min(U, S);
        let possibilities = 0;
        for (let i = 1; i <= p; i++) {
          possibilities += this.nCk(U + S, i);
        }
        variations *= possibilities;
      }
    }

    return variations;
  }
}
