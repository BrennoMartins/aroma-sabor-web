export type MarketSessionState = {
  isOpen: boolean
  openedAt: number | null
  elapsedTime: number
}

export type MarketSessionActions = {
  openMarket: () => void
  closeMarket: () => void
}

export type UseMarketSessionResult = MarketSessionState & MarketSessionActions
