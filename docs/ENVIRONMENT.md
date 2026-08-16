# CB67 Labs — Frontend Environment Variables

All runtime configuration is read in `src/config/env.ts` and nowhere else. Nothing about the
backend is hardcoded in components. Only `VITE_`-prefixed variables reach the browser bundle,
and **no secret may ever be placed in one**.

| Variable                      | Default       | Purpose                                                               |
| ----------------------------- | ------------- | --------------------------------------------------------------------- |
| `VITE_USE_MOCK_API`           | `true`        | `true` serves the deterministic mock adapter; `false` uses HTTP.      |
| `VITE_CB67_API_BASE_URL`      | empty         | Base URL of the management API. Required when mocks are off.          |
| `VITE_CB67_LICENSE_BASE_URL`  | empty         | Base URL of the licensing service, when separate.                     |
| `VITE_CB67_STATUS_BASE_URL`   | empty         | Base URL for the public status feed.                                  |
| `VITE_PROMETHEUS_URL`         | empty         | Prometheus base URL for query deep-links. Management network only.    |
| `VITE_ALERTMANAGER_URL`       | empty         | Alertmanager base URL. Management network only.                       |
| `VITE_CB67_ENVIRONMENT`       | `development` | `production \| staging \| development`; drives the environment badge. |
| `VITE_CB67_TELEMETRY_ENABLED` | `false`       | Enables frontend telemetry when the backend accepts it.               |

## Example: production

```
VITE_USE_MOCK_API=false
VITE_CB67_API_BASE_URL=https://api.cb67labs.api.br
VITE_CB67_LICENSE_BASE_URL=https://api.cb67labs.api.br/licensing
VITE_CB67_STATUS_BASE_URL=https://status.cb67labs.api.br
VITE_CB67_ENVIRONMENT=production
VITE_CB67_TELEMETRY_ENABLED=true
```

## Example: local development against the mocks

```
VITE_USE_MOCK_API=true
VITE_CB67_ENVIRONMENT=development
```

## Notes

- Variables are inlined at build time; changing one requires a rebuild.
- The Control Center is expected to be reachable only from the management network
  (`admin.cb67labs.api.br`), enforced by the reverse proxy and firewall, not by the frontend.
- Grafana is **not deployed**. The observability screen is fed by Prometheus and
  Alertmanager instead (D-018). Deep-dive links to an external Grafana have no
  target and must not be presented as working.
