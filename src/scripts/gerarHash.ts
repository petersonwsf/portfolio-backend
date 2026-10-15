import bcrypt from 'bcryptjs'

// uso: npm run gerar-hash -- "sua-senha"
const senha = process.argv[2]

if (!senha) {
    console.error('Informe a senha: npm run gerar-hash -- "sua-senha"')
    process.exit(1)
}

console.log(bcrypt.hashSync(senha, 12))
