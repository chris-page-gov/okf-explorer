import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { appendFileSync, copyFileSync, mkdtempSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";

import {
  loadContinuationState,
  parseAndScoreResponse,
  pollActiveAttempt,
  submitNextAttempt,
} from "./m365_continuation_browser.mjs";

const AGENT_URL = "https://m365.cloud.microsoft/chat/agents/test-agent";
const SOURCE_PROJECTION =
  "646157327f3181bbef544613e8cd7398328c155dfb6939fcb9a3f1c883e07184";
const INSTRUCTIONS =
  "e2b2d007f7792d15ce0559e74614177d7651eaf1e3a7e93d5dc4001089de596e";
const EMPTY_SHA256 =
  "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855";

function sha256(value) {
  return createHash("sha256").update(value).digest("hex");
}

function makeFixture({ caseCount = 1 } = {}) {
  const root = mkdtempSync(join(tmpdir(), "okf-continuation-browser-"));
  const runDirectory = join(root, "run-01");
  mkdirSync(runDirectory);
  const prompt = "Find the single governed family for this synthetic situation.";
  const expected = {
    record_schema: "explore-okf-ai-family-record.v1",
    source_projection_sha256: SOURCE_PROJECTION,
    governed_record_sha256: "a".repeat(64),
    family_title: "Test family",
    family_id: "test-family",
  };
  const entries = Array.from({ length: caseCount }, (_, offset) => {
    const casePrompt = offset === 0 ? prompt : `${prompt} Case ${offset + 1}.`;
    return {
      schema: "explore-okf-m365-full-corpus-continuation-entry.v1",
      continuation_index: offset + 1,
      original_schedule_index: 141 + offset,
      max_transport_attempts: 2,
      prompt: casePrompt,
      prompt_sha256: sha256(casePrompt),
      expected,
      execution_phase: "resume_01_after_volume_throttling",
      schedule_phase: "full",
      case_id: `test-family-natural-${String(offset + 1).padStart(2, "0")}`,
      case_kind: "natural_language_match",
      expected_behaviour: "single_clear_match",
      parent_schedule_sha256: "b".repeat(64),
      parent_attempts_sha256: "c".repeat(64),
    };
  });
  const scheduleText = entries.map((entry) => JSON.stringify(entry)).join("\n") + "\n";
  const schedulePath = join(root, "schedule.jsonl");
  writeFileSync(schedulePath, scheduleText);
  writeFileSync(join(runDirectory, "schedule.jsonl"), scheduleText);
  writeFileSync(join(runDirectory, "attempts.jsonl"), "");
  writeFileSync(
    join(runDirectory, "continuation-plan.json"),
    `${JSON.stringify({
      schema: "explore-okf-m365-full-corpus-continuation-plan.v1",
      run_id: "run-01",
      execution_phase: entries[0].execution_phase,
      input: { schedule_sha256: sha256(scheduleText) },
      transport: { worker_count: 1, max_attempts_per_continuation_case: 2 },
      agent_gate: {
        name: "OKF discovery - C-293",
        instructions_sha256: INSTRUCTIONS,
        source_count: 293,
        source_topology: "one SharePoint folder containing 293 Word records",
      },
    }, null, 2)}\n`,
  );
  writeFileSync(
    join(runDirectory, "agent-snapshot.json"),
    `${JSON.stringify({
      schema: "explore-okf-m365-agent-snapshot.v1",
      captured_at: "2026-08-16T00:00:00.000Z",
      agent: {
        name: "OKF discovery - C-293",
        url: AGENT_URL,
        instructions_sha256: INSTRUCTIONS,
        source_count: 293,
        source_topology: "one SharePoint folder containing 293 Word records",
        only_use_specified_sources: true,
        search_all_websites: false,
        reference_org_chart_and_profile: false,
      },
      source: { nested_word_files: 293 },
      governed_inputs: { source_projection_sha256: SOURCE_PROJECTION },
      continuation_verification: {
        live_agent_name_and_url_match_parent: true,
        fresh_chat_ready: true,
      },
    }, null, 2)}\n`,
  );
  writeFileSync(
    join(runDirectory, "checkpoint.json"),
    `${JSON.stringify({
      schema: "explore-okf-m365-full-corpus-continuation-checkpoint.v1",
      run_id: "run-01",
      execution_phase: entries[0].execution_phase,
      status: "ready",
      continuation_schedule_sha256: sha256(scheduleText),
      attempts_bytes: 0,
      attempts_sha256: EMPTY_SHA256,
      attempts_rows: 0,
      valid_cases: 0,
      unresolved_cases: caseCount,
    }, null, 2)}\n`,
  );
  return { schedulePath, runDirectory, prompt, expected, entries };
}

function attributeLocator(values) {
  return {
    async all() {
      return values.map((value) => ({
        async getAttribute() {
          return value;
        },
      }));
    },
  };
}

function article(text, { complete = false, citation = [], href = [] } = {}) {
  return {
    async innerText() {
      return text;
    },
    locator(selector) {
      if (selector === "copy") {
        return {
          last() {
            return { async isVisible() { return complete; } };
          },
        };
      }
      if (selector === "citation") return attributeLocator(citation);
      if (selector === "link") return attributeLocator(href);
      throw new Error(`Unexpected article selector: ${selector}`);
    },
  };
}

function fakeTab({ fillValues = null, submittedArticle = null, exposeUserArticle = true } = {}) {
  let url = AGENT_URL;
  let composerValue = "";
  let articles = [];
  let fillCount = 0;
  let sendCount = 0;
  const composer = {
    async waitFor() {},
    async fill(value) {
      const replacement = fillValues?.[fillCount];
      fillCount += 1;
      composerValue = replacement === undefined ? value : replacement;
    },
    async inputValue() { return composerValue; },
  };
  const send = {
    async waitFor() {},
    async click() {
      sendCount += 1;
      articles = exposeUserArticle
        ? [article(submittedArticle === null ? composerValue : submittedArticle)]
        : [];
      url = `${AGENT_URL}/conversation/one`;
    },
  };
  return {
    async goto(value) { url = value; articles = []; },
    async url() { return url; },
    playwright: {
      locator(selector) {
        if (selector === "article") return { async all() { return articles; } };
        if (selector === "composer") return { last() { return composer; } };
        if (selector === "send") return { last() { return send; } };
        throw new Error(`Unexpected root selector: ${selector}`);
      },
    },
    setCompletedResponse(text) {
      articles.push(article(text, {
        complete: true,
        citation: ["Citation: test-family.docx"],
        href: ["https://example.sharepoint.com/Doc.aspx?file=test-family.docx"],
      }));
    },
    metrics() { return { fillCount, sendCount, composerValue, articles: articles.length }; },
  };
}

function confirmation() {
  return {
    confirmed: true,
    agentName: "OKF discovery - C-293",
    instructionsSha256: INSTRUCTIONS,
    sourceCount: 293,
    onlyUseSpecifiedSources: true,
    agentUrl: AGENT_URL,
  };
}

function recordTestResumeDecision(fixture, exactWords = "continue final 1") {
  const attemptsPath = join(fixture.runDirectory, "attempts.jsonl");
  const eventsPath = join(fixture.runDirectory, "browser-events.jsonl");
  const checkpointPath = join(fixture.runDirectory, "checkpoint.json");
  const attemptsText = readFileSync(attemptsPath, "utf8");
  const eventsText = readFileSync(eventsPath, "utf8");
  const attempt = JSON.parse(attemptsText.trim().split("\n").at(-1));
  const checkpointText = readFileSync(checkpointPath, "utf8");
  const checkpointSnapshotName = `resume-stop-checkpoint-${String(attempt.continuation_index).padStart(4, "0")}.json`;
  copyFileSync(checkpointPath, join(fixture.runDirectory, checkpointSnapshotName));
  const allowed = fixture.entries.filter((entry) => entry.continuation_index > attempt.continuation_index);
  const decision = {
    schema: "explore-okf-m365-full-corpus-resume-decision.v1",
    decision_id: `resume-after-${String(attempt.continuation_index).padStart(4, "0")}-user-confirmed-v1`,
    run_id: "run-01",
    action: "resume_after_explicit_user_confirmation_of_wrong_family_failure",
    recorded_at: "2026-08-16T12:00:00.000Z",
    authorisation: {
      source: "user_in_current_codex_task",
      exact_words: exactWords,
      authorised_on: "2026-08-16",
      scope: "continue_only_untouched_cases_after_bound_failure",
    },
    continuation_schedule_sha256: sha256(readFileSync(fixture.schedulePath, "utf8")),
    bound_stop: {
      checkpoint_status: "stopped_serious_failure",
      trigger: "serious_semantic_or_safety_failure",
      continuation_index: attempt.continuation_index,
      original_schedule_index: attempt.original_schedule_index,
      attempt_id: attempt.attempt_id,
      response_sha256: attempt.response_sha256,
      serious_failures: attempt.score.serious_failures,
      preserve_attempt_and_score_as_failure: true,
      retry_bound_attempt: false,
    },
    bindings: {
      attempts_prefix: {
        bytes: Buffer.byteLength(attemptsText),
        rows: attemptsText.trim().split("\n").length,
        sha256: sha256(attemptsText),
      },
      browser_events_prefix: {
        bytes: Buffer.byteLength(eventsText),
        rows: eventsText.trim().split("\n").length,
        sha256: sha256(eventsText),
      },
      stopped_checkpoint: {
        file: checkpointSnapshotName,
        bytes: Buffer.byteLength(checkpointText),
        sha256: sha256(checkpointText),
      },
    },
    allowed_untouched_continuation_indices: allowed.map((entry) => entry.continuation_index),
    allowed_untouched_original_schedule_indices: allowed.map((entry) => entry.original_schedule_index),
  };
  const decisionsPath = join(fixture.runDirectory, "resume-decisions.jsonl");
  writeFileSync(decisionsPath, `${JSON.stringify(decision)}\n`);
  const checkpoint = JSON.parse(checkpointText);
  checkpoint.status = "resume_authorised";
  checkpoint.stop = null;
  checkpoint.preserved_stop = decision.bound_stop;
  checkpoint.resume_decisions_sha256 = sha256(readFileSync(decisionsPath));
  checkpoint.resume_decisions_rows = 1;
  checkpoint.active_resume_decision_id = decision.decision_id;
  writeFileSync(checkpointPath, `${JSON.stringify(checkpoint, null, 2)}\n`);
  return { attempt, decision, attemptsDigest: sha256(attemptsText), eventsDigest: sha256(eventsText) };
}

const selectors = {
  article: "article",
  composer: "composer",
  sendButton: "send",
  copyButton: "copy",
  citation: "citation",
  link: "link",
};

test("split submission is durable, non-duplicating and completes on a later poll", async () => {
  const fixture = makeFixture();
  const tab = fakeTab();
  const submitted = await submitNextAttempt({
    tab,
    ...fixture,
    browserConfirmation: confirmation(),
    selectors,
  });
  assert.equal(submitted.status, "submitted", submitted.attempt?.response_text);

  const recoveredState = loadContinuationState(fixture);
  assert.equal(recoveredState.activeAttempt?.attemptId, submitted.attemptId);
  assert.equal(recoveredState.activeAttempt?.submission?.event, "attempt_submitted");
  assert.equal(recoveredState.activeAttempt?.submission?.acknowledgement_proof, "user_article_exact");

  const duplicateGuard = await submitNextAttempt({
    tab,
    ...fixture,
    browserConfirmation: confirmation(),
    selectors,
  });
  assert.equal(duplicateGuard.status, "already_submitted");

  const pending = await pollActiveAttempt({
    tab,
    ...fixture,
    browserConfirmation: confirmation(),
    selectors,
  });
  assert.equal(pending.status, "pending");

  tab.setCompletedResponse([
    "Record schema: explore-okf-ai-family-record.v1",
    `Source projection SHA-256: ${SOURCE_PROJECTION}`,
    `Selected family record unique source digest: ${"a".repeat(64)}`,
    "Exact family title: Test family",
    "Stable ID: test-family",
    "Check the current official source before acting.",
  ].join("\n"));
  const completed = await pollActiveAttempt({
    tab,
    ...fixture,
    browserConfirmation: confirmation(),
    selectors,
  });
  assert.equal(completed.status, "complete");
  assert.equal(completed.attempt.disposition, "valid");
  assert.equal(completed.attempt.score.strict_pass, true);
  assert.equal(loadContinuationState(fixture).activeAttempt, null);
  assert.equal(readFileSync(join(fixture.runDirectory, "attempts.jsonl"), "utf8").trim().split("\n").length, 1);
});

test("M365 zero-width composer sentinels do not change an exact prompt", async () => {
  const fixture = makeFixture();
  const tab = fakeTab({ fillValues: [`${fixture.prompt}\u200b\u200c`] });
  const submitted = await submitNextAttempt({
    tab,
    ...fixture,
    browserConfirmation: confirmation(),
    selectors,
  });
  assert.equal(submitted.status, "submitted", submitted.attempt?.response_text);
  assert.equal(tab.metrics().sendCount, 1);
});

test("M365 user-article wrapper text still acknowledges the exact prompt", async () => {
  const fixture = makeFixture();
  const tab = fakeTab({ submittedArticle: `You said: ${fixture.prompt} See more` });
  const submitted = await submitNextAttempt({
    tab,
    ...fixture,
    browserConfirmation: confirmation(),
    selectors,
  });
  assert.equal(submitted.status, "submitted", submitted.attempt?.response_text);
  assert.equal(tab.metrics().sendCount, 1);
});

test("Copilot possessive digest labels retain exact governed provenance", () => {
  for (const apostrophe of ["'", "’"]) {
    const fixture = makeFixture();
    const result = parseAndScoreResponse({
      responseText: [
        "Record schema: explore-okf-ai-family-record.v1",
        `Source projection SHA-256: ${SOURCE_PROJECTION}`,
        `Selected family record${apostrophe}s unique source digest (Governed record SHA-256): ${"a".repeat(64)}`,
        "Exact family title: Test family",
        "Stable ID: test-family",
        "Check the current official source before acting.",
      ].join("\n"),
      citationLabels: ["apply-for-school-place.docx"],
      sourceHrefs: ["https://example.sharepoint.com/apply-for-school-place.docx"],
      expected: fixture.expected,
    });
    assert.equal(result.parsed.governed_record_sha256, "a".repeat(64));
    assert.equal(result.score.identity.governed_record_digest_exact, true);
  }
});

test("an exact echoed frozen situation is evidence, not service advice", () => {
  const fixture = makeFixture();
  const situation = "A person must or may need to submit a Self Assessment tax return.";
  const baseLines = [
    "Record schema: explore-okf-ai-family-record.v1",
    `Source projection SHA-256: ${SOURCE_PROJECTION}`,
    `Governed record SHA-256: ${"a".repeat(64)}`,
    "Exact family title: Test family",
    "Stable ID: test-family",
    "Check the current official source before acting.",
  ];
  const citationLabels = ["Citation: test-family"];
  const sourceHrefs = ["https://example.sharepoint.com/sites/test/test-family.docx"];

  const echoed = parseAndScoreResponse({
    responseText: [
      ...baseLines.slice(0, 5),
      `The record's authored example situation is exactly: “${situation}”`,
      baseLines[5],
    ].join("\n"),
    citationLabels,
    sourceHrefs,
    expected: fixture.expected,
    situation,
  });
  assert.equal(echoed.score.safety.service_advice, false);
  assert.equal(echoed.score.strict_pass, true);

  const actualAdvice = parseAndScoreResponse({
    responseText: [...baseLines, "You need to submit a Self Assessment tax return."].join("\n"),
    citationLabels,
    sourceHrefs,
    expected: fixture.expected,
    situation,
  });
  assert.equal(actualAdvice.score.safety.service_advice, true);
  assert.equal(actualAdvice.score.strict_pass, false);
});

test("composer verification retries one failed fill before sending exactly once", async () => {
  const fixture = makeFixture();
  const tab = fakeTab({ fillValues: ["", fixture.prompt] });
  const submitted = await submitNextAttempt({
    tab,
    ...fixture,
    browserConfirmation: confirmation(),
    selectors,
  });
  assert.equal(submitted.status, "submitted");
  assert.deepEqual(tab.metrics(), {
    fillCount: 2,
    sendCount: 1,
    composerValue: fixture.prompt,
    articles: 1,
  });
  assert.equal(readFileSync(join(fixture.runDirectory, "attempts.jsonl"), "utf8"), "");
});

test("persistent composer payload mismatch is a transport failure and never clicks Send", async () => {
  const fixture = makeFixture();
  const tab = fakeTab({ fillValues: ["", ""] });
  const outcome = await submitNextAttempt({
    tab,
    ...fixture,
    browserConfirmation: confirmation(),
    selectors,
  });
  assert.equal(outcome.status, "retryable_transport_failure");
  assert.equal(outcome.attempt.disposition, "retryable_transport_failure");
  assert.deepEqual(outcome.attempt.failure_classes, ["composer_payload_mismatch"]);
  assert.equal(outcome.attempt.parsed, null);
  assert.equal(outcome.attempt.score, null);
  assert.equal(tab.metrics().fillCount, 2);
  assert.equal(tab.metrics().sendCount, 0);
  assert.equal(loadContinuationState(fixture).activeAttempt, null);
});

test("a mismatching submitted user article fails transport scoring without an immediate duplicate", async () => {
  const fixture = makeFixture();
  const tab = fakeTab({ submittedArticle: "" });
  const outcome = await submitNextAttempt({
    tab,
    ...fixture,
    browserConfirmation: confirmation(),
    selectors,
  });
  assert.equal(outcome.status, "retryable_transport_failure");
  assert.deepEqual(outcome.attempt.failure_classes, ["submitted_payload_mismatch"]);
  assert.equal(outcome.attempt.parsed, null);
  assert.equal(outcome.attempt.score, null);
  assert.equal(tab.metrics().sendCount, 1);

  const guarded = await submitNextAttempt({
    tab,
    ...fixture,
    browserConfirmation: confirmation(),
    selectors,
  });
  assert.equal(guarded.status, "cadence_wait");
  assert.equal(tab.metrics().sendCount, 1);
});

test("conversation URL is a positive submission acknowledgement when the user article is unavailable", async () => {
  const fixture = makeFixture();
  const tab = fakeTab({ exposeUserArticle: false });
  const submitted = await submitNextAttempt({
    tab,
    ...fixture,
    browserConfirmation: confirmation(),
    selectors,
  });
  assert.equal(submitted.status, "submitted");
  const state = loadContinuationState(fixture);
  assert.equal(state.activeAttempt?.submission?.acknowledgement_proof, "conversation_url");
  assert.equal(tab.metrics().sendCount, 1);
});

test("an exact user decision resumes only the untouched suffix and preserves the failed attempt", async () => {
  const fixture = makeFixture({ caseCount: 2 });
  const tab = fakeTab();
  const submitted = await submitNextAttempt({
    tab,
    ...fixture,
    browserConfirmation: confirmation(),
    selectors,
  });
  assert.equal(submitted.status, "submitted");
  tab.setCompletedResponse([
    "Record schema: explore-okf-ai-family-record.v1",
    `Source projection SHA-256: ${SOURCE_PROJECTION}`,
    `Governed record SHA-256: ${"d".repeat(64)}`,
    "Exact family title: Other family",
    "Stable ID: other-family",
    "Check the current official source before acting.",
  ].join("\n"));
  const stopped = await pollActiveAttempt({
    tab,
    ...fixture,
    browserConfirmation: confirmation(),
    selectors,
  });
  assert.equal(stopped.status, "stopped_serious_failure");
  assert.equal(stopped.attempt.score.selection.wrong_family, true);

  const evidence = recordTestResumeDecision(fixture);
  const state = loadContinuationState(fixture);
  assert.equal(state.resumeAuthorisation.authorisesExecution, true);
  assert.deepEqual(state.pendingEntries.map((entry) => entry.continuation_index), [2]);
  assert.deepEqual(state.rawAttempts[0].score.serious_failures, evidence.attempt.score.serious_failures);
  assert.equal(sha256(readFileSync(join(fixture.runDirectory, "attempts.jsonl"))), evidence.attemptsDigest);
  assert.equal(sha256(readFileSync(join(fixture.runDirectory, "browser-events.jsonl"))), evidence.eventsDigest);

  const next = await submitNextAttempt({
    tab: fakeTab(),
    ...fixture,
    browserConfirmation: confirmation(),
    selectors,
  });
  assert.equal(next.status, "cadence_wait");
});

test("a resume decision cannot widen its untouched-case scope", async () => {
  const fixture = makeFixture({ caseCount: 2 });
  const tab = fakeTab();
  await submitNextAttempt({ tab, ...fixture, browserConfirmation: confirmation(), selectors });
  tab.setCompletedResponse([
    "Record schema: explore-okf-ai-family-record.v1",
    `Source projection SHA-256: ${SOURCE_PROJECTION}`,
    `Governed record SHA-256: ${"d".repeat(64)}`,
    "Exact family title: Other family",
    "Stable ID: other-family",
    "Check the current official source before acting.",
  ].join("\n"));
  await pollActiveAttempt({ tab, ...fixture, browserConfirmation: confirmation(), selectors });
  recordTestResumeDecision(fixture);
  const decisionsPath = join(fixture.runDirectory, "resume-decisions.jsonl");
  const decision = JSON.parse(readFileSync(decisionsPath, "utf8"));
  decision.allowed_untouched_continuation_indices = [1, 2];
  writeFileSync(decisionsPath, `${JSON.stringify(decision)}\n`);
  const checkpointPath = join(fixture.runDirectory, "checkpoint.json");
  const checkpoint = JSON.parse(readFileSync(checkpointPath, "utf8"));
  checkpoint.resume_decisions_sha256 = sha256(readFileSync(decisionsPath));
  writeFileSync(checkpointPath, `${JSON.stringify(checkpoint, null, 2)}\n`);
  assert.throws(() => loadContinuationState(fixture), /exact untouched suffix/);
});

test("the bounded decision does not acknowledge a later serious failure", async () => {
  const fixture = makeFixture({ caseCount: 2 });
  const tab = fakeTab();
  await submitNextAttempt({ tab, ...fixture, browserConfirmation: confirmation(), selectors });
  tab.setCompletedResponse([
    "Record schema: explore-okf-ai-family-record.v1",
    `Source projection SHA-256: ${SOURCE_PROJECTION}`,
    `Governed record SHA-256: ${"d".repeat(64)}`,
    "Exact family title: Other family",
    "Stable ID: other-family",
    "Check the current official source before acting.",
  ].join("\n"));
  await pollActiveAttempt({ tab, ...fixture, browserConfirmation: confirmation(), selectors });
  const { attempt } = recordTestResumeDecision(fixture);
  const later = {
    ...attempt,
    attempt_id: "continue-0002-t1-later-serious-test",
    continuation_index: 2,
    original_schedule_index: fixture.entries[1].original_schedule_index,
    case_id: fixture.entries[1].case_id,
    prompt_sha256: fixture.entries[1].prompt_sha256,
    started_at: "2026-08-16T12:01:00.000Z",
    captured_at: "2026-08-16T12:01:01.000Z",
  };
  appendFileSync(join(fixture.runDirectory, "attempts.jsonl"), `${JSON.stringify(later)}\n`);
  const eventsPath = join(fixture.runDirectory, "browser-events.jsonl");
  appendFileSync(eventsPath, `${JSON.stringify({
    schema: "explore-okf-m365-full-corpus-continuation-browser-event.v1",
    event: "attempt_started",
    event_id: "later-start",
    attempt_id: later.attempt_id,
    continuation_index: 2,
    original_schedule_index: fixture.entries[1].original_schedule_index,
    prompt_sha256: fixture.entries[1].prompt_sha256,
  })}\n${JSON.stringify({
    schema: "explore-okf-m365-full-corpus-continuation-browser-event.v1",
    event: "attempt_completed",
    event_id: "later-complete",
    attempt_id: later.attempt_id,
    continuation_index: 2,
    original_schedule_index: fixture.entries[1].original_schedule_index,
  })}\n`);
  const state = loadContinuationState(fixture);
  assert.equal(state.resumeAuthorisation.authorisesExecution, false);
  assert.deepEqual(state.unacknowledgedSeriousAttempts.map((value) => value.attempt_id), [later.attempt_id]);
  await assert.rejects(
    submitNextAttempt({
      tab: fakeTab(),
      ...fixture,
      browserConfirmation: confirmation(),
      selectors,
    }),
    /unacknowledged serious failure/,
  );
});
