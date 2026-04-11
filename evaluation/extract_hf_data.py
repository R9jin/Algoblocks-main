import pandas as pd
import re
import os
from datasets import load_dataset

def extract_python_code():
    print("Loading dataset from Hugging Face (this may take a minute)...")
    dataset = load_dataset("jtatman/python-code-dataset-500k", split="train")
    
    df = dataset.to_pandas()
    extracted_codes = []
    
    print("Parsing and extracting raw Python code...")
    pattern = re.compile(r"```python\s*(.*?)\s*```", re.DOTALL)
    
    for text in df['output']:
        if not isinstance(text, str):
            continue
            
        match = pattern.search(text)
        if match:
            code = match.group(1).strip()
            extracted_codes.append(code)
        else:
            if "def " in text or "import " in text:
                 extracted_codes.append(text.strip())
                 
    result_df = pd.DataFrame({"code": extracted_codes})
    
    # --- DYNAMIC PATH FIX ---
    # 1. Get the exact folder this script is currently living in (the evaluation folder)
    BASE_DIR = os.path.dirname(os.path.abspath(__file__))
    
    # 2. Point directly to the datasets folder inside it
    output_file = os.path.join(BASE_DIR, "datasets", "hf_500k_raw_code.csv")
    
    # 3. Ensure the datasets folder exists just in case
    os.makedirs(os.path.dirname(output_file), exist_ok=True)
    
    # 4. Save the file
    result_df.to_csv(output_file, index=False)
    
    print(f"\nExtraction complete!")
    print(f"Successfully isolated {len(extracted_codes)} Python scripts.")
    print(f"Saved strictly to: {output_file}")



if __name__ == "__main__":
    extract_python_code()