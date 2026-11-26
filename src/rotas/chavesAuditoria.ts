import { type RequestHandler, Router } from 'express'
import type { ZodType } from 'zod'
import { esquemaChaveDaAplicacao, esquemaCodigoAplicacao, esquemaNovaAplicacao } from '../esquemas/chavesAuditoria'
import type { ClienteAdminAuditoria } from '../servicos/administracaoAuditoria'
import { ErroHttp } from '../utils/erros'

function validar<T>(esquema: ZodType<T>, entrada: unknown): T {
    const resultado = esquema.safeParse(entrada)
    if (!resultado.success) {
        const detalhes = resultado.error.issues.map((item) => ({ campo: item.path.join('.'), mensagem: item.message }))
        throw new ErroHttp(400, 'Dados inválidos', detalhes)
    }
    return resultado.data
}

/**
 * Administração das aplicações e chaves de API do serviço de auditoria (exclusiva do admin).
 * Repassa ao serviço usando o token de administração, que fica só no servidor. O valor de uma chave criada
 * é devolvido uma única vez e nunca é registrado em log nem guardado.
 */
export function criarRotasChavesAuditoria(autenticar: RequestHandler, cliente: ClienteAdminAuditoria | null): Router {
    const roteador = Router()
    roteador.use(autenticar)
    roteador.use((_req, _res, proximo) => {
        if (!cliente) throw new ErroHttp(503, 'A administração da auditoria não está configurada neste ambiente')
        proximo()
    })
    const admin = () => cliente as ClienteAdminAuditoria

    roteador.get('/', async (_req, res) => {
        res.json(await admin().listarAplicacoes())
    })

    roteador.post('/', async (req, res) => {
        const dados = validar(esquemaNovaAplicacao, req.body)
        res.status(201).json(await admin().cadastrarAplicacao(dados))
    })

    roteador.get('/:codigo/chaves', async (req, res) => {
        const { codigo } = validar(esquemaCodigoAplicacao, req.params)
        res.json(await admin().listarChaves(codigo))
    })

    roteador.post('/:codigo/chaves', async (req, res) => {
        const { codigo } = validar(esquemaCodigoAplicacao, req.params)
        // o valor da chave aparece só nesta resposta: sem cache no navegador nem em intermediários
        res.set('Cache-Control', 'no-store')
        res.status(201).json(await admin().criarChave(codigo))
    })

    roteador.delete('/:codigo/chaves/:idChave', async (req, res) => {
        const { codigo, idChave } = validar(esquemaChaveDaAplicacao, req.params)
        await admin().revogarChave(codigo, idChave)
        res.status(204).end()
    })

    return roteador
}
