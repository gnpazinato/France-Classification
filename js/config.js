// ============================================================
// France Classification System — Configuration
// ============================================================
// IMPORTANT: Add this file to .gitignore before pushing to GitHub.
// Never commit real credentials to a public repository.
// See config.example.js for a safe template.
// ============================================================

const SUPABASE_URL = 'YOUR_SUPABASE_URL_HERE';
const SUPABASE_ANON_KEY = 'YOUR_SUPABASE_ANON_KEY_HERE';

const APP_CONFIG = {
  appName: 'France Classification',
  pageSize: 30,

  classificationOptions: ['1.0', '1.5', '2.0', '2.5', '3.0', '3.5', '4.0', '4.5', '5.0'],

  classStatusOptions: ['Confirmed', 'Under Review', 'Provisional'],

  genderOptions: [
    { value: 'M', label: 'Male' },
    { value: 'F', label: 'Female' }
  ],

  // France first, then alphabetical
  nationalityOptions: [
    'France',
    'Algeria', 'Argentina', 'Australia', 'Austria', 'Belgium', 'Brazil',
    'Canada', 'China', 'Colombia', 'Congo', 'Costa Rica', 'Croatia',
    'Czech Republic', 'Denmark', 'Egypt', 'Finland', 'Germany', 'Greece',
    'Hungary', 'Iran', 'Israel', 'Italy', 'Jamaica', 'Japan', 'Jordan',
    'Latvia', 'Lebanon', 'Lithuania', 'Luxembourg', 'Mexico', 'Morocco',
    'Netherlands', 'New Zealand', 'Nigeria', 'Norway', 'Peru', 'Poland',
    'Portugal', 'Puerto Rico', 'Romania', 'Russia', 'Senegal', 'Spain',
    'Sweden', 'Switzerland', 'Tunisia', 'Turkey', 'Ukraine',
    'United Kingdom', 'United States', 'Venezuela', 'Other'
  ],

  // Card colour options (add more as needed)
  colourOptions: [
    'White', 'Blue', 'Green', 'Yellow', 'Orange', 'Pink', 'Red'
  ]
};
