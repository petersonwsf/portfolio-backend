import { model, Schema } from 'mongoose'
import { opcoesEsquema } from './comum'

export interface IMensagem {
    nome: string
    email: string
    assunto: string
    mensagem: string
    lida: boolean
    /** Se o e-mail de aviso foi entregue ao provedor (a mensagem fica salva de qualquer forma). */
    emailEnviado: boolean
}

const esquemaMensagem = new Schema<IMensagem>(
    {
        nome: { type: String, required: true, trim: true },
        email: { type: String, required: true, trim: true },
        assunto: { type: String, required: true, trim: true },
        mensagem: { type: String, required: true, trim: true },
        lida: { type: Boolean, default: false },
        emailEnviado: { type: Boolean, default: false },
    },
    opcoesEsquema
)

export const Mensagem = model<IMensagem>('Mensagem', esquemaMensagem)
