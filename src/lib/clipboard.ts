// ── Clipboard utilities ──

import { useToast } from './toast'

export function useClipboard() {
  const { toast } = useToast()

  const copy = async (text: string, label = 'Copied') => {
    try {
      await navigator.clipboard.writeText(text)
      toast(`${label} ✓`)
    } catch {
      toast('Failed to copy', 'error')
    }
  }

  return { copy }
}
