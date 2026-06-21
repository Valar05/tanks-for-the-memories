#!/usr/bin/env python3
import argparse
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
QUERY_DIR = ROOT / 'queries'


def load_query(query_id):
    path = QUERY_DIR / f"{query_id}.json"
    if not path.exists():
        raise SystemExit(f"Unknown query id: {query_id}")
    return json.loads(path.read_text(encoding='utf-8'))


def render_markdown(q):
    nl = chr(10)
    lines = [
        f"# {q['query_id']}",
        '',
        f"**Short Answer**: {q['short_answer']}",
        '',
        '**Evidence Summary**',
    ]
    lines.extend([f'- {item}' for item in q['evidence_summary']])
    lines.extend([
        '',
        '**Structured Data**',
        '```json',
        json.dumps(q['structured_data'], indent=2, ensure_ascii=False),
        '```',
        '',
        '**Simulation Variables**',
    ])
    for item in q['simulation_variables']:
        lines.append(f"- `{item['variable']}`: {item['effect']}")
    lines.extend(['', '**Game Implications**'])
    lines.extend([f'- {item}' for item in q['game_implications']])
    lines.extend(['', f"**Confidence**: {q['confidence']}", '', '**Sources**'])
    lines.extend([f'- {src}' for src in q['sources']])
    return nl.join(lines) + nl


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('query_id')
    ap.add_argument('--format', choices=['markdown', 'json', 'both'], default='both')
    args = ap.parse_args()
    q = load_query(args.query_id)
    if args.format in ('markdown', 'both'):
        print(render_markdown(q), end='')
    if args.format in ('json', 'both'):
        print(json.dumps(q, indent=2, ensure_ascii=False))


if __name__ == '__main__':
    main()
