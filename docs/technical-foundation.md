# Stride — UX v1

## Core UX Principle

Stride should always feel like it is helping the user move forward, while keeping the past organized and available when needed.

> **Users provide the raw experience; Stride maintains the structure.**

## Home

The home screen should primarily show the user's activities and make it easy to enter or record progress.

It should not create pressure by highlighting neglected activities, missed days, or things the user "should" be doing.

Recent or active context can be shown lightly when useful.

## Activities

Each activity should prioritize what the user is currently focused on.

Older or lower-priority items should remain accessible without competing for attention.

Users should be able to:

* Reorder items
* Prioritize current items
* Add new items
* Move items out of focus without deleting them
* Access older items when needed

## Activity-Specific Language

Actions should use language that feels natural for the activity rather than forcing one generic term everywhere.

Examples:

* Guitar → **Log practice**
* Running → **Log run**
* Wellbeing → **Check in** or **Write entry**
* Generic activity → **Add progress**

## Recording Progress

Recording should be fast and require as little organization from the user as possible.

Natural-language input should be the primary method.

Structured fields can be available when useful, but should rarely be required.

> **Structure should be available, not required.**

## Current State

Stride should use AI to maintain useful current-state information based on what the user records.

For example:

* Current focus
* What is going well
* What still needs work
* Confidence or satisfaction
* Relevant next goals

Users should be able to manually edit or correct this information.

Important changes that require judgment, such as marking something as mastered or complete, should require user confirmation rather than happening silently.

## History

History should be easy to access but should not dominate the main experience.

The default experience should focus on what the user is doing now.

Older entries can be organized chronologically and summarized when useful.

## AI Behaviour

AI should work mainly in the background.

It should help:

* Organize natural-language entries
* Maintain current state
* Summarize previous progress
* Surface useful context when requested
* Reduce manual organization

It should not constantly suggest what the user should do or turn Stride into an AI chatbot.

## Core Flow

**Home → Activity → Item → Log progress → Updated state**

Example:

**Activities → Guitar → Blackbird → Log practice → Blackbird state updates**

## Reference

See `docs/wireframes/core-flow-v1.png` for the initial low-fidelity UX direction.

The wireframe is a starting point, not a final visual design.
