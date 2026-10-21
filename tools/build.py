#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
R3D Daily Review — backend builder & validator.

Source of truth : daily/library/content-data.json
Output          : daily/daily-data.js   (text only, NO audio — audio lives in daily/audio/*.mp3)

Usage:
    python tools/build.py            # validate + generate
    python tools/build.py --check    # validate only, no write

Exit codes: 0 = clean, 1 = validation errors, 2 = json parse error.
"""
import json
import os
import re
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)                      # daily/
LIB = os.path.join(ROOT, 'library')
SRC = os.path.join(LIB, 'content-data.json')
OUT = os.path.join(ROOT, 'daily-data.js')

CJK = re.compile(r'[\u4e00-\u9fff]')
ARABIC = re.compile(r'[\u0600-\u06ff]')
TONE = re.compile(r'[āáǎàēéěèīíǐìōóǒòūúǔùǖǘǚǜĀÁǍÀĒÉĚÈĪÍǏÌŌÓǑÒŪÚǓÙǕǗǙǛ]')
ALLOWED_FRONT = set('。，！？、；：·「」『』（）《》〈〉""''！？!?.,;:—…0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz')

TYPES = {'word', 'sentence'}
LEVELS = {'easy', 'medium', 'hard'}
LABELS = {'street', 'academic', 'neutral'}


def load():
    with open(SRC, encoding='utf-8') as f:
        return json.load(f)


def validate(d):
    errs = []
    warns = []

    cats = {c['id']: c for c in d.get('cats', [])}
    if len(cats) != len(d.get('cats', [])):
        errs.append('cats: duplicate category ids')

    ids, fronts, pairs = set(), {}, {}
    for c in d.get('cards', []):
        cid = c.get('id', '?')

        for f in ('id', 'cat', 'type', 'level', 'front', 'py', 'ar', 'label'):
            if f not in c or not str(c[f]).strip():
                errs.append('%s: missing field %s' % (cid, f))

        if c.get('type') not in TYPES:
            errs.append('%s: bad type %r' % (cid, c.get('type')))
        if c.get('level') not in LEVELS:
            errs.append('%s: bad level %r' % (cid, c.get('level')))
        if c.get('label') not in LABELS:
            errs.append('%s: bad label %r' % (cid, c.get('label')))
        if c.get('cat') not in cats:
            errs.append('%s: unknown cat %r' % (cid, c.get('cat')))

        if cid in ids:
            errs.append('%s: duplicate id' % cid)
        ids.add(cid)

        # the user's core requirement: no overlapping entries
        fr = c.get('front', '')
        if fr in fronts:
            errs.append('duplicate front %r -> %s and %s' % (fr, fronts[fr], cid))
        fronts[fr] = cid

        if not CJK.search(fr):
            errs.append('%s: front has no CJK chars: %r' % (cid, fr))
        stray = ARABIC.findall(fr)
        if stray:
            errs.append('%s: Arabic inside front: %r' % (cid, ''.join(stray)))
        for ch in fr:
            if ch not in ALLOWED_FRONT and not CJK.match(ch):
                errs.append('%s: unexpected char %r in front' % (cid, ch))

        py = c.get('py', '')
        if not TONE.search(py) and not re.fullmatch(r'[A-Za-z\s\.\-…]+', py):
            errs.append('%s: pinyin neither toned nor plain: %r' % (cid, py))

        ar = c.get('ar', '')
        if not ARABIC.search(ar):
            errs.append('%s: ar has no Arabic: %r' % (cid, ar))

        if c.get('pair'):
            pairs[cid] = c['pair']

    # pair integrity
    for a, b in pairs.items():
        if b not in ids:
            errs.append('%s: pair target %s missing' % (a, b))
        elif pairs.get(b) != a:
            errs.append('pair %s -> %s not mutual (back=%r)' % (a, b, pairs.get(b)))

    # example sentences on word cards are noise
    for c in d.get('cards', []):
        if c.get('type') == 'word' and (c.get('ex') or c.get('exPy') or c.get('exAr')):
            warns.append('%s: word card carries example fields' % c['id'])

    return errs, warns


def report(d, errs, warns):
    cats = {c['id']: c for c in d.get('cats', [])}
    cards = d.get('cards', [])
    print('=' * 62)
    print('R3D DAILY REVIEW — backend validation')
    print('=' * 62)
    print('source     : %s' % os.path.relpath(SRC, ROOT))
    print('categories : %d' % len(cats))
    print('cards      : %d' % len(cards))

    for lv in ('easy', 'medium', 'hard'):
        n = sum(1 for c in cards if c['level'] == lv)
        print('  level %-7s : %3d' % (lv, n))
    for lb in ('street', 'academic', 'neutral'):
        n = sum(1 for c in cards if c['label'] == lb)
        print('  label %-7s : %3d' % (lb, n))
    n = sum(1 for c in cards if c.get('pair'))
    print('  pairs       : %3d' % n)

    print('-' * 62)
    print('%-16s %-6s %-8s %-8s' % ('category', 'count', 'street', 'academic'))
    for cid, cat in cats.items():
        sub = [c for c in cards if c['cat'] == cid]
        print('%-16s %-6d %-8d %-8d' % (
            cat['ar'], len(sub),
            sum(1 for c in sub if c['label'] == 'street'),
            sum(1 for c in sub if c['label'] == 'academic')))

    print('-' * 62)
    if warns:
        print('WARNINGS (%d)' % len(warns))
        for w in warns:
            print('  ! ' + w)
    if errs:
        print('ERRORS (%d)' % len(errs))
        for e in errs:
            print('  X ' + e)
    else:
        print('OK — no errors')
    print('=' * 62)
    return len(errs)


def emit(d):
    meta = dict(d.get('meta', {}))
    meta['counts'] = {
        'cats': len(d.get('cats', [])),
        'cards': len(d.get('cards', [])),
        'street': sum(1 for c in d.get('cards', []) if c['label'] == 'street'),
        'academic': sum(1 for c in d.get('cards', []) if c['label'] == 'academic'),
        'neutral': sum(1 for c in d.get('cards', []) if c['label'] == 'neutral'),
        'easy': sum(1 for c in d.get('cards', []) if c['level'] == 'easy'),
        'medium': sum(1 for c in d.get('cards', []) if c['level'] == 'medium'),
        'hard': sum(1 for c in d.get('cards', []) if c['level'] == 'hard'),
        'pairs': sum(1 for c in d.get('cards', []) if c.get('pair')),
    }
    payload = {
        'meta': meta,
        'cats': d.get('cats', []),
        'cards': d.get('cards', []),
    }
    js = (
        '// ============================================================\n'
        '//  R3D Daily Review — generated from library/content-data.json\n'
        '//  DO NOT EDIT BY HAND.  Run:  python tools/build.py\n'
        '//  text only — no audio (audio lives in audio/*.mp3)\n'
        '// ============================================================\n'
        'window.R3D_DAILY = ' + json.dumps(payload, ensure_ascii=False, indent=1) + ';\n'
    )
    with open(OUT, 'w', encoding='utf-8') as f:
        f.write(js)
    print('wrote %s (%d bytes)' % (os.path.relpath(OUT, ROOT), len(js.encode('utf-8'))))


def main():
    if '--check' in sys.argv:
        pass
    try:
        d = load()
    except Exception as e:
        print('JSON ERROR: %s' % e)
        return 2
    errs, warns = validate(d)
    n = report(d, errs, warns)
    if n == 0 and '--check' not in sys.argv:
        emit(d)
    return 1 if n else 0


if __name__ == '__main__':
    sys.exit(main())
