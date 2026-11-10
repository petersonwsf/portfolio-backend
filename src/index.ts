import { criarApp } from './app'
import { conectarBanco } from './config/banco'
import { carregarAmbiente } from './config/env'
import { criarArmazenamentoS3 } from './servicos/armazenamento'
import { criarProvedorEmail } from './servicos/email/criarProvedorEmail'
import type { ProvedorEmail } from './servicos/email/ProvedorEmail'

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

    let provedorEmail: ProvedorEmail | null = null
    try {
        provedorEmail = criarProvedorEmail(ambiente)
    } catch (erro) {
        // a API continua no ar; as mensagens de contato ficam salvas, mas sem aviso por e-mail
        console.warn('Aviso: envio de e-mail desativado.', erro instanceof Error ? erro.message : erro)
    }

    const app = criarApp(ambiente, armazenamento, provedorEmail)
    app.listen(ambiente.PORTA, () => {
        console.log(`API do portfólio em execução na porta ${ambiente.PORTA}`)
    })
}

iniciar().catch((erro: unknown) => {
    console.error(erro instanceof Error ? erro.message : erro)
    process.exit(1)
})
