#!/usr/bin/env python3
"""Inventory guide links and record bounded observations of public sources."""

from __future__ import annotations

import argparse
from concurrent.futures import ThreadPoolExecutor
from datetime import datetime, timezone
from hashlib import sha256
from html import unescape
from html.parser import HTMLParser
import json
from pathlib import Path
import re
from urllib.error import HTTPError, URLError
from urllib.parse import urlsplit
from urllib.request import HTTPRedirectHandler, Request, build_opener


GUIDE = Path('docs/beginners')
URL_IN_CODE = re.compile(r"https?://[^\s<>\"'`]+")
PAGE_NAME = re.compile(r"[a-z0-9][a-z0-9-]*\.html\Z")
PREFIX_BYTES = 65_536
MAX_SOURCES = 180
PROJECT_HOSTS = {'chris-page-gov.github.io'}
REFERENCE_HOSTS = {
    'astral.sh', 'code.statisticsauthority.gov.uk', 'content-api.publishing.service.gov.uk',
    'docs.astral.sh', 'docs.github.com', 'docs.os.uk', 'guidance.publishing.service.gov.uk',
    'historicengland.org.uk', 'json-schema.org', 'openreferraluk.org',
    'operations.osmfoundation.org', 'semiceu.github.io', 'slsa.dev', 'spec.commonmark.org',
    'www.arcgis.com', 'www.dublincore.org', 'www.gov.uk', 'www.nationalarchives.gov.uk',
    'www.nhs.uk', 'www.ons.gov.uk', 'www.rfc-editor.org', 'www.w3.org', 'yaml.org',
}
REDIRECT_HOSTS = REFERENCE_HOSTS | PROJECT_HOSTS | {
    'github.com', 'help.github.com', 'raw.githubusercontent.com',
    'www.openreferraluk.org', 'assets.publishing.service.gov.uk',
    'releases.astral.sh', 'osr.statisticsauthority.gov.uk',
}


def classification(url: str) -> tuple[str, bool]:
    parts = urlsplit(url)
    host = parts.hostname
    if parts.username is not None or parts.password is not None or parts.port is not None:
        raise ValueError(f'Unsafe guide URL {url}')
    if host in {'example.com', 'example.org', 'example.net'} or (
        host and host.endswith('.example')
    ):
        return 'illustrative-example', False
    if host in {'purl.org', 'schema.org', 'statistics.data.gov.uk'}:
        return 'semantic-identifier', False
    if parts.scheme == 'https':
        if host in PROJECT_HOSTS or (
            host == 'github.com' and parts.path.startswith('/chris-page-gov/')
        ):
            return 'project-resource', True
        if host in REFERENCE_HOSTS or (
            host == 'github.com'
            and parts.path.startswith('/GoogleCloudPlatform/knowledge-catalog/')
        ):
            return 'authoritative-reference', True
    raise ValueError(f'Unclassified guide URL {url}')


class GuideLinks(HTMLParser):
    def __init__(self) -> None:
        super().__init__()
        self.hrefs: set[str] = set()
        self.code_depth = 0

    def handle_starttag(self, tag: str, attrs: list[tuple[str, str | None]]) -> None:
        if tag == 'a':
            value = dict(attrs).get('href')
            if value and urlsplit(value).scheme in {'http', 'https'}:
                self.hrefs.add(value)
        if tag == 'code':
            self.code_depth += 1

    def handle_endtag(self, tag: str) -> None:
        if tag == 'code':
            self.code_depth -= 1

    def handle_data(self, data: str) -> None:
        if self.code_depth:
            self.hrefs.update(match.rstrip('.,;)]') for match in URL_IN_CODE.findall(data))


def inventory(guide: Path) -> tuple[str, list[dict]]:
    manifest = (guide / 'cross-references.json').read_bytes()
    reference = json.loads(manifest)
    pages = reference.get('pages')
    if (
        reference.get('schema') != 'okf-beginner-guide-cross-references.v1'
        or not isinstance(pages, dict) or not pages or len(pages) > 64
        or not all(PAGE_NAME.fullmatch(name) for name in pages)
    ):
        raise ValueError('Expected a bounded beginner guide cross-reference report')
    occurrences: dict[str, set[str]] = {}
    chapter_names = {path.name for path in guide.glob('*.html')}
    if set(pages) != chapter_names:
        raise ValueError('Guide pages differ from the cross-reference report')
    for name in sorted(chapter_names):
        parser = GuideLinks()
        parser.feed((guide / name).read_text(encoding='utf-8'))
        for url in parser.hrefs:
            occurrences.setdefault(url, set()).add(name)
    if len(occurrences) > MAX_SOURCES:
        raise ValueError(f'Guide source bound exceeded ({MAX_SOURCES})')
    records = []
    for url, sources in sorted(occurrences.items()):
        kind, dereference = classification(url)
        records.append({
            'requested_url': url,
            'classification': kind,
            'dereference': dereference,
            'guide_pages': sorted(sources),
        })
    return sha256(manifest).hexdigest(), records


class ReviewableRedirects(HTTPRedirectHandler):
    max_redirections = 5

    def __init__(self) -> None:
        self.hops: list[dict] = []

    def redirect_request(self, request, fp, code, msg, headers, url):
        self.hops.append({'url': request.full_url, 'http_status': code, 'destination': url})
        parts = urlsplit(url)
        if (
            parts.scheme != 'https' or parts.hostname not in REDIRECT_HOSTS
            or parts.username is not None or parts.password is not None or parts.port is not None
        ):
            raise HTTPError(url, code, 'Redirect destination requires review', headers, fp)
        return super().redirect_request(request, fp, code, msg, headers, url)


def observe(source: dict) -> dict:
    if not source['dereference']:
        return {**source, 'status': 'no-fetch-expected'}
    url = source['requested_url']
    seen = datetime.now(timezone.utc).isoformat(timespec='seconds')
    request = Request(url, headers={
        'User-Agent': 'OKF Explorer beginner guide source audit',
        'Accept-Encoding': 'identity',
    })
    redirects = ReviewableRedirects()
    observation = {
        **source, 'observed_at': seen, 'tool': 'python-urllib-get',
        'method': 'GET', 'redirects': redirects.hops,
    }
    try:
        with build_opener(redirects).open(request, timeout=6) as response:
            data = response.read(PREFIX_BYTES)
            content_type = response.headers.get_content_type()
            title = None
            if content_type == 'text/html':
                encoding = response.headers.get_content_charset() or 'utf-8'
                try:
                    markup = data.decode(encoding, errors='replace')
                except LookupError:
                    markup = data.decode('utf-8', errors='replace')
                match = re.search(r'<title\b[^>]*>(.*?)</title>', markup, re.I | re.S)
                if match:
                    title = ' '.join(unescape(match[1]).split())[:200]
            return {
                **observation, 'status': 'observed', 'http_status': response.status,
                'final_url': response.geturl(), 'media_type': content_type, 'title': title,
                'prefix_bytes': len(data), 'prefix_sha256': sha256(data).hexdigest(),
            }
    except HTTPError as error:
        return {
            **observation, 'status': 'http-error', 'http_status': error.code,
            'final_url': error.geturl(), 'detail': str(error.reason),
        }
    except (URLError, TimeoutError, OSError) as error:
        return {**observation, 'status': 'network-error', 'detail': str(error)}


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--site', type=Path, required=True)
    parser.add_argument('--output', type=Path, required=True)
    parser.add_argument('--observe', action='store_true', help='Request the listed public source URLs')
    args = parser.parse_args()
    digest, sources = inventory(args.site / GUIDE)
    if args.observe:
        with ThreadPoolExecutor(max_workers=8) as workers:
            sources = list(workers.map(observe, sources))
    report = {
        'schema': 'okf-beginner-guide-source-audit.v1',
        'cross_references_sha256': digest,
        'observations': args.observe,
        'sources': sources,
    }
    with args.output.open('x', encoding='utf-8') as output:
        json.dump(report, output, ensure_ascii=False, sort_keys=True, indent=2)
        output.write('\n')
    print(f'Wrote {len(sources)} source records to {args.output}')
    return 0


if __name__ == '__main__':
    raise SystemExit(main())
