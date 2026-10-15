import { Habilidade } from '../modelos/Habilidade'
import { ErroHttp } from './erros'

/** Garante que todas as tecnologias informadas existem e estão marcadas como dominadas. */
export async function validarTecnologiasDominadas(corpo: Record<string, unknown>): Promise<void> {
    const ids = Array.isArray(corpo.tecnologias) ? (corpo.tecnologias as string[]) : []
    const unicos = [...new Set(ids)]
    if (unicos.length === 0) return

    const validas = await Habilidade.countDocuments({ _id: { $in: unicos }, dominada: true })
    if (validas !== unicos.length) {
        throw new ErroHttp(400, 'Selecione apenas tecnologias cadastradas e marcadas como dominadas')
    }
}
