"""histo-embrio: both sources, 100-question exam, 120s clocks and isolated persistence."""
import hashlib
import json
import os
from datetime import datetime, timedelta, timezone
from pathlib import Path
from playwright.sync_api import sync_playwright, expect

ROOT = Path(__file__).resolve().parents[1]
BASE = os.environ.get('MORFO_BASE_URL', 'http://127.0.0.1:5173').rstrip('/') + '/'
OUT = ROOT / 'test-results' / 'histoembrio'
OUT.mkdir(parents=True, exist_ok=True)
BANK = json.loads((ROOT / 'public/data/histoembrio.json').read_text())
BY_TEXT = {q['question']: q for q in BANK}
PREFIX = 'morfo.uss.histoembrio.v1.'


def load(page):
    now = datetime(2026, 11, 8, 18, 0, tzinfo=timezone.utc)
    page.clock.install(time=now)
    page.clock.pause_at(now + timedelta(seconds=1))
    page.goto(BASE + '#histo-embrio')
    expect(page.get_by_role('heading', name='histo-embrio', exact=True)).to_be_visible()


def stored(page, key):
    return page.evaluate('(key) => JSON.parse(localStorage.getItem(key))', PREFIX + key)


def test_sources_library_and_practice(page):
    load(page)
    expect(page.locator('.overview-strip')).to_contain_text('100')
    expect(page.locator('.overview-strip')).to_contain_text('02:00')
    expect(page.locator('.topic-card')).to_have_count(7)
    expect(page.locator('input[name=study-mode]').nth(1)).to_be_checked()
    expect(page.locator('input[name=session-size][value="100"]')).to_be_checked()
    for source in ['histo', 'embrio']:
        link = page.locator('.histoembrio-documents a').filter(has_text='Histología' if source == 'histo' else 'Embriología')
        expect(link).to_have_attribute('href', BASE + f'source-{source}.pdf')
        response = page.request.get(BASE + f'source-{source}.pdf')
        assert response.ok
        assert hashlib.sha256(response.body()).digest() == hashlib.sha256((ROOT / f'public/source-{source}.pdf').read_bytes()).digest()
    page.screenshot(path=str(OUT / 'portada-desktop.png'), full_page=True)
    page.get_by_role('button', name='Ayuda', exact=True).click()
    expect(page.get_by_role('dialog')).to_contain_text('50 de histología y 50 de embriología')
    expect(page.get_by_role('dialog')).to_contain_text('2 minutos')
    page.keyboard.press('Escape')
    page.get_by_role('button', name='Banco de preguntas', exact=False).click()
    expect(page.locator('.library-card')).to_have_count(100)
    for index in [0, 50]:
        q = BANK[index]
        card = page.locator('.library-card').nth(index)
        card.get_by_role('button', name='Ver respuesta', exact=True).click()
        expect(card.locator('.question-source')).to_have_attribute('href', BASE + f'source-{q["sourceId"]}.pdf#page={q["sourcePages"][0]}')
        expect(card.locator('.question-source')).to_contain_text('Clase 10' if index == 0 else 'Clase 11')
    # Filter and a single-question guided practice use the matching source.
    topic = 'Embriología: desarrollo de los miembros'
    page.get_by_role('combobox', name='Filtrar banco por tema').select_option(topic)
    expect(page.locator('.library-card')).to_have_count(18)
    page.get_by_role('textbox', name='Buscar preguntas').fill('rotación')
    expect(page.locator('.library-card')).to_have_count(2)
    card = page.locator('.library-card').first
    card.get_by_role('button', name='Practicar', exact=True).click()
    expect(page.locator('.timer-digits strong')).to_have_text('02:00')
    page.locator('.answer-option').first.click()
    page.get_by_role('button', name='Confirmar respuesta', exact=True).click()
    expect(page.locator('.official-answer')).to_be_visible()
    expect(page.locator('.question-source')).to_have_attribute('href', __import__('re').compile('source-embrio.pdf#page='))
    assert sum(v['attempts'] for v in stored(page, 'progress').values()) == 1


def test_pause_resume_and_separate_sections(page):
    load(page)
    page.get_by_role('button', name='Simulacro de 100 preguntas', exact=True).click()
    expect(page.locator('.timer-digits strong')).to_have_text('02:00')
    question = page.locator('.question-body h2').inner_text()
    page.locator('.answer-option').nth(1).click()
    page.get_by_role('button', name='Guardar pregunta', exact=True).click()
    page.clock.fast_forward(10_000)
    page.get_by_role('button', name='Pausar sesión', exact=True).click()
    page.clock.fast_forward(200_000)
    expect(page.locator('.timer-digits strong')).to_have_text('01:50')
    page.reload()
    page.get_by_role('button', name='Retomar sesión', exact=True).click()
    expect(page.locator('.timer-digits strong')).to_have_text('01:50')
    page.get_by_role('button', name='Reanudar pregunta', exact=True).click()
    expect(page.locator('.question-body h2')).to_have_text(question)
    expect(page.locator('.answer-options input').nth(1)).to_be_checked()
    for section, duration in [('Solemne 2 Morfo', '02:00'), ('Control II · Miembro superior', '01:30')]:
        page.get_by_role('button', name=section, exact=False).click()
        expect(page.locator('.overview-strip')).to_contain_text(duration)
        page.get_by_role('button', name='Comenzar sesión', exact=True).click()
        expect(page.locator('.timer-digits strong')).to_have_text(duration)
        page.get_by_role('button', name='histo-embrio', exact=False).click()
        page.get_by_role('button', name='Retomar sesión', exact=True).click()
        expect(page.locator('.timer-digits strong')).to_have_text('01:50')
        page.get_by_role('button', name='Reanudar pregunta', exact=True).click()
        expect(page.locator('.question-body h2')).to_have_text(question)
    assert len(stored(page, 'bookmarks')) == 1
    assert page.evaluate('JSON.parse(localStorage.getItem("morfo.uss.solemne2.v1.bookmarks"))') == []
    assert page.evaluate('JSON.parse(localStorage.getItem("morfo.uss.v1.bookmarks"))') == []


def test_full_exam_and_120s_deadline(page):
    load(page)
    page.get_by_role('button', name='Simulacro de 100 preguntas', exact=True).click()
    seen = set()
    for i in range(100):
        question = BY_TEXT[page.locator('.question-body h2').inner_text()]
        assert question['id'] not in seen
        seen.add(question['id'])
        if i == 0:
            page.clock.fast_forward(119_000)
            expect(page.locator('.feedback')).to_have_count(0)
            expect(page.locator('.timer-digits strong')).to_have_text('00:01')
            page.clock.fast_forward(1_000)
            expect(page.locator('.feedback-title')).to_have_text('Tiempo agotado')
        else:
            selected = question['correctIndex'] if i % 2 == 0 else (question['correctIndex'] + 1) % 4
            page.locator('.answer-option').nth(selected).click()
            page.get_by_role('button', name='Confirmar respuesta', exact=True).click()
        expect(page.locator('.official-answer')).to_have_count(0)
        expect(page.locator('.answer-option.is-correct, .answer-option.is-incorrect')).to_have_count(0)
        assert stored(page, 'progress') == {}, 'Exam must not expose correction before completion'
        page.get_by_role('button', name='Ver resultados' if i == 99 else 'Siguiente pregunta', exact=True).click()
    expect(page.locator('.review-item')).to_have_count(100)
    progress = stored(page, 'progress')
    assert len(progress) == 100 and sum(v['attempts'] for v in progress.values()) == 100
    assert sum(v['correct'] for v in progress.values()) == 49
    assert stored(page, 'history')[0]['questionCount'] == 100
    assert stored(page, 'session') is None
    links = page.locator('.review-content .question-source').evaluate_all('(nodes) => nodes.map(a => a.href)')
    assert len([x for x in links if 'source-histo.pdf#page=' in x]) == 50
    assert len([x for x in links if 'source-embrio.pdf#page=' in x]) == 50
    assert page.evaluate('localStorage.getItem("morfo.uss.v1.progress")') is None
    assert page.evaluate('localStorage.getItem("morfo.uss.solemne2.v1.progress")') is None
    page.get_by_role('button', name='Repasar errores (51)', exact=True).click()
    expect(page.locator('.timer-digits strong')).to_have_text('02:00')


def test_mobile(page):
    load(page)
    assert page.evaluate('document.documentElement.scrollWidth <= innerWidth'), 'Landing overflow'
    page.screenshot(path=str(OUT / f'portada-{page.viewport_size["width"]}.png'), full_page=True)
    page.get_by_role('button', name='Abrir menú', exact=True).click()
    expect(page.get_by_role('button', name='histo-embrio', exact=False)).to_be_visible()
    page.get_by_role('button', name='Control II · Miembro superior', exact=False).click()
    expect(page.locator('.overview-strip')).to_contain_text('400')
    page.get_by_role('button', name='Abrir menú', exact=True).click()
    page.get_by_role('button', name='histo-embrio', exact=False).click()
    page.get_by_role('button', name='Simulacro de 100 preguntas', exact=True).click()
    expect(page.locator('.answer-option')).to_have_count(4)
    expect(page.locator('.timer-digits strong')).to_have_text('02:00')
    assert page.evaluate('document.documentElement.scrollWidth <= innerWidth'), 'Question overflow'
    page.screenshot(path=str(OUT / f'pregunta-{page.viewport_size["width"]}.png'), full_page=True)


if __name__ == '__main__':
    with sync_playwright() as p:
        browser = p.chromium.launch(executable_path=os.environ.get('CHROMIUM_PATH', '/usr/bin/chromium'), args=['--no-sandbox', '--disable-dev-shm-usage'])
        for check, width in [(test_sources_library_and_practice, 1440), (test_pause_resume_and_separate_sections, 1440), (test_full_exam_and_120s_deadline, 1440), (test_mobile, 390), (test_mobile, 320)]:
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
