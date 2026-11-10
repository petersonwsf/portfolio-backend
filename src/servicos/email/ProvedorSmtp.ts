import nodemailer, { type Transporter } from 'nodemailer'
import type { MensagemEmail, ProvedorEmail } from './ProvedorEmail'

export interface ConfigSmtp {
    host: string
    porta: number
    /** `true` usa TLS direto (porta 465); `false` usa STARTTLS quando disponível. */
    seguro: boolean
    usuario: string
    senha: string
    remetente: string
}

/** Provedor de e-mail via SMTP. */
export class ProvedorSmtp implements ProvedorEmail {
    private readonly transporte: Transporter

    constructor(private readonly config: ConfigSmtp) {
        this.transporte = nodemailer.createTransport({
            host: config.host,
            port: config.porta,
            secure: config.seguro,
            auth: { user: config.usuario, pass: config.senha },
        })
    }

    async enviar({ para, assunto, texto, responderPara }: MensagemEmail): Promise<void> {
        await this.transporte.sendMail({
            from: this.config.remetente,
            to: para,
            subject: assunto,
            text: texto,
            replyTo: responderPara,
        })
    }
}
