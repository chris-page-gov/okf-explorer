import { describe, expect, it } from 'vitest';
import staticExplorerSource from '../../../../../explorer/app.js?raw';

describe('static explorer hardening harness', () => {
  it('keeps bundle URL validation and untrusted-link scheme gates in the shipped static app', () => {
    expect(staticExplorerSource).toContain('function validatedBundleUrl');
    expect(staticExplorerSource).toContain('function isHttpHref');
    expect(staticExplorerSource).toContain('!isHttpHref(url)');
    expect(staticExplorerSource).toContain('javascript:');
  });

  it('parses JSON through the streamed byte-cap reader instead of response.json()', () => {
    expect(staticExplorerSource).toContain('async function responseTextWithLimit');
    expect(staticExplorerSource).toContain('JSON.parse(await responseTextWithLimit(response, url))');
    expect(staticExplorerSource).not.toContain('return response.json();');
  });
});
