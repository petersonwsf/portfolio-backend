import { model, Schema } from 'mongoose'
import { opcoesEsquema } from './comum'

export const CATEGORIAS_HABILIDADE = ['Frontend', 'Backend', 'DevOps', 'Dados', 'Outros'] as const
export type CategoriaHabilidade = (typeof CATEGORIAS_HABILIDADE)[number]

export const NIVEIS_HABILIDADE = ['Básico', 'Intermediário', 'Avançado'] as const
export type NivelHabilidade = (typeof NIVEIS_HABILIDADE)[number]

export interface IHabilidade {
    nome: string
    categoria: CategoriaHabilidade
    imagem?: string
    nivel: NivelHabilidade
    ordem: number
}

const esquemaHabilidade = new Schema<IHabilidade>(
    {
        nome: { type: String, required: true, trim: true, unique: true },
        categoria: { type: String, enum: CATEGORIAS_HABILIDADE, required: true },
        imagem: { type: String, trim: true },
        nivel: { type: String, enum: NIVEIS_HABILIDADE, required: true },
        ordem: { type: Number, default: 0 },
    },
    opcoesEsquema
)

export const Habilidade = model<IHabilidade>('Habilidade', esquemaHabilidade)
