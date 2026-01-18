import express from "express"
import fs from "fs"
import path from "path"
import { fileURLToPath } from "url"

const app = express()
app.use(express.json())
app.use(express.static("public"))

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const LINKVERTISE_URL = "https://linkvertise.com/YOUR_LINK"
const ADMIN_PASS = "velixadmin"
const WEBHOOK_URL = "https://discord.com/api/webhooks/1462352718692749363/FrkeoRS5CGyavplRdYjgbySTY5lU72yHdm9gBFDkXXbp3RIoH4o5OeDb-_YA4_0Bbxj8"

const DATA = path.join(__dirname, "data.json")
if (!fs.existsSync(DATA)) fs.writeFileSync(DATA, JSON.stringify({ keys: [] }, null, 2))

const usedTokens = new Set()
const TIERS = {
  FREE: 24 * 60 * 60 * 1000,
  PREMIUM: 72 * 60 * 60 * 1000,
  VIP: 30 * 24 * 60 * 60 * 1000
}

const load = () => JSON.parse(fs.readFileSync(DATA))
const save = d => fs.writeFileSync(DATA, JSON.stringify(d, null, 2))

const genToken = () => Math.random().toString(36).slice(2, 12)
const genKey = tier => {
  const c = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789"
  let k = `VELIX-${tier}-`
  for (let i = 0; i < 5; i++) k += c[Math.floor(Math.random() * c.length)]
  return k
}

const webhook = async msg => {
  if (!WEBHOOK_URL) return
  await fetch(WEBHOOK_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ content: msg })
  }).catch(()=>{})
}

// ===== Linkvertise =====
app.get("/start", (_, res) => res.redirect(LINKVERTISE_URL))

app.get("/verify", (req, res) => {
  if (req.query.lv !== "success") return res.redirect(LINKVERTISE_URL)
  const token = genToken()
  res.redirect(`/?token=${token}`)
})

// ===== User Keygen =====
app.get("/api/get-key", (req, res) => {
  const { token } = req.query
  if (!token || usedTokens.has(token)) {
    webhook("🚨 **Bypass Attempt Detected**")
    return res.status(403).send("nuh uh trying to bypass nahh you're not tuff")
  }

  usedTokens.add(token)
  const db = load()
  const tier = "FREE"
  const key = genKey(tier)
  const exp = Date.now() + TIERS[tier]

  db.keys.push({ key, tier, exp })
  save(db)
  webhook(`🔑 **Key Generated**\n${key} (${tier})`)
  res.json({ key })
})

// ===== Roblox Verify =====
app.post("/api/verify-key", (req, res) => {
  const { key } = req.body
  const db = load()
  const k = db.keys.find(x => x.key === key)
  if (!k) {
    webhook(`❌ Invalid key used: ${key}`)
    return res.json({ valid: false })
  }
  if (Date.now() > k.exp) {
    webhook(`⌛ Expired key used: ${key}`)
    return res.json({ valid: false })
  }
  webhook(`✅ Key verified: ${key}`)
  res.json({ valid: true, tier: k.tier })
})

// ===== Admin =====
app.post("/admin/login", (req, res) => {
  if (req.body.pass !== ADMIN_PASS) return res.sendStatus(403)
  res.json({ ok: true })
})

app.get("/admin/keys", (_, res) => res.json(load().keys))

app.post("/admin/generate", (req, res) => {
  const { tier } = req.body
  const db = load()
  const key = genKey(tier)
  const exp = Date.now() + TIERS[tier]
  db.keys.push({ key, tier, exp })
  save(db)
  webhook(`👑 Admin generated ${tier} key\n${key}`)
  res.json({ key })
})

app.post("/admin/revoke", (req, res) => {
  const db = load()
  db.keys = db.keys.filter(k => k.key !== req.body.key)
  save(db)
  webhook(`🗑️ Key revoked: ${req.body.key}`)
  res.json({ ok: true })
})

app.listen(process.env.PORT || 3000, () =>
  console.log("☢️ VELIX NUCLEAR ONLINE")
)
