// Run with Node.js; no packages are required.
const fs = require('node:fs');
const vm = require('node:vm');
const assert = require('node:assert/strict');
const path = require('node:path');
const page = fs.readFileSync(path.join(__dirname, 'index.html'), 'utf8');
const script = page.match(/<script>([\s\S]*?)<\/script>/)[1];
new vm.Script(script);
const helper = script.slice(script.indexOf('function iconHTML('), script.indexOf('function branchName('));
const context = vm.createContext({esc: s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;')});
vm.runInContext(helper, context);
const missing = context.iconHTML(null, 'sm', '<svg></svg>');
assert(missing.includes('icon-missing') && missing.includes('<svg></svg>') && !missing.includes('<img'));
const icon = context.iconHTML({icon: 'assets/icons/example.png'});
assert(icon.includes('loading="lazy"') && icon.includes('alt=""') && icon.includes('onerror='));
const escaped = context.iconHTML({icon: 'bad" onload="alert(1)'});
assert(!escaped.includes('src="bad" onload='));
assert(escaped.includes('&quot;'));
console.log('PASS: JavaScript syntax, icon fallback, lazy loading and attribute escaping.');
