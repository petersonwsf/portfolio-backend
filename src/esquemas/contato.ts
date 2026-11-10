import { z } from 'zod'

const semQuebraDeLinha = /^[^\r\n]*$/

export const esquemaContato = z.object({
    nome: z.string().trim().min(2, 'Informe seu nome').max(100).regex(semQuebraDeLinha, 'Nome inválido'),
    email: z.email('Informe um e-mail válido').max(200),
    assunto: z.string().trim().min(3, 'Informe o assunto').max(150).regex(semQuebraDeLinha, 'Assunto inválido'),
    mensagem: z.string().trim().min(10, 'Escreva ao menos 10 caracteres').max(5000),
})

export type DadosContato = z.infer<typeof esquemaContato>
