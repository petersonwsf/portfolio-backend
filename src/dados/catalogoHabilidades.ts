import type { CategoriaHabilidade } from '../modelos/Habilidade'

/**
 * Catálogo inicial de stacks, serviços e ferramentas.
 * Tudo entra como "não dominada"; o admin marca as que domina (e anexa a imagem).
 */
export const CATALOGO: Record<CategoriaHabilidade, string[]> = {
    Frontend: [
        'HTML', 'CSS', 'JavaScript', 'TypeScript', 'React', 'Next.js', 'Vue.js', 'Nuxt', 'Angular', 'Svelte',
        'Tailwind CSS', 'Bootstrap', 'Sass', 'Vite', 'Redux', 'Zustand', 'React Query', 'React Router',
        'Material UI', 'shadcn/ui', 'Storybook', 'Framer Motion', 'Three.js', 'Astro', 'Electron',
    ],
    Backend: [
        'Node.js', 'NestJS', 'Express', 'Fastify', 'Java', 'Spring Boot', 'Hibernate', 'Javalin', 'Python',
        'Django', 'FastAPI', 'Flask', 'Go', 'C#', '.NET', 'PHP', 'Laravel', 'Ruby on Rails', 'Kotlin', 'Rust',
        'GraphQL', 'REST', 'gRPC', 'WebSockets', 'Prisma', 'TypeORM', 'Sequelize', 'Mongoose', 'JWT', 'OAuth 2.0',
        'RabbitMQ', 'Kafka', 'BullMQ', 'Zod',
    ],
    DevOps: [
        'Docker', 'Docker Compose', 'Kubernetes', 'Linux', 'Nginx', 'Traefik', 'GitHub Actions', 'GitLab CI',
        'Jenkins', 'Terraform', 'Ansible', 'AWS', 'Azure', 'Google Cloud', 'DigitalOcean', 'Vercel', 'Netlify',
        'Cloudflare', 'Render', 'Railway', 'Prometheus', 'Grafana', 'Sentry', 'S3', 'RustFS', 'MinIO',
    ],
    Dados: [
        'SQL', 'PostgreSQL', 'MySQL', 'MariaDB', 'SQLite', 'MongoDB', 'Redis', 'Elasticsearch', 'Firebase Firestore',
        'Pandas', 'NumPy', 'Jupyter', 'Power BI', 'Metabase', 'Tableau', 'Looker Studio', 'dbt', 'Airflow',
        'Apache Spark', 'BigQuery', 'Snowflake', 'Excel',
    ],
    Outros: [
        'Git', 'GitHub', 'GitLab', 'Bitbucket', 'Figma', 'Postman', 'Insomnia', 'Swagger', 'Jira', 'Trello',
        'Notion', 'Slack', 'VS Code', 'IntelliJ IDEA', 'Stripe', 'Asaas', 'Mercado Pago', 'PayPal', 'Pagar.me',
        'Wati', 'WhatsApp Business API', 'Twilio', 'SendGrid', 'Resend', 'Mailchimp', 'Firebase', 'Supabase',
        'Auth0', 'Clerk', 'OpenAI API', 'Claude API', 'n8n', 'Zapier', 'Make', 'Cloudinary', 'Google Analytics',
        'Hotjar', 'Shopify', 'WordPress', 'Strapi', 'Contentful', 'Vitest', 'Jest', 'Cypress', 'Playwright',
        'ESLint', 'Prettier', 'Scrum', 'Kanban',
    ],
}
