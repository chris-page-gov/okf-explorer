# Decision: retain declared evidence paths under budget pressure

Status: isolated implementation candidate. No deployment, model rerun or revised historical receipt is implied.

## Problem

A bounded context can retain a short project-authored concept while omitting the source passages that qualify it. The first allocator visits lexical seeds before concept traversal, follows ordinary breadth-first order, then removes the most recently selected records until the byte limit is met. Required paths are assessed afterwards. This exposes the gap, but gives an unrelated earlier page priority over a later necessary qualification.

A separate diagnostic defect compounded this: trimming a source's supporting page also removed its incident `dcterms:requires` edge. Checking only surviving edges could then hide the dependency of the still-selected source.

## Decision

Run the normal allocator first. Return its exact package unless a node, relationship or byte limit lost a valid, applicable, bundle-declared required path. A depth limit, unresolved meaning, invalid path or metadata-only refusal does not authorise another search.

Where that specific loss occurs, allow **one additional allocation pass**:

1. Start from the same real resolved concepts, lexical evidence seeds and explicitly labelled ambiguous alternatives.
2. Validate each eligible required chain against the existing graph: actual resolved start concept, applicable requirement, exact assertion IDs and direction, public records, supported predicates, scope, authority, rights, provenance and evidence digests. Its length must respect the requested depth limit. Reject cyclic or disconnected chains for priority.
3. Give those valid path prefixes priority over ordinary fan-out. Defer other outgoing edges until the priority queue is exhausted, so one source's optional links cannot exhaust all relationship slots first.
4. Under byte pressure, remove whole non-priority records and dependent branches before required-path members. Never shorten source text, invent an edge or inject a required endpoint as a seed.
5. If required paths still cannot fit, retain explicit missing-path/record diagnostics and insufficient status. Preserve ambiguous alternatives as alternatives; they do not activate requirements.

Priority is an author's declared context need, **not an authority score or a claim that evidence answers the question**. Inclusion reasons name the requirement. A limitation identifies the second pass. The existing requirement object contains each path, its required IDs and missing IDs; no new tool or context schema is introduced.

The declared input limits bound path inspection to at most 500 requirements, 100 paths per requirement and eight hops per path. Referenced evidence digests are computed once during eligibility inspection. The two allocation passes retain existing node, relationship, depth, per-record path, input-size and output-size ceilings. There is no network or model call in the engine.

## Dependency integrity is a separate correction

On every refresh, recompute `missing_dependency` from the **declared graph for retained source records** before assessing requirements. Remove previous dependency diagnostics first. Deleting a supporting edge cannot erase the dependency, and deleting the source cannot leave a stale dependency diagnostic behind.

This correction applies even when no `required_paths` are declared and no extra allocation runs. It is an explicit exception to historical byte equality: a package whose old diagnostics hid an omitted dependency receives a new content identity. Correct failure reporting takes precedence over preserving that defect. No-pressure packages without such hidden dependencies stay byte for byte identical to the archived baseline.

## Boundaries and trade-offs

- A producer must declare the qualification and a real directed path. The engine cannot infer a missing exception from prose or promote an external reference to substantive legal support.
- Initially only declared paths starting at actual resolved concepts qualify for priority. A chain starting at an unresolved or merely reachable intermediate concept needs its real resolved-root prefix in the producer declaration.
- Generic broad requirements may reserve more evidence than a narrowly phrased question needs. Producers must review their scope; the allocator does not silently weaken requirements.
- The second pass adds CPU work and its reasons consume bytes. Infeasible required unions can remain incomplete, and the existing bounded metadata refusal remains available.
- Optional lexical context may be omitted to retain declared qualifications. Candidate-overlap counts can fall even while required-path retention improves; neither is an answer-accuracy score.
- Priority never changes extraction status, rights, review status, scope, source date or authority. No human or specialist acceptance is inferred.
- Historical contexts and model attempts remain immutable. New comparisons bind their own engine and input identities; they do not regrade earlier answers.

## Verification

The synthetic study-club controls use no DWP names or paragraph numbers. They cover exact baseline preservation, a three-hop route competing for nodes and edges, whole-record byte allocation, invalid/reversed/disconnected paths, restricted access, digest and governance failures, depth, ambiguity, insufficient budgets, and dependency diagnostics after trimming.

The [separate offline comparison](../validation/context-allocation/2026-09-21/README.md) runs all 40 supplied staff-question occurrences against immutable DWP commit `3ef0e786e9a18e76fa17c7d925ff509d6d6c9f84` at 256 KiB and 512 KiB. Only the engine changes. It reports path retention, candidate overlap, package identities and diagnostic changes. It makes no model, public-host, legal accuracy or affordability claim.
