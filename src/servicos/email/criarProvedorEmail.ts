import type { Ambiente } from '../../config/env'
import type { ProvedorEmail } from './ProvedorEmail'
import { ProvedorResend } from './ProvedorResend'
import { ProvedorSmtp } from './ProvedorSmtp'

type ConfigEmail = Pick<
    Ambiente,
    | 'EMAIL_PROVEDOR'
    | 'EMAIL_REMETENTE'
    | 'RESEND_API_KEY'
    | 'SMTP_HOST'
    | 'SMTP_PORTA'
    | 'SMTP_SEGURO'
    | 'SMTP_USUARIO'
    | 'SMTP_SENHA'
>

/** Escolhe o provedor de e-mail conforme `EMAIL_PROVEDOR`. Lança erro se a configuração estiver incompleta. */
export function criarProvedorEmail(config: ConfigEmail): ProvedorEmail {
    switch (config.EMAIL_PROVEDOR) {
        case 'resend': {
            const { RESEND_API_KEY, EMAIL_REMETENTE } = config
            if (!RESEND_API_KEY || !EMAIL_REMETENTE) {
                throw new Error('Configuração do Resend incompleta (RESEND_API_KEY e EMAIL_REMETENTE)')
            }
            return new ProvedorResend({ chaveApi: RESEND_API_KEY, remetente: EMAIL_REMETENTE })
        }
        case 'smtp': {
            const { SMTP_HOST, SMTP_USUARIO, SMTP_SENHA } = config
            if (!SMTP_HOST || !SMTP_USUARIO || !SMTP_SENHA) {
                throw new Error('Configuração SMTP incompleta (SMTP_HOST, SMTP_USUARIO e SMTP_SENHA)')
            }
            return new ProvedorSmtp({
                host: SMTP_HOST,
                porta: config.SMTP_PORTA,
                seguro: config.SMTP_SEGURO,
                usuario: SMTP_USUARIO,
                senha: SMTP_SENHA,
                remetente: config.EMAIL_REMETENTE ?? SMTP_USUARIO,
            })
        }
    }
}
