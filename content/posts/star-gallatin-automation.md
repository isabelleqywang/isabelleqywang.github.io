---
title: "Twelve hours a week, given back"
date: 2026-01-25
summary: "A STAR reflection on building a Python pipeline at NYU Gallatin IT that turned daily form submissions into structured reports and removed 12 hours a week of manual work."
tags: [star-reflection, python, automation]
---

From fall 2025 into early 2026 I worked as a student technician at NYU Gallatin IT. The most satisfying thing I built there was not glamorous at all, which is probably why it was so satisfying.

## Situation

Every day, form submissions arrived through a web service, and every day someone copied them by hand into spreadsheets that the office used for reporting. It worked, in the sense that the data eventually got there. It also took about 12 hours a week.

## Task

Automate the whole path from submission to report without changing how the people who read the reports did their jobs.

## Action

I wrote a Python pipeline that queries the service's REST API for each day's submissions, normalizes the fields, and writes them into structured Google Sheets reports in the format the team already used. I kept the output identical to what people were used to, because the fastest way to kill an automation project is to make everyone relearn their spreadsheet.

I also made the job safe to rerun, so a failed run could simply be run again without creating duplicate rows. That one decision probably saved more stress than any other line of code.

## Result

The pipeline took over the daily data entry and eliminated roughly 12 hours a week of manual processing. Reports showed up on time without anyone touching them.

## Looking back

This project taught me to measure success by what disappears. Nobody needed a new dashboard; they needed a chore to stop existing. I'm proud that I listened for that instead of building something more impressive and less useful.

Next time, I would add basic monitoring from day one, so the team gets a message when a run fails rather than noticing a missing row.
