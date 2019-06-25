# zxcvbn-pv
  A 2019 version of zxcvbn, directly written in a more modern JavaScript, not transpiled from CoffeeScript. Work done by [Privowny](https://privowny.io/).

**Warning** this is a work in progress and must not be used in production (yet)

Demo at http://glazman.org/zxcvbn-pv/demo.html

Bonuses:

1. localized in english and french (see locales.js)
2. internationalized (see frequency_lists.js for dictionaries and adjacency_graphs.js for keyboards). AZERTY fr-FR keyboard added. fr-FR ordered list of names and surnames added.
3. checks password against HaveIBeenPwned before calling original zxcvbn matching/scoring. Reports a -1 score if password has leaked.
4. cleaner JS

TODO: frequency lists from fr-FR Wikipedia
