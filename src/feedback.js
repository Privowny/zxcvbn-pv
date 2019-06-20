
class ZxcvbnFeedback {

  get kNO_SUGGESTION_SCORE_THRESHOLD() { return 2; }

  constructor(aScoring) {
    this.scoring = aScoring;
  }

  buildFeedback(aWarning, aSuggestions) {
    const rv = {
      warning: aWarning ? aWarning.toString() : "",
      suggestions: []
    };

    if (!aSuggestions)
      return rv;

    if (Array.isArray(aSuggestions)) {
      rv.suggestions = [...aSuggestions];
      return rv;
    }

    rv.suggestions = [ aSuggestions.toString() ];
    return rv;
  }

  getFeedback(aScore, aSequence) {
    if (typeof aScore !== "number" || !Array.isArray(aSequence)) {
      throw "ZxcvbnFeedback:getFeedback: wrong argument type";
    }

    if (!aSequence.length) {
      return this.buildFeedback("", ["useFewWords", "noSymbolsNeeded"]);
    }

    if (aScore > this.kNO_SUGGESTION_SCORE_THRESHOLD) {
      return this.buildFeedback();
    }

    const longestMatch = aSequence[0];
    const ref = aSequence.slice(1);

    ref.forEach(aMatch => {
      if (aMatch.token.length > longestMatch.token.length)
        longestMatch = aMatch;
    });

    const feedback = this.getMatchFeedback(longestMatch, aSequence.length === 1);
    const extraFeedback = "moreWords";

    if (feedback != null) {
      feedback.suggestions.unshift(extraFeedback);
      if (feedback.warning == null) {
        feedback.warning = "";
      }
      return feedback;
    }

    return this.buildFeedback("", extraFeedback);
  }

  getMatchFeedback(aMatch, aIsSoleMatch) {
    switch (aMatch.pattern) {
      case "dictionary":
        return this.getDictionaryMatchFeedback(aMatch, aIsSoleMatch);

      case "spatial":
        return this.buildFeedback(
            aMatch.turns === 1 ? "straightKeyRows" : "shortKeyboardPatterns",
            "longerKeyboardPattern"
          );

      case "repeat":
        return this.buildFeedback(
            aMatch.base_token.length === 1 ? "aaaRepeats" : "abcabcRepeats",
            "longerKeyboardPattern"
          );

      case "sequence":
        return this.buildFeedback("sequencesTooEasy", "avoidSequences");

      case "regex":
        if (aMatch.regex_name === 'recent_year') {
          return this.buildFeedback("recentYearsTooEasy", "avoidRecentYears");
        }

      case "date":
        return this.buildFeedback("datesTooEasy", "avoidDates");

      default: break;
    }
  }

  getDictionaryMatchFeedback(aMatch, aIsSoleMatch) {
    let warning = "";
    switch (aMatch.dictionaryName) {
      case "passwords":
        if (aIsSoleMatch && !aMatch.l33t && !aMatch.reversed) {
          if (aMatch.rank < 10)
            warning = "top10Password";
          else if (aMatch.rank < 100)
            warning = "top100Password";
          else
            warning = "veryCommonPassword";
        } else if (aMatch.guessesLog10 <= 4) {
          warning = "commonPassword;"
        }
        break;

      case "english_wikipedia":
        if (aIsSoleMatch) {
          warning = "soleWordTooEasy";
        }
        break;

      case "surnames":
      case "male_names":
      case "female_names":
        warning = aIsSoleMatch ? "loneNameTooEasy" : "commonNameTooEasy";
        break;

      default: break;
    }

    const suggestions = [];
    const word = aMatch.token;

    if (word.match(this.scoring.START_UPPER)) {
      suggestions.push("capitizalizationTooEasy");
    } else if (word.match(this.scoring.ALL_UPPER)
               && word.toLowerCase() !== word) {
      suggestions.push("allUpperCase");
    }

    if (aMatch.reversed && aMatch.token.length >= 4) {
      suggestions.push("reversedWordsTooEasy");
    }

    if (aMatch.l33t) {
      suggestions.push("predictableSubstitutions");
    }

    return this.buildFeedback(warning, suggestions);
  }
}
