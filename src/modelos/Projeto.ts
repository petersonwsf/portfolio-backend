import { model, Schema, type Types } from 'mongoose'
import { opcoesEsquema } from './comum'

export interface IProjeto {
    nome: string
    categoria: string
    ano: number
    descricao: string
    tecnologias: Types.ObjectId[]
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
        tecnologias: { type: [{ type: Schema.Types.ObjectId, ref: 'Habilidade' }], default: [] },
        imagens: { type: [String], default: [] },
        urlCodigo: { type: String, trim: true },
        urlPagina: { type: String, trim: true },
        ordem: { type: Number, default: 0 },
    },
    opcoesEsquema
)

export const Projeto = model<IProjeto>('Projeto', esquemaProjeto)
