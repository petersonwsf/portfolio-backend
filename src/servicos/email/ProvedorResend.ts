import type { MensagemEmail, ProvedorEmail } from './ProvedorEmail'

const URL_API_RESEND = 'https://api.resend.com/emails'

export interface ConfigResend {
    chaveApi: string
    /** Remetente de um domínio verificado no Resend (ex.: `Portfólio <contato@seudominio.com>`). */
    remetente: string
}

/** Provedor de e-mail via API HTTP do Resend (sem dependências extras). */
export class ProvedorResend implements ProvedorEmail {
    constructor(private readonly config: ConfigResend) {}

    async enviar({ para, assunto, texto, responderPara }: MensagemEmail): Promise<void> {
        const resposta = await fetch(URL_API_RESEND, {
            method: 'POST',
            headers: {
                Authorization: `Bearer ${this.config.chaveApi}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                from: this.config.remetente,
                to: [para],
                subject: assunto,
                text: texto,
                reply_to: responderPara,
            }),
            signal: AbortSignal.timeout(10_000),
        })

        if (!resposta.ok) {
            const corpo = (await resposta.json().catch(() => null)) as { message?: string } | null
            throw new Error(`Resend respondeu ${resposta.status}: ${corpo?.message ?? 'erro desconhecido'}`)
        }
    }
}
