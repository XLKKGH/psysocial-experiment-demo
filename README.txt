AI CHAT STUDY — revised version (hannah-v3), for TA review

What changed from the first demo
1. One statement per AI conversation (TA feedback #1). Exposure = 12 conversations
   (6 true, 6 false); assessment = all 24 statements. Statements are split into two
   counterbalanced sets (Version A / B); statements on the same subject stay in the same set.
2. Distractor task = short demographic questions (age, gender, education, English),
   as in Pennycook et al. (2018), Study 2, replacing the arithmetic questions.
3. Accuracy question and scale labels follow the original paper
   (1 Not at all / 2 Not very / 3 Somewhat / 4 Very accurate).
4. Back button inside the rating stage (answers are pre-filled; edits are flagged as "revised").
   No Back button in the exposure stage, so each statement is seen exactly once.
5. After the ratings: AI-use and AI-trust questions, plus the original study's exclusion
   checks (random responding, searching/asking AI, skipping conversations).
6. Debrief no longer says data is not sent anywhere (responses ARE saved to Supabase).

Testing
- Add ?test=1 to the URL to mark a run as a test (filter test=true out before analysis).
- Add ?v=A or ?v=B to force a version; add ?reset=1 to start over in the same browser.
  e.g. .../index.html?test=1&v=A&reset=1

Run locally
  python3 -m http.server 8000   then open http://localhost:8000

Data
Each participant is one row in the Supabase `participants` table; `responses` holds the full
JSON (version, sharing, demographics, ratings[24], ai_attitudes, checks, build, test).
Before recruiting, confirm Row Level Security is on for `participants`.
