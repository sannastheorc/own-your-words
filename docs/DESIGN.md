# Own Your Words: design

SEEDSED. One owner per decision; `app.js` only wires them.

| Module | Decides | Must not |
|---|---|---|
| `words.js` | Starter words: meaning, gap sentence, sound-alike spellings, level | judge or store |
| `spelling.js` | Word routine, comparing, sound-alikes for added words, game checks | store, draw |
| `goals.js` | How the three monthly goals are measured, week by week | stamp dates |
| `store.js` | Word state, review schedule, daily log, goals, certificates, plays, active time | draw |
| `content.js` | Text Thread and Your Call content | hold rules |
| `blocks.js` | Block Drop rules and unlock thresholds | count as practice |
| `certificate.js` | Draws and shares a dated certificate | decide who earned one |

## Rules agreed with the owner

- **Word routine:** learn the meaning → copy twice → from memory twice → hear it and pick the right spelling from options
  that all sound right when sounded out → type it from memory. Passing that the same day makes it a Word I Own. A miss goes back one step.
- **Later checks:** owned words return after 1, 3, 7, 14, 30 and 60 days. A miss brings one back sooner and never takes it away.
- **Own keyboard:** spelling and sentences use the app's keyboard, so phone suggestions can't appear.
- **Fill the Gap:** wrong choices come from a clearly different group of words, so only one fits.
- **Use It:** the app checks only that the word is present, spelled right, in at least 3 words. Saying it was used well is the helper's call.
- **Time:** active time only; gaps over 45 seconds count as 45 at most, and Block Drop never counts.
- **Goals:** three a month. Weekly goals are reached after 3 weeks are met, and each week's effort still shows. "Something else" goals are checked off by the helper.
- **Block Drop:** each finished lesson earns 1 play; each 3 owned words unlocks a faster level. Its own name and look, not affiliated with any brand.

## Known limits

- Fill the Gap uses word groups, so an odd choice could occasionally still fit.
- Sound-alikes for helper-added words come from spelling rules and may not always sound exact; the helper can see them on the list.
- Settings and goals aren't locked, so numbers rely on trust. It's not an official record.
- Interest content covers camping and RVs, fixing things up, and cooking and baking, and is worded generally because the code is public. Level starts at "Everyday" unless the helper changes it.
- Word order: his own words, then one interest word and one everyday word, alternating.

## Planned

Kids Academy (a repurposed, retitled Speak Again where the app voice says the word instead of showing it), Real-Life Missions, more stories on his interests, more adult games, and a game-like level finder.
