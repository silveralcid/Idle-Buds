import type { BattleResult, Bud, Gear } from '../src/game/types.ts'

export type MarketAsset = { kind: 'item'; itemId: string } | { kind: 'bud' | 'gear'; instanceId: string }
export type MarketSide = 'sell' | 'buy'

export type WorldCommand =
  | { type: 'market.list'; asset: MarketAsset; quantity: number; unitPrice: number }
  | { type: 'market.order'; itemId: string; quantity: number; unitPrice: number }
  | { type: 'market.fill'; listingId: string; quantity: number }
  | { type: 'market.cancel'; listingId: string }
  | { type: 'store.buy' | 'store.sell'; itemId: string; quantity: number }
  | { type: 'chat.send'; text: string }
  | { type: 'chat.report'; messageId: string; reason: string }
  | { type: 'social.friend' | 'social.unfriend' | 'social.block' | 'social.unblock' | 'social.mute' | 'social.unmute'; username: string }
  | { type: 'clan.create' | 'clan.join'; name: string }
  | { type: 'clan.leave' }
  | { type: 'clan.contribute'; quantity: number }
  | { type: 'pvp.publish' | 'pvp.match' }

export interface MarketListing {
  id: string
  owner: string
  side: MarketSide
  asset: MarketAsset
  remaining: number
  unitPrice: number
  bud?: Bud
  gear?: Gear
}

export interface StoreLine {
  itemId: string
  quantity: number
  maxStock: number
  buyPrice: number
  sellPrice: number
}

export interface WorldView {
  tradingUnlocked: boolean
  budTradeUnlocked: boolean
  communityUnlocked: boolean
  rankedUnlocked: boolean
  listings: MarketListing[]
  store: StoreLine[]
  chat: { id: string; username: string; text: string; sentAt: number }[]
  friends: { username: string; status: 'accepted' | 'incoming' | 'outgoing' }[]
  blocked: string[]
  muted: string[]
  clans: { name: string; members: number; total: number; target: number }[]
  clan: { name: string; total: number; target: number; contributed: number; bonus: boolean } | null
  ranked: {
    rating: number
    published: boolean
    prestige: string | null
    leaders: { username: string; rating: number; prestige: string | null }[]
    history: { id: string; opponent: string; isAttacker: boolean; playedAt: number; ratingChange: number; result: BattleResult }[]
  }
}
