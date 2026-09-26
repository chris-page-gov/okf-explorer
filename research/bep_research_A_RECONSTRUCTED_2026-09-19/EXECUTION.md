# Execution and reproducibility

## What was actually run

Fresh local Python/Node checks are recorded in `verification.json`, with commands, versions,
input hashes and stdout/stderr. The original missing execution was not recovered.

The package has no model API, database, network retrieval or Ask OKF implementation.
The Docker and CI procedures below are recipes, not executed results.

## Verify before modifying

From the extracted package:

```sh
python -B scripts/verify_package.py .
python -B scripts/run_checks.py --output-dir ../bep-rerun-results
```

The first command checks the distributed manifest and checksums. The second writes new
results outside the release directory so that the release's hashes remain meaningful.
It needs Python with the versions in `requirements.txt`, and Node (v22.16.0 was used here).
`environment.json` records the actual reconstruction environment. Different environments
require new receipts; they are not assumed byte-identical merely because tests pass.

## Controlled online acquisition

On a permitted networked machine, provision the named Python/Node runtimes and acquire
all requirements into a wheelhouse using `pip download -r requirements.txt -d wheelhouse`.
Record hashes of the wheelhouse and the base image's immutable digest. Package distributions
must match the recorded interpreter/platform. The wheelhouse and a container image are
not included here. No current image digest has been invented.

For the actual Ask OKF baseline (separate from these reconstruction tests), clone into a
new disposable directory, fetch and detach at commit
`905e680f6d3ad385de9b8effc351566eba0ab2b3`, verify HEAD and follow that checkout's locked
setup and evaluator instructions. This recipe does not substitute for those tests.

## Offline Docker recipe — not run

`Dockerfile.example` requires `BASE_IMAGE` to be a real, reviewed digest-pinned image with
compatible Python and Node installed. Put the acquired wheelhouse next to it. Build online
only when acquisition is explicitly authorised; install from the local wheelhouse.

After building and recording the image digest, a candidate isolated run is:

```sh
mkdir -p ../bep-docker-results
export BEP_IMAGE='your-reviewed-image@sha256:YOUR_RECORDED_DIGEST'
docker run --rm --network=none --read-only --cap-drop=ALL   --security-opt=no-new-privileges --pids-limit=256 --memory=4g --cpus=2   --tmpfs /tmp:rw,noexec,nosuid,size=256m   -v "$PWD/../bep-docker-results:/out:rw"   "$BEP_IMAGE" python -B /work/scripts/run_checks.py --output-dir /out
```

Resolve the image variable before execution. Docker is not installed in this session, so
no claim is made that this Docker recipe or image has been exercised.

## CI and filters

The supplied manually triggered workflow is an example for a public repository. It fetches
the exact workflow SHA and runs package integrity then tests. It has not been run in GitHub
Actions. Runtime provisioning and a dependency acquisition policy remain deployment work.

Prefer a failing verification gate to a rewriting Git filter. `git-filter-example.md`
shows a pass-through filter that refuses unresolvable tokens rather than silently deleting
or rewriting evidence. Test and approve filters locally; do not install them globally.
