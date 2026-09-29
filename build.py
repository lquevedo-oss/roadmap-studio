from pathlib import Path
root=Path(__file__).parent
html=(root/'template.html').read_text(encoding='utf-8')
css=['brand/fonts.css','styles.css','premium.css','rebrand.css','transitions-recipes.css','transitions.css','quarter-board.css','profile.css']
js=['data.js','app.js','motion.js','transitions.js','profile.js']
html=html.replace('{{CSS}}','\n'.join((root/p).read_text(encoding='utf-8') for p in css))
html=html.replace('{{SCRIPT}}','\n'.join((root/p).read_text(encoding='utf-8') for p in js))
html=html.replace('{{LOGO}}','assets/logo.svg').replace('{{PLATFORM}}','assets/platform.svg')
(root/'index.html').write_text(html,encoding='utf-8')
print('Built index.html with synthetic data')
