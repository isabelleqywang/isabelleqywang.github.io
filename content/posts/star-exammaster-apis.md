---
title: "APIs for an exam that cannot go down"
date: 2025-08-25
summary: "A STAR reflection on my backend internship at ExamMaster: designing REST APIs with authentication for exam delivery and result storage, and keeping the site responsive during live sessions."
tags: [star-reflection, backend, api-design]
---

My first backend internship was at ExamMaster in summer 2025. Exam software has an unusual property: the moment it matters most is the moment everyone uses it at once.

## Situation

ExamMaster runs timed online exams. During live sessions, the site had to deliver exam content, authenticate users and store their results reliably, and before my work it struggled to stay responsive when sessions were running.

## Task

Design and deploy the API endpoints behind exam delivery and result storage, with proper authentication between client and server, and make the site dependable during live exams.

## Action

I designed RESTful endpoints in Flask and Node.js, backed by MySQL and MongoDB, and implemented the client and server authentication logic so that only the right user could start an exam or submit answers. I then refactored core site logic and the way API responses were handled, focusing on the request path that every student hits during a session.

## Result

The platform supported exam delivery and result storage for more than 50 users, and load times went from unusable to reliable during live exam sessions.

## Looking back

This was where I learned that performance is a correctness issue when your users are on a timer. A slow response during an exam is not an inconvenience; it changes someone's outcome.

I'm proud that I owned the API end to end, from schema to authentication to deployment, at the start of my career. What I'd do now is add load testing before the first live session instead of learning from the first live session. Younger me was brave. Current me prefers to be brave with data.
