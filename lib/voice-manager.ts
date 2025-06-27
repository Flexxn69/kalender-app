// Sprachnachrichten-Manager
export class VoiceManager {
  private mediaRecorder: MediaRecorder | null = null
  private audioChunks: Blob[] = []
  private isRecording = false

  async requestPermission(): Promise<boolean> {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      stream.getTracks().forEach((track) => track.stop())
      return true
    } catch (error) {
      console.error("Microphone permission denied:", error)
      return false
    }
  }

  async startRecording(): Promise<void> {
    if (this.isRecording) return

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      })

      this.mediaRecorder = new MediaRecorder(stream, {
        mimeType: "audio/webm;codecs=opus",
      })

      this.audioChunks = []

      this.mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          this.audioChunks.push(event.data)
        }
      }

      this.mediaRecorder.start(100) // Sammle Daten alle 100ms
      this.isRecording = true
    } catch (error) {
      console.error("Failed to start recording:", error)
      throw error
    }
  }

  async stopRecording(): Promise<Blob> {
    return new Promise((resolve, reject) => {
      if (!this.mediaRecorder || !this.isRecording) {
        reject(new Error("Not recording"))
        return
      }

      this.mediaRecorder.onstop = () => {
        const audioBlob = new Blob(this.audioChunks, { type: "audio/webm" })
        this.isRecording = false

        // Stoppe alle Audio-Tracks
        if (this.mediaRecorder?.stream) {
          this.mediaRecorder.stream.getTracks().forEach((track) => track.stop())
        }

        resolve(audioBlob)
      }

      this.mediaRecorder.stop()
    })
  }

  async convertToBase64(audioBlob: Blob): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = () => resolve(reader.result as string)
      reader.onerror = reject
      reader.readAsDataURL(audioBlob)
    })
  }

  createAudioElement(audioBlob: Blob): HTMLAudioElement {
    const audio = new Audio()
    audio.src = URL.createObjectURL(audioBlob)
    audio.controls = true
    return audio
  }

  async getDuration(audioBlob: Blob): Promise<number> {
    return new Promise((resolve) => {
      const audio = new Audio()
      audio.src = URL.createObjectURL(audioBlob)

      audio.onloadedmetadata = () => {
        resolve(audio.duration)
        URL.revokeObjectURL(audio.src)
      }
    })
  }

  formatDuration(seconds: number): string {
    const mins = Math.floor(seconds / 60)
    const secs = Math.floor(seconds % 60)
    return `${mins}:${secs.toString().padStart(2, "0")}`
  }

  getRecordingState(): boolean {
    return this.isRecording
  }
}

export const voiceManager = new VoiceManager()
