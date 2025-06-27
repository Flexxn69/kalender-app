// Offline-Manager für PWA-Funktionalität
export class OfflineManager {
  private dbName = "CalendarAppDB"
  private dbVersion = 1
  private db: IDBDatabase | null = null

  async initialize(): Promise<void> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.dbName, this.dbVersion)

      request.onerror = () => reject(request.error)
      request.onsuccess = () => {
        this.db = request.result
        resolve()
      }

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result

        // Events Store
        if (!db.objectStoreNames.contains("events")) {
          const eventsStore = db.createObjectStore("events", { keyPath: "id" })
          eventsStore.createIndex("date", "date", { unique: false })
          eventsStore.createIndex("category", "category", { unique: false })
        }

        // Messages Store
        if (!db.objectStoreNames.contains("messages")) {
          const messagesStore = db.createObjectStore("messages", { keyPath: "id" })
          messagesStore.createIndex("conversationId", "conversationId", { unique: false })
          messagesStore.createIndex("time", "time", { unique: false })
        }

        // Contacts Store
        if (!db.objectStoreNames.contains("contacts")) {
          db.createObjectStore("contacts", { keyPath: "id" })
        }

        // Sync Queue Store
        if (!db.objectStoreNames.contains("syncQueue")) {
          const syncStore = db.createObjectStore("syncQueue", { keyPath: "id", autoIncrement: true })
          syncStore.createIndex("timestamp", "timestamp", { unique: false })
        }
      }
    })
  }

  async saveData(storeName: string, data: any): Promise<void> {
    if (!this.db) throw new Error("Database not initialized")

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([storeName], "readwrite")
      const store = transaction.objectStore(storeName)
      const request = store.put(data)

      request.onerror = () => reject(request.error)
      request.onsuccess = () => resolve()
    })
  }

  async getData(storeName: string, key?: string): Promise<any> {
    if (!this.db) throw new Error("Database not initialized")

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([storeName], "readonly")
      const store = transaction.objectStore(storeName)
      const request = key ? store.get(key) : store.getAll()

      request.onerror = () => reject(request.error)
      request.onsuccess = () => resolve(request.result)
    })
  }

  async deleteData(storeName: string, key: string): Promise<void> {
    if (!this.db) throw new Error("Database not initialized")

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([storeName], "readwrite")
      const store = transaction.objectStore(storeName)
      const request = store.delete(key)

      request.onerror = () => reject(request.error)
      request.onsuccess = () => resolve()
    })
  }

  async addToSyncQueue(action: string, data: any): Promise<void> {
    const syncItem = {
      action,
      data,
      timestamp: new Date().toISOString(),
      retries: 0,
    }

    await this.saveData("syncQueue", syncItem)
  }

  async processSyncQueue(): Promise<void> {
    const queueItems = await this.getData("syncQueue")

    for (const item of queueItems) {
      try {
        await this.syncItem(item)
        await this.deleteData("syncQueue", item.id)
      } catch (error) {
        console.error("Sync failed for item:", item, error)

        // Erhöhe Retry-Counter
        item.retries = (item.retries || 0) + 1

        if (item.retries < 3) {
          await this.saveData("syncQueue", item)
        } else {
          // Nach 3 Versuchen aus der Queue entfernen
          await this.deleteData("syncQueue", item.id)
        }
      }
    }
  }

  private async syncItem(item: any): Promise<void> {
    // Hier würde die tatsächliche Synchronisation mit dem Server stattfinden
    // Für jetzt simulieren wir es
    console.log("Syncing item:", item)

    // Simuliere API-Call
    await new Promise((resolve) => setTimeout(resolve, 1000))
  }

  async isOnline(): Promise<boolean> {
    return navigator.onLine
  }

  async cacheResource(url: string): Promise<void> {
    if ("caches" in window) {
      const cache = await caches.open("calendar-app-v1")
      await cache.add(url)
    }
  }

  async getCachedResource(url: string): Promise<Response | undefined> {
    if ("caches" in window) {
      const cache = await caches.open("calendar-app-v1")
      return await cache.match(url)
    }
  }
}

export const offlineManager = new OfflineManager()
