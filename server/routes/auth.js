import { Router } from 'express'
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import { User } from '../models/User.js'

export const authRouter = Router()

function signToken(user) {
  return jwt.sign(
    { sub: user._id.toString(), role: user.role, email: user.email },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || '7d' },
  )
}

authRouter.post('/login', async (req, res) => {
  try {
    const email = String(req.body.email || '')
      .toLowerCase()
      .trim()
    const password = String(req.body.password || '')
    if (!email || !password) {
      return res.status(400).json({ error: 'Correo y contraseña son obligatorios' })
    }

    const user = await User.findOne({ email })
    if (!user) return res.status(401).json({ error: 'Credenciales inválidas' })

    const ok = await bcrypt.compare(password, user.passwordHash)
    if (!ok) return res.status(401).json({ error: 'Credenciales inválidas' })

    const token = signToken(user)
    res.json({
      token,
      user: { id: user._id, email: user.email, name: user.name, role: user.role },
    })
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'No se pudo iniciar sesión' })
  }
})

authRouter.get('/me', async (req, res) => {
  try {
    const header = req.headers.authorization || ''
    const token = header.startsWith('Bearer ') ? header.slice(7) : ''
    if (!token) return res.status(401).json({ error: 'Sin token' })

    const payload = jwt.verify(token, process.env.JWT_SECRET)
    const user = await User.findById(payload.sub).select('email name role')
    if (!user) return res.status(401).json({ error: 'Usuario no encontrado' })
    res.json({ user })
  } catch {
    res.status(401).json({ error: 'Token inválido' })
  }
})
