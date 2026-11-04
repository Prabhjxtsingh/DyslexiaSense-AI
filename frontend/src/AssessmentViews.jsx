import { useEffect, useRef, useState } from "react";
import {
  phonologyItems,
  readingPassage,
  readingWordCount,
  isReadingInputComplete,
  scoreReading,
  scoreResponses,
  spellingItems,
  visualItems,
} from "./assessmentScoring.js";
import { downloadAssessmentPdf } from "./reportPdf.js";

const initialResponses = {
  phonology: Array(phonologyItems.length).fill(null),
  visual: Array(visualItems.length).fill(null),
  spelling: Array(spellingItems.length).fill(null),
};

const initialResponseTimes = {
  phonology: Array(phonologyItems.length).fill(null),
  visual: Array(visualItems.length).fill(null),
  spelling: Array(spellingItems.length).fill(null),
};

const now = () => globalThis.performance?.now?.() ?? Date.now();

function speakText(text) {
  if (!("speechSynthesis" in window)) {
    return;
  }
  window.speechSynthesis.cancel();
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.rate = 0.88;
  window.speechSynthesis.speak(utterance);
}

function ChoiceActivity({
  title,
  instructions,
  items,
  index,
  answers,
  onAnswer,
  onSkip,
  onPrevious,
  onAdvance,
  nextLabel,
  playText,
}) {
  const item = items[index];
  const answer = answers[index];

  return (
    <div className="bg-white dark:bg-zinc-900 p-8 sm:p-12 rounded-[2.5rem] border border-zinc-100 dark:border-zinc-800 shadow-soft space-y-8">
      <div className="text-center space-y-2">
        <h2 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-white">
          {title}
        </h2>
        <p className="text-zinc-500 dark:text-zinc-400">{instructions}</p>
        <p className="text-xs font-bold uppercase tracking-widest text-zinc-400">
          Question {index + 1} of {items.length}
        </p>
      </div>

      <div className="text-center py-10 bg-zinc-50 dark:bg-zinc-950 rounded-[2rem] border border-zinc-100 dark:border-zinc-800 space-y-5">
        {playText && (
          <button
            type="button"
            onClick={() => speakText(playText)}
            className="mx-auto rounded-full bg-brand-100 dark:bg-brand-900/50 px-6 py-3 font-bold text-brand-700 dark:text-brand-300 hover:bg-brand-200 dark:hover:bg-brand-900"
          >
            Play instructions
          </button>
        )}
        <p className="text-xl font-semibold text-zinc-800 dark:text-zinc-200">
          {item.prompt}
        </p>
      </div>

      <div className="grid grid-cols-2 gap-4">
        {item.choices.map((choice) => (
          <button
            key={choice}
            type="button"
            aria-pressed={answer === choice}
            onClick={() => onAnswer(choice)}
            className={`rounded-2xl border-2 p-5 text-lg font-bold transition ${
              answer === choice
                ? "border-brand-500 bg-brand-50 text-brand-900 dark:bg-brand-900/30 dark:text-brand-200"
                : "border-zinc-200 bg-white text-zinc-700 hover:border-brand-300 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-200"
            }`}
          >
            {choice}
          </button>
        ))}
      </div>

      <div className="flex flex-wrap justify-between gap-3">
        <button
          type="button"
          onClick={onPrevious}
          className="px-4 py-3 font-bold text-zinc-500 hover:text-zinc-900 dark:hover:text-white"
        >
          Back
        </button>
        <div className="flex flex-wrap gap-3">
          {answer === null && (
            <button
              type="button"
              onClick={onSkip}
              className="rounded-full border border-zinc-300 px-5 py-3 font-bold text-zinc-600 dark:border-zinc-700 dark:text-zinc-300"
            >
              Skip this question
            </button>
          )}
          <button
            type="button"
            disabled={answer === null}
            onClick={onAdvance}
            className="rounded-full bg-zinc-900 px-7 py-3 font-bold text-white disabled:cursor-not-allowed disabled:opacity-40 dark:bg-white dark:text-zinc-900"
          >
            {nextLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

function SpellingActivity({
  index,
  answers,
  onAnswer,
  onSkip,
  onPrevious,
  onAdvance,
}) {
  const item = spellingItems[index];
  const answer = answers[index];
  const [draft, setDraft] = useState(answer ?? "");

  useEffect(() => {
    setDraft(answer ?? "");
  }, [answer, index]);

  return (
    <div className="bg-white dark:bg-zinc-900 p-8 sm:p-12 rounded-[2.5rem] border border-zinc-100 dark:border-zinc-800 shadow-soft space-y-8">
      <div className="text-center space-y-2">
        <h2 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-white">
          Spelling
        </h2>
        <p className="text-zinc-500 dark:text-zinc-400">
          Listen to the word, then enter what you heard. Answers are compared
          exactly, ignoring letter case and surrounding spaces.
        </p>
        <p className="text-xs font-bold uppercase tracking-widest text-zinc-400">
          Question {index + 1} of {spellingItems.length}
        </p>
      </div>

      <div className="text-center py-10 bg-zinc-50 dark:bg-zinc-950 rounded-[2rem] border border-zinc-100 dark:border-zinc-800 space-y-5">
        <button
          type="button"
          onClick={() => speakText(item.prompt)}
          className="rounded-full bg-teal-100 px-6 py-3 font-bold text-teal-800 hover:bg-teal-200 dark:bg-teal-900/50 dark:text-teal-200"
        >
          Play word
        </button>
        <p className="text-zinc-500 dark:text-zinc-400">Type the word you hear.</p>
      </div>

      <label htmlFor="spelling-answer" className="sr-only">
        Your spelling
      </label>
      <input
        id="spelling-answer"
        type="text"
        value={draft}
        onChange={(event) => {
          setDraft(event.target.value);
          if (answer !== null) {
            onAnswer(event.target.value);
          }
        }}
        autoComplete="off"
        className="w-full rounded-2xl border-2 border-zinc-200 bg-white p-4 text-center text-2xl font-bold text-zinc-900 focus:border-teal-500 focus:outline-none dark:border-zinc-700 dark:bg-zinc-800 dark:text-white"
      />

      <div className="flex flex-wrap justify-between gap-3">
        <button
          type="button"
          onClick={onPrevious}
          className="px-4 py-3 font-bold text-zinc-500 hover:text-zinc-900 dark:hover:text-white"
        >
          Back
        </button>
        <div className="flex flex-wrap gap-3">
          {answer === null ? (
            <>
              <button
                type="button"
                onClick={onSkip}
                className="rounded-full border border-zinc-300 px-5 py-3 font-bold text-zinc-600 dark:border-zinc-700 dark:text-zinc-300"
              >
                Skip this question
              </button>
              <button
                type="button"
                disabled={!draft.trim()}
                onClick={() => onAnswer(draft)}
                className="rounded-full bg-teal-700 px-6 py-3 font-bold text-white disabled:cursor-not-allowed disabled:opacity-40"
              >
                Record answer
              </button>
            </>
          ) : (
            <button
              type="button"
              onClick={onAdvance}
              className="rounded-full bg-zinc-900 px-7 py-3 font-bold text-white dark:bg-white dark:text-zinc-900"
            >
              {index === spellingItems.length - 1
                ? "Finish activities"
                : "Next word"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

export function InteractiveAssessmentRunner({ step, setStep, onComplete, onCancel }) {
  const [timerSeconds, setTimerSeconds] = useState(0);
  const [timerRunning, setTimerRunning] = useState(false);
  const [timerStopped, setTimerStopped] = useState(false);
  const [readingInputs, setReadingInputs] = useState({
    correctWords: "",
    omissions: "",
    substitutions: "",
  });
  const [readingError, setReadingError] = useState("");
  const [questionIndex, setQuestionIndex] = useState(0);
  const [responses, setResponses] = useState(initialResponses);
  const [responseTimes, setResponseTimes] = useState(initialResponseTimes);
  const questionStartedAt = useRef(now());

  useEffect(() => {
    if (!timerRunning) {
      return undefined;
    }
    const intervalId = window.setInterval(
      () => setTimerSeconds((seconds) => seconds + 1),
      1000,
    );
    return () => window.clearInterval(intervalId);
  }, [timerRunning]);

  useEffect(() => {
    questionStartedAt.current = now();
  }, [questionIndex, step]);

  const recordResponse = (modality, value) => {
    const elapsedMs = Math.max(0, now() - questionStartedAt.current);
    setResponses((current) => ({
      ...current,
      [modality]: current[modality].map((answer, index) =>
        index === questionIndex ? value : answer,
      ),
    }));
    setResponseTimes((current) => ({
      ...current,
      [modality]: current[modality].map((time, index) =>
        index === questionIndex ? (value.trim() ? elapsedMs : null) : time,
      ),
    }));
  };

  const goToNextQuestion = (items, nextStep) => {
    if (questionIndex < items.length - 1) {
      setQuestionIndex((index) => index + 1);
      return;
    }
    setQuestionIndex(0);
    setStep(nextStep);
  };

  const goToPreviousQuestion = (previousStep) => {
    if (questionIndex > 0) {
      setQuestionIndex((index) => index - 1);
      return;
    }
    setQuestionIndex(0);
    setStep(previousStep);
  };

  const continueReading = () => {
    setReadingError("");
    try {
      const reading = scoreReading({
        correctWords: Number(readingInputs.correctWords),
        elapsedSeconds: timerSeconds,
        omissions: Number(readingInputs.omissions),
        substitutions: Number(readingInputs.substitutions),
      });
      setQuestionIndex(0);
      setStep(1);
      return reading;
    } catch (error) {
      if (error instanceof RangeError) {
        setReadingError(error.message);
        return null;
      }
      throw error;
    }
  };

  const [readingResult, setReadingResult] = useState(null);
  const finishReading = () => {
    const result = continueReading();
    if (result) {
      setReadingResult(result);
    }
  };

  const finishAssessment = () => {
    onComplete({
      reading: readingResult,
      phonology: scoreResponses(
        phonologyItems,
        responses.phonology,
        responseTimes.phonology,
      ),
      visual: scoreResponses(visualItems, responses.visual, responseTimes.visual),
      spelling: scoreResponses(
        spellingItems,
        responses.spelling,
        responseTimes.spelling,
      ),
    });
  };

  const timerLabel = `${Math.floor(timerSeconds / 60)
    .toString()
    .padStart(2, "0")}:${(timerSeconds % 60).toString().padStart(2, "0")}`;

  return (
    <div className="max-w-3xl mx-auto w-full space-y-8 animate-in fade-in duration-300">
      <div className="flex justify-between gap-4">
        <div className="flex flex-1 gap-2 rounded-full border border-zinc-200 bg-white p-2 dark:border-zinc-800 dark:bg-zinc-900">
          {["Reading", "Sound", "Visual", "Spelling"].map((title, index) => (
            <div
              key={title}
              aria-current={step === index ? "step" : undefined}
              className={`flex-1 rounded-full py-2 text-center text-xs font-bold ${
                step === index
                  ? "bg-zinc-900 text-white dark:bg-white dark:text-zinc-900"
                  : step > index
                    ? "bg-brand-50 text-brand-700 dark:bg-brand-900/30 dark:text-brand-300"
                    : "text-zinc-400"
              }`}
            >
              {title}
            </div>
          ))}
        </div>
        <button
          type="button"
          onClick={onCancel}
          className="rounded-full px-4 font-bold text-zinc-500 hover:text-zinc-900 dark:hover:text-white"
        >
          Exit
        </button>
      </div>

      {step === 0 && (
        <section className="bg-white dark:bg-zinc-900 p-8 sm:p-12 rounded-[2.5rem] border border-zinc-100 dark:border-zinc-800 shadow-soft space-y-8">
          <div className="text-center space-y-2">
            <h2 className="text-2xl font-bold text-zinc-900 dark:text-white">
              Reading fluency
            </h2>
            <p className="text-zinc-500 dark:text-zinc-400">
              An observer should time the reading and record words read
              correctly, omissions, and substitutions. No audio is recorded.
            </p>
          </div>

          <div className="rounded-[2rem] border border-zinc-100 bg-zinc-50 p-8 text-xl leading-relaxed text-zinc-800 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-200">
            <p>{readingPassage}</p>
            <p className="mt-4 text-sm font-bold text-zinc-500">
              Passage length: {readingWordCount} words
            </p>
            <button
              type="button"
              onClick={() => speakText("Please read the passage aloud.")}
              className="mt-4 rounded-full border border-zinc-300 px-5 py-2 text-sm font-bold dark:border-zinc-700"
            >
              Play instructions
            </button>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-4">
            {!timerRunning ? (
              <button
                type="button"
                disabled={timerStopped}
                onClick={() => setTimerRunning(true)}
                className="rounded-full bg-emerald-600 px-6 py-3 font-bold text-white disabled:opacity-40"
              >
                Start timer
              </button>
            ) : (
              <button
                type="button"
                onClick={() => {
                  setTimerRunning(false);
                  setTimerStopped(true);
                }}
                className="rounded-full bg-rose-600 px-6 py-3 font-bold text-white"
              >
                Stop timer
              </button>
            )}
            {timerStopped && (
              <button
                type="button"
                onClick={() => {
                  setTimerSeconds(0);
                  setTimerStopped(false);
                  setReadingError("");
                }}
                className="rounded-full border border-zinc-300 px-5 py-3 font-bold dark:border-zinc-700"
              >
                Reset timer
              </button>
            )}
            <output className="rounded-full bg-zinc-100 px-5 py-3 font-mono font-bold dark:bg-zinc-800">
              {timerLabel}
            </output>
          </div>

          <div className="grid gap-4 sm:grid-cols-3">
            {[
              ["correctWords", "Words read correctly", readingWordCount],
              ["omissions", "Omissions observed", readingWordCount],
              ["substitutions", "Substitutions observed", readingWordCount],
            ].map(([field, label, max]) => (
              <label key={field} className="space-y-2 text-sm font-semibold">
                <span className="block text-zinc-700 dark:text-zinc-300">{label}</span>
                <input
                  type="number"
                  min="0"
                  max={max}
                  step="1"
                  inputMode="numeric"
                  value={readingInputs[field]}
                  onChange={(event) =>
                    setReadingInputs((current) => ({
                      ...current,
                      [field]: event.target.value,
                    }))
                  }
                  className="w-full rounded-xl border border-zinc-200 bg-white px-4 py-3 text-zinc-900 dark:border-zinc-700 dark:bg-zinc-950 dark:text-white"
                />
              </label>
            ))}
          </div>

          {readingError && (
            <p role="alert" className="text-sm font-bold text-rose-600">
              {readingError}
            </p>
          )}

          <button
            type="button"
            disabled={!timerStopped || timerSeconds === 0 || !isReadingInputComplete(readingInputs)}
            onClick={finishReading}
            className="w-full rounded-full bg-zinc-900 px-8 py-4 font-bold text-white disabled:cursor-not-allowed disabled:opacity-40 dark:bg-white dark:text-zinc-900"
          >
            Continue to sound blending
          </button>
        </section>
      )}

      {step === 1 && (
        <ChoiceActivity
          title="Auditory phonological awareness"
          instructions="Blend the spoken sounds and select the word you hear."
          items={phonologyItems}
          index={questionIndex}
          answers={responses.phonology}
          onAnswer={(answer) => recordResponse("phonology", answer)}
          onSkip={() => recordResponse("phonology", "")}
          onPrevious={() => goToPreviousQuestion(0)}
          onAdvance={() => goToNextQuestion(phonologyItems, 2)}
          nextLabel={
            questionIndex === phonologyItems.length - 1
              ? "Continue to visual recognition"
              : "Next question"
          }
          playText={`Listen and blend the sounds: ${phonologyItems[questionIndex].prompt}`}
        />
      )}

      {step === 2 && (
        <ChoiceActivity
          title="Visual recognition"
          instructions="Choose the letter or word named in each prompt."
          items={visualItems}
          index={questionIndex}
          answers={responses.visual}
          onAnswer={(answer) => recordResponse("visual", answer)}
          onSkip={() => recordResponse("visual", "")}
          onPrevious={() => goToPreviousQuestion(1)}
          onAdvance={() => goToNextQuestion(visualItems, 3)}
          nextLabel={
            questionIndex === visualItems.length - 1
              ? "Continue to spelling"
              : "Next question"
          }
        />
      )}

      {step === 3 && (
        <SpellingActivity
          index={questionIndex}
          answers={responses.spelling}
          onAnswer={(answer) => recordResponse("spelling", answer)}
          onSkip={() => recordResponse("spelling", "")}
          onPrevious={() => goToPreviousQuestion(2)}
          onAdvance={() => {
            if (questionIndex < spellingItems.length - 1) {
              setQuestionIndex((index) => index + 1);
              return;
            }
            finishAssessment();
          }}
        />
      )}
    </div>
  );
}

const researchModelName = "xgboost";
const researchModelApiUrl = (import.meta.env.VITE_ML_API_URL || "")
  .trim()
  .replace(/\/+$/, "");
const researchModelApiEndpoint = (path) =>
  researchModelApiUrl
    ? `${researchModelApiUrl}${path.replace(/^\/ml-api/, "")}`
    : path;
const taskFeaturePattern = /^(Clicks|Hits|Misses|Score|Accuracy|Missrate)(\d+)$/;

function ModelFeatureInput({ feature, value, onChange }) {
  const inputId = `model-feature-${feature.name}`;
  const label = feature.name.replace(/([a-z])([A-Z])/g, "$1 $2");

  return (
    <label htmlFor={inputId} className="block space-y-2 text-sm font-semibold">
      <span className="block text-zinc-700 dark:text-zinc-300">{label}</span>
      {feature.type === "number" ? (
        <input
          id={inputId}
          type="number"
          step="any"
          value={value ?? ""}
          onChange={(event) => onChange(feature.name, event.target.value)}
          className="w-full rounded-xl border border-zinc-200 bg-white px-3 py-2 text-zinc-900 dark:border-zinc-700 dark:bg-zinc-950 dark:text-white"
        />
      ) : (
        <select
          id={inputId}
          value={value ?? ""}
          onChange={(event) => onChange(feature.name, event.target.value)}
          className="w-full rounded-xl border border-zinc-200 bg-white px-3 py-2 text-zinc-900 dark:border-zinc-700 dark:bg-zinc-950 dark:text-white"
        >
          <option value="">Select…</option>
          {(feature.options ?? []).map((option) => (
            <option key={option} value={option}>
              {option}
            </option>
          ))}
        </select>
      )}
    </label>
  );
}

export function ResearchModelAssessment({ onBack, onComplete }) {
  const [features, setFeatures] = useState([]);
  const [values, setValues] = useState({});
  const [loadError, setLoadError] = useState("");
  const [submitError, setSubmitError] = useState("");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const controller = new AbortController();
    fetch(researchModelApiEndpoint(`/ml-api/schema/tabular/${researchModelName}`), {
      signal: controller.signal,
    })
      .then(async (response) => {
        const body = await response.json();
        if (!response.ok) {
          throw new Error(body.detail ?? "Could not load the model input schema.");
        }
        if (!Array.isArray(body.features) || body.features.length !== 197) {
          throw new Error("The model returned an unexpected input schema.");
        }
        setFeatures(body.features);
      })
      .catch((error) => {
        if (error.name !== "AbortError") {
          setLoadError(error.message);
        }
      })
      .finally(() => {
        if (!controller.signal.aborted) {
          setLoading(false);
        }
      });

    return () => controller.abort();
  }, []);

  const updateValue = (name, value) => {
    setValues((current) => ({ ...current, [name]: value }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setSubmitError("");
    setSubmitting(true);

    try {
      const missingFeature = features.find(
        (feature) => !String(values[feature.name] ?? "").trim(),
      );
      if (missingFeature) {
        const taskNumber = missingFeature.name.match(taskFeaturePattern)?.[2];
        if (taskNumber) {
          document.getElementById(`dyt-task-${taskNumber}`).open = true;
        }
        window.setTimeout(
          () => document.getElementById(`model-feature-${missingFeature.name}`)?.focus(),
          0,
        );
        throw new Error(`Enter a value for ${missingFeature.name}.`);
      }

      const invalidNumeric = features.find(
        (feature) =>
          feature.type === "number" &&
          !Number.isFinite(Number(values[feature.name])),
      );
      if (invalidNumeric) {
        const taskNumber = invalidNumeric.name.match(taskFeaturePattern)?.[2];
        if (taskNumber) {
          document.getElementById(`dyt-task-${taskNumber}`).open = true;
        }
        window.setTimeout(
          () => document.getElementById(`model-feature-${invalidNumeric.name}`)?.focus(),
          0,
        );
        throw new Error(`Enter a valid number for ${invalidNumeric.name}.`);
      }
      const requestFeatures = Object.fromEntries(
        features.map((feature) => [
          feature.name,
          feature.type === "number" ? Number(values[feature.name]) : values[feature.name],
        ]),
      );
      if (
        Object.values(requestFeatures).some(
          (value) => value === "" || (typeof value === "number" && !Number.isFinite(value)),
        )
      ) {
        throw new Error("Enter a valid value for every required model input.");
      }

      const response = await fetch(
        researchModelApiEndpoint(`/ml-api/predict/tabular/${researchModelName}`),
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ features: requestFeatures }),
        },
      );
      const body = await response.json();
      if (!response.ok) {
        throw new Error(body.detail ?? "The research model could not produce an estimate.");
      }
      if (
        !Number.isFinite(body.score) ||
        body.score < 0 ||
        body.score > 1 ||
        !Number.isFinite(body.negative_score) ||
        body.negative_score < 0 ||
        body.negative_score > 1
      ) {
        throw new Error("The research model returned invalid class scores.");
      }

      onComplete({
        ...body,
        generatedAt: new Date().toISOString(),
      });
    } catch (error) {
      setSubmitError(error.message);
    } finally {
      setSubmitting(false);
    }
  };

  const backgroundFeatures = features.filter(
    (feature) => !taskFeaturePattern.test(feature.name),
  );
  const taskNumbers = [
    ...new Set(
      features
        .map((feature) => feature.name.match(taskFeaturePattern)?.[2])
        .filter(Boolean),
    ),
  ];

  return (
    <div className="mx-auto w-full max-w-5xl space-y-7">
      <div>
        <button
          type="button"
          onClick={onBack}
          className="mb-4 font-bold text-brand-700 hover:text-brand-900 dark:text-brand-300"
        >
          Back to activity results
        </button>
        <h1 className="text-3xl font-bold text-zinc-900 dark:text-white">
          Separate Dyt research model
        </h1>
        <p className="mt-2 leading-relaxed text-zinc-600 dark:text-zinc-300">
          This model requires 197 inputs from the original Dyt tasks. These
          fields are not collected by the four activities above, so this
          estimate is separate and is not calculated from those activity scores.
        </p>
      </div>

      <section className="rounded-2xl border border-amber-300 bg-amber-50 p-5 text-sm leading-relaxed text-amber-950 dark:border-amber-900/50 dark:bg-amber-950/30 dark:text-amber-100">
        <h2 className="font-bold">Research-only, not a diagnosis</h2>
        <p className="mt-2">
          The model's held-out test recall was 38% (it missed 67 of 108
          positive-labelled test rows). Its score is not calibrated as a
          clinical probability and must not be interpreted as a person's chance
          of being diagnosed. Do not enter identifying information.
        </p>
      </section>

      {loading && (
        <p role="status" className="text-zinc-600 dark:text-zinc-300">
          Loading the model's required input fields…
        </p>
      )}
      {loadError && (
        <p role="alert" className="rounded-xl bg-rose-50 p-4 text-rose-800 dark:bg-rose-950/40 dark:text-rose-200">
          Could not load the research model: {loadError}
        </p>
      )}

      {!loading && !loadError && (
        <form onSubmit={handleSubmit} className="space-y-5">
          <section className="rounded-[2rem] border border-zinc-100 bg-white p-7 dark:border-zinc-800 dark:bg-zinc-900">
            <h2 className="text-xl font-bold text-zinc-900 dark:text-white">
              Participant and device
            </h2>
            <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {backgroundFeatures.map((feature) => (
                <ModelFeatureInput
                  key={feature.name}
                  feature={feature}
                  value={values[feature.name]}
                  onChange={updateValue}
                />
              ))}
            </div>
          </section>

          <div className="space-y-3">
            {taskNumbers.map((taskNumber) => {
              const taskFeatures = features.filter(
                (feature) => feature.name.match(taskFeaturePattern)?.[2] === taskNumber,
              );
              return (
                <details
                  key={taskNumber}
                  id={`dyt-task-${taskNumber}`}
                  className="rounded-2xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900"
                >
                  <summary className="cursor-pointer font-bold text-zinc-900 dark:text-white">
                    Dyt task {taskNumber} ({taskFeatures.length} required inputs)
                  </summary>
                  <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                    {taskFeatures.map((feature) => (
                      <ModelFeatureInput
                        key={feature.name}
                        feature={feature}
                        value={values[feature.name]}
                        onChange={updateValue}
                      />
                    ))}
                  </div>
                </details>
              );
            })}
          </div>

          {submitError && (
            <p role="alert" className="rounded-xl bg-rose-50 p-4 text-rose-800 dark:bg-rose-950/40 dark:text-rose-200">
              {submitError}
            </p>
          )}
          <button
            type="submit"
            disabled={submitting}
            className="w-full rounded-full bg-zinc-900 px-8 py-4 font-bold text-white disabled:cursor-wait disabled:opacity-60 dark:bg-white dark:text-zinc-900"
          >
            {submitting ? "Calculating research model score…" : "Calculate research model score"}
          </button>
        </form>
      )}
    </div>
  );
}

function AccuracySummary({ title, result, detail }) {
  return (
    <section className="rounded-[2rem] border border-zinc-100 bg-white p-7 shadow-soft dark:border-zinc-800 dark:bg-zinc-900">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-zinc-900 dark:text-white">{title}</h2>
          <p className="mt-2 text-sm text-zinc-500 dark:text-zinc-400">{detail}</p>
        </div>
        <div className="text-right">
          <div className="text-4xl font-black text-zinc-900 dark:text-white">
            {Math.round(result.accuracy * 100)}%
          </div>
          <div className="text-xs font-bold uppercase tracking-wider text-zinc-500">
            Observed accuracy
          </div>
        </div>
      </div>

      {result.items && (
        <ul className="mt-6 space-y-3">
          {result.items.map((item, index) => (
            <li
              key={`${item.prompt}-${index}`}
              className="flex flex-wrap items-center justify-between gap-3 border-t border-zinc-100 pt-3 text-sm dark:border-zinc-800"
            >
              <span className="font-medium text-zinc-700 dark:text-zinc-300">
                {item.prompt}
              </span>
              <span className="text-zinc-500 dark:text-zinc-400">
                Response: {item.response || "Skipped"}
                {item.responseTimeMs === null
                  ? ""
                  : ` · ${item.responseTimeMs.toFixed(0)} ms`}
              </span>
              <span
                className={
                  item.correct
                    ? "font-bold text-emerald-700 dark:text-emerald-400"
                    : "font-bold text-amber-700 dark:text-amber-400"
                }
              >
                {item.correct ? "Correct" : `Expected: ${item.answer}`}
              </span>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

export function ScreeningReportView({
  result,
  onRetest,
  onRunResearchModel,
  researchModelUnavailable = false,
}) {
  const [pdfError, setPdfError] = useState("");

  if (!result) {
    return (
      <div className="space-y-4 text-center">
        <p className="text-zinc-600 dark:text-zinc-300">
          Complete the activities to view their measured results.
        </p>
        <button
          type="button"
          onClick={onRetest}
          className="rounded-full bg-zinc-900 px-6 py-3 font-bold text-white dark:bg-white dark:text-zinc-900"
        >
          Start activities
        </button>
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-5xl space-y-7">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-zinc-900 dark:text-white">
            Activity results
          </h1>
          <p className="mt-2 text-sm text-zinc-500 dark:text-zinc-400">
            {result.participantLabel
              ? `Participant label: ${result.participantLabel} · `
              : ""}
            Completed {new Date(result.completedAt).toLocaleString()}
          </p>
        </div>
        <div className="flex flex-wrap gap-3">
          <button
            type="button"
            onClick={() => {
              setPdfError("");
              downloadAssessmentPdf(result).catch((error) => {
                setPdfError(
                  error instanceof Error
                    ? `Could not create the PDF report: ${error.message}`
                    : "Could not create the PDF report.",
                );
              });
            }}
            className="rounded-full bg-brand-700 px-5 py-3 text-sm font-bold text-white hover:bg-brand-800"
          >
            Download PDF
          </button>
          <button
            type="button"
            onClick={() => {
              const blob = new Blob([JSON.stringify(result, null, 2)], {
                type: "application/json",
              });
              const url = URL.createObjectURL(blob);
              const link = document.createElement("a");
              link.href = url;
              link.download = `dyslexiasense-${result.id}.json`;
              link.click();
              window.setTimeout(() => URL.revokeObjectURL(url), 1000);
            }}
            className="rounded-full border border-zinc-300 px-5 py-3 text-sm font-bold text-zinc-700 dark:border-zinc-700 dark:text-zinc-200"
          >
            Download JSON
          </button>
          <button
            type="button"
            onClick={onRetest}
            className="rounded-full bg-zinc-900 px-6 py-3 text-sm font-bold text-white dark:bg-white dark:text-zinc-900"
          >
            Start new activities
          </button>
        </div>
      </div>

      {pdfError && (
        <p role="alert" className="rounded-xl bg-rose-50 p-4 text-sm text-rose-800 dark:bg-rose-950/40 dark:text-rose-200">
          {pdfError}
        </p>
      )}

      <AccuracySummary
        title="Reading fluency"
        result={result.reading}
        detail={`${result.reading.correctWords} of ${result.reading.totalWords} words recorded correctly · ${result.reading.wordsPerMinute.toFixed(1)} correct words per minute · ${result.reading.elapsedSeconds} seconds · ${result.reading.omissions} omissions · ${result.reading.substitutions} substitutions`}
      />
      <AccuracySummary
        title="Sound blending"
        result={result.phonology}
        detail={`${result.phonology.correctCount} of ${result.phonology.totalCount} correct · ${result.phonology.averageResponseTimeMs === null ? "no answered items" : `average response ${result.phonology.averageResponseTimeMs.toFixed(0)} ms`}`}
      />
      <AccuracySummary
        title="Visual recognition"
        result={result.visual}
        detail={`${result.visual.correctCount} of ${result.visual.totalCount} correct · ${result.visual.averageResponseTimeMs === null ? "no answered items" : `average response ${result.visual.averageResponseTimeMs.toFixed(0)} ms`}`}
      />
      <AccuracySummary
        title="Spelling"
        result={result.spelling}
        detail={`${result.spelling.correctCount} of ${result.spelling.totalCount} exact matches · ${result.spelling.averageResponseTimeMs === null ? "no answered items" : `average response ${result.spelling.averageResponseTimeMs.toFixed(0)} ms`}`}
      />

      <section
        aria-labelledby="dyslexia-chance-heading"
        className="rounded-[2rem] border border-zinc-200 bg-white p-7 shadow-soft dark:border-zinc-800 dark:bg-zinc-900"
      >
        <h2
          id="dyslexia-chance-heading"
          className="text-xl font-bold text-zinc-900 dark:text-white"
        >
          Research model probabilities
        </h2>
        {result.researchModel ? (
          <>
            <p className="mt-2 text-2xl font-black text-zinc-900 dark:text-white">
              Dyslexia label “{result.researchModel.positive_label}”:{" "}
              {Math.round(result.researchModel.score * 100)}% · “
              {result.researchModel.negative_label}”:{" "}
              {100 - Math.round(result.researchModel.score * 100)}%
            </p>
            <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-300">
              Dyt {result.researchModel.model} predicted label:{" "}
              <strong>{result.researchModel.prediction}</strong> · Generated{" "}
              {new Date(result.researchModel.generatedAt).toLocaleString()}
            </p>
            <p className="mt-2 text-sm leading-relaxed text-zinc-600 dark:text-zinc-300">
              These are uncalibrated model scores for the Dyt dataset labels,
              based on a separate 197-field Dyt input form. They are not a
              person's chance of receiving a diagnosis and are unrelated to
              the activity scores above.
            </p>
          </>
        ) : (
          <>
            <p className="mt-2 text-2xl font-black text-zinc-500 dark:text-zinc-400">
              Not estimated
            </p>
            <p className="mt-2 text-sm leading-relaxed text-zinc-600 dark:text-zinc-300">
              {researchModelUnavailable
                ? "Chance of a dyslexia diagnosis: not estimated. Activity scores cannot be converted into a diagnosis probability, and this static site does not host the separate research model."
                : "Chance of a dyslexia diagnosis: not estimated. The activity scores cannot be converted into a diagnosis probability. Run the separate Dyt research model with its 197 required inputs to see its uncalibrated probability for the dataset label."}
            </p>
            {researchModelUnavailable && (
              <p className="mt-3 text-sm text-zinc-600 dark:text-zinc-300">
                The research model API has not been configured for this
                GitHub Pages deployment.
              </p>
            )}
            {onRunResearchModel && (
              <button
                type="button"
                onClick={onRunResearchModel}
                className="mt-4 rounded-full bg-zinc-900 px-6 py-3 font-bold text-white dark:bg-white dark:text-zinc-900"
              >
                Enter Dyt model inputs
              </button>
            )}
          </>
        )}
      </section>

      <div className="rounded-2xl border border-amber-200 bg-amber-50 p-5 text-sm leading-relaxed text-amber-950 dark:border-amber-900/50 dark:bg-amber-950/30 dark:text-amber-100">
        These results summarize responses to these activities only and are not
        a diagnosis. Any separate model estimate uses its own Dyt inputs; it
        is not inferred from these activities. Results remain in this page
        session unless downloaded.
      </div>
    </div>
  );
}

export function ParentGuardianView({
  participantLabel,
  history,
  onLaunchNew,
  onViewResult,
}) {
  return (
    <div className="mx-auto w-full max-w-6xl space-y-8">
      <div className="rounded-[2.5rem] bg-gradient-to-br from-brand-900 to-zinc-900 p-10 text-white">
        <h1 className="text-3xl font-extrabold">Learning support</h1>
        <p className="mt-2 text-brand-200">
          Review activity results completed in this browser session.
        </p>
        {participantLabel && (
          <p className="mt-4 text-sm text-zinc-300">
            Participant label: {participantLabel}
          </p>
        )}
      </div>

      <section className="rounded-[2rem] border border-zinc-100 bg-white p-8 shadow-soft dark:border-zinc-800 dark:bg-zinc-900">
        <h2 className="text-xl font-bold text-zinc-900 dark:text-white">
          Completed activities ({history.length})
        </h2>
        {history.length === 0 ? (
          <p className="mt-4 text-zinc-500 dark:text-zinc-400">
            No completed activities in this page session.
          </p>
        ) : (
          <ul className="mt-4 divide-y divide-zinc-100 dark:divide-zinc-800">
            {history.map((result) => (
              <li
                key={result.id}
                className="flex flex-wrap items-center justify-between gap-4 py-4"
              >
                <div>
                  <p className="font-bold text-zinc-900 dark:text-white">
                    {new Date(result.completedAt).toLocaleString()}
                  </p>
                  <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
                    Reading {Math.round(result.reading.accuracy * 100)}% · Sound{" "}
                    {Math.round(result.phonology.accuracy * 100)}% · Visual{" "}
                    {Math.round(result.visual.accuracy * 100)}% · Spelling{" "}
                    {Math.round(result.spelling.accuracy * 100)}%
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => onViewResult(result)}
                  className="font-bold text-brand-600 hover:text-brand-700 dark:text-brand-400"
                >
                  View results
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>

      <button
        type="button"
        onClick={onLaunchNew}
        className="rounded-full bg-zinc-900 px-6 py-3 font-bold text-white dark:bg-white dark:text-zinc-900"
      >
        Start activities
      </button>
    </div>
  );
}

export function AdminMLOpsDashboard() {
  return (
    <div className="mx-auto w-full max-w-5xl space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-zinc-900 dark:text-white">
          Model and service status
        </h1>
        <p className="mt-2 text-zinc-500 dark:text-zinc-400">
          This page shows integration status, not simulated cache or model
          metrics.
        </p>
      </div>
      <section className="space-y-4 rounded-[2rem] border border-amber-200 bg-amber-50 p-8 text-amber-950 dark:border-amber-900/50 dark:bg-amber-950/30 dark:text-amber-100">
        <h2 className="text-xl font-bold">Research model boundaries</h2>
        <p className="leading-relaxed">
          The separate Dyt XGBoost research model can be run with its 197
          source-dataset inputs. It does not consume the interactive activity
          results, and the handwriting model remains a separate classifier.
          The model score is not a calibrated diagnostic probability.
        </p>
        <p className="leading-relaxed">
          Activity and model results are held in page memory and are not
          persisted to MySQL. Model requests use the FastAPI service through
          the frontend proxy. No live Redis hit counts or request latencies
          are currently exposed here.
        </p>
      </section>
      <p className="text-sm text-zinc-500 dark:text-zinc-400">
        Training and evaluation artifacts are available under
        <code className="mx-1 rounded bg-zinc-100 px-2 py-1 dark:bg-zinc-800">
          ml/evaluation/reports
        </code>
        and should be interpreted with their documented dataset and validation
        limitations.
      </p>
    </div>
  );
}
