import { describe, expect, it } from "vitest";
import {
  phonologyItems,
  isReadingInputComplete,
  readingWordCount,
  scoreReading,
  scoreResponses,
} from "./assessmentScoring.js";

describe("scoreResponses", () => {
  it("calculates accuracy and response time from the supplied answers", () => {
    const result = scoreResponses(
      phonologyItems.slice(0, 2),
      ["Cat", "  wrong "],
      [1200, 800],
    );

    expect(result.correctCount).toBe(1);
    expect(result.totalCount).toBe(2);
    expect(result.accuracy).toBe(0.5);
    expect(result.averageResponseTimeMs).toBe(1000);
    expect(result.items.map((item) => item.correct)).toEqual([true, false]);
    expect(result.items[1].response).toBe("wrong");
  });

  it("counts a skipped answer as incorrect rather than inventing a score", () => {
    const result = scoreResponses(phonologyItems.slice(0, 1), [""], [null]);

    expect(result.correctCount).toBe(0);
    expect(result.accuracy).toBe(0);
    expect(result.items[0].response).toBe("");
    expect(result.items[0].responseTimeMs).toBeNull();
    expect(result.averageResponseTimeMs).toBeNull();
  });

  it("excludes skipped questions from average response time", () => {
    const result = scoreResponses(
      phonologyItems.slice(0, 2),
      ["Cat", ""],
      [1200, null],
    );

    expect(result.averageResponseTimeMs).toBe(1200);
    expect(result.items[1].responseTimeMs).toBeNull();
  });

  it("rejects incomplete item data", () => {
    expect(() => scoreResponses(phonologyItems, ["Cat"], [100])).toThrow(RangeError);
  });

  it("rejects invalid response times", () => {
    expect(() => scoreResponses(phonologyItems.slice(0, 1), ["Cat"], [-1])).toThrow(
      TypeError,
    );
  });
});

describe("scoreReading", () => {
  it("accepts explicit zero observations as completed reading inputs", () => {
    expect(
      isReadingInputComplete({
        correctWords: "0",
        omissions: "0",
        substitutions: "0",
      }),
    ).toBe(true);
  });

  it("rejects reading inputs that are blank", () => {
    expect(
      isReadingInputComplete({
        correctWords: "27",
        omissions: "",
        substitutions: "0",
      }),
    ).toBe(false);
  });

  it("derives accuracy and fluency from the observer's counts and measured time", () => {
    const result = scoreReading({
      correctWords: readingWordCount - 2,
      elapsedSeconds: 30,
      omissions: 1,
      substitutions: 1,
    });

    expect(result.totalWords).toBe(readingWordCount);
    expect(result.accuracy).toBe((readingWordCount - 2) / readingWordCount);
    expect(result.wordsPerMinute).toBe((readingWordCount - 2) * 2);
    expect(result.elapsedSeconds).toBe(30);
  });

  it("rejects counts outside the passage and non-positive durations", () => {
    expect(() =>
      scoreReading({
        correctWords: readingWordCount + 1,
        elapsedSeconds: 30,
        omissions: 0,
        substitutions: 0,
      }),
    ).toThrow(RangeError);

    expect(() =>
      scoreReading({
        correctWords: 0,
        elapsedSeconds: 30,
        omissions: readingWordCount + 1,
        substitutions: 0,
      }),
    ).toThrow(RangeError);

    expect(() =>
      scoreReading({
        correctWords: 0,
        elapsedSeconds: 0,
        omissions: 0,
        substitutions: 0,
      }),
    ).toThrow(RangeError);
  });
});
