import { model, Schema } from 'mongoose'
import { opcoesEsquema } from './comum'

export interface IProjeto {
    nome: string
    categoria: string
    ano: number
    descricao: string
    tecnologias: string[]
    imagens: string[]
    urlCodigo?: string
    urlPagina?: string
    ordem: number
}

const esquemaProjeto = new Schema<IProjeto>(
    {
        nome: { type: String, required: true, trim: true },
        categoria: { type: String, required: true, trim: true },
        ano: { type: Number, required: true },
        descricao: { type: String, required: true },
        tecnologias: { type: [String], default: [] },
        imagens: { type: [String], default: [] },
        urlCodigo: { type: String, trim: true },
        urlPagina: { type: String, trim: true },
        ordem: { type: Number, default: 0 },
    },
    opcoesEsquema
)

export const Projeto = model<IProjeto>('Projeto', esquemaProjeto)
