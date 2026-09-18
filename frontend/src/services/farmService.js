import { config } from '../config';
import { http } from './http';
import * as mock from '../mocks/data';

// Every function returns a Promise, so pages don't care whether the data
// is mocked or real. Toggle with VITE_USE_MOCK_DATA in .env.

const wait = (ms = 350) => new Promise((resolve) => setTimeout(resolve, ms));
const fromMock = async (value) => {
  await wait();
  return structuredClone(value);
};

// In-memory copies so mock actions (resolve alert, toggle irrigation) feel real.
const mockAlerts = structuredClone(mock.alerts);
let mockIrrigationOn = mock.overview.irrigation.on;

export const getFields = () =>
  config.useMock ? fromMock(mock.fields) : http('/fields/');

export const getOverview = (fieldId) =>
  config.useMock
    ? fromMock({ ...mock.overview, irrigation: { ...mock.overview.irrigation, on: mockIrrigationOn } })
    : http('/overview/', { params: { field: fieldId } });

export const getMonitoring = (fieldId) =>
  config.useMock ? fromMock({ ...mock.monitoring, updatedAt: new Date().toISOString() }) : http('/monitoring/', { params: { field: fieldId } });

export const getHistory = ({ range, field }) => {
  if (!config.useMock) return http('/readings/', { params: { range, field } });
  const days = { '24h': 1, '7d': 7, '30d': 30 }[range] ?? 7;
  const since = Date.now() - days * 24 * 60 * 60 * 1000;
  const records = mock
    .buildHistory()
    .filter((r) => new Date(r.timestamp).getTime() >= since && (!field || field === 'all' || r.field === field));
  return fromMock(records);
};

export const getAlerts = () =>
  config.useMock ? fromMock(mockAlerts) : http('/alerts/');

export const updateAlertStatus = async (id, status) => {
  if (!config.useMock) return http(`/alerts/${id}/`, { method: 'PATCH', body: { status } });
  const alert = mockAlerts.find((a) => a.id === id);
  if (alert) alert.status = status;
  return fromMock(alert);
};

export const getDevices = () =>
  config.useMock ? fromMock(mock.devices) : http('/devices/');

export const setIrrigation = async (fieldId, on) => {
  if (!config.useMock) return http('/irrigation/', { method: 'POST', body: { field: fieldId, on } });
  mockIrrigationOn = on;
  return fromMock({ on });
};
