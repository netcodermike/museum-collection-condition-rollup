import { readFileSync } from 'node:fs'

function analyze({records}) {
  if (!Array.isArray(records)) throw Error('Provide a list of object records');
  const conditionLabels = ['stable', 'watch', 'needs_care', 'unknown'];
  const priorityLabels = ['routine', 'soon', 'urgent', 'unknown'];
  const counts = labels => Object.fromEntries(labels.map(label => [label, 0]));
  const names = new Set(), groups = new Map(), openUnknown = [];
  for (const record of records) {
    if (!record || typeof record.id !== 'string' || !record.id.trim() ||
        typeof record.collection !== 'string' || !record.collection.trim() ||
        !['open', 'closed'].includes(record.status))
      throw Error('Every record needs an ID, collection, and open or closed status');
    const id = record.id.trim(), collection = record.collection.trim();
    if (names.has(id)) throw Error('Duplicate object ID: ' + id);
    names.add(id);
    const condition = record.condition ?? 'unknown', priority = record.priority ?? 'unknown';
    if (!conditionLabels.includes(condition) || !priorityLabels.includes(priority))
      throw Error('Unknown condition or priority label for ' + id);
    if (!groups.has(collection)) {
      groups.set(collection, {
        collection, total: 0, open: 0,
        condition_counts: counts(conditionLabels), priority_counts: counts(priorityLabels),
      });
    }
    const group = groups.get(collection);
    group.total++;
    group.condition_counts[condition]++;
    group.priority_counts[priority]++;
    if (record.status === 'open') {
      group.open++;
      const missing = [];
      if (condition === 'unknown') missing.push('condition');
      if (priority === 'unknown') missing.push('priority');
      if (missing.length) openUnknown.push({id, collection, missing});
    }
  }
  return {collections: [...groups.keys()].sort().map(key => groups.get(key)), open_unknown: openUnknown};
}

try {
  if (process.argv.length !== 3) throw new Error('Usage: node app.mjs input.json')
  console.log(JSON.stringify(analyze(JSON.parse(readFileSync(process.argv[2], 'utf8')))))
} catch (error) {
  console.error(error.message)
  process.exitCode = 2
}
