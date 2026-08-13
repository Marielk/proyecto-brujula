"use client";

import type { FormEvent } from "react";
import { useEffect, useMemo, useRef, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { calculateGardenState, defaultCheckIn, gardenMoodLine, recommendRitual } from "../../../lib/garden";
import type { DailyCheckIn, LifeProfile, RitualOutcome, SimulationResult } from "../../../lib/types";
import {
  EXAMPLE,
  createSimulationId,
  emptyProfile,
  simulationIdFromPath,
  type JourneyFlowState,
  type Mode,
  type StoredJourneyResult
} from "../model";
import { validateProfile } from "../profile-utils";
import { useJourneyStorage } from "./useJourneyStorage";
import { useSimulation } from "./useSimulation";

export function useJourney() {
  const router = useRouter();
  const pathname = usePathname();
  const storage = useJourneyStorage();
  const simulation = useSimulation();
  const [profile, setProfile] = useState<LifeProfile>(emptyProfile);
  const [hasProfile, setHasProfile] = useState(false);
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [step, setStep] = useState(0);
  const [text, setText] = useState(EXAMPLE);
  const [model, setModel] = useState("llama3.2:1b");
  const [result, setResult] = useState<SimulationResult | null>(null);
  const [error, setError] = useState("");
  const [journeyFlow, setJourneyFlow] = useState<JourneyFlowState>({ status: "input", goal: EXAMPLE });
  const [profileMessage, setProfileMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [mode, setMode] = useState<Mode>("home");
  const [checkIn, setCheckIn] = useState<DailyCheckIn>(defaultCheckIn);
  const [ritualOutcome, setRitualOutcome] = useState<RitualOutcome | null>(null);
  const activeSimulationRef = useRef("");
  const simulationAbortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    const savedProfile = storage.readLifeProfile();
    if (savedProfile) {
      setProfile(savedProfile);
      setHasProfile(true);
    }
    setCheckIn(storage.readDailyCheckIn());
    setRitualOutcome(storage.readRitualOutcome());
  }, [storage]);

  useEffect(() => {
    const isJourneyRoute = pathname?.startsWith("/viaje");
    if (!isJourneyRoute) return;

    setMode("journey");
    if (pathname === "/viaje" || pathname === "/viaje/") {
      setJourneyFlow((current) => (current.status === "loading" ? current : { status: "input", goal: current.goal }));
      return;
    }
    if (pathname === "/viaje/explorando") {
      const activeSimulationId = storage.readActiveJourneyId();
      if (activeSimulationId) {
        activeSimulationRef.current = activeSimulationId;
        void pollJourneyStatus(activeSimulationId).catch(() => {
          setJourneyFlow((current) =>
            current.status === "loading"
              ? current
              : {
                  status: "error",
                  goal: current.goal,
                  simulationId: activeSimulationId,
                  message: "No hay una simulacion activa en este navegador.",
                  recoverable: true
                }
          );
        });
        return;
      }
      setJourneyFlow((current) =>
        current.status === "loading"
          ? current
          : {
              status: "error",
              goal: current.goal,
              message: "No hay una simulacion activa en este navegador.",
              recoverable: true
            }
      );
      return;
    }

    const simulationId = simulationIdFromPath(pathname);
    if (!simulationId) return;

    const saved = storage.readStoredJourneyResults().items[simulationId];
    if (saved) {
      setJourneyFlow(saved);
      setText(saved.goal);
      setResult(saved.result);
      return;
    }
    setJourneyFlow({
      status: "error",
      goal: text,
      simulationId,
      message: "No encontre este resultado guardado en este navegador.",
      recoverable: true
    });
  }, [pathname, storage, text]);

  async function pollJourneyStatus(simulationId: string) {
    const job = await simulation.readStatus(simulationId);
    if (activeSimulationRef.current !== simulationId) return;

    if (job.status === "loading") {
      setJourneyFlow((current) => {
        if (current.status !== "loading" || current.simulationId !== simulationId) {
          return {
            status: "loading",
            goal: job.goal,
            simulationId,
            stage: job.stage,
            progress: job.progress,
            message: job.message,
            startedAt: Date.parse(job.createdAt) || Date.now()
          };
        }
        return { ...current, stage: job.stage, progress: Math.max(current.progress, job.progress), message: job.message };
      });
      return;
    }

    if (job.status === "result" && job.result) {
      const completedFlow: StoredJourneyResult = {
        status: "result",
        goal: job.goal,
        simulationId,
        result: job.result,
        completedAt: job.completedAt || new Date().toISOString()
      };
      setResult(job.result);
      setJourneyFlow(completedFlow);
      storage.writeStoredJourneyResult(completedFlow);
      storage.removeActiveJourneyId();
      setIsLoading(false);
      router.push(`/viaje/resultado/${encodeURIComponent(simulationId)}`);
      return;
    }

    if (job.status === "cancelled") {
      setIsLoading(false);
      storage.removeActiveJourneyId();
      setJourneyFlow({ status: "input", goal: job.goal });
      router.push("/viaje");
      return;
    }

    storage.removeActiveJourneyId();
    throw new Error(job.error || job.message || "No se pudo completar la simulacion.");
  }

  useEffect(() => {
    if (journeyFlow.status !== "loading") return;
    const interval = window.setInterval(() => {
      void pollJourneyStatus(journeyFlow.simulationId).catch((err) => {
        if (activeSimulationRef.current !== journeyFlow.simulationId) return;
        const message = err instanceof Error ? err.message : "No se pudo consultar el avance de la simulacion.";
        setError(message);
        setIsLoading(false);
        storage.removeActiveJourneyId();
        setJourneyFlow({ status: "error", goal: journeyFlow.goal, simulationId: journeyFlow.simulationId, message, recoverable: true });
      });
    }, 1200);

    return () => window.clearInterval(interval);
  }, [journeyFlow]);

  const validation = useMemo(() => validateProfile(profile), [profile]);
  const canFinish = validation.length === 0;
  const showProfileForm = isEditingProfile || !hasProfile;
  const indicators = useMemo(() => calculateGardenState(profile, checkIn), [profile, checkIn]);
  const ritual = useMemo(() => recommendRitual(profile, checkIn), [profile, checkIn]);
  const moodLine = useMemo(() => gardenMoodLine(indicators), [indicators]);

  function saveProfile(nextProfile = profile) {
    storage.writeLifeProfile(nextProfile);
    setHasProfile(true);
    setIsEditingProfile(false);
    setProfileMessage("Perfil guardado en este navegador.");
  }

  function deleteProfile() {
    storage.removeLifeProfile();
    setProfile(emptyProfile);
    setHasProfile(false);
    setIsEditingProfile(true);
    setStep(0);
    setResult(null);
    setJourneyFlow({ status: "input", goal: text });
    setMode("home");
    router.push("/");
  }

  function updateProfile(section: keyof LifeProfile, key: string, value: unknown) {
    setProfile((current) => ({ ...current, [section]: { ...current[section], [key]: value } }));
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    await runJourney(text);
  }

  async function runJourney(nextGoal: string) {
    const goal = nextGoal.trim();
    if (!goal) {
      const message = "Escribe un destino para trazar la ruta.";
      setError(message);
      setJourneyFlow({ status: "error", goal: nextGoal, message, recoverable: true });
      return;
    }

    simulationAbortRef.current?.abort();
    const simulationId = createSimulationId();
    const abortController = new AbortController();
    activeSimulationRef.current = simulationId;
    simulationAbortRef.current = abortController;
    storage.writeActiveJourneyId(simulationId);
    setIsLoading(true);
    setError("");
    setResult(null);
    storage.removeStoredJourneyResult(simulationId);
    setJourneyFlow({
      status: "loading",
      goal,
      simulationId,
      stage: "understanding_goal",
      progress: 4,
      message: "Leyendo el destino y preparando la simulacion.",
      startedAt: Date.now()
    });
    router.push("/viaje/explorando");

    try {
      await simulation.start({ simulationId, text: goal, model, lifeProfile: profile, signal: abortController.signal });
      await pollJourneyStatus(simulationId);
    } catch (err) {
      if (activeSimulationRef.current !== simulationId || abortController.signal.aborted) return;
      const message = err instanceof Error ? err.message : "Error desconocido.";
      setError(message);
      setIsLoading(false);
      storage.removeActiveJourneyId();
      setJourneyFlow({ status: "error", goal, simulationId, message, recoverable: true });
    }
  }

  async function retryJourney() {
    const goal = journeyFlow.goal;
    setText(goal);
    await runJourney(goal);
  }

  function cancelJourney() {
    simulationAbortRef.current?.abort();
    if (activeSimulationRef.current) {
      void simulation.cancel(activeSimulationRef.current);
    }
    activeSimulationRef.current = "";
    storage.removeActiveJourneyId();
    setIsLoading(false);
    storage.removeActiveJourneyId();
    setResult(null);
    setError("");
    setJourneyFlow((current) => ({ status: "input", goal: current.goal }));
    router.push("/viaje");
  }

  function editJourneyGoal() {
    setIsLoading(false);
    setResult(null);
    setError("");
    if (journeyFlow.status === "result") {
      storage.removeStoredJourneyResult(journeyFlow.simulationId);
    }
    setJourneyFlow((current) => {
      setText(current.goal);
      return { status: "input", goal: current.goal };
    });
    router.push("/viaje");
  }

  function newJourney() {
    simulationAbortRef.current?.abort();
    activeSimulationRef.current = "";
    storage.removeActiveJourneyId();
    setText("");
    setResult(null);
    setError("");
    setIsLoading(false);
    storage.removeStoredJourneyResult();
    setJourneyFlow({ status: "input", goal: "" });
    router.push("/viaje");
  }

  function updateCheckIn(update: Partial<DailyCheckIn>) {
    setCheckIn((current) => {
      const next = { ...current, ...update, createdAt: new Date().toISOString() };
      storage.writeDailyCheckIn(next);
      return next;
    });
  }

  function recordOutcome(completed: boolean, feelingAfter = 70) {
    const next = {
      ritualId: ritual.ritual.id,
      completed,
      feelingAfter,
      note: completed ? "Ritual registrado desde Mi Jardin." : "Ritual guardado para intentar despues.",
      createdAt: new Date().toISOString()
    };
    setRitualOutcome(next);
    storage.writeRitualOutcome(next);
  }

  function navigateMode(nextMode: Mode) {
    setMode(nextMode);
    router.push(nextMode === "journey" ? "/viaje" : "/");
  }

  return {
    profile,
    step,
    text,
    model,
    result,
    error,
    journeyFlow,
    profileMessage,
    isLoading,
    mode,
    checkIn,
    ritualOutcome,
    validation,
    canFinish,
    showProfileForm,
    indicators,
    ritual,
    moodLine,
    actions: {
      setStep,
      setText,
      setModel,
      saveProfile,
      deleteProfile,
      updateProfile,
      submit,
      cancelJourney,
      retryJourney,
      editJourneyGoal,
      newJourney,
      updateCheckIn,
      recordOutcome,
      navigateMode,
      editProfile: () => setIsEditingProfile(true)
    }
  };
}
