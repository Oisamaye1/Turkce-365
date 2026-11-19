/**
 * Integration tests against a fresh in-memory SQLite database.
 * Claude is disabled (TURKCE_DISABLE_CLAUDE=1) so the offline fallback path is exercised.
 */
import { beforeEach, describe, expect, it } from "vitest";
import { openDb, setDbForTesting } from "@/lib/db";
import { addCardsToDeck, countDue, getReviewSession, recordReview } from "@/lib/db/cards";
import { currentGrammarStep, getStepStatuses, recordDrill } from "@/lib/db/grammar";
import { getLesson } from "@/lib/db/lessons";
import { getMission } from "@/lib/db/missions";
import { completeDay, currentPlanDay, getPlan, savePlan, setTick } from "@/lib/db/plan";
import { getPlanDayView } from "@/lib/plan/status";
import { wordsThrough } from "@/lib/plan/build";
import { setSetting } from "@/lib/db/settings";
import { applyCorrection, saveWriting } from "@/lib/db/writing";
import { ensureTodayLesson } from "@/lib/lesson/generate";
import { DailyLessonSchema, WeeklyQuizSchema } from "@/lib/lesson/schema";
import { generateWeeklyReport } from "@/lib/lesson/weekly";
import { localDate } from "@/lib/time";

process.env.TURKCE_DISABLE_CLAUDE = "1";

/** 2026-11-11 is a Wednesday; times are UTC (Istanbul = UTC+3). */
const at = (iso: string) => new Date(iso);

beforeEach(async () => {
  const db = await openDb(":memory:");
  setDbForTesting(db);
  await setSetting("start_date", "2026-11-09");
}, 30_000);

describe("database seed", () => {
  it("tops up an older deck with words added later, keeping its history", async () => {
    const { getDb } = await import("@/lib/db");
    const { addMissingSeedWords } = await import("@/lib/db/seed");
    const db = await getDb();
    await db.run("DELETE FROM cards WHERE source = 'seed' AND seq > 1500");
    expect(await addMissingSeedWords(db)).toBe(200);
    const n = await db.one<{ n: number }>("SELECT COUNT(*)::int AS n FROM cards WHERE source = 'seed'");
    expect(Number(n?.n)).toBe(1700);
    expect(await addMissingSeedWords(db)).toBe(0);
  });
  it("loads the word deck and offers 15 new cards per day", async () => {
    const s = await getReviewSession(at("2026-11-11T06:00:00Z"));
    expect(s.due.length).toBe(0);
    expect(s.fresh.length).toBe(15);
    expect(s.fresh[0].card.tr).toBe("merhaba");
  });
});

describe("daily lesson scheduling (05:30 Europe/Istanbul)", () => {
  it("does nothing before 05:30 Istanbul time", async () => {
    // 02:00 UTC = 05:00 Istanbul
    const r = await ensureTodayLesson({ trigger: "scheduler", now: at("2026-11-11T02:00:00Z") });
    expect(r.status).toBe("skipped");
  });
  it("creates the lesson at/after 05:30 and is idempotent (catch-up safe)", async () => {
    const now = at("2026-11-11T02:31:00Z"); // 05:31 Istanbul
    const r = await ensureTodayLesson({ trigger: "scheduler", now, useClaude: false });
    expect(r).toMatchObject({ status: "created", kind: "daily", source: "fallback", date: "2026-11-11" });
    const again = await ensureTodayLesson({ trigger: "catch-up", now: at("2026-11-11T09:00:00Z") });
    expect(again.status).toBe("exists");
    const lesson = (await getLesson("2026-11-11"))!;
    expect(() => DailyLessonSchema.parse(lesson.lesson)).not.toThrow();
  });
  it("uses the Istanbul date, not UTC (22:00 UTC is already tomorrow in Cyprus)", async () => {
    const r = await ensureTodayLesson({ trigger: "catch-up", now: at("2026-11-11T22:00:00Z"), useClaude: false });
    expect(r.date).toBe("2026-11-12");
  });
  it("falls back to local content when Claude is unavailable", async () => {
    const r = await ensureTodayLesson({ trigger: "scheduler", now: at("2026-11-11T03:00:00Z") });
    expect(r.source).toBe("fallback");
    const l = (await getLesson("2026-11-11"))!.lesson;
    expect(l.kind).toBe("daily");
    if (l.kind === "daily") {
      expect(l.dialogue.lines.length).toBeGreaterThanOrEqual(6);
      expect(l.newPhrases.length).toBe(5);
      expect(l.grammar.explanation.split(/\s+/).length).toBeLessThanOrEqual(120);
    }
  });
  it("Sunday creates the weekly check-in instead of a lesson", async () => {
    const r = await ensureTodayLesson({ trigger: "scheduler", now: at("2026-11-15T03:00:00Z"), useClaude: false });
    expect(r.kind).toBe("weekly");
    const q = (await getLesson("2026-11-15"))!.lesson;
    expect(() => WeeklyQuizSchema.parse(q)).not.toThrow();
  });
  it("Monday creates the week's mission", async () => {
    await ensureTodayLesson({ trigger: "scheduler", now: at("2026-11-16T03:00:00Z"), useClaude: false });
    const m = await getMission("2026-11-16");
    expect(m?.learnerWeek).toBe(2);
    expect(m?.mission.title).toMatch(/shopkeeper/i);
  });
});

describe("SRS in the database", () => {
  it("records answers, schedules, and unlocks Turkish → English once learned", async () => {
    const { fresh } = await getReviewSession(at("2026-11-11T06:00:00Z"));
    const id = fresh[0].card.id;
    let t = Date.parse("2026-11-11T06:00:00Z");
    for (let i = 0; i < 3; i++) {
      await recordReview({ cardId: id, direction: "en-tr", answer: "merhaba", result: "correct", msTaken: 2000, grade: "good" }, new Date(t));
      t += 40 * 86_400_000;
    }
    const later = await getReviewSession(new Date(t));
    expect(later.due.some((d) => d.card.id === id && d.direction === "tr-en")).toBe(true);
  });
  it("flags a leech after 6 lapses", async () => {
    const { fresh } = await getReviewSession(at("2026-11-11T06:00:00Z"));
    const id = fresh[1].card.id;
    const now = at("2026-11-11T06:00:00Z");
    for (let i = 0; i < 6; i++) {
      await recordReview({ cardId: id, direction: "en-tr", answer: "x", result: "correct", msTaken: 2000, grade: "good" }, now);
      await recordReview({ cardId: id, direction: "en-tr", answer: "x", result: "wrong", msTaken: 2000, grade: "again" }, now);
    }
    const row = (await getReviewSession(at("2026-11-12T06:00:00Z"))).due.find((d) => d.card.id === id);
    expect(row?.card.leech).toBe(true);
  });
  it("new words introduced today count against the daily limit", async () => {
    const now = new Date();
    const before = (await countDue(now)).fresh;
    const { fresh } = await getReviewSession(now);
    await recordReview({ cardId: fresh[0].card.id, direction: "en-tr", answer: "merhaba", result: "correct", msTaken: 1000, grade: "good" }, now);
    expect((await countDue(now)).fresh).toBe(before - 1);
  });
});

describe("writing corrections", () => {
  it("every corrected error becomes a review card due the same day + a mistake row", async () => {
    const today = localDate(new Date());
    const id = await saveWriting(today, "Yesterday", "Ben okula gidiyorum dün. Cok güzel.");
    const cards = await applyCorrection(id, today, {
      corrected: "Dün okula gittim. Çok güzel.",
      errors: [
        { original: "Ben okula gidiyorum dün", correction: "Dün okula gittim", rule: "past-tense", explanationEN: "Use the past tense for yesterday." },
        { original: "Cok", correction: "Çok", rule: "spelling", explanationEN: "ç, not c." },
      ],
      score: 6,
      comment: "Good effort!",
    });
    expect(cards.length).toBe(2);
    const due = (await getReviewSession(new Date())).due.filter((d) => d.card.source === "correction");
    expect(due.map((d) => d.card.tr).sort()).toEqual(["Dün okula gittim", "Çok"]);
    expect(due.find((d) => d.card.tr === "Dün okula gittim")?.card.en).toBe("Fix: Ben okula gidiyorum dün");
  });
  it("lesson phrases are added to the deck without duplicating seed words", async () => {
    const ids1 = await addCardsToDeck([{ tr: "merhaba", en: "hello" }], "lesson");
    const ids2 = await addCardsToDeck([{ tr: "merhaba", en: "hello" }], "lesson");
    expect(ids1[0]).toBe(ids2[0]);
  });
});

describe("grammar progression", () => {
  it("unlocks the next step in teaching order at 90 % over 20 drills", async () => {
    expect(await currentGrammarStep()).toBe(1);
    let unlocked: number | null = null;
    for (let i = 0; i < 20; i++) {
      const r = await recordDrill({ stepId: 1, result: i === 0 ? "wrong" : "correct", answer: "evler", expected: "evler", prompt: "houses", rules: [] });
      if (r.unlocked) unlocked = r.unlocked;
    }
    // Teaching order: plural (1) → "to be" endings (8).
    expect(unlocked).toBe(8);
    expect(await currentGrammarStep()).toBe(8);
    expect((await getStepStatuses())[0].mastered).toBe(true);
  });
  it("does not unlock below 90 %", async () => {
    for (let i = 0; i < 20; i++) await recordDrill({ stepId: 1, result: i < 3 ? "wrong" : "correct", answer: "", expected: "", prompt: "", rules: [] });
    expect(await currentGrammarStep()).toBe(1);
  });
});

describe("weekly report", () => {
  it("is saved with the expected fields", async () => {
    const report = await generateWeeklyReport(
      "2026-11-15",
      { vocab: { correct: 12, total: 15 }, drills: { correct: 8, total: 10 }, translation: { given: "x", reference: "y", result: "almost" } },
      { useClaude: false },
    );
    expect(report.week).toBe("2026-11-09");
    expect(report.focusAreas.length).toBeGreaterThanOrEqual(2);
    expect(report.narrativeSource).toBe("local");
    expect(report.activity.length).toBe(7);
  });
});

describe("learning plan", () => {
  it("creates a plan, ticks tasks and finishes days in order", async () => {
    expect(await getPlan()).toBeNull();
    await savePlan({ startDay: 1, startedOn: "2026-11-16", daysPerWeek: 6 });
    expect(await currentPlanDay()).toBe(1);

    // New words follow the plan, not the old 15-a-day setting.
    const { fresh } = await getReviewSession();
    expect(fresh.length).toBe(wordsThrough(1));
    expect(fresh[0].card.tr).toBe("merhaba");

    const view = await getPlanDayView();
    expect(view?.day.day).toBe(1);
    expect(view?.canFinish).toBe(false);
    for (const t of view!.day.tasks) if (!t.optional) await setTick(1, t.key, "done");
    expect((await getPlanDayView(1))?.canFinish).toBe(true);
    await completeDay(1, "2026-11-16");
    expect(await currentPlanDay()).toBe(2);
    // A future day can be previewed but not finished.
    expect((await getPlanDayView(5))?.canFinish).toBe(false);
  });

  it("starting later skips ahead and opens the suffix steps taught before", async () => {
    await savePlan({ startDay: 85, startedOn: "2026-11-16", daysPerWeek: 5 }); // stage 3
    expect(await currentPlanDay()).toBe(85);
    const open = (await getStepStatuses()).filter((s) => s.unlocked).map((s) => s.stepId);
    for (const s of [1, 8, 9, 2, 4, 3, 10, 11, 5]) expect(open).toContain(s);
    expect(open).not.toContain(12);
  });
});
