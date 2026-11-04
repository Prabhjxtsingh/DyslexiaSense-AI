export const readingPassage =
  "The bright silver owl flew above the ancient pine trees. It searched for silent river stones while the soft cold wind whispered through the dark forest valley.";

export const readingWordCount = readingPassage.trim().split(/\s+/).length;

export const phonologyItems = [
  { prompt: "/k/ ... /a/ ... /t/", choices: ["Cap", "Cat", "Cot", "Cut"], answer: "Cat" },
  { prompt: "/s/ ... /u/ ... /n/", choices: ["Sun", "Sin", "Son", "Run"], answer: "Sun" },
  { prompt: "/m/ ... /a/ ... /p/", choices: ["Map", "Mop", "Cap", "Tap"], answer: "Map" },
  { prompt: "/f/ ... /i/ ... /sh/", choices: ["Fish", "Fist", "Dish", "Wish"], answer: "Fish" },
  { prompt: "/b/ ... /o/ ... /x/", choices: ["Box", "Fox", "Books", "Boss"], answer: "Box" },
];

export const visualItems = [
  { prompt: "Select the letter d.", choices: ["b", "d", "p", "q"], answer: "d" },
  { prompt: "Select the letter b.", choices: ["d", "p", "b", "q"], answer: "b" },
  { prompt: "Select the letter p.", choices: ["q", "b", "d", "p"], answer: "p" },
  { prompt: "Select the letter q.", choices: ["p", "q", "b", "d"], answer: "q" },
  { prompt: "Select the word ship.", choices: ["slip", "ship", "shop", "sip"], answer: "ship" },
];

export const spellingItems = [
  { prompt: "Spell the word cat.", answer: "cat" },
  { prompt: "Spell the word ship.", answer: "ship" },
  { prompt: "Spell the word window.", answer: "window" },
  { prompt: "Spell the word garden.", answer: "garden" },
  { prompt: "Spell the word bright.", answer: "bright" },
];

function normalizeResponse(value) {
  return value.trim().toLocaleLowerCase("en-US");
}

export function scoreResponses(items, responses, responseTimesMs) {
  if (
    items.length === 0 ||
    responses.length !== items.length ||
    responseTimesMs.length !== items.length
  ) {
    throw new RangeError("Every assessment item must have one response and response time.");
  }

  if (responses.some((response) => typeof response !== "string")) {
    throw new TypeError("Responses must be strings.");
  }
  if (
    responseTimesMs.some((time, index) =>
      responses[index].trim()
        ? !Number.isFinite(time) || time < 0
        : time !== null,
    )
  ) {
    throw new TypeError(
      "Answered items need a non-negative response time; skipped items need a null response time.",
    );
  }

  const results = items.map((item, index) => ({
    prompt: item.prompt,
    answer: item.answer,
    response: responses[index].trim(),
    correct: normalizeResponse(responses[index]) === normalizeResponse(item.answer),
    responseTimeMs: responses[index].trim() ? responseTimesMs[index] : null,
  }));
  const correctCount = results.filter((result) => result.correct).length;
  const answeredTimes = results
    .filter((result) => result.responseTimeMs !== null)
    .map((result) => result.responseTimeMs);

  return {
    correctCount,
    totalCount: items.length,
    accuracy: correctCount / items.length,
    averageResponseTimeMs: answeredTimes.length
      ? answeredTimes.reduce((total, time) => total + time, 0) / answeredTimes.length
      : null,
    items: results,
  };
}

export function scoreReading({
  correctWords,
  elapsedSeconds,
  omissions,
  substitutions,
}) {
  const counts = { correctWords, omissions, substitutions };
  for (const [name, value] of Object.entries(counts)) {
    if (!Number.isInteger(value) || value < 0) {
      throw new RangeError(`${name} must be a non-negative whole number.`);
    }
  }

  if (correctWords > readingWordCount) {
    throw new RangeError(`correctWords cannot exceed ${readingWordCount}.`);
  }
  if (omissions > readingWordCount || substitutions > readingWordCount) {
    throw new RangeError(`omissions and substitutions cannot exceed ${readingWordCount}.`);
  }
  if (!Number.isFinite(elapsedSeconds) || elapsedSeconds <= 0) {
    throw new RangeError("elapsedSeconds must be greater than zero.");
  }

  return {
    correctWords,
    totalWords: readingWordCount,
    accuracy: correctWords / readingWordCount,
    wordsPerMinute: (correctWords / elapsedSeconds) * 60,
    elapsedSeconds,
    omissions,
    substitutions,
  };
}
