import express from "express";
import cors from "cors";
import { pool } from "./db";
import { normalizePhone, validateLoanInput } from "./validation";
import { requireAuth, AuthRequest, signToken } from "./auth";

export const app = express();
app.use(cors());
app.use(express.json({ limit: "1mb" }));

type OtpRecord = { otp: string; expiresAt: number };
const otpStore = new Map<string, OtpRecord>();

app.get("/health", (_req, res) => res.json({ status: "ok" }));

app.post("/auth/request-otp", (req, res) => {
  const phone = normalizePhone(req.body?.phone);
  if (!phone) return res.status(400).json({ error: "Provide a valid phone in international format, e.g. +919876543210" });

  const otp = String(Math.floor(100000 + Math.random() * 900000));
  const ttlMinutes = Math.max(1, Number(process.env.OTP_TTL_MINUTES) || 5);
  otpStore.set(phone, { otp, expiresAt: Date.now() + ttlMinutes * 60_000 });
  console.log(`[MiniLedger mock OTP] ${phone}: ${otp} (expires in ${ttlMinutes} minutes)`);
  return res.json({ message: "OTP generated. Check the backend server log." });
});

app.post("/auth/verify-otp", async (req, res) => {
  const phone = normalizePhone(req.body?.phone);
  const otp = req.body?.otp;
  if (!phone || typeof otp !== "string" || !/^\d{6}$/.test(otp)) {
    return res.status(400).json({ error: "Valid phone and 6-digit OTP are required" });
  }

  const record = otpStore.get(phone);
  if (!record || record.expiresAt < Date.now() || record.otp !== otp) {
    return res.status(401).json({ error: "Invalid or expired OTP" });
  }
  otpStore.delete(phone);

  try {
    const result = await pool.query(
      `INSERT INTO users(phone) VALUES($1)
       ON CONFLICT(phone) DO UPDATE SET phone = EXCLUDED.phone
       RETURNING id, phone`,
      [phone]
    );
    const user = result.rows[0];
    return res.json({ token: signToken(Number(user.id)), user: { id: Number(user.id), phone: user.phone } });
  } catch (error) {
    console.error("OTP verification database error:", error);
    return res.status(500).json({ error: "Could not complete login" });
  }
});

app.use(requireAuth);

app.get("/loans", async (req: AuthRequest, res) => {
  try {
    const result = await pool.query(
      `SELECT id, friend_name AS "friendName", amount::float8 AS amount,
              TO_CHAR(due_date, 'YYYY-MM-DD') AS "dueDate",
              repaid_at AS "repaidAt", created_at AS "createdAt",
              (repaid_at IS NULL AND due_date < CURRENT_DATE) AS overdue
       FROM loans WHERE user_id = $1 ORDER BY created_at DESC`,
      [req.userId]
    );
    return res.json({ entries: result.rows });
  } catch (error) {
    console.error("List loans error:", error);
    return res.status(500).json({ error: "Could not load entries" });
  }
});

app.post("/loans", async (req: AuthRequest, res) => {
  const parsed = validateLoanInput(req.body);
  if (!parsed.ok) return res.status(422).json({ error: parsed.error });

  try {
    const result = await pool.query(
      `INSERT INTO loans(user_id, friend_name, amount, due_date)
       VALUES($1, $2, $3, $4)
       RETURNING id, friend_name AS "friendName", amount::float8 AS amount,
                 TO_CHAR(due_date, 'YYYY-MM-DD') AS "dueDate",
                 repaid_at AS "repaidAt", created_at AS "createdAt"`,
      [req.userId, parsed.friendName, parsed.amount, parsed.dueDate]
    );
    return res.status(201).json({ entry: result.rows[0] });
  } catch (error) {
    console.error("Create loan error:", error);
    return res.status(500).json({ error: "Could not create entry" });
  }
});

app.patch("/loans/:id/repay", async (req: AuthRequest, res) => {
  const id = Number(req.params.id);
  if (!Number.isSafeInteger(id) || id < 1) return res.status(400).json({ error: "Invalid entry id" });

  try {
    const result = await pool.query(
      `UPDATE loans SET repaid_at = NOW()
       WHERE id = $1 AND user_id = $2 AND repaid_at IS NULL
       RETURNING id, friend_name AS "friendName", amount::float8 AS amount,
                 TO_CHAR(due_date, 'YYYY-MM-DD') AS "dueDate",
                 repaid_at AS "repaidAt", created_at AS "createdAt"`,
      [id, req.userId]
    );
    if (result.rowCount === 0) {
      const existing = await pool.query("SELECT id, repaid_at FROM loans WHERE id = $1 AND user_id = $2", [id, req.userId]);
      if (existing.rowCount === 0) return res.status(404).json({ error: "Entry not found" });
      return res.status(409).json({ error: "Entry is already repaid" });
    }
    return res.json({ entry: result.rows[0] });
  } catch (error) {
    console.error("Mark repaid error:", error);
    return res.status(500).json({ error: "Could not mark entry as repaid" });
  }
});

app.get("/summary", async (req: AuthRequest, res) => {
  try {
    const result = await pool.query(
      `SELECT
        COALESCE(SUM(amount), 0)::float8 AS "totalLent",
        COALESCE(SUM(amount) FILTER (WHERE repaid_at IS NOT NULL), 0)::float8 AS "totalRepaid",
        COALESCE(SUM(amount) FILTER (WHERE repaid_at IS NULL AND due_date < CURRENT_DATE), 0)::float8 AS "overdueAmount"
       FROM loans WHERE user_id = $1`,
      [req.userId]
    );
    return res.json(result.rows[0]);
  } catch (error) {
    console.error("Summary error:", error);
    return res.status(500).json({ error: "Could not load summary" });
  }
});
