import { model, Schema } from 'mongoose'
import { opcoesEsquema } from './comum'

export const CATEGORIAS_HABILIDADE = ['Frontend', 'Backend', 'DevOps', 'Dados', 'Outros'] as const
export type CategoriaHabilidade = (typeof CATEGORIAS_HABILIDADE)[number]

export interface IHabilidade {
    nome: string
    categoria: CategoriaHabilidade
    imagem?: string
    dominada: boolean
    ordem: number
}

const esquemaHabilidade = new Schema<IHabilidade>(
    {
        nome: { type: String, required: true, trim: true, unique: true },
        categoria: { type: String, enum: CATEGORIAS_HABILIDADE, required: true },
        imagem: { type: String, trim: true },
        dominada: { type: Boolean, default: false, index: true },
        ordem: { type: Number, default: 0 },
    },
    opcoesEsquema
)

export const Habilidade = model<IHabilidade>('Habilidade', esquemaHabilidade)
