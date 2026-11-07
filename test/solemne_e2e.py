"""Solemne 2: 120s clocks, complete 100-question exam, source and separate storage."""
import json
import os
from datetime import datetime, timedelta, timezone
from pathlib import Path
from playwright.sync_api import sync_playwright, expect

ROOT = Path(__file__).resolve().parents[1]
BASE = os.environ.get('MORFO_BASE_URL', 'http://127.0.0.1:5173').rstrip('/') + '/'
OUT = ROOT / 'test-results' / 'solemne'
OUT.mkdir(parents=True, exist_ok=True)
BANK = json.loads((ROOT / 'public/data/solemne2.json').read_text())
BY_TEXT = {q['question']: q for q in BANK}
PREFIX = 'morfo.uss.solemne2.v1.'


def load(page):
    now = datetime(2026, 11, 7, 18, 0, tzinfo=timezone.utc)
    page.clock.install(time=now)
    page.clock.pause_at(now + timedelta(seconds=1))
    page.goto(BASE + '#solemne-2-morfo')
    expect(page.get_by_role('heading', name='Solemne 2 Morfo', exact=True)).to_be_visible()


def stored(page, key):
    return page.evaluate('(key) => JSON.parse(localStorage.getItem(key))', PREFIX + key)


def test_source_and_home(page):
    load(page)
    expect(page.locator('.overview-strip')).to_contain_text('100')
    expect(page.locator('.overview-strip')).to_contain_text('02:00')
    expect(page.locator('.topic-card')).to_have_count(7)
    expect(page.locator('input[name=study-mode]').nth(1)).to_be_checked()
    expect(page.locator('input[name=session-size][value="100"]')).to_be_checked()
    expect(page.get_by_role('button', name='Práctica visual', exact=True)).to_have_count(0)
    expect(page.get_by_role('link', name='Abrir compilado PDF', exact=True)).to_have_attribute('href', BASE + 'source-solemne2.pdf')
    response = page.request.get(BASE + 'source-solemne2.pdf')
    assert response.ok and response.body().startswith(b'%PDF')
    page.screenshot(path=str(OUT / 'portada-desktop.png'), full_page=True)
    page.get_by_role('button', name='Ayuda', exact=True).click()
    expect(page.get_by_role('dialog')).to_contain_text('2 minutos')
    page.keyboard.press('Escape')
    page.get_by_role('button', name='Banco de preguntas', exact=False).click()
    expect(page.locator('.library-card')).to_have_count(100)
    card = page.locator('.library-card').last
    card.get_by_role('button', name='Ver respuesta', exact=True).click()
    expect(card.locator('.question-source')).to_have_attribute('href', BASE + 'source-solemne2.pdf#page=82')


def test_clock_pause_restore_and_sections(page):
    load(page)
    page.get_by_role('button', name='Simulacro de 100 preguntas', exact=True).click()
    expect(page.locator('.timer-digits strong')).to_have_text('02:00')
    current = page.locator('.question-body h2').inner_text()
    page.locator('.answer-option').nth(2).click()
    page.clock.fast_forward(10_000)
    expect(page.locator('.timer-digits strong')).to_have_text('01:50')
    page.get_by_role('button', name='Pausar sesión', exact=True).click()
    page.clock.fast_forward(300_000)
    expect(page.locator('.timer-digits strong')).to_have_text('01:50')
    page.reload()
    page.get_by_role('button', name='Retomar sesión', exact=True).click()
    expect(page.locator('.timer-digits strong')).to_have_text('01:50')
    page.get_by_role('button', name='Reanudar pregunta', exact=True).click()
    expect(page.locator('.question-body h2')).to_have_text(current)
    expect(page.locator('.answer-options input').nth(2)).to_be_checked()
    # Switching saves the exact 120s session without sharing data with Control II.
    page.get_by_role('button', name='Control II · Miembro superior', exact=False).click()
    expect(page.locator('.overview-strip')).to_contain_text('400')
    expect(page.locator('.overview-strip')).to_contain_text('01:30')
    page.get_by_role('button', name='Comenzar sesión', exact=True).click()
    expect(page.locator('.timer-digits strong')).to_have_text('01:30')
    page.get_by_role('button', name='Solemne 2 Morfo', exact=False).click()
    page.get_by_role('button', name='Retomar sesión', exact=True).click()
    expect(page.locator('.timer-digits strong')).to_have_text('01:50')
    assert len(stored(page, 'session')['ids']) == 100
    page.get_by_role('button', name='Reanudar pregunta', exact=True).click()
    page.clock.fast_forward(110_000)
    expect(page.locator('.feedback-title')).to_have_text('Tiempo agotado')
    expect(page.locator('.timer-digits strong')).to_have_text('00:00')
    assert stored(page, 'session')['answers'][0]['timeout']
    assert stored(page, 'progress') == {}, 'Exam correction remains hidden'
    page.get_by_role('button', name='Siguiente pregunta', exact=True).click()
    expect(page.locator('.timer-digits strong')).to_have_text('02:00')


def test_full_exam(page):
    load(page)
    page.get_by_role('button', name='Simulacro de 100 preguntas', exact=True).click()
    seen = set()
    for i in range(100):
        question = BY_TEXT[page.locator('.question-body h2').inner_text()]
        assert question['id'] not in seen
        seen.add(question['id'])
        if i == 0:
            page.clock.fast_forward(120_000)
        else:
            selected = question['correctIndex'] if i % 2 == 0 else (question['correctIndex'] + 1) % 4
            page.locator('.answer-option').nth(selected).click()
            page.get_by_role('button', name='Confirmar respuesta', exact=True).click()
        expect(page.locator('.official-answer')).to_have_count(0)
        expect(page.locator('.answer-option.is-correct, .answer-option.is-incorrect')).to_have_count(0)
        assert stored(page, 'progress') == {}
        page.get_by_role('button', name='Ver resultados' if i == 99 else 'Siguiente pregunta', exact=True).click()
    expect(page.locator('.review-item')).to_have_count(100)
    expect(page.locator('.result-metrics')).to_contain_text('49')
    progress = stored(page, 'progress')
    assert len(progress) == 100 and sum(v['attempts'] for v in progress.values()) == 100
    assert sum(v['correct'] for v in progress.values()) == 49
    assert stored(page, 'history')[0]['questionCount'] == 100
    assert stored(page, 'session') is None
    assert page.evaluate('localStorage.getItem("morfo.uss.v1.progress")') is None
    page.locator('.review-item summary').first.click()
    expect(page.locator('.review-content').first.locator('.question-source')).to_have_attribute('href', __import__('re').compile('source-solemne2.pdf#page='))
    page.get_by_role('button', name='Repasar errores (51)', exact=True).click()
    expect(page.locator('.timer-digits strong')).to_have_text('02:00')
    page.locator('.answer-option').first.click()
    page.get_by_role('button', name='Confirmar respuesta', exact=True).click()
    expect(page.locator('.official-answer')).to_be_visible()


def test_mobile(page):
    load(page)
    assert page.evaluate('document.documentElement.scrollWidth <= innerWidth'), 'No overflow on landing'
    page.screenshot(path=str(OUT / f'portada-{page.viewport_size["width"]}.png'), full_page=True)
    page.get_by_role('button', name='Abrir menú', exact=True).click()
    expect(page.get_by_role('button', name='Solemne 2 Morfo', exact=False)).to_be_visible()
    page.get_by_role('button', name='Control II · Miembro superior', exact=False).click()
    expect(page.locator('.overview-strip')).to_contain_text('400')
    page.get_by_role('button', name='Abrir menú', exact=True).click()
    page.get_by_role('button', name='Solemne 2 Morfo', exact=False).click()
    page.get_by_role('button', name='Simulacro de 100 preguntas', exact=True).click()
    expect(page.locator('.answer-option')).to_have_count(4)
    assert page.evaluate('document.documentElement.scrollWidth <= innerWidth'), 'No overflow in question'
    expect(page.locator('.timer-digits strong')).to_have_text('02:00')
    page.screenshot(path=str(OUT / f'pregunta-{page.viewport_size["width"]}.png'), full_page=True)


if __name__ == '__main__':
    with sync_playwright() as p:
        browser = p.chromium.launch(executable_path=os.environ.get('CHROMIUM_PATH', '/usr/bin/chromium'), args=['--no-sandbox', '--disable-dev-shm-usage'])
        for check, width in [(test_source_and_home, 1440), (test_clock_pause_restore_and_sections, 1440), (test_full_exam, 1440), (test_mobile, 390), (test_mobile, 320)]:
            ctx = browser.new_context(viewport={'width': width, 'height': 1000 if width > 700 else 844}, reduced_motion='reduce')
            page = ctx.new_page()
            errors = []
            page.on('pageerror', lambda error: errors.append(str(error)))
            try:
                check(page)
                assert not errors, errors
                print('PASS', check.__name__, width, flush=True)
            except Exception:
                page.screenshot(path=str(OUT / f'failure-{check.__name__}-{width}.png'), full_page=True)
                raise
            finally:
                ctx.close()
        browser.close()
