import { CloudRain, Droplets, Flame, Gauge, Lightbulb, ShieldAlert, Thermometer } from 'lucide-react';

// Mock/API data carries a `key`; the UI maps it to an icon here.
export const sensorIcons = {
  temperature: Thermometer,
  humidity: Droplets,
  pressure: Gauge,
  light: Lightbulb,
  rain: CloudRain,
  smoke: Flame,
  motion: ShieldAlert,
};
