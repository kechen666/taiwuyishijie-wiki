"""Generate the static-site WanQu data from the reviewed maintenance snapshot."""
from pathlib import Path
from collections import defaultdict
import json

ROOT = Path(__file__).resolve().parent
source = json.loads((ROOT / 'wanqu-source.json').read_text(encoding='utf8'))
characters = {c['id']: dict(c) for c in source['characters']}
abilities = {a['id']: dict(a) for a in source['abilities']}
assert len(characters) == len(source['characters'])
assert len(abilities) == len(source['abilities'])
pools = defaultdict(list)
for entry in source['abilityPoolEntries']:
    assert entry['characterId'] in characters and entry['abilityId'] in abilities
    assert entry['pool'] in [1, 2] and entry['weight'] > 0
    pools[entry['characterId'], entry['pool']].append(entry)
for c in characters.values():
    assert c['kind'] == '常规门派模板' or c['unique'], 'Only player-facing character templates belong in this snapshot'
    c['group'] = 'normal' if c['kind'] == '常规门派模板' else 'special'
    c['abilityPools'] = []
    for number in [1, 2]:
        entries = sorted(pools[c['id'], number], key=lambda e: e['order'])
        assert [e['abilityId'] for e in entries] == c[f'abilityPool{number}']
        total = sum(e['weight'] for e in entries)
        c['abilityPools'].append([{'id': e['abilityId'], 'weight': e['weight'],
                                  'probability': e['weight'] / total} for e in entries])
    assert len(c['names']) == len(c['nameTids'])
for a in abilities.values():
    a['templates'] = [c['id'] for c in characters.values()
                      if any(a['id'] == p['id'] for pool in c['abilityPools'] for p in pool)]
    assert a['templates'], 'Every published ability must belong to a published character'
    a['notes'] = source.get('mechanicsNotes', {}).get(a['id'], [])
names = {tid: name for c in characters.values() for tid, name in zip(c['nameTids'], c['names'])}
counts = {'templates': len(characters), 'normal': sum(c['group'] == 'normal' for c in characters.values()),
          'special': sum(c['group'] == 'special' for c in characters.values()),
          'abilities': len(abilities), 'nameEntries': len(names), 'distinctNames': len(set(names.values()))}
data = {'metadata': {**source['metadata'], 'counts': counts}, 'characters': list(characters.values()),
        'abilities': list(abilities.values()), 'recruitPoolEntries': source['recruitPoolEntries'],
        'personalityById': source['personalityById'], 'knowledgeTexts': source['knowledgeTexts'], 'issues': source['issues']}
(ROOT / 'wanqu-data.js').write_text('TAIWU_DATA.wanqu = ' + json.dumps(data, ensure_ascii=False, separators=(',', ':')) + ';\n', encoding='utf8')
print(json.dumps(counts, ensure_ascii=False))
