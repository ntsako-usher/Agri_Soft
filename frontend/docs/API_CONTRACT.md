# API contract (proposed)

This is what the frontend expects from the Django backend. Nothing here exists yet, so the backend owner should confirm or adjust it. If a shape changes, update `src/services/farmService.js` and the matching mock in `src/mocks/data.js`.

Base path: `/api`. All endpoints except login require the header `Authorization: Bearer <access token>`. Timestamps are ISO 8601 strings.

## Authentication

| Method | Path | Body | Response |
| --- | --- | --- | --- |
| POST | `/auth/token/` | `{ "username", "password" }` | `{ "access", "refresh" }` (djangorestframework-simplejwt) |

A `401` response signs the user out.

## Fields

`GET /fields/` returns:

```json
[{ "id": "north", "name": "North Field", "hectares": 12.4, "cluster": "Device cluster 01" }]
```

## Overview

`GET /overview/?field=<id>` returns:

```json
{
  "soilMoisture": { "value": 42, "unit": "%", "targetMin": 35, "targetMax": 60, "status": "optimal", "trend": [38, 39, 41] },
  "farmStatus": { "level": "normal", "devicesOnline": 4, "devicesTotal": 6, "activeAlerts": 4 },
  "environment": [{ "key": "temperature", "label": "Temperature", "value": "24.6", "unit": "°C", "note": "Normal" }],
  "irrigation": { "mode": "auto", "on": false, "nextRun": "2026-09-19T06:00:00Z" }
}
```

`environment[].key` is one of `temperature`, `humidity`, `pressure`, `rain`.

## Live monitoring

`GET /monitoring/?field=<id>` returns:

```json
{
  "updatedAt": "2026-09-18T20:15:00Z",
  "soil": { "value": 42, "unit": "%", "targetMin": 35, "targetMax": 60, "sensor": "Sensor 01" },
  "sensors": [{ "key": "smoke", "label": "Smoke detection", "value": "Clear", "unit": "", "status": "Safe", "detail": "No smoke detected", "tone": "healthy" }],
  "deviceHealth": [{ "id": "DF-NS-01", "name": "North Field Sensor 01", "status": "online", "lastSeen": "2 min ago" }]
}
```

`sensors[].key` is one of `temperature`, `humidity`, `pressure`, `light`, `rain`, `smoke`, `motion`. `tone` is `healthy` or `neutral`. `deviceHealth[].status` is `online` or `offline`.

## History

`GET /readings/?range=24h|7d|30d&field=<id or omit for all>` returns:

```json
[{ "id": "north-1", "timestamp": "2026-09-18T09:00:00Z", "field": "north", "device": "Sensor 1", "soilMoisture": 41.2, "temperature": 23.5, "humidity": 60.1, "rainfall": 0 }]
```

## Alerts

`GET /alerts/` returns:

```json
[{ "id": 1, "title": "Soil moisture below threshold", "severity": "critical", "status": "active", "field": "North Field", "device": "Sensor 01", "source": "Soil probe", "createdAt": "2026-09-18T06:32:00Z", "description": "...", "action": "..." }]
```

`severity` is `critical`, `warning` or `informational`. `status` is `active` or `resolved`.

`PATCH /alerts/<id>/` with `{ "status": "resolved" }` returns the updated alert.

## Devices

`GET /devices/` returns:

```json
[{ "id": "DF-NS-01", "name": "North Field Sensor 01", "type": "Soil and climate sensor", "field": "North Field", "status": "online", "signal": 92, "battery": 87, "lastSeen": "2 min ago", "capabilities": ["Soil moisture"], "notes": "..." }]
```

`status` is `online`, `attention` or `offline`. `signal` and `battery` are percentages. Use `null` for `battery` on mains-powered devices.

## Irrigation

`POST /irrigation/` with `{ "field": "north", "on": true }` returns `{ "on": true }`.
