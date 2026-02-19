// ============================================================
// PORTFOLIO CONFIG — edit this file to update your portfolio
// ============================================================

export const personal = {
  name: 'Prateek Aryan',
  role: 'Backend Lead & Tech Lead',
  tagline: 'Building scalable systems, leading engineering teams, and shipping AI-powered products.',
  email: 'prateek@example.com',
  github: 'https://github.com/prateek-aryan',
  linkedin: 'https://linkedin.com/in/prateek-aryan',
  location: 'India',
}

export const bio = `I'm a Tech Lead with deep roots in backend engineering and cloud infrastructure.
Currently managing frontend, backend, and GenAI teams at an early-stage startup, driving an MVP from
zero to production. I care about clean architecture, developer experience, and building systems that
scale — without unnecessary complexity.`

export interface Skill {
  name: string
}

export interface SkillGroup {
  category: string
  icon: string
  skills: Skill[]
}

export const skillGroups: SkillGroup[] = [
  {
    category: 'Backend',
    icon: 'server',
    skills: [
      { name: 'Python' },
      { name: 'FastAPI' },
      { name: 'PostgreSQL' },
      { name: 'REST APIs' },
      { name: 'SQLAlchemy' },
    ],
  },
  {
    category: 'Cloud & Infra',
    icon: 'cloud',
    skills: [
      { name: 'AWS Lambda' },
      { name: 'EC2' },
      { name: 'S3' },
      { name: 'OpenSearch' },
      { name: 'Kubernetes' },
      { name: 'Docker' },
    ],
  },
  {
    category: 'AI / GenAI',
    icon: 'brain',
    skills: [
      { name: 'LLM Integrations' },
      { name: 'OpenAI API' },
      { name: 'LangChain' },
      { name: 'RAG Pipelines' },
      { name: 'Prompt Engineering' },
    ],
  },
  {
    category: 'DevOps',
    icon: 'git-branch',
    skills: [
      { name: 'GitHub Actions' },
      { name: 'CI/CD' },
      { name: 'Terraform' },
      { name: 'Nginx' },
      { name: 'Linux' },
    ],
  },
]

export interface Project {
  title: string
  description: string
  tags: string[]
  github?: string
  live?: string
}

export const projects: Project[] = [
  {
    title: 'AI Document Intelligence Platform',
    description:
      'A RAG-based document Q&A system built on FastAPI, OpenSearch, and OpenAI. Supports multi-tenant ingestion pipelines, semantic search, and streaming LLM responses. Deployed on AWS ECS with auto-scaling.',
    tags: ['Python', 'FastAPI', 'OpenAI', 'OpenSearch', 'AWS', 'Docker'],
    github: 'https://github.com/prateek-aryan/doc-intelligence',
    live: '',
  },
  {
    title: 'Serverless Event Processing Pipeline',
    description:
      'High-throughput event ingestion system using AWS Lambda, SQS, and S3. Processes 500k+ events/day with dead-letter queues, structured logging, and CloudWatch dashboards. Infrastructure managed via Terraform.',
    tags: ['AWS Lambda', 'SQS', 'S3', 'Terraform', 'Python', 'CloudWatch'],
    github: 'https://github.com/prateek-aryan/event-pipeline',
    live: '',
  },
  {
    title: 'Internal Developer Platform',
    description:
      'Self-service platform for engineers to provision environments, manage secrets, and deploy services via GitOps. Built with FastAPI + React, backed by Kubernetes and GitHub Actions for automated rollouts.',
    tags: ['FastAPI', 'React', 'Kubernetes', 'GitHub Actions', 'PostgreSQL'],
    github: 'https://github.com/prateek-aryan/dev-platform',
    live: '',
  },
]

export interface ExperienceItem {
  role: string
  company: string
  duration: string
  location: string
  points: string[]
}

export const experience: ExperienceItem[] = [
  {
    role: 'Tech Lead',
    company: 'Early-Stage Startup (Stealth)',
    duration: '2023 — Present',
    location: 'Remote',
    points: [
      'Managing frontend, backend, and GenAI engineering teams across a fast-moving MVP.',
      'Designed and deployed the entire cloud architecture on AWS using Lambda, EC2, S3, and OpenSearch.',
      'Integrated LLM-powered features including document intelligence, semantic search, and AI assistants.',
      'Established CI/CD pipelines, code review processes, and engineering best practices from scratch.',
    ],
  },
  {
    role: 'Senior Backend Engineer',
    company: 'Product Company',
    duration: '2021 — 2023',
    location: 'Bengaluru, India',
    points: [
      'Built and maintained high-availability Python/FastAPI services handling 10M+ requests/month.',
      'Led migration from monolith to microservices, reducing deployment complexity and improving uptime.',
      'Introduced Kubernetes-based deployment, cutting infra costs by 35%.',
    ],
  },
  {
    role: 'Backend Engineer',
    company: 'Tech Consultancy',
    duration: '2019 — 2021',
    location: 'Bengaluru, India',
    points: [
      'Developed RESTful APIs in Python for fintech and e-commerce clients.',
      'Built automated ETL pipelines and reporting dashboards backed by PostgreSQL.',
      'Set up GitHub Actions CI/CD workflows, reducing manual deployment time by 70%.',
    ],
  },
]
