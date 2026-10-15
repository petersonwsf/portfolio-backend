import type { ErrorRequestHandler, RequestHandler } from 'express'
import { ErroHttp } from '../utils/erros'

export const rotaNaoEncontrada: RequestHandler = (_req, _res, next) => {
    next(new ErroHttp(404, 'Rota não encontrada'))
}

/** Converte erros em respostas JSON, sem vazar detalhes internos. */
export const tratarErros: ErrorRequestHandler = (erro, _req, res, _next) => {
    if (erro instanceof ErroHttp) {
        res.status(erro.status).json({ mensagem: erro.message, detalhes: erro.detalhes })
        return
    }
    if (erro instanceof SyntaxError && 'body' in erro) {
        res.status(400).json({ mensagem: 'JSON inválido' })
        return
    }
    console.error('Erro inesperado:', erro instanceof Error ? erro.message : erro)
    res.status(500).json({ mensagem: 'Erro interno do servidor' })
}
