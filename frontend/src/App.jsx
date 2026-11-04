import { useEffect, useState } from 'react';
import {
  AdminMLOpsDashboard,
  InteractiveAssessmentRunner,
  ParentGuardianView,
  ResearchModelAssessment,
  ScreeningReportView,
} from './AssessmentViews.jsx';

const staticPagesDeployment = import.meta.env.VITE_STATIC_PAGES === "true";
const researchModelApiConfigured = Boolean(
  (import.meta.env.VITE_ML_API_URL || "").trim(),
);
const researchModelUnavailable =
  staticPagesDeployment && !researchModelApiConfigured;

    // --- MAIN REACT APPLICATION COMPONENT ---
    function App() {
      const [participantLabel, setParticipantLabel] = useState("");

      // Accessibility Tool States
      const [dyslexicFont, setDyslexicFont] = useState(false);
      const [highContrast, setHighContrast] = useState(false);
      const [readingRulerActive, setReadingRulerActive] = useState(false);

      const [assessmentStep, setAssessmentStep] = useState(0);
      const [assessmentRun, setAssessmentRun] = useState(0);
      const [assessmentResult, setAssessmentResult] = useState(null);
      const [assessmentHistory, setAssessmentHistory] = useState([]);
      const [currentView, setCurrentView] = useState("home");

      // Setup Reading Ruler Tracking
      useEffect(() => {
        const handleMouseMove = (e) => {
          const ruler = document.getElementById("readingRuler");
          if (ruler) {
            ruler.style.top = `${e.clientY}px`;
          }
        };
        window.addEventListener("mousemove", handleMouseMove);
        return () => window.removeEventListener("mousemove", handleMouseMove);
      }, []);

      // Toggle Dyslexic Font On Body
      useEffect(() => {
        if (dyslexicFont) {
          document.body.classList.add("dyslexia-font");
        } else {
          document.body.classList.remove("dyslexia-font");
        }
      }, [dyslexicFont]);

      const startAssessment = () => {
        setAssessmentStep(0);
        setAssessmentRun((run) => run + 1);
        setCurrentView("assessment");
      };

      const completeAssessment = (observations) => {
        const result = {
          ...observations,
          id: globalThis.crypto?.randomUUID?.() ?? `assessment-${Date.now()}`,
          completedAt: new Date().toISOString(),
          participantLabel: participantLabel.trim(),
        };
        setAssessmentResult(result);
        setAssessmentHistory((history) => [result, ...history]);
        setCurrentView("results");
      };

      const completeResearchModel = (researchModel) => {
        if (!assessmentResult) {
          return;
        }
        const updated = { ...assessmentResult, researchModel };
        setAssessmentResult(updated);
        setAssessmentHistory((history) =>
          history.map((entry) => (entry.id === updated.id ? updated : entry)),
        );
        setCurrentView("results");
      };

      const navItems = [
        { id: "home", label: "Overview" },
        { id: "portal", label: "Assessment" },
        { id: "parent", label: "Guardian" },
        { id: "admin", label: "ML Ops" },
        { id: "arch", label: "Blueprint" }
      ];

      return (
        <div className={`min-h-screen transition-colors duration-300 ${highContrast ? 'dark bg-zinc-950 text-white' : 'bg-[#FAFAFA] text-zinc-900'}`}>

          {/* MODERN FLOATING NAVBAR */}
          <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 w-[95%] max-w-7xl">
            <header className="rounded-full border backdrop-blur-xl transition-all duration-300 shadow-soft bg-white/80 border-white/40 dark:bg-zinc-900/90 dark:border-zinc-700/80">
              <div className="px-5 sm:px-8 h-16 flex items-center justify-between">

                {/* Logo */}
                <div
                  className="flex items-center space-x-3 cursor-pointer group"
                  onClick={() => setCurrentView("home")}
                >
                  <div className="w-10 h-10 rounded-full bg-zinc-900 dark:bg-zinc-100 flex items-center justify-center text-white dark:text-zinc-900 group-hover:scale-105 transition-transform duration-300 shadow-md">
                    <span className="font-bold text-lg tracking-tight">D</span>
                    <span className="text-[10px] font-semibold text-brand-300 dark:text-brand-600 ml-0.5">AI</span>
                  </div>
                  <div className="hidden sm:block">
                    <div className="flex items-center space-x-2">
                      <span className="font-bold text-lg tracking-tight dark:text-white">DyslexiaSense</span>
                    </div>
                  </div>
                </div>

                {/* Nav Links */}
                <nav className="hidden md:flex items-center space-x-1 bg-zinc-100/50 dark:bg-zinc-800/50 p-1 rounded-full border border-zinc-200/50 dark:border-zinc-700/50">
                  {navItems.map(item => (
                    <button
                      key={item.id}
                      onClick={() => setCurrentView(item.id)}
                      className={`px-4 py-1.5 rounded-full text-sm font-semibold transition-all duration-300 ${
                        currentView === item.id
                          ? "bg-white text-zinc-900 shadow-sm dark:bg-zinc-700 dark:text-white"
                          : "text-zinc-500 hover:text-zinc-900 hover:bg-zinc-200/50 dark:text-zinc-400 dark:hover:text-white dark:hover:bg-zinc-700/50"
                      }`}
                    >
                      {item.label}
                    </button>
                  ))}
                </nav>

                {/* Actions & Accessibility */}
                <div className="flex items-center space-x-2 sm:space-x-3">
                  <div className="flex items-center space-x-1 bg-zinc-100/50 dark:bg-zinc-800/50 p-1 rounded-full border border-zinc-200/50 dark:border-zinc-700/50">
                    <button
                      onClick={() => setDyslexicFont(!dyslexicFont)}
                      title="Dyslexia-Friendly Font"
                      className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-serif font-bold transition-all ${dyslexicFont ? 'bg-brand-100 text-brand-700 dark:bg-brand-900/50 dark:text-brand-300 shadow-sm' : 'text-zinc-500 hover:bg-zinc-200/50 dark:text-zinc-400 dark:hover:bg-zinc-700/50'}`}
                    >
                      Aa
                    </button>
                    <button
                      onClick={() => {
                        const next = !readingRulerActive;
                        setReadingRulerActive(next);
                        const el = document.getElementById("readingRuler");
                        if (el) el.classList.toggle("active", next);
                      }}
                      title="Reading Ruler"
                      className={`w-8 h-8 rounded-full flex items-center justify-center transition-all ${readingRulerActive ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/50 dark:text-amber-300 shadow-sm' : 'text-zinc-500 hover:bg-zinc-200/50 dark:text-zinc-400 dark:hover:bg-zinc-700/50'}`}
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M4 6h16M4 12h16M4 18h7" /></svg>
                    </button>
                    <button
                      onClick={() => setHighContrast(!highContrast)}
                      title="High Contrast (Night Mode)"
                      className={`w-8 h-8 rounded-full flex items-center justify-center transition-all ${highContrast ? 'bg-zinc-800 text-white dark:bg-zinc-200 dark:text-zinc-900 shadow-sm' : 'text-zinc-500 hover:bg-zinc-200/50 dark:text-zinc-400 dark:hover:bg-zinc-700/50'}`}
                    >
                      {highContrast ? (
                         <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" /></svg>
                      ) : (
                         <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" /></svg>
                      )}
                    </button>
                  </div>

                  <button
                    onClick={startAssessment}
                    className="bg-zinc-900 dark:bg-white hover:bg-brand-600 dark:hover:bg-brand-400 text-white dark:text-zinc-900 px-5 py-2 rounded-full text-sm font-bold shadow-md hover:shadow-glow hover:-translate-y-0.5 transition-all duration-300 flex items-center gap-2"
                  >
                    <span className="hidden sm:inline">Start activities</span>
                    <span className="sm:hidden">Start</span>
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M9 5l7 7-7 7" />
                    </svg>
                  </button>
                </div>

              </div>
            </header>
          </div>

          {/* MAIN APPLICATION CONTAINER ROUTE DISPATCH (pt-28 to clear floating nav) */}
          <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-32 pb-16 min-h-screen flex flex-col">

            {currentView === "home" && (
              <HomeLandingView
                onStartTest={startAssessment}
                onGoArch={() => setCurrentView("arch")}
                participantLabel={participantLabel}
                researchModelUnavailable={researchModelUnavailable}
              />
            )}

            {currentView === "portal" && (
              <AssessmentPortalView
                participantLabel={participantLabel}
                setParticipantLabel={setParticipantLabel}
                onBeginAssessment={startAssessment}
                history={assessmentHistory}
                onViewResult={(result) => {
                  setAssessmentResult(result);
                  setCurrentView("results");
                }}
              />
            )}

            {currentView === "assessment" && (
              <InteractiveAssessmentRunner
                key={assessmentRun}
                step={assessmentStep}
                setStep={setAssessmentStep}
                onComplete={completeAssessment}
                onCancel={() => setCurrentView("portal")}
              />
            )}

            {currentView === "results" && (
              <ScreeningReportView
                result={assessmentResult}
                onRetest={startAssessment}
                onRunResearchModel={
                  researchModelUnavailable
                    ? null
                    : () => setCurrentView("model-assessment")
                }
                researchModelUnavailable={researchModelUnavailable}
              />
            )}
            {currentView === "model-assessment" && !researchModelUnavailable && (
              <ResearchModelAssessment
                onBack={() => setCurrentView("results")}
                onComplete={completeResearchModel}
              />
            )}

            {currentView === "parent" && (
              <ParentGuardianView
                participantLabel={participantLabel}
                history={assessmentHistory}
                onLaunchNew={startAssessment}
                onViewResult={(result) => {
                  setAssessmentResult(result);
                  setCurrentView("results");
                }}
              />
            )}

            {currentView === "admin" && (
              <AdminMLOpsDashboard />
            )}

            {currentView === "arch" && (
              <FullStackArchitectureBlueprint />
            )}

          </main>

          {/* ACCESSIBILITY & RESULTS LIMITATIONS FOOTER */}
          <footer className="mt-auto border-t py-10 text-sm border-zinc-200 text-zinc-500 bg-white dark:border-zinc-800 dark:text-zinc-400 dark:bg-zinc-950 transition-colors">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6">
              <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                <div className="flex flex-col space-y-1">
                  <span className="font-bold text-zinc-900 dark:text-white">DyslexiaSense AI Platform</span>
                  <span>Educational assessment prototype · English activities</span>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <span className="px-3 py-1 rounded-full text-xs font-bold bg-zinc-100 text-zinc-700 border border-zinc-200 dark:bg-zinc-800 dark:text-zinc-300 dark:border-zinc-700">React 18</span>
                  <span className="px-3 py-1 rounded-full text-xs font-bold bg-zinc-100 text-zinc-700 border border-zinc-200 dark:bg-zinc-800 dark:text-zinc-300 dark:border-zinc-700">Spring Boot 3.4</span>
                  <span className="px-3 py-1 rounded-full text-xs font-bold bg-zinc-100 text-zinc-700 border border-zinc-200 dark:bg-zinc-800 dark:text-zinc-300 dark:border-zinc-700">Redis</span>
                  <span className="px-3 py-1 rounded-full text-xs font-bold bg-brand-50 text-brand-700 border border-brand-200 dark:bg-brand-900/30 dark:text-brand-300 dark:border-brand-700/50">FastAPI + Scikit</span>
                </div>
              </div>
              <div className="p-4 bg-zinc-50 dark:bg-zinc-900/50 rounded-2xl border border-zinc-200 dark:border-zinc-800 text-zinc-600 dark:text-zinc-400 leading-relaxed text-xs">
                <strong>Important limitation:</strong>{" "}
                {researchModelUnavailable
                  ? "Activity results are observations, not validated diagnostic measures. The static GitHub Pages site is not configured to call the separate research model. Neither replaces assessment by a qualified professional."
                  : staticPagesDeployment
                    ? "Activity results are observations, not validated diagnostic measures. The separate Dyt model provides uncalibrated dataset-label scores from its own inputs, not a person's chance of diagnosis. Neither replaces assessment by a qualified professional."
                  : "Activity results are observations, not validated diagnostic measures. The separate Dyt model returns an uncalibrated research score for its dataset label, not a person's chance of diagnosis. Neither replaces assessment by a qualified professional."}
              </div>
            </div>
          </footer>

        </div>
      );
    }

    // =========================================================================
    // COMPONENT 1: HOME / LANDING VIEW
    // =========================================================================
    function HomeLandingView({
      onStartTest,
      onGoArch,
      participantLabel,
      researchModelUnavailable,
    }) {
      return (
        <div className="space-y-16 animate-in fade-in duration-500">

          {/* Hyper-Modern Hero Section */}
          <div className="relative rounded-[2.5rem] overflow-hidden bg-zinc-950 text-white p-8 sm:p-16 shadow-2xl">
            {/* Ambient glowing orbs */}
            <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-brand-600/30 blur-[100px] rounded-full pointer-events-none translate-x-1/3 -translate-y-1/3"></div>
            <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-teal-600/20 blur-[80px] rounded-full pointer-events-none -translate-x-1/4 translate-y-1/4"></div>

            <div className="relative z-10 max-w-3xl space-y-8">
              <div className="inline-flex items-center space-x-2 bg-white/10 backdrop-blur-md border border-white/10 px-4 py-1.5 rounded-full text-xs font-bold tracking-wide text-zinc-200">
                <span className="relative flex h-2.5 w-2.5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-brand-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-brand-500"></span>
                </span>
                <span>Four measured learning activities</span>
              </div>

              <h1 className="text-4xl sm:text-6xl font-extrabold tracking-tighter leading-[1.1]">
                Explore reading and language skills through <span className="text-transparent bg-clip-text bg-gradient-to-r from-brand-300 via-fuchsia-300 to-teal-300">measured activities.</span>
              </h1>

              <p className="text-zinc-400 text-lg sm:text-xl leading-relaxed max-w-2xl font-medium">
                {researchModelUnavailable
                  ? "Complete short reading, sound-blending, visual recognition, and spelling activities. Reports show observed task results. The separate experimental Dyt model requires an API that is not available on this static site."
                  : "Complete short reading, sound-blending, visual recognition, and spelling activities. Reports show observed task results. A separate experimental Dyt model score is available with its own 197 inputs; it is not calculated from these activities or a diagnostic probability."}
              </p>

              <div className="flex flex-wrap items-center gap-4 pt-4">
                <button
                  onClick={onStartTest}
                  className="bg-white text-zinc-950 hover:scale-105 hover:bg-zinc-100 font-bold px-8 py-4 rounded-full shadow-[0_0_40px_rgba(255,255,255,0.2)] transition-all duration-300 flex items-center gap-3 text-base"
                >
                  <span>Start four activities</span>
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M14 5l7 7m0 0l-7 7m7-7H3" />
                  </svg>
                </button>

                <button
                  onClick={onGoArch}
                  className="bg-white/5 hover:bg-white/10 backdrop-blur text-white border border-white/10 font-bold px-8 py-4 rounded-full transition-all duration-300 text-base"
                >
                  System Architecture
                </button>
              </div>

              <div className="pt-6 mt-6 border-t border-white/10 flex items-center gap-3 text-sm text-zinc-400 font-medium">
                <span>Participant label:</span>
                <span className="text-white bg-white/10 px-3 py-1 rounded-full border border-white/5">
                  {participantLabel || "Not provided"}
                </span>
              </div>
            </div>
          </div>

          {/* 4 Pillars of Multimedia Assessment */}
          <div className="space-y-8">
            <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
              <div className="space-y-2">
                <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-zinc-900 dark:text-white">Four educational activities</h2>
                <p className="text-zinc-500 dark:text-zinc-400 font-medium">Each task is scored from the answers and timing collected during this session.</p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {[
                { step: 1, color: "brand", title: "Reading", desc: "An observer records correctly read words, omissions, substitutions, and elapsed reading time.", metric: "Accuracy · words per minute" },
                { step: 2, color: "fuchsia", title: "Sound blending", desc: "Answer five phoneme-blending questions. Instructions can be played aloud.", metric: "Correct answers · response time" },
                { step: 3, color: "amber", title: "Visual recognition", desc: "Answer five letter and word recognition questions.", metric: "Correct answers · response time" },
                { step: 4, color: "teal", title: "Spelling", desc: "Type five words spoken by the instruction audio.", metric: "Exact matches · response time" }
              ].map((card, i) => (
                <div key={i} className="group bg-white dark:bg-zinc-900 p-8 rounded-[2rem] border border-zinc-100 dark:border-zinc-800 shadow-soft hover:-translate-y-1 hover:shadow-lg transition-all duration-300">
                  <div className="w-12 h-12 rounded-full bg-zinc-100 dark:bg-zinc-800 text-zinc-900 dark:text-white flex items-center justify-center font-extrabold text-lg mb-6 group-hover:bg-zinc-900 dark:group-hover:bg-zinc-100 group-hover:text-white dark:group-hover:text-zinc-900 transition-colors">
                    {card.step}
                  </div>
                  <h3 className="font-bold text-zinc-900 dark:text-white text-lg mb-3">{card.title}</h3>
                  <p className="text-sm text-zinc-500 dark:text-zinc-400 mb-6 leading-relaxed font-medium">
                    {card.desc}
                  </p>
                  <div className="text-[11px] font-mono font-bold bg-zinc-50 dark:bg-zinc-800 p-2.5 rounded-xl border border-zinc-100 dark:border-zinc-700 text-zinc-500 dark:text-zinc-400">
                    {card.metric}
                  </div>
                </div>
              ))}
            </div>
          </div>

        </div>
      );
    }

    // =========================================================================
    // COMPONENT 2: ASSESSMENT PORTAL VIEW
    // =========================================================================
    function AssessmentPortalView({
      participantLabel,
      setParticipantLabel,
      onBeginAssessment,
      history,
      onViewResult,
    }) {
      return (
        <div className="space-y-8 animate-in fade-in duration-500 max-w-6xl mx-auto w-full">

          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-6">
            <div>
              <h1 className="text-3xl font-bold tracking-tight text-zinc-900 dark:text-white">Assessment Center</h1>
              <p className="text-zinc-500 dark:text-zinc-400 font-medium mt-2">Start the activities or review results completed in this browser session.</p>
            </div>
            <button
              onClick={onBeginAssessment}
              className="bg-brand-600 hover:bg-brand-700 text-white font-bold px-6 py-3 rounded-full shadow-lg shadow-brand-500/25 transition-all flex items-center gap-2"
            >
              <span>Start activities</span>
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M9 5l7 7-7 7" />
              </svg>
            </button>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

            <div className="bg-white dark:bg-zinc-900 p-8 rounded-[2rem] border border-zinc-100 dark:border-zinc-800 shadow-soft space-y-6 h-fit">
              <h3 className="font-bold text-zinc-900 dark:text-white text-lg border-b border-zinc-100 dark:border-zinc-800 pb-4">
                Optional participant label
              </h3>
              <label htmlFor="participant-label" className="block text-sm text-zinc-600 dark:text-zinc-400">
                Do not enter sensitive personal information. This label is kept only in the current page session.
              </label>
              <input
                id="participant-label"
                type="text"
                maxLength={60}
                value={participantLabel}
                onChange={(event) => setParticipantLabel(event.target.value)}
                placeholder="Optional"
                autoComplete="off"
                className="w-full bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-700 focus:border-brand-500 rounded-xl px-4 py-3 text-zinc-900 dark:text-white outline-none"
              />
              <p className="text-xs text-zinc-500 dark:text-zinc-400">
                Activities are in English. Their results are kept in this page session. A separate Dyt model form sends its 197 inputs to FastAPI; neither type of result is saved to MySQL.
              </p>
            </div>

            <div className="lg:col-span-2 bg-white dark:bg-zinc-900 p-8 rounded-[2rem] border border-zinc-100 dark:border-zinc-800 shadow-soft space-y-6">
              <div className="flex justify-between items-center border-b border-zinc-100 dark:border-zinc-800 pb-4">
                <h3 className="font-bold text-zinc-900 dark:text-white text-lg">Completed Sessions</h3>
                <span className="text-xs font-bold text-zinc-400 dark:text-zinc-500 bg-zinc-100 dark:bg-zinc-800 px-3 py-1 rounded-full uppercase tracking-wider">This page session</span>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm whitespace-nowrap">
                  <thead>
                    <tr className="text-zinc-400 dark:text-zinc-500 font-bold text-xs uppercase tracking-wider">
                      <th className="py-3 px-4">Date</th>
                      <th className="py-3 px-4">Reading</th>
                      <th className="py-3 px-4">Sound</th>
                      <th className="py-3 px-4">Visual</th>
                      <th className="py-3 px-4">Spelling</th>
                      <th className="py-3 px-4">Report</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-50 dark:divide-zinc-800/50">
                    {history.length === 0 ? (
                      <tr>
                        <td colSpan="6" className="py-8 px-4 text-center text-zinc-500 dark:text-zinc-400">
                          No activities have been completed in this page session.
                        </td>
                      </tr>
                    ) : history.map((result) => (
                      <tr key={result.id} className="hover:bg-zinc-50/50 dark:hover:bg-zinc-800/50">
                        <td className="py-4 px-4 text-zinc-500 dark:text-zinc-400">
                          {new Date(result.completedAt).toLocaleString()}
                        </td>
                        <td className="py-4 px-4">{Math.round(result.reading.accuracy * 100)}%</td>
                        <td className="py-4 px-4">{Math.round(result.phonology.accuracy * 100)}%</td>
                        <td className="py-4 px-4">{Math.round(result.visual.accuracy * 100)}%</td>
                        <td className="py-4 px-4">{Math.round(result.spelling.accuracy * 100)}%</td>
                        <td className="py-4 px-4">
                          <button
                            type="button"
                            onClick={() => onViewResult(result)}
                            className="font-bold text-brand-600 hover:text-brand-700 dark:text-brand-400"
                          >
                            View results
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      );
    }

    // =========================================================================
    // COMPONENT 7: FULL STACK ARCHITECTURE BLUEPRINT
    // =========================================================================
    function FullStackArchitectureBlueprint() {
      return (
        <div className="space-y-8 animate-in fade-in max-w-6xl mx-auto w-full">
          <div className="bg-white p-8 sm:p-12 rounded-[2.5rem] border border-zinc-100 shadow-soft text-center space-y-4">
            <h1 className="text-3xl font-extrabold tracking-tight text-zinc-900">System Architecture Blueprint</h1>
            <p className="text-zinc-500 font-medium max-w-2xl mx-auto">
              The project includes React, Spring Boot, MySQL, Redis, and FastAPI services. The current assessment flow reports observed activity results and does not send them to the separately trained classifiers.
            </p>
          </div>

          <div className="bg-zinc-950 p-8 sm:p-12 rounded-[2.5rem] shadow-xl">
             <div className="grid grid-cols-1 md:grid-cols-4 gap-6 text-sm">
              {[
                { title: "1. Frontend (React)", text: "Collects reading observations and answers to sound, visual, and spelling questions. Displays separate measured scores.", color: "border-brand-500/30 text-brand-300" },
                { title: "2. Backend (Spring Boot)", text: "Provides JWT-protected APIs and connects to MySQL, Redis, and FastAPI. The current activity results are not sent to these APIs.", color: "border-emerald-500/30 text-emerald-300" },
                { title: "3. ML service (FastAPI)", text: "Serves the separate Dyt research classifier via a frontend proxy. The tabular model expects 197 Dyt inputs; it does not use this activity flow.", color: "border-fuchsia-500/30 text-fuchsia-300" },
                { title: "4. Storage (MySQL / Redis)", text: "Infrastructure is configured. Activity results stay in page memory and are not persisted to these services.", color: "border-amber-500/30 text-amber-300" }
              ].map((node, i) => (
                <div key={i} className={`p-6 bg-zinc-900 rounded-[1.5rem] border ${node.color}`}>
                  <div className="font-bold mb-3">{node.title}</div>
                  <div className="text-zinc-400 text-xs leading-relaxed font-mono">{node.text}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      );
    }

export default App;
