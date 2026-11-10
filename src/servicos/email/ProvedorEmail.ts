/** Dados de um e-mail a ser enviado. */
export interface MensagemEmail {
    para: string
    assunto: string
    texto: string
    /** Endereço para onde vão as respostas (ex.: o visitante que preencheu o formulário). */
    responderPara?: string
}

/**
 * Estratégia de envio de e-mail (padrão Strategy).
 * Para trocar de provedor, implemente esta interface e registre em `criarProvedorEmail`.
 */
export interface ProvedorEmail {
    enviar(mensagem: MensagemEmail): Promise<void>
}
