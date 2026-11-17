import zipfile
import xml.etree.ElementTree as ET

docx_path = r'd:\Projects\PDF syntax Highlighter\e01-q1-roots-of-a-quadratic-equation_highlighted.docx'
with zipfile.ZipFile(docx_path) as z:
    doc_xml = z.read('word/document.xml')
    root = ET.fromstring(doc_xml)
    ns = {'w': 'http://schemas.openxmlformats.org/wordprocessingml/2006/main'}

    texts = [t.text for t in root.iter('{http://schemas.openxmlformats.org/wordprocessingml/2006/main}t') if t.text]
    print(f'Total text elements: {len(texts)}')
    print('\nFirst 25 text items:')
    for i, t in enumerate(texts[:25]):
        print(f'  [{i}] "{t}"')

    colors = set()
    for color_elem in root.iter('{http://schemas.openxmlformats.org/wordprocessingml/2006/main}color'):
        val = color_elem.attrib.get('{http://schemas.openxmlformats.org/wordprocessingml/2006/main}val')
        if val:
            colors.add(val)
    print(f'\nColors found in runs: {sorted(list(colors))}')

    full_text = ' '.join(texts)
    print('\nValidation Checks:')
    print('  Question text intact:', 'Write a program to find the roots of a quadratic equation' in full_text)
    print('  Code float/input/print present:', 'float' in full_text and 'print' in full_text)
    print('  Output 1 text intact:', 'Roots are real and different' in full_text)
    print('  Output 2 text intact:', 'Roots are complex' in full_text)
    print('  Student name present:', 'Aayushi' in full_text)
    print('  Roll number present:', '26BC025' in full_text)
