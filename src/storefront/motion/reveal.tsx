"use client";

import { Children, type ReactNode } from "react";
import { motion, useReducedMotion, type Variants } from "motion/react";

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

const viewport = { once: true, amount: 0.15 } as const;

export function Reveal({ children, className, as = "div", delay = 0 }: { children: ReactNode; className?: string; as?: "div" | "section" | "header" | "li"; delay?: number }) {
  const reduced = useReducedMotion();
  const Tag = motion[as];
  return (
    <Tag className={className} initial="hidden" whileInView="shown" viewport={viewport} variants={reduced ? still : item} transition={{ delay }}>
      {children}
    </Tag>
  );
}

/** Each direct child becomes a staggered reveal item; the grid classes stay on the group. */
export function RevealGroup({ children, className }: { children: ReactNode; className?: string }) {
  const reduced = useReducedMotion();
  return (
    <motion.div className={className} initial="hidden" whileInView="shown" viewport={viewport} variants={group}>
      {Children.map(children, (child) => (
        <motion.div variants={reduced ? still : item}>
          {child}
        </motion.div>
      ))}
    </motion.div>
  );
}
