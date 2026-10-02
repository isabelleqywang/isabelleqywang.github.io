---
title: "One error contract for every endpoint"
date: 2026-09-20
summary: "A STAR reflection on my backend internship at GBCS Group: designing a validation and response layer for a Django service, and why I now think consistency is a feature."
tags: [star-reflection, backend, django]
---

I spent the summer of 2026 as a backend intern at GBCS Group, working on a Django service that produces greenhouse gas reports for clients. This is my attempt to write down what I actually did and what I'd want future me to remember.

## Situation

The service had grown endpoint by endpoint. Each one validated input in its own way and returned errors in its own shape, so the frontend had to know which endpoint it was talking to before it could tell a user what went wrong. At the same time, the team was building a new module for tracking emissions data, which needed a schema that would not fall apart the first time requirements changed.

## Task

Two things landed on my desk. First, give the API a single, predictable way to validate requests and report failures. Second, model the data structures for the emissions tracking module and get them into every environment without breaking existing data.

## Action

For the API, I designed an object oriented response and validation framework: seven small utilities, each responsible for one kind of check or one piece of response formatting, composed into a four function pipeline that every request passes through. I then refactored three existing endpoints onto it, which was the real test, because a framework that only works on greenfield code is not a framework.

For the module, I modeled five Django ORM structures and spent more time than I expected on relationships and constraints, since those decisions are the expensive ones to undo. I coordinated the schema migrations across environments so that nothing ran out of order and existing records stayed consistent.

## Result

The refactored endpoints now share one error contract, so client code can handle failures in one place instead of per endpoint. The emissions module shipped with a schema the rest of the team could build on, and the migrations went out cleanly.

## Looking back

What I'm proud of is that I treated consistency as a feature rather than a cleanup task. Nobody files a ticket asking for "the same error shape everywhere", but everyone benefits from it, and I could explain that value to people who were not deep in the code.

What I'd do differently: write the contract down as documentation before writing the utilities. I designed it in code first and documented it after, and the documentation would have caught two naming debates earlier.

Also, carbon accounting is mostly schema design. I did not expect to enjoy that as much as I did.
