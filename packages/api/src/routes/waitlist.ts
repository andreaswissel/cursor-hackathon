import { Router, Request, Response } from "express";
import { eq } from "drizzle-orm";
import { db } from "../db";
import { waitlist } from "../db/schema";

const router = Router();

router.post("/", async (req: Request, res: Response) => {
  const { name, email, company, role, roleOther, useCase, useCaseOther } = req.body as {
    name?: string;
    email?: string;
    company?: string;
    role?: string;
    roleOther?: string;
    useCase?: string;
    useCaseOther?: string;
  };

  if (!email) {
    res.status(400).json({ error: "Email is required." });
    return;
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    res.status(400).json({ error: "Invalid email format." });
    return;
  }

  try {
    const normalizedEmail = email.toLowerCase().trim();

    // Check for duplicate
    const existing = await db
      .select({ id: waitlist.id })
      .from(waitlist)
      .where(eq(waitlist.email, normalizedEmail))
      .limit(1);

    if (existing.length > 0) {
      res.json({ success: true, message: "You're already on the list!" });
      return;
    }

    await db.insert(waitlist).values({
      name: name?.trim() || null,
      email: normalizedEmail,
      company: company?.trim() || null,
      role: role?.trim() || null,
      roleOther: role === "Other" ? roleOther?.trim() || null : null,
      useCase: useCase?.trim() || null,
      useCaseOther: useCase === "Other" ? useCaseOther?.trim() || null : null,
    });

    res.json({ success: true, message: "You're on the list!" });
  } catch (err: unknown) {
    console.error("Waitlist insert error:", err);
    res.status(500).json({ error: "Something went wrong. Please try again." });
  }
});

export default router;
