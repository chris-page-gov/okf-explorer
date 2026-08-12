import {
  expect,
  test as base,
  type ConsoleMessage,
  type Page
} from '@playwright/test';

const MAX_RECORDED_ISSUES = 50;

type BrowserIssueKind = 'console.error' | 'pageerror';

interface BrowserIssue {
  kind: BrowserIssueKind;
  message: string;
  pageUrl: string;
  source?: string;
}

export interface BrowserDiagnostics {
  /** Monitor a page created outside Playwright's ordinary test context. */
  watch(page: Page): void;
}

interface PageListeners {
  console: (message: ConsoleMessage) => void;
  pageerror: (error: Error) => void;
}

function consoleSource(message: ConsoleMessage): string | undefined {
  const location = message.location();
  if (!location.url) return undefined;
  return `${location.url}:${location.lineNumber}:${location.columnNumber}`;
}

function issueSummary(issue: BrowserIssue, index: number): string {
  const source = issue.source ? ` (${issue.source})` : '';
  const page = issue.pageUrl ? ` on ${issue.pageUrl}` : '';
  return `${index + 1}. ${issue.kind}${page}${source}: ${issue.message}`;
}

export const test = base.extend<{ browserDiagnostics: BrowserDiagnostics }>({
  browserDiagnostics: [
    async ({ context }, use, testInfo) => {
      const issues: BrowserIssue[] = [];
      let omittedIssues = 0;
      const listeners = new Map<Page, PageListeners>();

      const record = (issue: BrowserIssue) => {
        if (issues.length < MAX_RECORDED_ISSUES) {
          issues.push(issue);
        } else {
          omittedIssues += 1;
        }
      };

      const watch = (page: Page) => {
        if (listeners.has(page)) return;
        const handlers: PageListeners = {
          console: (message) => {
            if (message.type() !== 'error') return;
            record({
              kind: 'console.error',
              message: message.text(),
              pageUrl: page.url(),
              source: consoleSource(message)
            });
          },
          pageerror: (error) => {
            record({
              kind: 'pageerror',
              message: error.message || String(error),
              pageUrl: page.url()
            });
          }
        };
        listeners.set(page, handlers);
        page.on('console', handlers.console);
        page.on('pageerror', handlers.pageerror);
      };

      for (const page of context.pages()) watch(page);
      context.on('page', watch);

      await use({ watch });

      context.off('page', watch);
      for (const [page, handlers] of listeners) {
        page.off('console', handlers.console);
        page.off('pageerror', handlers.pageerror);
      }

      if (issues.length > 0 || omittedIssues > 0) {
        const details = issues.map(issueSummary).join('\n');
        const omitted = omittedIssues > 0
          ? `\n${omittedIssues} further browser issue(s) were omitted.`
          : '';
        throw new Error(
          `Browser diagnostics were not clean for “${testInfo.title}”:\n` +
          details +
          omitted
        );
      }
    },
    { auto: true }
  ]
});

export { expect };
