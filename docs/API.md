# API Reference

Complete reference for Fluxora's REST API endpoints, including authentication, data management, predictions, and analytics.

---

## 📑 Table of Contents

- [Base URL](#base-url)
- [Authentication](#authentication)
- [Response Format](#response-format)
- [Error Handling](#error-handling)
- [Endpoints](#endpoints)
  - [System Endpoints](#system-endpoints)
  - [Authentication Endpoints](#authentication-endpoints)
  - [Data Management Endpoints](#data-management-endpoints)
  - [Prediction Endpoints](#prediction-endpoints)
  - [Analytics Endpoints](#analytics-endpoints)
- [Rate Limiting](#rate-limiting)
- [Examples](#examples)

---

## Base URL

| Environment     | Base URL                                  |
| --------------- | ----------------------------------------- |
| **Development** | `http://localhost:8000`                   |
| **Staging**     | `https://staging-api.fluxora.example.com` |
| **Production**  | `https://api.fluxora.example.com`         |

All API endpoints are prefixed with `/v1` for versioning.

---

## Authentication

Fluxora uses JWT (JSON Web Token) based authentication.

### Authentication Flow

1. **Register** a new user account (`POST /v1/auth/register`)
2. **Login** to receive access token (`POST /v1/auth/login`)
3. **Use token** in `Authorization` header for authenticated requests

### Token Usage

Include the access token in the Authorization header:

```http
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

### Token Expiration

- Access tokens expire after 30 days
- Refresh by logging in again to get a new token

---

## Response Format

### Success Response

```json
{
  "data": {/* response data */},
  "status": "success",
  "timestamp": "2025-12-30T10:00:00Z"
}
```

### Error Response

```json
{
  "detail": "Error message describing the issue",
  "status_code": 400
}
```

---

## Error Handling

### HTTP Status Codes

| Status Code | Meaning               | Description                       |
| ----------- | --------------------- | --------------------------------- |
| **200**     | OK                    | Request successful                |
| **201**     | Created               | Resource created successfully     |
| **400**     | Bad Request           | Invalid request parameters        |
| **401**     | Unauthorized          | Missing or invalid authentication |
| **403**     | Forbidden             | Insufficient permissions          |
| **404**     | Not Found             | Resource not found                |
| **422**     | Unprocessable Entity  | Validation error                  |
| **500**     | Internal Server Error | Server-side error                 |
| **503**     | Service Unavailable   | Service temporarily unavailable   |

### Common Error Messages

| Error                 | Cause                            | Solution             |
| --------------------- | -------------------------------- | -------------------- |
| `Invalid credentials` | Incorrect username/password      | Check credentials    |
| `Token expired`       | Access token has expired         | Login again          |
| `Invalid token`       | Malformed or invalid token       | Get new token        |
| `Resource not found`  | Requested resource doesn't exist | Verify ID            |
| `Validation error`    | Invalid request data             | Check request format |

---

## Endpoints

### System Endpoints

#### GET /health

Health check endpoint to verify API is running.

**Authentication:** Not required

**Request:**

```bash
curl -X GET http://localhost:8000/health
```

**Response:**

```json
{
  "status": "ok"
}
```

**Response Fields:**

| Field    | Type   | Description                                |
| -------- | ------ | ------------------------------------------ |
| `status` | string | Service health status ("ok" or "degraded") |

---

#### GET /

Root endpoint providing API information.

**Authentication:** Not required

**Request:**

```bash
curl -X GET http://localhost:8000/
```

**Response:**

```json
{
  "message": "Fluxora API",
  "version": "1.0.0",
  "docs": "/docs"
}
```

---

### Authentication Endpoints

#### POST /v1/auth/register

Register a new user account.

**Authentication:** Not required

**Request Parameters:**

| Name        | Type   | Required | Description            | Example            |
| ----------- | ------ | -------- | ---------------------- | ------------------ |
| `email`     | string | Yes      | User email address     | `user@example.com` |
| `password`  | string | Yes      | Password (min 8 chars) | `securepass123`    |
| `full_name` | string | Yes      | User's full name       | `John Doe`         |

**Request:**

```bash
curl -X POST http://localhost:8000/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user@example.com",
    "password": "securepass123",
    "full_name": "John Doe"
  }'
```

**Response (201 Created):**

```json
{
  "id": 1,
  "email": "user@example.com",
  "full_name": "John Doe",
  "is_active": true,
  "created_at": "2025-12-30T10:00:00Z"
}
```

---

#### POST /v1/auth/login

Login and receive access token.

**Authentication:** Not required

**Request Parameters:**

| Name       | Type   | Required | Description           | Example            |
| ---------- | ------ | -------- | --------------------- | ------------------ |
| `username` | string | Yes      | User email (username) | `user@example.com` |
| `password` | string | Yes      | User password         | `securepass123`    |

**Request:**

```bash
curl -X POST http://localhost:8000/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "username": "user@example.com",
    "password": "securepass123"
  }'
```

**Response (200 OK):**

```json
{
  "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "token_type": "bearer",
  "user": {
    "id": 1,
    "email": "user@example.com",
    "full_name": "John Doe"
  }
}
```

---

#### GET /v1/auth/me

Get current authenticated user information.

**Authentication:** Required

**Request:**

```bash
curl -X GET http://localhost:8000/v1/auth/me \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

**Response (200 OK):**

```json
{
  "id": 1,
  "email": "user@example.com",
  "full_name": "John Doe",
  "is_active": true,
  "created_at": "2025-12-30T10:00:00Z"
}
```

---

### Data Management Endpoints

#### POST /v1/data/

Create a new energy data record.

**Authentication:** Required

**Request Parameters:**

| Name               | Type     | Required | Default | Description               | Example               |
| ------------------ | -------- | -------- | ------- | ------------------------- | --------------------- |
| `timestamp`        | datetime | Yes      | -       | Data timestamp (ISO 8601) | `2025-12-30T10:00:00` |
| `consumption_kwh`  | float    | Yes      | -       | Energy consumption in kWh | `45.2`                |
| `cost_usd`         | float    | No       | `null`  | Cost in USD               | `4.52`                |
| `temperature_c`    | float    | No       | `null`  | Temperature in Celsius    | `22.5`                |
| `humidity_percent` | float    | No       | `null`  | Humidity percentage       | `65.0`                |

**Request:**

```bash
curl -X POST http://localhost:8000/v1/data/ \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "timestamp": "2025-12-30T10:00:00",
    "consumption_kwh": 45.2,
    "cost_usd": 4.52,
    "temperature_c": 22.5,
    "humidity_percent": 65.0
  }'
```

**Response (201 Created):**

```json
{
  "id": 123,
  "user_id": 1,
  "timestamp": "2025-12-30T10:00:00",
  "consumption_kwh": 45.2,
  "cost_usd": 4.52,
  "temperature_c": 22.5,
  "humidity_percent": 65.0,
  "created_at": "2025-12-30T10:05:00Z"
}
```

---

#### GET /v1/data/

Retrieve energy data records with optional filtering.

**Authentication:** Required

**Query Parameters:**

| Name         | Type    | Required | Default     | Description                    | Example      |
| ------------ | ------- | -------- | ----------- | ------------------------------ | ------------ |
| `start_date` | date    | No       | 30 days ago | Start date filter (YYYY-MM-DD) | `2025-12-01` |
| `end_date`   | date    | No       | today       | End date filter (YYYY-MM-DD)   | `2025-12-30` |
| `limit`      | integer | No       | 100         | Maximum records to return      | `50`         |
| `offset`     | integer | No       | 0           | Pagination offset              | `0`          |

**Request:**

```bash
curl -X GET "http://localhost:8000/v1/data/?start_date=2025-12-01&end_date=2025-12-30&limit=50" \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

**Response (200 OK):**

```json
[
  {
    "id": 123,
    "user_id": 1,
    "timestamp": "2025-12-30T10:00:00",
    "consumption_kwh": 45.2,
    "cost_usd": 4.52,
    "temperature_c": 22.5,
    "humidity_percent": 65.0
  },
  {
    "id": 124,
    "user_id": 1,
    "timestamp": "2025-12-30T11:00:00",
    "consumption_kwh": 48.7,
    "cost_usd": 4.87,
    "temperature_c": 23.1,
    "humidity_percent": 63.0
  }
]
```

---

#### GET /v1/data/{id}

Retrieve a specific energy data record by ID.

**Authentication:** Required

**Path Parameters:**

| Name | Type    | Required | Description | Example |
| ---- | ------- | -------- | ----------- | ------- |
| `id` | integer | Yes      | Record ID   | `123`   |

**Request:**

```bash
curl -X GET http://localhost:8000/v1/data/123 \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

**Response (200 OK):**

```json
{
  "id": 123,
  "user_id": 1,
  "timestamp": "2025-12-30T10:00:00",
  "consumption_kwh": 45.2,
  "cost_usd": 4.52,
  "temperature_c": 22.5,
  "humidity_percent": 65.0
}
```

---

#### PUT /v1/data/{id}

Update an existing energy data record.

**Authentication:** Required

**Path Parameters:**

| Name | Type    | Required | Description         | Example |
| ---- | ------- | -------- | ------------------- | ------- |
| `id` | integer | Yes      | Record ID to update | `123`   |

**Request Parameters:**

| Name               | Type  | Required | Default   | Description         | Example |
| ------------------ | ----- | -------- | --------- | ------------------- | ------- |
| `consumption_kwh`  | float | No       | unchanged | Updated consumption | `46.0`  |
| `cost_usd`         | float | No       | unchanged | Updated cost        | `4.60`  |
| `temperature_c`    | float | No       | unchanged | Updated temperature | `23.0`  |
| `humidity_percent` | float | No       | unchanged | Updated humidity    | `66.0`  |

**Request:**

```bash
curl -X PUT http://localhost:8000/v1/data/123 \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "consumption_kwh": 46.0,
    "cost_usd": 4.60
  }'
```

**Response (200 OK):**

```json
{
  "id": 123,
  "user_id": 1,
  "timestamp": "2025-12-30T10:00:00",
  "consumption_kwh": 46.0,
  "cost_usd": 4.6,
  "temperature_c": 22.5,
  "humidity_percent": 65.0,
  "updated_at": "2025-12-30T10:30:00Z"
}
```

---

#### DELETE /v1/data/{id}

Delete an energy data record.

**Authentication:** Required

**Path Parameters:**

| Name | Type    | Required | Description         | Example |
| ---- | ------- | -------- | ------------------- | ------- |
| `id` | integer | Yes      | Record ID to delete | `123`   |

**Request:**

```bash
curl -X DELETE http://localhost:8000/v1/data/123 \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

**Response (200 OK):**

```json
{
  "message": "Record deleted successfully",
  "id": 123
}
```

---

### Prediction Endpoints

#### GET /v1/predictions/

Generate energy consumption predictions for future time periods.

**Authentication:** Required

**Query Parameters:**

| Name   | Type    | Required | Default | Description               | Example |
| ------ | ------- | -------- | ------- | ------------------------- | ------- |
| `days` | integer | No       | 7       | Number of days to predict | `7`     |

**Request:**

```bash
curl -X GET "http://localhost:8000/v1/predictions/?days=7" \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

**Response (200 OK):**

```json
[
  {
    "timestamp": "2025-12-31T00:00:00",
    "predicted_consumption": 52.34,
    "confidence_interval": {
      "lower": 47.11,
      "upper": 57.57
    }
  },
  {
    "timestamp": "2025-12-31T01:00:00",
    "predicted_consumption": 48.92,
    "confidence_interval": {
      "lower": 44.03,
      "upper": 53.81
    }
  }
]
```

**Response Fields:**

| Field                       | Type     | Description                             |
| --------------------------- | -------- | --------------------------------------- |
| `timestamp`                 | datetime | Prediction timestamp (hourly intervals) |
| `predicted_consumption`     | float    | Predicted energy consumption in kWh     |
| `confidence_interval.lower` | float    | Lower bound of 90% confidence interval  |
| `confidence_interval.upper` | float    | Upper bound of 90% confidence interval  |

---

### Analytics Endpoints

#### GET /v1/analytics/

Retrieve aggregated analytics data for a specified period.

**Authentication:** Required

**Query Parameters:**

| Name     | Type   | Required | Default | Description                                 | Example |
| -------- | ------ | -------- | ------- | ------------------------------------------- | ------- |
| `period` | string | No       | `month` | Aggregation period: `week`, `month`, `year` | `month` |

**Request:**

```bash
curl -X GET "http://localhost:8000/v1/analytics/?period=month" \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

**Response (200 OK):**

```json
[
  {
    "label": "2025-12-01",
    "consumption": 1205.3,
    "cost": 120.53,
    "temperature": 21.5,
    "efficiency": 78.2
  },
  {
    "label": "2025-12-02",
    "consumption": 1187.6,
    "cost": 118.76,
    "temperature": 20.8,
    "efficiency": 79.1
  }
]
```

**Response Fields:**

| Field         | Type   | Description                               |
| ------------- | ------ | ----------------------------------------- |
| `label`       | string | Time period label (date or week)          |
| `consumption` | float  | Total consumption in kWh for period       |
| `cost`        | float  | Total cost in USD for period              |
| `temperature` | float  | Average temperature in Celsius (nullable) |
| `efficiency`  | float  | Calculated efficiency metric              |

---

## Rate Limiting

| Tier         | Requests per Hour | Burst Limit |
| ------------ | ----------------- | ----------- |
| **Free**     | 100               | 10          |
| **Standard** | 1,000             | 50          |
| **Premium**  | 10,000            | 200         |

Rate limit headers included in responses:

```http
X-RateLimit-Limit: 1000
X-RateLimit-Remaining: 999
X-RateLimit-Reset: 1640995200
```

---

## Examples

### Complete Workflow Example

```bash
#!/bin/bash

# Configuration
API_BASE="http://localhost:8000"

# 1. Register user
echo "Registering user..."
curl -X POST $API_BASE/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "demo@example.com",
    "password": "demo12345",
    "full_name": "Demo User"
  }'

# 2. Login and get token
echo -e "\n\nLogging in..."
TOKEN=$(curl -X POST $API_BASE/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "username": "demo@example.com",
    "password": "demo12345"
  }' | jq -r '.access_token')

echo "Token: $TOKEN"

# 3. Add energy data
echo -e "\n\nAdding energy data..."
curl -X POST $API_BASE/v1/data/ \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "timestamp": "2025-12-30T10:00:00",
    "consumption_kwh": 45.2,
    "cost_usd": 4.52,
    "temperature_c": 22.5,
    "humidity_percent": 65.0
  }'

# 4. Get predictions
echo -e "\n\nGetting predictions..."
curl -X GET "$API_BASE/v1/predictions/?days=3" \
  -H "Authorization: Bearer $TOKEN"

# 5. Get analytics
echo -e "\n\nGetting analytics..."
curl -X GET "$API_BASE/v1/analytics/?period=week" \
  -H "Authorization: Bearer $TOKEN"
```

### Python Client Example

```python
import requests
from datetime import datetime

class FluxoraClient:
    def __init__(self, base_url="http://localhost:8000"):
        self.base_url = base_url
        self.token = None

    def login(self, email, password):
        """Login and store access token"""
        response = requests.post(
            f"{self.base_url}/v1/auth/login",
            json={"username": email, "password": password}
        )
        response.raise_for_status()
        self.token = response.json()['access_token']
        return self.token

    def _headers(self):
        """Get authorization headers"""
        return {"Authorization": f"Bearer {self.token}"}

    def add_data(self, timestamp, consumption, **kwargs):
        """Add energy data record"""
        data = {
            "timestamp": timestamp,
            "consumption_kwh": consumption,
            **kwargs
        }
        response = requests.post(
            f"{self.base_url}/v1/data/",
            json=data,
            headers=self._headers()
        )
        response.raise_for_status()
        return response.json()

    def get_predictions(self, days=7):
        """Get energy predictions"""
        response = requests.get(
            f"{self.base_url}/v1/predictions/",
            params={"days": days},
            headers=self._headers()
        )
        response.raise_for_status()
        return response.json()

    def get_analytics(self, period="month"):
        """Get analytics data"""
        response = requests.get(
            f"{self.base_url}/v1/analytics/",
            params={"period": period},
            headers=self._headers()
        )
        response.raise_for_status()
        return response.json()

# Usage
client = FluxoraClient()
client.login("demo@example.com", "demo12345")

# Add data
client.add_data(
    timestamp="2025-12-30T10:00:00",
    consumption=45.2,
    cost_usd=4.52,
    temperature_c=22.5
)

# Get predictions
predictions = client.get_predictions(days=7)
print(f"7-day average prediction: {sum(p['predicted_consumption'] for p in predictions[:7])/7:.2f} kWh")

# Get analytics
analytics = client.get_analytics(period="week")
print(f"Weekly analytics points: {len(analytics)}")
```

---

## Next Steps

- **[CLI Reference](CLI.md)** - Command-line interface documentation
- **[Configuration](CONFIGURATION.md)** - Configure API settings
- **[Examples](examples/)** - More detailed usage examples
- **[Troubleshooting](TROUBLESHOOTING.md)** - API error solutions

---

**Need Help?** Open an issue on [GitHub](https://github.com/quantsingularity/Fluxora/issues) or check [Troubleshooting](TROUBLESHOOTING.md).
