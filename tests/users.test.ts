/** Accounts, signup codes and per-learner data isolation (in-memory database). */
import { beforeAll, describe, expect, it } from "vitest";
import { openDb, qualify, setDbForTesting } from "@/lib/db";
import { countDue, getReviewSession, recordReview } from "@/lib/db/cards";
import { getPlan, savePlan } from "@/lib/db/plan";
import { totals } from "@/lib/db/stats";
import { readSession, makeSession } from "@/lib/auth-cookie";
import { runAsUser } from "@/lib/users/context";
import { hashPassword, verifyPassword } from "@/lib/users/password";
import { createCodes, createFirstAdmin, listCodes, normalizeCode, revokeCode, signUpWithCode } from "@/lib/users/store";
import { codeState, type AppUser } from "@/lib/users/types";

let admin: AppUser;

beforeAll(async () => {
  const db = await openDb(":memory:");
  setDbForTesting(db);
  admin = await createFirstAdmin({ username: "Owner", name: "Owner", passwordHash: await hashPassword("password1") });
}, 60_000);

describe("qualify", () => {
  it("prefixes learner tables after FROM/JOIN/INTO/UPDATE only", () => {
    const s = "turkce_u_abcdef12";
    expect(qualify("SELECT * FROM cards c JOIN reviews r ON r.card_id = c.id", s)).toBe(
      `SELECT * FROM "${s}".cards c JOIN "${s}".reviews r ON r.card_id = c.id`,
    );
    expect(qualify("INSERT INTO settings (key) VALUES (?) ON CONFLICT (key) DO UPDATE SET value = excluded.value", s)).toBe(
      `INSERT INTO "${s}".settings (key) VALUES (?) ON CONFLICT (key) DO UPDATE SET value = excluded.value`,
    );
    expect(qualify("UPDATE grammar_progress SET attempts = grammar_progress.attempts + 1", s)).toBe(
      `UPDATE "${s}".grammar_progress SET attempts = grammar_progress.attempts + 1`,
    );
    expect(qualify("SELECT ticks FROM plan_days WHERE day = ? FOR UPDATE", s)).toBe(`SELECT ticks FROM "${s}".plan_days WHERE day = ? FOR UPDATE`);
    // App tables and information_schema are left alone.
    expect(qualify("SELECT * FROM turkce_app.users", s)).toBe("SELECT * FROM turkce_app.users");
    expect(qualify("SELECT 1 FROM information_schema.tables", s)).toBe("SELECT 1 FROM information_schema.tables");
  });
});

describe("sessions and passwords", () => {
  it("signs and verifies session cookies", async () => {
    const v = await makeSession("secret", 7, 3);
    expect(await readSession("secret", v)).toMatchObject({ userId: 7, version: 3 });
    expect(await readSession("other", v)).toBeNull();
    expect(await readSession("secret", v.replace(/^7\./, "8."))).toBeNull();
  });
  it("hashes passwords", async () => {
    const h = await hashPassword("çok gizli şifre");
    expect(await verifyPassword("çok gizli şifre", h)).toBe(true);
    expect(await verifyPassword("wrong", h)).toBe(false);
  });
});

describe("signup codes", () => {
  it("first admin owns the original data", () => {
    expect(admin.role).toBe("admin");
    expect(admin.schemaName).toBe("turkce");
    expect(admin.username).toBe("owner");
  });

  it("a code creates exactly one account", async () => {
    const [code] = await createCodes({ count: 1, note: "Ayşe", role: "user", expiresDays: 30, createdBy: admin.id });
    expect(code.code).toMatch(/^[A-Z2-9]{4}-[A-Z2-9]{4}$/);
    const a = await signUpWithCode({ code: code.code.toLowerCase().replace("-", " "), username: "ayse", name: "Ayşe", password: "password1" });
    expect(a.ok).toBe(true);
    const b = await signUpWithCode({ code: code.code, username: "someone", name: "Someone", password: "password1" });
    expect(b.ok).toBe(false);
    const listed = (await listCodes()).find((c) => c.id === code.id)!;
    expect(codeState(listed)).toBe("used");
    expect(listed.usedByName).toBe("Ayşe");
  });

  it("a taken username doesn't burn the code; revoked codes don't work", async () => {
    const [code] = await createCodes({ count: 1, note: null, role: "user", expiresDays: null, createdBy: admin.id });
    const dup = await signUpWithCode({ code: code.code, username: "ayse", name: "Other", password: "password1" });
    expect(dup.ok).toBe(false);
    expect(codeState((await listCodes()).find((c) => c.id === code.id)!)).toBe("open");
    await revokeCode(code.id, admin.id);
    const r = await signUpWithCode({ code: code.code, username: "new-person", name: "New", password: "password1" });
    expect(r.ok).toBe(false);
  });

  it("normalises codes typed loosely", () => {
    expect(normalizeCode(" abcd efgh ")).toBe("ABCD-EFGH");
  });
});

describe("data isolation", () => {
  it("each learner has their own deck, reviews and plan", async () => {
    const [c1, c2] = await createCodes({ count: 2, note: null, role: "user", expiresDays: null, createdBy: admin.id });
    const r1 = await signUpWithCode({ code: c1.code, username: "learner1", name: "One", password: "password1" });
    const r2 = await signUpWithCode({ code: c2.code, username: "learner2", name: "Two", password: "password1" });
    if (!r1.ok || !r2.ok) throw new Error("signup failed");
    const one = r1.user;
    const two = r2.user;
    expect(one.schemaName).not.toBe(two.schemaName);

    await runAsUser(one, async () => {
      await savePlan({ startDay: 1, startedOn: "2026-11-17", daysPerWeek: 6 });
      const { fresh } = await getReviewSession();
      await recordReview({ cardId: fresh[0].card.id, direction: "en-tr", answer: "merhaba", result: "correct", msTaken: 1000, grade: "good" });
    });

    await runAsUser(two, async () => {
      expect(await getPlan()).toBeNull();
      expect((await totals()).introduced).toBe(0); // learner one's word isn't here
      expect((await countDue()).fresh).toBe(15); // the default without a plan
    });
    await runAsUser(one, async () => {
      expect(await getPlan()).not.toBeNull();
      expect((await totals()).introduced).toBe(1);
    });
    // The admin's original data is untouched by both.
    expect(await getPlan()).toBeNull();
  }, 60_000);
});
