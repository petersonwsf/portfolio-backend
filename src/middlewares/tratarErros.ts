import type { ErrorRequestHandler, RequestHandler } from 'express'
import { MulterError } from 'multer'
import { ErroHttp } from '../utils/erros'

export const rotaNaoEncontrada: RequestHandler = (_req, _res, next) => {
    next(new ErroHttp(404, 'Rota não encontrada'))
}

const erroDeChaveDuplicada = (erro: unknown): boolean =>
    typeof erro === 'object' && erro !== null && 'code' in erro && (erro as { code: unknown }).code === 11000

/** Converte erros em respostas JSON, sem vazar detalhes internos. */
export const tratarErros: ErrorRequestHandler = (erro, _req, res, _next) => {
    if (erro instanceof ErroHttp) {
        res.status(erro.status).json({ mensagem: erro.message, detalhes: erro.detalhes })
        return
    }
    if (erro instanceof MulterError) {
        const tooLarge = erro.code === 'LIMIT_FILE_SIZE'
        res.status(tooLarge ? 413 : 400).json({ mensagem: tooLarge ? 'Imagem maior que 5 MB' : 'Upload inválido' })
        return
    }
    if (erroDeChaveDuplicada(erro)) {
        res.status(409).json({ mensagem: 'Já existe um registro com esse nome' })
        return
    }
    if (erro instanceof SyntaxError && 'body' in erro) {
        res.status(400).json({ mensagem: 'JSON inválido' })
        return
    }
    console.error('Erro inesperado:', erro instanceof Error ? erro.message : erro)
    res.status(500).json({ mensagem: 'Erro interno do servidor' })
}
