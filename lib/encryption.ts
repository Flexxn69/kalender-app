// Ende-zu-Ende-Verschlüsselung
export class EncryptionManager {
  private keyPair: CryptoKeyPair | null = null
  private sharedKeys: Map<string, CryptoKey> = new Map()

  async generateKeyPair(): Promise<CryptoKeyPair> {
    this.keyPair = await window.crypto.subtle.generateKey(
      {
        name: "RSA-OAEP",
        modulusLength: 2048,
        publicExponent: new Uint8Array([1, 0, 1]),
        hash: "SHA-256",
      },
      true,
      ["encrypt", "decrypt"],
    )
    return this.keyPair
  }

  async exportPublicKey(): Promise<string> {
    if (!this.keyPair) throw new Error("No key pair generated")

    const exported = await window.crypto.subtle.exportKey("spki", this.keyPair.publicKey)
    return btoa(String.fromCharCode(...new Uint8Array(exported)))
  }

  async importPublicKey(publicKeyString: string): Promise<CryptoKey> {
    const publicKeyBuffer = Uint8Array.from(atob(publicKeyString), (c) => c.charCodeAt(0))

    return await window.crypto.subtle.importKey(
      "spki",
      publicKeyBuffer,
      {
        name: "RSA-OAEP",
        hash: "SHA-256",
      },
      true,
      ["encrypt"],
    )
  }

  async encryptMessage(message: string, recipientPublicKey: CryptoKey): Promise<string> {
    const encoder = new TextEncoder()
    const data = encoder.encode(message)

    const encrypted = await window.crypto.subtle.encrypt(
      {
        name: "RSA-OAEP",
      },
      recipientPublicKey,
      data,
    )

    return btoa(String.fromCharCode(...new Uint8Array(encrypted)))
  }

  async decryptMessage(encryptedMessage: string): Promise<string> {
    if (!this.keyPair) throw new Error("No key pair available")

    const encryptedBuffer = Uint8Array.from(atob(encryptedMessage), (c) => c.charCodeAt(0))

    const decrypted = await window.crypto.subtle.decrypt(
      {
        name: "RSA-OAEP",
      },
      this.keyPair.privateKey,
      encryptedBuffer,
    )

    const decoder = new TextDecoder()
    return decoder.decode(decrypted)
  }

  async generateSharedKey(): Promise<CryptoKey> {
    return await window.crypto.subtle.generateKey(
      {
        name: "AES-GCM",
        length: 256,
      },
      true,
      ["encrypt", "decrypt"],
    )
  }

  async encryptWithSharedKey(message: string, key: CryptoKey): Promise<{ encrypted: string; iv: string }> {
    const encoder = new TextEncoder()
    const data = encoder.encode(message)
    const iv = window.crypto.getRandomValues(new Uint8Array(12))

    const encrypted = await window.crypto.subtle.encrypt(
      {
        name: "AES-GCM",
        iv: iv,
      },
      key,
      data,
    )

    return {
      encrypted: btoa(String.fromCharCode(...new Uint8Array(encrypted))),
      iv: btoa(String.fromCharCode(...iv)),
    }
  }

  async decryptWithSharedKey(encryptedData: { encrypted: string; iv: string }, key: CryptoKey): Promise<string> {
    const encryptedBuffer = Uint8Array.from(atob(encryptedData.encrypted), (c) => c.charCodeAt(0))
    const ivBuffer = Uint8Array.from(atob(encryptedData.iv), (c) => c.charCodeAt(0))

    const decrypted = await window.crypto.subtle.decrypt(
      {
        name: "AES-GCM",
        iv: ivBuffer,
      },
      key,
      encryptedBuffer,
    )

    const decoder = new TextDecoder()
    return decoder.decode(decrypted)
  }
}

export const encryptionManager = new EncryptionManager()
