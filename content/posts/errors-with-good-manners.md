---
title: "Errors with good manners"
date: 2026-09-12
summary: "Notes on designing API error responses that clients can rely on: one envelope, stable codes, field level detail, and nothing that leaks your internals."
tags: [technical-notes, backend, api-design]
---

Most of an API's personality shows up when something goes wrong. A good error response tells a client *what* failed, *where*, and *whether trying again could help*. And it does so the same way every time.

## One envelope, everywhere

If some endpoints return `{"error": "..."}`, others return `{"detail": "..."}`, and a few return HTML from an unhandled exception, every client grows a pile of special cases. Pick one shape and route every failure through it:

```json
{
  "error": {
    "code": "validation_failed",
    "message": "Some fields need attention.",
    "fields": {
      "reporting_year": ["Must be between 2000 and 2100."]
    }
  }
}
```

## Codes are for machines, messages are for people

`message` can be reworded, translated or improved at any time. `code` cannot: clients branch on it. Treat the list of codes like part of the public API: documented, versioned and rarely changed.

## Validate in one place

In Django, the temptation is to validate a little in the view, a little in the serializer and a little in the model. Collecting checks into a small set of validators, each returning errors rather than raising halfway through, means a client gets *all* the problems with a request at once instead of fixing them one round-trip at a time.

```python
def validate(payload, rules):
    errors = {}
    for field, checks in rules.items():
        for check in checks:
            problem = check(payload.get(field))
            if problem:
                errors.setdefault(field, []).append(problem)
    return errors
```

## Status codes still matter

The envelope does not replace HTTP semantics: `400` for a malformed request, `404` when the thing does not exist, `409` for a conflict, `422` when the request is well-formed but invalid. Clients and proxies rely on them before they ever read the body.

## Never leak the inside

Stack traces, SQL fragments and file paths belong in logs, not responses. Return a generic `internal_error` with a request id, and put the id in the log line too. That one string is how a confused user's bug report finds its way to the right trace.
