import fs from 'fs'
import path from 'path'
import webpush, { type PushSubscription } from 'web-push'

type VapidKeys = {
  publicKey: string
  privateKey: string
  subject: string
}

const VAPID_SUBJECT = process.env.VAPID_SUBJECT || 'mailto:admin@livasofa.com'

function loadOrCreateVapidKeys(): VapidKeys {
  const envPublicKey = process.env.VAPID_PUBLIC_KEY || ''
  const envPrivateKey = process.env.VAPID_PRIVATE_KEY || ''

  if (envPublicKey && envPrivateKey) {
    return { publicKey: envPublicKey, privateKey: envPrivateKey, subject: VAPID_SUBJECT }
  }

  const dataDir = path.join(process.cwd(), 'data')
  const filePath = path.join(dataDir, 'vapid.json')

  try {
    if (fs.existsSync(filePath)) {
      const raw = fs.readFileSync(filePath, 'utf8')
      const parsed = JSON.parse(raw) as Partial<VapidKeys>
      if (parsed.publicKey && parsed.privateKey) {
        return {
          publicKey: parsed.publicKey,
          privateKey: parsed.privateKey,
          subject: parsed.subject || VAPID_SUBJECT,
        }
      }
    }
  } catch {
    // ignore and regenerate
  }

  const generated = webpush.generateVAPIDKeys()
  const keys: VapidKeys = {
    publicKey: generated.publicKey,
    privateKey: generated.privateKey,
    subject: VAPID_SUBJECT,
  }

  try {
    fs.mkdirSync(dataDir, { recursive: true })
    fs.writeFileSync(filePath, JSON.stringify(keys, null, 2), 'utf8')
  } catch {
    // if write fails, still return in-memory keys
  }

  return keys
}

export function getVapidPublicKey() {
  return loadOrCreateVapidKeys().publicKey
}

function configureWebPush() {
  const keys = loadOrCreateVapidKeys()
  webpush.setVapidDetails(keys.subject, keys.publicKey, keys.privateKey)
}

export async function sendPush(
  subscription: PushSubscription,
  payload: Record<string, unknown>
) {
  configureWebPush()
  return webpush.sendNotification(subscription, JSON.stringify(payload))
}
