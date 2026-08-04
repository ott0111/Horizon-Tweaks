# Horizon Tweaks — Modular Architecture Guide

> **Build, extract, and remix features like LEGO bricks.**
> Every feature is a self-contained module that can be enabled, disabled, or extracted into its own standalone app with zero friction.

---

## 1. The Big Picture

```
┌─────────────────────────────────────────────────────┐
│                    Impulse Core                          │
│  (Auth, Theme, ErrorBoundary, Sidebar, Registry)    │
├──────────┬──────────┬──────────┬──────────┬─────────┤
│ Feature  │ Feature  │ Feature  │ Feature  │ Feature │
│    A     │    B     │    C     │    D     │    E    │
├──────────┴──────────┴──────────┴──────────┴─────────┤
│              Tauri Rust Backend (APIs)                │
│   Each API command is prefixed by feature namespace   │
├──────────────────────────────────────────────────────┤
│              Firebase / PayPal / Stripe                │
│              Website (marketing / pricing)             │
└──────────────────────────────────────────────────────┘
```

### Key Principle
**Each feature is a black box.** It has:
- A single entry point (its React component)
- A list of Tauri API commands it needs
- A tier requirement
- Zero hardcoded dependencies on other features

---

## 2. Feature Registry — The Heart of Modularity

**File:** `src-ui/src/features/FeatureRegistry.ts`

This is a single array that defines every feature in the app:

```typescript
export const FEATURE_REGISTRY: FeatureDefinition[] = [
  {
    id: 'general-tweaks',
    label: 'General Tweaks',
    icon: Sliders,
    minTier: 'standard',
    description: 'Essential Windows performance tweaks',
    component: lazy(() => import('../components/TweakCatalog')),
    category: 'optimization',
    enabled: true,        // ← Set to false to completely remove from app
    standalone: true,      // ← Can be extracted into its own app
    version: '1.0.0',
    dependencies: [],      // ← Other features this depends on
    apiEndpoints: ['get_tweaks', 'apply_tweak', 'revert_tweak'],
  },
  // ... more features
];
```

### To REMOVE a feature from the app:
```typescript
{ enabled: false }
```
That's it. The sidebar and router skip it automatically.

### To ADD a new feature:
1. Create your component in `src-ui/src/components/`
2. Add one entry to the registry array
3. Add the API commands in Rust (`src-tauri/src/commands/`)
4. Register the Rust commands in `src-tauri/src/lib.rs`

No wiring needed. The app reads the registry dynamically.

---

## 3. Extracting a Feature Into Its Own App

Every feature with `standalone: true` can be extracted into a separate Tauri app in minutes.

### Step-by-step extraction:

**Step 1: Copy the component file**
```
cp src-ui/src/components/FPSBooster.tsx my-new-app/src/App.tsx
```

**Step 2: Copy the API commands**
The feature's `apiEndpoints` tell you exactly what Rust commands it needs:
```typescript
apiEndpoints: ['boost_fps', 'revert_fps_boost']
```
Copy those from `src-tauri/src/commands/` to your new app.

**Step 3: Register in new app's `lib.rs`**
```rust
#[tauri::command]
fn boost_fps() -> Result<String, String> { ... }

pub fn run() {
    tauri::Builder::default()
        .invoke_handler(tauri::generate_handler![boost_fps])
        .run(tauri::generate_context!())
}
```

**Step 4: Copy the feature's `useTier` logic**
The feature checks tiers via `useTier()` hook. In the standalone app, mock it or use the same AuthContext.

**Step 5: Ship it**
Your new app is independent. It has its own `tauri.conf.json`, its own `.exe`, its own identity.

---

## 4. Backend API Modularity (Rust)

Each API command in `src-tauri/src/commands/` is a **self-contained module**.

```
src-tauri/src/commands/
├── mod.rs           ← Re-exports all feature modules
├── auth.rs          ← Login, register, logout, session
├── admin.rs         ← User management, tier changes
├── fps_booster.rs   ← FPS boost commands
├── benchmark.rs     ← Benchmark suite
├── bios.rs          ← BIOS read/write/snapshot
├── tweaks.rs        ← General/advanced tweaks
├── debloating.rs
├── networking.rs
├── ...              ← One file per feature
├── summit_ai.rs     ← Archived (hidden from app, kept for reference)
```

### To upgrade/swap a backend API:
1. Each feature command is self-contained — no shared mutable state
2. Replace the implementation inside a command without changing its interface
3. The frontend never knows the difference
4. For example, swap `firebase_client.rs` with a different auth provider by keeping the same function signatures

### Adding a new Rust command:
```rust
// 1. Create src-tauri/src/commands/my_feature.rs
#[tauri::command]
pub fn my_feature_do_thing(input: String) -> Result<String, String> {
    // implementation
}

// 2. Register in src-tauri/src/commands/mod.rs
pub mod my_feature;

// 3. Register in src-tauri/src/lib.rs
#[tauri::command]
fn my_feature_do_thing(input: String) -> Result<String, String> { ... }
```

---

## 5. Frontend Module Structure

```
src-ui/src/
├── features/
│   ├── FeatureRegistry.ts    ← Single source of truth for all features
│   └── README.md             ← This guide (see below)
├── components/
│   ├── Dashboard.tsx         ← Special component (hardcoded view)
│   ├── Sidebar.tsx           ← Dynamically reads from registry
│   ├── AdminPanel.tsx        ← Special component
│   ├── SettingsPage.tsx      ← Special component
│   ├── _archived/            ← Hidden features (SummitAI lives here)
│   ├── TweakCatalog.tsx      ← Feature component
│   ├── FPSBooster.tsx        ← Feature component
│   ├── ...
├── App.tsx                   ← Dynamically renders registry features
├── contexts/
│   ├── AuthContext.tsx        ← Tier/auth logic
│   └── ThemeContext.tsx       ← Theming
```

### How the dynamic routing works:

**App.tsx** iterates over `FEATURE_REGISTRY`:
```tsx
{FEATURE_REGISTRY.filter(f => f.enabled).map(f => (
  view === f.id ? <f.component key={f.id} /> : null
))}
```

**Sidebar.tsx** iterates over `getFeaturesByTier(userTier)`:
```tsx
{getFeaturesByTier(tier).map(item => {
  const Icon = item.icon;
  return <button onClick={() => onChange(item.id)}>
    <Icon /> {item.label}
  </button>;
})}
```

**No hardcoded navigation.** Add → appears. Remove → disappears.

---

## 6. Pricing Tier System

The new pricing structure is:

| Tier     | Price    | Who Gets It                  |
|----------|----------|------------------------------|
| Free     | $0       | Everyone                     |
| Standard | $9.99/mo | Most users                   |
| Pro      | $14.99/mo| Enthusiasts                  |
| Ultimate | $24.99/mo| Power users                  |
| Admin    | N/A      | Internal only                |

Tier hierarchy: `free < standard < pro < ultimate < admin`

Every feature in the registry has a `minTier` field. The `checkTier()` function in AuthContext automatically filters features based on the user's tier.

### To change pricing:
1. Update `src-ui/src/contexts/AuthContext.tsx` (the `tiers` array)
2. Update `website/components/Pricing.tsx` (the UI cards)
3. Update `website/components/CartModal.tsx` (prices and plan IDs)
4. Update env vars for PayPal/Stripe plan IDs

---

## 7. Website (Marketing + Admin)

The website at `website/` is built with Next.js and is **completely independent** from the desktop app.

```
website/
├── components/
│   ├── Pricing.tsx         ← Tier cards (Free/Standard/Pro/Ultimate)
│   ├── CartModal.tsx       ← PayPal subscription checkout
│   ├── Features.tsx        ← Feature grid with tier badges
│   ├── ...
├── app/api/
│   ├── paypal/             ← PayPal subscription management
│   ├── stripe/             ← Stripe checkout + webhooks
│   ├── subscription/       ← Cancel/change plan
│   └── user/               ← Tier lookup
├── contexts/
│   └── AuthContext.tsx      ← Firebase auth + tier state
├── lib/
│   ├── firebase-admin.ts   ← Server-side Firebase operations
│   └── email.ts            ← License key email via Resend
```

The website shares **no code** with the desktop app. They communicate through:
1. **Firebase** (auth state + custom claims for tier)
2. **REST APIs** (user/tier, subscription management)
3. **Local HTTP server** (admin claim flow on port 28473)

---

## 8. How to Spin Off a Feature as a Separate Product

This is the ultimate modularity test. Here's how:

### Example: FPS Booster as a standalone app

**Files to copy:**
```
From main app:                           To new app:
src-ui/src/components/FPSBooster.tsx  →  src/App.tsx
src-tauri/src/commands/fps_booster.rs →  src-tauri/src/commands/fps_booster.rs
```

**What to strip:**
- Auth/tier checks (make it free or use a simple license key check)
- Sidebar (not needed for single-feature app)
- Dashboard (not needed)
- Other feature files (not needed)

**What to keep:**
- The component itself
- Its Tauri API commands
- ThemeContext for styling
- ErrorBoundary for crash safety

**Packaging:**
```
cargo tauri build          → standalone .exe/.msi
npm run build              → standalone web version (if applicable)
```

---

## 9. FAQ

### Q: Can I remove a feature without breaking anything?
**Yes.** Set `enabled: false` in the registry. The sidebar and router skip it. No imports break because features are lazy-loaded.

### Q: Can two features share code?
**Yes.** Put shared code in `src-ui/src/lib/` or `src-tauri/src/services/`. Both features import from the same shared module.

### Q: How do I add a new API endpoint for a feature?
1. Add the Rust command function
2. Register it in `lib.rs`
3. Add the command name to the feature's `apiEndpoints` in the registry

### Q: How do I change the pricing mid-stream?
1. Update the `tiers` array in the website's AuthContext
2. Update the Pricing.tsx UI cards
3. Update PayPal plan IDs and Stripe price IDs in `.env`
4. Done — the desktop app reads tier from Firebase, which gets updated via webhook

---

## 10. File Tree Reference

```
D:\Impulse-Tweaks\                              ← Root directory
├── src-ui/                                  ← Desktop app frontend
│   └── src/
│       ├── features/                        ★ MODULARITY CORE
│       │   ├── FeatureRegistry.ts           ← All features defined here
│       ├── components/
│       │   ├── _archived/                   ← Hidden/removed features
│       │   │   └── SummitAI.tsx
│       │   ├── *.tsx                        ← Feature components
│       ├── contexts/                        ← Shared state
│       ├── hooks/                           ← Shared hooks
│       └── App.tsx                          ← Dynamic router
├── src-tauri/                               ← Desktop app backend
│   └── src/
│       ├── commands/                        ← One file per feature
│       │   ├── fps_booster.rs
│       │   ├── tweaks.rs
│       │   └── ...
│       ├── services/                        ← Shared services
│       │   ├── firebase_client.rs
│       │   └── ...
│       └── lib.rs                           ← Command registration
├── website/                                 ← Marketing + pricing site
│   ├── components/
│   │   ├── Pricing.tsx
│   │   ├── CartModal.tsx
│   │   └── ...
│   └── app/api/                             ← Backend APIs
│       ├── paypal/
│       ├── stripe/
│       └── subscription/
```

---

## Quick Reference

| Action | What to Edit |
|--------|-------------|
| Remove a feature | `FeatureRegistry.ts` → `enabled: false` |
| Add a feature | `FeatureRegistry.ts` + new component + new Rust commands |
| Change pricing | `Pricing.tsx` + `CartModal.tsx` + `.env` (plan IDs) |
| Extract to standalone | Copy component + its API commands, strip the rest |
| Rebrand | Search for old brand name, replace everywhere |
| Change tier requirements | Update `minTier` in `FeatureRegistry.ts` |
| Add Rust API | New file in `commands/`, register in `lib.rs` |
