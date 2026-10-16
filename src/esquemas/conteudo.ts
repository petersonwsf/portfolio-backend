import { z } from 'zod'
import { CATEGORIAS_HABILIDADE, NIVEIS_HABILIDADE } from '../modelos/Habilidade'

const textoObrigatorio = (campo: string) => z.string().trim().min(1, `${campo} é obrigatório`).max(5000)
const urlOpcional = z.union([z.url('URL inválida'), z.literal('')]).optional()
const listaDeIds = z.array(z.string().regex(/^[a-f0-9]{24}$/i, 'Identificador inválido')).max(50).default([])

export const esquemaProjeto = z.object({
    nome: textoObrigatorio('Nome').max(120),
    categoria: textoObrigatorio('Categoria').max(60),
    ano: z.number().int().min(2000).max(2100),
    descricao: textoObrigatorio('Descrição'),
    tecnologias: listaDeIds,
    imagens: z.array(z.string().trim().min(1).max(2000)).max(30).default([]),
    urlCodigo: urlOpcional,
    urlPagina: urlOpcional,
})

export const esquemaExperiencia = z
    .object({
        categoria: textoObrigatorio('Categoria').max(60),
        empresa: textoObrigatorio('Empresa').max(120),
        cargo: textoObrigatorio('Cargo').max(120),
        descricao: textoObrigatorio('Descrição'),
        dataInicio: z.coerce.date(),
        dataFim: z.union([z.null(), z.coerce.date()]).optional(),
        imagem: z.string().trim().max(2000).optional(),
        tecnologias: listaDeIds,
        })
    .refine((dados) => !dados.dataFim || dados.dataFim >= dados.dataInicio, {
        message: 'A data de fim não pode ser anterior à data de início',
        path: ['dataFim'],
    })

export const esquemaHabilidade = z.object({
    nome: textoObrigatorio('Nome').max(80),
    categoria: z.enum(CATEGORIAS_HABILIDADE),
    imagem: z.string().trim().max(2000).optional(),
    nivel: z.enum(NIVEIS_HABILIDADE),
})
