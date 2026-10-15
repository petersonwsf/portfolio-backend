import { z } from 'zod'

export const esquemaLogin = z.object({
    usuario: z.string().trim().min(1, 'Usuário é obrigatório').max(100),
    senha: z.string().min(1, 'Senha é obrigatória').max(200),
})
