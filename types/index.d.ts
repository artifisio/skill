export type PreviewImage = { url: string; label: string; file?: string }

export type PreparedImage = { file: string; width: number; height: number } | { error: string }

declare module 'claude-code' {
  interface PluginState {
    artifisio: {
      images: PreviewImage[]
      index: number
      prepared: Record<string, PreparedImage>
    }
  }
}
