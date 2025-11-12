# SDK Generation Guide

This guide explains how to generate JavaScript/TypeScript and Python SDKs from the backend OpenAPI spec (`openapi.yaml`).

OpenAPI spec location:
- `openapi.yaml` (repo root)
- Live (when backend is running): `http://localhost:8000/api/v1/openapi.json`

## Prerequisites

- Option A: Use Docker (recommended, no local Java needed)
- Option B: Install OpenAPI Generator CLI locally
  - Java 11+
  - `npm install @openapitools/openapi-generator-cli -g` or use `npx`

## Generate TypeScript SDK (axios)

- Output path: `sdk/js`

Using Docker:
```bash
docker run --rm \
  -v "$(pwd)":/local \
  openapitools/openapi-generator-cli:v7.7.0 \
  generate \
  -i /local/openapi.yaml \
  -g typescript-axios \
  -o /local/sdk/js \
  --additional-properties=supportsES6=true,withSeparateModelsAndApi=true,npmName=@serwis-prawny/sdk-js
```

Using npx:
```bash
npx @openapitools/openapi-generator-cli@^2.13.4 generate \
  -i openapi.yaml \
  -g typescript-axios \
  -o sdk/js \
  --additional-properties=supportsES6=true,withSeparateModelsAndApi=true,npmName=@serwis-prawny/sdk-js
```

Install and use:
```bash
cd sdk/js
npm install
# Import in your app
# import { Configuration, CasesApi } from "./dist";
```

## Generate Python SDK (python)

- Output path: `sdk/python`

Using Docker:
```bash
docker run --rm \
  -v "$(pwd)":/local \
  openapitools/openapi-generator-cli:v7.7.0 \
  generate \
  -i /local/openapi.yaml \
  -g python \
  -o /local/sdk/python \
  --additional-properties=packageName=serwis_prawny_sdk,projectName=serwis-prawny-sdk,packageVersion=0.1.0
```

Using npx:
```bash
npx @openapitools/openapi-generator-cli@^2.13.4 generate \
  -i openapi.yaml \
  -g python \
  -o sdk/python \
  --additional-properties=packageName=serwis_prawny_sdk,projectName=serwis-prawny-sdk,packageVersion=0.1.0
```

Install locally for development:
```bash
cd sdk/python
pip install -e .
```

## Tips

- To regenerate from the live backend, change `-i` to `http://localhost:8000/api/v1/openapi.json`.
- Commit only the generated SDKs if you want consumers without a generator to use them; otherwise, consider generating them in CI and publishing artifacts/packages instead.
- For publishing:
  - JS/TS: configure `package.json` and publish to npm (scoped or public)
  - Python: configure `pyproject.toml`/`setup.cfg` and publish to PyPI
