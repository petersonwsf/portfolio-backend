import { type RequestHandler, Router } from 'express'
import multer from 'multer'
import { PASTAS_UPLOAD, type Armazenamento, type PastaUpload } from '../servicos/armazenamento'
import { ErroHttp } from '../utils/erros'
import { detectarImagem } from '../utils/imagem'

const TAMANHO_MAXIMO = 5 * 1024 * 1024

/** Upload de imagens (somente admin) para o armazenamento S3; retorna a URL pública. */
export function criarRotasUploads(armazenamento: Armazenamento, autenticar: RequestHandler): Router {
    const roteador = Router()
    const receber = multer({ storage: multer.memoryStorage(), limits: { fileSize: TAMANHO_MAXIMO, files: 1 } })

    roteador.post('/', autenticar, receber.single('arquivo'), async (req, res) => {
        const pasta = String(req.body?.pasta ?? '') as PastaUpload
        if (!PASTAS_UPLOAD.includes(pasta)) throw new ErroHttp(400, 'Pasta inválida')
        if (!req.file) throw new ErroHttp(400, 'Envie um arquivo no campo "arquivo"')

        const imagem = detectarImagem(req.file.buffer)
        if (!imagem) throw new ErroHttp(415, 'Formato não suportado. Use PNG, JPG, GIF ou WebP.')

        const url = await armazenamento.enviarImagem(req.file.buffer, imagem.extensao, imagem.tipo, pasta)
        res.status(201).json({ url })
    })

    return roteador
}
