"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";
import { usePathname, useRouter } from "next/navigation";
import { TOUR_STEPS } from "@/lib/tour";
import { markTourSeen } from "@/app/(app)/tour-actions";
import { Spotlight } from "./spotlight";
import { TourInvitation } from "./tour-invitation";

type TourContext = { start: () => void };

const Ctx = createContext<TourContext>({ start: () => {} });

/** Lets any component — the profile button, say — open the walkthrough. */
export function useTour() {
  return useContext(Ctx);
}

export function TourProvider({
  children,
  /** Null when they've already been offered it, or aren't signed in. */
  invitation,
}: {
  children: React.ReactNode;
  invitation: "auto" | "prompt" | null;
}) {
  const router = useRouter();
  const pathname = usePathname();
  // A brand-new account starts on step one rather than being nudged into it
  // a render later.
  const [step, setStep] = useState<number | null>(
    invitation === "auto" ? 0 : null,
  );
  const [asking, setAsking] = useState(invitation === "prompt");

  const start = useCallback(() => {
    setAsking(false);
    setStep(0);
  }, []);

  // Once they've been shown either the tour or the prompt, don't ask again.
  useEffect(() => {
    if (invitation) markTourSeen();
  }, [invitation]);

  const current = step === null ? null : TOUR_STEPS[step];

  // Each step lives on a page; walk there before pointing at anything on it.
  useEffect(() => {
    if (current && current.path !== pathname) router.push(current.path);
  }, [current, pathname, router]);

  const close = useCallback(() => setStep(null), []);

  const next = useCallback(() => {
    setStep((s) => (s === null || s >= TOUR_STEPS.length - 1 ? null : s + 1));
  }, []);

  const back = useCallback(() => {
    setStep((s) => (s === null || s === 0 ? s : s - 1));
  }, []);

  return (
    <Ctx.Provider value={{ start }}>
      {children}
      {asking ? (
        <TourInvitation onStart={start} onDismiss={() => setAsking(false)} />
      ) : null}
      {current ? (
        <Spotlight
          key={step}
          step={current}
          index={step!}
          total={TOUR_STEPS.length}
          onNext={next}
          onBack={back}
          onClose={close}
        />
      ) : null}
    </Ctx.Provider>
  );
}
