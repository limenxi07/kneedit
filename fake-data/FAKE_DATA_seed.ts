/**
 * FAKE DATA, FOR DEMO ACCOUNTS ONLY.
 *
 * Everything here is invented: people, sessions, steps, falls and notes. It
 * is only ever written to demo accounts (app_metadata.is_demo), by
 * scripts/seed-demo.mts, and the database rejects fake records for real
 * accounts. Screens that show it carry the "Sample data" tag.
 *
 * buildDemoData() is pure: the same `today` and seed give the same data, so
 * it is unit-tested in tests/fake-data.test.ts.
 */
import {
  addDays,
  buildVisitSummary,
  buildWeeklyReport,
  computeStats,
  eachDay,
  localDate,
  planOn,
  prescribedSlots,
  sessionQueue,
  weekStart,
  type LocalDate,
  type PlanItem,
  type Prescription,
  type Programme,
  type SeniorStats,
  type SessionRecord,
  type VisitSummary,
  type WeeklyReport,
} from '../lib/progress/index.ts';
import {
  createRandom,
  fakeDailyActivity,
  fakeFormScore,
  fakeSensorSummary,
  type DailyActivity,
} from '../lib/sleeve/index.ts';

export type DemoRole = 'senior' | 'caregiver' | 'physio';
export type DemoKey = 'senior' | 'caregiver' | 'physio' | 'friendAhKow' | 'friendSiti';

export type DemoPerson = {
  key: DemoKey;
  role: DemoRole;
  displayName: string;
  locale: 'en' | 'zh-Hans';
  /** Overridable with DEMO_EMAIL_<KEY> in .env.seed.local. */
  defaultEmail: string;
  senior?: { birthYear: number; gender: 'female' | 'male' | 'prefer_not_to_say' };
  /** How often this senior does a prescribed session, 0 to 1. */
  adherence?: number;
};

export const DEMO_PEOPLE: readonly DemoPerson[] = [
  {
    key: 'senior',
    role: 'senior',
    displayName: 'Tan Mei Ling',
    locale: 'en',
    defaultEmail: 'demo-senior@kneedit.test',
    senior: { birthYear: 1953, gender: 'female' },
    adherence: 0.85,
  },
  {
    key: 'caregiver',
    role: 'caregiver',
    displayName: 'Tan Wei Jie',
    locale: 'en',
    defaultEmail: 'demo-caregiver@kneedit.test',
  },
  {
    key: 'physio',
    role: 'physio',
    displayName: 'Priya Nair',
    locale: 'en',
    defaultEmail: 'demo-physio@kneedit.test',
  },
  {
    key: 'friendAhKow',
    role: 'senior',
    displayName: 'Lim Ah Kow',
    locale: 'zh-Hans',
    defaultEmail: 'demo-friend-1@kneedit.test',
    senior: { birthYear: 1949, gender: 'male' },
    adherence: 0.7,
  },
  {
    key: 'friendSiti',
    role: 'senior',
    displayName: 'Siti Rahmah',
    locale: 'en',
    defaultEmail: 'demo-friend-2@kneedit.test',
    senior: { birthYear: 1956, gender: 'female' },
    adherence: 0.95,
  },
];

export const STARTER_ROUTINE: PlanItem[] = [
  { exerciseId: 'seated-knee-extension', position: 1, reps: 10, frequency: 'daily', weekday: null },
  { exerciseId: 'ankle-pumps', position: 2, reps: 15, frequency: 'daily', weekday: null },
  { exerciseId: 'quad-sets', position: 3, reps: 10, frequency: 'daily', weekday: null },
];

const HISTORY_DAYS = 42;

export type DemoSession = {
  id: string;
  seniorKey: DemoKey;
  localDate: LocalDate;
  startedAt: string;
  endedAt: string;
  status: 'complete' | 'incomplete';
  prescriptionId: string | null;
  exercises: {
    exerciseId: string;
    position: number;
    repsTarget: number;
    repsDone: number;
    hurt: boolean | null;
    easy: boolean | null;
    formScore: number;
    sensorSummary: Record<string, unknown>;
    completedAt: string;
  }[];
};

export type DemoData = {
  people: readonly DemoPerson[];
  seniors: { key: DemoKey; createdAt: string; programme: Programme }[];
  careLinks: { seniorKey: DemoKey; memberKey: DemoKey; role: 'caregiver' | 'physio' }[];
  friendships: { requesterKey: DemoKey; addresseeKey: DemoKey }[];
  prescriptions: (Prescription & { seniorKey: DemoKey; physioKey: DemoKey })[];
  sessions: DemoSession[];
  dailyActivity: (DailyActivity & { seniorKey: DemoKey })[];
  sleeveDevices: { seniorKey: DemoKey; knee: 'left' | 'right'; lastSyncAt: string }[];
  fallEvents: { seniorKey: DemoKey; detectedAt: string }[];
  alerts: { seniorKey: DemoKey; kind: 'possible_fall'; createdAt: string }[];
  caregiverNotes: { seniorKey: DemoKey; authorKey: DemoKey; body: string; createdAt: string }[];
  visits: {
    id: string;
    seniorKey: DemoKey;
    physioKey: DemoKey;
    scheduledAt: string;
    location: string;
    status: 'scheduled' | 'completed';
    completedAt: string | null;
    summary: VisitSummary | null;
  }[];
  nudges: { seniorKey: DemoKey; senderKey: DemoKey; createdAt: string }[];
  stats: (SeniorStats & { seniorKey: DemoKey })[];
  leaderboardWeeks: {
    seniorKey: DemoKey;
    weekStart: LocalDate;
    weekRate: number;
    streak: number;
  }[];
  weeklyReports: { seniorKey: DemoKey; weekStart: LocalDate; report: WeeklyReport }[];
};

/** An instant at a Singapore wall-clock time on a date. */
function sgTime(date: LocalDate, hour: number, minute = 0): string {
  const hh = String(hour).padStart(2, '0');
  const mm = String(minute).padStart(2, '0');
  return new Date(`${date}T${hh}:${mm}:00+08:00`).toISOString();
}

function minutesAfter(iso: string, minutes: number): string {
  return new Date(Date.parse(iso) + minutes * 60_000).toISOString();
}

export function buildDemoData(options: {
  today: LocalDate;
  seed?: string;
  newId?: () => string;
}): DemoData {
  const { today } = options;
  const seed = options.seed ?? 'kneedit-demo';
  const newId = options.newId ?? (() => globalThis.crypto.randomUUID());
  const firstDay = addDays(today, -HISTORY_DAYS);
  const lastWeek = addDays(weekStart(today), -7);

  // Mei Ling's physio prescribed a programme three weeks ago; the friends are
  // still on the starter routine.
  const prescription: DemoData['prescriptions'][number] = {
    id: newId(),
    seniorKey: 'senior',
    physioKey: 'physio',
    startDate: addDays(today, -21),
    createdAt: sgTime(addDays(today, -22), 16),
    variation: 'same_every_day',
    items: [
      {
        exerciseId: 'seated-knee-extension',
        position: 1,
        reps: 12,
        frequency: 'daily',
        weekday: null,
      },
      { exerciseId: 'quad-sets', position: 2, reps: 10, frequency: 'daily', weekday: null },
      {
        exerciseId: 'heel-raises',
        position: 3,
        reps: 8,
        frequency: 'alternate_days',
        weekday: null,
      },
    ],
  };

  const data: DemoData = {
    people: DEMO_PEOPLE,
    seniors: [],
    careLinks: [
      { seniorKey: 'senior', memberKey: 'caregiver', role: 'caregiver' },
      { seniorKey: 'senior', memberKey: 'physio', role: 'physio' },
    ],
    friendships: [
      { requesterKey: 'senior', addresseeKey: 'friendAhKow' },
      { requesterKey: 'friendSiti', addresseeKey: 'senior' },
    ],
    prescriptions: [prescription],
    sessions: [],
    dailyActivity: [],
    sleeveDevices: [{ seniorKey: 'senior', knee: 'left', lastSyncAt: sgTime(today, 7, 45) }],
    fallEvents: [],
    alerts: [],
    caregiverNotes: [
      {
        seniorKey: 'senior',
        authorKey: 'caregiver',
        body: 'Mei Ling said the stairs at the MRT felt easier this week.',
        createdAt: sgTime(addDays(today, -12), 20, 15),
      },
      {
        seniorKey: 'senior',
        authorKey: 'caregiver',
        body: 'Some stiffness in the morning after the rain. Better by lunch.',
        createdAt: sgTime(addDays(today, -5), 21, 0),
      },
    ],
    visits: [],
    nudges: [{ seniorKey: 'senior', senderKey: 'caregiver', createdAt: sgTime(today, 8, 30) }],
    stats: [],
    leaderboardWeeks: [],
    weeklyReports: [],
  };

  for (const person of DEMO_PEOPLE) {
    if (person.role !== 'senior') continue;
    const random = createRandom(`${seed}:${person.key}`);
    const createdAt = sgTime(firstDay, 9);
    const programme: Programme = {
      startDate: localDate(createdAt),
      defaultRoutine: STARTER_ROUTINE,
      prescriptions: data.prescriptions.filter((p) => p.seniorKey === person.key),
    };
    data.seniors.push({ key: person.key, createdAt, programme });

    const sessions: SessionRecord[] = [];
    for (const date of eachDay(programme.startDate, today)) {
      // Mei Ling hasn't exercised yet today, so the demo can start a session.
      const isToday = date === today;
      if (isToday && person.key === 'senior') continue;
      if (!isToday) {
        data.dailyActivity.push({ seniorKey: person.key, ...fakeDailyActivity(seed, date) });
      }

      const slots = prescribedSlots(programme, date);
      for (let n = 1; n <= slots; n++) {
        if (!random.chance(person.adherence ?? 0.8)) continue;
        const queue = sessionQueue(programme, date, n);
        // Now and then a session is ended early.
        const finished = random.chance(0.94);
        const done = finished
          ? queue
          : queue.slice(0, random.int(1, Math.max(1, queue.length - 1)));
        const startedAt = sgTime(
          date,
          n === 1 ? random.int(8, 10) : random.int(17, 19),
          random.int(0, 59),
        );
        let clock = startedAt;
        const exercises = done.map((item) => {
          clock = minutesAfter(clock, random.int(3, 6));
          return {
            exerciseId: item.exerciseId,
            position: item.position,
            repsTarget: item.reps,
            repsDone: item.reps - (random.chance(0.15) ? 1 : 0),
            hurt: random.chance(0.03) ? null : random.chance(0.12),
            easy: random.chance(0.03) ? null : random.chance(0.7),
            formScore: fakeFormScore(random),
            sensorSummary: fakeSensorSummary(random),
            completedAt: clock,
          };
        });
        const session: DemoSession = {
          id: newId(),
          seniorKey: person.key,
          localDate: date,
          startedAt,
          endedAt: minutesAfter(clock, 1),
          status: finished ? 'complete' : 'incomplete',
          prescriptionId: planOn(programme, date)?.prescriptionId ?? null,
          exercises,
        };
        data.sessions.push(session);
        sessions.push({
          id: session.id,
          localDate: date,
          status: session.status,
          endedAt: session.endedAt,
          source: 'fake',
          exercises: exercises.map((e) => ({
            exerciseId: e.exerciseId,
            hurt: e.hurt,
            easy: e.easy,
            formScore: e.formScore,
          })),
        });
      }
    }

    data.stats.push({ seniorKey: person.key, ...computeStats(programme, sessions, today) });
    const lastSunday = addDays(lastWeek, 6);
    const lastWeekStats = computeStats(programme, sessions, lastSunday);
    data.leaderboardWeeks.push({
      seniorKey: person.key,
      weekStart: lastWeek,
      weekRate: lastWeekStats.weekRate,
      streak: lastWeekStats.streak,
    });

    if (person.key === 'senior') {
      const fallDay = addDays(today, -10);
      data.fallEvents.push({ seniorKey: 'senior', detectedAt: sgTime(fallDay, 15, 42) });
      data.alerts.push({
        seniorKey: 'senior',
        kind: 'possible_fall',
        createdAt: sgTime(fallDay, 15, 42),
      });

      data.weeklyReports.push({
        seniorKey: 'senior',
        weekStart: lastWeek,
        report: buildWeeklyReport({
          programme,
          sessions,
          activity: data.dailyActivity
            .filter((a) => a.seniorKey === 'senior')
            .map((a) => ({ localDate: a.localDate, steps: a.steps, source: 'fake' as const })),
          falls: [{ localDate: fallDay, source: 'fake' }],
          weekStart: lastWeek,
          today,
        }),
      });

      const visitDay = addDays(today, -14);
      data.visits.push(
        {
          id: newId(),
          seniorKey: 'senior',
          physioKey: 'physio',
          scheduledAt: sgTime(visitDay, 10),
          location: 'Demo Clinic, Room 3',
          status: 'completed',
          completedAt: sgTime(visitDay, 10, 40),
          summary: buildVisitSummary({
            programme,
            sessions,
            notes: [],
            periodStart: programme.startDate,
            periodEnd: addDays(visitDay, -1),
          }),
        },
        {
          id: newId(),
          seniorKey: 'senior',
          physioKey: 'physio',
          scheduledAt: sgTime(addDays(today, 7), 10),
          location: 'Demo Clinic, Room 3',
          status: 'scheduled',
          completedAt: null,
          summary: null,
        },
      );
    }
  }

  return data;
}
