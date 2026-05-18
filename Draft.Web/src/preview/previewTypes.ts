export type SourceMappedNode = {
  position?: {
    start?: {
      line?: number
      offset?: number
    }
    end?: {
      offset?: number
    }
  }
}

export type HastNode = {
  children?: HastNode[]
  position?: {
    start?: {
      offset?: number
    }
    end?: {
      offset?: number
    }
  }
  properties?: Record<string, unknown>
  tagName?: string
  type: string
  value?: string
}
