#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Generate audio/*.mp3 for every card (Chinese front, zh voice).

Pipeline per card: edge-tts streaming (bypasses a Python-3.14
bytecode quirk in edge_tts.util._run_tts wrapper).

Run: python tools/make_audio.py
"""
import json
import os
import types
import io
import asyncio
import time
from concurrent.futures import ThreadPoolExecutor, as_completed

LIB = 'C:/Users/rakan/flashcards/daily/library/content-data.json'
AUD = 'C:/Users/rakan/flashcards/daily/audio'
VOICE = 'zh-CN-XiaoxiaoNeural'
THREADS = 16
DELAY = 0.25


def tts_bytes(text):
    """Return raw mp3 bytes for `text` using edge-tts's streaming engine."""
    import edge_tts

    ns = types.SimpleNamespace(
        text=text, voice=VOICE, rate='+0%', volume='+0%', pitch='+0Hz',
        proxy=None, write_media=None, write_subtitles=None,
        no_progress=True, list_voices=False, file=None,
    )
    communicate = edge_tts.Communicate(
        ns.text, ns.voice, rate=ns.rate, volume=ns.volume, pitch=ns.pitch, proxy=ns.proxy)
    buf = io.BytesIO()

    async def _run():
        nonlocal buf
        async for chunk in communicate.stream():
            if chunk['type'] == 'audio':
                buf.write(chunk['data'])

    asyncio.run(_run())
    return buf.getvalue()


def gen_card(c):
    cid = c['id']
    text = c['front'] or c['ar']
    out = os.path.join(AUD, cid + '.mp3')
    if os.path.exists(out) and os.path.getsize(out) > 2000:
        return cid, 'skip'
    try:
        data = tts_bytes(text)
    except Exception as e:
        return cid, 'tts-error:%s' % e
    if len(data) < 2000:
        return cid, 'tts-too-short:%d' % len(data)
    with open(out, 'wb') as f:
        f.write(data)
    time.sleep(DELAY)
    return cid, 'ok'


if __name__ == '__main__':
    d = json.load(open(LIB, encoding='utf-8'))
    cards = d['cards']
    results = []
    with ThreadPoolExecutor(max_workers=THREADS) as ex:
        futs = {ex.submit(gen_card, c): c['id'] for c in cards}
        for f in as_completed(futs):
            results.append(f.result())
    ok = sum(1 for r in results if r[1] == 'ok')
    skip = sum(1 for r in results if r[1] == 'skip')
    fail = [r for r in results if r[1] not in ('ok', 'skip')]
    print('cards processed: %d  ok=%d  skip=%d  fail=%d' % (len(results), ok, skip, len(fail)))
    for cid, why in fail[:15]:
        print('   FAIL %s: %s' % (cid, why))
    print('audio dir:', os.path.getsize(AUD) // 1024, 'KB')
