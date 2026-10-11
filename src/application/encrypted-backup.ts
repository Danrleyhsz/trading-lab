import type { FastifyInstance } from 'fastify';
import {
  constants,
  createCipheriv,
  createDecipheriv,
  createHash,
  createPublicKey,
  privateDecrypt,
  publicEncrypt,
  randomBytes,
  type KeyObject,
} from 'node:crypto';
import { gunzipSync, gzipSync } from 'node:zlib';

export const BACKUP_FORMAT = 'TRADING_LAB_ENCRYPTED_STATE_V1';
export interface EncryptedStateBackup {
  format: typeof BACKUP_FORMAT;
  createdAt: string;
  persistedAt: string | null;
  plaintextSha256: string;
  keyFingerprint: string;
  wrappedKey: string;
  iv: string;
  authTag: string;
  ciphertext: string;
}
const sha256 = (data: Buffer) => createHash('sha256').update(data).digest('hex');
const aad = Buffer.from(BACKUP_FORMAT);
function backupKey(publicKeyPem: string) {
  const key = createPublicKey(publicKeyPem);
  if (key.asymmetricKeyType !== 'rsa' || (key.asymmetricKeyDetails?.modulusLength ?? 0) < 3072)
    throw Error('backup public key must be RSA with at least 3072 bits');
  return { key, fingerprint: sha256(key.export({ type: 'spki', format: 'der' })) };
}
/** Hybrid encryption (AES-256-GCM data key wrapped with RSA-OAEP-SHA256). Only the owner's private key can open it. */
export function encryptStateBackup(
  state: unknown,
  publicKeyPem: string,
  persistedAt: string | null = null,
  now = new Date(),
): EncryptedStateBackup {
  const { key, fingerprint } = backupKey(publicKeyPem);
  const plaintext = Buffer.from(JSON.stringify(state)),
    dataKey = randomBytes(32),
    iv = randomBytes(12);
  const cipher = createCipheriv('aes-256-gcm', dataKey, iv);
  cipher.setAAD(aad);
  const ciphertext = Buffer.concat([cipher.update(gzipSync(plaintext)), cipher.final()]);
  const wrappedKey = publicEncrypt({ key, padding: constants.RSA_PKCS1_OAEP_PADDING, oaepHash: 'sha256' }, dataKey);
  return {
    format: BACKUP_FORMAT,
    createdAt: now.toISOString(),
    persistedAt,
    plaintextSha256: sha256(plaintext),
    keyFingerprint: fingerprint,
    wrappedKey: wrappedKey.toString('base64'),
    iv: iv.toString('base64'),
    authTag: cipher.getAuthTag().toString('base64'),
    ciphertext: ciphertext.toString('base64'),
  };
}
/** Owner-side restore helper; fails closed on a wrong key, tampering or a hash mismatch. */
export function decryptStateBackup(backup: EncryptedStateBackup, privateKey: string | KeyObject): unknown {
  if (backup?.format !== BACKUP_FORMAT) throw Error('unsupported backup format');
  const dataKey = privateDecrypt(
    { key: privateKey, padding: constants.RSA_PKCS1_OAEP_PADDING, oaepHash: 'sha256' },
    Buffer.from(backup.wrappedKey, 'base64'),
  );
  const decipher = createDecipheriv('aes-256-gcm', dataKey, Buffer.from(backup.iv, 'base64'));
  decipher.setAAD(aad);
  decipher.setAuthTag(Buffer.from(backup.authTag, 'base64'));
  const plaintext = gunzipSync(
    Buffer.concat([decipher.update(Buffer.from(backup.ciphertext, 'base64')), decipher.final()]),
  );
  if (sha256(plaintext) !== backup.plaintextSha256) throw Error('backup content hash mismatch');
  return JSON.parse(plaintext.toString('utf8'));
}
/** GET /ops/backup: the last durably persisted snapshot, encrypted. Read-only; never returns plaintext state. */
export function registerEncryptedBackup(
  app: FastifyInstance,
  snapshot: () => { state: unknown; persistedAt: string | null } | null,
  publicKeyPem: string,
) {
  backupKey(publicKeyPem);
  app.get('/ops/backup', async (_req, reply) => {
    const current = snapshot();
    if (!current) return reply.code(503).send({ error: 'no durable snapshot yet' });
    reply.header('Cache-Control', 'no-store');
    return encryptStateBackup(current.state, publicKeyPem, current.persistedAt);
  });
}
