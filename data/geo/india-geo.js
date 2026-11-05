/**
 * india-geo.js — single source of truth for India state/UT + district reference data.
 *
 * Each region carries:
 *   code        ISO-like short code used as a stable DB key
 *   name        display name
 *   type        "state" | "ut"
 *   lat, lon    approximate centroid (used for map fitting)
 *   penetration Relative EV-adoption factor (1–10). 10 = highest per-capita EV adoption.
 *               Roughly follows real-world FY25 EV (Vahan) penetration by state.
 *   coverage    Relative public-charging-coverage factor (0–1). Higher = better
 *               charging infrastructure relative to EV fleet. Used to seed chargers
 *               so the demo data reproduces realistic "gaps" (e.g. Bihar/UP high gap,
 *               Delhi/Goa well served).
 *   districts   [name, lat, lon][] — major districts (mock seed only lists key ones).
 *
 * NOTE: Coordinates are approximate centroids, sufficient for point-based heat maps.
 * Swap this module for a full Survey-of-India / LGD district GeoJSON in production.
 */

module.exports = [
  {
    code: 'AP', name: 'Andhra Pradesh', type: 'state', lat: 15.91, lon: 79.74, penetration: 5.0, coverage: 0.4,
    districts: [
      ['Anantapur', 14.68, 77.6], ['Chittoor', 13.22, 79.1], ['East Godavari', 17.0, 81.8],
      ['Guntur', 16.31, 80.44], ['Krishna', 16.5, 80.9], ['Kurnool', 15.83, 78.04],
      ['Nellore', 14.44, 79.99], ['Srikakulam', 18.3, 83.9], ['Visakhapatnam', 17.69, 83.22],
      ['Tirupati', 13.63, 79.42],
    ],
  },
  {
    code: 'AR', name: 'Arunachal Pradesh', type: 'state', lat: 27.1, lon: 93.62, penetration: 2.0, coverage: 0.1,
    districts: [
      ['Itanagar (Papum Pare)', 27.09, 93.62], ['Tawang', 27.59, 91.87], ['Pasighat (East Siang)', 28.07, 95.33],
      ['Ziro (Lower Subansiri)', 27.54, 93.83], ['Changlang', 27.57, 95.92],
    ],
  },
  {
    code: 'AS', name: 'Assam', type: 'state', lat: 26.35, lon: 94.17, penetration: 4.0, coverage: 0.28,
    districts: [
      ['Guwahati (Kamrup Metro)', 26.14, 91.74], ['Silchar (Cachar)', 24.82, 92.8], ['Dibrugarh', 27.48, 94.91],
      ['Jorhat', 26.75, 94.22], ['Tezpur (Sonitpur)', 26.63, 92.79], ['Nagaon', 26.35, 92.68], ['Dhubri', 26.02, 89.98],
    ],
  },
  {
    code: 'BR', name: 'Bihar', type: 'state', lat: 25.61, lon: 85.14, penetration: 4.5, coverage: 0.18,
    districts: [
      ['Patna', 25.59, 85.14], ['Gaya', 24.79, 85.0], ['Bhagalpur', 25.24, 86.99],
      ['Muzaffarpur', 26.12, 85.38], ['Darbhanga', 26.15, 85.9], ['Purnia', 25.78, 87.47],
    ],
  },
  {
    code: 'CG', name: 'Chhattisgarh', type: 'state', lat: 21.23, lon: 81.63, penetration: 3.5, coverage: 0.3,
    districts: [
      ['Raipur', 21.25, 81.63], ['Durg', 21.24, 81.28], ['Bilaspur', 22.08, 82.15],
      ['Korba', 22.35, 82.68], ['Raigarh', 21.55, 83.33], ['Jagdalpur (Bastar)', 19.11, 81.99],
    ],
  },
  {
    code: 'GA', name: 'Goa', type: 'state', lat: 15.29, lon: 74.12, penetration: 8.0, coverage: 0.55,
    districts: [
      ['Panaji (North Goa)', 15.49, 73.83], ['Margao (South Goa)', 15.28, 73.96], ['Vasco da Gama (Mormugao)', 15.39, 73.81],
    ],
  },
  {
    code: 'GJ', name: 'Gujarat', type: 'state', lat: 22.3, lon: 73.0, penetration: 7.0, coverage: 0.52,
    districts: [
      ['Ahmedabad', 23.03, 72.58], ['Surat', 21.17, 72.83], ['Vadodara', 22.31, 73.18],
      ['Rajkot', 22.3, 70.8], ['Bhavnagar', 21.77, 72.15], ['Gandhinagar', 23.22, 72.65],
      ['Jamnagar', 22.47, 70.06],
    ],
  },
  {
    code: 'HR', name: 'Haryana', type: 'state', lat: 29.06, lon: 76.04, penetration: 6.5, coverage: 0.48,
    districts: [
      ['Gurugram', 28.47, 77.03], ['Faridabad', 28.41, 77.31], ['Hisar', 29.15, 75.72],
      ['Rohtak', 28.9, 76.57], ['Panipat', 29.39, 76.96], ['Ambala', 30.38, 76.78],
      ['Karnal', 29.69, 76.99], ['Sonipat', 28.99, 77.02],
    ],
  },
  {
    code: 'HP', name: 'Himachal Pradesh', type: 'state', lat: 31.6, lon: 77.35, penetration: 3.5, coverage: 0.25,
    districts: [
      ['Shimla', 31.1, 77.17], ['Solan', 30.9, 77.11], ['Kangra', 32.1, 76.27],
      ['Mandi', 31.71, 76.93],
    ],
  },
  {
    code: 'JH', name: 'Jharkhand', type: 'state', lat: 23.61, lon: 85.28, penetration: 3.0, coverage: 0.22,
    districts: [
      ['Ranchi', 23.34, 85.31], ['Jamshedpur (E. Singhbhum)', 22.8, 86.2], ['Dhanbad', 23.8, 86.44],
      ['Bokaro', 23.67, 86.15], ['Hazaribagh', 23.99, 85.36], ['Deoghar', 24.48, 86.69],
    ],
  },
  {
    code: 'KA', name: 'Karnataka', type: 'state', lat: 15.3, lon: 75.7, penetration: 6.5, coverage: 0.6,
    districts: [
      ['Bengaluru', 12.97, 77.59], ['Mysuru', 12.3, 76.64], ['Hubballi-Dharwad', 15.36, 75.12],
      ['Mangaluru', 12.87, 74.84], ['Belagavi', 15.85, 74.5], ['Kalaburagi', 17.33, 76.83],
      ['Davanagere', 14.46, 75.92], ['Ballari', 15.14, 76.92],
    ],
  },
  {
    code: 'KL', name: 'Kerala', type: 'state', lat: 10.85, lon: 76.27, penetration: 7.5, coverage: 0.58,
    districts: [
      ['Thiruvananthapuram', 8.52, 76.94], ['Kochi (Ernakulam)', 9.93, 76.27], ['Kozhikode', 11.26, 75.78],
      ['Thrissur', 10.53, 76.21], ['Kollam', 8.89, 76.61], ['Kottayam', 9.59, 76.51],
      ['Palakkad', 10.78, 76.65], ['Kannur', 11.87, 75.37], ['Alappuzha', 9.5, 76.33],
    ],
  },
  {
    code: 'MP', name: 'Madhya Pradesh', type: 'state', lat: 23.47, lon: 78.57, penetration: 5.5, coverage: 0.42,
    districts: [
      ['Indore', 22.72, 75.86], ['Bhopal', 23.26, 77.4], ['Jabalpur', 23.18, 79.99],
      ['Gwalior', 26.22, 78.18], ['Ujjain', 23.18, 75.78], ['Sagar', 23.84, 78.74],
      ['Dewas', 22.96, 76.02], ['Rewa', 24.54, 81.3], ['Satna', 24.6, 80.83],
    ],
  },
  {
    code: 'MH', name: 'Maharashtra', type: 'state', lat: 19.09, lon: 74.13, penetration: 8.0, coverage: 0.62,
    districts: [
      ['Mumbai City', 19.03, 72.86], ['Mumbai Suburban', 19.19, 72.94], ['Thane', 19.22, 73.01],
      ['Pune', 18.52, 73.86], ['Pimpri-Chinchwad', 18.63, 73.79], ['Nashik', 19.99, 73.79],
      ['Nagpur', 21.15, 79.09], ['Chhatrapati Sambhajinagar', 19.88, 75.34], ['Solapur', 17.66, 75.91],
      ['Kolhapur', 16.7, 74.24], ['Amravati', 20.93, 77.75], ['Sangli', 16.85, 74.58], ['Navi Mumbai', 19.03, 73.02],
    ],
  },
  {
    code: 'MN', name: 'Manipur', type: 'state', lat: 24.82, lon: 93.94, penetration: 2.0, coverage: 0.12,
    districts: [['Imphal', 24.82, 93.94], ['Thoubal', 24.63, 94.01], ['Bishnupur', 24.63, 93.78]],
  },
  {
    code: 'ML', name: 'Meghalaya', type: 'state', lat: 25.57, lon: 91.88, penetration: 2.5, coverage: 0.15,
    districts: [['Shillong (E. Khasi Hills)', 25.57, 91.88], ['Jowai', 25.16, 92.2], ['Tura', 25.51, 90.2]],
  },
  {
    code: 'MZ', name: 'Mizoram', type: 'state', lat: 23.73, lon: 92.72, penetration: 2.5, coverage: 0.14,
    districts: [['Aizawl', 23.73, 92.72], ['Lunglei', 22.88, 92.73], ['Champhai', 23.47, 93.33]],
  },
  {
    code: 'NL', name: 'Nagaland', type: 'state', lat: 25.67, lon: 94.11, penetration: 2.0, coverage: 0.12,
    districts: [['Kohima', 25.67, 94.11], ['Dimapur', 25.9, 93.73], ['Mokokchung', 26.32, 94.51]],
  },
  {
    code: 'OD', name: 'Odisha', type: 'state', lat: 20.54, lon: 85.28, penetration: 4.0, coverage: 0.3,
    districts: [
      ['Bhubaneswar (Khordha)', 20.3, 85.82], ['Cuttack', 20.46, 85.88], ['Rourkela (Sundargarh)', 22.26, 84.85],
      ['Sambalpur', 21.47, 83.97], ['Puri', 19.81, 85.83], ['Balasore', 21.49, 86.93],
      ['Berhampur (Ganjam)', 19.31, 84.79], ['Jharsuguda', 21.86, 84.01],
    ],
  },
  {
    code: 'PB', name: 'Punjab', type: 'state', lat: 30.73, lon: 76.78, penetration: 5.5, coverage: 0.45,
    districts: [
      ['Ludhiana', 30.9, 75.85], ['Amritsar', 31.63, 74.87], ['Jalandhar', 31.33, 75.58],
      ['Patiala', 30.34, 76.39], ['Mohali (SAS Nagar)', 30.7, 76.72], ['Bathinda', 30.21, 74.95],
      ['Hoshiarpur', 31.53, 75.92], ['Moga', 30.8, 75.17],
    ],
  },
  {
    code: 'RJ', name: 'Rajasthan', type: 'state', lat: 27.02, lon: 74.22, penetration: 6.5, coverage: 0.4,
    districts: [
      ['Jaipur', 26.91, 75.79], ['Jodhpur', 26.3, 73.03], ['Udaipur', 24.6, 73.71],
      ['Kota', 25.21, 75.86], ['Ajmer', 26.45, 74.64], ['Alwar', 27.55, 76.63],
      ['Bharatpur', 27.21, 77.49], ['Bhilwara', 25.35, 74.63], ['Bikaner', 28.02, 73.31],
      ['Sri Ganganagar', 29.92, 73.88],
    ],
  },
  {
    code: 'SK', name: 'Sikkim', type: 'state', lat: 27.53, lon: 88.51, penetration: 2.5, coverage: 0.2,
    districts: [['Gangtok', 27.33, 88.61], ['Namchi', 27.16, 88.36], ['Gyalshing', 27.28, 88.26], ['Mangan', 27.51, 88.53]],
  },
  {
    code: 'TN', name: 'Tamil Nadu', type: 'state', lat: 11.05, lon: 78.68, penetration: 7.0, coverage: 0.55,
    districts: [
      ['Chennai', 13.08, 80.27], ['Coimbatore', 11.02, 76.96], ['Madurai', 9.93, 78.12],
      ['Tiruchirappalli', 10.79, 78.7], ['Salem', 11.66, 78.15], ['Tiruppur', 11.1, 77.34],
      ['Erode', 11.34, 77.72], ['Vellore', 12.92, 79.13], ['Tirunelveli', 8.71, 77.76],
      ['Thoothukudi', 8.76, 78.13], ['Thanjavur', 10.79, 79.14], ['Dindigul', 10.37, 77.98],
    ],
  },
  {
    code: 'TG', name: 'Telangana', type: 'state', lat: 17.97, lon: 79.59, penetration: 7.0, coverage: 0.5,
    districts: [
      ['Hyderabad', 17.39, 78.49], ['Rangareddy', 17.42, 78.37], ['Warangal', 17.98, 79.59],
      ['Nizamabad', 18.67, 78.09], ['Khammam', 17.25, 80.15], ['Karimnagar', 18.44, 79.13],
      ['Nalgonda', 17.05, 79.27],
    ],
  },
  {
    code: 'TR', name: 'Tripura', type: 'state', lat: 23.83, lon: 91.28, penetration: 2.5, coverage: 0.15,
    districts: [['Agartala (West Tripura)', 23.83, 91.28], ['Udaipur (Gomati)', 23.53, 91.71], ['Dharmanagar (North)', 24.37, 92.17]],
  },
  {
    code: 'UP', name: 'Uttar Pradesh', type: 'state', lat: 27.6, lon: 80.59, penetration: 7.5, coverage: 0.3,
    districts: [
      ['Lucknow', 26.85, 80.95], ['Kanpur Nagar', 26.45, 80.33], ['Gautam Buddha Nagar (Noida)', 28.57, 77.32],
      ['Ghaziabad', 28.67, 77.42], ['Agra', 27.18, 78.01], ['Varanasi', 25.32, 82.97],
      ['Prayagraj', 25.45, 81.85], ['Meerut', 28.98, 77.71], ['Gorakhpur', 26.76, 83.37],
      ['Bareilly', 28.37, 79.43], ['Aligarh', 27.9, 78.07], ['Moradabad', 28.84, 78.77],
      ['Saharanpur', 29.97, 77.55], ['Mathura', 27.5, 77.67], ['Jhansi', 25.45, 78.57], ['Firozabad', 27.15, 78.4],
    ],
  },
  {
    code: 'UK', name: 'Uttarakhand', type: 'state', lat: 30.07, lon: 79.32, penetration: 4.0, coverage: 0.28,
    districts: [
      ['Dehradun', 30.32, 78.03], ['Haridwar', 29.95, 78.16], ['Haldwani (Nainital)', 29.22, 79.51],
      ['Rudrapur (U.S. Nagar)', 28.97, 79.4],
    ],
  },
  {
    code: 'WB', name: 'West Bengal', type: 'state', lat: 22.99, lon: 87.68, penetration: 4.5, coverage: 0.35,
    districts: [
      ['Kolkata', 22.57, 88.36], ['Howrah', 22.59, 88.32], ['North 24 Parganas', 22.72, 88.48],
      ['South 24 Parganas', 22.5, 88.35], ['Asansol (Paschim Bardhaman)', 23.67, 86.95],
      ['Siliguri (Darjeeling)', 26.72, 88.43], ['Malda', 25.01, 88.14],
    ],
  },
  // ---- Union Territories ----
  {
    code: 'AN', name: 'Andaman & Nicobar Islands', type: 'ut', lat: 11.62, lon: 92.73, penetration: 1.5, coverage: 0.1,
    districts: [['Port Blair', 11.62, 92.73]],
  },
  {
    code: 'CH', name: 'Chandigarh', type: 'ut', lat: 30.74, lon: 76.79, penetration: 9.0, coverage: 0.5,
    districts: [['Chandigarh', 30.74, 76.79]],
  },
  {
    code: 'DH', name: 'Dadra & Nagar Haveli and Daman & Diu', type: 'ut', lat: 20.27, lon: 73.02, penetration: 5.0, coverage: 0.3,
    districts: [['Silvassa', 20.27, 73.02], ['Daman', 20.39, 72.83], ['Diu', 20.71, 70.99]],
  },
  {
    code: 'DL', name: 'Delhi (NCT)', type: 'ut', lat: 28.61, lon: 77.21, penetration: 10.0, coverage: 0.45,
    districts: [
      ['New Delhi', 28.61, 77.21], ['South Delhi', 28.52, 77.22], ['East Delhi', 28.62, 77.29],
      ['North West Delhi', 28.74, 77.07], ['Central Delhi', 28.65, 77.24], ['Dwarka (South West)', 28.59, 77.05],
    ],
  },
  {
    code: 'JK', name: 'Jammu & Kashmir', type: 'ut', lat: 33.25, lon: 75.34, penetration: 3.0, coverage: 0.2,
    districts: [
      ['Srinagar', 34.08, 74.8], ['Jammu', 32.73, 74.86], ['Baramulla', 34.2, 74.34],
      ['Anantnag', 33.73, 75.15], ['Udhampur', 32.92, 75.13],
    ],
  },
  {
    code: 'LA', name: 'Ladakh', type: 'ut', lat: 34.16, lon: 77.58, penetration: 2.0, coverage: 0.12,
    districts: [['Leh', 34.16, 77.58], ['Kargil', 34.56, 76.13]],
  },
  {
    code: 'LD', name: 'Lakshadweep', type: 'ut', lat: 10.57, lon: 72.64, penetration: 1.5, coverage: 0.1,
    districts: [['Kavaratti', 10.57, 72.64]],
  },
  {
    code: 'PY', name: 'Puducherry', type: 'ut', lat: 11.94, lon: 79.83, penetration: 5.0, coverage: 0.35,
    districts: [['Puducherry', 11.94, 79.8], ['Karaikal', 10.92, 79.83], ['Mahe', 11.7, 75.54], ['Yanam', 16.73, 82.22]],
  },
];
