> Canonical Constitution. Original adopted text is preserved below. The current owner-authorized repository consolidation is a limited exception documented in [authority and scope](../design/AUTHORITY.md); it does not authorize gameplay or lift the BEAT BAES gate.

# Game Development Constitution

## v1.0 \| Adopted November 25, 2026 \| Applies to every game project

Purpose: Protect creative freedom while preventing scope creep, premature abstraction, endless experimentation and unfinished releases. Make games to be played, not systems to be admired.

# The 12 laws

## 1\. Finish before starting

Only one game may be in active implementation at a time. Until the BEAT BAES demo is officially public and playable, BEAT BAES is the only authorized implementation project. Other games are research, planning and design only.

## 2\. Fun before engineering

Every gameplay system must serve an identifiable player experience. Technical sophistication, architectural elegance and the number of implemented systems are not gameplay benefits.

## 3\. Ideas are not commitments

All new ideas enter the project's Idea Incubator first. Capture excitement without evaluating it on the spot. Revisit later, qualify against the game's identity and explicitly promote only ideas that deserve to become design decisions. Promotion to design is not approval for implementation.

## 4\. Release scope is sacred

Once a release specification is approved, new work must be deferred, replace equivalent approved work, or receive an explicit scope-change decision acknowledging schedule and cost. Do not quietly expand what must ship.

## 5\. Experimentation is protected but bounded

Experiments need a question, smallest meaningful test, time budget, success criterion and stop condition. A successful experiment is evidence, not automatic permission to ship it. Idle Buds experiments remain nonfunctional design exercises while the release gate is active.

## 6\. Build for today

Implement what the approved release needs. Do not construct speculative infrastructure, extension points or general-purpose systems merely because future features might need them.

## 7\. Generalize from evidence

Start concrete. Abstract only after repeated real use cases demonstrate that shared behavior justifies the complexity. Do not invent a universal solution to a single problem.

## 8\. Reuse before creating

Prefer proven engines, libraries, assets and existing systems. A custom alternative requires a current, measurable reason. Novelty alone is not justification.

## 9\. Depth before breadth

Improve existing gameplay loops before adding new ones. A small, compelling loop beats several shallow systems. Reuse content through meaningful combinations rather than generating unnecessary complexity.

## 10\. Play before expanding

Play the actual game frequently and observe players when possible. Let real friction, enjoyment and behavior drive expansion. Theory can justify an initial design, but subsequent expansion should increasingly depend on evidence.

## 11\. Done means playable

Progress is measured by experiences players can actually enjoy. Merged PRs, passing tests, infrastructure and system counts support delivery but cannot substitute for it.

## 12\. Release before perfection

Ship when the agreed release criteria are met, with no unresolved critical security, stability or data-loss issues. Do not move the goalposts because more polish or another feature would be nice.

# The idea pipeline

Capture → qualify later → explicitly promote → approve for a specific release → implement only if authorized. Capture is unrestricted. Qualification is a separate decision, ideally after the initial excitement has faded. A qualified idea can remain parked indefinitely.

The Game Design Bible holds approved identity and design decisions; the Current Release Specification holds only approved must-ship scope and acceptance criteria. The Idea Incubator holds everything speculative, including ideas that sound excellent. A short decision/experiment log records only meaningful decisions and results. Do not duplicate the same information across all documents.

Before promoting an idea, ask: Does it support a core pillar or solve a real player problem? What does the player gain? What evidence or clear design reasoning supports it? Is there a simpler alternative? What development, content, balancing or maintenance cost does it add? Is it worth the opportunity cost? If the answers are unclear, leave it in the incubator.

# Experiment contract

Write a one-paragraph hypothesis: what is being tested, why it matters, the smallest test, the time budget, the success condition and the decision to make afterward. Stop at the budget unless an extension is explicitly approved. Experiment code is disposable by default when implementation is authorized. Record adopt, revise, defer or discard. Adoption into design and release approval remain separate decisions.

Suggested allocation after implementation is authorized: 70% approved release work, 15% testing and polish, 15% controlled experimentation. Before the BEAT BAES demo release, a suggested 80% of game time goes to BEAT BAES and 20% to research/design for other games. These are guidelines, not additional binding rules.

# Anti-overengineering guardrails

A rewrite, language migration, custom engine, new framework, microservice, generalized architecture, agent workflow or internal tool must address a demonstrated current need and be cheaper or safer than the simplest existing approach. Profile before optimizing. Refactor to remove a specific risk or unblock an approved requirement, not for hypothetical extensibility. Favor the smallest implementation that satisfies current acceptance criteria. Production security and data integrity are actual requirements, not optional polish.

# Release contract

Each release has three categories: Must ship (necessary for the promised experience, with objective acceptance criteria), Nice to have (does not delay release), and Not this release (explicitly excluded). Any new must-ship work requires an explicit trade-off or scope reapproval. A completed release is public and accessible to its intended players, not merely feature complete or internally tested.

# Accountability for AI assistants

In creative mode, explore freely and capture ideas. In design mode, challenge assumptions, assess costs and simplify. In production mode, enforce the release specification and require evidence before expansion. Do not infer implementation approval from enthusiasm, a design document, a successful experiment or a future roadmap. Flag scope creep and offer the simpler alternative. Respect the BEAT BAES gate; no repositories, code, working prototypes, implementation agents, infrastructure or production asset commissions for other games until the demo officially releases.

# Developer's creed

I finish before I begin again. I capture every good idea but implement only the necessary ones. I experiment to discover fun, not to justify more features. I build the simplest thing that delivers the intended experience. I measure progress through playable experiences. I allow my games to grow after release. Shipping is the prerequisite for expansion.

