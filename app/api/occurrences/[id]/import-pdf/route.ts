import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import pdfParse from "pdf-parse";

interface Parsed {
  summary: string[];
  decisions: string[];
  openQuestions: string[];
  actionItems: { text: string; owner: string | null }[];
  notes: string;
}

function extractSection(text: string, heading: string, nextHeadings: string[]): string {
  const pattern = new RegExp(`${heading}\\s*\\n([\\s\\S]*?)(?=${nextHeadings.map((h) => `${h}\\s*\\n`).join("|")}|$)`, "i");
  const match = text.match(pattern);
  return match ? match[1].trim() : "";
}

function parseBullets(block: string): string[] {
  return block
    .split("\n")
    .map((l) => l.replace(/^[•\-*]\s*/, "").trim())
    .filter((l) => l.length > 0 && !/^\d+$/.test(l));
}

function parseActionItems(block: string): { text: string; owner: string | null }[] {
  const lines = block
    .split("\n")
    .map((l) => l.replace(/^[•\-*]\s*/, "").trim())
    .filter((l) => l.length > 0 && !/^\d+$/.test(l));

  return lines.map((line) => {
    const ownerMatch = line.match(/^([A-Za-z]+):\s+(.+)/);
    if (ownerMatch) {
      return { owner: ownerMatch[1], text: ownerMatch[2].replace(/\s+\d+(\s+\d+)*$/, "").trim() };
    }
    return { owner: null, text: line.replace(/\s+\d+(\s+\d+)*$/, "").trim() };
  });
}

function parsePdfText(text: string): Parsed {
  const headings = ["Key Outcomes", "Decisions Made", "Pending Confirmation", "Open Questions", "Action Items", "Next Meeting"];

  const summaryBlock = extractSection(text, "Key Outcomes", headings.slice(1));
  const decisionsBlock = extractSection(text, "Decisions Made", headings.slice(2));
  const pendingBlock = extractSection(text, "Pending Confirmation", headings.slice(3));
  const questionsBlock = extractSection(text, "Open Questions", headings.slice(4));
  const actionsBlock = extractSection(text, "Action Items", headings.slice(5));

  // Summary: paragraph text → treat as single bullet
  const summaryText = summaryBlock.replace(/\n/g, " ").trim();

  // Decisions: strip citation numbers at end of lines
  const decisions = parseBullets(decisionsBlock).map((d) => d.replace(/\s+\d+(\s+\d+)*$/, "").trim());

  // Open questions: pending + open questions combined
  const openQuestions = [
    ...parseBullets(pendingBlock).map((q) => q.replace(/\s+\d+(\s+\d+)*$/, "").trim()),
    ...parseBullets(questionsBlock).map((q) => q.replace(/\s+\d+(\s+\d+)*$/, "").trim()),
  ];

  const actionItems = parseActionItems(actionsBlock);

  return {
    summary: summaryText ? [summaryText] : [],
    decisions,
    openQuestions,
    actionItems,
    notes: "",
  };
}

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const formData = await req.formData();
  const file = formData.get("file") as File | null;
  if (!file) return NextResponse.json({ error: "No file uploaded" }, { status: 400 });

  const buffer = Buffer.from(await file.arrayBuffer());
  const pdf = await pdfParse(buffer);
  const parsed = parsePdfText(pdf.text);

  // Update summary
  if (parsed.summary.length > 0) {
    await prisma.meetingOccurrence.update({
      where: { id },
      data: { summary: JSON.stringify(parsed.summary) },
    });
  }

  // Create decisions
  for (const text of parsed.decisions) {
    if (text) await prisma.decision.create({ data: { occurrenceId: id, text } });
  }

  // Create open questions
  for (const text of parsed.openQuestions) {
    if (text) await prisma.openQuestion.create({ data: { occurrenceId: id, text } });
  }

  // Create action items
  const occurrence = await prisma.meetingOccurrence.findUnique({ where: { id } });
  if (!occurrence) return NextResponse.json({ error: "Occurrence not found" }, { status: 404 });

  for (const item of parsed.actionItems) {
    if (item.text) {
      await prisma.actionItem.create({
        data: {
          occurrenceId: id,
          meetingId: occurrence.meetingId,
          text: item.text,
          owner: item.owner,
        },
      });
    }
  }

  return NextResponse.json({
    imported: {
      summaryBullets: parsed.summary.length,
      decisions: parsed.decisions.length,
      openQuestions: parsed.openQuestions.length,
      actionItems: parsed.actionItems.length,
    },
  });
}
