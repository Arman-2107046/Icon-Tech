"use client";

import { Children, useRef, type ReactNode } from "react";
import { m, useInView, useReducedMotion, type Variants } from "framer-motion";

/**
 * Scroll reveals. Fire once when ~15% of the element is in view, 250 ms
 * ease-out with a 70 ms stagger across siblings. With reduced motion the
 * content simply appears (no transform, no fade).
 */
export const EASE = [0.22, 1, 0.36, 1] as const;
const DURATION = 0.3;
const STAGGER = 0.07;

const item: Variants = {
  hidden: { opacity: 0, y: 16 },
  shown: { opacity: 1, y: 0, transition: { duration: DURATION, ease: EASE } },
};
const still: Variants = { hidden: { opacity: 1, y: 0 }, shown: { opacity: 1, y: 0 } };
const group: Variants = { hidden: {}, shown: { transition: { staggerChildren: STAGGER, delayChildren: 0.04 } } };

const VIEWPORT = { once: true, amount: 0.15 } as const;

export function Reveal({ children, className, as = "div", delay = 0 }: { children: ReactNode; className?: string; as?: "div" | "section" | "header" | "li"; delay?: number }) {
  const reduced = useReducedMotion();
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, VIEWPORT);
  // One ref type for every tag; the element kind never matters to useInView.
  const Tag = m[as] as typeof m.div;
  return (
    <Tag ref={ref} className={className} initial="hidden" animate={inView ? "shown" : "hidden"} variants={reduced ? still : item} transition={{ delay }}>
      {children}
    </Tag>
  );
}

/** Each direct child becomes a staggered reveal item; the grid classes stay on the group. */
export function RevealGroup({ children, className }: { children: ReactNode; className?: string }) {
  const reduced = useReducedMotion();
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, VIEWPORT);
  return (
    <m.div ref={ref} className={className} initial="hidden" animate={inView ? "shown" : "hidden"} variants={group}>
      {Children.map(children, (child) => (
        <m.div variants={reduced ? still : item}>
          {child}
        </m.div>
      ))}
    </m.div>
  );
}
