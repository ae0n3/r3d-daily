#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Build the word bank: merge Arabic glosses (wordbank_*.tsv) with HSK data.
Matches glosses to selected words BY HANZI (robust to ordering differences).
Output: appends word cards to library/content-data.json.
Run: python tools/expand_words.py
"""
import json
import os

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)                       # daily/
LIB = os.path.join(ROOT, 'library', 'content-data.json')
SEL = 'C:/Users/rakan/AppData/Local/Temp/zhprobe/wordbank_sel.json'
TSVS = [os.path.join(HERE, 'wordbank_%d.tsv' % i) for i in (1, 2, 3, 4, 5, 6)]

LEVELS = {'1': 'easy', '2': 'easy', '3': 'medium', '4': 'medium'}

# corrections keyed by hanzi
FIX = {'护照': 'جواز سفر'}


def load_glosses():
    g = {}
    for p in TSVS:
        for line in open(p, encoding='utf-8'):
            line = line.rstrip('\n')
            if not line.strip():
                continue
            parts = line.split('\t')
            hanzi = parts[1].strip()
            ar = FIX.get(hanzi, parts[2])
            g[hanzi] = {'ar': ar, 'cat': parts[3], 'label': parts[4]}
    return g


def main():
    d = json.load(open(LIB, encoding='utf-8'))
    cats = d['cats']
    if not any(c['id'] == 'general' for c in cats):
        cats.append({'id': 'general', 'ar': 'مفردات عامة', 'icon': '📚',
                     'desc': 'كلمات ومفردات يومية عامة'})

    sel = json.load(open(SEL, encoding='utf-8'))
    gloss = load_glosses()

    existing_fronts = {c.get('front', '') for c in d['cards']}
    existing_ids = {c['id'] for c in d['cards']}

    added, skipped, missing = 0, 0, 0
    for w in sel:
        hanzi = w['hanzi'].strip()
        if hanzi not in gloss:
            missing += 1
            print('  !! no gloss for %s (%s)' % (hanzi, w['en']))
            continue
        if hanzi in existing_fronts:
            skipped += 1
            continue
        g = gloss[hanzi]
        cid = None
        for cand in ('wb-%03d' % w['n'], 'ww-%03d' % w['n']):
            if cand not in existing_ids:
                cid = cand
                break
        if cid is None:
            cid = 'wbn%d' % w['n']
        card = {
            'id': cid,
            'cat': g['cat'],
            'type': 'word',
            'level': LEVELS[w['lv']],
            'front': hanzi,
            'py': w['py'],
            'ar': g['ar'],
            'label': g['label'],
            'note': 'HSK %s — %s' % (w['lv'], w['en'][:80]),
        }
        d['cards'].append(card)
        existing_fronts.add(hanzi)
        existing_ids.add(cid)
        added += 1

    with open(LIB, 'w', encoding='utf-8') as f:
        json.dump(d, f, ensure_ascii=False, indent=2)
    print('added %d word cards; skipped %d (already present); missing glosses %d'
          % (added, skipped, missing))
    print('total cards now:', len(d['cards']))
    print('categories:', len(cats))


if __name__ == '__main__':
    main()
