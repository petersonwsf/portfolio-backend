import { z } from 'zod'
import { ErroHttp } from '../utils/erros'

/** Resultado de uma ação auditada. */
export type ResultadoAuditoria = 'SUCCESS' | 'FAILURE' | 'DENIED'

export interface FiltrosEventos {
    /** Código da aplicação no serviço de auditoria (vem do projeto). */
    aplicacao: string
    servico?: string
    acao?: string
    resultado?: ResultadoAuditoria
    ator?: string
    de?: string
    ate?: string
    correlacao?: string
    limite?: number
    cursor?: string
}

export interface EventoAuditoria {
    id: number
    idEvento: string
    aplicacao: string
    servico: string
    acao: string
    resultado: ResultadoAuditoria
    idAtor: string | null
    tipoAtor: string
    tipoAlvo: string | null
    idAlvo: string | null
    ip: string | null
    agenteUsuario: string | null
    idCorrelacao: string | null
    versaoEsquema: number
    detalhe: Record<string, unknown> | null
    ocorridoEm: string
    recebidoEm: string
}

export interface PaginaEventos {
    itens: EventoAuditoria[]
    proximoCursor: string | null
}

/** Contrato com o serviço de auditoria (consulta somente leitura). */
export interface ClienteAuditoria {
    listarEventos(filtros: FiltrosEventos): Promise<PaginaEventos>
}

const TEMPO_LIMITE_MS = 5000

const esquemaEvento = z.object({
    id: z.number(),
    eventId: z.string(),
    application: z.string(),
    service: z.string(),
    action: z.string(),
    outcome: z.enum(['SUCCESS', 'FAILURE', 'DENIED']),
    actorId: z.string().nullish(),
    actorType: z.string(),
    targetType: z.string().nullish(),
    targetId: z.string().nullish(),
    ip: z.string().nullish(),
    userAgent: z.string().nullish(),
    correlationId: z.string().nullish(),
    schemaVersion: z.number(),
    detail: z.record(z.string(), z.unknown()).nullish(),
    occurredAt: z.string(),
    receivedAt: z.string(),
})

const esquemaPagina = z.object({
    items: z.array(esquemaEvento),
    nextCursor: z.string().nullish(),
})

const esquemaErro = z.object({ mensagem: z.string().optional() })

/** Traduz o evento do serviço de auditoria para os nomes em português usados pelo painel. */
function traduzirEvento(evento: z.infer<typeof esquemaEvento>): EventoAuditoria {
    return {
        id: evento.id,
        idEvento: evento.eventId,
        aplicacao: evento.application,
        servico: evento.service,
        acao: evento.action,
        resultado: evento.outcome,
        idAtor: evento.actorId ?? null,
        tipoAtor: evento.actorType,
        tipoAlvo: evento.targetType ?? null,
        idAlvo: evento.targetId ?? null,
        ip: evento.ip ?? null,
        agenteUsuario: evento.userAgent ?? null,
        idCorrelacao: evento.correlationId ?? null,
        versaoEsquema: evento.schemaVersion,
        detalhe: evento.detail ?? null,
        ocorridoEm: evento.occurredAt,
        recebidoEm: evento.receivedAt,
    }
}

function montarConsulta(filtros: FiltrosEventos): string {
    const parametros = new URLSearchParams({ application: filtros.aplicacao })
    const mapa: [string, string | number | undefined][] = [
        ['service', filtros.servico],
        ['action', filtros.acao],
        ['outcome', filtros.resultado],
        ['actor', filtros.ator],
        ['from', filtros.de],
        ['to', filtros.ate],
        ['correlationId', filtros.correlacao],
        ['limit', filtros.limite],
        ['cursor', filtros.cursor],
    ]
    for (const [nome, valor] of mapa) {
        if (valor !== undefined && valor !== '') parametros.set(nome, String(valor))
    }
    return parametros.toString()
}

/** Mensagem do serviço de auditoria para um erro de entrada (400), sem expor nada interno. */
async function lerMensagemDeErro(resposta: Response): Promise<string> {
    const corpo = esquemaErro.safeParse(await resposta.json().catch(() => null))
    return (corpo.success && corpo.data.mensagem) || 'Consulta de auditoria inválida'
}

/**
 * Cliente do serviço de auditoria. A credencial de leitura fica só aqui (servidor): o navegador nunca fala com o serviço.
 * Nunca registra a URL nem o token em log.
 */
export function criarClienteAuditoria(urlBase: string, tokenLeitura: string): ClienteAuditoria {
    const base = urlBase.replace(/\/+$/, '')

    return {
        async listarEventos(filtros) {
            let resposta: Response
            try {
                resposta = await fetch(`${base}/v1/events?${montarConsulta(filtros)}`, {
                    headers: { authorization: `Bearer ${tokenLeitura}`, accept: 'application/json' },
                    signal: AbortSignal.timeout(TEMPO_LIMITE_MS),
                })
            } catch {
                throw new ErroHttp(502, 'Serviço de auditoria indisponível')
            }

            if (resposta.status === 404) {
                throw new ErroHttp(404, 'Este código de aplicação não está cadastrado no serviço de auditoria')
            }
            if (resposta.status === 400) {
                throw new ErroHttp(400, await lerMensagemDeErro(resposta))
            }
            if (!resposta.ok) {
                // inclui 401/403 (credencial errada) e 5xx: o painel só vê "indisponível"
                console.error(`Serviço de auditoria respondeu ${resposta.status}`)
                throw new ErroHttp(502, 'Serviço de auditoria indisponível')
            }

            const pagina = esquemaPagina.safeParse(await resposta.json().catch(() => null))
            if (!pagina.success) {
                console.error('Resposta inesperada do serviço de auditoria')
                throw new ErroHttp(502, 'Resposta inesperada do serviço de auditoria')
            }
            return { itens: pagina.data.items.map(traduzirEvento), proximoCursor: pagina.data.nextCursor ?? null }
        },
    }
}
