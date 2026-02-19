import { motion } from 'framer-motion'
import { MapPin, Calendar } from 'lucide-react'
import { experience } from '../data/portfolio'

export default function Experience() {
  return (
    <section id="experience" className="py-24 px-4 bg-gray-50 dark:bg-surface-card/50">
      <div className="max-w-3xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-80px' }}
          transition={{ duration: 0.5 }}
        >
          <span className="text-xs font-mono text-accent-DEFAULT tracking-widest uppercase">
            Experience
          </span>
          <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 dark:text-white mt-2 mb-14">
            Work history
          </h2>
        </motion.div>

        {/* Timeline */}
        <div className="relative">
          {/* Vertical line */}
          <div className="absolute left-0 top-2 bottom-2 w-px bg-gradient-to-b from-accent-DEFAULT via-accent-DEFAULT/30 to-transparent" />

          <div className="space-y-12 pl-8">
            {experience.map((item, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, x: -20 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true, margin: '-60px' }}
                transition={{ duration: 0.55, delay: i * 0.1, ease: 'easeOut' }}
                className="relative"
              >
                {/* Timeline dot */}
                <div className="absolute -left-8 top-1.5 flex items-center justify-center">
                  <div className="w-3 h-3 rounded-full border-2 border-accent-DEFAULT bg-white dark:bg-surface-dark" />
                </div>

                {/* Card */}
                <div className="bg-white dark:bg-surface-card rounded-xl border border-gray-200 dark:border-surface-border p-5 hover:border-accent-DEFAULT/40 transition-colors">
                  {/* Header */}
                  <div className="mb-3">
                    <h3 className="font-semibold text-gray-900 dark:text-white text-base">
                      {item.role}
                    </h3>
                    <p className="text-accent-DEFAULT font-medium text-sm mt-0.5">{item.company}</p>
                    <div className="flex flex-wrap gap-x-4 gap-y-1 mt-2">
                      <span className="flex items-center gap-1.5 text-xs text-gray-400 dark:text-gray-500">
                        <Calendar size={11} />
                        {item.duration}
                      </span>
                      <span className="flex items-center gap-1.5 text-xs text-gray-400 dark:text-gray-500">
                        <MapPin size={11} />
                        {item.location}
                      </span>
                    </div>
                  </div>

                  {/* Points */}
                  <ul className="space-y-2 pt-3 border-t border-gray-100 dark:border-surface-border">
                    {item.points.map((point, j) => (
                      <li key={j} className="flex gap-2.5 text-sm text-gray-500 dark:text-gray-400">
                        <span className="text-accent-DEFAULT mt-1 flex-shrink-0">›</span>
                        {point}
                      </li>
                    ))}
                  </ul>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}
