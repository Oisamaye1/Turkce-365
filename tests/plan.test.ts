import { describe, expect, it } from "vitest";
import { GRAMMAR_STEPS } from "@/lib/grammar/steps";
import { PLAN_DAYS, STEP_ORDER, TOTAL_WORDS, planDay, position, stepsIntroducedBy, wordsThrough } from "@/lib/plan/build";
import { CONCEPTS, STAGES, WEEKS } from "@/lib/plan/curriculum";

describe("plan curriculum", () => {
  it("has 52 weeks in order, covering six stages without gaps", () => {
    expect(WEEKS).toHaveLength(52);
    WEEKS.forEach((w, i) => expect(w.week).toBe(i + 1));
    let next = 1;
    for (const s of STAGES) {
      expect(s.weeks[0]).toBe(next);
      next = s.weeks[1] + 1;
    }
    expect(next).toBe(53);
  });

  it("introduces every one of the 16 suffix steps exactly once", () => {
    expect([...STEP_ORDER].sort((a, b) => a - b)).toEqual(GRAMMAR_STEPS.map((s) => s.id));
    expect(STEP_ORDER[0]).toBe(1);
  });

  it("references only concepts that exist", () => {
    for (const w of WEEKS) {
      for (const c of w.concepts) {
        if (c === "step") expect(w.step, `week ${w.week}`).toBeDefined();
        else expect(CONCEPTS[c], `week ${w.week}: ${c}`).toBeDefined();
      }
    }
  });
});

describe("plan days", () => {
  it("builds all 365 days with tasks and a tiny challenge", () => {
    for (let d = 1; d <= PLAN_DAYS; d++) {
      const p = planDay(d);
      expect(p.day).toBe(d);
      expect(p.tasks.length).toBeGreaterThanOrEqual(3);
      expect(p.tasks.at(-1)?.key).toBe("challenge");
      expect(p.challenge.length).toBeGreaterThan(10);
      expect(p.title.length).toBeGreaterThan(2);
      expect(p.minutes).toBeGreaterThan(5);
      expect(p.minutes).toBeLessThan(45);
    }
  });

  it("follows the weekly rhythm", () => {
    expect(planDay(1).kind).toBe("learn");
    expect(planDay(2).kind).toBe("drill");
    expect(planDay(7).kind).toBe("checkin");
    expect(planDay(8).kind).toBe("learn");
    expect(planDay(365).kind).toBe("graduation");
    expect(position(364)).toEqual({ week: 52, index: 6 });
  });

  it("spreads the 1,500 words over the year, lighter at the start", () => {
    expect(wordsThrough(0)).toBe(0);
    expect(wordsThrough(PLAN_DAYS)).toBe(TOTAL_WORDS);
    let prev = 0;
    for (let d = 1; d <= PLAN_DAYS; d++) {
      const w = wordsThrough(d);
      expect(w).toBeGreaterThanOrEqual(prev);
      expect(w - prev).toBeLessThanOrEqual(8);
      prev = w;
    }
    expect(wordsThrough(7)).toBeLessThan(15);
  });

  it("opens suffix steps as the weeks introduce them", () => {
    expect(stepsIntroducedBy(1)).toEqual([1]);
    expect(stepsIntroducedBy(PLAN_DAYS)).toHaveLength(16);
    // The drill day always drills an opened step.
    for (let d = 1; d <= PLAN_DAYS; d++) expect(stepsIntroducedBy(d)).toContain(planDay(d).step);
  });
});
