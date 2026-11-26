import { useState } from 'react'
import { GEAR_DEFINITIONS, ITEM_DEFINITIONS, SPECIES } from '../data/index.ts'
import { isBudCommitted, itemCapacity } from '../game/index.ts'
import type { MarketAsset, MarketListing, StoreLine, WorldView } from '../../server/world-types.ts'
import { Empty } from './shared.tsx'
import { itemName, number, speciesName } from './view-model.ts'
import type { GamePanelProps } from './shared.tsx'

export function MarketPanel({ world, ...props }: GamePanelProps & { world: WorldView }) {
  const views = ['Listings', 'Post listing', 'Fund buy order', 'General store'] as const
  const [view, setView] = useState<typeof views[number]>('Listings')
  return <div className="stack">
    <header className="section-heading"><h1 tabIndex={-1}>Market</h1><p>{number(props.state.coins)} coins · Trade with Tenders or buy essentials from the general store.</p></header>
    {!world.tradingUnlocked && <p className="banner">Gather five items or finish a recipe to unlock player trading. The general store is open.</p>}
    {world.tradingUnlocked && !world.budTradeUnlocked && <p className="banner">Catch your first wild Bud to unlock buying Buds from other Tenders.</p>}
    <div className="segmented" aria-label="Market view">{views.map((entry) => <button key={entry} aria-pressed={entry === view} onClick={() => setView(entry)}>{entry}</button>)}</div>
    {view === 'Listings' && <Listings world={world} {...props} />}
    {view === 'Post listing' && <OfferForm key="sell" buy={false} {...props} disabled={props.disabled || !world.tradingUnlocked} />}
    {view === 'Fund buy order' && <OfferForm key="buy" buy {...props} disabled={props.disabled || !world.tradingUnlocked} />}
    {view === 'General store' && <div className="grid">{world.store.map((line) => <StoreCard key={line.itemId} line={line} {...props} />)}</div>}
  </div>
}

function OfferForm({ buy, state, disabled, run }: GamePanelProps & { buy: boolean }) {
  const [kind, setKind] = useState<MarketAsset['kind']>('item')
  const [id, setId] = useState('')
  const [quantity, setQuantity] = useState(1)
  const [unitPrice, setUnitPrice] = useState(1)
  const options = kind === 'item'
    ? Object.keys(ITEM_DEFINITIONS).filter((item) => buy || (state.inventory[item] ?? 0) > 0).map((item) => ({ id: item, label: itemName(item) }))
    : kind === 'bud' ? state.buds.filter((bud) => !bud.protected && !isBudCommitted(state, bud.id)).map((bud) => ({ id: bud.id, label: `${speciesName(bud.speciesId)} · ${bud.id}` }))
      : state.equipment.filter((gear) => !Object.values(state.loadout).includes(gear.id)).map((gear) => ({ id: gear.id, label: `${GEAR_DEFINITIONS[gear.definitionId].name} +${gear.bonus} · ${gear.id}` }))
  const chosen = options.some((option) => option.id === id) ? id : ''
  const amount = kind === 'item' ? quantity : 1
  const total = amount * unitPrice
  const missing = buy ? total > state.coins : kind === 'item' && Boolean(chosen) && amount > (state.inventory[id] ?? 0)
  return <form className="surface stack" onSubmit={async (event) => {
    event.preventDefault()
    const asset: MarketAsset = kind === 'item' ? { kind, itemId: chosen } : { kind, instanceId: chosen }
    if (await run(buy ? { type: 'market.order', itemId: chosen, quantity: amount, unitPrice } : { type: 'market.list', asset, quantity: amount, unitPrice })) {
      setId('')
      setQuantity(1)
    }
  }}>
    <h2>{buy ? 'Fund a buy order' : 'Post a sell listing'}</h2>
    <p className="muted">{buy ? 'The full order cost is reserved up front. Cancel an open order to reclaim unused coins.' : 'Listed goods are reserved until settlement or cancellation. Completed sales deduct a seller tax.'}</p>
    <div className="form-grid">
      {!buy && <label>Asset type<select value={kind} onChange={(event) => { setKind(event.target.value as MarketAsset['kind']); setId('') }}><option value="item">Supply</option><option value="bud">Bud</option><option value="gear">Equipment</option></select></label>}
      <label>{kind === 'item' ? 'Supply' : kind === 'bud' ? 'Bud' : 'Equipment'}<select required value={chosen} onChange={(event) => setId(event.target.value)}>
        <option value="">{options.length ? 'Select an asset' : 'No eligible assets'}</option>{options.map((option) => <option key={option.id} value={option.id}>{option.label}</option>)}
      </select></label>
      {kind === 'item' && <label>Quantity<input type="number" min="1" max="1000" required value={quantity || ''} onChange={(event) => setQuantity(Number(event.target.value))} /></label>}
      <label>Price per unit in coins<input type="number" min="1" max="1000000" required value={unitPrice || ''} onChange={(event) => setUnitPrice(Number(event.target.value))} /></label>
    </div>
    <div className="row"><button className="primary" disabled={disabled || !chosen || missing}>{buy ? 'Place buy order' : 'Post listing'}</button><small>{number(total)} coins {buy ? 'reserved' : 'before tax'}</small></div>
    {missing && <p className="attention">{buy ? 'You need more coins to fund this quantity.' : 'You need more units to list this quantity.'}</p>}
  </form>
}

function Listings({ world, ...props }: GamePanelProps & { world: WorldView }) {
  const [side, setSide] = useState('all')
  const listings = world.listings.filter((listing) => side === 'all' || (side === 'mine' ? listing.owner === props.state.name : listing.side === side))
  return <section className="stack">
    <div className="spread"><h2>Open orders and listings</h2><label>Show<select value={side} onChange={(event) => setSide(event.target.value)}><option value="all">All listings</option><option value="sell">Offered for sale</option><option value="buy">Funded buy orders</option><option value="mine">Your listings</option></select></label></div>
    <p className="muted">Seller tax is 5%, rounded up to a whole coin. A completed clan goal reduces the rate to 3%. The seller always receives at least one coin.</p>
    {listings.length === 0 && <Empty>{side === 'all' ? 'The player market is empty. Post a listing or visit the general store.' : 'No open listings match that filter.'}</Empty>}
    <div className="grid">{listings.map((listing) => <ListingCard key={listing.id} listing={listing} world={world} {...props} />)}</div>
  </section>
}

function ListingCard({ listing, world, state, disabled, run }: GamePanelProps & { listing: MarketListing; world: WorldView }) {
  const [quantity, setQuantity] = useState(1)
  const { asset, bud, gear } = listing
  const name = asset.kind === 'item' ? itemName(asset.itemId) : bud ? speciesName(bud.speciesId) : gear ? GEAR_DEFINITIONS[gear.definitionId].name : 'Unique asset'
  const buying = listing.side === 'sell'
  const mine = listing.owner === state.name
  const total = quantity * listing.unitPrice
  const reason = !world.tradingUnlocked ? 'Player trading is locked.' : quantity > listing.remaining ? 'Fewer units are available.'
    : buying && asset.kind === 'bud' && !world.budTradeUnlocked ? 'Catch your first wild Bud before buying one.'
      : buying && total > state.coins ? 'You need more coins.'
        : !buying && asset.kind === 'item' && quantity > (state.inventory[asset.itemId] ?? 0) ? 'You need more units of this supply.' : null
  return <article className="surface stack" aria-label={`${name} by ${listing.owner}`}>
    <div className="spread"><h3>{name}</h3><span className="tag">{buying ? 'For sale' : 'Buy order'}</span></div>
    <p>{number(listing.remaining)} available · {number(listing.unitPrice)} coins each · {mine ? 'Posted by you' : listing.owner}</p>
    {bud && <p className="muted">{SPECIES[bud.speciesId].affinity} · {bud.sex} · {bud.trait} · IVs {Object.entries(bud.ivs).map(([key, value]) => `${key} ${value}`).join(', ')}</p>}
    {gear && <p className="muted">+{gear.bonus} {gear.slot === 'weapon' ? 'Attack' : 'Health'}{gear.technique && ` · ${gear.technique}`}{gear.maker && ` · Made by ${gear.maker}`}</p>}
    {mine ? <button disabled={disabled} onClick={() => void run({ type: 'market.cancel', listingId: listing.id })}>Cancel {buying ? 'listing' : 'order'}</button> :
      <form className="stack tight" onSubmit={(event) => { event.preventDefault(); void run({ type: 'market.fill', listingId: listing.id, quantity }) }}>
        {asset.kind === 'item' && <label>Quantity<input type="number" min="1" max={listing.remaining} required value={quantity || ''} onChange={(event) => setQuantity(Number(event.target.value))} /></label>}
        <div className="row"><button className="primary" disabled={disabled || Boolean(reason)}>{buying ? 'Buy' : 'Fill buy order'}</button><small>{number(total)} coins{!buying && ' before tax'}</small></div>
        {reason && <small className="attention">{reason}</small>}
      </form>}
  </article>
}

function StoreCard({ line, state, disabled, run }: GamePanelProps & { line: StoreLine }) {
  const [quantity, setQuantity] = useState(1)
  const owned = state.inventory[line.itemId] ?? 0
  const buyPrice = line.buyPrice * quantity
  const sellPrice = line.sellPrice * quantity
  const buyMax = Math.min(line.quantity, Math.floor(state.coins / line.buyPrice), itemCapacity(state) - owned)
  const sellMax = Math.min(owned, line.maxStock - line.quantity)
  return <article className="surface stack" aria-label={`${itemName(line.itemId)} general store`}>
    <div className="spread"><h2>{itemName(line.itemId)}</h2><span className="tag">{line.quantity} in stock</span></div>
    <p className="muted">Buy for {line.buyPrice} coins each · Sell for {line.sellPrice} · {owned} owned</p>
    <label>Quantity<input type="number" min="1" max="1000" value={quantity || ''} onChange={(event) => setQuantity(Number(event.target.value))} /></label>
    <div className="row">
      <button className="primary" disabled={disabled || !Number.isInteger(quantity) || quantity < 1 || quantity > buyMax} onClick={() => void run({ type: 'store.buy', itemId: line.itemId, quantity })}>Buy for {number(buyPrice)}</button>
      <button disabled={disabled || !Number.isInteger(quantity) || quantity < 1 || quantity > sellMax} onClick={() => void run({ type: 'store.sell', itemId: line.itemId, quantity })}>Sell for {number(sellPrice)}</button>
    </div>
    <small>Can buy {buyMax} · Can sell {sellMax}</small>
  </article>
}
