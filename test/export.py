"""Validate generated ZIP files and render standalone HTML with networking disabled.
The managed Chromium policy blocks file:// navigation; this test loads identical
HTML bytes into a blank page with a base URL instead. It does not claim a file://
end-to-end test on this machine.
"""
import os
from pathlib import Path
import zipfile
from playwright.sync_api import sync_playwright, expect
ROOT=Path(__file__).resolve().parents[1]
for name in ['Estudio-morfo-USS-portable.zip','Estudio-morfo-USS-web.zip']:
    with zipfile.ZipFile(ROOT/'releases'/name) as archive:
        assert archive.testzip() is None, f'Invalid ZIP: {name}'
        assert len(archive.infolist()) >= 3
    print(f'PASS: {name} integrity')
with sync_playwright() as p:
    browser=p.chromium.launch(executable_path=os.environ.get('CHROMIUM_PATH','/usr/bin/chromium'),headless=True,args=['--no-sandbox'])
    context=browser.new_context(offline=True,viewport={'width':1440,'height':1000})
    page=context.new_page()
    errors=[]
    page.on('pageerror',lambda e:errors.append(str(e)))
    html=(ROOT/'releases/Estudio-morfo-USS.html').read_text()
    page.set_content(html.replace('<head>','<head><base href="https://estudio-morfo.example/">'),wait_until='load')
    expect(page.get_by_role('button',name='Comenzar sesión',exact=True)).to_be_visible()
    page.get_by_role('button',name='Comenzar sesión',exact=True).click()
    expect(page.locator('.answer-option')).to_have_count(4)
    page.locator('.answer-option').first.click()
    page.get_by_role('button',name='Confirmar respuesta').click()
    expect(page.locator('.feedback')).to_be_visible()
    assert not errors, errors
    browser.close()
    print('PASS: self-contained HTML renders and grades with networking disabled')
