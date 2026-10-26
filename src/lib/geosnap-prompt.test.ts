import { test } from "node:test";
import assert from "node:assert/strict";
import { normalizeSnap, disputeSnap } from "./geosnap-prompt";

test("student selection does not promote low visual confidence", () => {
  const result = normalizeSnap({ feature: "Lake", confidence_level: "low" }, "Bay");
  assert.equal(result.feature, "Bay");
  assert.equal(result.confidence_level, "low");
  assert.equal(result.confidence, 30);
  assert.equal(result.certain, false);
  assert.equal(result.student_selected, true);
});

test("ambiguous output preserves observed evidence and supplies missing guidance", () => {
  const result = normalizeSnap({ confidence_level: "medium", observations: ["Two sloping sides"] });
  assert.deepEqual(result.evidence, ["Two sloping sides"]);
  assert.ok(result.retake_tip.length > 0);
  assert.ok(result.followup_question.question.length > 0);
  assert.equal(result.followup_question.options.length, 4);
  assert.equal(result.certain, false);
});

test("disputing an identification removes high confidence and restores guidance", () => {
  const result = disputeSnap({ feature: "Hill", confidence_level: "high", student_selected: true });
  assert.equal(result.confidence_level, "low");
  assert.equal(result.certain, false);
  assert.equal(result.student_selected, false);
  assert.ok(result.retake_tip);
  assert.ok(result.followup_question);
});