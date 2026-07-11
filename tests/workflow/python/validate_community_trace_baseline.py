import json
import sys
from pathlib import Path


REPO_ROOT = Path(__file__).resolve().parents[3]
EVIDENCE_ROOT = REPO_ROOT / "tests" / "workflow" / "evidence" / "v0.3-trace-baseline"
RUN_RESULT_PATH = EVIDENCE_ROOT / "community-run-result.json"
FAILURE_SUMMARY_PATH = EVIDENCE_ROOT / "community-summaries" / "failure-summary.json"
CLASSIFICATION_SUMMARY_PATH = EVIDENCE_ROOT / "community-summaries" / "classification-summary.json"
ROOT_CAUSE_SUMMARY_PATH = EVIDENCE_ROOT / "community-summaries" / "root-cause-summary.json"
UNSUPPORTED_MODULE_SUMMARY_PATH = EVIDENCE_ROOT / "community-summaries" / "unsupported-module-summary.json"

EXPECTED_PATCH_COUNT = 1884
EXPECTED_TRACEABLE_COUNT = 1881
EXPECTED_CLASSIFIED_COUNT = 3
EXPECTED_FAIL_COUNT = 0
EXPECTED_CLASSIFICATION = "non-zoia-appledouble-resource-fork"
EXPECTED_CLASSIFIED_PATHS = {
    "112362/112362.bin",
    "133506/133506_v1.bin",
    "133506/133506_v2.bin",
}


def load_json(path):
    if not path.exists():
        raise AssertionError(f"Missing required artifact: {path}")
    return json.loads(path.read_text(encoding="utf-8"))


def assert_equal(name, actual, expected):
    if actual != expected:
        raise AssertionError(f"{name}: expected {expected!r}, got {actual!r}")


def main():
    run_result = load_json(RUN_RESULT_PATH)
    failure_summary = load_json(FAILURE_SUMMARY_PATH)
    classification_summary = load_json(CLASSIFICATION_SUMMARY_PATH)
    root_cause_summary = load_json(ROOT_CAUSE_SUMMARY_PATH)
    unsupported_summary = load_json(UNSUPPORTED_MODULE_SUMMARY_PATH)

    assert_equal("run status", run_result.get("status"), "pass")
    assert_equal("expected patch count", run_result.get("expectedPatchCount"), EXPECTED_PATCH_COUNT)
    assert_equal("patch count", run_result.get("patchCount"), EXPECTED_PATCH_COUNT)
    assert_equal("traceable count", run_result.get("traceableCount"), EXPECTED_TRACEABLE_COUNT)
    assert_equal("classified count", run_result.get("classifiedCount"), EXPECTED_CLASSIFIED_COUNT)
    assert_equal("fail count", run_result.get("failCount"), EXPECTED_FAIL_COUNT)

    classified_paths = {item["relativePath"] for item in classification_summary}
    assert_equal("classified paths", classified_paths, EXPECTED_CLASSIFIED_PATHS)
    for item in classification_summary:
        assert_equal("classification", item["classification"]["classification"], EXPECTED_CLASSIFICATION)

    hard_failures = [item for item in failure_summary if item["status"] == "fail"]
    assert_equal("hard failure count", len(hard_failures), EXPECTED_FAIL_COUNT)

    if not root_cause_summary:
        raise AssertionError("Community root-cause summary is empty")
    if not isinstance(unsupported_summary, dict):
        raise AssertionError("Community unsupported-module summary is not an object")

    print(json.dumps({
        "status": "pass",
        "validatedRunResult": str(RUN_RESULT_PATH),
        "validatedPatchCount": EXPECTED_PATCH_COUNT,
        "traceablePatchCount": EXPECTED_TRACEABLE_COUNT,
        "classifiedNonPatchCount": EXPECTED_CLASSIFIED_COUNT,
        "hardFailureCount": EXPECTED_FAIL_COUNT,
        "signalFlowIssueCount": len(failure_summary),
        "unsupportedModuleTypeCount": len(unsupported_summary),
    }, indent=2))


if __name__ == "__main__":
    try:
        main()
    except Exception as exc:
        print(json.dumps({"status": "fail", "error": str(exc)}, indent=2), file=sys.stderr)
        sys.exit(1)
