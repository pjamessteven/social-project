/**
 * Country data utility with ISO 3166-1 alpha-2 country codes, names, and flag emojis
 */

export interface CountryData {
  code: string; // ISO 3166-1 alpha-2 country code
  name: string; // Full country name
  emoji: string; // Flag emoji
}

/**
 * Comprehensive list of countries with codes, names, and flag emojis
 * Sorted alphabetically by country name
 */
export const COUNTRIES: CountryData[] = [
  { code: "AF", name: "Afghanistan", emoji: "🇦🇫" },
  { code: "AL", name: "Albania", emoji: "🇦🇱" },
  { code: "DZ", name: "Algeria", emoji: "🇩🇿" },
  { code: "AS", name: "American Samoa", emoji: "🇦🇸" },
  { code: "AD", name: "Andorra", emoji: "🇦🇩" },
  { code: "AO", name: "Angola", emoji: "🇦🇴" },
  { code: "AI", name: "Anguilla", emoji: "🇦🇮" },
  { code: "AQ", name: "Antarctica", emoji: "🇦🇶" },
  { code: "AG", name: "Antigua and Barbuda", emoji: "🇦🇬" },
  { code: "AR", name: "Argentina", emoji: "🇦🇷" },
  { code: "AM", name: "Armenia", emoji: "🇦🇲" },
  { code: "AW", name: "Aruba", emoji: "🇦🇼" },
  { code: "AU", name: "Australia", emoji: "🇦🇺" },
  { code: "AT", name: "Austria", emoji: "🇦🇹" },
  { code: "AZ", name: "Azerbaijan", emoji: "🇦🇿" },
  { code: "BS", name: "Bahamas", emoji: "🇧🇸" },
  { code: "BH", name: "Bahrain", emoji: "🇧🇭" },
  { code: "BD", name: "Bangladesh", emoji: "🇧🇩" },
  { code: "BB", name: "Barbados", emoji: "🇧🇧" },
  { code: "BY", name: "Belarus", emoji: "🇧🇾" },
  { code: "BE", name: "Belgium", emoji: "🇧🇪" },
  { code: "BZ", name: "Belize", emoji: "🇧🇿" },
  { code: "BJ", name: "Benin", emoji: "🇧🇯" },
  { code: "BM", name: "Bermuda", emoji: "🇧🇲" },
  { code: "BT", name: "Bhutan", emoji: "🇧🇹" },
  { code: "BO", name: "Bolivia", emoji: "🇧🇴" },
  { code: "BA", name: "Bosnia and Herzegovina", emoji: "🇧🇦" },
  { code: "BW", name: "Botswana", emoji: "🇧🇼" },
  { code: "BV", name: "Bouvet Island", emoji: "🇧🇻" },
  { code: "BR", name: "Brazil", emoji: "🇧🇷" },
  { code: "IO", name: "British Indian Ocean Territory", emoji: "🇮🇴" },
  { code: "BN", name: "Brunei Darussalam", emoji: "🇧🇳" },
  { code: "BG", name: "Bulgaria", emoji: "🇧🇬" },
  { code: "BF", name: "Burkina Faso", emoji: "🇧🇫" },
  { code: "BI", name: "Burundi", emoji: "🇧🇮" },
  { code: "KH", name: "Cambodia", emoji: "🇰🇭" },
  { code: "CM", name: "Cameroon", emoji: "🇨🇲" },
  { code: "CA", name: "Canada", emoji: "🇨🇦" },
  { code: "CV", name: "Cape Verde", emoji: "🇨🇻" },
  { code: "KY", name: "Cayman Islands", emoji: "🇰🇾" },
  { code: "CF", name: "Central African Republic", emoji: "🇨🇫" },
  { code: "TD", name: "Chad", emoji: "🇹🇩" },
  { code: "CL", name: "Chile", emoji: "🇨🇱" },
  { code: "CN", name: "China", emoji: "🇨🇳" },
  { code: "CX", name: "Christmas Island", emoji: "🇨🇽" },
  { code: "CC", name: "Cocos (Keeling) Islands", emoji: "🇨🇨" },
  { code: "CO", name: "Colombia", emoji: "🇨🇴" },
  { code: "KM", name: "Comoros", emoji: "🇰🇲" },
  { code: "CG", name: "Congo", emoji: "🇨🇬" },
  { code: "CD", name: "Congo, Democratic Republic", emoji: "🇨🇩" },
  { code: "CK", name: "Cook Islands", emoji: "🇨🇰" },
  { code: "CR", name: "Costa Rica", emoji: "🇨🇷" },
  { code: "CI", name: "Côte d'Ivoire", emoji: "🇨🇮" },
  { code: "HR", name: "Croatia", emoji: "🇭🇷" },
  { code: "CU", name: "Cuba", emoji: "🇨🇺" },
  { code: "CY", name: "Cyprus", emoji: "🇨🇾" },
  { code: "CZ", name: "Czech Republic", emoji: "🇨🇿" },
  { code: "DK", name: "Denmark", emoji: "🇩🇰" },
  { code: "DJ", name: "Djibouti", emoji: "🇩🇯" },
  { code: "DM", name: "Dominica", emoji: "🇩🇲" },
  { code: "DO", name: "Dominican Republic", emoji: "🇩🇴" },
  { code: "EC", name: "Ecuador", emoji: "🇪🇨" },
  { code: "EG", name: "Egypt", emoji: "🇪🇬" },
  { code: "SV", name: "El Salvador", emoji: "🇸🇻" },
  { code: "GQ", name: "Equatorial Guinea", emoji: "🇬🇶" },
  { code: "ER", name: "Eritrea", emoji: "🇪🇷" },
  { code: "EE", name: "Estonia", emoji: "🇪🇪" },
  { code: "ET", name: "Ethiopia", emoji: "🇪🇹" },
  { code: "FK", name: "Falkland Islands", emoji: "🇫🇰" },
  { code: "FO", name: "Faroe Islands", emoji: "🇫🇴" },
  { code: "FJ", name: "Fiji", emoji: "🇫🇯" },
  { code: "FI", name: "Finland", emoji: "🇫🇮" },
  { code: "FR", name: "France", emoji: "🇫🇷" },
  { code: "GF", name: "French Guiana", emoji: "🇬🇫" },
  { code: "PF", name: "French Polynesia", emoji: "🇵🇫" },
  { code: "TF", name: "French Southern Territories", emoji: "🇹🇫" },
  { code: "GA", name: "Gabon", emoji: "🇬🇦" },
  { code: "GM", name: "Gambia", emoji: "🇬🇲" },
  { code: "GE", name: "Georgia", emoji: "🇬🇪" },
  { code: "DE", name: "Germany", emoji: "🇩🇪" },
  { code: "GH", name: "Ghana", emoji: "🇬🇭" },
  { code: "GI", name: "Gibraltar", emoji: "🇬🇮" },
  { code: "GR", name: "Greece", emoji: "🇬🇷" },
  { code: "GL", name: "Greenland", emoji: "🇬🇱" },
  { code: "GD", name: "Grenada", emoji: "🇬🇩" },
  { code: "GP", name: "Guadeloupe", emoji: "🇬🇵" },
  { code: "GU", name: "Guam", emoji: "🇬🇺" },
  { code: "GT", name: "Guatemala", emoji: "🇬🇹" },
  { code: "GG", name: "Guernsey", emoji: "🇬🇬" },
  { code: "GN", name: "Guinea", emoji: "🇬🇳" },
  { code: "GW", name: "Guinea-Bissau", emoji: "🇬🇼" },
  { code: "GY", name: "Guyana", emoji: "🇬🇾" },
  { code: "HT", name: "Haiti", emoji: "🇭🇹" },
  { code: "HM", name: "Heard Island and McDonald Islands", emoji: "🇭🇲" },
  { code: "VA", name: "Holy See (Vatican City State)", emoji: "🇻🇦" },
  { code: "HN", name: "Honduras", emoji: "🇭🇳" },
  { code: "HK", name: "Hong Kong", emoji: "🇭🇰" },
  { code: "HU", name: "Hungary", emoji: "🇭🇺" },
  { code: "IS", name: "Iceland", emoji: "🇮🇸" },
  { code: "IN", name: "India", emoji: "🇮🇳" },
  { code: "ID", name: "Indonesia", emoji: "🇮🇩" },
  { code: "IR", name: "Iran", emoji: "🇮🇷" },
  { code: "IQ", name: "Iraq", emoji: "🇮🇶" },
  { code: "IE", name: "Ireland", emoji: "🇮🇪" },
  { code: "IM", name: "Isle of Man", emoji: "🇮🇲" },
  { code: "IL", name: "Israel", emoji: "🇮🇱" },
  { code: "IT", name: "Italy", emoji: "🇮🇹" },
  { code: "JM", name: "Jamaica", emoji: "🇯🇲" },
  { code: "JP", name: "Japan", emoji: "🇯🇵" },
  { code: "JE", name: "Jersey", emoji: "🇯🇪" },
  { code: "JO", name: "Jordan", emoji: "🇯🇴" },
  { code: "KZ", name: "Kazakhstan", emoji: "🇰🇿" },
  { code: "KE", name: "Kenya", emoji: "🇰🇪" },
  { code: "KI", name: "Kiribati", emoji: "🇰🇮" },
  { code: "KP", name: "North Korea", emoji: "🇰🇵" },
  { code: "KR", name: "South Korea", emoji: "🇰🇷" },
  { code: "KW", name: "Kuwait", emoji: "🇰🇼" },
  { code: "KG", name: "Kyrgyzstan", emoji: "🇰🇬" },
  { code: "LA", name: "Laos", emoji: "🇱🇦" },
  { code: "LV", name: "Latvia", emoji: "🇱🇻" },
  { code: "LB", name: "Lebanon", emoji: "🇱🇧" },
  { code: "LS", name: "Lesotho", emoji: "🇱🇸" },
  { code: "LR", name: "Liberia", emoji: "🇱🇷" },
  { code: "LY", name: "Libya", emoji: "🇱🇾" },
  { code: "LI", name: "Liechtenstein", emoji: "🇱🇮" },
  { code: "LT", name: "Lithuania", emoji: "🇱🇹" },
  { code: "LU", name: "Luxembourg", emoji: "🇱🇺" },
  { code: "MO", name: "Macao", emoji: "🇲🇴" },
  { code: "MK", name: "North Macedonia", emoji: "🇲🇰" },
  { code: "MG", name: "Madagascar", emoji: "🇲🇬" },
  { code: "MW", name: "Malawi", emoji: "🇲🇼" },
  { code: "MY", name: "Malaysia", emoji: "🇲🇾" },
  { code: "MV", name: "Maldives", emoji: "🇲🇻" },
  { code: "ML", name: "Mali", emoji: "🇲🇱" },
  { code: "MT", name: "Malta", emoji: "🇲🇹" },
  { code: "MH", name: "Marshall Islands", emoji: "🇲🇭" },
  { code: "MQ", name: "Martinique", emoji: "🇲🇶" },
  { code: "MR", name: "Mauritania", emoji: "🇲🇷" },
  { code: "MU", name: "Mauritius", emoji: "🇲🇺" },
  { code: "YT", name: "Mayotte", emoji: "🇾🇹" },
  { code: "MX", name: "Mexico", emoji: "🇲🇽" },
  { code: "FM", name: "Micronesia", emoji: "🇫🇲" },
  { code: "MD", name: "Moldova", emoji: "🇲🇩" },
  { code: "MC", name: "Monaco", emoji: "🇲🇨" },
  { code: "MN", name: "Mongolia", emoji: "🇲🇳" },
  { code: "ME", name: "Montenegro", emoji: "🇲🇪" },
  { code: "MS", name: "Montserrat", emoji: "🇲🇸" },
  { code: "MA", name: "Morocco", emoji: "🇲🇦" },
  { code: "MZ", name: "Mozambique", emoji: "🇲🇿" },
  { code: "MM", name: "Myanmar", emoji: "🇲🇲" },
  { code: "NA", name: "Namibia", emoji: "🇳🇦" },
  { code: "NR", name: "Nauru", emoji: "🇳🇷" },
  { code: "NP", name: "Nepal", emoji: "🇳🇵" },
  { code: "NL", name: "Netherlands", emoji: "🇳🇱" },
  { code: "NC", name: "New Caledonia", emoji: "🇳🇨" },
  { code: "NZ", name: "New Zealand", emoji: "🇳🇿" },
  { code: "NI", name: "Nicaragua", emoji: "🇳🇮" },
  { code: "NE", name: "Niger", emoji: "🇳🇪" },
  { code: "NG", name: "Nigeria", emoji: "🇳🇬" },
  { code: "NU", name: "Niue", emoji: "🇳🇺" },
  { code: "NF", name: "Norfolk Island", emoji: "🇳🇫" },
  { code: "MP", name: "Northern Mariana Islands", emoji: "🇲🇵" },
  { code: "NO", name: "Norway", emoji: "🇳🇴" },
  { code: "OM", name: "Oman", emoji: "🇴🇲" },
  { code: "PK", name: "Pakistan", emoji: "🇵🇰" },
  { code: "PW", name: "Palau", emoji: "🇵🇼" },
  { code: "PS", name: "Palestine", emoji: "🇵🇸" },
  { code: "PA", name: "Panama", emoji: "🇵🇦" },
  { code: "PG", name: "Papua New Guinea", emoji: "🇵🇬" },
  { code: "PY", name: "Paraguay", emoji: "🇵🇾" },
  { code: "PE", name: "Peru", emoji: "🇵🇪" },
  { code: "PH", name: "Philippines", emoji: "🇵🇭" },
  { code: "PN", name: "Pitcairn", emoji: "🇵🇳" },
  { code: "PL", name: "Poland", emoji: "🇵🇱" },
  { code: "PT", name: "Portugal", emoji: "🇵🇹" },
  { code: "PR", name: "Puerto Rico", emoji: "🇵🇷" },
  { code: "QA", name: "Qatar", emoji: "🇶🇦" },
  { code: "RE", name: "Réunion", emoji: "🇷🇪" },
  { code: "RO", name: "Romania", emoji: "🇷🇴" },
  { code: "RU", name: "Russia", emoji: "🇷🇺" },
  { code: "RW", name: "Rwanda", emoji: "🇷🇼" },
  { code: "BL", name: "Saint Barthélemy", emoji: "🇧🇱" },
  { code: "SH", name: "Saint Helena", emoji: "🇸🇭" },
  { code: "KN", name: "Saint Kitts and Nevis", emoji: "🇰🇳" },
  { code: "LC", name: "Saint Lucia", emoji: "🇱🇨" },
  { code: "MF", name: "Saint Martin", emoji: "🇲🇫" },
  { code: "PM", name: "Saint Pierre and Miquelon", emoji: "🇵🇲" },
  { code: "VC", name: "Saint Vincent and the Grenadines", emoji: "🇻🇨" },
  { code: "WS", name: "Samoa", emoji: "🇼🇸" },
  { code: "SM", name: "San Marino", emoji: "🇸🇲" },
  { code: "ST", name: "Sao Tome and Principe", emoji: "🇸🇹" },
  { code: "SA", name: "Saudi Arabia", emoji: "🇸🇦" },
  { code: "SN", name: "Senegal", emoji: "🇸🇳" },
  { code: "RS", name: "Serbia", emoji: "🇷🇸" },
  { code: "SC", name: "Seychelles", emoji: "🇸🇨" },
  { code: "SL", name: "Sierra Leone", emoji: "🇸🇱" },
  { code: "SG", name: "Singapore", emoji: "🇸🇬" },
  { code: "SX", name: "Sint Maarten", emoji: "🇸🇽" },
  { code: "SK", name: "Slovakia", emoji: "🇸🇰" },
  { code: "SI", name: "Slovenia", emoji: "🇸🇮" },
  { code: "SB", name: "Solomon Islands", emoji: "🇸🇧" },
  { code: "SO", name: "Somalia", emoji: "🇸🇴" },
  { code: "ZA", name: "South Africa", emoji: "🇿🇦" },
  { code: "GS", name: "South Georgia", emoji: "🇬🇸" },
  { code: "SS", name: "South Sudan", emoji: "🇸🇸" },
  { code: "ES", name: "Spain", emoji: "🇪🇸" },
  { code: "LK", name: "Sri Lanka", emoji: "🇱🇰" },
  { code: "SD", name: "Sudan", emoji: "🇸🇩" },
  { code: "SR", name: "Suriname", emoji: "🇸🇷" },
  { code: "SJ", name: "Svalbard and Jan Mayen", emoji: "🇸🇯" },
  { code: "SZ", name: "Eswatini", emoji: "🇸🇿" },
  { code: "SE", name: "Sweden", emoji: "🇸🇪" },
  { code: "CH", name: "Switzerland", emoji: "🇨🇭" },
  { code: "SY", name: "Syria", emoji: "🇸🇾" },
  { code: "TW", name: "Taiwan", emoji: "🇹🇼" },
  { code: "TJ", name: "Tajikistan", emoji: "🇹🇯" },
  { code: "TZ", name: "Tanzania", emoji: "🇹🇿" },
  { code: "TH", name: "Thailand", emoji: "🇹🇭" },
  { code: "TL", name: "Timor-Leste", emoji: "🇹🇱" },
  { code: "TG", name: "Togo", emoji: "🇹🇬" },
  { code: "TK", name: "Tokelau", emoji: "🇹🇰" },
  { code: "TO", name: "Tonga", emoji: "🇹🇴" },
  { code: "TT", name: "Trinidad and Tobago", emoji: "🇹🇹" },
  { code: "TN", name: "Tunisia", emoji: "🇹🇳" },
  { code: "TR", name: "Turkey", emoji: "🇹🇷" },
  { code: "TM", name: "Turkmenistan", emoji: "🇹🇲" },
  { code: "TC", name: "Turks and Caicos Islands", emoji: "🇹🇨" },
  { code: "TV", name: "Tuvalu", emoji: "🇹🇻" },
  { code: "UG", name: "Uganda", emoji: "🇺🇬" },
  { code: "UA", name: "Ukraine", emoji: "🇺🇦" },
  { code: "AE", name: "United Arab Emirates", emoji: "🇦🇪" },
  { code: "GB", name: "United Kingdom", emoji: "🇬🇧" },
  { code: "US", name: "United States", emoji: "🇺🇸" },
  { code: "UM", name: "United States Minor Outlying Islands", emoji: "🇺🇲" },
  { code: "UY", name: "Uruguay", emoji: "🇺🇾" },
  { code: "UZ", name: "Uzbekistan", emoji: "🇺🇿" },
  { code: "VU", name: "Vanuatu", emoji: "🇻🇺" },
  { code: "VE", name: "Venezuela", emoji: "🇻🇪" },
  { code: "VN", name: "Vietnam", emoji: "🇻🇳" },
  { code: "VG", name: "Virgin Islands, British", emoji: "🇻🇬" },
  { code: "VI", name: "Virgin Islands, U.S.", emoji: "🇻🇮" },
  { code: "WF", name: "Wallis and Futuna", emoji: "🇼🇫" },
  { code: "EH", name: "Western Sahara", emoji: "🇪🇭" },
  { code: "YE", name: "Yemen", emoji: "🇾🇪" },
  { code: "ZM", name: "Zambia", emoji: "🇿🇲" },
  { code: "ZW", name: "Zimbabwe", emoji: "🇿🇼" },
  { code: "AX", name: "Åland Islands", emoji: "🇦🇽" },
];

/**
 * Special cases for non-standard country codes
 */
export const SPECIAL_COUNTRIES: Record<string, CountryData> = {
  Local: { code: "LOCAL", name: "Local", emoji: "🏠" },
  Unknown: { code: "UNKNOWN", name: "Unknown", emoji: "🌐" },
  EU: { code: "EU", name: "European Union", emoji: "🇪🇺" },
  UN: { code: "UN", name: "United Nations", emoji: "🇺🇳" },
};

/**
 * Get country data by country code
 * @param code - ISO 3166-1 alpha-2 country code or special code
 * @returns CountryData or undefined if not found
 */
export function getCountryByCode(code: string): CountryData | undefined {
  if (!code) return undefined;

  const normalizedCode = code.toUpperCase();

  // Check special cases first
  if (SPECIAL_COUNTRIES[normalizedCode]) {
    return SPECIAL_COUNTRIES[normalizedCode];
  }

  // Check regular countries
  return COUNTRIES.find(country => country.code === normalizedCode);
}

/**
 * Get country data by country name (case-insensitive partial match)
 * @param name - Country name or partial name
 * @returns CountryData or undefined if not found
 */
export function getCountryByName(name: string): CountryData | undefined {
  if (!name) return undefined;

  const normalizedName = name.toLowerCase();

  // Check special cases first
  const specialEntry = Object.values(SPECIAL_COUNTRIES).find(
    country => country.name.toLowerCase() === normalizedName
  );
  if (specialEntry) return specialEntry;

  // Check regular countries (exact or partial match)
  return COUNTRIES.find(country =>
    country.name.toLowerCase().includes(normalizedName)
  );
}

/**
 * Get formatted country display with emoji and name
 * @param code - Country code
 * @returns Formatted string like "🇺🇸 United States" or "🌐 Unknown" if not found
 */
export function formatCountryDisplay(code: string): string {
  const country = getCountryByCode(code);
  if (!country) return `${SPECIAL_COUNTRIES.Unknown.emoji} ${SPECIAL_COUNTRIES.Unknown.name}`;

  return `${country.emoji} ${country.name}`;
}

/**
 * Get formatted country display with emoji only
 * @param code - Country code
 * @returns Emoji string or "🌐" if not found
 */
export function formatCountryEmoji(code: string): string {
  const country = getCountryByCode(code);
  if (!country) return SPECIAL_COUNTRIES.Unknown.emoji;

  return country.emoji;
}

/**
 * Get formatted country display with name only
 * @param code - Country code
 * @returns Country name or "Unknown" if not found
 */
export function formatCountryName(code: string): string {
  const country = getCountryByCode(code);
  if (!country) return SPECIAL_COUNTRIES.Unknown.name;

  return country.name;
}

/**
 * Get all country codes as an array
 * @returns Array of all country codes
 */
export function getAllCountryCodes(): string[] {
  return COUNTRIES.map(country => country.code);
}

/**
 * Get all country names as an array
 * @returns Array of all country names
 */
export function getAllCountryNames(): string[] {
  return COUNTRIES.map(country => country.name);
}

/**
 * Search countries by name or code
 * @param query - Search query
 * @returns Array of matching countries
 */
export function searchCountries(query: string): CountryData[] {
  if (!query || query.trim() === "") return [];

  const normalizedQuery = query.toLowerCase().trim();

  return COUNTRIES.filter(country =>
    country.name.toLowerCase().includes(normalizedQuery) ||
    country.code.toLowerCase().includes(normalizedQuery)
  );
}

/**
 * Map of country code to country data for fast lookups
 */
export const COUNTRY_MAP: Record<string, CountryData> = COUNTRIES.reduce(
  (map, country) => {
    map[country.code] = country;
    return map;
  },
  {} as Record<string, CountryData>
);

// Export all special countries in the map as well
Object.entries(SPECIAL_COUNTRIES).forEach(([code, country]) => {
  COUNTRY_MAP[code] = country;
});
