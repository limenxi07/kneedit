/**
 * Wipes and recreates the demo accounts and their FAKE data.
 *
 *   npm run seed:demo
 *
 * It uses the service role key, so it only runs on a developer's machine:
 * - Locally it asks `supabase status` for the URL and key (run `npm run db:start` first).
 * - For the hosted project, put SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in
 *   .env.seed.local (gitignored).
 *
 * Demo emails default to demo-*@kneedit.test, which Mailpit catches locally.
 * Override one with DEMO_EMAIL_<KEY>, for example DEMO_EMAIL_SENIOR.
 *
 * Only accounts marked as demo (app_metadata.is_demo) are ever deleted, and the
 * script stops if a demo email already belongs to a real account. Real
 * accounts are never touched.
 */
import { execFileSync } from 'node:child_process';

import { createClient, type User } from '@supabase/supabase-js';

import { buildDemoData, type DemoKey } from '../fake-data/FAKE_DATA_seed.ts';
import { localDate } from '../lib/progress/index.ts';
import type { Database, Json } from '../lib/supabase/database.types.ts';

type Tables = Database['public']['Tables'];
const json = (value: object) => value as NonNullable<Json>;

function config(): { url: string; serviceRoleKey: string } {
  const url = process.env.SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (url && serviceRoleKey) return { url, serviceRoleKey };
  console.log('No SUPABASE_URL in .env.seed.local, so seeding the local Supabase.');
  const status = JSON.parse(
    execFileSync('npx', ['supabase', 'status', '-o', 'json'], {
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore'],
    }),
  ) as { API_URL: string; SERVICE_ROLE_KEY: string };
  return { url: status.API_URL, serviceRoleKey: status.SERVICE_ROLE_KEY };
}

const { url, serviceRoleKey } = config();
const admin = createClient<Database>(url, serviceRoleKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});

const today = localDate(new Date());
const data = buildDemoData({ today });

async function allUsers(): Promise<User[]> {
  const users: User[] = [];
  for (let page = 1; ; page++) {
    const { data: result, error } = await admin.auth.admin.listUsers({ page, perPage: 1000 });
    if (error) throw error;
    users.push(...result.users);
    if (result.users.length < 1000) return users;
  }
}

async function insert<T extends keyof Tables>(table: T, rows: Tables[T]['Insert'][]) {
  for (let i = 0; i < rows.length; i += 500) {
    const { error } = await admin.from(table).insert(rows.slice(i, i + 500) as never);
    if (error) throw new Error(`${table}: ${error.message}`);
  }
}

// ---------------------------------------------------------------------------
// Accounts
// ---------------------------------------------------------------------------

const emails = new Map(
  data.people.map((p) => [
    p.key,
    (process.env[`DEMO_EMAIL_${p.key.replace(/([A-Z])/g, '_$1').toUpperCase()}`] ?? p.defaultEmail)
      .trim()
      .toLowerCase(),
  ]),
);

const users = await allUsers();
const realClash = users.filter(
  (u) => u.app_metadata.is_demo !== true && [...emails.values()].includes(u.email ?? ''),
);
if (realClash.length > 0) {
  throw new Error(
    `These demo emails belong to real accounts, so nothing was changed: ${realClash
      .map((u) => u.email)
      .join(', ')}`,
  );
}

const oldDemo = users.filter((u) => u.app_metadata.is_demo === true);
for (const user of oldDemo) {
  const { error } = await admin.auth.admin.deleteUser(user.id);
  if (error) throw error;
}
console.log(`Deleted ${oldDemo.length} old demo accounts and everything about them.`);

const ids = new Map<DemoKey, string>();
for (const person of data.people) {
  const { data: created, error } = await admin.auth.admin.createUser({
    email: emails.get(person.key)!,
    email_confirm: true,
    app_metadata: { is_demo: true },
    user_metadata: { display_name: person.displayName, locale: person.locale },
  });
  if (error) throw error;
  ids.set(person.key, created.user.id);
  const { error: profileError } = await admin
    .from('profiles')
    .update({ default_context: person.role })
    .eq('id', created.user.id);
  if (profileError) throw profileError;
}
const id = (key: DemoKey) => ids.get(key)!;

// ---------------------------------------------------------------------------
// People and links
// ---------------------------------------------------------------------------

await insert(
  'seniors',
  data.seniors.map((s) => {
    const person = data.people.find((p) => p.key === s.key)!;
    return {
      profile_id: id(s.key),
      birth_year: person.senior?.birthYear,
      gender: person.senior?.gender,
      created_at: s.createdAt,
    };
  }),
);
await insert(
  'care_links',
  data.careLinks.map((l) => ({
    senior_id: id(l.seniorKey),
    member_id: id(l.memberKey),
    role: l.role,
    status: 'active' as const,
    responded_at: new Date().toISOString(),
  })),
);
await insert(
  'friendships',
  data.friendships.map((f) => ({
    requester_id: id(f.requesterKey),
    addressee_id: id(f.addresseeKey),
    status: 'accepted' as const,
    responded_at: new Date().toISOString(),
  })),
);

// ---------------------------------------------------------------------------
// Programme and history
// ---------------------------------------------------------------------------

await insert(
  'prescriptions',
  data.prescriptions.map((p) => ({
    id: p.id,
    senior_id: id(p.seniorKey),
    physio_id: id(p.physioKey),
    start_date: p.startDate,
    variation: p.variation,
    created_at: p.createdAt,
  })),
);
await insert(
  'prescription_items',
  data.prescriptions.flatMap((p) =>
    p.items.map((item) => ({
      prescription_id: p.id,
      exercise_id: item.exerciseId,
      position: item.position,
      reps: item.reps,
      frequency: item.frequency,
      weekday: item.weekday,
    })),
  ),
);
await insert(
  'sessions',
  data.sessions.map((s) => ({
    id: s.id,
    senior_id: id(s.seniorKey),
    local_date: s.localDate,
    started_at: s.startedAt,
    ended_at: s.endedAt,
    status: s.status,
    prescription_id: s.prescriptionId,
    source: 'fake' as const,
  })),
);
await insert(
  'session_exercises',
  data.sessions.flatMap((s) =>
    s.exercises.map((e) => ({
      session_id: s.id,
      exercise_id: e.exerciseId,
      position: e.position,
      reps_target: e.repsTarget,
      reps_done: e.repsDone,
      hurt: e.hurt,
      easy: e.easy,
      form_score: e.formScore,
      sensor_summary: json(e.sensorSummary),
      completed_at: e.completedAt,
      source: 'fake' as const,
    })),
  ),
);
await insert(
  'daily_activity',
  data.dailyActivity.map((a) => ({
    senior_id: id(a.seniorKey),
    local_date: a.localDate,
    steps: a.steps,
    walking_minutes: a.walkingMinutes,
    active_minutes: a.activeMinutes,
    sedentary_minutes: a.sedentaryMinutes,
    sit_to_stand_count: a.sitToStandCount,
    source: 'fake' as const,
  })),
);
await insert(
  'sleeve_devices',
  data.sleeveDevices.map((d) => ({
    senior_id: id(d.seniorKey),
    knee: d.knee,
    firmware: '0.0.0-sample',
    battery_pct: 82,
    worn: true,
    last_sync_at: d.lastSyncAt,
    calibration_status: 'done' as const,
    source: 'fake' as const,
  })),
);
await insert(
  'fall_events',
  data.fallEvents.map((f) => ({
    senior_id: id(f.seniorKey),
    detected_at: f.detectedAt,
    details: { sample: true },
    source: 'fake' as const,
  })),
);
await insert(
  'alerts',
  data.alerts.map((a) => ({
    senior_id: id(a.seniorKey),
    kind: a.kind,
    details: { sample: true },
    created_at: a.createdAt,
    source: 'fake' as const,
  })),
);

// ---------------------------------------------------------------------------
// Care team records
// ---------------------------------------------------------------------------

await insert(
  'caregiver_notes',
  data.caregiverNotes.map((n) => ({
    senior_id: id(n.seniorKey),
    author_id: id(n.authorKey),
    body: n.body,
    created_at: n.createdAt,
  })),
);
await insert(
  'visits',
  data.visits.map((v) => ({
    id: v.id,
    senior_id: id(v.seniorKey),
    physio_id: id(v.physioKey),
    scheduled_at: v.scheduledAt,
    location: v.location,
    status: v.status,
    completed_at: v.completedAt,
  })),
);
await insert(
  'visit_summaries',
  data.visits.flatMap((v) =>
    v.summary
      ? [
          {
            visit_id: v.id,
            part: 'adherence' as const,
            body: json(v.summary.adherence),
            includes_sample_data: v.summary.includesSampleData,
          },
          {
            visit_id: v.id,
            part: 'details' as const,
            body: json(v.summary.details),
            includes_sample_data: v.summary.includesSampleData,
          },
        ]
      : [],
  ),
);
await insert(
  'nudges',
  data.nudges.map((n) => ({
    senior_id: id(n.seniorKey),
    sender_id: id(n.senderKey),
    created_at: n.createdAt,
  })),
);

// ---------------------------------------------------------------------------
// Derived records, from lib/progress
// ---------------------------------------------------------------------------

await insert(
  'senior_stats',
  data.stats.map((s) => ({
    senior_id: id(s.seniorKey),
    as_of_date: s.asOfDate,
    week_start: s.weekStart,
    week_done: s.weekDone,
    week_prescribed: s.weekPrescribed,
    week_rate: s.weekRate,
    streak: s.streak,
    month_sessions: s.monthSessions,
    missed_days_this_week: s.missedDaysThisWeek,
    consecutive_missed_days: s.consecutiveMissedDays,
    includes_sample_data: s.includesSampleData,
  })),
);
await insert(
  'leaderboard_weeks',
  data.leaderboardWeeks.map((w) => ({
    senior_id: id(w.seniorKey),
    week_start: w.weekStart,
    week_rate: w.weekRate,
    streak: w.streak,
    includes_sample_data: true,
  })),
);
await insert(
  'weekly_reports',
  data.weeklyReports.map((r) => ({
    senior_id: id(r.seniorKey),
    week_start: r.weekStart,
    report: json(r.report),
    includes_sample_data: r.report.includesSampleData,
  })),
);

console.log(`Seeded ${data.people.length} demo accounts with FAKE data up to ${today}:`);
for (const person of data.people) {
  console.log(
    `  ${person.role.padEnd(9)} ${person.displayName.padEnd(14)} ${emails.get(person.key)}`,
  );
}
console.log(`  ${data.sessions.length} sessions, ${data.dailyActivity.length} days of steps.`);
