class ZxcvbnL10N {
  constructor(aLocale) {
    switch (aLocale) {
      case "fr": this.locale = {
        useFewWords: "Utilisez quelques mots, évitez les phrases communes.",
        noSymbolsNeeded: "Inutile d'utiliser des chiffres, symboles ou majuscules.",
        moreWords: "Ajoutez un mot ou deux. Préférez les mots rares.",
        straightKeyRows: "Des rangées de caractères sur le clavier sont faciles à deviner.",
        shortKeyboardPatterns: "Des caractères contigus sur le clavier sont facile à deviner.",
        longerKeyboardPattern: "Utilisez plus de caractères moins contigus.",
        aaaRepeats: "Des répétitions telles que 'aaa' sont faciles à deviner.",
        abcabcRepeats: "Une répétition telle que 'abcabcabc' est à peine plus sûre que 'abc'.",
        repeatedWords: "Évitez les mots ou caractères répétés.",
        sequencesTooEasy: "Les séquences telles que 'abc' ou '6543' sont faciles à deviner.",
        avoidSequences: "Évitez les séquences.",
        recentYearsTooEasy: "Les années récentes sont faciles à deviner.",
        avoidRecentYears: "Évitez les années récentes.",
        datesTooEasy: "Les dates sont faciles à deviner.",
        avoidDates: "Évitez les dates et années facilement associables à votre personne.",
        top10Password: "C'est un des 10 mots de passe les plus courants !",
        top100Password: "C'est un des 100 mots de passe les plus courants !",
        veryCommonPassword: "C'est un mot de passe très commun.",
        commonPassword: "C'est trop similaire à un mot de passe très commun.",
        soleWordTooEasy: "Un mot seul est bien trop facile à deviner.",
        loneNameTooEasy: "Un prénom ou nom seul est trop facile à deviner.",
        commonNameTooEasy: "Les prénoms ou noms les plus communs sont faciles à deviner.",
        capitizalizationTooEasy: "Les majuscules n'aident pas beaucoup.",
        allUpperCase: "Tout en majuscules est aussi facile à deviner que tout en minuscules.",
        reversedWordsTooEasy: "Écrire à l'envers n'augmente pas la sûreté.",
        predictableSubstitutions: "Des substitutions prévisibles comme '@' pour 'a' n'aident pas vraiment.",

        leaked: "Ce mot de passe a été piraté, il est compromis. Choisissez-en un autre.",

        lessThanASecond: "Moins d'une seconde...",
        second: "seconde",
        seconds: "secondes",
        minute: "minute",
        minutes: "minutes",
        hour: "heure",
        hours: "heures",
        day: "jour",
        days: "jours",
        month: "mois",
        months: "mois",
        year: "année",
        years: "années",
        century: "un siècle",
        centuries: "des siècles"
      };
      break;

      default: this.locale = {
        useFewWords: "Use a few words, avoid common phrases.",
        noSymbolsNeeded: "No need for symbols, digits, or uppercase letters.",
        moreWords: "Add another word or two. Uncommon words are better.",
        straightKeyRows: "Straight rows of keys are easy to guess.",
        shortKeyboardPatterns: "Short keyboard patterns are easy to guess.",
        longerKeyboardPattern: "Use a longer keyboard pattern with more turns.",
        aaaRepeats: "Repeats like 'aaa' are easy to guess.",
        abcabcRepeats: "Repeats like 'abcabcabc' are only slightly harder to guess than 'abc'.",
        repeatedWords: "Avoid repeated words and characters.",
        sequencesTooEasy: "Sequences like 'abc' or '6543' are easy to guess.",
        avoidSequences: "Avoid sequences.",
        recentYearsTooEasy: "Recent years are easy to guess.",
        avoidRecentYears: "Avoid recent years.",
        datesTooEasy: "Dates are often easy to guess.",
        avoidDates: "Avoid dates and years that are associated with you.",
        top10Password: "This is a top-10 common password.",
        top100Password: "This is a top-100 common password!",
        veryCommonPassword: "This is a very common password!",
        commonPassword: "This is similar to a commonly used password.",
        soleWordTooEasy: "A word by itself is easy to guess.",
        loneNameTooEasy: "Names and surnames by themselves are easy to guess.",
        commonNameTooEasy: "Common names and surnames are easy to guess.",
        capitizalizationTooEasy: "Capitalization doesn't help very much.",
        allUpperCase: "All-uppercase is almost as easy to guess as all-lowercase.",
        reversedWordsTooEasy: "Reversed words aren't much harder to guess.",
        predictableSubstitutions: "Predictable substitutions like '@' instead of 'a' don't help very much.",

        leaked: "This password has been hacked, it is not safe. Please choose another one.",

        lessThanASecond: "Less than a second...",
        second: "second",
        seconds: "seconds",
        minute: "minute",
        minutes: "minutes",
        hour: "hour",
        hours: "hours",
        day: "day",
        days: "days",
        month: "month",
        months: "months",
        year: "year",
        years: "years",
        century: "century",
        centuries: "centuries"
      };
      break;
    }
  }

  localize(aKey) {
    return aKey in this.locale ? this.locale[aKey] : aKey;
  }
}

