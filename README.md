# ai-infrastructure-wiki

An Open Knowledge Format (OKF) bundle for AI infrastructure: agent-ready digital
infrastructure, federated AI, frameworks, standards, research benchmarks, and UK
public-sector implications.

The repository contains:

- `viewer.html` - a self-contained interactive graph and reader.
- `view.html` - a compatibility alias for the viewer.
- `index.md`, `document/`, `stack/`, `standards/`, `federated/`, `frameworks/`,
  `research/`, `uk-government/`, `organisations/`, and `glossary/` - the OKF
  Markdown corpus.
- `sources-index.md` and `log.md` - source and provenance indexes.

## Read Locally

Open `viewer.html` in a browser, or read the Markdown files directly from the
repository. Start with `index.md` for the Markdown entry point.

## Validate And Build

```sh
python3 scripts/update_viewer.py --check
python3 scripts/check_okf.py
python3 scripts/build_site.py
```

The build writes a GitHub Pages-ready static site to `_site/`. The site uses
`viewer.html` as `index.html`, `viewer.html`, and `view.html`, then copies the
public OKF Markdown corpus beside it.

## License

The OKF corpus and documentation are licensed under
[CC BY-NC 4.0](LICENSE.md): free non-commercial reuse with attribution.

The viewer and build/validation scripts are licensed under the
[MIT License](LICENSE-CODE.md).

## GitHub Pages

The included workflow publishes the static site from `_site/` when pushed to
`main`, after validation passes. In the GitHub repository settings, configure
Pages to use **GitHub Actions** as the source.
