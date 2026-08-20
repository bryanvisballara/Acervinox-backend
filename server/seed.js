import bcrypt from 'bcryptjs'
import { User } from './models/User.js'

export async function seedAdmin() {
  const email = process.env.SEED_ADMIN_EMAIL?.toLowerCase().trim()
  const password = process.env.SEED_ADMIN_PASSWORD
  if (!email || !password) return

  const exists = await User.findOne({ email })
  if (exists) {
    if (!exists.emailVerified || exists.role !== 'admin') {
      exists.emailVerified = true
      exists.role = 'admin'
      await exists.save()
    }
    return
  }

  const passwordHash = await bcrypt.hash(password, 12)
  await User.create({
    email,
    passwordHash,
    name: 'Admin acervinox',
    role: 'admin',
    emailVerified: true,
  })
  console.log('Usuario admin creado:', email)
}

export async function seedWorkshop() {
  const email = process.env.SEED_WORKSHOP_EMAIL?.toLowerCase().trim()
  const password = process.env.SEED_WORKSHOP_PASSWORD
  if (!email || !password) return

  const exists = await User.findOne({ email })
  if (exists) {
    if (!exists.emailVerified || exists.role !== 'workshop') {
      exists.emailVerified = true
      exists.role = 'workshop'
      await exists.save()
    }
    return
  }

  const passwordHash = await bcrypt.hash(password, 12)
  await User.create({
    email,
    passwordHash,
    name: 'Taller acervinox',
    role: 'workshop',
    emailVerified: true,
  })
  console.log('Usuario workshop creado:', email)
}
