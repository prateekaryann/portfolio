import { motion } from 'framer-motion'
import { ArrowDown, Github, Linkedin, Mail } from 'lucide-react'
import { personal } from '../data/portfolio'

const fadeUp = {
  hidden: { opacity: 0, y: 24 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.12, duration: 0.55, ease: 'easeOut' },
  }),
}

export default function Hero() {
  const scrollTo = (id: string) => {
    document.querySelector(id)?.scrollIntoView({ behavior: 'smooth' })
  }

  return (
    <section
      id="hero"
      className="relative min-h-screen flex flex-col items-center justify-center px-4 overflow-hidden"
    >
      {/* Background grid */}
      <div className="absolute inset-0 bg-grid-pattern opacity-[0.03] dark:opacity-[0.04] pointer-events-none" />

      {/* Accent glow */}
      <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-accent-DEFAULT/10 dark:bg-accent-DEFAULT/5 rounded-full blur-3xl pointer-events-none" />

      <div className="relative max-w-4xl mx-auto text-center">
        {/* Badge */}
        <motion.div
          custom={0}
          variants={fadeUp}
          initial="hidden"
          animate="visible"
          className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-accent-DEFAULT/30 bg-accent-DEFAULT/5 text-accent-light text-xs font-mono mb-8"
        >
          <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
          Available for senior / lead roles
        </motion.div>

        {/* Name */}
        <motion.h1
          custom={1}
          variants={fadeUp}
          initial="hidden"
          animate="visible"
          className="text-5xl sm:text-6xl lg:text-7xl font-bold tracking-tight text-gray-900 dark:text-white mb-4"
        >
          {personal.name}
        </motion.h1>

        {/* Role */}
        <motion.p
          custom={2}
          variants={fadeUp}
          initial="hidden"
          animate="visible"
          className="text-xl sm:text-2xl font-mono text-accent-DEFAULT mb-6"
        >
          {personal.role}
        </motion.p>

        {/* Tagline */}
        <motion.p
          custom={3}
          variants={fadeUp}
          initial="hidden"
          animate="visible"
          className="text-base sm:text-lg text-gray-500 dark:text-gray-400 max-w-xl mx-auto mb-10 leading-relaxed"
        >
          {personal.tagline}
        </motion.p>

        {/* CTAs */}
        <motion.div
          custom={4}
          variants={fadeUp}
          initial="hidden"
          animate="visible"
          className="flex flex-wrap items-center justify-center gap-4 mb-14"
        >
          <button
            onClick={() => scrollTo('#projects')}
            className="px-6 py-3 rounded-lg bg-accent-DEFAULT hover:bg-accent-hover text-white text-sm font-medium transition-all duration-200 hover:shadow-lg hover:shadow-accent-DEFAULT/25 active:scale-95"
          >
            View Work
          </button>
          <button
            onClick={() => scrollTo('#contact')}
            className="px-6 py-3 rounded-lg border border-gray-300 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:border-accent-DEFAULT dark:hover:border-accent-DEFAULT hover:text-accent-DEFAULT text-sm font-medium transition-all duration-200 active:scale-95"
          >
            Contact Me
          </button>
        </motion.div>

        {/* Social links */}
        <motion.div
          custom={5}
          variants={fadeUp}
          initial="hidden"
          animate="visible"
          className="flex items-center justify-center gap-5"
        >
          <a
            href={personal.github}
            target="_blank"
            rel="noopener noreferrer"
            aria-label="GitHub"
            className="text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors"
          >
            <Github size={20} />
          </a>
          <a
            href={personal.linkedin}
            target="_blank"
            rel="noopener noreferrer"
            aria-label="LinkedIn"
            className="text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors"
          >
            <Linkedin size={20} />
          </a>
          <a
            href={`mailto:${personal.email}`}
            aria-label="Email"
            className="text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors"
          >
            <Mail size={20} />
          </a>
        </motion.div>
      </div>

      {/* Scroll indicator */}
      <motion.button
        onClick={() => scrollTo('#about')}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1.2, duration: 0.6 }}
        className="absolute bottom-10 left-1/2 -translate-x-1/2 text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors animate-bounce"
        aria-label="Scroll down"
      >
        <ArrowDown size={20} />
      </motion.button>
    </section>
  )
}
