#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Add extra word-bank batches (wordbank_7.tsv etc.) to content-data.json.
Used for glosses NOT in the HSK selection.
Run: python tools/add_batch.py
"""
import json
import os
import csv

HERE = os.path.dirname(os.path.abspath(__file__))
LIB = os.path.join(os.path.dirname(HERE), 'library', 'content-data.json')
TSVS = []
for i in range(7, 20):
    p = os.path.join(HERE, 'wordbank_%d.tsv' % i)
    if os.path.exists(p):
        TSVS.append(p)

LEVELS = {'1': 'easy', '2': 'easy', '3': 'medium', '4': 'medium'}


def load_glosses():
    g = {}
    for p in TSVS:
        for line in open(p, encoding='utf-8'):
            line = line.rstrip('\n')
            if not line.strip():
                continue
            parts = line.split('\t')
            g[parts[1].strip()] = {'ar': parts[2], 'cat': parts[3], 'label': parts[4]}
    return g


def load_pinyin():
    """Load pinyin for extra words from hsk_all.csv (levels 3 and 4)."""
    py = {}
    with open('C:/Users/rakan/AppData/Local/Temp/zhprobe/hsk_all.csv',
              encoding='utf-8-sig', newline='') as f:
        for row in csv.DictReader(f):
            if row.get('level', '').strip() in ('3', '4'):
                py[row['hanzi'].strip()] = row['pinyin'].strip()
    return py


def main():
    d = json.load(open(LIB, encoding='utf-8'))
    cats = d['cats']
    if not any(c['id'] == 'general' for c in cats):
        cats.append({'id': 'general', 'ar': 'مفردات عامة', 'icon': '📚',
                     'desc': 'كلمات ومفردات يومية عامة'})

    gloss = load_glosses()
    pinyin = load_pinyin()
    existing_fronts = {c.get('front', '') for c in d['cards']}
    existing_ids = {c['id'] for c in d['cards']}

    added = 0
    for hanzi, g in gloss.items():
        if hanzi in existing_fronts:
            continue
        for cand in ('wb-%s' % hanzi, 'wb-n%d' % len(d['cards'])):
            if cand not in existing_ids:
                cid = cand
                break
        else:
            cid = 'wbn%d' % len(d['cards'])
        card = {
            'id': cid,
            'cat': g['cat'],
            'type': 'word',
            'level': 'medium',
            'front': hanzi,
            'py': pinyin.get(hanzi, 'n/a'),
            'ar': g['ar'],
            'label': g['label'],
            'note': 'HSK3 — word bank extra',
        }
        d['cards'].append(card)
        existing_fronts.add(hanzi)
        existing_ids.add(cid)
        added += 1

    with open(LIB, 'w', encoding='utf-8') as f:
        json.dump(d, f, ensure_ascii=False, indent=2)
    print('added %d cards' % added)
    print('total cards now:', len(d['cards']))


if __name__ == '__main__':
    main()
