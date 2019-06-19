export class ZxcvbnMatching {

  constructor(aFrequencyLists, aAdjacencyGraphs, aScoring) {
    this.frequencyLists = aFrequencyLists;
    this.adjacencyGraphs = aAdjacencyGraphs;
    this.scoring = aScoring;

    this.RANKED_DICTIONARIES = {};
    const frequencyLists = this.frequencyLists.getListsForLocale(navigator.language, "en");
    for (name in frequencyLists) {
      const lst = frequencyLists[name].split(',');
      RANKED_DICTIONARIES[name] = this.buildRankedDict(lst);
    }

    this.GRAPHS = {
      qwerty:     this.adjacency_graphs.qwerty,
      dvorak:     this.adjacency_graphs.dvorak,
      azerty:     this.adjacency_graphs.azerty,
      keypad:     this.adjacency_graphs.keypad,
      mac_keypad: this.adjacency_graphs.mac_keypad
    };

    this.L33T_TABLE = {
      a: ['4', '@'],
      b: ['8'],
      c: ['(', '{', '[', '<'],
      e: ['3'],
      g: ['6', '9'],
      i: ['1', '!', '|'],
      l: ['1', '|', '7'],
      o: ['0'],
      s: ['$', '5'],
      t: ['+', '7'],
      x: ['%'],
      z: ['2']
    };

    this.REGEXEN = {
      recent_year: /19\d\d|200\d|201\d/g
    };

    this.DATE_MAX_YEAR = 2050;
    this.DATE_MIN_YEAR = 1000;

    this.DATE_SPLITS = {
      4: [[1, 2], [2, 3]],
      5: [[1, 3], [2, 3]],
      6: [[1, 2], [2, 4], [4, 5]],
      7: [[1, 3], [2, 3], [4, 5], [4, 6]],
      8: [[2, 4], [4, 6]]
    };
  }

  buildRankedDict(aOrderedList) {
    const rv = {};
    for (let i = 0; i < aOrderedList.length; i++) {
      rv[ aOrderedList[i] ] = i + 1;
    }

    return rv;
  }

  empty(aObj) {
    return (Object.keys(aObj).length === 0);
  }

  extend (aList1, aList2) {
    return aList1.push.apply(aList1, aList2);
  }

  translate(aString, aCharMap) {
    let rv = "";
    for (let i = 0; i < aString.length; i++) {
      const chr = aString[i];
      const replacement = aCharMap[chr]
      if (replacement) {
        rv += replacement;
      } else {
        rv += chr;
      }
    }

    return rv;
  }

  mod(aN, aM) {
    return ((aN % aM) + aM) % aM;
  }

  sorted(aMatches) {
    return aMatches.sort((m1, m2) => {
      return (m1.i - m2.i) || (m1.j - m2.j);
    });
  }

  omnimatch(aPassword) {
    const matchers = [
      this.dictionaryMatch,
      this.reverseDictionaryMatch,
      this.l33tMatch,
      this.spatial_match,
      this.repeat_match,
      this.sequence_match,
      this.regex_match,
      this.date_match
    ];

    const matches = [];
    matchers.forEach((aMatcher) => {
      try {
        this.extend(matches, aMatcher.call(this, aPassword));
      } catch(e) {}
    });

    return this.sorted(matches);
  }

  dictionaryMatch(aPassword, aRankedDictionaries) {
    if (!aRankedDictionaries)
      aRankedDictionaries = this.RANKED_DICTIONARIES;

    const matches = [];
    const len = aPassword.length;
    const lowercasePassword = aPassword.toLowerCase();

    for (let dictionaryName in aRankedDictionaries) {
      const rankedDict = aRankedDictionaries[dictionaryName];
      for (let i = 0; i < len; i++) {
        for (let j = i; j < len; j++) {
          const word = lowercasePassword.slice(i, j + 1);
          if (word && word in rankedDict) {
            const rank = rankedDict[word];
            matches.push( {
              pattern:        "dictionary",
              i:               i,
              j:               j,
              token:           password.slice(i, j + 1),
              matched_word:    word,
              rank:            rank,
              dictionary_name: dictionaryName,
              reversed:        false,
              l33t:            false
            } );
          }
        }
      }
    }

    return this.sorted(matches);
  }

  setUserInputDictionary: function(aOrderedList) {
    return RANKED_DICTIONARIES['user_inputs'] = buildRankedDict(aOrderedList.slice());
  }

  reverseDictionaryMatch(aPassword, aRankedDictionaries) {
    if (!aRankedDictionaries)
      aRankedDictionaries = this.RANKED_DICTIONARIES;

    const reversedPassword = aPassword.split('').reverse().join('');
    const matches = this.dictionaryMatch(reversedPassword, aRankedDictionaries);
    matches.forEach((aMatch) => {
      aMatch.token = aMatch.token.split('').reverse().join('');
      aMatch.reversed = true;
      aMatch.i = aPassword.length - 1 - aMatch.j;
      aMatch.j = aPassword.length - 1 - aMatch.i;
    });

    return this.sorted(matches);
  }

  l33tMatch(aPassword, aRankedDictionaries, aL33tTable) {
    if (!aRankedDictionaries)
      aRankedDictionaries = this.RANKED_DICTIONARIES;

    if (aL33tTable == null) {
      aL33tTable = this.L33T_TABLE;
    }

    const matches = [];
    const ref = this.enumerateL33tSubs(this.relevantL33tSubtable(aPassword, aL33tTable));
    for (let i = 0; i < ref.length; i++) {
      const sub = ref[i];
      if (this.empty(sub)) {
        break;
      }

      const subbedPassword = this.translate(aPassword, sub);
      const newRef = this.dictionaryMatch(subbedPassword, aRankedDictionaries);
      for (let j = 0; j < newRef.length; j++) {
        const match = newRef[j];
        const token = aPassword.slice(match.i, match.j + 1);
        if (token.toLowerCase() === match.matched_word) {
          continue;
        }

        const matchSub = {};
        // XXX
      }
    }
  }
}



























