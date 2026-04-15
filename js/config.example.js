// ============================================================
// France Classification System — Config Template
// ============================================================
// Copy this file to config.js and fill in your real credentials.
// config.js is listed in .gitignore and should NEVER be committed.
// ============================================================

const SUPABASE_URL = 'https://your-project-ref.supabase.co';
const SUPABASE_ANON_KEY = 'your-anon-key-here';

const APP_CONFIG = {
  appName: 'France Classification',
  pageSize: 30,

  classificationOptions: ['1.0', '1.5', '2.0', '2.5', '3.0', '3.5', '4.0', '4.5', '5.0'],
  classStatusOptions: ['Confirmed', 'Under Review', 'Provisional'],
  genderOptions: [
    { value: 'M', label: 'Male' },
    { value: 'F', label: 'Female' }
  ],
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
  colourOptions: ['White', 'Blue', 'Green', 'Yellow', 'Orange', 'Pink', 'Red']
};
