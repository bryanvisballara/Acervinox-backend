import bcrypt from 'bcryptjs'
import { User } from './models/User.js'

export async function seedAdmin() {
  const email = process.env.SEED_ADMIN_EMAIL?.toLowerCase().trim()
  const password = process.env.SEED_ADMIN_PASSWORD
  if (!email || !password) return

  const exists = await User.findOne({ email })
  if (exists) return

  const passwordHash = await bcrypt.hash(password, 12)
  await User.create({
    email,
    passwordHash,
    name: 'Admin acervinox',
    role: 'admin',
  })
  console.log('Usuario admin creado:', email)
}
