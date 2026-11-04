import { describe, expect, it } from "vitest";
import { createAssessmentPdf } from "./reportPdf.js";

const activity = {
  correctCount: 1,
  totalCount: 1,
  accuracy: 1,
  averageResponseTimeMs: 120,
  items: [
    {
      prompt: "Example prompt",
      response: "Example answer",
      correct: true,
      answer: "Example answer",
      responseTimeMs: 120,
    },
  ],
};

const sampleResult = {
  id: "test-result",
  completedAt: "2026-11-05T00:00:00.000Z",
  participantLabel: "Test participant",
  reading: {
    correctWords: 20,
    totalWords: 27,
    accuracy: 20 / 27,
    wordsPerMinute: 60,
    elapsedSeconds: 20,
    omissions: 1,
    substitutions: 1,
  },
  phonology: activity,
  visual: activity,
  spelling: activity,
};

describe("createAssessmentPdf", () => {
  it("creates a PDF report with activity observations and the diagnosis boundary", async () => {
    const pdf = await createAssessmentPdf(sampleResult);
    const bytes = new Uint8Array(pdf.output("arraybuffer"));
    const content = pdf.output();

    expect(new TextDecoder().decode(bytes.slice(0, 5))).toBe("%PDF-");
    expect(pdf.getNumberOfPages()).toBeGreaterThan(0);
    expect(content).toContain("Reading fluency");
    expect(content).toContain("Chance of dyslexia diagnosis");
    expect(content).toContain("not a person's chance of receiving a diagnosis");
  });

  it("includes a separate model score when available", async () => {
    const pdf = await createAssessmentPdf({
      ...sampleResult,
      researchModel: {
        score: 0.42,
        negative_score: 0.58,
        positive_label: "Yes",
        negative_label: "No",
        model: "xgboost",
        prediction: "No",
        generatedAt: "2026-11-05T00:00:00.000Z",
      },
    });

    expect(pdf.output()).toContain("Separate Dyt research model score");
    expect(pdf.output()).toContain('Dyt dyslexia label "Yes": 42%; "No": 58%');
  });
});
