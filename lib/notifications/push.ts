import webpush, { type PushSubscription } from 'web-push'

const VAPID_PUBLIC_KEY = process.env.VAPID_PUBLIC_KEY || ''
const VAPID_PRIVATE_KEY = process.env.VAPID_PRIVATE_KEY || ''
const VAPID_SUBJECT = process.env.VAPID_SUBJECT || 'mailto:admin@livasofa.com'

export function getVapidPublicKey() {
  if (!VAPID_PUBLIC_KEY) {
    throw new Error('VAPID_PUBLIC_KEY is not set')
  }
  return VAPID_PUBLIC_KEY
}

function configureWebPush() {
  if (!VAPID_PUBLIC_KEY || !VAPID_PRIVATE_KEY) {
    throw new Error('VAPID keys are not set')
  }
  webpush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY)
}

export async function sendPush(
  subscription: PushSubscription,
  payload: Record<string, unknown>
) {
  configureWebPush()
  return webpush.sendNotification(subscription, JSON.stringify(payload))
}
