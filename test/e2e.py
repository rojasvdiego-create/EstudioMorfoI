"""Functional browser checks against a running server (MORFO_BASE_URL defaults to port 5173).

Run: python test/e2e.py
Requires Python Playwright and Chromium; CHROMIUM_PATH may override its location.
"""
import json
import os
import traceback
from datetime import datetime, timedelta, timezone
from pathlib import Path

from playwright.sync_api import sync_playwright, expect

BASE = os.environ.get('MORFO_BASE_URL', 'http://127.0.0.1:5173').rstrip('/') + '/'
ROOT = Path(__file__).resolve().parents[1]
ARTIFACTS = ROOT / 'test-results' / 'browser'
PREFIX = 'morfo.uss.v1.'
QUESTIONS = json.loads((ROOT / 'public/data/questions.json').read_text())
BY_TEXT = {q['question']: q for q in QUESTIONS}
ARTIFACTS.mkdir(parents=True, exist_ok=True)


def persisted(page, field):
    return page.evaluate('(key) => JSON.parse(localStorage.getItem(key))', PREFIX + field)


def attempts(page):
    return sum(v.get('attempts', 0) for v in (persisted(page, 'progress') or {}).values())


def load(page, frozen=False):
    if frozen:
        now = datetime(2026, 10, 29, 16, 0, tzinfo=timezone.utc)
        page.clock.install(time=now)
        page.clock.pause_at(now + timedelta(seconds=1))
    page.goto(BASE)
    expect(page.get_by_role('button', name='Comenzar sesión', exact=True)).to_be_visible()


def start(page, exam=False):
    page.locator('.session-option').filter(has=page.locator('input[value="10"]')).click()
    if exam:
        page.locator('.mode-options label').filter(has_text='Simulacro').click()
    page.get_by_role('button', name='Comenzar sesión', exact=True).click()
    expect(page.locator('.question-body h2')).to_be_visible()
    expect(page.locator('.timer-digits strong')).to_have_text('01:30')


def current(page):
    return BY_TEXT[page.locator('.question-body h2').inner_text()]


def choose(page, option_text):
    option = page.locator('.answer-option').filter(has=page.get_by_text(option_text, exact=True))
    expect(option).to_have_count(1)
    option.click()


def submit(page, double=False):
    button = page.get_by_role('button', name='Confirmar respuesta', exact=True)
    if double:
        button.evaluate('(button) => { button.click(); button.click(); }')
    else:
        button.click()
    expect(page.locator('.feedback')).to_be_visible()


def nav(page, name):
    page.locator('.nav-item').filter(has_text=name).click()


def test_landing(page):
    load(page)
    expect(page.locator('.overview-strip')).to_contain_text('200')
    expect(page.locator('.overview-strip')).to_contain_text('01:30')
    expect(page.locator('.sidebar-signature')).to_contain_text('developed by vizdiego')
    expect(page.locator('.topic-card')).to_have_count(7)
    pdf = page.request.get(BASE + 'source.pdf')
    assert pdf.ok and pdf.body().startswith(b'%PDF'), 'Original PDF must be accessible'
    sources = page.request.get(BASE + 'sources.html')
    assert sources.ok and b'OpenStax' in sources.body(), 'Sources page must be accessible'
    page.get_by_role('button', name='Ayuda', exact=True).click()
    dialog = page.get_by_role('dialog')
    expect(dialog).to_be_visible()
    page.keyboard.press('Shift+Tab')
    assert page.evaluate('document.querySelector("[role=dialog]").contains(document.activeElement)'), 'Dialog focus must remain inside'
    page.keyboard.press('Escape')
    expect(dialog).to_have_count(0)


def test_practice_pause_and_answers(page):
    load(page, frozen=True)
    start(page)
    first = current(page)
    page.clock.fast_forward(10_000)
    expect(page.locator('.timer-digits strong')).to_have_text('01:20')
    page.get_by_role('button', name='Pausar sesión', exact=True).click()
    expect(page.locator('.question-body')).to_have_count(0)
    expect(page.get_by_text(first['question'], exact=True)).to_have_count(0)
    expect(page.locator('.answer-option')).to_have_count(0)
    page.clock.fast_forward(300_000)
    expect(page.locator('.timer-digits strong')).to_have_text('01:20')
    page.get_by_role('button', name='Reanudar pregunta', exact=True).click()
    page.clock.fast_forward(1_000)
    expect(page.locator('.timer-digits strong')).to_have_text('01:19')
    nav(page, 'Banco de preguntas')
    page.clock.fast_forward(60_000)
    nav(page, 'Estudiar')
    expect(page.locator('.paused-question')).to_be_visible()
    expect(page.locator('.timer-digits strong')).to_have_text('01:19')
    page.get_by_role('button', name='Reanudar pregunta', exact=True).click()
    wrong = next(text for i, text in enumerate(first['options']) if i != first['correctIndex'])
    choose(page, wrong)
    submit(page, double=True)
    expect(page.locator('.feedback-title')).to_have_text('Una oportunidad para comprender')
    expect(page.locator('.official-answer')).to_contain_text(first['options'][first['correctIndex']])
    assert attempts(page) == 1, 'Double-submit must create one attempt'
    assert page.locator('.answer-options input:disabled').count() == 4
    page.clock.fast_forward(120_000)
    assert attempts(page) == 1, 'Answered question must not submit again on timeout'
    page.get_by_role('button', name='Siguiente pregunta', exact=True).click()
    expect(page.locator('.timer-digits strong')).to_have_text('01:30')
    second = current(page)
    assert second['id'] != first['id'], 'Session must not repeat a question'
    choose(page, second['options'][second['correctIndex']])
    submit(page, double=True)
    expect(page.locator('.feedback-title')).to_have_text('Respuesta correcta')
    assert attempts(page) == 2
    assert sum(r.get('correct', 0) for r in persisted(page, 'progress').values()) == 1


def test_timeout(page):
    load(page, frozen=True)
    start(page)
    page.clock.fast_forward(90_000)
    expect(page.locator('.timer-digits strong')).to_have_text('00:00')
    expect(page.locator('.feedback-title')).to_have_text('Tiempo agotado')
    assert attempts(page) == 1
    record = next(iter(persisted(page, 'progress').values()))
    assert record['correct'] == 0 and record['lastCorrect'] is False
    page.clock.fast_forward(60_000)
    assert attempts(page) == 1
    page.get_by_role('button', name='Siguiente pregunta', exact=True).click()
    expect(page.locator('.timer-digits strong')).to_have_text('01:30')


def test_bookmarks_library_reload(page):
    load(page)
    start(page)
    question = current(page)
    page.get_by_role('button', name='Guardar pregunta', exact=True).click()
    expect(page.get_by_role('button', name='Quitar de guardadas', exact=True)).to_have_attribute('aria-pressed', 'true')
    page.reload()
    expect(page.get_by_role('button', name='Comenzar sesión', exact=True)).to_be_visible()
    page.locator('.collection-link').filter(has_text='Preguntas guardadas').click()
    expect(page.locator('.library-card')).to_have_count(1)
    expect(page.locator('.library-card h3')).to_have_text(question['question'])
    nav(page, 'Banco de preguntas')
    expect(page.locator('.library-card')).to_have_count(200)
    topic = 'Antebrazo'
    page.get_by_role('combobox', name='Filtrar banco por tema').select_option(topic)
    expect(page.locator('.library-card')).to_have_count(sum(q['topic'] == topic for q in QUESTIONS))
    page.get_by_role('textbox', name='Buscar preguntas').fill('pulgar')
    expected = [q for q in QUESTIONS if q['topic'] == topic and 'pulgar' in ' '.join([q['question'], q['topic'], q['subtopic'], q['id']]).lower()]
    expect(page.locator('.library-card')).to_have_count(len(expected))
    assert expected, 'Search should exercise nonempty results'
    page.get_by_role('button', name='Limpiar búsqueda', exact=True).click()
    page.get_by_role('combobox', name='Filtrar banco por tema').select_option('Todos los temas')
    expect(page.locator('.library-card')).to_have_count(200)
    first_card = page.locator('.library-card').first
    expect(first_card.locator('.library-answer')).to_have_count(0)
    first_card.get_by_role('button', name='Ver respuesta', exact=True).click()
    expect(first_card.locator('.library-answer')).to_be_visible()
    expect(first_card.locator('.question-source')).to_have_attribute('href', __import__('re').compile(r'source\.pdf#page=\d+'))


def test_exam(page):
    load(page, frozen=True)
    start(page, exam=True)
    seen = set()
    for index in range(10):
        question = current(page)
        assert question['id'] not in seen
        seen.add(question['id'])
        chosen_index = question['correctIndex'] if index % 2 == 0 else (question['correctIndex'] + 1) % 4
        choose(page, question['options'][chosen_index])
        submit(page)
        expect(page.locator('.feedback-title')).to_have_text('Respuesta registrada')
        expect(page.locator('.official-answer')).to_have_count(0)
        expect(page.locator('.is-correct, .is-incorrect')).to_have_count(0)
        expect(page.locator('.session-mini-stats')).to_contain_text('Al finalizar')
        if index < 9:
            assert attempts(page) == 0, 'Simulacro must not expose results through stored progress before completion'
            expect(page.locator('.collection-link').filter(has_text='Volver a practicar').locator('small')).to_have_text('0')
        if index == 0:
            nav(page, 'Mi progreso')
            expect(page.locator('.metric-card').filter(has_text='Intentos registrados').locator('strong')).to_have_text('0')
            nav(page, 'Estudiar')
        page.get_by_role('button', name='Ver resultados' if index == 9 else 'Siguiente pregunta', exact=True).click()
    expect(page.locator('.results-view')).to_be_visible()
    assert attempts(page) == 10, 'All ten exam attempts must be recorded at completion'
    metrics = page.locator('.result-metrics')
    expect(metrics).to_contain_text('50')
    expect(page.locator('.review-item')).to_have_count(10)
    page.locator('.review-item summary').first.click()
    expect(page.locator('.review-content').first).to_contain_text('Respuesta correcta:')
    page.get_by_role('button', name='Repasar errores (5)', exact=True).click()
    expect(page.locator('.question-toolbar')).to_contain_text('de 5')
    assert current(page)['id'] in seen


def test_keyboard(page):
    load(page, frozen=True)
    start(page)
    page.locator('.answer-options input').first.focus()
    page.keyboard.press('3')
    expect(page.locator('.answer-options input').nth(2)).to_be_checked()
    page.keyboard.press('Enter')
    expect(page.locator('.feedback')).to_be_visible()
    assert attempts(page) == 1


def test_mobile(page):
    load(page)
    assert page.evaluate('document.documentElement.scrollWidth <= innerWidth + 1'), 'Mobile landing has horizontal overflow'
    page.get_by_role('button', name='Abrir menú', exact=True).click()
    expect(page.locator('.sidebar')).to_have_class(__import__('re').compile('mobile-open'))
    nav(page, 'Banco de preguntas')
    expect(page.locator('.library-card')).to_have_count(200)
    expect(page.locator('.sidebar')).not_to_have_class(__import__('re').compile('mobile-open'))
    assert page.evaluate('document.documentElement.scrollWidth <= innerWidth + 1'), 'Mobile library has horizontal overflow'
    page.locator('.library-card').first.get_by_role('button', name='Practicar', exact=True).click()
    expect(page.locator('.question-body')).to_be_visible()
    assert page.evaluate('document.documentElement.scrollWidth <= innerWidth + 1'), 'Mobile question has horizontal overflow'
    page.screenshot(path=str(ARTIFACTS / 'mobile-question.png'), full_page=True)


def test_corrupt_storage(page):
    page.add_init_script("""localStorage.setItem('morfo.uss.v1.bookmarks', '{}');localStorage.setItem('morfo.uss.v1.progress', '[]');""")
    load(page)
    expect(page.locator('.collection-link').filter(has_text='Preguntas guardadas').locator('small')).to_have_text('0')
    start(page)
    expect(page.get_by_role('button', name='Guardar pregunta', exact=True)).to_be_visible()


def main():
    tests = [test_landing, test_practice_pause_and_answers, test_timeout, test_bookmarks_library_reload, test_exam, test_keyboard, test_mobile, test_corrupt_storage]
    failures = []
    with sync_playwright() as playwright:
        browser = playwright.chromium.launch(executable_path=os.environ.get('CHROMIUM_PATH', '/usr/bin/chromium'), args=['--no-sandbox', '--disable-dev-shm-usage'])
        for test in tests:
            context = browser.new_context(viewport={'width': 390, 'height': 844} if test == test_mobile else {'width': 1440, 'height': 1000}, reduced_motion='reduce')
            page = context.new_page()
            page.set_default_timeout(10_000)
            errors = []
            page.on('pageerror', lambda error: errors.append(str(error)))
            try:
                test(page)
                assert not errors, f'Unexpected browser errors: {errors}'
                print(f'PASS {test.__name__}', flush=True)
            except Exception as error:
                failures.append({'test': test.__name__, 'error': str(error), 'browser_errors': errors})
                print(f'FAIL {test.__name__}: {error}', flush=True)
                traceback.print_exc()
                page.screenshot(path=str(ARTIFACTS / f'{test.__name__}-failure.png'), full_page=True)
            finally:
                context.close()
        browser.close()
    report = {'base_url': BASE, 'passed': len(tests) - len(failures), 'failed': len(failures), 'total': len(tests), 'failures': failures}
    (ARTIFACTS / 'results.json').write_text(json.dumps(report, ensure_ascii=False, indent=2))
    print(f"{report['passed']}/{len(tests)} browser scenarios passed; report: {ARTIFACTS / 'results.json'}")
    raise SystemExit(bool(failures))


if __name__ == '__main__':
    main()
