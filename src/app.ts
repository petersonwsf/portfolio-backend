import cors from 'cors'
import express, { type Express } from 'express'
import helmet from 'helmet'
import type { Ambiente } from './config/env'
import { esquemaExperiencia, esquemaHabilidade, esquemaProjeto } from './esquemas/conteudo'
import { criarAutenticacao } from './middlewares/autenticar'
import { rotaNaoEncontrada, tratarErros } from './middlewares/tratarErros'
import { Experiencia } from './modelos/Experiencia'
import { Habilidade } from './modelos/Habilidade'
import { Projeto } from './modelos/Projeto'
import { criarRotasAutenticacao } from './rotas/autenticacao'
import { criarRotasContato } from './rotas/contato'
import { criarRotasCrud } from './rotas/criarRotasCrud'
import { criarRotasMensagens } from './rotas/mensagens'
import { criarRotasUploads } from './rotas/uploads'
import type { Armazenamento } from './servicos/armazenamento'
import type { ProvedorEmail } from './servicos/email/ProvedorEmail'
import { validarTecnologiasCadastradas } from './utils/tecnologias'

const POPULAR_TECNOLOGIAS = { caminho: 'tecnologias', selecionar: 'nome categoria imagem' }

/** Monta a aplicação Express (sem conectar ao banco nem abrir porta, para facilitar testes). */
export function criarApp(
    ambiente: Ambiente,
    armazenamento: Armazenamento,
    provedorEmail: ProvedorEmail | null = null
): Express {
    const app = express()
    const autenticar = criarAutenticacao(ambiente.JWT_SEGREDO)
    const origens = ambiente.ORIGENS_PERMITIDAS.split(',').map((origem) => origem.trim())

    app.disable('x-powered-by')
    // as imagens são servidas pelo S3 (outra origem); a API em si não precisa de CORP restritivo
    app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }))
    app.use(cors({ origin: origens }))
    app.use(express.json({ limit: '100kb' }))

    app.get('/api/saude', (_req, res) => {
        res.json({ status: 'ok' })
    })

    app.use('/api/autenticacao', criarRotasAutenticacao(ambiente))
    app.use('/api/contato', criarRotasContato({ provedorEmail, emailDestino: ambiente.EMAIL_DESTINO }))
    app.use('/api/mensagens', criarRotasMensagens(autenticar))
    app.use('/api/uploads',criarRotasUploads(armazenamento, autenticar))
    app.use(
        '/api/projetos',
        criarRotasCrud({
            modelo: Projeto,
            esquema: esquemaProjeto,
            nomeSingular: 'Projeto',
            autenticar,
            popular: POPULAR_TECNOLOGIAS,
            validarExtra: validarTecnologiasCadastradas,
        })
    )
    app.use(
        '/api/experiencias',
        criarRotasCrud({
            modelo: Experiencia,
            esquema: esquemaExperiencia,
            nomeSingular: 'Experiência',
            autenticar,
            popular: POPULAR_TECNOLOGIAS,
            validarExtra: validarTecnologiasCadastradas,
        })
    )
    app.use(
        '/api/habilidades',
        criarRotasCrud({ modelo: Habilidade, esquema: esquemaHabilidade, nomeSingular: 'Habilidade', autenticar })
    )

    app.use(rotaNaoEncontrada)
    app.use(tratarErros)
    return app
}
