import mongoose from 'mongoose'
import { conectarBanco } from '../config/banco'
import { carregarAmbiente } from '../config/env'
import { CATALOGO } from '../dados/catalogoHabilidades'
import { Habilidade, type CategoriaHabilidade } from '../modelos/Habilidade'

/**
 * Popula o catálogo de habilidades. Idempotente: só insere o que ainda não existe
 * (nunca altera `dominada`, imagem ou ordem do que já está cadastrado).
 */
async function semear(): Promise<void> {
    const ambiente = carregarAmbiente()
    await conectarBanco(ambiente.MONGODB_URI)
    await Habilidade.init()

    const vistos = new Set<string>()
    const operacoes = (Object.entries(CATALOGO) as [CategoriaHabilidade, string[]][]).flatMap(([categoria, nomes]) =>
        nomes
            .filter((nome) => {
                if (vistos.has(nome)) return false
                vistos.add(nome)
                return true
            })
            .map((nome) => ({
                updateOne: {
                    filter: { nome },
                    update: { $setOnInsert: { nome, categoria, dominada: false, ordem: 0 } },
                    upsert: true,
                },
            }))
    )

    const resultado = await Habilidade.bulkWrite(operacoes)
    console.log(`Catálogo: ${resultado.upsertedCount} novas habilidades, ${operacoes.length - resultado.upsertedCount} já existiam.`)
    await mongoose.disconnect()
}

semear().catch((erro: unknown) => {
    console.error(erro instanceof Error ? erro.message : erro)
    process.exit(1)
})
