import { motion } from 'framer-motion'
import { Mail, Github, Linkedin, ArrowUpRight } from 'lucide-react'
import { personal } from '../data/portfolio'

const links = [
  {
    label: 'Email',
    value: personal.email,
    href: `mailto:${personal.email}`,
    icon: <Mail size={20} />,
    description: 'Drop me a line',
  },
  {
    label: 'GitHub',
    value: '@prateek-aryan',
    href: personal.github,
    icon: <Github size={20} />,
    description: 'See my code',
  },
  {
    label: 'LinkedIn',
    value: 'in/prateek-aryan',
    href: personal.linkedin,
    icon: <Linkedin size={20} />,
    description: 'Connect professionally',
  },
]

export default function Contact() {
  return (
    <section id="contact" className="py-24 px-4">
      <div className="max-w-3xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-80px' }}
          transition={{ duration: 0.5 }}
          className="text-center mb-14"
        >
          <span className="text-xs font-mono text-accent-DEFAULT tracking-widest uppercase">
            Contact
          </span>
          <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 dark:text-white mt-2 mb-4">
            Let's talk
          </h2>
          <p className="text-gray-500 dark:text-gray-400 max-w-md mx-auto leading-relaxed">
            Open to interesting engineering challenges, senior / lead roles, or just a good conversation about systems design.
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-80px' }}
          transition={{ duration: 0.55, delay: 0.1 }}
          className="grid sm:grid-cols-3 gap-4"
        >
          {links.map(link => (
            <a
              key={link.label}
              href={link.href}
              target={link.label !== 'Email' ? '_blank' : undefined}
              rel="noopener noreferrer"
              className="group flex flex-col items-center gap-3 p-6 rounded-xl bg-white dark:bg-surface-card border border-gray-200 dark:border-surface-border hover:border-accent-DEFAULT/50 transition-all duration-200 hover:shadow-lg hover:shadow-accent-DEFAULT/5 text-center"
            >
              <div className="p-3 rounded-xl bg-gray-100 dark:bg-white/5 text-gray-500 dark:text-gray-400 group-hover:bg-accent-DEFAULT group-hover:text-white transition-all duration-200">
                {link.icon}
              </div>
              <div>
                <p className="font-medium text-sm text-gray-900 dark:text-white">{link.label}</p>
                <p className="text-xs text-gray-500 dark:text-gray-500 mt-0.5">{link.description}</p>
              </div>
              <div className="flex items-center gap-1 text-xs text-gray-400 group-hover:text-accent-DEFAULT transition-colors">
                <span className="font-mono truncate max-w-[140px]">{link.value}</span>
                <ArrowUpRight size={11} />
              </div>
            </a>
          ))}
        </motion.div>

        {/* Footer */}
        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5, delay: 0.3 }}
          className="mt-20 pt-8 border-t border-gray-200 dark:border-surface-border text-center"
        >
          <p className="text-xs text-gray-400 dark:text-gray-600 font-mono">
            Built with React + Vite + Tailwind CSS —{' '}
            <a
              href={personal.github}
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-accent-DEFAULT transition-colors"
            >
              view source
            </a>
          </p>
        </motion.div>
      </div>
    </section>
  )
}
