"""New exam: separate classes, 140 complete answers, immediate feedback and preserved progress."""
import json,os,re
from pathlib import Path
from datetime import datetime,timedelta,timezone
from playwright.sync_api import sync_playwright,expect
ROOT=Path(__file__).resolve().parents[1]
BASE=os.environ.get('MORFO_BASE_URL','http://127.0.0.1:5173').rstrip('/')+'/'
BANK=json.loads((ROOT/'public/data/proxima-prueba.json').read_text())
BY_TEXT={q['question']:q for q in BANK}
OUT=ROOT/'test-results'/'next-exam';OUT.mkdir(parents=True,exist_ok=True)
CASES=[('blood12','sangre','Histología de sangre'),('vascular12','vascular','Organización vascular')]
def load(page,suffix=''):
 now=datetime(2026,11,14,20,0,tzinfo=timezone.utc)
 page.clock.install(time=now);page.clock.pause_at(now+timedelta(seconds=1))
 page.goto(BASE+'#proxima-prueba'+suffix)
 expect(page.locator('.page-heading h1')).to_be_visible()
def stored(page,source,key):return page.evaluate('(key)=>JSON.parse(localStorage.getItem(key))',f'morfo.uss.{source}.v1.'+key)
def test_hub_and_libraries(page):
 load(page)
 expect(page.locator('.page-heading h1')).to_have_text('Próxima prueba')
 expect(page.locator('.class-subsection-card')).to_have_count(2)
 expect(page.get_by_role('button',name='Comenzar sesión',exact=True)).to_have_count(0)
 for source,suffix,title in CASES:
  page.get_by_role('button',name='Estudiar sangre' if source=='blood12' else 'Estudiar organización vascular',exact=True).click()
  expect(page.locator('.page-heading h1')).to_contain_text(title)
  expect(page.locator('.overview-strip')).to_contain_text('70')
  expect(page.locator('.overview-strip')).to_contain_text('02:00')
  expect(page.locator('.topic-card')).to_have_count(4)
  expect(page.locator('input[name=session-size][value="70"]')).to_be_checked()
  expect(page.locator('.mode-options')).to_have_count(0)
  expect(page.locator('.histoembrio-documents a')).to_have_attribute('href',BASE+f'source-{source}.pdf')
  page.get_by_role('button',name='Banco de preguntas',exact=False).click()
  expect(page.locator('.library-card')).to_have_count(70)
  assert all(BY_TEXT[t]['sourceId']==source for t in page.locator('.library-card h3').all_inner_texts())
  page.get_by_role('button',name='Próxima prueba',exact=False).click()
 page.screenshot(path=str(OUT/'new-exam-hub.png'),full_page=True)
def test_independent_saved_sessions(page):
 load(page,'-sangre')
 page.get_by_role('button',name='Practicar 70 preguntas',exact=True).click()
 text=page.locator('.question-body h2').inner_text()
 page.locator('.answer-option').nth(2).click();page.clock.fast_forward(10000)
 page.get_by_role('button',name='Clase AN12 · Organización vascular',exact=False).click()
 page.get_by_role('button',name='Practicar 70 preguntas',exact=True).click()
 expect(page.locator('.timer-digits strong')).to_have_text('02:00')
 assert BY_TEXT[page.locator('.question-body h2').inner_text()]['sourceId']=='vascular12'
 page.get_by_role('button',name='Clase 12 HE · Histología de sangre',exact=False).click()
 page.get_by_role('button',name='Retomar sesión',exact=True).click()
 expect(page.locator('.timer-digits strong')).to_have_text('01:50')
 page.get_by_role('button',name='Reanudar pregunta',exact=True).click()
 expect(page.locator('.question-body h2')).to_have_text(text)
 expect(page.locator('.answer-options input').nth(2)).to_be_checked()
 page.reload();page.get_by_role('button',name='Retomar sesión',exact=True).click()
 expect(page.locator('.timer-digits strong')).to_have_text('01:50')
 assert len(stored(page,'blood12','session')['ids'])==70
 assert len(stored(page,'vascular12','session')['ids'])==70
 assert page.evaluate('localStorage.getItem("morfo.uss.histo10.v1.session")') is None

def full_class(page,case):
 source,suffix,title=case
 load(page,'-'+suffix)
 page.get_by_role('button',name='Practicar 70 preguntas',exact=True).click()
 seen=set()
 for i in range(70):
  q=BY_TEXT[page.locator('.question-body h2').inner_text()]
  assert q['sourceId']==source and q['id'] not in seen
  seen.add(q['id'])
  expect(page.locator('.answer-option')).to_have_count(4)
  expect(page.locator('.question-subtopic')).to_have_count(0)
  if i==0:
   page.clock.fast_forward(119000);expect(page.locator('.feedback')).to_have_count(0)
   page.clock.fast_forward(1000);expect(page.locator('.feedback-title')).to_have_text('Tiempo agotado')
  else:
   index=q['correctIndex'] if i%2==0 else (q['correctIndex']+1)%4
   page.locator('.answer-option').nth(index).click()
   page.get_by_role('button',name='Confirmar respuesta',exact=True).click()
  expect(page.locator('.official-answer')).to_contain_text(q['options'][q['correctIndex']])
  expect(page.locator('.feedback')).to_contain_text(q['explanation'])
  expect(page.locator('.question-source')).to_have_attribute('href',BASE+f'source-{source}.pdf#page='+str(q['sourcePages'][0]))
  expect(page.locator('.answer-option.is-correct')).to_have_count(1)
  assert sum(r['attempts'] for r in stored(page,source,'progress').values())==i+1
  page.get_by_role('button',name='Ver resultados' if i==69 else 'Siguiente pregunta',exact=True).click()
 expect(page.locator('.review-item')).to_have_count(70)
 assert sum(r['correct'] for r in stored(page,source,'progress').values())==34
 assert stored(page,source,'history')[0]['questionCount']==70
 other='vascular12' if source=='blood12' else 'blood12'
 assert stored(page,other,'progress') is None
 page.get_by_role('button',name='Repasar errores (36)',exact=True).click()
 expect(page.locator('.timer-digits strong')).to_have_text('02:00')

def mobile(page):
 load(page)
 assert page.evaluate('document.documentElement.scrollWidth<=innerWidth')
 page.get_by_role('button',name='Estudiar organización vascular',exact=True).click()
 assert page.evaluate('document.documentElement.scrollWidth<=innerWidth')
 page.get_by_role('button',name='Practicar 70 preguntas',exact=True).click()
 q=BY_TEXT[page.locator('.question-body h2').inner_text()]
 page.locator('.answer-option').nth(q['correctIndex']).click()
 page.get_by_role('button',name='Confirmar respuesta',exact=True).click()
 expect(page.locator('.official-answer')).to_be_visible()
 assert page.evaluate('document.documentElement.scrollWidth<=innerWidth')
 page.screenshot(path=str(OUT/f'vascular-feedback-{page.viewport_size["width"]}.png'),full_page=True)
 page.get_by_role('button',name='Abrir menú',exact=True).click()
 page.get_by_role('button',name='Clase 12 HE · Histología de sangre',exact=False).click()
 expect(page.locator('.page-heading h1')).to_contain_text('Histología de sangre')

if __name__=='__main__':
 with sync_playwright() as p:
  browser=p.chromium.launch(executable_path='/usr/bin/chromium',args=['--no-sandbox','--disable-dev-shm-usage'])
  checks=[(test_hub_and_libraries,1440),(test_independent_saved_sessions,1440),(lambda page:full_class(page,CASES[0]),1440),(lambda page:full_class(page,CASES[1]),1440),(mobile,390),(mobile,320)]
  for i,(check,width) in enumerate(checks):
   context=browser.new_context(viewport={'width':width,'height':900},reduced_motion='reduce')
   page=context.new_page();errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
   try:
    check(page);assert not errors,errors
    print('PASS',i,check.__name__,width,flush=True)
   except Exception:
    page.screenshot(path=str(OUT/f'failure-{i}.png'),full_page=True);raise
   finally:context.close()
  browser.close()
