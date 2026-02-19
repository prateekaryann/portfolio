import { motion } from 'framer-motion'
import { Github, ExternalLink } from 'lucide-react'
import { projects } from '../data/portfolio'

const containerVariants = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.12 } },
}

const cardVariants = {
  hidden: { opacity: 0, y: 32 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.55, ease: 'easeOut' } },
}

export default function Projects() {
  return (
    <section id="projects" className="py-24 px-4">
      <div className="max-w-5xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-80px' }}
          transition={{ duration: 0.5 }}
        >
          <span className="text-xs font-mono text-accent-DEFAULT tracking-widest uppercase">
            Projects
          </span>
          <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 dark:text-white mt-2 mb-3">
            Things I've built
          </h2>
          <p className="text-gray-500 dark:text-gray-400 text-sm mb-12 max-w-xl">
            A selection of projects — real-world systems built with production constraints in mind.
          </p>
        </motion.div>

        <motion.div
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: '-80px' }}
          className="grid md:grid-cols-2 lg:grid-cols-3 gap-5"
        >
          {projects.map((project, i) => (
            <motion.article
              key={i}
              variants={cardVariants}
              className="group flex flex-col bg-white dark:bg-surface-card rounded-xl border border-gray-200 dark:border-surface-border hover:border-accent-DEFAULT/50 transition-all duration-300 hover:shadow-lg hover:shadow-accent-DEFAULT/5 overflow-hidden"
            >
              {/* Top accent line */}
              <div className="h-0.5 bg-gradient-to-r from-accent-DEFAULT via-purple-500 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

              <div className="flex flex-col flex-1 p-5">
                {/* Title */}
                <h3 className="font-semibold text-gray-900 dark:text-white mb-3 leading-snug group-hover:text-accent-DEFAULT transition-colors">
                  {project.title}
                </h3>

                {/* Description */}
                <p className="text-sm text-gray-500 dark:text-gray-400 leading-relaxed flex-1 mb-4">
                  {project.description}
                </p>

                {/* Tags */}
                <div className="flex flex-wrap gap-1.5 mb-5">
                  {project.tags.map(tag => (
                    <span
                      key={tag}
                      className="px-2 py-0.5 rounded text-xs font-mono bg-gray-100 dark:bg-white/5 text-gray-500 dark:text-gray-500"
                    >
                      {tag}
                    </span>
                  ))}
                </div>

                {/* Links */}
                <div className="flex items-center gap-4 pt-4 border-t border-gray-100 dark:border-surface-border">
                  {project.github && (
                    <a
                      href={project.github}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1.5 text-xs text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors"
                    >
                      <Github size={14} />
                      Source
                    </a>
                  )}
                  {project.live && (
                    <a
                      href={project.live}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1.5 text-xs text-gray-500 dark:text-gray-400 hover:text-accent-DEFAULT transition-colors"
                    >
                      <ExternalLink size={14} />
                      Live
                    </a>
                  )}
                </div>
              </div>
            </motion.article>
          ))}
        </motion.div>
      </div>
    </section>
  )
}
