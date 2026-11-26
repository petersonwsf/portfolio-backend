import { z } from 'zod'

/** Código da aplicação no serviço de auditoria: [a-z0-9_-], 2 a 40 caracteres. */
const codigo = z.string().regex(/^[a-z0-9_-]{2,40}$/, 'Código inválido: use 2 a 40 caracteres (letras minúsculas, números, - ou _)')

export const esquemaCodigoAplicacao = z.object({ codigo })

export const esquemaChaveDaAplicacao = z.object({ codigo, idChave: z.uuid('Identificador da chave inválido') })

/** Corpo do cadastro de uma aplicação no serviço de auditoria. */
export const esquemaNovaAplicacao = z.object({
    codigo,
    nome: z.string().trim().min(1, 'Informe o nome').max(120, 'Nome muito longo'),
    retencaoDias: z.number().int().min(7, 'Mínimo de 7 dias').max(3650, 'Máximo de 3650 dias').optional(),
})
