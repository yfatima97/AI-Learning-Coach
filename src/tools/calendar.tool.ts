import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { z } from "zod";
import { askClaudeJSON } from "../config/claude.js";
import { projectRoot } from "../config/load-env.js";

const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"] as const;

const PlanSchema = z.object({
  sessions: z.array(
    z.object({
      week: z.number().int().describe("1-based week number"),
      day: z.enum(DAYS),
      title: z.string().describe("Short session title, e.g. 'Python: loops'"),
      details: z.string().describe("What to study or build in this session"),
    }),
  ),
});

export interface ScheduleInput {
  goal: string;
  weeks?: number;
  days?: (typeof DAYS)[number][];
  startDate?: string; // YYYY-MM-DD, defaults to next Monday
  startTime?: string; // HH:MM, local time
  minutesPerSession?: number;
}

function nextMonday(from = new Date()) {
  const d = new Date(from);
  d.setDate(d.getDate() + ((8 - d.getDay()) % 7 || 7));
  return d;
}

const pad = (n: number) => String(n).padStart(2, "0");
const icsDate = (d: Date) =>
  `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}T${pad(d.getHours())}${pad(d.getMinutes())}00`;
const icsEscape = (s: string) => s.replace(/\\/g, "\\\\").replace(/\n/g, "\\n").replace(/([,;])/g, "\\$1");

/**
 * Calendar tool: Claude plans the sessions, code turns them into real dates
 * and an .ics file that imports into Google Calendar, Outlook or Apple Calendar.
 */
export async function scheduleStudyPlan(input: ScheduleInput) {
  const weeks = input.weeks ?? 4;
  const days: readonly (typeof DAYS)[number][] = input.days?.length ? input.days : ["Mon", "Wed", "Fri"];
  const minutes = input.minutesPerSession ?? 60;
  const [hh, mm] = (input.startTime ?? "19:00").split(":").map(Number);
  const start = input.startDate ? new Date(`${input.startDate}T00:00:00`) : nextMonday();

  const plan = await askClaudeJSON(
    "You are a learning coach who builds realistic weekly study schedules that mix theory and hands-on practice.",
    `Goal: ${input.goal}
Plan ${weeks} weeks of study sessions on these days only: ${days.join(", ")}.
Each session is ${minutes} minutes. One session per listed day per week. Build up gradually and end each week with a practice task.`,
    PlanSchema,
    "low",
  );

  // Keep Claude's order (week, then weekday) and place each session on the next
  // allowed study day on or after the start date, so nothing lands in the past.
  const ordered = plan.sessions
    .filter((s) => s.week >= 1 && s.week <= weeks && days.includes(s.day))
    .sort((a, b) => a.week - b.week || DAYS.indexOf(a.day) - DAYS.indexOf(b.day));

  const cursor = new Date(start);
  const dayName = (d: Date) => DAYS[(d.getDay() + 6) % 7];
  const events = ordered.map((s) => {
    while (!days.includes(dayName(cursor))) cursor.setDate(cursor.getDate() + 1);
    const begin = new Date(cursor);
    begin.setHours(hh, mm, 0, 0);
    cursor.setDate(cursor.getDate() + 1);
    return { ...s, start: begin, end: new Date(begin.getTime() + minutes * 60_000) };
  });

  const ics = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//AI Learning Coach//EN",
    ...events.flatMap((e, i) => [
      "BEGIN:VEVENT",
      `UID:${Date.now()}-${i}@ai-learning-coach`,
      `DTSTAMP:${icsDate(new Date())}`,
      `DTSTART:${icsDate(e.start)}`,
      `DTEND:${icsDate(e.end)}`,
      `SUMMARY:${icsEscape(e.title)}`,
      `DESCRIPTION:${icsEscape(e.details)}`,
      "END:VEVENT",
    ]),
    "END:VCALENDAR",
  ].join("\r\n");

  const dir = path.join(projectRoot, "data", "calendar");
  await mkdir(dir, { recursive: true });
  const file = path.join(dir, `study-plan-${Date.now()}.ics`);
  await writeFile(file, ics);

  return {
    calendarFile: file,
    sessions: events.map((e) => ({
      date: e.start.toDateString(),
      time: `${pad(e.start.getHours())}:${pad(e.start.getMinutes())}`,
      minutes,
      title: e.title,
      details: e.details,
    })),
  };
}
