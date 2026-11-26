import { z } from 'zod'

const textoCurto = (max: number) => z.string().trim().min(1).max(max)

/** Parâmetros da consulta de eventos de auditoria de um projeto (query string). */
export const esquemaConsultaEventos = z.object({
    projetoId: z.string().regex(/^[a-f0-9]{24}$/i, 'Identificador inválido'),
    servico: textoCurto(40).optional(),
    acao: textoCurto(60).optional(),
    resultado: z.enum(['SUCCESS', 'FAILURE', 'DENIED']).optional(),
    ator: z.uuid('Ator deve ser um UUID').optional(),
    de: z.iso.datetime({ offset: true, message: 'Data inicial inválida (use ISO-8601)' }).optional(),
    ate: z.iso.datetime({ offset: true, message: 'Data final inválida (use ISO-8601)' }).optional(),
    correlacao: textoCurto(64).optional(),
    limite: z.coerce.number().int().min(1).max(100).optional(),
    cursor: textoCurto(200).optional(),
})

export type ConsultaEventos = z.infer<typeof esquemaConsultaEventos>
