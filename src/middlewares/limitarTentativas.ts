import type { RequestHandler } from 'express'
import { ErroHttp } from '../utils/erros'

/** Limitador simples em memória por IP (suficiente para o login de um único admin). */
export function limitarTentativas(maximo: number, janelaMs: number): RequestHandler {
    const registros = new Map<string, { contagem: number; expiraEm: number }>()

    return (req, _res, next) => {
        const agora = Date.now()
        const chave = req.ip ?? 'desconhecido'
        const registro = registros.get(chave)

        if (!registro || registro.expiraEm <= agora) {
            registros.set(chave, { contagem: 1, expiraEm: agora + janelaMs })
            next()
            return
        }
        registro.contagem += 1
        if (registro.contagem > maximo) {
            next(new ErroHttp(429, 'Muitas tentativas. Tente novamente mais tarde.'))
            return
        }
        next()
    }
}
