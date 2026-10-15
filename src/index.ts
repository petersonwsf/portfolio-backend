import { criarApp } from './app'
import { conectarBanco } from './config/banco'
import { carregarAmbiente } from './config/env'

async function iniciar(): Promise<void> {
    const ambiente = carregarAmbiente()
    await conectarBanco(ambiente.MONGODB_URI)

    const app = criarApp(ambiente)
    app.listen(ambiente.PORTA, () => {
        console.log(`API do portfólio em execução na porta ${ambiente.PORTA}`)
    })
}

iniciar().catch((erro: unknown) => {
    console.error(erro instanceof Error ? erro.message : erro)
    process.exit(1)
})
