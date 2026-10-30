"""Browser acceptance tests for U San Esteban's learning workflow."""
import json
import os
import traceback
from pathlib import Path
from playwright.sync_api import sync_playwright, expect
from e2e import BASE, PREFIX, ARTIFACTS, load, start, current, choose, submit, nav, persisted, attempts


def test_dashboard_goal_and_recommendation(page):
    page.add_init_script("""localStorage.setItem('morfo.uss.v1.progress',JSON.stringify({q001:{attempts:3,correct:1,lastCorrect:false,nextReview:0},q002:{attempts:1,correct:1,lastCorrect:true,nextReview:1}}));""")
    load(page, frozen=True)
    expect(page).to_have_title('U San Esteban — developed by vizdiego')
    expect(page.get_by_role('heading',name='U San Esteban',exact=True)).to_be_visible()
    expect(page.locator('.learning-dashboard')).to_be_visible()
    expect(page.locator('.goal-ring')).to_have_attribute('aria-valuetext','0 de 20 intentos hoy')
    expect(page.locator('.insight-topic-button')).to_have_count(1)
    page.get_by_role('combobox',name='Meta diaria de intentos').select_option('30')
    page.reload()
    expect(page.get_by_role('combobox',name='Meta diaria de intentos')).to_have_value('30')
    page.get_by_role('button',name='Iniciar repaso recomendado',exact=True).click()
    expect(page.locator('.question-body h2')).to_be_visible()
    saved=persisted(page,'session')
    assert len(saved['ids'])==20 and len(set(saved['ids']))==20
    assert {'q001','q002'}.issubset(saved['ids']), 'Recommended selection must include overdue and wrong questions'
    assert persisted(page,'goal')==30


def test_resume_practice_exact_clock_and_selection(page):
    load(page, frozen=True)
    page.get_by_role('combobox',name='Formato de preguntas',exact=True).select_option('text')
    start(page)
    question=current(page)
    choose(page,question['options'][2])
    page.clock.fast_forward(12_345)
    page.reload()
    expect(page.get_by_role('button',name='Retomar sesión',exact=True)).to_be_visible()
    saved=persisted(page,'session')
    assert saved['selected']==2 and saved['timeLeft']==77_655, saved
    page.clock.fast_forward(120_000)
    page.get_by_role('button',name='Retomar sesión',exact=True).click()
    expect(page.locator('.paused-question')).to_be_visible()
    assert persisted(page,'session')['timeLeft']==77_655
    page.get_by_role('button',name='Reanudar pregunta',exact=True).click()
    assert current(page)['id']==question['id']
    expect(page.locator('.answer-options input').nth(2)).to_be_checked()
    page.clock.fast_forward(1_000)
    expect(page.locator('.timer-digits strong')).to_have_text('01:17')
    submit(page, double=True)
    assert attempts(page)==1
    assert sum(persisted(page,'activity').values())==1
    page.reload()
    page.get_by_role('button',name='Retomar sesión',exact=True).click()
    expect(page.locator('.feedback')).to_be_visible()
    assert attempts(page)==1, 'Restoring feedback must not submit the same answer twice'
    page.get_by_role('button',name='Siguiente pregunta',exact=True).click()
    assert current(page)['id']!=question['id']
    expect(page.locator('.timer-digits strong')).to_have_text('01:30')


def test_resume_exam_and_history_once(page):
    load(page, frozen=True)
    page.get_by_role('combobox',name='Formato de preguntas',exact=True).select_option('text')
    start(page,exam=True)
    question=current(page)
    choose(page,question['options'][(question['correctIndex']+1)%4]);submit(page)
    page.get_by_role('button',name='Siguiente pregunta',exact=True).click()
    second=current(page)['id']
    page.clock.fast_forward(4_000);page.reload()
    expect(page.get_by_role('button',name='Retomar sesión',exact=True)).to_be_visible()
    assert attempts(page)==0
    page.get_by_role('button',name='Retomar sesión',exact=True).click()
    page.get_by_role('button',name='Reanudar pregunta',exact=True).click()
    assert current(page)['id']==second
    expect(page.locator('.timer-digits strong')).to_have_text('01:26')
    for index in range(1,10):
        question=current(page);choose(page,question['options'][question['correctIndex']]);submit(page)
        assert attempts(page)==0
        page.get_by_role('button',name='Ver resultados' if index==9 else 'Siguiente pregunta',exact=True).click()
    assert attempts(page)==10
    history=persisted(page,'history')
    assert len(history)==1 and history[0]['correct']==9 and history[0]['accuracy']==90
    assert sum(persisted(page,'activity').values())==10
    assert persisted(page,'session') is None
    page.reload()
    expect(page.locator('.resume-study-card')).to_have_count(0)
    expect(page.locator('.learning-history-item')).to_have_count(1)
    assert attempts(page)==10 and len(persisted(page,'history'))==1


def test_backup_download_validate_confirm_restore(page):
    page.add_init_script("""if(!localStorage.getItem('seeded')){localStorage.setItem('morfo.uss.v1.progress',JSON.stringify({q001:{attempts:2,correct:1,lastCorrect:true,nextReview:9999999999999}}));localStorage.setItem('morfo.uss.v1.bookmarks',JSON.stringify(['q001']));localStorage.setItem('seeded','1');}""")
    load(page, frozen=True)
    page.get_by_role('combobox',name='Meta diaria de intentos').select_option('30')
    with page.expect_download() as download_info:page.get_by_role('button',name='Descargar progreso',exact=True).click()
    download=download_info.value;download.save_as(str(ARTIFACTS/'progress-backup.json'))
    backup=json.loads((ARTIFACTS/'progress-backup.json').read_text())
    assert download.suggested_filename.startswith('U-San-Esteban-progreso-')
    assert backup['format']=='u-san-esteban-progress' and backup['goal']==30
    assert backup['progress']['q001']['attempts']==2 and backup['bookmarks']==['q001']
    upload=page.locator('input[aria-label="Archivo de progreso"]')
    invalid=dict(backup);invalid['bookmarks']=['q999']
    upload.set_input_files({'name':'bad.json','mimeType':'application/json','buffer':json.dumps(invalid).encode()})
    expect(page.locator('.toast')).to_contain_text('no es válida')
    expect(page.get_by_role('dialog')).to_have_count(0)
    assert persisted(page,'progress')['q001']['attempts']==2
    backup['progress']={'q001':{'attempts':5,'correct':2,'lastCorrect':False,'streak':0,'lastReviewed':0,'nextReview':0}}
    backup['bookmarks']=['q002'];backup['goal']=50;backup['activity']={'2026-10-29':7}
    payload={'name':'valid.json','mimeType':'application/json','buffer':json.dumps(backup).encode()}
    upload.set_input_files(payload)
    dialog=page.get_by_role('dialog',name='¿Restaurar esta copia de progreso?',exact=True)
    expect(dialog).to_be_visible()
    assert persisted(page,'progress')['q001']['attempts']==2
    dialog.get_by_role('button',name='Conservar mis datos',exact=True).click()
    assert persisted(page,'progress')['q001']['attempts']==2
    upload.set_input_files(payload);expect(dialog).to_be_visible()
    dialog.get_by_role('button',name='Restaurar esta copia',exact=True).click()
    expect(page.locator('.metric-card').filter(has_text='Intentos registrados').locator('strong')).to_have_text('5')
    assert persisted(page,'bookmarks')==['q002'] and persisted(page,'goal')==50
    assert persisted(page,'session') is None
    page.reload();expect(page.get_by_role('combobox',name='Meta diaria de intentos')).to_have_value('50')
    expect(page.locator('.goal-ring')).to_have_attribute('aria-valuetext','7 de 50 intentos hoy')


def test_saved_session_replacement_confirmation(page):
    load(page,frozen=True);start(page)
    original=persisted(page,'session')['id']
    page.reload();expect(page.get_by_role('button',name='Retomar sesión',exact=True)).to_be_visible()
    page.get_by_role('button',name='Comenzar sesión',exact=True).click()
    dialog=page.get_by_role('dialog',name='Tienes una sesión sin terminar.',exact=True)
    expect(dialog).to_be_visible()
    assert persisted(page,'session')['id']==original
    dialog.get_by_role('button',name='Volver',exact=True).click()
    page.get_by_role('button',name='Comenzar sesión',exact=True).click()
    dialog.get_by_role('button',name='Iniciar otra sesión',exact=True).click()
    expect(page.locator('.question-body h2')).to_be_visible()
    assert persisted(page,'session')['id']!=original



def test_configure_review_preserves_pending_exam(page):
    page.add_init_script("""localStorage.setItem('morfo.uss.v1.progress',JSON.stringify({q001:{attempts:1,correct:0,lastCorrect:false,nextReview:0}}));""")
    load(page,frozen=True)
    page.get_by_role('combobox',name='Formato de preguntas',exact=True).select_option('text')
    start(page,exam=True)
    question=current(page);choose(page,question['options'][0]);submit(page)
    original=persisted(page,'session')['id']
    assert attempts(page)==1
    nav(page,'Mi progreso')
    page.get_by_role('button',name='Repasar pendientes (1)',exact=True).click()
    expect(page.locator('.resume-study-card')).to_be_visible()
    assert persisted(page,'session')['id']==original and attempts(page)==1
    page.get_by_role('button',name='Comenzar sesión',exact=True).click()
    expect(page.get_by_role('dialog',name='Tienes una sesión sin terminar.',exact=True)).to_be_visible()
    assert persisted(page,'session')['id']==original and attempts(page)==1


def test_library_replacement_requires_confirmation(page):
    load(page,frozen=True);start(page)
    original=persisted(page,'session')['id']
    nav(page,'Banco de preguntas')
    page.locator('.library-card').first.get_by_role('button',name='Practicar',exact=True).click()
    dialog=page.get_by_role('dialog',name='Tienes una sesión sin terminar.',exact=True)
    expect(dialog).to_be_visible()
    assert persisted(page,'session')['id']==original
    dialog.get_by_role('button',name='Volver',exact=True).click()
    nav(page,'Estudiar');expect(page.locator('.paused-question')).to_be_visible()
    assert persisted(page,'session')['id']==original


def test_dashboard_mobile(page):
    load(page)
    for width in [390,320]:
        page.set_viewport_size({'width':width,'height':900})
        assert page.evaluate('document.documentElement.scrollWidth<=innerWidth+1'), f'Dashboard overflow at{width}'
        expect(page.get_by_role('combobox',name='Meta diaria de intentos')).to_be_visible()
    page.screenshot(path=str(ARTIFACTS/'san-esteban-mobile.png'),full_page=True)


def main():
    tests=[test_dashboard_goal_and_recommendation,test_resume_practice_exact_clock_and_selection,test_resume_exam_and_history_once,test_backup_download_validate_confirm_restore,test_saved_session_replacement_confirmation,test_configure_review_preserves_pending_exam,test_library_replacement_requires_confirmation,test_dashboard_mobile]
    failures=[]
    with sync_playwright() as p:
        browser=p.chromium.launch(executable_path=os.environ.get('CHROMIUM_PATH','/usr/bin/chromium'),args=['--no-sandbox','--disable-dev-shm-usage'])
        for test in tests:
            context=browser.new_context(viewport={'width':390,'height':900} if test==test_dashboard_mobile else {'width':1440,'height':1000},reduced_motion='reduce')
            page=context.new_page();page.set_default_timeout(10_000);errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
            try:
                test(page);assert not errors,errors;print('PASS',test.__name__,flush=True)
            except Exception as error:
                failures.append({'test':test.__name__,'error':str(error),'browser_errors':errors});traceback.print_exc();print('FAIL',test.__name__,flush=True)
                page.screenshot(path=str(ARTIFACTS/(test.__name__+'-failure.png')),full_page=True)
            finally:context.close()
        browser.close()
    report={'passed':len(tests)-len(failures),'failed':len(failures),'total':len(tests),'failures':failures}
    (ARTIFACTS/'platform-results.json').write_text(json.dumps(report,ensure_ascii=False,indent=2))
    print(f"{report['passed']}/{report['total']} platform scenarios passed")
    raise SystemExit(bool(failures))

if __name__=='__main__':main()
