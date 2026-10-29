#!/usr/bin/env python3
"""Deterministic checks for a complex project's durable current-state handoff.

Usage: python check_state_consistency.py /path/to/project
The semantic dependency/decision review remains a separate human/agent gate.
"""

from __future__ import annotations

import argparse
import re
from pathlib import Path


def _field(text: str, key: str) -> str | None:
    pat = rf"^\*\*{re.escape(key)}:\*\*\s*(.*?)\s*$"
    m = re.search(pat, text, flags=re.MULTILINE)
    return m.group(1).strip().strip('`') if m else None


def _section(text: str, heading: str) -> str | None:
    m = re.search(rf"^## {re.escape(heading)}\s*$", text, flags=re.MULTILINE)
    if not m:
        return None
    end = re.search(r"^## ", text[m.end():], flags=re.MULTILINE)
    return text[m.end():m.end() + end.start()] if end else text[m.end():]


def check(root: Path) -> list[str]:
    root = root.resolve()
    state_file = root / 'PROJECT_STATE.md'
    active_file = root / 'ACTIVE_CONTEXT.md'
    errors: list[str] = []
    if not state_file.is_file():
        errors.append('PROJECT_STATE.md is missing')
    if not active_file.is_file():
        errors.append('ACTIVE_CONTEXT.md is missing')
    if errors:
        return errors

    state = state_file.read_text(encoding='utf-8')
    active = active_file.read_text(encoding='utf-8')
    for label in ('Current milestone', 'Active work ID', 'Canonical next action'):
        a, b = _field(state, label), _field(active, label)
        if not a or not b:
            errors.append(f'{label}: missing in PROJECT_STATE or ACTIVE_CONTEXT')
        elif a != b:
            errors.append(f'{label}: mismatch: PROJECT_STATE={a!r}, ACTIVE_CONTEXT={b!r}')

    work_id = _field(state, 'Active work ID')
    action = _field(state, 'Canonical next action')
    if work_id and action:
        expected = f'[{work_id}] {action}'
        anchors = (
            ('PROJECT_STATE priority #1', _section(state, '9. Current Priority Order'),
             rf'^1\.\s+{re.escape(expected)}\s*$'),
            ('PROJECT_STATE current focus', _section(state, '10. Current Focus'),
             rf'^- Current target:\s*{re.escape(expected)}\s*$'),
            ('PROJECT_STATE next best step', _section(state, '13. Next Best Step'),
             rf'^\*\*Next:\*\*\s*{re.escape(expected)}\s*$'),
            ('ACTIVE_CONTEXT current target', _section(active, 'Current Target'),
             rf'^{re.escape(expected)}\s*$'),
            ('ACTIVE_CONTEXT next action', _section(active, 'Next Action / Test'),
             rf'^\*\*Action:\*\*\s*{re.escape(expected)}\s*$'),
        )
        for label, sec, pat in anchors:
            if sec is None:
                errors.append(f'{label}: required section missing')
            elif not re.search(pat, sec, flags=re.MULTILINE):
                errors.append(f'{label}: expected exact current action {expected!r}')

    # PROJECT_STATE is current truth, not an append-only timeline.
    dated_headings = re.findall(
        r'^##\s+(?:\d+\.\s*)?(?:20\d{2}-\d{2}-\d{2})\b[^\n]*$',
        state,
        flags=re.MULTILINE,
    )
    for heading in dated_headings:
        errors.append(f'Historical event heading in PROJECT_STATE: {heading.strip()} (move to history/)')

    # A referenced concrete ADR should be retrievable from the same project.
    referenced = set(re.findall(r'decisions/(\d{4}-[A-Za-z0-9_-]+\.md)', state))
    for filename in sorted(referenced):
        if not (root / 'decisions' / filename).is_file():
            errors.append(f'Decision record referenced but missing: decisions/{filename}')

    return errors


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('project_root', type=Path, help='Directory containing PROJECT_STATE.md and ACTIVE_CONTEXT.md')
    args = parser.parse_args()
    problems = check(args.project_root)
    if problems:
        print('FAIL: project state consistency gate')
        for issue in problems:
            print(f'- {issue}')
        return 1
    print('PASS: structural project state consistency gate')
    print('NOTE: still review evidence, decision triggers, and semantic dependencies before claiming completion.')
    return 0


if __name__ == '__main__':
    raise SystemExit(main())
