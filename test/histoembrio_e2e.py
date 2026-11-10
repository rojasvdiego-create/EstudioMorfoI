"""Class 10/11 subsections: isolated 100-question practice sessions, migration and nested navigation."""
import json,os
from datetime import datetime,timedelta,timezone
from pathlib import Path
from playwright.sync_api import sync_playwright,expect
ROOT=Path(__file__).resolve().parents[1]
BASE=os.environ.get('MORFO_BASE_URL','http://127.0.0.1:5173').rstrip('/')+'/'
OUT=ROOT/'test-results'/'histoembrio';OUT.mkdir(parents=True,exist_ok=True)
BANK=json.loads((ROOT/'public/data/histoembrio.json').read_text())
BY_TEXT={q['question']:q for q in BANK}
CASES=[('histo10','histo','10','Histología',3),('embrio11','embrio','11','Embriología',4)]

def load(page,number=None):
 now=datetime(2026,11,9,18,0,tzinfo=timezone.utc)
 page.clock.install(time=now);page.clock.pause_at(now+timedelta(seconds=1))
 page.goto(BASE+('#histo-embrio' if number is None else f'#histo-embrio-clase-{number}'))
 expect(page.locator('.page-heading h1')).to_be_visible()

def stored(page,key,prefix):
 return page.evaluate('(key)=>JSON.parse(localStorage.getItem(key))',prefix+key)

def test_parent_and_libraries(page):
 load(page)
 expect(page.locator('.class-subsection-card')).to_have_count(2)
 expect(page.get_by_role('button',name='Practicar 200 preguntas',exact=True)).to_have_count(0)
 expect(page.get_by_role('button',name='Comenzar sesión',exact=True)).to_have_count(0)
 page.screenshot(path=str(OUT/'subsecciones-desktop.png'),full_page=True)
 for section,source,number,name,topics in CASES:
  page.get_by_role('button',name=f'Estudiar Clase {number}',exact=True).click()
  expect(page.locator('.page-heading h1')).to_have_text(f'Clase {number} · {name}')
  assert page.url.endswith(f'#histo-embrio-clase-{number}')
  expect(page.locator('.overview-strip')).to_contain_text('100')
  expect(page.locator('.overview-strip')).to_contain_text('02:00')
  expect(page.locator('.topic-card')).to_have_count(topics)
  expect(page.locator('.histoembrio-documents a')).to_have_count(1)
  expect(page.locator('.histoembrio-documents a')).to_have_attribute('href',BASE+f'source-{source}.pdf')
  expect(page.locator('input[name=session-size][value="100"]')).to_be_checked()
  expect(page.locator('input[name=session-size][value="50"]')).not_to_be_checked()
  expect(page.locator('.mode-options')).to_have_count(0)
  expect(page.locator('.immediate-feedback-note')).to_contain_text('Corrección inmediata')
  page.get_by_role('button',name='Banco de preguntas',exact=False).click()
  expect(page.locator('.library-card')).to_have_count(100)
  texts=page.locator('.library-card h3').all_inner_texts()
  assert all(BY_TEXT[text]['sourceId']==source for text in texts)
  first=page.locator('.library-card').first
  first.get_by_role('button',name='Ver respuesta',exact=True).click()
  expect(first.locator('.question-source')).to_contain_text('Clase '+number)
  expect(first.locator('.question-source')).to_have_attribute('href',__import__('re').compile(f'source-{source}.pdf#page='))
  page.get_by_role('button',name='histo-embrio',exact=False).click()
  expect(page.locator('.class-subsection-card')).to_have_count(2)

def test_previous_progress_and_session_are_preserved(page):
 legacy='morfo.uss.histoembrio.v1.'
 progress={'q001':{'attempts':2,'correct':1,'lastCorrect':True,'streak':1,'lastReviewed':1000,'nextReview':2000},'q051':{'attempts':1,'correct':0,'lastCorrect':False,'streak':0,'lastReviewed':1000,'nextReview':1000}}
 saved={'version':1,'bankVersion':'morfo300-v1','duration':120,'id':'legacy-mixed','ids':['q001','q051'],'index':0,'answers':[],'mode':'exam','startedAt':1000,'timeLeft':110000,'selected':None,'progressApplied':False}
 payload={'progress':progress,'bookmarks':['q001','q051'],'goal':30,'session':saved}
 page.add_init_script('const legacy='+json.dumps(payload)+'; for(const [key,value] of Object.entries(legacy))localStorage.setItem('+json.dumps(legacy)+'+key,JSON.stringify(value));')
 load(page)
 for section,source,number,name,topics in CASES:
  page.get_by_role('button',name=f'Estudiar Clase {number}',exact=True).click()
  prefix=f'morfo.uss.{section}.v1.'
  expected='q001' if source=='histo' else 'q051'
  assert stored(page,'progress',prefix)=={expected:progress[expected]}
  assert stored(page,'bookmarks',prefix)==[expected]
  assert stored(page,'goal',prefix)==30
  assert stored(page,'progress',legacy)==progress
  assert stored(page,'session',legacy)==saved
  page.get_by_role('button',name='histo-embrio',exact=False).click()
 page.get_by_role('button',name='Retomar sesión anterior',exact=True).click()
 expect(page.locator('.timer-digits strong')).to_have_text('01:50')
 page.get_by_role('button',name='Reanudar pregunta',exact=True).click()
 expect(page.locator('.question-body h2')).to_have_text(BANK[0]['question'])

def test_independent_pause_and_resume(page):
 load(page,'10')
 page.get_by_role('button',name='Practicar 100 preguntas',exact=True).click()
 first=page.locator('.question-body h2').inner_text()
 page.locator('.answer-option').nth(2).click()
 page.clock.fast_forward(10_000)
 page.get_by_role('button',name='Clase 11 · Embriología',exact=False).click()
 page.get_by_role('button',name='Practicar 100 preguntas',exact=True).click()
 expect(page.locator('.timer-digits strong')).to_have_text('02:00')
 assert BY_TEXT[page.locator('.question-body h2').inner_text()]['sourceId']=='embrio'
 page.get_by_role('button',name='Clase 10 · Histología',exact=False).click()
 page.get_by_role('button',name='Retomar sesión',exact=True).click()
 expect(page.locator('.timer-digits strong')).to_have_text('01:50')
 page.get_by_role('button',name='Reanudar pregunta',exact=True).click()
 expect(page.locator('.question-body h2')).to_have_text(first)
 expect(page.locator('.answer-options input').nth(2)).to_be_checked()
 page.reload()
 page.get_by_role('button',name='Retomar sesión',exact=True).click()
 expect(page.locator('.timer-digits strong')).to_have_text('01:50')
 for section,source,number,name,topics in CASES:
  snap=stored(page,'session',f'morfo.uss.{section}.v1.')
  assert len(snap['ids'])==100
  assert all(next(q for q in BANK if q['id']==id)['sourceId']==source for id in snap['ids'])

def test_full_class_exam(page,case):
 section,source,number,name,topics=case
 prefix=f'morfo.uss.{section}.v1.'
 load(page,number)
 page.get_by_role('button',name='Practicar 100 preguntas',exact=True).click()
 seen=set()
 for i in range(100):
  q=BY_TEXT[page.locator('.question-body h2').inner_text()]
  assert q['sourceId']==source and q['id'] not in seen
  seen.add(q['id'])
  if i==0:
   page.clock.fast_forward(119000)
   expect(page.locator('.feedback')).to_have_count(0)
   page.clock.fast_forward(1000)
   expect(page.locator('.feedback-title')).to_have_text('Tiempo agotado')
  else:
   selected=q['correctIndex'] if i%2==0 else (q['correctIndex']+1)%4
   page.locator('.answer-option').nth(selected).click()
   page.get_by_role('button',name='Confirmar respuesta',exact=True).click()
  expect(page.locator('.official-answer')).to_be_visible()
  expect(page.locator('.official-answer')).to_contain_text(q['options'][q['correctIndex']])
  expect(page.locator('.feedback')).to_contain_text(q['explanation'])
  expect(page.locator('.answer-option.is-correct')).to_have_count(1)
  progress=stored(page,'progress',prefix)
  assert sum(r['attempts'] for r in progress.values())==i+1
  page.get_by_role('button',name='Ver resultados' if i==99 else 'Siguiente pregunta',exact=True).click()
 expect(page.locator('.review-item')).to_have_count(100)
 progress=stored(page,'progress',prefix)
 assert len(progress)==100 and sum(r['correct'] for r in progress.values())==49
 assert stored(page,'history',prefix)[0]['questionCount']==100
 assert len([id for id in seen if int(id[1:])>100])==50
 assert stored(page,'history',prefix)[0]['mode']=='practice'
 links=page.locator('.review-content .question-source').evaluate_all('(nodes)=>nodes.map(a=>a.href)')
 assert len(links)==100 and all(f'source-{source}.pdf#page=' in link for link in links)
 other='embrio11' if section=='histo10' else 'histo10'
 assert stored(page,'progress',f'morfo.uss.{other}.v1.') is None
 page.get_by_role('button',name='Repasar errores (51)',exact=True).click()
 expect(page.locator('.timer-digits strong')).to_have_text('02:00')

def test_saved_exam_shows_solutions_once(page):
 prefix='morfo.uss.histo10.v1.'
 q=next(q for q in BANK if q['id']=='q001')
 progress={'q001':{'attempts':2,'correct':1,'lastCorrect':True,'streak':1,'lastReviewed':1000,'nextReview':2000}}
 saved={'version':1,'bankVersion':'morfo300-v1','duration':120,'id':'old-class10-exam','ids':[f'q{n:03}' for n in range(1,51)],'index':0,'answers':[{'id':'q001','selected':q['correctIndex'],'correct':False,'timeout':False}],'mode':'exam','startedAt':1000,'timeLeft':85000,'selected':q['correctIndex'],'progressApplied':False}
 page.add_init_script('if(!localStorage.getItem('+json.dumps(prefix+'progress')+')) {localStorage.setItem('+json.dumps(prefix+'progress')+','+json.dumps(json.dumps(progress))+'); localStorage.setItem('+json.dumps(prefix+'session')+','+json.dumps(json.dumps(saved))+');}')
 load(page,'10')
 page.get_by_role('button',name='Retomar sesión',exact=True).click()
 expect(page.locator('.official-answer')).to_contain_text(q['options'][q['correctIndex']])
 expect(page.locator('.feedback')).to_contain_text(q['explanation'])
 expect(page.locator('.timer-digits strong')).to_have_text('01:25')
 assert stored(page,'progress',prefix)['q001']['attempts']==3
 assert stored(page,'session',prefix)['mode']=='practice'
 page.reload()
 page.get_by_role('button',name='Retomar sesión',exact=True).click()
 expect(page.locator('.official-answer')).to_be_visible()
 assert stored(page,'progress',prefix)['q001']['attempts']==3, 'Old answers applied only once'
 page.get_by_role('button',name='Siguiente pregunta',exact=True).click()
 expect(page.locator('.timer-digits strong')).to_have_text('02:00')
 second=BY_TEXT[page.locator('.question-body h2').inner_text()]
 wrong=(second['correctIndex']+1)%4
 page.locator('.answer-option').nth(wrong).click()
 page.get_by_role('button',name='Confirmar respuesta',exact=True).click()
 expect(page.locator('.official-answer')).to_contain_text(second['options'][second['correctIndex']])
 assert stored(page,'progress',prefix)[second['id']]['attempts']==1

def test_mobile(page):
 load(page)
 assert page.evaluate('document.documentElement.scrollWidth<=innerWidth')
 page.screenshot(path=str(OUT/f'subsecciones-{page.viewport_size["width"]}.png'),full_page=True)
 page.get_by_role('button',name='Estudiar Clase 11',exact=True).click()
 assert page.evaluate('document.documentElement.scrollWidth<=innerWidth')
 page.get_by_role('button',name='Abrir menú',exact=True).click()
 page.get_by_role('button',name='Clase 10 · Histología',exact=False).click()
 expect(page.locator('.page-heading h1')).to_have_text('Clase 10 · Histología')
 page.get_by_role('button',name='Practicar 100 preguntas',exact=True).click()
 expect(page.locator('.timer-digits strong')).to_have_text('02:00')
 assert page.evaluate('document.documentElement.scrollWidth<=innerWidth')

if __name__=='__main__':
 with sync_playwright() as p:
  browser=p.chromium.launch(executable_path=os.environ.get('CHROMIUM_PATH','/usr/bin/chromium'),args=['--no-sandbox','--disable-dev-shm-usage'])
  tests=[(test_parent_and_libraries,1440),(test_previous_progress_and_session_are_preserved,1440),(test_independent_pause_and_resume,1440),(lambda page:test_full_class_exam(page,CASES[0]),1440),(lambda page:test_full_class_exam(page,CASES[1]),1440),(test_saved_exam_shows_solutions_once,1440),(test_mobile,390),(test_mobile,320)]
  for i,(check,width) in enumerate(tests):
   ctx=browser.new_context(viewport={'width':width,'height':1000 if width>700 else 844},reduced_motion='reduce')
   page=ctx.new_page();errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
   try:
    check(page);assert not errors,errors
    print('PASS',i,check.__name__,width,flush=True)
   except Exception:
    page.screenshot(path=str(OUT/f'failure-subsections-{i}-{width}.png'),full_page=True);raise
   finally:ctx.close()
  browser.close()
