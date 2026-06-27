# Publication Plan

Status: ready for GitHub remote, GitHub Pages, and first public release.

## Public Surfaces

- Repository: canonical OKF Markdown source, provenance, issues, pull requests,
  and review history.
- GitHub Pages: public interactive viewer generated from `viewer.html` and the
  OKF Markdown corpus.
- GitHub Releases: versioned snapshots of the OKF corpus and viewer.
- Optional DOI: connect the public repository to Zenodo after the first release
  if a persistent scholarly citation is required.

## Remaining Release Steps

- Push to a GitHub remote.
- Enable Pages with **GitHub Actions** as the source.
- Create a `v1.0.0` GitHub release after the first successful Pages deployment.

## Publication Checks

Run these before publishing or cutting a release:

```sh
python3 scripts/update_viewer.py --check
python3 scripts/check_okf.py
python3 scripts/build_site.py
```

The Pages build includes the public OKF Markdown corpus and viewer, and
excludes Word lock files, `.DS_Store`, Git internals, temporary files, and
generated caches.
