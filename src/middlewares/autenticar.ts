import type { RequestHandler } from 'express'
import jwt from 'jsonwebtoken'
import { ErroHttp } from '../utils/erros'

/** Exige um token JWT válido no cabeçalho `Authorization: Bearer <token>`. */
export function criarAutenticacao(segredo: string): RequestHandler {
    return (req, _res, next) => {
        const cabecalho = req.headers.authorization
        if (!cabecalho?.startsWith('Bearer ')) {
            next(new ErroHttp(401, 'Autenticação necessária'))
            return
        }
        try {
            jwt.verify(cabecalho.slice('Bearer '.length), segredo, { algorithms: ['HS256'] })
            next()
        } catch {
            next(new ErroHttp(401, 'Token inválido ou expirado'))
        }
    }
}
