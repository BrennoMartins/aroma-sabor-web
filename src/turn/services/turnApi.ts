import { api } from '../../shared/api/axios'
import type {
  CloseMarketPayload,
  MarketSession,
  OpenMarketPayload,
} from '../types/marketSession'

export type CloseMarketResponse = Pick<
  MarketSession,
  'id' | 'openedAt' | 'closedAt' | 'status' | 'closingNote' | 'durationInMinutes'
>

export async function getCurrentTurn() {
  const response = await api.get<MarketSession>('/turns/current')

  return response.data
}

export async function getAllTurns() {
  const response = await api.get<MarketSession[]>('/turns')

  return response.data
}

export async function openTurn(payload: OpenMarketPayload) {
  const response = await api.post<MarketSession>('/turns/open', payload)

  return response.data
}

export async function closeTurn(turnId: string, payload: CloseMarketPayload) {
  const response = await api.post<CloseMarketResponse>(`/turns/${turnId}/close`, payload)

  return response.data
}