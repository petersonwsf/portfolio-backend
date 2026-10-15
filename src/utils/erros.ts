/** Erro de aplicação com status HTTP e mensagem segura para o cliente. */
export class ErroHttp extends Error {
    constructor(
        public readonly status: number,
        mensagem: string,
        public readonly detalhes?: unknown
    ) {
        super(mensagem)
    }
}
