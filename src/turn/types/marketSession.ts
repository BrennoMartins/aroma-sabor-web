export type TurnStatus = 'OPEN' | 'CLOSED'

export type MarketSession = {
  id: string
  openedAt: string
  closedAt: string | null
  operatorName: string
  status: TurnStatus
  openingNote: string | null
  closingNote: string | null
  durationInMinutes: number | null
}

export type OpenMarketPayload = {
  operatorName: string
  openingNote?: string
}

export type CloseMarketPayload = {
  closingNote: string
}

export type UseMarketSessionResult = {
  currentTurn: MarketSession | null
  isOpen: boolean
  isLoading: boolean
  error: string | null
  isOpening: boolean
  isClosing: boolean
  openMarket: (payload: OpenMarketPayload) => Promise<MarketSession | null>
  closeMarket: (payload: CloseMarketPayload) => Promise<void>
  refreshCurrentTurn: () => Promise<void>
}
