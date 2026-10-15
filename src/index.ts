import { criarApp } from './app'
import { conectarBanco } from './config/banco'
import { carregarAmbiente } from './config/env'
import { criarArmazenamentoS3 } from './servicos/armazenamento'

async function iniciar(): Promise<void> {
    const ambiente = carregarAmbiente()
    await conectarBanco(ambiente.MONGODB_URI)

    const armazenamento = criarArmazenamentoS3(ambiente)
    try {
        await armazenamento.prepararBucket()
    } catch (erro) {
        // a API continua no ar; apenas uploads/imagens dependem do armazenamento
        console.warn(
            'Aviso: não foi possível preparar o bucket S3 (RustFS em execução? docker compose ps).',
            erro instanceof Error ? erro.message : erro
        )
    }

    const app = criarApp(ambiente, armazenamento)
    app.listen(ambiente.PORTA, () => {
        console.log(`API do portfólio em execução na porta ${ambiente.PORTA}`)
    })
}

iniciar().catch((erro: unknown) => {
    console.error(erro instanceof Error ? erro.message : erro)
    process.exit(1)
})
