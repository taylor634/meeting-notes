import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  // Clean up
  await prisma.decision.deleteMany();
  await prisma.openQuestion.deleteMany();
  await prisma.actionItem.deleteMany();
  await prisma.meetingOccurrence.deleteMany();
  await prisma.recurringMeeting.deleteMany();

  const weeklyAppCall = await prisma.recurringMeeting.create({
    data: {
      title: "Weekly App Call",
      description: "Weekly sync on product and engineering progress",
      cadence: "weekly",
      color: "violet",
      emoji: "📱",
      participants: JSON.stringify(["David Chen", "Sarah Park", "Taylor"]),
      pinned: true,
      nextDate: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000),
    },
  });

  const zendesk = await prisma.recurringMeeting.create({
    data: {
      title: "Bi-Weekly Zendesk Meeting",
      description: "Support tooling and ticket workflow review",
      cadence: "biweekly",
      color: "emerald",
      emoji: "🎧",
      participants: JSON.stringify(["Marcus Webb", "Taylor"]),
      pinned: false,
      nextDate: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000),
    },
  });

  const davidOneOnOne = await prisma.recurringMeeting.create({
    data: {
      title: "1:1 with David",
      description: "Weekly 1:1 check-in",
      cadence: "weekly",
      color: "blue",
      emoji: "👤",
      participants: JSON.stringify(["David Harris", "Taylor"]),
      pinned: true,
      nextDate: new Date(Date.now() + 1 * 24 * 60 * 60 * 1000),
    },
  });

  const finance = await prisma.recurringMeeting.create({
    data: {
      title: "Finance Sync",
      description: "Monthly finance review and forecasting",
      cadence: "monthly",
      color: "amber",
      emoji: "💰",
      participants: JSON.stringify(["CFO", "Taylor", "Ops Lead"]),
      pinned: false,
      nextDate: new Date(Date.now() + 12 * 24 * 60 * 60 * 1000),
    },
  });

  const leadership = await prisma.recurringMeeting.create({
    data: {
      title: "Leadership Meeting",
      description: "Company-wide leadership alignment",
      cadence: "weekly",
      color: "rose",
      emoji: "🏢",
      participants: JSON.stringify(["CEO", "CTO", "CFO", "Taylor", "VP Product"]),
      pinned: false,
      nextDate: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000),
    },
  });

  // Seed past occurrences for Weekly App Call
  const appOcc1 = await prisma.meetingOccurrence.create({
    data: {
      meetingId: weeklyAppCall.id,
      date: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000),
      status: "completed",
      summary: JSON.stringify([
        "Reviewed Q4 roadmap priorities",
        "Identified performance bottleneck in API layer",
        "Agreed to ship new onboarding flow by EOQ",
        "David to prototype new dashboard components"
      ]),
      notes: "## Agenda\n- Q4 roadmap review\n- API performance issues\n- Onboarding flow update\n\n## Discussion\nWe spent most of the call reviewing the Q4 roadmap. Key concern is that we're trying to ship too many features at once. Agreed to trim scope.\n\nAPI performance came up — Sarah shared profiling data showing the `/users` endpoint takes 800ms on average. Root cause is N+1 queries in the ORM layer.\n\n## Decisions\n- Prioritize onboarding flow over analytics dashboard for Q4\n- Hire contractor for API optimization work",
    },
  });

  await prisma.actionItem.createMany({
    data: [
      {
        occurrenceId: appOcc1.id,
        meetingId: weeklyAppCall.id,
        text: "Fix N+1 query in /users endpoint",
        owner: "Taylor",
        completed: true,
        completedAt: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000),
      },
      {
        occurrenceId: appOcc1.id,
        meetingId: weeklyAppCall.id,
        text: "Write job description for API contractor",
        owner: "David Chen",
        completed: false,
      },
      {
        occurrenceId: appOcc1.id,
        meetingId: weeklyAppCall.id,
        text: "Prototype new dashboard components",
        owner: "David Chen",
        completed: false,
      },
    ],
  });

  await prisma.openQuestion.createMany({
    data: [
      {
        occurrenceId: appOcc1.id,
        text: "Should we use server-side rendering for the dashboard?",
        resolved: true,
        resolution: "Yes — SSR for initial load, then hydrate with SWR",
      },
      {
        occurrenceId: appOcc1.id,
        text: "What metrics should we track for the new onboarding flow?",
        resolved: false,
      },
    ],
  });

  await prisma.decision.createMany({
    data: [
      {
        occurrenceId: appOcc1.id,
        text: "Prioritize onboarding flow over analytics dashboard for Q4",
      },
      {
        occurrenceId: appOcc1.id,
        text: "Hire contractor for API optimization",
      },
    ],
  });

  const appOcc2 = await prisma.meetingOccurrence.create({
    data: {
      meetingId: weeklyAppCall.id,
      date: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
      status: "completed",
      summary: JSON.stringify([
        "Onboarding flow design reviewed and approved",
        "Contractor search underway — 3 candidates identified",
        "Mobile responsiveness flagged as a blocker",
        "Agreed on launch date of Nov 15"
      ]),
      notes: "## Updates\n- Taylor fixed the N+1 query — API is now 120ms avg ✅\n- David shared 3 contractor candidates, need to schedule interviews\n\n## Onboarding Flow\nWalked through Figma designs. Team approved the new 3-step flow. Need to implement by Nov 8 to leave time for QA.\n\n## Mobile\nSarah flagged that the current designs aren't responsive. This is a blocker before launch.",
    },
  });

  await prisma.actionItem.createMany({
    data: [
      {
        occurrenceId: appOcc2.id,
        meetingId: weeklyAppCall.id,
        text: "Write job description for API contractor",
        owner: "David Chen",
        completed: false,
        rolledFromId: null,
      },
      {
        occurrenceId: appOcc2.id,
        meetingId: weeklyAppCall.id,
        text: "Prototype new dashboard components",
        owner: "David Chen",
        completed: false,
      },
      {
        occurrenceId: appOcc2.id,
        meetingId: weeklyAppCall.id,
        text: "Implement responsive design for onboarding flow",
        owner: "Taylor",
        completed: false,
      },
      {
        occurrenceId: appOcc2.id,
        meetingId: weeklyAppCall.id,
        text: "Schedule contractor interviews",
        owner: "David Chen",
        completed: true,
        completedAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000),
      },
    ],
  });

  await prisma.openQuestion.create({
    data: {
      occurrenceId: appOcc2.id,
      text: "What metrics should we track for the new onboarding flow?",
      resolved: false,
    },
  });

  // Seed 1:1 with David occurrences
  const davidOcc1 = await prisma.meetingOccurrence.create({
    data: {
      meetingId: davidOneOnOne.id,
      date: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
      status: "completed",
      summary: JSON.stringify([
        "Discussed career growth path to Staff Engineer",
        "Performance review prep — targeting 'exceeds expectations'",
        "Raised concern about meeting overload",
        "Agreed to block 2 hours of deep work daily"
      ]),
      notes: "## Career Development\nDavid wants to target Staff Engineer by end of next year. We talked about what that looks like — mainly needs to demonstrate system design leadership and start mentoring juniors.\n\n## Perf Review\nQ3 perf coming up. David has strong delivery record but needs more visible cross-team impact. Suggested he lead the API standardization initiative.\n\n## Concerns\nDavid mentioned feeling overwhelmed by meetings. We agreed to audit his calendar.",
    },
  });

  await prisma.actionItem.createMany({
    data: [
      {
        occurrenceId: davidOcc1.id,
        meetingId: davidOneOnOne.id,
        text: "David to lead API standardization initiative",
        owner: "David Harris",
        completed: false,
      },
      {
        occurrenceId: davidOcc1.id,
        meetingId: davidOneOnOne.id,
        text: "Audit David's calendar and remove unnecessary meetings",
        owner: "Taylor",
        completed: false,
      },
      {
        occurrenceId: davidOcc1.id,
        meetingId: davidOneOnOne.id,
        text: "Taylor to write strong perf review for David",
        owner: "Taylor",
        completed: false,
        dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      },
    ],
  });

  console.log("✅ Seed complete");
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
