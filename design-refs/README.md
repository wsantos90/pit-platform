# Design References — P.I.T Platform

## Visual Direction: "Clean Data Stadium"

The PIT design system follows a **professional sports analytics aesthetic** — think Transfermarkt meets a modern SaaS dashboard, not a flashy esports arena. The primary reference is **Piotr Kosmala's football statistics dashboard work** (dribbble.com/piotrkadesign).

**Core principles:**
- 90% neutral (dark navy + grays) / 10% strategic accent color
- Data organized and readable at a glance — no visual noise
- Space as structure: breathing room separates sections, not lines or borders
- Professional and differentiated — does NOT look AI-generated or templated

---

## Reference Inventory

### Primary Reference: Piotr Kosmala — Football Statistics Suite

**Style:** Dark navy, clean typography, muted acentos, dados acima de tudo

| Design | URL | Relevância no PIT |
|--------|-----|------------------|
| Player Stats Dashboard | [Dribbble](https://dribbble.com/shots/6336391-Football-player-statistics-dashboard) | **Player Profile page** — hero, gauges, career table |
| Team Dashboard | [Dribbble](https://dribbble.com/shots/6382958-Dashboard-for-football-team) | **Team Overview page** — stats grid, roster |
| Football Scouting Search | [Dribbble](https://dribbble.com/shots/21653300-Football-scouting-search-results) | **Discovery/Rankings** — filtered list, player cards |
| FM Player Instructions | [Dribbble](https://dribbble.com/shots/20084206-Football-Manager-Improved-Player-instructions) | **Lineup page** — tactical/formation view |

**Key patterns to adopt:**
- Dark navy background (~`#1a1d2e`) with subtle elevation for cards
- Player hero: photo + gamertag + primary stats inline, compact
- Career history: clean table, team badge + stats per season
- Radar charts for attribute comparison (6 axes)
- Goals/stats gauge: semicircular, value large and centered
- Accent color used sparingly — only for active state, CTAs, and chart lines
- Sidebar: icons + labels, compact, active item has left-border pill

---

### Stitch Mockups Gerados (`design-system/`)

| Arquivo | Página | Elementos-chave |
|---------|--------|----------------|
| `image.png` | Player Profile — Tactical Analysis | Radar chart, Player Comparison, Career History, Goals gauge, Match History, Best Scorers sidebar |
| `image copy.png` | Live Match Stats & Analysis | Score ao vivo, stats bars (Possession/Corners/Shots/Fouls), timeline de eventos, campo com formação |
| `image copy 3.png` | Players Database Explorer | Filter sidebar (Age, Position, League, Market Value, Nationality), tabela com sparklines |

**Correção necessária nos mockups:** O accent color está orange como primária, mas a decisão final é **blue como primary, orange como accent/CTA pontual**.

---

### Referências de Componentes

| Fonte | O que pegar |
|-------|------------|
| [ProClubsTracker.com](https://proclubstracker.com/) | **Mat stats** — barras head-to-head por categoria (Scoring/Passing/Defending/Discipline) |
| [ProClubsTracker.com](https://proclubstracker.com/) | **Results ticker** — barra horizontal rolante com últimos resultados + logos |
| [GameIn Esports](https://www.theskinsfactory.com/gamein-esports-web-design) | **Team Profile** — banner + sponsors + achievements + scrim schedule/history |
| [GameIn Esports](https://www.theskinsfactory.com/gamein-esports-web-design) | **Tier badges** — conceito de ranks/certificações visuais por nível |
| [Nixtio — Football Manager](https://dribbble.com/shots/24895132) | **Roster list** — tabela limpa com jogadores, salários, dados financeiros |
| [OneSports Figma](https://www.figma.com/community/file/1179239113434622291) | **Standings table** — classificação com bandeiras, win/loss |
| [Dark Theme UI Kit](https://www.figma.com/community/file/1185617660562911231) | **Card spacing** — bom espaçamento, hierarquia clara, sidebar compacta |

---

### O que NÃO usar (referências rejeitadas)

| Fonte | Motivo |
|-------|--------|
| ProClubStats.com | "muito básico, AI-generated, sem diferencial" |
| ProClubsTracker.com (estilo geral) | "muito básico" — só aproveitar o conceito de mat stats |
| VirtualProGaming.com | "básico, profissional mas sem diferencial" |
| Glassmorphism excessivo | "tem que pensar bem na estrutura, para não ficar poluído" |
| Gradientes em CTAs | Fora do "Piotr Kosmala puro" |
| Glow effects em charts | Fora do estilo — linhas sólidas limpas |
| Overlap elements | Fora do estilo — tudo contido nos limites |

---

## Mapeamento: Página PIT → Referência Principal

| Página PIT | Referência | Elementos |
|-----------|-----------|-----------|
| Player Profile | Piotr Kosmala Player Stats + Mockup `image.png` | Radar, gauge, career table, comparison |
| Match Detail | ProClubsTracker mat stats + Mockup `image copy.png` | Barras H2H, timeline de eventos, campo |
| Players/Rankings | Piotr Kosmala Scouting + Mockup `image copy 3.png` | Filtros, tabela com sparklines |
| Team Profile | GameIn + Piotr Kosmala Team | Banner, stats, achievements, schedule |
| Team Roster | Nixtio + Piotr Kosmala | Lista de jogadores, posições, dados |
| Dashboard | Dark Theme UI Kit | Cards espaçados, widgets de overview |
| Tournaments | GameIn + Piotr Kosmala | Bracket view, lista de torneios |
| Moderation/Admin | Dark Theme UI Kit | Tabelas, sidebar compacta |
| Rankings | OneSports | Standings table, paginação |
| Landing | GameIn (visual) + Piotr Kosmala (estrutura) | Hero, CTAs, features |
