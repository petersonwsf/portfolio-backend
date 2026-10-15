import mongoose from 'mongoose'

/** Conecta ao MongoDB (que roda via Docker — ver docker-compose.yml). */
export async function conectarBanco(uri: string): Promise<void> {
    try {
        await mongoose.connect(uri, { serverSelectionTimeoutMS: 5000 })
    } catch (erro) {
        throw new Error(
            'Não foi possível conectar ao MongoDB. Verifique se o container está em execução (docker compose ps).',
            { cause: erro }
        )
    }
}
