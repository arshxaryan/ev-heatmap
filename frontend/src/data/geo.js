/**
 * Offline state/UT reference for the frontend — mirrors backend's
 * data/geo/india-geo.js (states only; district lists come from /api/districts).
 * Used for the Home hero mini-map and filter pruning when the API is cold.
 */
export const STATES = [
  { code: 'AP', name: 'Andhra Pradesh', lat: 15.91, lon: 79.74 },
  { code: 'AR', name: 'Arunachal Pradesh', lat: 27.1, lon: 93.62 },
  { code: 'AS', name: 'Assam', lat: 26.35, lon: 94.17 },
  { code: 'BR', name: 'Bihar', lat: 25.61, lon: 85.14 },
  { code: 'CG', name: 'Chhattisgarh', lat: 21.23, lon: 81.63 },
  { code: 'GA', name: 'Goa', lat: 15.29, lon: 74.12 },
  { code: 'GJ', name: 'Gujarat', lat: 22.3, lon: 73.0 },
  { code: 'HR', name: 'Haryana', lat: 29.06, lon: 76.04 },
  { code: 'HP', name: 'Himachal Pradesh', lat: 31.6, lon: 77.35 },
  { code: 'JH', name: 'Jharkhand', lat: 23.61, lon: 85.28 },
  { code: 'KA', name: 'Karnataka', lat: 15.3, lon: 75.7 },
  { code: 'KL', name: 'Kerala', lat: 10.85, lon: 76.27 },
  { code: 'MP', name: 'Madhya Pradesh', lat: 23.47, lon: 78.57 },
  { code: 'MH', name: 'Maharashtra', lat: 19.09, lon: 74.13 },
  { code: 'MN', name: 'Manipur', lat: 24.82, lon: 93.94 },
  { code: 'ML', name: 'Meghalaya', lat: 25.57, lon: 91.88 },
  { code: 'MZ', name: 'Mizoram', lat: 23.73, lon: 92.72 },
  { code: 'NL', name: 'Nagaland', lat: 25.67, lon: 94.11 },
  { code: 'OD', name: 'Odisha', lat: 20.54, lon: 85.28 },
  { code: 'PB', name: 'Punjab', lat: 30.73, lon: 76.78 },
  { code: 'RJ', name: 'Rajasthan', lat: 27.02, lon: 74.22 },
  { code: 'SK', name: 'Sikkim', lat: 27.53, lon: 88.51 },
  { code: 'TN', name: 'Tamil Nadu', lat: 11.05, lon: 78.68 },
  { code: 'TG', name: 'Telangana', lat: 17.97, lon: 79.59 },
  { code: 'TR', name: 'Tripura', lat: 23.83, lon: 91.28 },
  { code: 'UP', name: 'Uttar Pradesh', lat: 27.6, lon: 80.59 },
  { code: 'UK', name: 'Uttarakhand', lat: 30.07, lon: 79.32 },
  { code: 'WB', name: 'West Bengal', lat: 22.99, lon: 87.68 },
  { code: 'AN', name: 'Andaman & Nicobar Islands', lat: 11.62, lon: 92.73 },
  { code: 'CH', name: 'Chandigarh', lat: 30.74, lon: 76.79 },
  { code: 'DH', name: 'DNH and Daman & Diu', lat: 20.27, lon: 73.02 },
  { code: 'DL', name: 'Delhi (NCT)', lat: 28.61, lon: 77.21 },
  { code: 'JK', name: 'Jammu & Kashmir', lat: 33.25, lon: 75.34 },
  { code: 'LA', name: 'Ladakh', lat: 34.16, lon: 77.58 },
  { code: 'LD', name: 'Lakshadweep', lat: 10.57, lon: 72.64 },
  { code: 'PY', name: 'Puducherry', lat: 11.94, lon: 79.83 },
];

export const INDIA_CENTER = [22.6, 79.0];
