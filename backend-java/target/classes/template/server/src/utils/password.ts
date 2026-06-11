import bcrypt from 'bcryptjs'

const SALT_ROUNDS = 12

export const hash    = (plain: string)              => bcrypt.hash(plain, SALT_ROUNDS)
export const compare = (plain: string, hashed: string) => bcrypt.compare(plain, hashed)
