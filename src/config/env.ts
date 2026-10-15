import path from 'node:path'
import dotenv from 'dotenv'
import { z } from 'zod'

// o .env fica na raiz do repositório (compartilhado com o docker-compose)
dotenv.config({ path: path.resolve(__dirname, '..', '..', '..', '.env') })

const esquemaEnv = z.object({
    PORTA: z.coerce.number().int().positive().default(3333),
    MONGODB_URI: z.string().min(1, 'MONGODB_URI é obrigatória'),
    ORIGENS_PERMITIDAS: z.string().default('http://localhost:5173,http://localhost:5174'),
    ADMIN_USUARIO: z.string().min(1, 'ADMIN_USUARIO é obrigatório'),
    ADMIN_SENHA_HASH: z.string().min(20, 'ADMIN_SENHA_HASH é obrigatório (bcrypt)'),
    JWT_SEGREDO: z.string().min(32, 'JWT_SEGREDO deve ter ao menos 32 caracteres'),
    JWT_EXPIRA_EM: z.string().default('2h'),
    S3_ENDPOINT: z.url('S3_ENDPOINT deve ser uma URL'),
    S3_REGIAO: z.string().default('us-east-1'),
    S3_ACCESS_KEY: z.string().min(1, 'S3_ACCESS_KEY é obrigatória'),
    S3_SECRET_KEY: z.string().min(1, 'S3_SECRET_KEY é obrigatória'),
    S3_BUCKET: z.string().min(3, 'S3_BUCKET é obrigatório'),
    S3_URL_PUBLICA: z.url('S3_URL_PUBLICA deve ser uma URL'),
})

export type Ambiente = z.infer<typeof esquemaEnv>

/** Lê e valida as variáveis de ambiente; encerra com mensagem clara se algo estiver faltando. */
export function carregarAmbiente(origem: NodeJS.ProcessEnv = process.env): Ambiente {
    const resultado = esquemaEnv.safeParse(origem)
    if (!resultado.success) {
        const problemas = resultado.error.issues.map((item) => `- ${item.path.join('.')}: ${item.message}`).join('\n')
        throw new Error(`Variáveis de ambiente inválidas:\n${problemas}`)
    }
    return resultado.data
}
