'use strict';

function pickFields(item, fields) {
  if (!fields || fields.length === 0) return item;
  if (Array.isArray(item)) return item.map(entry => pickFields(entry, fields));
  if (item && typeof item === 'object') {
    const result = {};
    for (const field of fields) {
      if (Object.prototype.hasOwnProperty.call(item, field)) {
        result[field] = item[field];
      }
    }
    return result;
  }
  return item;
}

function formatTable(rows, columns) {
  if (!rows.length) return '';

  const widths = columns.map(col => col.length);
  for (const row of rows) {
    columns.forEach((col, index) => {
      const value = row[col] === undefined || row[col] === null ? '' : String(row[col]);
      widths[index] = Math.max(widths[index], value.length);
    });
  }

  const lines = [];
  const header = columns.map((col, index) => col.padEnd(widths[index])).join('  ');
  lines.push(header);
  lines.push(columns.map((_, index) => '-'.repeat(widths[index])).join('  '));

  for (const row of rows) {
    const line = columns
      .map((col, index) => {
        const value = row[col] === undefined || row[col] === null ? '' : String(row[col]);
        return value.padEnd(widths[index]);
      })
      .join('  ');
    lines.push(line);
  }

  return lines.join('\n');
}

function printOutput(data, options, humanFormatter) {
  if (options.json) {
    const payload = pickFields(data, options.fields);
    console.log(JSON.stringify(payload, null, 2));
    return;
  }

  if (typeof humanFormatter === 'function') {
    const output = humanFormatter(data);
    if (output) console.log(output);
    return;
  }

  if (typeof data === 'string') {
    console.log(data);
    return;
  }

  console.log(JSON.stringify(data, null, 2));
}

module.exports = {
  pickFields,
  formatTable,
  printOutput,
};
