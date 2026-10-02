---
title: "PyAtlas, so far: drawing a map of a Python codebase"
date: 2026-09-30
summary: "A retrospective on the first five days of PyAtlas: why the collapse logic lives in pure functions, how one idea (the representative) handles both nodes and edges, and what I'd do differently."
tags: [project-retrospective, react, graphs]
---

Opening an unfamiliar Python repository usually means a few minutes of clicking through folders, trying to build a mental map of what imports what. [PyAtlas](https://github.com/isabelleqywang/PyAtlas) is an attempt to draw that map for you: point it at a repository and get a graph of its modules that you can open and close folder by folder.

## The shape of the problem

A repository is a tree (folders contain files) with a graph laid over it (files import files). Showing all of it at once is useless for anything bigger than a toy, so the view has to start collapsed and let you expand where you are curious. The interesting question is what the import edges should do when their endpoints are hidden inside a closed folder.

## One idea: the representative

Every node on screen stands in for some set of nodes underneath it. I gave that a name, the **representative**, and defined it as the first collapsed folder you meet walking down from the top of a node's ancestor chain:

```js
export function representative(id, parentOf, expanded) {
  for (const a of ancestorsOf(id, parentOf)) {
    if (!expanded.has(a)) return a
  }
  return id
}
```

Once that exists, two features fall out almost for free:

- **Visible nodes** are the ones that represent themselves.
- **Aggregated edges** come from replacing both ends of every import with its representative, dropping edges that now point from a folder to itself, and merging parallel edges while counting them. The count becomes the edge's stroke width, so a thick line means "these two areas are tightly coupled".

## Keeping the logic boring

All of the collapse logic lives in `graphLogic.js` as pure functions, with no React and no Cytoscape. That made it trivial to unit-test and, just as importantly, easy to explain. The React component only diffs what *should* be on screen against what *is*, adds and removes elements, and asks the layout to animate.

## The part that took longest

Animation. When a folder opens, its children should appear to grow out of the folder rather than pop in at the origin. The fix was small once I saw it: a newly visible node starts at the last known position of its nearest ancestor that was already on screen, then animates to wherever the [dagre](https://github.com/dagrejs/dagre) layout puts it.

## What I'd do differently

- Decide the data format first. I started from a hand-written `mock.json`, which was right for speed, but I changed its shape twice.
- Set zoom limits on day one. An unbounded zoom made the graph feel broken long before it was.

## Next

The backend: walking a real repository with Python's `ast` module to produce the same JSON the frontend already understands.
