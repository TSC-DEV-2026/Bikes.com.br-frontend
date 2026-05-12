import { motion, useReducedMotion } from "framer-motion";

type AnimatedBackgroundProps = {
  /** Para ajustar densidade do grid sem mexer no layout. */
  className?: string;
};

export function AnimatedBackground({ className }: AnimatedBackgroundProps) {
  const reducedMotion = useReducedMotion();

  return (
    <div
      aria-hidden="true"
      className={[
        "pointer-events-none absolute inset-0 overflow-hidden",
        className ?? "",
      ].join(" ")}
    >
      {/* Grid sutil + vinheta suave */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(12,27,51,0.05)_1px,transparent_1px),linear-gradient(to_bottom,rgba(12,27,51,0.05)_1px,transparent_1px)] bg-[size:56px_56px] opacity-[0.45]" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_25%_20%,rgba(9,188,138,0.18)_0%,rgba(9,188,138,0.06)_28%,transparent_55%)]" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_80%_30%,rgba(12,27,51,0.12)_0%,rgba(12,27,51,0.05)_22%,transparent_55%)]" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_60%_90%,rgba(9,188,138,0.12)_0%,rgba(9,188,138,0.04)_30%,transparent_60%)]" />
      <div className="absolute inset-0 bg-[linear-gradient(to_bottom,rgba(255,255,255,0.65)_0%,rgba(255,255,255,0.35)_30%,rgba(255,255,255,0.85)_100%)]" />

      {/* Orbs flutuantes (bem leves) */}
      {reducedMotion ? (
        <>
          <div className="absolute -left-24 top-24 h-72 w-72 rounded-full bg-[#09bc8a]/10 blur-3xl" />
          <div className="absolute -right-24 top-40 h-80 w-80 rounded-full bg-[#0c1b33]/8 blur-3xl" />
        </>
      ) : (
        <>
          <motion.div
            className="absolute -left-28 top-24 h-72 w-72 rounded-full bg-[#09bc8a]/10 blur-3xl"
            animate={{ y: [0, -12, 0], x: [0, 8, 0] }}
            transition={{ duration: 10, repeat: Infinity, ease: "easeInOut" }}
          />
          <motion.div
            className="absolute -right-28 top-40 h-80 w-80 rounded-full bg-[#0c1b33]/8 blur-3xl"
            animate={{ y: [0, 14, 0], x: [0, -10, 0] }}
            transition={{ duration: 12, repeat: Infinity, ease: "easeInOut" }}
          />
        </>
      )}
    </div>
  );
}

