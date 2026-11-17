async function testFull() {
  const buf = fs.readFileSync(path.join(__dirname, 'PYTHONFILE.pdf'));
  const exps = await parsePdfDocument(buf);
  console.log('\n================ ALL EXPERIMENTS TEST ================');
  console.log('Total experiments parsed:', exps.length);
  for (let i = 0; i < exps.length; i++) {
    const e = exps[i];
    console.log(`[${i+1}] Exp ${e.experimentNum}: ${e.title} | Student: ${e.studentName} (${e.rollNo}) | Sections: ${e.sections.map(s => s.title).join(', ')}`);
  }
}

testFull().catch(err => console.error(err));
