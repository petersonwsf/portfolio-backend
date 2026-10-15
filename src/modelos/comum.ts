import type { SchemaOptions } from 'mongoose'

/** Opções comuns: timestamps e serialização limpa (`id` em vez de `_id`, sem `__v`). */
export const opcoesEsquema: SchemaOptions = {
    timestamps: true,
    toJSON: {
        virtuals: true,
        versionKey: false,
        transform: (_documento, retorno: Record<string, unknown>) => {
            delete retorno._id
            return retorno
        },
    },
}
