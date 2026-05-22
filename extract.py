import pypdf
import os

pdf_path = r"c:\xampp\htdocs\DA sem 2 jewelry\COMP60022_DECISION_ANALYTICS_Assignment-01-Sem02.pdf"
output_path = r"C:\Users\USER\.gemini\antigravity\brain\5b3c19d6-b5fa-47e9-87b5-9f542554db9c\scratch\assignment_text.txt"

# Ensure directory exists
os.makedirs(os.path.dirname(output_path), exist_ok=True)

reader = pypdf.PdfReader(pdf_path)
text_content = []

for i, page in enumerate(reader.pages):
    text_content.append(f"--- PAGE {i+1} ---")
    text_content.append(page.extract_text() or "")

with open(output_path, "w", encoding="utf-8") as f:
    f.write("\n".join(text_content))

print("Text extraction complete!")
