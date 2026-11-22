# Presenting at the venue: backup plan

The dashboard has three ways to run, from best to last resort. Check all three the day before.

## 1. The website (normal)

Open the Vercel link in Chrome or Edge. Open each screen once before the talk
(Title screen, Overview, Map, ANC ladder, Cohorts, Model analysis, Predict, How it
was built). The browser then keeps a copy.

## 2. The same website with no internet (automatic)

After step 1, the dashboard keeps working in that browser when the internet drops:
every screen and every number loads from the saved copy (tested: all screens render
offline). The bottom bar shows "available offline" once the copy is complete.
Only the street map behind the regions needs internet; switch it off with
**Background map** on the Map screen. The regions, colours and values stay.

## 3. A copy running on your own laptop (if the venue computer is not yours)

Needs Node.js 20 or later (https://nodejs.org, the LTS installer), once, with internet:

```powershell
cd "D:\MOH\2026\Data science\Capstone\ANC8_explanability\app"
npm ci
npm run build
```

Then, at the venue, with or without internet:

```powershell
cd "D:\MOH\2026\Data science\Capstone\ANC8_explanability\app"
npm start
```

and open http://localhost:3000 . Stop it with Ctrl+C.
(In this local copy the Predict screen scores logistic regression and the tree
models in the browser, as on the website.)

## During the talk

* Start from the **Title screen** and press **Start the presentation**.
* Right arrow: next step. Left arrow: back. Esc: leave the presentation.
* Each step opens its screen and outlines the panel it is about.
* If the projector is small, use the text-size setting (Help › Using the studio).

## Last resort

The screenshots in the project folder `dashboard-update/` show every screen.
