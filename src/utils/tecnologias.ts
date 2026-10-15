import { Habilidade } from '../modelos/Habilidade'
import { ErroHttp } from './erros'

/** Garante que todas as tecnologias informadas correspondem a habilidades cadastradas. */
export async function validarTecnologiasCadastradas(corpo: Record<string, unknown>): Promise<void> {
    const ids = Array.isArray(corpo.tecnologias) ? (corpo.tecnologias as string[]) : []
    const unicos = [...new Set(ids)]
    if (unicos.length === 0) return

    const encontradas = await Habilidade.countDocuments({ _id: { $in: unicos } })
    if (encontradas !== unicos.length) {
        throw new ErroHttp(400, 'Selecione apenas tecnologias cadastradas em Habilidades')
    }
}
