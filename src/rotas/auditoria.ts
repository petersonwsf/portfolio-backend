import { type RequestHandler, Router } from 'express'
import { esquemaConsultaEventos } from '../esquemas/auditoria'
import { Projeto } from '../modelos/Projeto'
import type { ClienteAuditoria } from '../servicos/auditoria'
import { ErroHttp } from '../utils/erros'

/** Dados do projeto necessários para consultar a auditoria. */
export interface ProjetoParaAuditoria {
    codigoAplicacao?: string | null
}

export type BuscarProjeto = (id: string) => Promise<ProjetoParaAuditoria | null>

export interface DependenciasAuditoria {
    /** `null` quando o serviço de auditoria não está configurado (AUDITORIA_URL e AUDITORIA_TOKEN_LEITURA). */
    cliente: ClienteAuditoria | null
    /** Injetável nos testes; por padrão lê o projeto no MongoDB. */
    buscarProjeto?: BuscarProjeto
}

const buscarProjetoNoBanco: BuscarProjeto = (id) => Projeto.findById(id).select('codigoAplicacao').lean()

/**
 * Consulta de auditoria dos projetos (somente leitura, exclusiva do admin).
 * O navegador nunca fala com o serviço de auditoria: esta rota é o intermediário e guarda a credencial de leitura.
 */
export function criarRotasAuditoria(autenticar: RequestHandler, dependencias: DependenciasAuditoria): Router {
    const roteador = Router()
    const buscarProjeto = dependencias.buscarProjeto ?? buscarProjetoNoBanco
    roteador.use(autenticar)

    roteador.get('/eventos', async (req, res) => {
        const consulta = esquemaConsultaEventos.safeParse(req.query)
        if (!consulta.success) {
            const detalhes = consulta.error.issues.map((item) => ({ campo: item.path.join('.'), mensagem: item.message }))
            throw new ErroHttp(400, 'Parâmetros inválidos', detalhes)
        }
        if (!dependencias.cliente) {
            throw new ErroHttp(503, 'A auditoria não está configurada neste ambiente')
        }

        const { projetoId, ...filtros } = consulta.data
        const projeto = await buscarProjeto(projetoId)
        if (!projeto) throw new ErroHttp(404, 'Projeto não encontrado')
        if (!projeto.codigoAplicacao) {
            throw new ErroHttp(422, 'Este projeto não tem código de aplicação. Defina o código na edição do projeto.')
        }

        res.json(await dependencias.cliente.listarEventos({ aplicacao: projeto.codigoAplicacao, ...filtros }))
    })

    return roteador
}
