#!/usr/bin/env python3
"""Run pinned OKF inspection helpers in a bounded, isolated read-only snapshot."""

from __future__ import annotations

import argparse
import hashlib
import json
import os
import platform
import resource
import shutil
import stat
import subprocess
import sys
import tempfile
import tomllib
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
PACKAGE = ROOT / "tools/okf-skills/v1"
PYTHON_VERSION = "3.12.11"
UV_VERSION = "0.13.4"
MAX_FILES = 20_000
MAX_DOCUMENT_BYTES = 2 * 1024 * 1024
MAX_TOTAL_BYTES = 64 * 1024 * 1024
MAX_OUTPUT_BYTES = 4 * 1024 * 1024
TIMEOUT = 30
HELPERS = {
    "scan": "skills/okf-plus-consume/upstream/scripts/scan.py",
    "validate": "skills/okf-plus-generate/upstream/scripts/validate.py",
}


class GuardError(ValueError):
    """The requested operation cannot satisfy the inspection policy."""


def digest(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest()


def verify_package(package: Path = PACKAGE) -> dict:
    if package.is_symlink() or not package.is_dir():
        raise GuardError("the reviewed skill package is missing or is a symlink")
    manifest_path = package / "manifest.json"
    if manifest_path.is_symlink():
        raise GuardError("the package manifest must be a regular file")
    manifest = json.loads(manifest_path.read_text(encoding="utf-8"))
    if manifest.get("schema") != "okf-guarded-skills.v1":
        raise GuardError("unknown skill package schema")
    for name in ("okf_skill.py", "install_okf_skills.py"):
        if digest(ROOT / "scripts" / name) != manifest.get("launchers", {}).get(name):
            raise GuardError(f"reviewed launcher digest differs: {name}")
    expected = manifest.get("files")
    if not isinstance(expected, dict) or not expected:
        raise GuardError("the skill package needs a complete file inventory")
    actual = set()
    for path in package.rglob("*"):
        if path.is_symlink() or not (path.is_file() or path.is_dir()):
            raise GuardError(f"unsafe package entry: {path.relative_to(package)}")
        if path.is_file() and path != manifest_path:
            actual.add(path.relative_to(package).as_posix())
    if actual != set(expected):
        raise GuardError("skill package file inventory differs from the reviewed manifest")
    for relative, expected_digest in expected.items():
        path = package / relative
        if path.resolve().is_relative_to(package.resolve()) is False:
            raise GuardError("package path escapes its root")
        if digest(path) != expected_digest:
            raise GuardError(f"skill package digest mismatch: {relative}")
    # Import the governed parser only after the runtime has been checked by main.
    from ruamel.yaml import YAML

    yaml = YAML(typ="safe", pure=True)
    for name in ("okf-plus-consume", "okf-plus-generate"):
        skill = package / "skills" / name
        if sorted(skill.rglob("SKILL.md")) != [skill / "SKILL.md"]:
            raise GuardError("the package exposes an additional skill entrypoint")
        settings = yaml.load((skill / "agents/openai.yaml").read_text())
        if settings.get("policy", {}).get("allow_implicit_invocation") is not False:
            raise GuardError("explicit skill invocation is required")
        upstream = json.loads((skill / "UPSTREAM.json").read_text())
        if upstream.get("commit") != manifest.get("upstream_commit"):
            raise GuardError("upstream commit differs from the reviewed package")
        for item in upstream["files"]:
            source = skill / item["local_path"]
            if not source.resolve().is_relative_to(skill.resolve()):
                raise GuardError("upstream path escapes its skill")
            if digest(source) != item["sha256"]:
                raise GuardError("pinned upstream bytes changed")
    return manifest


def clean_environment() -> dict[str, str]:
    return {"PATH": os.defpath, "LANG": "C", "LC_ALL": "C"}


def verify_runtime(root: Path = ROOT) -> None:
    project = tomllib.loads((root / "pyproject.toml").read_text())
    if (
        platform.python_implementation() != "CPython"
        or platform.python_version() != PYTHON_VERSION
        or Path(sys.prefix).resolve() != (root / ".venv").resolve()
        or sys.prefix == sys.base_prefix
        or (root / ".python-version").read_text().strip() != PYTHON_VERSION
        or project["project"]["requires-python"] != ">=3.12.11,<3.13"
        or project["tool"]["uv"]["required-version"] != f"=={UV_VERSION}"
    ):
        raise GuardError("use this checkout's governed CPython 3.12.11 environment")
    uv = shutil.which("uv")
    if not uv:
        raise GuardError("the governed uv executable is unavailable")
    observed = subprocess.run([uv, "--version"], capture_output=True, text=True,
                              check=True, timeout=10)
    if observed.stdout.split()[:2] != ["uv", UV_VERSION]:
        raise GuardError("the governed uv version is required")
    lock = subprocess.run([uv, "sync", "--project", str(root), "--locked", "--check"],
                          capture_output=True, text=True, timeout=TIMEOUT)
    if lock.returncode:
        raise GuardError("the locked environment is stale or cannot be checked")


def read_document(name: str, directory_fd: int, budget: list[int]) -> bytes:
    fd = os.open(name, os.O_RDONLY | os.O_NOFOLLOW | os.O_NONBLOCK,
                 dir_fd=directory_fd)
    try:
        before = os.fstat(fd)
        if not stat.S_ISREG(before.st_mode) or before.st_size > MAX_DOCUMENT_BYTES:
            raise GuardError("a Markdown input is not regular or exceeds its byte limit")
        with os.fdopen(fd, "rb", closefd=False) as source:
            data = source.read(MAX_DOCUMENT_BYTES + 1)
        after = os.fstat(fd)
        budget[0] += len(data)
        if len(data) > MAX_DOCUMENT_BYTES or budget[0] > MAX_TOTAL_BYTES:
            raise GuardError("the Markdown byte budget was exceeded")
        if (before.st_size, before.st_mtime_ns) != (after.st_size, after.st_mtime_ns):
            raise GuardError("a Markdown input changed while being copied")
        data.decode("utf-8")
        return data
    finally:
        os.close(fd)


def declares_nested_root(data: bytes) -> bool:
    lines = data.decode("utf-8").lstrip("\ufeff").splitlines()
    if not lines or lines[0] != "---":
        return False
    try:
        end = lines.index("---", 1)
    except ValueError:
        raise GuardError("an index has unclosed front matter") from None
    from ruamel.yaml import YAML

    from ruamel.yaml.error import YAMLError
    try:
        metadata = YAML(typ="safe", pure=True).load("\n".join(lines[1:end]))
    except YAMLError as error:
        raise GuardError(f"cannot inspect nested index metadata: {error}") from error
    return isinstance(metadata, dict) and "okf_version" in metadata


def make_snapshot(bundle: Path, target: Path) -> dict:
    if bundle.is_symlink() or not bundle.is_dir():
        raise GuardError("select a regular bundle directory, not a symlink")
    bundle = bundle.resolve()
    budget = [0]
    count = 0
    hashes = {}
    excluded = []
    def refuse_unreadable(error: OSError) -> None:
        raise GuardError(f"cannot inspect bundle directory: {error.filename}") from error
    root_fd = os.open(bundle, os.O_RDONLY | os.O_DIRECTORY | os.O_NOFOLLOW)
    try:
        # Descriptor-relative reads prevent a path substitution from following
        # a bundle symlink to a file elsewhere on the host.
        for directory, dirs, files, directory_fd in os.fwalk(
            ".", dir_fd=root_fd, follow_symlinks=False, onerror=refuse_unreadable
        ):
            relative = Path(directory)
            if any(part.startswith(".") for part in relative.parts if part != "."):
                dirs.clear()
                continue
            dirs[:] = sorted(name for name in dirs if not name.startswith("."))
            visible_files = sorted(name for name in files if not name.startswith("."))
            count += len(dirs) + len(visible_files)
            if count > MAX_FILES:
                raise GuardError("the bundle entry budget was exceeded")
            for name in dirs + visible_files:
                mode = os.stat(name, dir_fd=directory_fd, follow_symlinks=False).st_mode
                if stat.S_ISLNK(mode) or not (stat.S_ISDIR(mode) or stat.S_ISREG(mode)):
                    raise GuardError(f"symlink or special input refused: {relative / name}")
            index = None
            if "index.md" in visible_files:
                index = read_document("index.md", directory_fd, budget)
            if relative != Path(".") and (
                "okf.semantic.json" in visible_files
                or (index is not None and declares_nested_root(index))
            ):
                excluded.append(relative.as_posix())
                dirs.clear()
                continue
            destination = target / relative
            destination.mkdir(parents=True, exist_ok=True)
            for name in visible_files:
                output = destination / name
                if name.endswith(".md"):
                    data = index if name == "index.md" else read_document(name, directory_fd, budget)
                    output.write_bytes(data)
                    hashes[(relative / name).as_posix()] = hashlib.sha256(data).hexdigest()
                else:
                    # The core validator checks asset existence, not contents.
                    # Do not expose scripts, credentials or binary asset bytes.
                    output.touch()
    finally:
        os.close(root_fd)
    return {"markdown_sha256": hashes, "markdown_bytes": budget[0],
            "excluded_nested_roots": excluded, "asset_contents": "not-read"}


def sandbox_command(command: list[str], snapshot: Path, output: Path,
                    error: Path, package: Path = PACKAGE) -> tuple[str, list[str]]:
    read_roots = [Path(sys.prefix).resolve(), Path(sys.base_prefix).resolve(),
                  package.resolve(), snapshot.resolve()]
    if sys.platform == "darwin":
        sandbox = Path("/usr/bin/sandbox-exec")
        if not sandbox.is_file():
            raise GuardError("sandbox-exec is unavailable; inspection is refused")
        quote = lambda path: json.dumps(str(path), ensure_ascii=False)
        reads = read_roots + [Path("/System/Library"), Path("/usr/lib"),
                              Path("/private/var/db/dyld")]
        profile = "\n".join([
            "(version 1)", "(deny default)", "(allow sysctl-read)",
            "(allow mach-lookup)", "(allow process-info*)",
            f"(allow process-exec (literal {quote(Path(sys.executable).resolve())}))",
            "(allow file-read-metadata)",
            "(allow file-read-data (literal \"/\"))",
            "(allow file-read* " + " ".join(f"(subpath {quote(p)})" for p in reads) + ")",
            "(allow file-map-executable " + " ".join(f"(subpath {quote(p)})" for p in reads) + ")",
            "(allow file-read* (literal \"/dev/null\") (literal \"/dev/urandom\"))",
            f"(allow file-write* (literal {quote(output.resolve())}) "
            f"(literal {quote(error.resolve())}) (literal \"/dev/null\"))",
        ])
        return "macos-sandbox-exec", [str(sandbox), "-p", profile, *command]
    if sys.platform == "linux":
        sandbox = shutil.which("bwrap")
        if not sandbox:
            raise GuardError("bubblewrap is unavailable; inspection is refused")
        args = [sandbox, "--unshare-all", "--die-with-parent", "--new-session",
                "--cap-drop", "ALL", "--proc", "/proc", "--dev", "/dev"]
        libraries = [Path(p) for p in ("/usr/lib", "/usr/lib64", "/lib", "/lib64",
                                      "/etc/ld.so.cache") if Path(p).exists()]
        for path in dict.fromkeys(libraries + read_roots):
            args += ["--ro-bind", str(path), str(path)]
        return "linux-bubblewrap", [*args, "--chdir", str(snapshot), "--", *command]
    raise GuardError("no supported inspection sandbox is available on this platform")


def child_limits() -> None:
    resource.setrlimit(resource.RLIMIT_FSIZE, (MAX_OUTPUT_BYTES, MAX_OUTPUT_BYTES))
    resource.setrlimit(resource.RLIMIT_CPU, (TIMEOUT, TIMEOUT))
    resource.setrlimit(resource.RLIMIT_NOFILE, (128, 128))
    os.umask(0o077)


def run_isolated(command: list[str], snapshot: Path, work: Path,
                 package: Path = PACKAGE) -> tuple[str, subprocess.CompletedProcess]:
    output, error = work / "stdout", work / "stderr"
    output.touch(mode=0o600)
    error.touch(mode=0o600)
    kind, wrapped = sandbox_command(command, snapshot, output, error, package)
    with output.open("wb") as out, error.open("wb") as err:
        result = subprocess.run(wrapped, cwd=snapshot, env=clean_environment(),
                                stdout=out, stderr=err, timeout=TIMEOUT,
                                preexec_fn=child_limits, check=False)
    if output.stat().st_size > MAX_OUTPUT_BYTES or error.stat().st_size > MAX_OUTPUT_BYTES:
        raise GuardError("inspection output exceeded its byte limit")
    return kind, subprocess.CompletedProcess(command, result.returncode,
        output.read_text(encoding="utf-8"), error.read_text(encoding="utf-8"))


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("operation", choices=("check", "scan", "validate"))
    parser.add_argument("--bundle", type=Path)
    parser.add_argument("--now", help="explicit RFC 3339 instant for repeatable checks")
    args = parser.parse_args(argv)
    try:
        verify_runtime()
        manifest = verify_package()
        if args.operation == "check":
            if args.bundle or args.now:
                raise GuardError("package checking does not accept bundle inputs")
            print(json.dumps({"package": manifest["version"], "integrity": "passed",
                              "runtime": PYTHON_VERSION, "uv": UV_VERSION}))
            return 0
        if args.bundle is None:
            raise GuardError("a selected --bundle directory is required")
        with tempfile.TemporaryDirectory(prefix="okf-inspect-") as temporary:
            work = Path(temporary).resolve()
            snapshot = work / "bundle"
            snapshot.mkdir()
            inventory = make_snapshot(args.bundle, snapshot)
            helper = PACKAGE / HELPERS[args.operation]
            command = [sys.executable, "-I", "-B", str(helper), str(snapshot), "--json"]
            if args.now:
                command += ["--now", args.now]
            kind, result = run_isolated(command, snapshot, work)
            if result.returncode not in (0, 1):
                raise GuardError(f"isolated helper failed: {result.stderr[:1000]}")
            try:
                report = json.loads(result.stdout)
            except ValueError:
                raise GuardError(f"isolated helper returned no JSON: {result.stderr[:1000]}") from None
            print(json.dumps({"operation": args.operation, "sandbox": kind,
                "package": manifest["version"], "bundle": str(args.bundle.resolve()),
                "inspection": inventory, "report": report}, indent=2))
            return result.returncode
    except (GuardError, OSError, ValueError, subprocess.SubprocessError) as error:
        print(f"OKF inspection refused: {error}", file=sys.stderr)
        return 2


if __name__ == "__main__":
    raise SystemExit(main())
