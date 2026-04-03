Based on the PRD, here's a comprehensive Figma design prompt for the Content Store MVP:

---

**Content Store MVP — Figma Design Prompt**

**Overall Direction**

Design a desktop-first Content Store for a personal OS platform. The goal is to run through the full install flow, not to achieve final visual polish. Style: clean, neutral, developer-tool aesthetic — light background, dark text, light borders, minimal accent color. No heavy branding, no illustrations, no complex animations. Base artboard: 1440px wide, compatible down to 1280px.

**Design System Foundations**

Color: neutral gray palette as base, one primary accent (blue or teal recommended) for CTAs and active states, semantic colors for status (green=installed/running, yellow=installing, red=failed, gray=not installed). Typography: system font stack or Inter/SF Pro, clear hierarchy with 3-4 font sizes. Spacing: 8px grid, generous whitespace. Border radius: 8px for cards, 12px for modals. Elevation: subtle shadows for modals and popups.

---

**Frame 1 — Store Page (商店首页)**

Layout: Header (64px height) + Left sidebar (220px) + Right content grid.

Header: Left — product logo/name (minimal). Center — two tabs "Store" / "My Content", Store is active with underline indicator. Right — search field with placeholder "Search store content…".

Left sidebar: vertical category list — All (default selected), Apps, Agents, Skills, Models. Selected state uses accent background. Each category shows item count badge (optional).

Right content area: 3-column card grid (card width ~300px) with 16-24px gap. Cards use unified skeleton: top section = 48px icon + name + type tag (pill badge like "App" "Agent" "Model"); middle = 1-2 line description + publisher name in muted text; bottom = status hint tag if applicable ("Installed" / "Favorited"). Entire card is clickable, subtle hover elevation. No install button on card surface — all actions happen in detail modal.

Include one empty state variant: "No content found" with a clear-search link.

**Frame 2 — Content Detail Modal (内容详情浮层)**

Centered overlay, 1000px wide × 720px tall, scrollable interior, semi-transparent backdrop. Close button top-right corner.

Top section: 64px icon + content name (large) + type pill tag + publisher/developer name. Right-aligned CTA group: primary button "Install" (filled accent) + secondary button "Favorite" (outlined, heart icon).

Body sections (scrollable): (1) Description block — multi-paragraph text area. (2) Developer/Publisher info — name, short bio, optional verified badge. (3) Version History — timeline or compact list showing version number, date, changelog summary.

Bottom or inline: status bar showing current state if applicable — "Favorited", "Installing 43%", "Installed v1.2.0", "Running".

Variant: if prerequisites not met, Install button is disabled (grayed out) with tooltip or inline warning banner: "Requires an LLM Provider to be configured" or "Requires local GPU capability".

**Frame 3 — Eligibility Check Interstitial (资格检查中间态)**

Small centered dialog or toast overlay (~400px wide), appears after clicking Install. Content: spinner animation + text "Checking eligibility to purchase / install…". Auto-dismisses after ~2 seconds. No user action needed. Light backdrop dimming.

**Frame 4 — Install Guide Popup Step 1 (安装概览)**

Independent popup window, 760px wide, clean step indicator at top showing 3 steps (Step 1 highlighted). Content: app icon + name + source/publisher + key notices (e.g., "This app requires 512MB storage"). Description summary. Single CTA: "Next" button right-aligned. "Cancel" text link left-aligned.

**Frame 5 — Install Guide Popup Step 2 (配置选项)**

Same popup frame, Step 2 highlighted. Content: form-style configuration list grouped into sections — Required Settings (marked with asterisk), Recommended Settings (marked with "Recommended" tag), Advanced/Optional (collapsed by default). Example fields: directory mount path selector, access permission toggle (Public / Login Required), port configuration. Each recommended field shows the developer's suggested value pre-filled with a "Recommended" badge. Buttons: "Back" (text/outlined) + "Next" (primary).

**Frame 6 — Install Guide Popup Step 3 (确认并开始安装)**

Same popup frame, Step 3 highlighted. Content: summary card reviewing all chosen configurations in a read-only key-value list. Any warnings or notes at bottom. Buttons: "Back" (text/outlined) + "Start Install" (primary, prominent). After clicking, popup closes automatically.

**Frame 7 — My Content Page (我的内容页)**

Same global header, "My Content" tab now active. Search placeholder changes to "Search my content…". Top-right: prominent "+ Add Content" button (large, outlined or filled).

Top section (sticky): Install Queue module — horizontal bar or card strip showing currently installing items. Each queue item: icon + name + progress bar + percentage + stage text ("Downloading…" / "Configuring…"). Supports multiple items side by side.

Below queue: same left sidebar categories + right card grid as Store page, but cards show richer status. Card variants needed: (a) Favorited — heart icon, "Favorited" tag, install button visible; (b) Installing — progress bar replacing bottom area, percentage + stage text; (c) Installed — green "Installed" tag, version number, "Running" indicator dot if active; (d) Failed — red "Failed" tag with retry icon/link.

**Frame 8 — Add Content via URL Dialog (通过 URL 添加内容弹窗)**

Small centered dialog (~480px wide). Title: "Add Content from URL". Single text input field with placeholder "Enter package meta URL…". Helper text below input: "Paste a valid package metadata URL to add content not yet listed in the Store." Buttons: "Cancel" (text) + "Add" (primary). Error state variant: input border turns red, error message "Invalid URL" or "Content already exists in My Content." Success: dialog closes, new card appears in My Content grid with "Not Installed" state.

---

**Component Library to Build**

Create these as reusable Figma components with variants: (1) Content Card — variants for Store/MyContent × status states. (2) Detail Modal — with prerequisite-blocked variant. (3) Status Tags — pill components for each state. (4) Install Popup — 3-step stepper frame. (5) Header — with tab active states. (6) Sidebar Category — with selected/hover/default states. (7) Install Queue Item — with progress variants. (8) Empty States — for no results, empty category.

---

**Interaction Flow (for Figma prototype)**

Store card tap → Detail Modal opens → Install click → Eligibility Check (auto 2s) → Install Popup Step 1 → Step 2 → Step 3 → Popup closes → Auto-navigate to My Content tab → Queue shows progress → Card updates to Installed.

Alternate: Detail Modal → Favorite click → Modal updates state → My Content shows favorited card.