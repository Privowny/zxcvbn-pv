/*
 * @CLASS Scoring class for zxcvbn-pv
 */
class ZxcvbnMatching {

  /*
   * @constructor
   *
   * @param {ZxcvnFrequencyLists} aFrequencyLists
   * @param {ZxcvbnAdjacencyGraphs} aAdjacencyGraphs
   * @param {ZxcvbnScoring} aScoring
   */
  constructor(aFrequencyLists, aAdjacencyGraphs, aScoring) {
    this.frequencyLists = aFrequencyLists;
    this.adjacencyGraphs = aAdjacencyGraphs;
    this.scoring = aScoring;

    this.RANKED_DICTIONARIES = {};
    const frequencyLists = this.frequencyLists.getListsForLocale(navigator.language, "en");
    for (name in frequencyLists) {
      const lst = frequencyLists[name].split(',');
      this.RANKED_DICTIONARIES[name] = this.buildRankedDict(lst);
    }

    this.GRAPHS = {
      qwerty:     this.adjacencyGraphs.qwerty,
      dvorak:     this.adjacencyGraphs.dvorak,
      azerty:     this.adjacencyGraphs.azerty,
      keypad:     this.adjacencyGraphs.keypad,
      mac_keypad: this.adjacencyGraphs.mac_keypad
    };

    this.ALPHABETICAL_GRAPHS = [ "qwerty", "azerty", "dvorak"];

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

    this.SHIFTED_RX = /[~!@#$%^&*()_+QWERTYUIOP{}|ASDFGHJKL:"ZXCVBNM<>?]/;

    this.MAX_DELTA = 5;
  }

  /*
   * @param {Array} aOrderedList
   * @returns {Object}
   */
  buildRankedDict(aOrderedList) {
    const rv = {};
    for (let i = 0; i < aOrderedList.length; i++) {
      // # rank starts at 1, not 0
      rv[ aOrderedList[i] ] = i + 1;
    }

    return rv;
  }

  /*
   * @param {Object} aObj
   * @returns {boolean}
   */
  empty(aObj) {
    return !aObj || !Object.keys(aObj).length;
  }

  /*
   * @param {Array} aList1
   * @param {Array} aList2
   * @returns {Array}
   */
  extend (aList1, aList2) {
    return aList1.push.apply(aList1, aList2);
  }

  /*
   * @param {string} aString
   * @param {Array} aCharMap
   * @returns {string}
   */
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

  /*
   * @param {number} aN
   * @param {number} aM
   * @returns {number}
   */
  mod(aN, aM) {
    // # mod impl that works for negative numbers
    return ((aN % aM) + aM) % aM;
  }

  /*
   * @param {Array} aMatches
   * @returns {Array}
   */
  sorted(aMatches) {
    return aMatches.sort((m1, m2) => {
      // sort on i primary, j secondary
      return (m1.i - m2.i) || (m1.j - m2.j);
    });
  }

  // ------------------------------------------------------------------------------
  // omnimatch -- combine everything ----------------------------------------------
  // ------------------------------------------------------------------------------
  /*
   * @param {string} aPassword
   * @returns {Array}
   */
  omnimatch(aPassword) {
    const matchers = [
      this.dictionaryMatch,
      this.reverseDictionaryMatch,
      this.l33tMatch,
      this.spatialMatch,
      this.repeatMatch,
      this.sequenceMatch,
      this.regexMatch,
      this.dateMatch
    ];

    const matches = [];
    matchers.forEach((aMatcher) => {
      try {
        this.extend(matches, aMatcher.call(this, aPassword));
      } catch(e) {
        console.error("ZxcvbnMatching:omnimatch: " + e);
      }
    });

    return this.sorted(matches);
  }

  // -------------------------------------------------------------------------------
  //  dictionary match (common passwords, english, last names, etc) ----------------
  // -------------------------------------------------------------------------------
  /*
   * @param {string} aPassword
   * @param {Object} aRankedDictionaries
   * @returns {Array}
   */
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
              token:           aPassword.slice(i, j + 1),
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

  /*
   * @param {Array} aOrderedList
   *
   */
  setUserInputDictionary(aOrderedList) {
    this.RANKED_DICTIONARIES['user_inputs'] = this.buildRankedDict(aOrderedList.slice());
  }

  /*
   * @param {string} aPassword
   * @param {Object} aRankedDictionaries
   * @returns {Array}
   */
  reverseDictionaryMatch(aPassword, aRankedDictionaries) {
    if (!aRankedDictionaries)
      aRankedDictionaries = this.RANKED_DICTIONARIES;

    const reversedPassword = aPassword.split('').reverse().join('');
    const matches = this.dictionaryMatch(reversedPassword, aRankedDictionaries);
    matches.forEach((aMatch) => {
      //  # reverse back
      aMatch.token = aMatch.token.split('').reverse().join('');
      aMatch.reversed = true;
      // map coordinates back to original string
      aMatch.i = aPassword.length - 1 - aMatch.j;
      aMatch.j = aPassword.length - 1 - aMatch.i;
    });

    return this.sorted(matches);
  }

  /*
   * @param {string} aPassword
   * @param {Object} aRankedDictionaries
   * @returns {Array}
   */
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
        for (let subbedChar in sub) {
          const chr = sub[subbedChar];
          if (token.indexOf(subbedChar) != -1) {
            matchSub[subbedChar] = chr;
          }
        }

        match.l33t = true;
        match.token = token;
        match.sub = matchSub;
        let subDisplay = [];
        for (let k in matchSub) {
          subDisplay.push(k + " -> " + matchSub[k]);
        }

        match.sub_display = subDisplay.join(", ");
        matches.push(match);
      }
    }

    return this.sorted(matches.filter(function(aMatch) {
      return aMatch.token.length > 1;
    }));
  }

  // makes a pruned copy of l33t_table that only includes password's possible substitutions
  /*
   * @param {string} aPassword
   * @param {Object} aTable
   * @returns {Object}
   */
  relevantL33tSubtable(aPassword, aTable) {
    const passwordChars = {};
    for (let i = 0; i < aPassword.length; i++) {
      passwordChars[aPassword[i]] = true;
    }

    const subtable = {};
    for (let letter in aTable) {
      const subs = aTable[letter];
      const relevantSubs = [];

      for (let p = 0; p < subs.length; p++) {
        const sub = subs[p];
        if (passwordChars[sub]) {
          relevantSubs.push(sub);
        }
      }

      if (relevantSubs.length) {
        subtable[letter] = relevantSubs;
      }
    }

    return subtable;
  }

  // returns the list of possible 1337 replacement dictionaries for a given password
  /*
   * @param {Object} aTable
   * @returns {Array}
   */
  enumerateL33tSubs(aTable) {
    const keys = Object.keys(aTable);
    let subs = [[]];

    const dedup = (aSubs) => {
      const deduped = [];
      const members = {};

      for (let i = 0; i < aSubs.length; i++) {
        const sub = aSubs[i];
        const assoc = Object.entries(sub).sort();

        const labelChunks = [];
        assoc.forEach((aEntry) => { labelChunks.push(aEntry[0] + "," + aEntry[1]); });
        const label = labelChunks.join("-");

        if (!(label in members)) {
          members[label] = true;
          deduped.push(sub);
        }
      }

      return deduped;
    }

    const helper = (aKeys) => {
      if (!aKeys.length)
        return;

      const firstKey = aKeys[0];
      const restKeys = aKeys.slice(1);
      const nextSubs = [];

      const ref = aTable[firstKey];
      for (let i = 0; i < ref.length; i++) {
        const l33tChar = ref[i];
        for (let j = 0; j < subs.length; j++) {
          const sub = subs[j];
          let dupL33tIndex = -1;
          for (let k = 0; k < sub.length; k++) {
            if (sub[k][0] == l33tChar) {
              dupL33tIndex = k;
              break;
            }
          }

          if (dupL33tIndex == -1) {
            nextSubs.push( sub.concat([[l33tChar, firstKey]]) );
          } else {
            let sub_alternative = sub.slice(0);
            sub_alternative.splice(dupL33tIndex, 1);
            sub_alternative.push([l33tChar, firstKey]);
            nextSubs.push(sub);
            nextSubs.push(sub_alternative);
          }
        }
      }

      subs = dedup(nextSubs);
      return helper(restKeys);
    }

    helper(keys);

    // # convert from assoc lists to dicts
    const subDicts = [];
    subs.forEach((sub) => {
      const subDict = {};
      for (let j = 0; j < sub.length; j++) {
        const l33tChar = sub[j][0];
        const char = sub[j][1];
        subDict[l33tChar] = char;
      }

      subDicts.push(subDict);
    });

    return subDicts;
  }


  // ------------------------------------------------------------------------------
  // spatial match (qwerty/dvorak/keypad) -----------------------------------------
  // ------------------------------------------------------------------------------
  /*
   * @param {string} aPassword
   * @param {Object | null} aGraphs
   * @returns {Array}
   */
  spatialMatch(aPassword, aGraphs) {
    if (!aGraphs)
      aGraphs = this.GRAPHS;

    const matches = [];
    for (let graphName in aGraphs) {
      this.extend(
        matches,
        this.spatialMatchHelper(aPassword, aGraphs[graphName], graphName)
      );
    }

    return this.sorted(matches);
  }

  spatialMatchHelper(aPassword, aGraph, aGraphName) {
    const matches = [];
    let i = 0;

    let adj, adjacents, curChar, curDirection, found, foundDirection, j, lastDirection, len1, o, prevChar, shiftedCount, turns;

    while (i < aPassword.length - 1) {
      j = i + 1;
      lastDirection = null;
      turns = 0;

      shiftedCount =  (this.ALPHABETICAL_GRAPHS.includes(aGraphName)
                       && this.SHIFTED_RX.exec(aPassword.charAt(i)))
                      ? 1
                      : 0;

      while (true) {
        prevChar = aPassword.charAt(j - 1);
        found = false;
        foundDirection = -1;
        curDirection = -1;
        adjacents = aGraph[prevChar] || [];
        if (j < aPassword.length) {
          curChar = aPassword.charAt(j);
          for (o = 0, len1 = adjacents.length; o < len1; o++) {
            adj = adjacents[o];
            curDirection += 1;
            if (adj && adj.indexOf(curChar) !== -1) {
              found = true;
              foundDirection = curDirection;
              if (adj.indexOf(curChar) === 1) {
                shiftedCount += 1;
              }
              if (lastDirection !== foundDirection) {
                turns += 1;
                lastDirection = foundDirection;
              }
              break;
            }
          }
        }
        if (found) {
          j += 1;
        } else {
          if (j - i > 2) {
            matches.push({
              pattern:       "spatial",
              i:             i,
              j:             j - 1,
              token:         aPassword.slice(i, j),
              graph:         aGraphName,
              turns:         turns,
              shifted_count: shiftedCount
            });
          }
          i = j;
          break;
        }
      }
    }
    return matches;
  }

  repeatMatch(aPassword) {
    const matches = [];
    const greedy = /(.+)\1+/g;
    const lazy = /(.+?)\1+/g;
    const lazyAnchored = /^(.+?)\1+$/;
    let lastIndex = 0;

    while (lastIndex < aPassword.length) {
      lazy.lastIndex = lastIndex;
      greedy.lastIndex = lastIndex;

      const greedyMatch = greedy.exec(aPassword);
      const lazyMatch   = lazy.exec(aPassword);

      if (!greedyMatch) {
        break;
      }

      let baseToken;
      if (greedyMatch[0].length > lazyMatch[0].length) {
        match = greedyMatch;
        baseToken = lazyAnchored.exec(match[0])[1];
      } else {
        match = lazyMatch;
        baseToken = match[1];
      }

      const baseAnalysis = this.scoring.mostGuessableMatchSequence(baseToken, this.omnimatch(baseToken));
      const baseMatches = baseAnalysis.sequence;
      const baseGuesses = baseAnalysis.guesses;

      matches.push({
        pattern:      "repeat",
        i:            match.index,
        j:            match.index + match[0].length - 1,
        token:        match[0],
        base_token:   baseToken,
        base_guesses: baseGuesses,
        base_matches: baseMatches,
        repeat_count: match[0].length / baseToken.length
      });
    }
  }

  sequenceMatch(aPassword) {
    if (aPassword.length === 1) {
      return [];
    }

    const update = (i, j, delta) => {
      const ref = Math.abs(delta);

      if (j - i > 1 || ref === 1) {
        if ((0 < ref && ref <= this.MAX_DELTA)) {
          const token = aPassword.slice(i, +j + 1 || 9e9);
          let sequenceName, sequenceSpace;

          if (/^[a-z]+$/.test(token)) {
            sequenceName = 'lower';
            sequenceSpace = 26;
          } else if (/^[A-Z]+$/.test(token)) {
            sequenceName = 'upper';
            sequenceSpace = 26;
          } else if (/^\d+$/.test(token)) {
            sequenceName = 'digits';
            sequenceSpace = 10;
          } else {
            sequenceSpace = 'unicode';
            sequenceSpace = 26;
          }

          return result.push({
            pattern:        "sequence",
            i:              i,
            j:              j,
            token:          aPassword.slice(i, +j + 1 || 9e9),
            sequence_name:  sequenceSpace,
            sequence_space: sequenceSpace,
            ascending:      delta > 0
          });
        }
      }
    }

    const result = [];
    let i = 0;
    let lastDelta = null;

    for (let k = 0; k < aPassword.length; k++) {
      const delta = aPassword.charCodeAt(k) - aPassword.charCodeAt(k - 1);
      if (lastDelta == null) {
        lastDelta = delta;
      }

      if (delta === lastDelta) {
        continue;
      }

      const j = k - 1;
      update(i, j, lastDelta);
      i = j;
      lastDelta = delta;
    }

    update(i, aPassword.length - 1, lastDelta);
    return result;
  }

  regexMatch(aPassword, aRegExps) {
    if (aRegExps == null) {
      aRegExps = this.REGEXEN;
    }

    const matches = [];

    for (let name in aRegExps) {
      const r = aRegExps[name];
      r.lastIndex = 0;
      let match;
      while (match = r.exec(aPassword)) {
        const token = match[0];
        matches.push({
          pattern:    "regex",
          token:       token,
          i:           match.index,
          j:           match.index + match[0].length - 1,
          regex_name:  name,
          regex_match: match
        });
      }
    }

    return this.sorted(matches);
  }

  dateMatch(aPassword) {
    const matches = [];
    const maybeDateNoSeparator = /^\d{4,8}$/;
    const maybeDateWithSeparator = /^(\d{1,4})([\s\/\\_.-])(\d{1,2})\2(\d{1,4})$/;

    for (let i = 0; i <= aPassword.length - 4; i++) {
      for (let j = i + 3; j <= i +7; j++) {
        if (j >= aPassword.length) {
          break;
        }

        const token = aPassword.slice(i, j + 1);
        if (!maybeDateNoSeparator.exec(token)) {
          continue;
        }

        const candidates = [];
        const dateSplit = this.DATE_SPLITS[token.length];
        for (let q = 0; q < dateSplit.length; q++) {
          const k = dateSplit[q][0];
          const l = dateSplit[q][1];

          const dmy = this.mapIntsToDmy([
            parseInt(token.slice(0, k)),
            parseInt(token.slice(k, l)),
            parseInt(token.slice(l))
          ]);

          if (dmy != null) {
            candidates.push(dmy);
          }
        }

        if (!(candidates.length > 0)) {
          continue;
        }

        let bestCandidate = candidates[0];

        function metric(aCandidate) {
          return Math.abs(aCandidate.year - this.scoring.REFERENCE_YEAR);
        }

        let minDistance = metric(candidates[0]);
        const otherCandidates = candidates.splice(1);

        for (let q = 0; q < otherCandidates.length; q++) {
          const candidate = otherCandidates[q];
          const distance = metric(candidate);
          if (distance < minDistance) {
            bestCandidate = candidate[0];
            minDistance   = candidate[1];
          }
        }

        matches.push({
          pattern:   "date",
          token:     token,
          i:         i,
          j:         j,
          separator: '',
          year:      bestCandidate.year,
          month:     bestCandidate.month,
          day:       bestCandidate.day
        });
      }
    }

    for (let i = 0; i <= aPassword.length - 6; i++) {
      for (let j = i + 5; j <= i + 9; j++) {
        if (j >= aPassword.length) {
          break;
        }

        const token = aPassword.slice(i, j + 1);
        const match = maybeDateWithSeparator.exec(token);
        if (!match) {
          continue;
        }

        const dmy = this.mapIntsToDmy([
          parseInt(match[1]),
          parseInt(match[3]),
          parseInt(match[4])
        ]);

        if (dmy == null) {
          continue;
        }

        matches.push({
          pattern:   "date",
          token:     token,
          i:         i,
          j:         j,
          separator: match[2],
          year:      dmy.year,
          month:     dmy.month,
          day:       dmy.day
        });
      }
    }

    return this.sorted(matches.filter((aMatch) => {
      for (let i = 0; i < matches.length; i++) {
        const otherMatch = matches[u];
        if (match == otherMatch) {
          continue;
        }

        if (otherMatch.i <= aMatch.i
            && otherMatch.j >= aMatch.j) {
          return false;
        }
      }

      return true;
    }));
  }

  mapIntsToDmy(aInts) {
    if (aInts[1] > 31 || aInts[1] <= 0) {
      return;
    }

    let over12 = 0, over31 = 0, under1 = 0;
    for (let i = 0; i < aInts.length; i++) {
      const intValue = aInts[i];

      if (intValue > this.DATE_MAX_YEAR
          || (intValue > 99
              && intValue < this.DATE_MIN_YEAR)) {
        return;
      }

      if (intValue > 31)
        over31++;
      if (intValue > 12)
        over12++;
      if (intValue <= 0)
        under1++;
    }

    if (over31 >= 2
        || over12 == 3
        || under1 >= 2) {
      return;
    }

    const possibleYearSplits = [
      [aInts[2], aInts.slice(0, 2)],
      [aInts[0], aInts.slice(1, 3)]
    ];

    for (let i = 0; i < possibleYearSplits.length; i++) {
      const y = possibleYearSplits[i][0];
      const rest = possibleYearSplits[i][1];

      if (y >= this.DATE_MIN_YEAR && y <= this.DATE_MAX_YEAR) {
        const dm = this.mapIntsToDm(rest);
        if (dm != null) {
          return {
            year:  y,
            month: dm.month,
            day:   dm.day
          };
        } else {
          return;
        }
      }
    }

    for (let i = 0; i < possibleYearSplits.length; i++) {
      const y = possibleYearSplits[i][0];
      const rest = possibleYearSplits[i][1];

      const dm = this.mapIntsToDm(rest);
      if (dm != null) {
        y = this.twoToFourDigitYear(y);
        return {
          year:  y,
          month: dm.month,
          day:   dm.day
        };
      }
    }
  }

  mapIntsToDm(aInts) {
    const ref = [ aInts, Array.from(aInts).reverse() ];
    for (let i = 0; i < ref.length; i++) {
      const d = ref[i][0];
      const m = ref[i][1];

      if ((d >= 1 && d <= 31)
          && (m >= 1 && m <= 12)) {
        return {
          day:   d,
          month: m
        };
      }
    }

    return null;
  }

  twoToFourDigitYear(aYear) {
    if (aYear > 99) {
      return aYear;
    }

    if (aYear > 50) {
      return aYear + 1900;
    }

    return aYear + 2000;
  }
}
