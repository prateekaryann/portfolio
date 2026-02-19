import type { ReactNode } from 'react'
import { motion } from 'framer-motion'
import { Server, Cloud, Brain, GitBranch } from 'lucide-react'
import { skillGroups } from '../data/portfolio'

const iconMap: Record<string, ReactNode> = {
  server: <Server size={18} />,
  cloud: <Cloud size={18} />,
  brain: <Brain size={18} />,
  'git-branch': <GitBranch size={18} />,
}

const containerVariants = {
  hidden: {},
  visible: {
    transition: { staggerChildren: 0.1 },
  },
}

const cardVariants = {
  hidden: { opacity: 0, y: 30 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.5, ease: 'easeOut' } },
}

export default function Skills() {
  return (
    <section id="skills" className="py-24 px-4 bg-gray-50 dark:bg-surface-card/50">
      <div className="max-w-5xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-80px' }}
          transition={{ duration: 0.5 }}
        >
          <span className="text-xs font-mono text-accent-DEFAULT tracking-widest uppercase">
            Skills
          </span>
          <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 dark:text-white mt-2 mb-12">
            What I work with
          </h2>
        </motion.div>

        <motion.div
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: '-80px' }}
          className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5"
        >
          {skillGroups.map(group => (
            <motion.div
              key={group.category}
              variants={cardVariants}
              className="bg-white dark:bg-surface-card rounded-xl p-5 border border-gray-200 dark:border-surface-border hover:border-accent-DEFAULT/50 transition-colors group"
            >
              {/* Category header */}
              <div className="flex items-center gap-2.5 mb-4">
                <div className="p-1.5 rounded-md bg-accent-DEFAULT/10 text-accent-DEFAULT group-hover:bg-accent-DEFAULT group-hover:text-white transition-all duration-200">
                  {iconMap[group.icon]}
                </div>
                <h3 className="font-semibold text-sm text-gray-900 dark:text-white">
                  {group.category}
                </h3>
              </div>

              {/* Skills list */}
              <ul className="flex flex-wrap gap-2">
                {group.skills.map(skill => (
                  <li
                    key={skill.name}
                    className="px-2.5 py-1 rounded-md text-xs font-mono bg-gray-100 dark:bg-white/5 text-gray-600 dark:text-gray-400 border border-transparent hover:border-accent-DEFAULT/40 hover:text-accent-DEFAULT dark:hover:text-accent-light transition-all cursor-default"
                  >
                    {skill.name}
                  </li>
                ))}
              </ul>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  )
}
