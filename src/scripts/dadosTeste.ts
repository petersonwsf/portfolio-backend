import mongoose from 'mongoose'
import { conectarBanco } from '../config/banco'
import { carregarAmbiente } from '../config/env'
import { Experiencia } from '../modelos/Experiencia'
import { Habilidade, type CategoriaHabilidade, type NivelHabilidade } from '../modelos/Habilidade'
import { Projeto } from '../modelos/Projeto'

/**
 * Dados fictícios para testar a aplicação localmente.
 *
 *   npm run dados-teste           -> insere (idempotente)
 *   npm run dados-teste -- --limpar -> remove somente o que este script criou
 *
 * Tudo o que é criado aqui carrega a marca `seed-teste` na imagem (SVG embutido), o que permite
 * limpar sem tocar nos dados reais. Só roda contra um MongoDB local.
 */
const MARCA = 'seed-teste'

const svg = (texto: string, cor: string, largura = 96, altura = 96): string => {
    const corpo =
        `<svg xmlns="http://www.w3.org/2000/svg" width="${largura}" height="${altura}" viewBox="0 0 ${largura} ${altura}">` +
        `<!--${MARCA}--><rect width="100%" height="100%" rx="${Math.min(largura, altura) / 6}" fill="${cor}"/>` +
        `<text x="50%" y="54%" font-family="Arial" font-weight="700" font-size="${Math.round(altura / 2.4)}" ` +
        `fill="#fff" text-anchor="middle" dominant-baseline="middle">${texto}</text></svg>`
    return `data:image/svg+xml;utf8,${encodeURIComponent(corpo)}`
}

interface HabilidadeTeste {
    nome: string
    categoria: CategoriaHabilidade
    nivel: NivelHabilidade
    sigla: string
    cor: string
}

const HABILIDADES: HabilidadeTeste[] = [
    { nome: 'React', categoria: 'Frontend', nivel: 'Avançado', sigla: 'Re', cor: '#0a84df' },
    { nome: 'TypeScript', categoria: 'Frontend', nivel: 'Avançado', sigla: 'TS', cor: '#3178c6' },
    { nome: 'Tailwind CSS', categoria: 'Frontend', nivel: 'Intermediário', sigla: 'Tw', cor: '#0ea5a4' },
    { nome: 'Next.js', categoria: 'Frontend', nivel: 'Intermediário', sigla: 'Nx', cor: '#222222' },
    { nome: 'Node.js', categoria: 'Backend', nivel: 'Avançado', sigla: 'No', cor: '#3c873a' },
    { nome: 'NestJS', categoria: 'Backend', nivel: 'Intermediário', sigla: 'Ne', cor: '#e0234e' },
    { nome: 'Java', categoria: 'Backend', nivel: 'Intermediário', sigla: 'Jv', cor: '#d9534f' },
    { nome: 'Docker', categoria: 'DevOps', nivel: 'Intermediário', sigla: 'Dk', cor: '#2496ed' },
    { nome: 'GitHub Actions', categoria: 'DevOps', nivel: 'Básico', sigla: 'GA', cor: '#4b5563' },
    { nome: 'AWS', categoria: 'DevOps', nivel: 'Básico', sigla: 'AW', cor: '#ff9900' },
    { nome: 'MongoDB', categoria: 'Dados', nivel: 'Intermediário', sigla: 'Mg', cor: '#47a248' },
    { nome: 'PostgreSQL', categoria: 'Dados', nivel: 'Intermediário', sigla: 'Pg', cor: '#336791' },
    { nome: 'Power BI', categoria: 'Dados', nivel: 'Básico', sigla: 'PB', cor: '#f2c811' },
    { nome: 'Stripe', categoria: 'Outros', nivel: 'Básico', sigla: 'St', cor: '#635bff' },
    { nome: 'Figma', categoria: 'Outros', nivel: 'Básico', sigla: 'Fg', cor: '#a259ff' },
]

interface ProjetoTeste {
    nome: string
    categoria: string
    ano: number
    descricao: string
    tecnologias: string[]
    cor: string
    urlPagina?: string
    urlCodigo?: string
}

const PROJETOS: ProjetoTeste[] = [
    {
        nome: 'Loja Virtual',
        categoria: 'E-commerce',
        ano: 2025,
        descricao:
            'Loja virtual completa com catálogo, carrinho, checkout com Stripe e painel administrativo. ' +
            'Inclui controle de estoque, cupons de desconto e envio de e-mails transacionais.',
        tecnologias: ['React', 'TypeScript', 'Node.js', 'MongoDB', 'Stripe', 'Docker'],
        cor: '#0c3bb0',
        urlPagina: 'https://example.com/loja',
        urlCodigo: 'https://github.com/exemplo/loja-virtual',
    },
    {
        nome: 'Jogo da Memória',
        categoria: 'Jogo',
        ano: 2023,
        descricao: 'Jogo da memória com níveis de dificuldade, ranking local e animações em CSS.',
        tecnologias: ['React', 'Tailwind CSS'],
        cor: '#7c3aed',
        urlCodigo: 'https://github.com/exemplo/jogo-memoria',
    },
    {
        nome: 'Dashboard de Vendas',
        categoria: 'Dashboard',
        ano: 2024,
        descricao:
            'Dashboard analítico com indicadores de vendas por período, região e produto, ' +
            'consumindo dados de uma API REST e exibindo gráficos interativos.',
        tecnologias: ['Next.js', 'TypeScript', 'PostgreSQL', 'Power BI'],
        cor: '#0f766e',
        urlPagina: 'https://example.com/dashboard',
    },
    {
        nome: 'API de Reservas',
        categoria: 'API',
        ano: 2024,
        descricao: 'API REST para reservas de hotel com autenticação JWT, validação e testes automatizados.',
        tecnologias: ['NestJS', 'Java', 'PostgreSQL', 'Docker', 'GitHub Actions'],
        cor: '#b45309',
        urlCodigo: 'https://github.com/exemplo/api-reservas',
    },
]

interface ExperienciaTeste {
    categoria: string
    empresa: string
    cargo: string
    descricao: string
    dataInicio: Date
    dataFim?: Date
    tecnologias: string[]
    sigla: string
    cor: string
}

const EXPERIENCIAS: ExperienciaTeste[] = [
    {
        categoria: 'Emprego',
        empresa: 'Empresa Exemplo Ltda.',
        cargo: 'Desenvolvedor Full-Stack',
        descricao:
            'Desenvolvimento de funcionalidades de ponta a ponta em uma plataforma web, ' +
            'com foco em qualidade de código, testes e entregas contínuas.',
        dataInicio: new Date('2025-03-01T00:00:00.000Z'),
        tecnologias: ['React', 'TypeScript', 'Node.js', 'MongoDB', 'Docker'],
        sigla: 'EE',
        cor: '#0c3bb0',
    },
    {
        categoria: 'Estágio',
        empresa: 'Laboratório de Software',
        cargo: 'Estagiário de Desenvolvimento',
        descricao: 'Manutenção de sistemas internos e criação de relatórios com apoio da equipe sênior.',
        dataInicio: new Date('2024-02-01T00:00:00.000Z'),
        dataFim: new Date('2025-02-28T00:00:00.000Z'),
        tecnologias: ['Java', 'PostgreSQL', 'Power BI'],
        sigla: 'LS',
        cor: '#0f766e',
    },
    {
        categoria: 'Monitoria',
        empresa: 'Universidade Federal',
        cargo: 'Monitor de Programação',
        descricao: 'Apoio a turmas de introdução à programação, com plantões de dúvidas e correção de listas.',
        dataInicio: new Date('2023-08-01T00:00:00.000Z'),
        dataFim: new Date('2024-01-31T00:00:00.000Z'),
        tecnologias: ['Java'],
        sigla: 'UF',
        cor: '#b45309',
    },
]

/** Remove chaves com valor `undefined` (campos opcionais ausentes). */
const semUndefined = <T extends Record<string, unknown>>(objeto: T): T =>
    Object.fromEntries(Object.entries(objeto).filter(([, valor]) => valor !== undefined)) as T

const eBancoLocal = (uri: string): boolean => /@?(localhost|127\.0\.0\.1)(:\d+)?\//.test(uri)

async function limpar(): Promise<void> {
    const marcados = { $regex: MARCA }
    const projetos = await Projeto.deleteMany({ imagens: marcados })
    const experiencias = await Experiencia.deleteMany({ imagem: marcados })
    const habilidades = await Habilidade.deleteMany({ imagem: marcados })
    console.log(
        `Removidos: ${projetos.deletedCount} projetos, ${experiencias.deletedCount} experiências, ` +
            `${habilidades.deletedCount} habilidades de teste.`
    )
}

async function inserir(): Promise<void> {
    await Habilidade.init()

    // habilidades: cria só as que ainda não existem (não altera as suas)
    await Habilidade.bulkWrite(
        HABILIDADES.map((item) => ({
            updateOne: {
                filter: { nome: item.nome },
                update: {
                    $setOnInsert: {
                        nome: item.nome,
                        categoria: item.categoria,
                        nivel: item.nivel,
                        imagem: svg(item.sigla, item.cor),
                    },
                },
                upsert: true,
            },
        }))
    )

    const todas = await Habilidade.find({ nome: { $in: HABILIDADES.map((item) => item.nome) } })
    const idPorNome = new Map(todas.map((habilidade) => [habilidade.nome, habilidade._id]))
    const ids = (nomes: string[]) =>
        nomes.map((nome) => idPorNome.get(nome)).filter((id): id is NonNullable<typeof id> => id !== undefined)

    for (const projeto of PROJETOS) {
        const capa = (rotulo: string, cor: string) => svg(rotulo, cor, 640, 400)
        await Projeto.updateOne(
            { nome: projeto.nome },
            {
                $setOnInsert: semUndefined({
                    nome: projeto.nome,
                    categoria: projeto.categoria,
                    ano: projeto.ano,
                    descricao: projeto.descricao,
                    tecnologias: ids(projeto.tecnologias),
                    imagens: [
                        capa(projeto.nome.slice(0, 2).toUpperCase(), projeto.cor),
                        capa('Tela 2', '#374151'),
                        capa('Tela 3', '#1f2937'),
                    ],
                    urlPagina: projeto.urlPagina,
                    urlCodigo: projeto.urlCodigo,
                }),
            },
            { upsert: true }
        )
    }

    for (const experiencia of EXPERIENCIAS) {
        await Experiencia.updateOne(
            { empresa: experiencia.empresa, cargo: experiencia.cargo },
            {
                $setOnInsert: semUndefined({
                    categoria: experiencia.categoria,
                    empresa: experiencia.empresa,
                    cargo: experiencia.cargo,
                    descricao: experiencia.descricao,
                    dataInicio: experiencia.dataInicio,
                    dataFim: experiencia.dataFim,
                    imagem: svg(experiencia.sigla, experiencia.cor, 240, 160),
                    tecnologias: ids(experiencia.tecnologias),
                }),
            },
            { upsert: true }
        )
    }

    console.log(
        `Dados de teste prontos: ${HABILIDADES.length} habilidades, ${PROJETOS.length} projetos, ` +
            `${EXPERIENCIAS.length} experiências. (Para remover: npm run dados-teste -- --limpar)`
    )
}

async function executar(): Promise<void> {
    const ambiente = carregarAmbiente()
    if (!eBancoLocal(ambiente.MONGODB_URI)) {
        throw new Error('Recusado: este script só roda contra um MongoDB local (localhost/127.0.0.1).')
    }

    await conectarBanco(ambiente.MONGODB_URI)
    try {
        if (process.argv.includes('--limpar')) await limpar()
        else await inserir()
    } finally {
        await mongoose.disconnect()
    }
}

executar().catch((erro: unknown) => {
    console.error(erro instanceof Error ? erro.message : erro)
    process.exit(1)
})
