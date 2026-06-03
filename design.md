# Dr Crops — Design System

Dark-mode, AI-Studio-inspired interface for Pakistani agriculture yield estimation.

## Colors
- `--bg-base` `#000000` page background
- `--bg-surface` `#0A0A0F` cards
- `--bg-elevated` `#13131A` elevated surfaces
- `--accent-primary` `#4D9BFF` CTAs, links
- `--accent-glow` `#00D4FF` highlights
- `--field-border` `#FFD600` field outline (yellow, brand-defining)
- `--text-primary` `#FFFFFF`
- `--text-secondary` `#B4B4BE`
- `--text-tertiary` `#6B6B7A`
- `--border-subtle` `rgba(255,255,255,0.08)`

## Typography
- Family: Inter, system-ui
- Hero: 64px / 700
- H1: 48px / 700
- H2: 32px / 600
- Body: 16px / 400
- Mono: JetBrains Mono (yield numbers)

## Spacing (8px base)
4, 8, 12, 16, 24, 32, 48, 64, 96, 128

## Radii
sm 8, md 12, lg 20, pill 999

## Shadows
- card: 0 8px 32px rgba(0,0,0,0.4)
- glow: 0 40px 80px -20px rgba(77,155,255,0.4)

## Components
- Pill buttons (primary blue, secondary outline)
- Cards with subtle border + dark elevated bg
- Glassmorphism navbar (backdrop-blur)
- Tilted hero showcase cards
- Yellow-outlined field polygons on map

## Motion
- Default ease: cubic-bezier(0.4, 0, 0.2, 1)
- Hero entrance: stagger 100ms
- Section reveal: fade-up on scroll
- Respect prefers-reduced-motion

## Page Structure
1. Navbar (logo, Upload, Live Map, Pricing, Docs)
2. Hero (title + subtitle + CTA + tilted preview cards)
3. How it works (3-step strip)
4. Crops supported grid (wheat, cotton, sugarcane, rice, maize, etc.)
5. Pakistan map preview
6. Footer
