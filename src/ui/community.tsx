import { useEffect, useRef, useState } from 'react'
import type { Dispatch, SetStateAction } from 'react'
import type { WorldView } from '../../server/world-types.ts'
import { BattleReplay } from './battle-replay.tsx'
import { Empty, Modal } from './shared.tsx'
import { itemName, number } from './view-model.ts'
import type { GamePanelProps } from './shared.tsx'

const timestamp = new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'short', timeZone: 'UTC' })

function Clock({ at }: { at: number }) {
  return <time className="muted" dateTime={new Date(at).toISOString()}>{timestamp.format(at)} UTC</time>
}

export function CommunityPanel({ world, openChat, ...props }: GamePanelProps & { world: WorldView; openChat: () => void }) {
  return <div className="stack">
    <header className="section-heading"><h1 tabIndex={-1}>Community</h1><p>Talk with other Tenders, find friends, and work toward a shared clan goal.</p></header>
    {!world.communityUnlocked && <p className="banner">Gather five items or finish a recipe to unlock sending messages, friend requests, and clan membership.</p>}
    <button className="chat-open-link" onClick={openChat}>Open global chat</button>
    <div className="grid"><Friends world={world} {...props} /><Clan world={world} {...props} /></div>
  </div>
}

export type ChatMode = 'closed' | 'minimized' | 'expanded'

export function ChatDock({ world, mode, setMode, ...props }: GamePanelProps & {
  world: WorldView | null; mode: ChatMode; setMode: (mode: ChatMode) => void
}) {
  const [text, setText] = useState('')
  if (mode === 'closed') return null
  const latest = world?.chat.at(-1)
  return <aside className={`chat-dock ${mode}`} aria-label="Chat panel">
    <header className="chat-dock-heading"><button className="quiet chat-title" aria-expanded={mode === 'expanded'} onClick={() => setMode(mode === 'expanded' ? 'minimized' : 'expanded')}>◌ <strong>Global chat</strong><span aria-hidden="true">{mode === 'expanded' ? '⌄' : '⌃'}</span></button><button className="icon-button quiet" aria-label="Close chat" onClick={() => setMode('closed')}>×</button></header>
    {mode === 'minimized' ? <button className="chat-preview quiet" aria-label="Expand chat" onClick={() => setMode('expanded')}>{latest ? `${latest.username}: ${latest.text}` : 'No messages yet'}</button>
      : world ? <Chat world={world} text={text} setText={setText} {...props} /> : <p className="empty">Connecting to chat…</p>}
  </aside>
}

function Chat({ world, state, disabled, run, text, setText }: GamePanelProps & { world: WorldView; text: string; setText: Dispatch<SetStateAction<string>> }) {
  const [report, setReport] = useState<WorldView['chat'][number] | null>(null)
  const [reason, setReason] = useState('')
  const log = useRef<HTMLUListElement>(null)
  const following = useRef(true)
  useEffect(() => {
    if (following.current && log.current) log.current.scrollTop = log.current.scrollHeight
  }, [world.chat])
  return <section className="chat-content stack" aria-label="Global chat">
    {world.chat.length === 0 && <Empty>No messages to show.</Empty>}
    <ul className="list chat-log" ref={log} aria-label="Recent chat messages" onScroll={(event) => { const element = event.currentTarget; following.current = element.scrollHeight - element.scrollTop - element.clientHeight < 48 }}>{world.chat.map((message) => <li className="chat-message" key={message.id}>
      <div className="spread"><strong>{message.username}</strong><small><time dateTime={new Date(message.sentAt).toISOString()}>{new Date(message.sentAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</time></small></div>
      <p>{message.text}</p>
      {message.username !== state.name && <details className="chat-message-actions"><summary aria-label={`Actions for ${message.username}'s message`}>•••</summary><div className="row">
        <button className="small quiet" disabled={disabled} onClick={() => { setReason(''); setReport(message) }}>Report</button>
        <button className="small quiet" disabled={disabled} onClick={() => void run({ type: 'social.mute', username: message.username })}>Mute {message.username}</button>
        <button className="small quiet" disabled={disabled} onClick={() => void run({ type: 'social.block', username: message.username })}>Block {message.username}</button>
      </div></details>}
    </li>)}</ul>
    <form className="form-grid" onSubmit={async (event) => {
      event.preventDefault()
      const submitted = text.trim()
      if (await run({ type: 'chat.send', text: submitted })) { setText((current) => current.trim() === submitted ? '' : current); following.current = true }
    }}>
      <label className="chat-message-input"><span className="sr-only">Message</span><input placeholder={world.communityUnlocked ? 'Message…' : 'Gather 5 items to chat'} required maxLength={240} value={text} onChange={(event) => setText(event.target.value)} /></label>
      <button className="primary" aria-label="Send message" disabled={disabled || !world.communityUnlocked || !text.trim()}>Send</button>
    </form>
    {report && <Modal title={`Report a message from ${report.username}`} close={() => setReport(null)}>
      <form className="stack" onSubmit={async (event) => {
        event.preventDefault()
        if (await run({ type: 'chat.report', messageId: report.id, reason: reason.trim() })) setReport(null)
      }}>
        <p className="muted">{report.text}</p>
        <label>Report reason<input required maxLength={120} value={reason} onChange={(event) => setReason(event.target.value)} /></label>
        <div className="row"><button type="button" onClick={() => setReport(null)}>Cancel</button><button className="primary" disabled={disabled || !reason.trim()}>File report</button></div>
      </form>
    </Modal>}
  </section>
}

function Friends({ world, disabled, run }: GamePanelProps & { world: WorldView }) {
  const [username, setUsername] = useState('')
  const canAdd = world.communityUnlocked && username.trim().length >= 3
  return <section className="surface stack" aria-label="Friends and controls">
    <h2>Friends</h2>
    {world.friends.length === 0 && <Empty>No friends or pending requests.</Empty>}
    <ul className="list">{world.friends.map((friend) => <li className="spread" key={friend.username}>
      <div><strong>{friend.username}</strong><p className="muted">{friend.status === 'accepted' ? 'Friend' : friend.status === 'incoming' ? 'Incoming request' : 'Request sent'}</p></div>
      <div className="row">
        {friend.status === 'incoming' && <button className="small" disabled={disabled || !world.communityUnlocked} onClick={() => void run({ type: 'social.friend', username: friend.username })}>Accept</button>}
        <button className="small quiet" disabled={disabled} onClick={() => void run({ type: 'social.unfriend', username: friend.username })}>{friend.status === 'accepted' ? 'Remove friend' : friend.status === 'incoming' ? 'Decline' : 'Cancel request'}</button>
      </div>
    </li>)}</ul>
    <label>Tender username<input value={username} maxLength={24} autoComplete="off" onChange={(event) => setUsername(event.target.value)} /></label>
    <div className="row">
      <button className="primary" disabled={disabled || !canAdd} onClick={async () => {
        if (await run({ type: 'social.friend', username })) setUsername('')
      }}>Send friend request</button>
      <button disabled={disabled || username.trim().length < 3} onClick={() => void run({ type: 'social.block', username })}>Block Tender</button>
      <button disabled={disabled || username.trim().length < 3} onClick={() => void run({ type: 'social.mute', username })}>Mute Tender</button>
    </div>
    {(world.blocked.length > 0 || world.muted.length > 0) && <div className="stack tight"><h3>Blocked and muted Tenders</h3>
      <ul className="list">
        {world.blocked.map((name) => <li className="spread" key={`blocked-${name}`}>{name}<button disabled={disabled} onClick={() => void run({ type: 'social.unblock', username: name })}>Unblock</button></li>)}
        {world.muted.map((name) => <li className="spread" key={`muted-${name}`}>{name}<button disabled={disabled} onClick={() => void run({ type: 'social.unmute', username: name })}>Unmute</button></li>)}
      </ul>
    </div>}
  </section>
}

function Clan({ world, state, disabled, run }: GamePanelProps & { world: WorldView }) {
  const [name, setName] = useState('')
  const [quantity, setQuantity] = useState(1)
  const { clan } = world
  const owned = state.inventory.fiber ?? 0
  const canContribute = clan && quantity <= Math.min(owned, clan.target - clan.total)
  const [confirm, setConfirm] = useState(false)
  return <section className="surface stack" aria-label="Clans">
    <h2>Clans</h2>
    {clan ? <>
      <div className="spread"><h3>{clan.name}</h3><button className="quiet small" disabled={disabled} onClick={() => setConfirm(true)}>Leave clan</button></div>
      <p>{clan.total}/{clan.target} Bramble Fiber · {clan.contributed} from you</p>
      <progress aria-label="Clan goal progress" value={clan.total} max={clan.target} />
      {clan.bonus ? <p className="attention">Goal complete · Clan members pay a lower market sale tax.</p> : <form className="form-grid" onSubmit={(event) => {
        event.preventDefault()
        void run({ type: 'clan.contribute', quantity })
      }}>
        <label>{itemName('fiber')} to contribute ({owned} owned)<input type="number" required min="1" max={Math.max(1, clan.target - clan.total)} value={quantity || ''} onChange={(event) => setQuantity(Number(event.target.value))} /></label>
        <button className="primary" disabled={disabled || !canContribute}>Contribute fiber</button>
      </form>}
      {confirm && <Modal title={`Leave ${clan.name}?`} close={() => setConfirm(false)}><div className="stack">
        <p>Your contributed fiber stays with the clan.</p>
        <div className="row"><button onClick={() => setConfirm(false)}>Stay in clan</button><button className="danger" disabled={disabled} onClick={async () => { if (await run({ type: 'clan.leave' })) setConfirm(false) }}>Leave clan</button></div>
      </div></Modal>}
    </> : <>
      <p className="muted">Join a clan and work toward a shared Bramble Fiber goal for a lower market sale tax.</p>
      <form className="form-grid" onSubmit={(event) => { event.preventDefault(); void run({ type: 'clan.create', name }) }}>
        <label>New clan name<input required minLength={3} maxLength={24} value={name} onChange={(event) => setName(event.target.value)} /></label>
        <button className="primary" disabled={disabled || !world.communityUnlocked}>Create clan</button>
      </form>
      {world.clans.length === 0 && <Empty>No clans have been formed yet.</Empty>}
      <ul className="list">{world.clans.map((entry) => <li className="spread" key={entry.name}>
        <div><strong>{entry.name}</strong><p className="muted">{entry.members}/24 members · {entry.total}/{entry.target} fiber</p></div>
        <button disabled={disabled || !world.communityUnlocked || entry.members >= 24} onClick={() => void run({ type: 'clan.join', name: entry.name })}>Join {entry.name}</button>
      </li>)}</ul>
    </>}
  </section>
}

export function RankedPanel({ world, state, disabled, run }: GamePanelProps & { world: WorldView }) {
  const { ranked } = world
  const blocked = !world.rankedUnlocked ? 'Catch a wild Bud and win three encounters to unlock ranked play.' : state.formation.length === 0 ? 'Add at least one available Bud to your formation.' : null
  return <div className="stack">
    <header className="section-heading"><h1 tabIndex={-1}>Ranked</h1><p>Fight a blind match against another Tender’s published defense.</p></header>
    <section className="surface stack">
      <dl className="stat-line"><div><dt>Rating</dt><dd>{number(ranked.rating)}</dd></div><div><dt>Defense</dt><dd>{ranked.published ? 'Published' : 'Unpublished'}</dd></div><div><dt>Prestige</dt><dd>{ranked.prestige ?? 'Earn Portal Vanguard after three ranked wins'}</dd></div></dl>
      <p className="muted">Publishing copies your current legal formation. Publish again when you want your defense to reflect a lineup change.</p>
      {blocked && <p className="attention">{blocked} <a href={world.rankedUnlocked ? '#formation' : '#combat'}>{world.rankedUnlocked ? 'Go to Formation' : 'Go to Combat'}</a></p>}
      <div className="row">
        <button disabled={disabled || Boolean(blocked)} onClick={() => void run({ type: 'pvp.publish' })}>{ranked.published ? 'Update defense' : 'Publish defense'}</button>
        <button className="primary" disabled={disabled || Boolean(blocked)} onClick={() => void run({ type: 'pvp.match' })}>Find ranked match</button>
      </div>
    </section>
    <section className="surface stack"><h2>Match history</h2>
      {ranked.history.length === 0 && <Empty>No ranked matches yet.</Empty>}
      <ol className="list">{ranked.history.map((match) => {
        const victor = match.isAttacker ? 'left' : 'right'
        return <li className="surface subtle stack tight" key={match.id}>
          <div className="spread"><strong>{match.result.winner === 'draw' ? 'Draw' : match.result.winner === victor ? 'Win' : 'Loss'} against {match.opponent}</strong><span className="tag">{match.ratingChange > 0 ? '+' : ''}{match.ratingChange} rating</span></div>
          <small><Clock at={match.playedAt} /> · {match.isAttacker ? 'Challenge' : 'Defense'}</small>
          <details><summary>Watch battle</summary><BattleReplay result={match.result} battleId={match.id} viewerSide={match.isAttacker ? 'left' : 'right'} leftLabel={match.isAttacker ? state.name : match.opponent} rightLabel={match.isAttacker ? match.opponent : state.name} autoPlay={false} /></details>
        </li>
      })}</ol>
    </section>
    <section className="surface stack"><h2>Leaderboard</h2>
      {ranked.leaders.length === 0 && <Empty>No published defenses yet.</Empty>}
      <ol className="clean-list">{ranked.leaders.map((leader) => <li key={leader.username}><div className="spread"><span>{leader.username}{leader.prestige && ` · ${leader.prestige}`}</span><strong>{number(leader.rating)}</strong></div></li>)}</ol>
    </section>
  </div>
}
