import type { ReactNode } from "react";
import { motion, useReducedMotion } from "framer-motion";

type AnimatedSectionProps = {
  children: ReactNode;
  className?: string;
  /** Delay em segundos (pequeno). */
  delay?: number;
};

export function AnimatedSection({
  children,
  className,
  delay = 0,
}: AnimatedSectionProps) {
  const reducedMotion = useReducedMotion();

  if (reducedMotion) {
    return <div className={className}>{children}</div>;
  }

  return (
    <motion.div
      className={className}
      initial={{ opacity: 0, y: 18, filter: "blur(6px)" }}
      whileInView={{ opacity: 1, y: 0, filter: "blur(0px)" }}
      viewport={{ once: true, amount: 0.25 }}
      transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1], delay }}
    >
      {children}
    </motion.div>
  );
}

