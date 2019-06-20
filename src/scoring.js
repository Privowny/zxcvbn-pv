class ZxcvbnScoring {

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
    this.KEYBOARD_STARTING_POSITIONS = Object.keys(this.adjacencyGraphs[keyboard]);
    this.KEYPAD_STARTING_POSITIONS   = Object.keys(this.adjacencyGraphs.keypad);

    this.START_UPPER = /^[A-Z][^A-Z]+$/ ;
    this.END_UPPER   = /^[^A-Z]+[A-Z]$/ ;
    this.ALL_UPPER   = /^[^a-z]+$/ ;
    this.ALL_LOWER   = /^[^A-Z]+$/ ;
  }

  buildAverageFromNeighbors(aNeighbors) {
    const len = aNeighbors.length;
    const results = [];
    for (let index = 0; index < len; index++) {
      let n = aNeighbors[index];
      if (n) {
        results.push(n);
      }
    }
    return results;
  }

  calcAverageDegree(aGraph) {
    let average = 0;
    for (let key in aGraph) {
      const neighbors = aGraph[key];
      average += this.buildAverageFromNeighbors(neighbors).length;
    }

    return average / Object.keys(aGraph).length;
  }

  nCk(n, k) {
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

  factorial(n) {
    if (n < 2)
      return 1;

    let rv = 1;
    for (let i = 2; i <=n; i++) {
      rv *= i;
    }

    return rv;
  }

  mostGuessableMatchSequence(aPassword, aMatches, aExcludeAdditive) {
    const n = aPassword.length;

    const matches_by_j = new Array(n).fill([]);

    aMatches.forEach((aMatch) => {
      matches_by_j[aMatch.j].push(aMatch);
    });

    matches_by_j.forEach((aLst) => {
      aLst.sort(function(m1, m2) {
        return m1.i - m2.i;
      });
    });

    const optimal = {
        m:  (new Array(n)).fill({}),
        pi: (new Array(n)).fill({}),
        g:  (new Array(n)).fill({})
    };

    const update = (aMatch, aLength) => {
      const k = aMatch.j;
      let pi = this.estimateGuesses(aMatch, aPassword);
      if (aLength > 1) {
        pi *= optimal.pi[aMatch.i - 1][aLength - 1];
      }

      let g = this.factorial(aLength) * pi;
      if (!aExcludeAdditive) {
        g += Math.pow(this.MIN_GUESSES_BEFORE_GROWING_SEQUENCE, aLength - 1);
      }

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

      optimal.g[k][aLength]  = g;
      optimal.m[k][aLength]  = aMatch;
      optimal.pi[k][aLength] = pi;
    }

    function bruteforceUpdate(k) {
      let m = makeBruteforceMatch(0, k);
      update(m, 1);
      const results = [];
      for (let i = 1; i <= k; i++) {
        m = makeBruteforceMatch(i, k);
        for (let l in optimal.m[i - 1]) {
          const last_m = optimal.m[i - 1][l];
          if (last_m.pattern == "bruteforce")
            continue;
          update(m, parseInt(l) + 1);
        }
      }
    }

    function makeBruteforceMatch(i, j) {
      return {
        pattern: "bruteforce",
        token: aPassword.slice(i, j + 1),
        i: i,
        j: j
      };
    }

    function unwind(n) {
      const optimal_match_sequence = [];
      let k = n - 1;
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

    for (let k = 0; k < n; k++) {
      for (let w = 0; w < matches_by_j[k].length; w++) {
        const match = matches_by_j[k][w];
        if (match.i > 0) {
          for (let l in optimal.m[match.i - 1]) {
            l = parseInt(l);
            update(match, l + 1);
          }
        } else {
          update(match, 1);
        }
      }
      bruteforceUpdate(k)
    }

    const optimal_match_sequence = unwind(n);
    const optimal_l = optimal_match_sequence.length;

    let guesses = 0;
    if (!aPassword.length) {
      guesses = 1;
    } else {
      guesses = optimal.g[n - 1][optimal_l];
    }

    return {
      password: aPassword,
      guesses: guesses,
      guessesLog10: Math.log10(guesses),
      sequence: optimal_match_sequence
    };
  }

  estimateGuesses(aMatch, aPassword) {
    if (aMatch.guesses != null) {
      return aMatch.guesses;
    }

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

    const guesses = estimation_functions[aMatch.pattern].call(this, aMatch);

    aMatch.guesses = Math.max(guesses, min_guesses);
    aMatch.guesses_log10 = Math.log10(aMatch.guesses);
    return aMatch.guesses;
  }

  bruteforceGuesses(aMatch) {
    let guesses = Math.pow(this.BRUTEFORCE_CARDINALITY, aMatch.token.length);
    if (guesses === Number.POSITIVE_INFINITY) {
      guesses = Number.MAX_VALUE;
    }

    const min_guesses = aMatch.token.length === 1
          ? this.MIN_SUBMATCH_GUESSES_SINGLE_CHAR + 1
          : this.MIN_SUBMATCH_GUESSES_MULTI_CHAR + 1;
    return Math.max(guesses, min_guesses);
  }

  repeatGuesses(aMatch) {
    return aMatch.base_guesses * aMatch.repeat_count;
  }

  sequenceGuesses(aMatch) {
    const first_chr = aMatch.token.charAt(0).toLowerCase();
    const best_guesses = 0;
    if (first_chr == "a"
        || first_chr == "z"
        || first_chr == "0"
        || first_chr == "1"
        || first_chr == "9") {
      best_guesses = 4;
    } else {
      if (first_chr.match(/\d/)) {
        base_guesses = 10;
      } else {
        base_guesses = 26;
      }
    }

    if (!aMatch.ascending) {
      base_guesses *= 2;
    }
    return base_guesses * aMatch.token.length;
  }

  regexGuesses(aMatch) {
    const char_class_bases = {
        alpha_lower: 26,
        alpha_upper: 26,
        alpha: 52,
        alphanumeric: 62,
        digits: 10,
        symbols: 33
      };

    if (match.regex_name in char_class_bases) {
      return Math.pow(char_class_bases[aMatch.regex_name], aMatch.token.length);
    }

    switch (aMatch.regex_name) {
      case 'recent_year':
        year_space = Math.abs(parseInt(aMatch.regex_match[0]) - this.REFERENCE_YEAR);
        year_space = Math.max(year_space, this.MIN_YEAR_SPACE);
        return year_space;

      default:
        throw "ZxcvbnScoring:regexGuesses: unknown regex name";
    }
  }

  dateGuesses(aMatch) {
    const year_space = Math.max(Math.abs(aMatch.year - this.REFERENCE_YEAR), this.MIN_YEAR_SPACE);
    let guesses = year_space * 365;
    if (aMatch.separator) {
      guesses *= 4;
    }
    return guesses;
  }

  spatialGuesses(aMatch) {
    const ref = aMatch.graph;
    const isAlphaKeyboard =  (ref === "qwerty" || ref === "dvorak" || ref === "azerty");
    const s = isAlphaKeyboard ? this.KEYBOARD_STARTING_POSITIONS : this.KEYPAD_STARTING_POSITIONS;
    const d = isAlphaKeyboard ? this.KEYBOARD_AVERAGE_DEGREE     : this.KEYPAD_AVERAGE_DEGREE;

    let guesses = 0;
    const L = aMatch.token.length;
    const t = aMatch.turns;

    for (let i = 2; i <= L; i++) {
      const possible_turns = Math.min(t, i - 1);
      for (let j = 1; j <= possible_turns; j++) {
        guesses += this.nCk(i - 1, j - 1) * s * Math.pow(d, j)
      }
    }

    if (aMatch.shifted_count) {
      const S = aMatch.shifted_count;
      const U = aMatch.token.length - aMatch.shifted_count
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

  dictionaryGuesses(aMatch) {
    aMatch.base_guesses = aMatch.rank;
    aMatch.uppercase_variations = this.uppercaseVariations(aMatch);
    aMatch.l33t_variations = this.l33tVariations(aMatch);
    const reversed_variations = aMatch.reversed && 2 || 1;
    return aMatch.base_guesses * aMatch.uppercase_variations * aMatch.l33t_variations * reversed_variations;
  }

  uppercaseVariations(aMatch) {
    const word = aMatch.token;
    if (word.match(this.ALL_LOWER) || word.toLowerCase() === word) {
      return 1;
    }

    if (word.match(this.START_UPPER)
        || word.match(this.END_UPPER)
        || word.match(this.ALL_UPPER)) {
      return 2;
    }

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

  l33tVariations(aMatch) {
    if (!aMatch.l33t) {
      return 1;
    }

    let variations = 1;
    const chrs = aMatch.token.toLowerCase().split('');
    for (let subbed in aMatch.sub) {
      const unsubbed = aMatch.sub[subbed];
      const S = chrs.filter(c => c == subbed).length;
      const U = chrs.filter(c => c == unsubbed).length;

      if (!S || !U) {
        variations *= 2;
      } else {
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
