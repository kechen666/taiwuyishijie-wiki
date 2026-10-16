"""Compile the collected guide snapshot; output stays in this external project."""
import json
import re
from pathlib import Path

project = Path(__file__).resolve().parent
app = project / 'app' if (project / 'app').is_dir() else project
data = json.loads((project / 'guide-source.json').read_text(encoding='utf-8'))
def reader_text(value):
    def replacement(match):
        function = match[1].lower()
        return '【动态伤害】' if 'damage' in function else '【动态冷却】' if 'cooldown' in function else '【动态数值】'
    return re.sub(r'【动态值：([^】]+)】', replacement, value).replace('【动态伤害，需运行时计算】', '【动态伤害】')

for collection in ['characterTraits', 'companionSkills', 'items']:
    for item in data[collection]:
        item['desc'] = reader_text(item['desc'])
for stage in [s for c in data['companions'] for s in c['stages']] + data['specialCompanions']:
    stage['passive'] = reader_text(stage['passive'])
# A special summon reusing a normal family's portrait does not invalidate that
# normal portrait; only sharing between normal families suppresses its display.
owners = {}
for family in data['companions']:
    for stage in family['stages']:
        if stage.get('sourceIcon'):
            owners.setdefault(stage['sourceIcon'], set()).add(family['id'])
for family in data['companions']:
    for stage in family['stages']:
        shared = len(owners.get(stage.get('sourceIcon'), set())) > 1
        stage['sharedPortrait'] = shared
        stage['icon'] = None if shared else stage.get('sourceIcon')
        if not shared:
            stage['notes'] = ['该头像另有特殊召唤配置复用；此处按普通灵侍的精确资源字段展示。'
                if note.startswith('所选头像在源配置中') else note for note in stage['notes']]
    family['icon'] = family['stages'][0]['icon']
    family['sharedPortrait'] = family['stages'][0]['sharedPortrait']
    family['notes'] = family['stages'][0]['notes']
for name in ['heroes', 'characterTraits', 'companions', 'companionSkills', 'specialCompanions', 'items']:
    assert len({r['id'] for r in data[name]}) == len(data[name]), name
    assert all(re.fullmatch(r'[A-Za-z0-9_:.\-]+', r['id']) for r in data[name]), name
for family in data['companions']:
    assert all(re.fullmatch(r'[A-Za-z0-9_:.\-]+', s['id']) for s in family['stages'])
for item in data['characterTraits'] + data['companionSkills'] + data['items']:
    if item.get('icon'):
        target = (app / item['icon']).resolve()
        assert target.is_relative_to(app.resolve()) and target.is_file(), item['icon']
assert len(data['characterTraits']) == 90
text = 'const GUIDE_DATA = ' + json.dumps(data, ensure_ascii=False, separators=(',', ':')) + ';\n'
text += 'Object.assign(TAIWU_DATA, GUIDE_DATA);\n'
(app / 'guide-data.js').write_text(text, encoding='utf-8')
print('Prepared character, companion and item guide data.')
