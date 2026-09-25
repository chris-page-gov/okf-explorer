# Maintaining Explorer dependencies

A dependency is a library or tool that Explorer uses. `package.json` declares
which versions are permitted; `pnpm-lock.yaml` records the exact versions and
package integrity values selected for a build. Both files matter when reviewing
an automated Dependabot pull request.

## Preserve the security controls

Use the repository's pnpm 10 toolchain. Run `pnpm install --frozen-lockfile` for
validation: it fails when the manifest and lockfile disagree. During an
authorised update, regenerate the lockfile with pnpm, review every changed
package, then return to frozen installation. Never hand-edit integrity values
or remove a security override to bypass a failing install.

The `cookie: ^0.7.2` override preserves the reviewed fix for
[GHSA-pxg6-pf52-xh8x](https://github.com/advisories/GHSA-pxg6-pf52-xh8x).
Some older bot updates removed this override from the lockfile and selected
`cookie` 0.6.0. `@types/cookie` is a separate type-definition package and must
not be confused with the affected runtime package.

Vitest and its coverage package must resolve to the same version. The repaired
baseline uses 4.1.11, including the transitive `@vitest/mocker` fix for
[GHSA-82fw-gwwq-j7x9](https://github.com/advisories/GHSA-82fw-gwwq-j7x9).
That advisory concerns development-server file access; a dependency alert is
not evidence that the static Pages site has been exploited. Keep development
servers local and review any change that exposes them to a network.

The combined audit also found older transitive copies of `devalue` and `nanoid`.
Conditional overrides select devalue 5.9.2 for
[GHSA-9rgm-9g3h-6x36](https://github.com/sveltejs/devalue/security/advisories/GHSA-9rgm-9g3h-6x36)
and nanoid 3.3.18 for
[GHSA-2v37-7h3g-55p8](https://github.com/advisories/GHSA-2v37-7h3g-55p8).
These address denial-of-service conditions involving malformed input or a
zero-sized custom ID request; the audit does not demonstrate an exploitable
Explorer path. The guard checks resolved versions, allowing the temporary
overrides to be removed when reviewed upstream dependencies select safe copies.

`pnpm deps:check` enforces these recorded dependency invariants against the
manifest, package inventory and resolved snapshots. Its regression tests retain
examples of lost overrides, vulnerable duplicate packages and mismatched
coverage. It is a targeted guard, not a replacement for vulnerability alerts or
reviewing upstream changes. Pre-release replacements need an explicit policy
review rather than silently passing the stable-version checks.

## Review and validate a candidate

1. Start from current `main` on a feature branch. Inspect the complete diff,
   upstream release notes, security advisories and changes in indirectly used
   packages. Do not infer safety from the bot's authorship or a patch-version
   label.
2. Update only the reviewed versions. Keep coupled packages together: Vitest
   with coverage, and Playwright with its core/browser versions. Recheck the
   combined lockfile after integrating overlapping updates.
3. Run the checks below. The software bill of materials (SBOM) is the generated
   inventory of exact package versions and integrity values. Regenerate it
   only after reviewing the lockfile; preserve historical release receipts.
4. Update this documentation and `CHANGELOG.md` when behaviour or the supported
   toolchain changes. Required checks do not exempt dependency updates.
5. Review the exact candidate, pass protected-branch CI, then verify the exact
   merged Pages deployment. Earlier release receipts do not attest to a new
   manifest, lockfile or application build.

```sh
cd apps/okf-explorer
pnpm install --frozen-lockfile
pnpm deps:check
pnpm audit --audit-level=moderate
pnpm sbom
pnpm sbom:check
pnpm check
pnpm test
pnpm test:coverage
```

Run the affected browser journeys too. Changes to Playwright or the application
compiler require the supported Chrome, Firefox and WebKit checks. A failed
inventory check is different from a functional test failure; a skipped browser
check is still missing validation.

## Build and deployment actions

GitHub Actions updates can affect code running during builds or deployment.
Keep actions pinned to complete commit hashes and verify those hashes against
the upstream release. Preserve the existing workflow triggers, pnpm 10 setting
and separate Pages deployment permissions. The reviewed maintenance update
uses `pnpm/action-setup` 6.1.0 and `actions/deploy-pages` 5.0.1; it does not grant
additional permissions.
