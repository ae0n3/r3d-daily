#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Generate the readable library (content-library.md) from content-data.json.

Usage:
    python tools/make_library.py
"""
import json
import os

ROOT = r'C:/Users/rakan/flashcards/daily'  # the daily/ folder of the flashcards repo
SRC = os.path.join(ROOT, 'library', 'content-data.json')
OUT = os.path.join(ROOT, 'library', 'content-library.md')
OUT = os.path.join(ROOT, 'library', 'content-library.md')


def main():
    d = json.load(open(SRC, encoding='utf-8'))
    cats = {c['id']: c for c in d['cats']}
    cards = d['cards']

    L = []
    a = []
    a.append('# مكتبة المراجعة اليومية — R3D Daily Review')
    a.append('')
    a.append('> **المصدر الوحيد:** `library/content-data.json` — يُولّد منه `daily-data.js` عبر `tools/build.py`.')
    a.append('> نشرت بنفس الرخصة (`CC BY-SA 4.0`). الصياغة والترجمة والتصنيف من إعداد R3D.')
    a.append('')
    a.append('## التنسيق')
    a.append('')
    a.append('كائن JSON: `meta`, `cats`، و `cards`. كل بطاقة واجبة الحقول التالية:')
    a.append('')
    a.append('| الحقل | نوع | معنى |')
    a.append('|---|---|---|')
    a.append('| `id` | سلسلة | معرّف فريد داخل المكتبة (مثلاً `g-01`) |')
    a.append('| `cat` | سلسلة | من 10 فئات — يكون الاختلاف بدون تداخل |')
    a.append('| `type` | `word` | كلمة، `sentence` | جملة |')
    a.append('| `level` | `easy` / `medium` / `hard` | مستوى اللغة |')
    a.append('| `front` | صينية | الصينية نفسها (علامات النغمة في `py`) |')
    a.append('| `py` | سلسلة | البينيين مع علامات النغمات |')
    a.append('| `ar` | عربية | الترجمة العربية المباشرة |')
    a.append('| `label` | `street` / `academic` / `neutral` | **المصدر والاستخدام** — يظهر للمستخدم |')
    a.append('| `sub` | سلسلة | مصطلح فرubic (تحية/سعر/اتجاه/... ) |')
    a.append('| `note` | سلسلة | شرح الاستخدام يساعد المتعلم بالطريقة الصحيحة |')
    a.append('| `ex` / `exPy` / `exAr` | سلسلة | جملة مُثيل (جمل فقط) — فائدة للمراجعة |')
    a.append('| `pair` | سلسلة | معرّف بطاقة **مثل هذه المعنى** من سطر آخر (شارعي/أكادائي) |')
    a.append('')
    a.append('> الجمل المتطابقة المعنى (مثال: `你好` و `您好`) تبقى داخل العمل نفسه، وتظهر كـ **مطابقة** في البطاقة — بحيث لا يختلط الشكل والوظيفة.')
    a.append('')
    a.append('## المأخذ (labels)')
    a.append('')
    a.append('| `label` | ما يقال للمستخدم |')
    a.append('|---|---|---|')
    a.append('| `street` | **شارعي / عامي** — لك في الشارع، والمتجر، والهاتف، والمحادثة القريبة |')
    a.append('| `academic` | **رسمي / أكاديمي** — للعمل، المدرسة، الخطاب المهذب، والكتابة |')
    a.append('| `neutral` | **محايد** — لكل مكان |')
    a.append('')
    a.append('**المجموع:** %d بطاقة، `10` فئات، والمتوزعة على المستوى السهل %d والمتوسط %d' % (len(cards), sum(1 for c in cards if c['level']=='easy'), sum(1 for c in cards if c['level']=='medium')))
    a.append('')
    a.append('## الفئات (ملخص)')
    a.append('')
    a.append('| الفئة | رمز | وصف | بطاقات | شارعي | رسمي | محايد |')
    a.append('|---|---|---|---|---|---|---|')
    for cid, c in cats.items():
        sub = [x for x in cards if x['cat'] == cid]
        a.append('| %s | %s | %s | %d | %d | %d | %d |' % (
            c['ar'], c['icon'], c['desc'], len(sub),
            sum(1 for x in sub if x['label']=='street'),
            sum(1 for x in sub if x['label']=='academic'),
            sum(1 for x in sub if x['label']=='neutral')))
    a.append('')
    a.append('## التفاصيل — كلمات وجمل لكل فئة')
    a.append('')
    for cid, c in cats.items():
        sub = [x for x in cards if x['cat'] == cid]
        a.append('### %s __%s__ — %s' % (c['icon'], c['id'], c['ar']))
        a.append('')
        a.append('| # | الصينية | البينيين | العربية | المصدر | ملاحظة |')
        a.append('|---|---|---|---|---|---|---|')
        for i, x in enumerate(sub, 1):
            a.append('| %d | %s | %s | %s | %s | %s |' % (
                i, x['front'], x['py'], x['ar'], label_text(x),
                x.get('note') or '—'))
        a.append('')
    a.append('---')
    a.append('')
    a.append('## كيف تضيف / تُعدّل')
    a.append('')
    a.append('1. عدّل `library/content-data.json` فقط (مثلاً أصنع بطاقة جديدة وتضع `cat` واحدة و`label` واضحة).')
    a.append('2. شغّل `python tools/build.py` — يُولّد `daily-data.js` ويطلق رسائلاً عن أي سوء توافق (تكرار في الاسم، زوج غير متبادلة، كلام غير صيني، أصوات بلا معنى).')
    a.append('3. أعدّ تشغيل الموقع ومُشغّل الصوت (edge-tts 7.3.1 أو Google TTS).')
    a.append('')
    a.append('## المصادر (مفتوحة / مرجعية)')
    a.append('')
    a.append('- HSK 3.0 (CC BY-SA 4.0) — 11000 كلمة — https://gushichinese.com/hsk-3.0/downloads')
    a.append('- SUBTLEX-CH (CC BY-SA 4.0) — تكرار الكلمات الشائعة — https://www.ugent.be/.../subtlexch')
    a.append('- OPUS–Tatoeba ar-cmn (CC BY 4.0) — 104 جملة — https://opus.nlpl.eu/Tatoeba.php')
    a.append('- chineseblarabia.com — مرجع الوظائف (غير مفتوح)، للملامح فقط')
    a.append('')
    txt = '\n'.join(a)
    with open(OUT, 'w', encoding='utf-8') as f:
        f.write(txt)
    print('wrote %s (%d bytes)' % (os.path.relpath(OUT, ROOT), len(txt.encode('utf-8'))))


def label_text(x):
    return { 'street': 'شارعي', 'academic': 'رسمي', 'neutral': 'محايد' }[x['label']]


def card_ar(pid):
    for c in json.load(open(SRC, encoding='utf-8'))['cards']:
        if c['id'] == pid:
            return c['ar']
    return ''


if __name__ == '__main__':
    main()
