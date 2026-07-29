/**
 * One-off helper: give every existing user a username derived from their email local part,
 * so they can sign in with either. Users who already have one are left alone.
 *
 *   node scripts/backfillUsernames.js          # dry run, prints the plan and changes nothing
 *   node scripts/backfillUsernames.js --apply  # write the usernames
 *
 * Admins can always override any of these afterwards from the Users page.
 */
import 'dotenv/config';
import mongoose from 'mongoose';
import User from '../models/User.js';
import connectDB from '../config/db.js';
import { isValidUsername } from '../utils/loginIdentifier.js';

const apply = process.argv.includes('--apply');

/** Derive a candidate username from an email local part: "Ahmed.Raza+x@a.com" -> "ahmed.raza". */
function deriveBase(email) {
  const local = String(email || '').split('@')[0].toLowerCase();
  const cleaned = local.replace(/\+.*$/, '').replace(/[^a-z0-9._-]/g, '');
  if (cleaned.length >= 3) return cleaned.slice(0, 30);
  return (cleaned + 'user').slice(0, 30);
}

async function run() {
  await connectDB();

  const users = await User.find().select('name email username').sort({ createdAt: 1 }).lean();
  const taken = new Set(users.map((u) => u.username).filter(Boolean));
  const missing = users.filter((u) => !u.username);

  if (missing.length === 0) {
    console.log(`All ${users.length} user(s) already have a username. Nothing to do.`);
    await mongoose.disconnect();
    return;
  }

  const plan = [];
  for (const user of missing) {
    const base = deriveBase(user.email);
    let candidate = base;
    let n = 2;
    while (taken.has(candidate)) {
      const suffix = String(n++);
      candidate = base.slice(0, 30 - suffix.length) + suffix;
    }
    if (!isValidUsername(candidate)) {
      console.warn(`  SKIP  ${user.email} — could not derive a valid username (got "${candidate}")`);
      continue;
    }
    taken.add(candidate);
    plan.push({ user, username: candidate });
  }

  console.log(`${missing.length} user(s) without a username:\n`);
  for (const { user, username } of plan) {
    console.log(`  ${user.email.padEnd(32)} -> ${username}`);
  }

  if (!apply) {
    console.log(`\nDry run. Re-run with --apply to write these ${plan.length} username(s).`);
    await mongoose.disconnect();
    return;
  }

  let updated = 0;
  for (const { user, username } of plan) {
    try {
      await User.updateOne({ _id: user._id }, { $set: { username } });
      updated++;
    } catch (err) {
      console.error(`  FAILED ${user.email}: ${err.message}`);
    }
  }
  console.log(`\nUpdated ${updated} of ${plan.length} user(s).`);
  await mongoose.disconnect();
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
