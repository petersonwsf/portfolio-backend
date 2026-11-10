import { Router } from 'express'
import { type DadosContato, esquemaContato } from '../esquemas/contato'
import { limitarTentativas } from '../middlewares/limitarTentativas'
import { validarCorpo } from '../middlewares/validar'
import { Mensagem } from '../modelos/Mensagem'
import type { ProvedorEmail } from '../servicos/email/ProvedorEmail'

interface OpcoesContato {
    provedorEmail: ProvedorEmail | null
    emailDestino?: string
}

/** Rota pública do formulário de contato: salva a mensagem e avisa o dono por e-mail. */
export function criarRotasContato({ provedorEmail, emailDestino }: OpcoesContato): Router {
    const roteador = Router()

    roteador.post('/', limitarTentativas(5, 10 * 60 * 1000), validarCorpo(esquemaContato), async (req, res) => {
        const dados = req.body as DadosContato
        // salva antes de enviar: se o e-mail falhar, a mensagem não se perde
        const registro = await Mensagem.create(dados)

        if (provedorEmail && emailDestino) {
            try {
                await provedorEmail.enviar({
                    para: emailDestino,
                    assunto: `[Portfólio] ${dados.assunto}`,
                    texto: `De: ${dados.nome} <${dados.email}>\n\n${dados.mensagem}`,
                    responderPara: dados.email,
                })
                registro.emailEnviado = true
                await registro.save()
            } catch (erro) {
                console.error('Falha ao enviar e-mail de contato:', erro instanceof Error ? erro.message : 'erro desconhecido')
            }
        }

        res.status(201).json({ mensagem: 'Mensagem enviada com sucesso!' })
    })

    return roteador
}
