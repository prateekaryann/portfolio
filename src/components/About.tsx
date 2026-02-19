import type { ReactNode } from 'react'
import { motion } from 'framer-motion'
import { MapPin, Briefcase } from 'lucide-react'
import { personal, bio } from '../data/portfolio'

const fadeUp = {
  hidden: { opacity: 0, y: 30 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.6, ease: 'easeOut' } },
}

export default function About() {
  return (
    <section id="about" className="py-24 px-4">
      <div className="max-w-5xl mx-auto">
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: '-80px' }}
          variants={fadeUp}
        >
          <SectionLabel>About</SectionLabel>
          <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 dark:text-white mt-2 mb-12">
            A bit about me
          </h2>
        </motion.div>

        <div className="grid md:grid-cols-5 gap-12 items-start">
          {/* Photo placeholder */}
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: '-80px' }}
            variants={{ ...fadeUp, visible: { ...fadeUp.visible, transition: { duration: 0.6, delay: 0.1 } } }}
            className="md:col-span-2 flex justify-center md:justify-start"
          >
            <div className="relative">
              {/* Decorative border */}
              <div className="absolute inset-0 rounded-2xl border-2 border-accent-DEFAULT/40 translate-x-3 translate-y-3" />
              <div className="relative w-56 h-56 sm:w-64 sm:h-64 rounded-2xl bg-gradient-to-br from-accent-DEFAULT/20 to-purple-500/20 border border-gray-200 dark:border-surface-border flex items-center justify-center">
                <span className="text-7xl font-bold text-accent-DEFAULT/60 font-mono select-none">
                  {personal.name.charAt(0)}
                </span>
              </div>
            </div>
          </motion.div>

          {/* Bio */}
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: '-80px' }}
            variants={{ ...fadeUp, visible: { ...fadeUp.visible, transition: { duration: 0.6, delay: 0.2 } } }}
            className="md:col-span-3"
          >
            <p className="text-gray-600 dark:text-gray-400 leading-relaxed text-base sm:text-lg whitespace-pre-line mb-8">
              {bio}
            </p>

            <div className="flex flex-col sm:flex-row gap-4">
              <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-500">
                <MapPin size={14} className="text-accent-DEFAULT flex-shrink-0" />
                <span>{personal.location}</span>
              </div>
              <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-500">
                <Briefcase size={14} className="text-accent-DEFAULT flex-shrink-0" />
                <span>Open to senior engineering & lead roles</span>
              </div>
            </div>

            <div className="mt-8 pt-8 border-t border-gray-200 dark:border-surface-border grid grid-cols-3 gap-6">
              {[
                { value: '6+', label: 'Years experience' },
                { value: '3', label: 'Teams managed' },
                { value: '10M+', label: 'Requests / month' },
              ].map(stat => (
                <div key={stat.label}>
                  <div className="text-2xl font-bold text-gray-900 dark:text-white font-mono">
                    {stat.value}
                  </div>
                  <div className="text-xs text-gray-500 dark:text-gray-500 mt-1">{stat.label}</div>
                </div>
              ))}
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  )
}

function SectionLabel({ children }: { children: ReactNode }) {
  return (
    <span className="text-xs font-mono text-accent-DEFAULT tracking-widest uppercase">
      {children}
    </span>
  )
}
