import json
import sys
from pathlib import Path


REPO_ROOT = Path(__file__).resolve().parents[3]
EVIDENCE_ROOT = REPO_ROOT / "tests" / "workflow" / "evidence" / "v0.3-trace-baseline"
RUN_RESULT_PATH = EVIDENCE_ROOT / "run-result.json"
FAILURE_SUMMARY_PATH = EVIDENCE_ROOT / "summaries" / "failure-summary.json"
ROOT_CAUSE_SUMMARY_PATH = EVIDENCE_ROOT / "summaries" / "root-cause-summary.json"
UNSUPPORTED_MODULE_SUMMARY_PATH = EVIDENCE_ROOT / "summaries" / "unsupported-module-summary.json"

EXPECTED_PATCH_COUNT = 88
EXPECTED_TRACEABLE_COUNT = 88
EXPECTED_FAILURE_COUNT = 0
EXPECTED_FAILURE_SUMMARY_COUNT = 0
EXPECTED_UNSUPPORTED_MODULE_COUNT = 0
EXPECTED_ROOT_CAUSES = {
    "audio-path-reachable",
    "no-audio-source",
    "no-audio-output",
}
EXPECTED_CLASSIFIED_ONLY_PATCHES = {
    "audit_batch.bin": {"no-audio-source", "no-audio-output"},
}


def load_json(path):
    if not path.exists():
        raise AssertionError(f"Missing required artifact: {path}")
    return json.loads(path.read_text(encoding="utf-8"))


def assert_equal(name, actual, expected):
    if actual != expected:
        raise AssertionError(f"{name}: expected {expected!r}, got {actual!r}")


def validate_top_level(run_result):
    assert_equal("run status", run_result.get("status"), "pass")
    assert_equal("expected patch count", run_result.get("expectedPatchCount"), EXPECTED_PATCH_COUNT)
    assert_equal("patch count", run_result.get("patchCount"), EXPECTED_PATCH_COUNT)
    assert_equal("pass count", run_result.get("passCount"), EXPECTED_PATCH_COUNT)
    assert_equal("fail count", run_result.get("failCount"), EXPECTED_FAILURE_COUNT)
    assert_equal("traceable count", run_result.get("traceableCount"), EXPECTED_TRACEABLE_COUNT)


def validate_summaries():
    failure_summary = load_json(FAILURE_SUMMARY_PATH)
    root_cause_summary = load_json(ROOT_CAUSE_SUMMARY_PATH)
    unsupported_summary = load_json(UNSUPPORTED_MODULE_SUMMARY_PATH)

    assert_equal("failure summary count", len(failure_summary), EXPECTED_FAILURE_SUMMARY_COUNT)
    assert_equal("unsupported module count", len(unsupported_summary), EXPECTED_UNSUPPORTED_MODULE_COUNT)

    unexpected_causes = set(root_cause_summary.keys()) - EXPECTED_ROOT_CAUSES
    if unexpected_causes:
        raise AssertionError(f"Unexpected root causes: {sorted(unexpected_causes)}")


def validate_patch_artifacts(run_result):
    patch_root = EVIDENCE_ROOT / "test-patches"
    if not patch_root.exists():
        raise AssertionError(f"Missing patch evidence directory: {patch_root}")
    patch_results = sorted(path for path in patch_root.iterdir() if path.is_dir())
    assert_equal("patch result count", len(patch_results), EXPECTED_PATCH_COUNT)

    for patch_dir in patch_results:
        result_path = patch_dir / "result.json"
        result = load_json(result_path)

        assert_equal(f"{result_path} status", result.get("status"), "pass")
        assert_equal(f"{result_path} invalid connections", result["summary"].get("invalidConnectionCount"), 0)
        assert_equal(f"{result_path} unknown modules", result["summary"].get("unknownModuleCount"), 0)

        root_causes = set(result["summary"].get("signalRootCauses", []))
        unexpected_causes = root_causes - EXPECTED_ROOT_CAUSES
        if unexpected_causes:
            raise AssertionError(f"{result_path}: unexpected root causes {sorted(unexpected_causes)}")

        relative_path = result.get("relativePath")
        if root_causes != {"audio-path-reachable"}:
            expected = EXPECTED_CLASSIFIED_ONLY_PATCHES.get(relative_path)
            if expected != root_causes:
                raise AssertionError(
                    f"{result_path}: unexpected non-audio classification for {relative_path}: {sorted(root_causes)}"
                )

        artifacts = result.get("artifacts", {})
        for artifact_name, artifact_path in artifacts.items():
            if not Path(artifact_path).exists():
                raise AssertionError(f"{result_path}: missing {artifact_name}: {artifact_path}")


def main():
    run_result = load_json(RUN_RESULT_PATH)
    validate_top_level(run_result)
    validate_summaries()
    validate_patch_artifacts(run_result)
    print(json.dumps({
        "status": "pass",
        "validatedRunResult": str(RUN_RESULT_PATH),
        "validatedPatchCount": EXPECTED_PATCH_COUNT,
        "allowedClassifiedOnlyPatches": sorted(EXPECTED_CLASSIFIED_ONLY_PATCHES),
    }, indent=2))


if __name__ == "__main__":
    try:
        main()
    except Exception as exc:
        print(json.dumps({"status": "fail", "error": str(exc)}, indent=2), file=sys.stderr)
        sys.exit(1)
