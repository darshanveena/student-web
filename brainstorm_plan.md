# Image not added - brainstorm plan

## Information gathered
- `index.html` already has a `<div class="bg" aria-hidden="true"></div>` used for the background image.
- `style.css` sets a background image for the auth view using:
  `url("https://koala.sh/api/image/v2-fmgei-46ihp.jpg?width=1344&height=768&dream")`.
- No other image references are present.

## Plan
1. Verify why the image might not appear:
   - Check whether the selector `#authView ~ .bg, #authView .bg` matches the DOM.
   - In the DOM, `.bg` is placed **before** `<main class="app">` and **not** inside `#authView`.
   - Therefore, `#authView ~ .bg` likely fails because `~` only selects following siblings, and `.bg` precedes `#authView`.
2. Fix CSS selector so the background image applies to `.bg` when the auth view is active.
   - Change to target `.bg` when `#authView` is the active view, e.g.:
     `#authView.hidden { ... }` is not ideal.
   - Simpler: apply background image unconditionally to `.bg`, or use a correct sibling/ancestor selector.
3. Implement the fix:
   - Update `style.css` to set the image on `.bg` (unconditionally) OR correct selector to match element ordering.
   - If we want it auth-only, set `.bg` base image to the login image and add an override for dashboard if needed (currently dashboard has none).
4. Add quick fallback:
   - Ensure the image URL is valid and provide graceful display (background gradients still work).

## Dependent files
- `style.css` (only)

## Follow-up steps
- Run the app locally and verify the background shows on the login page.
- Register/login/logout to ensure background remains visible across auth/dashboard.

