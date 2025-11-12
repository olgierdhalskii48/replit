# Releases and Versioning

This document describes how we version, tag, generate SDKs, publish packages (npm/PyPI), and produce GitHub Releases.

## Versioning

- We follow SemVer: MAJOR.MINOR.PATCH (e.g., v1.2.3)
- Backward-incompatible API changes bump MAJOR.
- Backward-compatible feature additions bump MINOR.
- Backward-compatible bugfixes bump PATCH.

## Tagging

- Create an annotated git tag with a leading `v`:

```bash
git tag -a vX.Y.Z -m "Release vX.Y.Z"
git push origin vX.Y.Z
```

Pushing a tag triggers the release workflow to:
- Generate SDKs from `openapi.yaml`
- Create a GitHub Release and attach SDK artifacts
- Publish JS/TS SDK to npm (if configured)
- Publish Python SDK to PyPI (if configured)

## Changelog

- Maintain a CHANGELOG.md or include release notes in the tag message/PR.
- The release workflow attaches artifacts and uses tag notes. You can manually edit the release notes post-run.

## SDK Publishing Requirements

- JS/TS SDK (`sdk/js`): must contain a valid `package.json` with name, version, and registry settings
  - Ensure the version in `package.json` matches the release tag (without the leading `v`).
- Python SDK (`sdk/python`): must contain packaging metadata (`pyproject.toml` or `setup.cfg/setup.py`)
  - Ensure the version matches the release tag (without the leading `v`).

## Secrets

Add these repository secrets in GitHub:
- `NPM_TOKEN` — npm auth token with publish rights (for npm publishes)
- `PYPI_API_TOKEN` — PyPI token (for PyPI publishes)
- `GITHUB_TOKEN` — provided automatically by Actions for releases (no setup needed)

## Release Steps (Manual)

1. Ensure `openapi.yaml` and code are up to date.
2. Update SDK metadata versions:
   - `sdk/js/package.json` → `version: "X.Y.Z"`
   - `sdk/python/pyproject.toml` (or `setup.cfg`) → `version = "X.Y.Z"`
3. Commit changes and merge to `main`.
4. Create a tag `vX.Y.Z` and push.
5. Verify GitHub Actions:
   - Release workflow completes.
   - GitHub Release has SDK artifacts attached.
   - npm/PyPI publishes succeed (if enabled).

## Dry Runs

- You can run the generation part using the `Generate SDKs` workflow (manual dispatch) and inspect artifacts without publishing.

## Rollback

- If a release is flawed:
  - Unpublish from npm/PyPI if necessary (observe registry policies).
  - Create a `vX.Y.Z+fix` or bump PATCH with fixes.
  - Update release notes accordingly.
