export interface ImagemDetectada {
    tipo: string
    extensao: string
}

const iguais = (buffer: Buffer, assinatura: number[], deslocamento = 0): boolean =>
    assinatura.every((byte, indice) => buffer[deslocamento + indice] === byte)

/**
 * Identifica PNG, JPEG, GIF e WebP pelos bytes iniciais (não confia no tipo informado pelo cliente).
 * SVG é recusado de propósito: pode conter scripts.
 */
export function detectarImagem(buffer: Buffer): ImagemDetectada | null {
    if (iguais(buffer, [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])) return { tipo: 'image/png', extensao: 'png' }
    if (iguais(buffer, [0xff, 0xd8, 0xff])) return { tipo: 'image/jpeg', extensao: 'jpg' }
    if (iguais(buffer, [0x47, 0x49, 0x46, 0x38])) return { tipo: 'image/gif', extensao: 'gif' }
    if (iguais(buffer, [0x52, 0x49, 0x46, 0x46]) && iguais(buffer, [0x57, 0x45, 0x42, 0x50], 8)) {
        return { tipo: 'image/webp', extensao: 'webp' }
    }
    return null
}
