import { Link } from "react-router-dom";
import { motion, useReducedMotion } from "framer-motion";
import PinnedCard from "@/components/landing/PinnedCard";

const DISTRICTS = ["Ciutat Vella", "Eixample", "Sants-Montjuïc", "Les Corts", "Sarrià-Sant Gervasi", "Gràcia", "Horta-Guinardó", "Nou Barris", "Sant Andreu", "Sant Martí"];
const BADGE_PATH = "M10.5 2C9.70435 2 8.94129 2.31607 8.37868 2.87868C7.81607 3.44129 7.5 4.20435 7.5 5C7.5 5.79565 7.81607 6.55871 8.37868 7.12132C8.94129 7.68393 9.70435 8 10.5 8C11.2956 8 12.0587 7.68393 12.6213 7.12132C13.1839 6.55871 13.5 5.79565 13.5 5C13.5 4.20435 13.1839 3.44129 12.6213 2.87868C12.0587 2.31607 11.2956 2 10.5 2ZM5.553 9.996C5.519 10.1587 5.502 10.3267 5.502 10.5V14C5.50135 14.726 5.65912 15.4434 5.96431 16.1021C6.2695 16.7609 6.71475 17.3451 7.269 17.814L7.098 17.864C6.59057 18.0001 6.0613 18.0349 5.54041 17.9665C5.01952 17.898 4.51722 17.7276 4.0622 17.465C3.60718 17.2024 3.20835 16.8527 2.88848 16.4359C2.56862 16.0192 2.33399 15.5435 2.198 15.036L1.551 12.621C1.50004 12.4307 1.48706 12.2323 1.5128 12.037C1.53854 11.8417 1.6025 11.6533 1.70103 11.4827C1.79955 11.3122 1.93071 11.1627 2.08701 11.0428C2.24332 10.9229 2.42171 10.8349 2.612 10.784L5.553 9.996ZM13.735 17.814C14.2892 17.3451 14.7345 16.7609 15.0397 16.1021C15.3449 15.4434 15.5027 14.726 15.502 14V10.5C15.5013 10.3267 15.4847 10.1587 15.452 9.996L18.392 10.784C18.7761 10.8871 19.1036 11.1385 19.3023 11.483C19.5011 11.8275 19.555 12.2368 19.452 12.621L18.805 15.036C18.6651 15.5578 18.421 16.0459 18.0873 16.4708C17.7536 16.8957 17.3373 17.2486 16.8635 17.5082C16.3897 17.7678 15.8682 17.9287 15.3306 17.9813C14.7929 18.0339 14.2501 17.9769 13.735 17.814ZM17 4C16.337 4 15.7011 4.26339 15.2322 4.73223C14.7634 5.20107 14.5 5.83696 14.5 6.5C14.5 7.16304 14.7634 7.79893 15.2322 8.26777C15.7011 8.73661 16.337 9 17 9C17.663 9 18.2989 8.73661 18.7678 8.26777C19.2366 7.79893 19.5 7.16304 19.5 6.5C19.5 5.83696 19.2366 5.20107 18.7678 4.73223C18.2989 4.26339 17.663 4 17 4ZM4 4C3.33696 4 2.70107 4.26339 2.23223 4.73223C1.76339 5.20107 1.5 5.83696 1.5 6.5C1.5 7.16304 1.76339 7.79893 2.23223 8.26777C2.70107 8.73661 3.33696 9 4 9C4.66304 9 5.29892 8.73661 5.76777 8.26777C6.23661 7.79893 6.5 7.16304 6.5 6.5C6.5 5.83696 6.23661 5.20107 5.76777 4.73223C5.29892 4.26339 4.66304 4 4 4ZM8 9C7.60217 9 7.22064 9.15804 6.93934 9.43934C6.65803 9.72064 6.5 10.1022 6.5 10.5V14C6.5 15.0609 6.92143 16.0783 7.67157 16.8284C8.42172 17.5786 9.43913 18 10.5 18C11.5609 18 12.5783 17.5786 13.3284 16.8284C14.0786 16.0783 14.5 15.0609 14.5 14V10.5C14.5 10.1022 14.342 9.72064 14.0607 9.43934C13.7794 9.15804 13.3978 9 13 9H8Z";

const CARDS = [
  { tag: "#family", area: "Sarrià", score: 8.6, rows: [{ label: "Education", value: 9.2 }, { label: "Parks & green", value: 8.4 }, { label: "Safety", value: 8.8 }] },
  { tag: "#remotework", area: "Gràcia", score: 8.9, rows: [{ label: "Transport", value: 9.1 }, { label: "Daily life", value: 9.4 }, { label: "Prices", value: 6.2 }] },
  { tag: "#seaside", area: "Poblenou", score: 8.1, rows: [{ label: "Environment", value: 8.7 }, { label: "Development", value: 8.9 }, { label: "Tourism", value: 5.8 }] },
];

export default function LandingHero() {
  const reduce = useReducedMotion();
  const item = reduce ? {} : {
    hidden: { opacity: 0, y: 18, scale: 0.94 },
    show: { opacity: 1, y: 0, scale: 1, transition: { duration: 0.85, ease: [0.16, 1, 0.3, 1] } },
  };
  const group = { hidden: {}, show: { transition: { staggerChildren: 0.09 } } };

  return (
    <motion.section initial={reduce ? false : "hidden"} animate="show" variants={group} className="overflow-x-clip pb-8 md:pb-12 lg:pb-[3.25rem]">
      <div className="mx-auto max-w-[73.5rem] px-4 pt-12 md:px-10 md:pt-16 lg:px-14 lg:pt-20 flex flex-col items-center text-center">
        <motion.div variants={item} className="flex items-center gap-2.5 rounded-[3rem] bg-muted px-3 py-1 text-[0.9375rem] font-bold leading-[1.33] tracking-[-0.015em]">
          <svg viewBox="0 0 21 20" fill="none" aria-hidden="true" className="h-5 w-5 flex-none"><path d={BADGE_PATH} fill="currentColor" /></svg>
          <div>73 barris <span className="font-normal">scored for you</span></div>
        </motion.div>
        <motion.h1 variants={item} className="mt-3 max-w-[37rem] text-[2.75rem] md:text-[3.5rem] lg:text-[3.75rem] font-semibold leading-[1.2] tracking-[-0.06em]">
          Find the barrio that fits your life.
        </motion.h1>
        <motion.p variants={item} className="mt-3 text-base leading-normal tracking-[-0.01em] text-muted-foreground">
          Tell our AI agent what matters. We rank every Barcelona neighbourhood by your priorities.
        </motion.p>
        <motion.div variants={item} className="mt-8 md:mt-10 flex w-full flex-col items-stretch min-[480px]:w-auto min-[480px]:items-center">
          <Link to="/register" className="flex h-12 md:h-10 items-center justify-center rounded-lg bg-primary px-6 py-2 text-sm font-semibold tracking-[-0.01em] text-primary-foreground transition-transform duration-200 hover:scale-[0.93]">Find your barrio</Link>
        </motion.div>
        <motion.div variants={item} className="mt-8 md:mt-10 w-full max-w-[36.3rem]">
          <div className="hero-loop relative flex overflow-clip" aria-label="All 10 Barcelona districts">
            <div className="pointer-events-none absolute inset-y-0 left-0 z-10 w-6 bg-gradient-to-r from-background to-transparent" />
            <div className="pointer-events-none absolute inset-y-0 right-0 z-10 w-6 bg-gradient-to-l from-background to-transparent" />
            {[0, 1].map((k) => (
              <div key={k} aria-hidden={k === 1 || undefined} className="hero-loop-track flex flex-none items-center gap-8 lg:gap-12 px-6">
                {DISTRICTS.map((d) => <span key={d} className="whitespace-nowrap text-sm font-semibold text-muted-foreground/60">{d}</span>)}
              </div>
            ))}
          </div>
        </motion.div>
      </div>

      <div className="mt-10 md:mt-12 lg:mt-16 px-4 md:px-10 lg:px-14">
        <div className="flex w-full items-start justify-center gap-[4.3%]">
          <motion.div variants={item} className="hidden min-[480px]:block flex-1 lg:flex-none lg:w-[23.5rem]">
            <PinnedCard {...CARDS[0]} className="origin-top-right rotate-[8deg]" />
          </motion.div>
          <motion.div variants={item} className="w-full min-[480px]:w-auto min-[480px]:min-w-[50%] md:min-w-[40%] lg:min-w-0 lg:w-[23.5rem] flex-none">
            <PinnedCard {...CARDS[1]} />
          </motion.div>
          <motion.div variants={item} className="hidden min-[480px]:block flex-1 lg:flex-none lg:w-[23.5rem]">
            <PinnedCard {...CARDS[2]} className="origin-top-left -rotate-[8deg]" />
          </motion.div>
        </div>
      </div>
    </motion.section>
  );
}