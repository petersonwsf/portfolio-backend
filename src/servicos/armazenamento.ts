import { randomUUID } from 'node:crypto'
import {
    CreateBucketCommand,
    HeadBucketCommand,
    PutBucketPolicyCommand,
    PutObjectCommand,
    S3Client,
} from '@aws-sdk/client-s3'
import type { Ambiente } from '../config/env'

export const PASTAS_UPLOAD = ['projetos', 'experiencias', 'habilidades'] as const
export type PastaUpload = (typeof PASTAS_UPLOAD)[number]

/** Contrato do armazenamento de imagens (implementado sobre S3/RustFS; substituível nos testes). */
export interface Armazenamento {
    /** Envia a imagem e retorna a URL pública. */
    enviarImagem(arquivo: Buffer, extensao: string, tipo: string, pasta: PastaUpload): Promise<string>
    /** Cria o bucket (se necessário) e libera leitura pública dos objetos. */
    prepararBucket(): Promise<void>
}

type ConfigS3 = Pick<
    Ambiente,
    'S3_ENDPOINT' | 'S3_REGIAO' | 'S3_ACCESS_KEY' | 'S3_SECRET_KEY' | 'S3_BUCKET' | 'S3_URL_PUBLICA'
>

export function criarArmazenamentoS3(config: ConfigS3): Armazenamento {
    const cliente = new S3Client({
        endpoint: config.S3_ENDPOINT,
        region: config.S3_REGIAO,
        forcePathStyle: true,
        credentials: { accessKeyId: config.S3_ACCESS_KEY, secretAccessKey: config.S3_SECRET_KEY },
    })
    const baseUrl = config.S3_URL_PUBLICA.replace(/\/+$/, '')

    return {
        async enviarImagem(arquivo, extensao, tipo, pasta) {
            const chave = `${pasta}/${randomUUID()}.${extensao}`
            await cliente.send(
                new PutObjectCommand({
                    Bucket: config.S3_BUCKET,
                    Key: chave,
                    Body: arquivo,
                    ContentType: tipo,
                    CacheControl: 'public, max-age=31536000, immutable',
                })
            )
            return `${baseUrl}/${chave}`
        },

        async prepararBucket() {
            try {
                await cliente.send(new HeadBucketCommand({ Bucket: config.S3_BUCKET }))
            } catch {
                await cliente.send(new CreateBucketCommand({ Bucket: config.S3_BUCKET }))
            }

            // leitura pública apenas dos objetos (sem listagem nem escrita)
            const politica = {
                Version: '2012-10-17',
                Statement: [
                    {
                        Sid: 'LeituraPublica',
                        Effect: 'Allow',
                        Principal: '*',
                        Action: ['s3:GetObject'],
                        Resource: [`arn:aws:s3:::${config.S3_BUCKET}/*`],
                    },
                ],
            }
            await cliente.send(
                new PutBucketPolicyCommand({ Bucket: config.S3_BUCKET, Policy: JSON.stringify(politica) })
            )
        },
    }
}
