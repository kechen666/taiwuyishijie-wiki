"""Generate the static equipment-drop reference from its reviewed snapshot."""
from pathlib import Path
import json

ROOT = Path(__file__).resolve().parent
data = json.loads((ROOT / 'drop-source.json').read_text(encoding='utf8'))
assert data['rPercents'] == [0, 100, 150, 250, 350, 450]
assert len({r['id'] for r in data['rules']}) == len(data['rules']) == 8
for rule in data['rules']:
    assert len(rule['qualityWeights']) == len(rule['qualityPoolIds']) == 4
    assert all(w >= 0 for w in rule['qualityWeights']) and sum(rule['qualityWeights']) > 0
    assert isinstance(rule['drawCount'], int) and 0 <= rule['minimumCount'] <= rule['drawCount'] <= 6
    assert 0 <= rule['baseDropRate'] <= 1
    assert rule['kind'] in ['enemy', 'chest', 'event']
(ROOT / 'drop-data.js').write_text('TAIWU_DATA.drop = ' + json.dumps(data, ensure_ascii=False, separators=(',', ':')) + ';\n', encoding='utf8')
print('Generated 8 equipment rules and 6 R values.')
