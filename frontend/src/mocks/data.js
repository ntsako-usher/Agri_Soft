// Mock data used while VITE_USE_MOCK_DATA=true.
// Shapes here are the contract the Django API should return (see docs/API_CONTRACT.md).

const MINUTE = 60 * 1000;
const HOUR = 60 * MINUTE;
const ago = (ms) => new Date(Date.now() - ms).toISOString();

export const fields = [
  { id: 'north', name: 'North Field', hectares: 12.4, cluster: 'Device cluster 01' },
  { id: 'south', name: 'South Field', hectares: 8.9, cluster: 'Device cluster 02' },
  { id: 'greenhouse', name: 'Greenhouse', hectares: 0.6, cluster: 'Device cluster 03' },
];

export const overview = {
  soilMoisture: {
    value: 42,
    unit: '%',
    targetMin: 35,
    targetMax: 60,
    status: 'optimal',
    trend: [38, 39, 37, 36, 40, 43, 45, 44, 41, 40, 42, 46, 48, 47, 44, 43, 41, 39, 40, 42, 44, 43, 42, 42],
  },
  farmStatus: { level: 'normal', devicesOnline: 4, devicesTotal: 6, activeAlerts: 4 },
  environment: [
    { key: 'temperature', label: 'Temperature', value: '24.6', unit: '°C', note: 'Normal' },
    { key: 'humidity', label: 'Humidity', value: '61', unit: '%', note: 'Normal' },
    { key: 'pressure', label: 'Pressure', value: '1012', unit: ' hPa', note: 'Stable' },
    { key: 'rain', label: 'Rainfall', value: 'None', unit: '', note: 'Last 24h' },
  ],
  irrigation: { mode: 'auto', on: false, nextRun: new Date(Date.now() + 9 * HOUR).toISOString() },
};

export const monitoring = {
  updatedAt: new Date().toISOString(),
  soil: { value: 42, unit: '%', targetMin: 35, targetMax: 60, sensor: 'Sensor 01' },
  sensors: [
    { key: 'temperature', label: 'Air temperature', value: '24.6', unit: '°C', status: 'Normal', detail: 'Within range', tone: 'healthy' },
    { key: 'humidity', label: 'Relative humidity', value: '61', unit: '%', status: 'Normal', detail: 'Stable', tone: 'healthy' },
    { key: 'pressure', label: 'Atmospheric pressure', value: '1012', unit: ' hPa', status: 'Normal', detail: 'Stable', tone: 'neutral' },
    { key: 'light', label: 'Light intensity', value: '68', unit: '%', status: 'Good', detail: 'Daylight', tone: 'healthy' },
    { key: 'rain', label: 'Rain sensor', value: 'Dry', unit: '', status: 'Dry', detail: 'No rain detected', tone: 'neutral' },
    { key: 'smoke', label: 'Smoke detection', value: 'Clear', unit: '', status: 'Safe', detail: 'No smoke detected', tone: 'healthy' },
    { key: 'motion', label: 'Motion security', value: 'Clear', unit: '', status: 'Secure', detail: 'No intrusion', tone: 'healthy' },
  ],
  deviceHealth: [
    { id: 'DF-NS-01', name: 'North Field Sensor 01', status: 'online', lastSeen: '2 min ago' },
    { id: 'IC-IR-02', name: 'Irrigation controller', status: 'online', lastSeen: '1 min ago' },
    { id: 'WE-ENV-04', name: 'Weather station', status: 'online', lastSeen: '4 min ago' },
    { id: 'SA-SM-05', name: 'Smoke safety sensor', status: 'offline', lastSeen: '2 hours ago' },
  ],
};

export const alerts = [
  { id: 1, title: 'Soil moisture below threshold', severity: 'critical', status: 'active', field: 'North Field', device: 'Sensor 01', source: 'Soil probe', createdAt: ago(3 * HOUR), description: 'Moisture dropped to 22.4% in the north irrigation zone. This is below the recommended 35% minimum for healthy crop growth.', action: 'Irrigation was triggered automatically.' },
  { id: 2, title: 'High temperature warning', severity: 'warning', status: 'active', field: 'Greenhouse', device: 'Climate sensor 02', source: 'Temperature sensor', createdAt: ago(4 * HOUR), description: 'Temperature has stayed above 30°C for the past hour. Check ventilation to prevent plant stress.', action: 'Cooling cycle recommended.' },
  { id: 3, title: 'Heavy rainfall detected', severity: 'informational', status: 'resolved', field: 'South Field', device: 'Rain gauge 04', source: 'Weather station', createdAt: ago(20 * HOUR), description: 'Moderate rain was detected across the south plot. Soil moisture improved after the event.', action: 'Irrigation schedule was paused.' },
  { id: 4, title: 'Smoke or fire detected', severity: 'critical', status: 'active', field: 'North Field', device: 'Safety sensor 07', source: 'Smoke detector', createdAt: ago(7 * HOUR), description: 'Smoke density exceeded the safe threshold near the equipment shed. Inspect immediately.', action: 'Alarm is active. Emergency response recommended.' },
  { id: 5, title: 'Motion detected near fence', severity: 'critical', status: 'active', field: 'Greenhouse', device: 'Security camera 03', source: 'Motion sensor', createdAt: ago(9 * HOUR), description: 'Movement was detected near the west boundary fence during the early morning.', action: 'Scout the area and verify the perimeter.' },
  { id: 6, title: 'Device offline', severity: 'warning', status: 'resolved', field: 'Greenhouse', device: 'Sensor 09', source: 'System health', createdAt: ago(30 * HOUR), description: 'A greenhouse sensor stopped transmitting for 18 minutes before reconnecting.', action: 'Signal restored after network retry.' },
  { id: 7, title: 'Irrigation cycle completed', severity: 'informational', status: 'resolved', field: 'North Field', device: 'Valve 02', source: 'Irrigation controller', createdAt: ago(11 * HOUR), description: 'A scheduled irrigation cycle finished and no abnormalities were detected.', action: 'No action required.' },
  { id: 8, title: 'Battery low on sensor node', severity: 'warning', status: 'active', field: 'South Field', device: 'Node 14', source: 'Hardware monitor', createdAt: ago(12 * HOUR), description: 'The sensor node battery dropped below 18%. Schedule a replacement soon.', action: 'Plan a maintenance visit this week.' },
];

export const devices = [
  { id: 'DF-NS-01', name: 'North Field Sensor 01', type: 'Soil and climate sensor', field: 'North Field', status: 'online', signal: 92, battery: 87, lastSeen: '2 min ago', capabilities: ['Soil moisture', 'Temperature', 'Humidity'], notes: 'Primary sensor on the north plot. Reports every 5 minutes.' },
  { id: 'IC-IR-02', name: 'Irrigation controller', type: 'Automation controller', field: 'North Field', status: 'online', signal: 88, battery: null, lastSeen: '1 min ago', capabilities: ['Valve control', 'Schedule logic', 'Flow checks'], notes: 'Automated watering is active for scheduled cycles only.' },
  { id: 'SM-SEC-03', name: 'Security motion sensor', type: 'Perimeter sensor', field: 'Greenhouse', status: 'attention', signal: 64, battery: 31, lastSeen: '9 min ago', capabilities: ['Motion detection', 'Boundary alerting'], notes: 'Battery is low. Replace it soon.' },
  { id: 'WE-ENV-04', name: 'Weather station', type: 'Weather station', field: 'South Field', status: 'online', signal: 95, battery: 76, lastSeen: '4 min ago', capabilities: ['Rain detection', 'Wind', 'Pressure'], notes: 'Reliable readings across the south field.' },
  { id: 'SA-SM-05', name: 'Smoke safety sensor', type: 'Safety device', field: 'North Field', status: 'offline', signal: 0, battery: 14, lastSeen: '2 hours ago', capabilities: ['Smoke detection', 'Alarm trigger'], notes: 'Offline. Inspect and reconnect this safety sensor.' },
  { id: 'GH-CL-06', name: 'Greenhouse climate sensor', type: 'Climate monitor', field: 'Greenhouse', status: 'online', signal: 81, battery: 58, lastSeen: '3 min ago', capabilities: ['Temperature', 'Humidity', 'Ventilation'], notes: 'Tracking within expected greenhouse values.' },
];

// Generates 45 days of readings per field, 8 per day (every 3 hours), for the History page.
export function buildHistory() {
  const records = [];
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  const clamp = (v, lo, hi) => Number(Math.max(lo, Math.min(hi, v)).toFixed(1));

  fields.forEach((field, f) => {
    for (let day = 0; day < 45; day += 1) {
      for (let slot = 0; slot < 8; slot += 1) {
        const at = new Date(start.getTime() - (44 - day) * 24 * HOUR + slot * 3 * HOUR);
        const phase = day + slot / 2 + f * 2;
        records.push({
          id: `${field.id}-${day}-${slot}`,
          timestamp: at.toISOString(),
          field: field.id,
          device: `Sensor ${((day + slot + f) % 5) + 1}`,
          soilMoisture: clamp(38 + Math.sin(phase * 0.8) * 12 + (slot % 3 === 0 ? 3 : 0), 22, 62),
          temperature: clamp(22 + Math.cos((day + slot + f) * 0.9) * 5 + (slot > 5 ? 1.5 : 0), 16, 33),
          humidity: clamp(58 + Math.sin((day + slot + f) * 0.7) * 12, 35, 82),
          rainfall: (slot === 2 || slot === 6) && (day + f) % 5 !== 0 ? 6 : slot === 5 && day % 6 === 0 ? 12 : 0,
        });
      }
    }
  });
  return records.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
}
