type SoundName = 'tap' | 'type' | 'save' | 'error' | 'delete' | 'download' | 'glasses'

const soundMap: Record<SoundName, number[]> = {
  tap: [520, 700],
  type: [980],
  save: [620, 820, 1040],
  error: [220, 170],
  delete: [300, 210],
  download: [440, 660, 880],
  glasses: [740, 980, 1240],
}

let audioContext: AudioContext | null = null

function getAudioContext() {
  const AudioContextClass = window.AudioContext ?? window.webkitAudioContext

  if (!AudioContextClass) {
    return null
  }

  try {
    audioContext ??= new AudioContextClass()
  } catch {
    return null
  }

  return audioContext
}

export function playSound(name: SoundName) {
  const context = getAudioContext()

  if (!context) {
    return
  }

  if (context.state === 'suspended') {
    void context.resume()
  }

  const now = context.currentTime

  soundMap[name].forEach((frequency, index) => {
    const oscillator = context.createOscillator()
    const gain = context.createGain()
    const startsAt = now + index * 0.065
    const endsAt = startsAt + (name === 'type' ? 0.028 : name === 'glasses' ? 0.055 : 0.075)
    const volume = name === 'type' ? 0.009 : name === 'glasses' ? 0.035 : 0.05
    const pitch = name === 'type' ? frequency + Math.random() * 80 : frequency

    oscillator.type = name === 'error' || name === 'delete' ? 'triangle' : 'sine'
    oscillator.frequency.setValueAtTime(pitch, startsAt)
    gain.gain.setValueAtTime(0.0001, startsAt)
    gain.gain.exponentialRampToValueAtTime(volume, startsAt + 0.006)
    gain.gain.exponentialRampToValueAtTime(0.0001, endsAt)

    oscillator.connect(gain)
    gain.connect(context.destination)
    oscillator.start(startsAt)
    oscillator.stop(endsAt)
  })
}
