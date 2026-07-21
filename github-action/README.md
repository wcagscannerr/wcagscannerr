# WCAG Scanner — GitHub Action

Thin wrapper around [`POST /api/v1/scan`](https://www.wcagscannerr.com) that
exits **0** when the target scores at-or-above your threshold, and **1**
when it scores below — so the step naturally turns red in GitHub Actions,
GitLab CI, Jenkins, CircleCI, etc.

API + key required: only Enterprise plan accounts have API access
(`/api/v1/scan`, `/api/v1/keys`). See your dashboard API Keys page to grab
or generate one.

## Inputs

| Input | Required | Default | Description |
|-------|----------|---------|-------------|
| `api-key` | yes | — | Bearer token. Use `${{ secrets.WCAG_API_KEY }}` in production. |
| `url` | yes | — | Target URL. |
| `fail-threshold` | no | `85` | Score (0–100) below which the workflow should fail. |
| `api-base-url` | no | `https://www.wcagscannerr.com` | Override only when self-hosting. |

## GitHub Actions setup

1. Get your API key from the **Settings → API Keys** page (Enterprise only).
2. Add it as a repository or environment secret:
   `Settings → Secrets and variables → Actions → New repository secret` → name: `WCAG_API_KEY`.
3. Add a step to your workflow:

```yaml
name: WCAG compliance gate
on:
  pull_request:
    paths: ['**/*.tsx', '**/*.ts', '**/*.html']
jobs:
  a11y:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: WCAG scan
        uses: wcagscannerr/wcag-scanner-action@v1
        with:
          api-key: ${{ secrets.WCAG_API_KEY }}
          url: https://staging.example.com
          fail-threshold: 90
```

The step fails when the score drops below 90; pass through silently otherwise.

## GitLab CI / Jenkins / CircleCI

The Action is just a thin wrapper around a POST request — call the same
endpoint from any CI provider:

```bash
curl -fsS \
  -H "Authorization: Bearer ${WCAG_API_KEY}" \
  -H "Content-Type: application/json" \
  -d '{"url":"https://staging.example.com","fail_threshold":90}' \
  https://www.wcagscannerr.com/api/v1/scan
```

`curl` exits non-zero on a below-threshold response (the API returns 400 in
that case). Pipe steps:

```yaml
# .gitlab-ci.yml excerpt
a11y:
  stage: test
  script:
    - curl -fsS -H "Authorization: Bearer $WCAG_API_KEY" \
        -H "Content-Type: application/json" \
        -d "{\"url\":\"$DEPLOY_URL\",\"fail_threshold\":90}" \
        https://www.wcagscannerr.com/api/v1/scan
```

## Behaviour

| HTTP | meaning | action exit code |
|------|---------|------------------|
| 200  | score ≥ threshold | `0` (success) |
| 400  | score < threshold | `1` (failure — turns the job red) |
| 401  | invalid / revoked key | `2` |
| 403  | plan lacks API access | `2` |
| 429  | monthly scan quota exhausted | `2` |
| 5xx  | WCAG Scanner outage | `2` |

## Local development

The wrapper is a 70-line Node script. To run it from your laptop:

```bash
export WCAG_API_KEY=wcag_live_...
export WCAG_SCAN_URL=https://example.com
export WCAG_FAIL_THRESHOLD=85
node run-scan.js
```
