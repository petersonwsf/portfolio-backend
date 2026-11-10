import { describe, expect, it } from 'vitest'
import { criarProvedorEmail } from '../src/servicos/email/criarProvedorEmail'
import { ProvedorResend } from '../src/servicos/email/ProvedorResend'
import { ProvedorSmtp } from '../src/servicos/email/ProvedorSmtp'

const base = {
    EMAIL_PROVEDOR: 'smtp' as 'smtp' | 'resend',
    SMTP_PORTA: 587,
    SMTP_SEGURO: false,
}

describe('criarProvedorEmail', () => {
    it('cria o provedor Resend com a configuração completa', () => {
        const provedor = criarProvedorEmail({
            ...base,
            EMAIL_PROVEDOR: 'resend',
            RESEND_API_KEY: 're_teste',
            EMAIL_REMETENTE: 'Portfólio <contato@exemplo.com>',
        })
        expect(provedor).toBeInstanceOf(ProvedorResend)
    })

    it('recusa Resend sem chave ou remetente', () => {
        expect(() => criarProvedorEmail({ ...base, EMAIL_PROVEDOR: 'resend' })).toThrow(/Resend/)
    })

    it('cria o provedor SMTP com a configuração completa', () => {
        const provedor = criarProvedorEmail({ ...base, EMAIL_PROVEDOR: 'smtp', SMTP_HOST: 'smtp.exemplo.com', SMTP_USUARIO: 'u', SMTP_SENHA: 's' })
        expect(provedor).toBeInstanceOf(ProvedorSmtp)
    })

    it('recusa configuração SMTP incompleta', () => {
        expect(() => criarProvedorEmail({ ...base, EMAIL_PROVEDOR: 'smtp' })).toThrow(/SMTP/)
    })
})
