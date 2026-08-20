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

function sixDigits() {
  return String(Math.floor(100000 + Math.random() * 900000))
}

function publicUser(user) {
  return {
    id: user._id,
    email: user.email,
    name: user.name,
    phone: user.phone,
    role: user.role,
    emailVerified: user.emailVerified,
  }
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

    if (user.role === 'client' && !user.emailVerified) {
      return res.status(403).json({
        error: 'Verifica tu correo para entrar',
        needsVerification: true,
        email: user.email,
      })
    }

    const token = signToken(user)
    res.json({ token, user: publicUser(user) })
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'No se pudo iniciar sesión' })
  }
})

authRouter.post('/register', async (req, res) => {
  try {
    const name = String(req.body.name || '').trim()
    const phone = String(req.body.phone || '').trim()
    const email = String(req.body.email || '')
      .toLowerCase()
      .trim()
    const password = String(req.body.password || '')
    if (!name || !email || !password) {
      return res.status(400).json({ error: 'Nombre, correo y contraseña son obligatorios' })
    }
    if (password.length < 6) {
      return res.status(400).json({ error: 'La contraseña debe tener al menos 6 caracteres' })
    }

    const exists = await User.findOne({ email })
    if (exists && exists.emailVerified) {
      return res.status(409).json({ error: 'Ese correo ya tiene una cuenta' })
    }

    const passwordHash = await bcrypt.hash(password, 12)
    const verifyCode = sixDigits()
    const verifyExpires = new Date(Date.now() + 15 * 60 * 1000)

    const user =
      exists ||
      new User({
        email,
        role: 'client',
        emailVerified: false,
      })

    user.name = name
    user.phone = phone
    user.passwordHash = passwordHash
    user.role = 'client'
    user.emailVerified = false
    user.verifyCode = verifyCode
    user.verifyExpires = verifyExpires
    await user.save()

    console.log(`[brevo pendiente] código de verificación ${email}: ${verifyCode}`)
    res.status(201).json({
      ok: true,
      needsVerification: true,
      email,
      message: 'Te enviaremos un código de 6 dígitos. Brevo se conecta en el siguiente paso.',
      ...(process.env.NODE_ENV !== 'production' ? { devCode: verifyCode } : {}),
    })
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'No se pudo crear la cuenta' })
  }
})

authRouter.post('/verify-email', async (req, res) => {
  try {
    const email = String(req.body.email || '')
      .toLowerCase()
      .trim()
    const code = String(req.body.code || '').trim()
    const user = await User.findOne({ email })
    if (!user || !user.verifyCode) {
      return res.status(400).json({ error: 'No hay una verificación pendiente' })
    }
    if (user.verifyExpires && user.verifyExpires < new Date()) {
      return res.status(400).json({ error: 'El código expiró. Solicita uno nuevo.' })
    }
    if (user.verifyCode !== code) {
      return res.status(400).json({ error: 'Código incorrecto' })
    }
    user.emailVerified = true
    user.verifyCode = ''
    user.verifyExpires = undefined
    await user.save()
    const token = signToken(user)
    res.json({ ok: true, token, user: publicUser(user) })
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'No se pudo verificar el correo' })
  }
})

authRouter.post('/forgot', async (req, res) => {
  try {
    const email = String(req.body.email || '')
      .toLowerCase()
      .trim()
    if (!email) return res.status(400).json({ error: 'El correo es obligatorio' })
    const user = await User.findOne({ email })
    const payload = {
      ok: true,
      email,
      message: 'Si el correo existe, enviaremos un código de 6 dígitos.',
    }
    if (!user) return res.json(payload)

    user.resetCode = sixDigits()
    user.resetExpires = new Date(Date.now() + 15 * 60 * 1000)
    await user.save()
    console.log(`[brevo pendiente] código de reset ${email}: ${user.resetCode}`)
    res.json({
      ...payload,
      ...(process.env.NODE_ENV !== 'production' ? { devCode: user.resetCode } : {}),
    })
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'No se pudo enviar el código' })
  }
})

authRouter.post('/reset', async (req, res) => {
  try {
    const email = String(req.body.email || '')
      .toLowerCase()
      .trim()
    const code = String(req.body.code || '').trim()
    const password = String(req.body.password || '')
    if (!email || !code || !password) {
      return res.status(400).json({ error: 'Correo, código y nueva contraseña son obligatorios' })
    }
    const user = await User.findOne({ email })
    if (!user || !user.resetCode) {
      return res.status(400).json({ error: 'No hay un cambio de contraseña pendiente' })
    }
    if (user.resetExpires && user.resetExpires < new Date()) {
      return res.status(400).json({ error: 'El código expiró' })
    }
    if (user.resetCode !== code) {
      return res.status(400).json({ error: 'Código incorrecto' })
    }
    if (password.length < 6) {
      return res.status(400).json({ error: 'La contraseña debe tener al menos 6 caracteres' })
    }
    user.passwordHash = await bcrypt.hash(password, 12)
    user.resetCode = ''
    user.resetExpires = undefined
    await user.save()
    res.json({ ok: true, message: 'Contraseña actualizada' })
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'No se pudo cambiar la contraseña' })
  }
})

authRouter.get('/me', async (req, res) => {
  try {
    const header = req.headers.authorization || ''
    const token = header.startsWith('Bearer ') ? header.slice(7) : ''
    if (!token) return res.status(401).json({ error: 'Sin token' })
    const payload = jwt.verify(token, process.env.JWT_SECRET)
    const user = await User.findById(payload.sub).select('email name phone role emailVerified')
    if (!user) return res.status(401).json({ error: 'Usuario no encontrado' })
    res.json({ user: publicUser(user) })
  } catch {
    res.status(401).json({ error: 'Token inválido' })
  }
})
