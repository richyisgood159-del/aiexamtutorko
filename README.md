# AI Exam Tutor — Clean Build v4

Fixes in this build:
- Starts with a fresh v4 local-storage namespace, so old answers/marks/drawings do not appear.
- Question and mark-scheme crops are embedded in `image-data.js`, so they still display even if GitHub folder uploads are missed.
- Original crop folders are also included as a fallback.
- MCQs mark instantly without an AI call.
- Drawing marking sends the student drawing + exact original question crop + exact official mark-scheme crop in the same multimodal request.
- Full question paper and mark scheme remain available as fallbacks.

Upload ALL root files to GitHub. The most important files are `index.html`, `app.js`, `styles.css`, `api-config.js`, and `image-data.js`. Never put your OpenRouter key in GitHub.
