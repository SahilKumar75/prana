# Prana — Design Reference Spec
> Mapped from Intelly Health App (Behance reference). Each screen below
> traces the reference 1:1 for this voice-recording use case.

---

## Brand Tokens

| Token | Value | Usage |
|---|---|---|
| `cream` | `#FDF8F0` | All screen backgrounds |
| `near-black` | `#1A1A1A` | Text, dark buttons, nav bar |
| `pink` | `#F5B8DB` | Sessions blob, mic button, highlights |
| `green` | `#9AAB63` | Processed blob, success states |
| `blue` | `#B6CAEB` | Language blob, info states |
| `yellow` | `#F5D867` | Accuracy blob, warning/offline |
| `white` | `#FFFFFF` | Cards, inputs |
| `border` | `#E8E0D5` | Subtle dividers |

---

## Typography

- Display numbers: `fontSize: 96–108`, `fontWeight: '800'`, `letterSpacing: -5`
- Section headings: `fontSize: 40–46`, `fontWeight: '800'`, `letterSpacing: -2`
- Sub-labels: `fontSize: 13`, `fontWeight: '500'`, `color: #bbb`
- Body: `fontSize: 14–15`, `fontWeight: '500'`, `color: #1A1A1A`
- Caps labels: `fontSize: 11–12`, `fontWeight: '600'`, `textTransform: 'uppercase'`, `letterSpacing: 1`

---

## Navigation (Bottom Tab Bar)

**Reference**: Dark `#1A1A1A` floating pill, `bottom: 16`, `borderRadius: 42`
- 4 tabs: Home · [center mic] · History · Profile
- Center mic: `58px` pink circle elevated `22px` above bar, cream border
- Active icons: white; inactive: `rgba(255,255,255,0.4)`
- NO labels
- Tab bar `height: 62`, left/right inset `16`

---

## Screen 1 — Dashboard (Home)

**Reference mapping**: Intelly home screen

### Layout (top → bottom)
1. **Greeting text** — `"प्राण, how are you feeling today?"` — `fontSize: 18`, warm/personal
2. **Hero number** — total sessions — `fontSize: 100`, `fontWeight: 800`, `letterSpacing: -6`
3. **Sub-label** — `"your session count"` — small, grey
4. **Action row** — [dark pill "Record" + mic icon] [refresh circle] [share circle]
5. **Section header** — `"Daily highlights"` bold + `"Keep going..."` sub + `"Show all"` right
6. **Blob highlights** — 4 organic shapes in a 2-column organic layout (NOT overlapping):
   - **Top-left** (Pink, tall pill): `total sessions`
   - **Top-right** (Yellow, asymmetric square): `top language`  
   - **Bottom-left** (Blue, wide pill): `success rate`
   - **Bottom-right** (Green, rounded rect): `processed count`
   - Each blob: metric number + 2-line label, content at bottom-left of shape
7. **Recent sessions** — last 3, icon + text + meta

### Blob shapes (asymmetric borderRadius)
```
Pink:   { borderRadius: 65 }  ← perfect pill (width 140, height 175)
Yellow: { borderTopLeftRadius: 50, borderTopRightRadius: 14, 
          borderBottomLeftRadius: 14, borderBottomRightRadius: 50 }  ← (width 130, height 125)
Blue:   { borderTopLeftRadius: 55, borderTopRightRadius: 14,
          borderBottomLeftRadius: 55, borderBottomRightRadius: 55 }  ← (width 140, height 110)
Green:  { borderRadius: 22 }  ← (width 130, height 110)
```

### Blob layout (use flexbox rows, NOT absolute positioning)
```
Row 1: [Pink 140w] [14px gap] [Yellow 130w] — heights differ, align start
Row 2: [Blue 140w]  [14px gap] [Green 130w] — 12px gap below row 1
```

---

## Screen 2 — Record

**Reference mapping**: Intelly recording/capture screen  
**Background**: Animates cream → `#FDEAF5` (pale pink) when recording starts

### Layout
1. **Header**: `"your voice"` sub + `"Record"` large title + reset circle top-right
2. **Language chips**: हिंदी / मराठी / English — dark fill = active, outlined = inactive
3. **Mic zone** (240px height, center): 130px pink button (ripple rings when recording)
   - Idle: pink bg, dark mic icon, `"tap to record"` hint below
   - Active: dark bg, white stop icon, timer `MM:SS` with red dot
4. **TRANSCRIPT** label (caps)
5. **Transcript input** — white rounded rect, min 110px height
6. **"Process with AI"** dark pill button — disabled when empty
7. **Error state**: Yellow pill `"Backend offline — tap to retry"`
8. **Result block**: White card, AI entities chips (pink), summary text

---

## Screen 3 — History

**Reference mapping**: Intelly sessions/log list

### Layout
1. **Header**: `"your recordings"` sub + `"History"` large + count badge (dark pill)
2. **Offline pill** (yellow) — only shown when offline
3. **Session cards** (FlatList):
   - Accent colored dot (10px circle, no border-left stripe)
   - Status badge with tinted bg (accent + '33')
   - Transcript text (2 lines)
   - Language chip (accent fill) + AI chip (outline)
   - **Tappable** → navigates to SessionDetail

---

## Screen 4 — Session Detail (NEW)

**Reference mapping**: Intelly individual metric detail screen (heart/sleep full-color)

### Layout
1. **Full tinted background** — accent color at 15% opacity over cream base
2. **Back button** top-left — dark pill `← Back`
3. **Header block**:
   - Status badge
   - Date + language info
4. **Giant transcript block** — large scrollable text area, cream card
5. **AI Analysis section** (if processed):
   - `"AI Insights"` section label
   - Entity chips row (pink bg chips)
   - Summary text
6. **Actions row**: Share + Copy transcript buttons
7. **Bottom**: accent color fill card with session metadata (duration, status, etc.)

---

## Screen 5 — Profile (NEW)

**Reference mapping**: Intelly profile/settings screen

### Layout
1. **Avatar area**: Large circle with initials, name, sub-label
2. **Stats row**: 3 mini-blobs (sessions / processed / streak) in brand colors
3. **Settings list**:
   - Default Language (chips row)
   - Notifications toggle
   - About / Privacy
4. **Sign out** (bottom, subtle)

---

## Navigation Architecture

```
RootStack (Stack.Navigator, no header)
├── MainTabs (Bottom Tab Navigator)
│   ├── Tab: Dashboard
│   ├── Tab: Record (center mic)
│   ├── Tab: History
│   └── Tab: Profile
└── Stack: SessionDetail (pushed from History items)
```

---

## Animation Standards

- **Entrance**: `opacity` 0→1 + `translateY` 32→0, `duration: 480ms`, spring with `tension: 72, friction: 11`
- **Recording bg**: `duration: 400ms` timing
- **Ripples**: 3 rings, delays 0 / 467 / 934ms, scale 1→2.2, opacity 0→0.25→0, `duration: 1400ms`
- **NEVER**: bounce easing, elastic, layout property animation

---

## Anti-patterns (DO NOT)

- ❌ `borderLeftWidth > 1` (side-stripe ban)
- ❌ Gradient text
- ❌ Glassmorphism / blur
- ❌ Generic drop-shadow card grid (all same size, same shadow)
- ❌ Identical blob shapes (each must differ)
- ❌ Overlapping blobs that hide text content
- ❌ `position: absolute` blobs in a container that clips them
