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
import { criarRotasCrud } from './rotas/criarRotasCrud'

/** Monta a aplicação Express (sem conectar ao banco nem abrir porta, para facilitar testes). */
export function criarApp(ambiente: Ambiente): Express {
    const app = express()
    const autenticar = criarAutenticacao(ambiente.JWT_SEGREDO)
    const origens = ambiente.ORIGENS_PERMITIDAS.split(',').map((origem) => origem.trim())

    app.disable('x-powered-by')
    app.use(helmet())
    app.use(cors({ origin: origens }))
    app.use(express.json({ limit: '100kb' }))

    app.get('/api/saude', (_req, res) => {
        res.json({ status: 'ok' })
    })

    app.use('/api/autenticacao', criarRotasAutenticacao(ambiente))
    app.use(
        '/api/projetos',
        criarRotasCrud({ modelo: Projeto, esquema: esquemaProjeto, nomeSingular: 'Projeto', autenticar })
    )
    app.use(
        '/api/experiencias',
        criarRotasCrud({ modelo: Experiencia, esquema: esquemaExperiencia, nomeSingular: 'Experiência', autenticar })
    )
    app.use(
        '/api/habilidades',
        criarRotasCrud({ modelo: Habilidade, esquema: esquemaHabilidade, nomeSingular: 'Habilidade', autenticar })
    )

    app.use(rotaNaoEncontrada)
    app.use(tratarErros)
    return app
}
