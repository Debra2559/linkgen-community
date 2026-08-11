# Community Collaboration Prototype Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Extend the existing LinkGen discovery feed with a reviewable, locally runnable structured-task workflow while documenting the proposed CloudBase production architecture and every divergence from upstream.

**Architecture:** Keep the native WeChat mini-program and its current visual language. Pages call a small community data service; the service currently delegates to local Storage and normalizes legacy posts, so a future CloudBase adapter can replace persistence without rewriting the pages. Discussion posts remain compatible while task posts add explicit type, event, capacity, deadline, participation, and lifecycle fields.

**Tech Stack:** WeChat Mini Program (WXML/WXSS/CommonJS JavaScript), local `wx` Storage, Node.js smoke tests, Markdown.

---

### Task 1: Data contract and compatibility adapter

**Files:**
- Create: `utils/community-data.js`
- Modify: `utils/linkgen-data.js`
- Create: `tests/community-data.test.js`

- [ ] Add failing tests for legacy-discussion normalization, task creation, interest/join participation, and valid status transitions.
- [ ] Run `node tests/community-data.test.js` and verify the new API is initially missing.
- [ ] Add task samples and a storage-backed service API with immutable update helpers.
- [ ] Run the test and verify all cases pass.

### Task 2: Discovery feed task presentation

**Files:**
- Modify: `pages/feed/feed.js`
- Modify: `pages/feed/feed.wxml`
- Modify: `pages/feed/feed.wxss`

- [ ] Add discussion/task filters without removing topic search.
- [ ] Render task kind, status, event link, capacity, deadline, and participant progress on task cards.
- [ ] Preserve discussion card behavior and current color/spacing system.
- [ ] Compile in WeChat DevTools and inspect empty, discussion, and task states.

### Task 3: Structured task creation

**Files:**
- Modify: `pages/create-post/create-post.js`
- Modify: `pages/create-post/create-post.wxml`
- Modify: `pages/create-post/create-post.wxss`

- [ ] Add a discussion/task mode selector.
- [ ] For tasks, collect kind, optional/required event association, needed people, and deadline.
- [ ] Enforce event association for preparation and co-creation tasks.
- [ ] Save through the community service and return to the feed.

### Task 4: Task participation and lifecycle

**Files:**
- Modify: `pages/post-detail/post-detail.js`
- Modify: `pages/post-detail/post-detail.wxml`
- Modify: `pages/post-detail/post-detail.wxss`

- [ ] Show structured task facts above the conversation.
- [ ] Add independent “interested” and “join” actions.
- [ ] Allow the sample creator to advance, complete, or cancel a task using valid transitions.
- [ ] Keep likes and comments working for both content types.

### Task 5: Owner-readable proposal package

**Files:**
- Create: `docs/linkgen-product-proposal.md`
- Create: `docs/linkgen-technical-design.md`
- Create: `docs/linkgen-change-notes.md`
- Create: `docs/linkgen-review-guide.md`

- [ ] Separate observed facts, confirmed prototype decisions, recommendations, and owner decisions.
- [ ] Document CloudBase-first architecture, collections, functions, permissions, privacy, environments, backup, cost risks, and migration.
- [ ] Record every upstream/proposal difference with files, data impact, risk, and rollback.
- [ ] Add a 15-minute review route, test commands, screenshot checklist, and explicit “DO NOT MERGE — DISCUSSION ONLY” notice.

### Task 6: Verification and local commits

**Files:**
- Test: `tests/community-data.test.js`
- Verify: all changed WXML/WXSS/JS/Markdown files

- [ ] Run `node tests/community-data.test.js`.
- [ ] Parse every changed JSON file and run JavaScript syntax checks.
- [ ] Compile the project in WeChat DevTools and capture before/after screenshots when accessible.
- [ ] Review `git diff --check`, `git diff`, and `git status` for scope and secrets.
- [ ] Create focused local commits only; do not push until the user approves the final diff summary.
