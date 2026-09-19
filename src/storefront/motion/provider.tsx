"use client";

import { LazyMotion } from "framer-motion";
import type { ReactNode } from "react";

/**
 * Smallest feature set (animate/variants/exit), fetched after hydration so
 * the engine is not in the critical bundle; `m.*` still renders its initial
 * styles synchronously, so nothing flashes. `strict` forbids the full `motion`.
 */
const loadFeatures = () => import("./features").then((mod) => mod.default);

export function MotionProvider({ children }: { children: ReactNode }) {
  return (
    <LazyMotion features={loadFeatures} strict>
      {children}
    </LazyMotion>
  );
}
