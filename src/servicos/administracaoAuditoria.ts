import { z } from 'zod'
import { ErroHttp } from '../utils/erros'

/** Aplicação cadastrada no serviço de auditoria. */
export interface AplicacaoAuditoria {
    codigo: string
    nome: string
    ativa: boolean
    retencaoDias: number
    criadaEm: string
}

/** Metadados de uma chave de API (o valor da chave nunca é guardado nem listado). */
export interface ChaveAuditoria {
    id: string
    prefixo: string
    ativa: boolean
    criadaEm: string
    ultimoUsoEm: string | null
    revogadaEm: string | null
}

/** Chave recém-criada: o `valor` só existe nesta resposta. */
export interface ChaveCriada {
    id: string
    aplicacao: string
    prefixo: string
    valor: string
    criadaEm: string
}

export interface NovaAplicacao {
    codigo: string
    nome: string
    retencaoDias?: number
}

/** Contrato com a API de administração do serviço de auditoria (aplicações e chaves de escrita). */
export interface ClienteAdminAuditoria {
    listarAplicacoes(): Promise<AplicacaoAuditoria[]>
    cadastrarAplicacao(dados: NovaAplicacao): Promise<AplicacaoAuditoria>
    listarChaves(codigo: string): Promise<ChaveAuditoria[]>
    criarChave(codigo: string): Promise<ChaveCriada>
    revogarChave(codigo: string, idChave: string): Promise<void>
}

const TEMPO_LIMITE_MS = 5000

const esquemaAplicacao = z.object({
    code: z.string(),
    name: z.string(),
    active: z.boolean(),
    retentionDays: z.number(),
    createdAt: z.string(),
})

const esquemaChave = z.object({
    id: z.string(),
    prefix: z.string(),
    active: z.boolean(),
    createdAt: z.string(),
    lastUsedAt: z.string().nullish(),
    revokedAt: z.string().nullish(),
})

const esquemaChaveCriada = z.object({
    id: z.string(),
    application: z.string(),
    prefix: z.string(),
    key: z.string(),
    createdAt: z.string(),
})

const esquemaErro = z.object({ mensagem: z.string().optional() })

const traduzirAplicacao = (a: z.infer<typeof esquemaAplicacao>): AplicacaoAuditoria => ({
    codigo: a.code,
    nome: a.name,
    ativa: a.active,
    retencaoDias: a.retentionDays,
    criadaEm: a.createdAt,
})

const traduzirChave = (c: z.infer<typeof esquemaChave>): ChaveAuditoria => ({
    id: c.id,
    prefixo: c.prefix,
    ativa: c.active,
    criadaEm: c.createdAt,
    ultimoUsoEm: c.lastUsedAt ?? null,
    revogadaEm: c.revokedAt ?? null,
})

/** Mensagem (pt-BR) do serviço de auditoria para erros de entrada, sem expor nada interno. */
async function lerMensagemDeErro(resposta: Response, padrao: string): Promise<string> {
    const corpo = esquemaErro.safeParse(await resposta.json().catch(() => null))
    return (corpo.success && corpo.data.mensagem) || padrao
}

/**
 * Cliente da administração do serviço de auditoria. O token de admin fica só aqui (servidor):
 * nunca vai ao navegador, a URL e o token nunca são registrados em log, e o valor de uma chave criada
 * só passa pela resposta (não é logado nem guardado).
 */
export function criarClienteAdminAuditoria(urlBase: string, tokenAdmin: string): ClienteAdminAuditoria {
    const base = urlBase.replace(/\/+$/, '')

    async function chamar(metodo: string, caminho: string, corpo?: unknown): Promise<Response> {
        let resposta: Response
        try {
            resposta = await fetch(`${base}${caminho}`, {
                method: metodo,
                headers: {
                    authorization: `Bearer ${tokenAdmin}`,
                    accept: 'application/json',
                    ...(corpo === undefined ? {} : { 'content-type': 'application/json' }),
                },
                body: corpo === undefined ? undefined : JSON.stringify(corpo),
                signal: AbortSignal.timeout(TEMPO_LIMITE_MS),
            })
        } catch {
            throw new ErroHttp(502, 'Serviço de auditoria indisponível')
        }

        if ([400, 404, 409].includes(resposta.status)) {
            const mensagem = await lerMensagemDeErro(resposta, 'Requisição recusada pelo serviço de auditoria')
            throw new ErroHttp(resposta.status, mensagem)
        }
        if (!resposta.ok) {
            // inclui 401/403 (token errado) e 5xx: o painel só vê "indisponível"
            console.error(`Administração da auditoria respondeu ${resposta.status}`)
            throw new ErroHttp(502, 'Serviço de auditoria indisponível')
        }
        return resposta
    }

    async function lerJson<T extends z.ZodType>(resposta: Response, esquema: T): Promise<z.infer<T>> {
        const dados = esquema.safeParse(await resposta.json().catch(() => null))
        if (!dados.success) {
            console.error('Resposta inesperada da administração da auditoria')
            throw new ErroHttp(502, 'Resposta inesperada do serviço de auditoria')
        }
        return dados.data
    }

    const rotaChaves = (codigo: string) => `/v1/admin/applications/${encodeURIComponent(codigo)}/keys`

    return {
        async listarAplicacoes() {
            const dados = await lerJson(await chamar('GET', '/v1/admin/applications'), z.array(esquemaAplicacao))
            return dados.map(traduzirAplicacao)
        },
        async cadastrarAplicacao({ codigo, nome, retencaoDias }) {
            const corpo = { code: codigo, name: nome, ...(retencaoDias === undefined ? {} : { retentionDays: retencaoDias }) }
            return traduzirAplicacao(await lerJson(await chamar('POST', '/v1/admin/applications', corpo), esquemaAplicacao))
        },
        async listarChaves(codigo) {
            const dados = await lerJson(await chamar('GET', rotaChaves(codigo)), z.array(esquemaChave))
            return dados.map(traduzirChave)
        },
        async criarChave(codigo) {
            const c = await lerJson(await chamar('POST', rotaChaves(codigo)), esquemaChaveCriada)
            return { id: c.id, aplicacao: c.application, prefixo: c.prefix, valor: c.key, criadaEm: c.createdAt }
        },
        async revogarChave(codigo, idChave) {
            await chamar('DELETE', `${rotaChaves(codigo)}/${encodeURIComponent(idChave)}`)
        },
    }
}
