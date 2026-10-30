// Ukrainian. strings.js maps the Chinese source text to Ukrainian; entries here need code.
import strings from './strings.js';

// Countries whose names are written family name first.
const SURNAME_FIRST = new Set(['CN', 'JP', 'KR', 'VN', 'HU', 'TW', 'HK']);
// Russian and Polish surnames take a feminine ending for women.
const feminine = (surname, country) => country === 'RU' ? surname.replace(/(ов|ев|єв|ін|ин)$/, '$1а')
  : country === 'PL' ? surname.replace(/([сц])ький$/, '$1ька').replace(/([сц])кий$/, '$1ка') : surname;

export default {
  ...strings,
  '{surname}{given}': ({ surname, given, country, sex }) => {
    const family = sex === '女' ? feminine(surname, country) : surname;
    return SURNAME_FIRST.has(country) ? `${family} ${given}` : `${given} ${family}`;
  },
};
