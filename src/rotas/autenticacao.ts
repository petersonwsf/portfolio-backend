import bcrypt from 'bcryptjs'
import { Router } from 'express'
import jwt from 'jsonwebtoken'
import type { Ambiente } from '../config/env'
import { esquemaLogin } from '../esquemas/autenticacao'
import { limitarTentativas } from '../middlewares/limitarTentativas'
import { validarCorpo } from '../middlewares/validar'
import { ErroHttp } from '../utils/erros'

type ConfigAutenticacao = Pick<Ambiente, 'ADMIN_USUARIO' | 'ADMIN_SENHA_HASH' | 'JWT_SEGREDO' | 'JWT_EXPIRA_EM'>

/** Login do administrador: compara com as credenciais do ambiente e devolve um JWT. */
export function criarRotasAutenticacao(config: ConfigAutenticacao): Router {
    const roteador = Router()

    roteador.post(
        '/entrar',
        limitarTentativas(10, 15 * 60 * 1000),
        validarCorpo(esquemaLogin),
        async (req, res) => {
            const { usuario, senha } = req.body as { usuario: string; senha: string }

            // sempre compara o hash, para não revelar por tempo de resposta se o usuário existe
            const senhaConfere = await bcrypt.compare(senha, config.ADMIN_SENHA_HASH)
            if (usuario !== config.ADMIN_USUARIO || !senhaConfere) {
                throw new ErroHttp(401, 'Usuário ou senha inválidos')
            }

            const token = jwt.sign({ papel: 'admin' }, config.JWT_SEGREDO, {
                algorithm: 'HS256',
                expiresIn: config.JWT_EXPIRA_EM as jwt.SignOptions['expiresIn'],
                subject: usuario,
            })
            res.json({ token })
        }
    )

    return roteador
}
