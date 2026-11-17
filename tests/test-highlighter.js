const fs = require('fs');
global.window = global;
global.self = global;
eval(fs.readFileSync('vendor/highlight/highlight.min.js', 'utf8'));
eval(fs.readFileSync('js/syntax-highlighter.js', 'utf8'));

const testCode = [
  'a = float(input("Enter a: "))',
  'd = b * b - 4 * a * c',
  'if d > 0:',
  '    r1 = (-b + d ** 0.5) / (2 * a)',
  '    print("Roots are real and different")',
  '# This is a comment',
  'class MyClass(object):',
  '    def calculate_roots(self, a, b, c):',
  '        return True'
];

console.log('Testing VS Code Light+ theme:');
for (const line of testCode) {
  const tokens = SyntaxHighlighter.tokenizeLine(line, 'light');
  const colored = tokens.map(t => `[${t.text} | ${t.color || 'none'}]`).join(' ');
  console.log(colored);
}

console.log('\nTesting VS Code Dark+ theme:');
for (const line of testCode.slice(0, 4)) {
  const tokens = SyntaxHighlighter.tokenizeLine(line, 'dark');
  const colored = tokens.map(t => `[${t.text} | ${t.color || 'none'}]`).join(' ');
  console.log(colored);
}
