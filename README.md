# AI Exam Tutor - Psychology rebuild

This is a clean rebuild of the Psychology Unit 1 tutor.

## Included
- 11 WPS01/01 papers, ordered by year from 2020 to 2026.
- 199 question parts; each paper totals 64 marks.
- One exact Pearson question crop mapped to one exact Pearson mark-scheme entry.
- Shared scenario/context crops where a sub-question depends on a stem.
- AI marking for every Psychology question, including 1/2/3/4/8/12-mark items.
- Extended-response marking uses the exact AO allocation and level descriptors from that question's scheme.
- Optional Apple Pencil / drawing canvas; drawings can be sent with the written answer to the AI examiner.
- Local progress, attempts, stars, filters, random practice, focus mode, and progress export.
- OpenRouter API key is kept in `sessionStorage` only.

## Speed design
The app uses OpenRouter's free-model router and races a second free examiner only when the first is slow.
- Short questions (1-4 marks): hard client wait limit 28 seconds.
- Extended questions (8/12 marks): hard client wait limit 58 seconds.

The hard limit prevents the site from hanging for minutes. If no free provider returns a valid mark before the deadline, the attempt stops, saves the student's answer, shows the exact Pearson scheme, and records no fake mark.

## Upload to GitHub Pages
1. Extract the ZIP.
2. Upload the **contents** of this folder to the root of the GitHub Pages repository (not the ZIP itself).
3. Replace existing files when GitHub asks.
4. Commit the upload.
5. Wait for GitHub Pages to deploy, then close and reopen the old browser tab.

All files are top-level and every individual file is well below GitHub's browser upload size limit. There are fewer than 100 files.

## First use
Open Psychology -> Settings -> paste the OpenRouter API key -> Save. The key is not written into the repository.
