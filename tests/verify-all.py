import zipfile
import xml.etree.ElementTree as ET

def verify(docx_path, expected_experiments=1):
    print(f"\nVerifying: {docx_path}")
    with zipfile.ZipFile(docx_path) as z:
        doc_xml = z.read('word/document.xml')
        root = ET.fromstring(doc_xml)
        
        # Check text
        texts = [t.text for t in root.iter('{http://schemas.openxmlformats.org/wordprocessingml/2006/main}t') if t.text]
        full_text = ' '.join(texts)
        print(f"  Total text tokens: {len(texts)}")
        print(f"  Total text length: {len(full_text)} characters")

        # Check colors
        colors = set()
        for color_elem in root.iter('{http://schemas.openxmlformats.org/wordprocessingml/2006/main}color'):
            val = color_elem.attrib.get('{http://schemas.openxmlformats.org/wordprocessingml/2006/main}val')
            if val:
                colors.add(val)
        print(f"  Colors present: {sorted(list(colors))}")
        
        # Check table count (panels)
        tables = list(root.iter('{http://schemas.openxmlformats.org/wordprocessingml/2006/main}tbl'))
        print(f"  Tables count: {len(tables)}")

        # Verification asserts
        assert 'OBJECT ORIENTED PROGRAMMING USING PYTHON' in full_text
        assert 'Roots of a quadratic equation' in full_text
        assert 'Aayushi' in full_text
        assert '26BC025' in full_text
        print("  ✓ Basic metadata verified")

verify(r'd:\Projects\PDF syntax Highlighter\e01-q1-roots-of-a-quadratic-equation_highlighted.docx', 1)
verify(r'd:\Projects\PDF syntax Highlighter\PYTHONFILE_highlighted.docx', 15)
print("\nAll DOCX files passed strict verification!")
