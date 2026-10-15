import { model, Schema, type Types } from 'mongoose'
import { opcoesEsquema } from './comum'

export interface IExperiencia {
    empresa: string
    cargo: string
    descricao: string
    dataInicio: Date
    dataFim?: Date | null
    imagem?: string
    tecnologias: Types.ObjectId[]
    ordem: number
}

const esquemaExperiencia = new Schema<IExperiencia>(
    {
        empresa: { type: String, required: true, trim: true },
        cargo: { type: String, required: true, trim: true },
        descricao: { type: String, required: true },
        dataInicio: { type: Date, required: true },
        dataFim: { type: Date },
        imagem: { type: String, trim: true },
        tecnologias: { type: [{ type: Schema.Types.ObjectId, ref: 'Habilidade' }], default: [] },
        ordem: { type: Number, default: 0 },
    },
    opcoesEsquema
)

export const Experiencia = model<IExperiencia>('Experiencia', esquemaExperiencia)
