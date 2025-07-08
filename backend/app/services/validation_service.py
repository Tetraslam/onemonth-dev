import json
import re
from typing import Any, Dict, List, Literal, Optional

import json_repair
from pydantic import BaseModel, Field, ValidationError


# Pydantic Schemas for Validation
class TipTapNode(BaseModel):
    type: str
    attrs: Optional[Dict[str, Any]] = None
    content: Optional[List['TipTapNode']] = None
    text: Optional[str] = None
    marks: Optional[List[Dict[str, Any]]] = None

TipTapNode.model_rebuild()

class TipTapContent(BaseModel):
    type: Literal['doc']
    content: List[TipTapNode]

class Resource(BaseModel):
    title: str
    url: str

class ProjectData(BaseModel):
    title: str
    description: str
    objectives: List[str]
    requirements: List[str]
    deliverables: List[str]
    evaluation_criteria: List[str]

class CurriculumDay(BaseModel):
    day_number: int
    title: str
    is_project_day: bool
    project_data: Optional[ProjectData] = None
    content: TipTapContent
    resources: List[Resource]
    estimated_hours: Optional[float] = None

class CurriculumResponse(BaseModel):
    curriculum_title: str
    curriculum_description: str
    days: List[CurriculumDay]

def repair_json(json_str: str, error: str = "") -> str:
    """
    Simplified JSON repair function using json_repair library.
    Now a sync function using the library's string-output repair function.
    """
    try:
        # Use the library's repair_json function which returns a repaired JSON string
        repaired_json_str = json_repair.repair_json(json_str)
        print(f"[REPAIR] Successfully repaired JSON using json_repair library")
        return repaired_json_str
    except Exception as e:
        print(f"[REPAIR] json_repair failed: {str(e)}")
        return json_str

async def clean_and_validate_json(json_str: str) -> Optional[Dict[str, Any]]:
    """
    Cleans a JSON string using json_repair and validates it against the CurriculumResponse schema.
    Uses a specialized library designed specifically for fixing LLM JSON output.
    """
    # Log the raw input for debugging
    print(f"[VALIDATION] Raw response length: {len(json_str)}")
    print(f"[VALIDATION] Raw response preview: {json_str[:200]}..." if len(json_str) > 200 else json_str)
    
    # 1. Extract JSON from markdown code blocks if present
    # Handle different markdown variations
    if json_str.strip().startswith("```json") and json_str.strip().endswith("```"):
        # Clean markdown code block format
        json_str = json_str.strip()[7:-3].strip()  # Remove ```json and ```
        print(f"[VALIDATION] Extracted JSON from markdown code block")
    elif json_str.strip().startswith("```") and json_str.strip().endswith("```"):
        # Generic code block
        json_str = json_str.strip()[3:-3].strip()
        print(f"[VALIDATION] Extracted from generic code block")
    elif "```json" in json_str:
        # Find the first ```json and last ```
        start_idx = json_str.find("```json")
        if start_idx != -1:
            start_idx += 7  # Length of "```json"
            # Add newline to start_idx to skip the newline after ```json
            if start_idx < len(json_str) and json_str[start_idx] == '\n':
                start_idx += 1
            end_idx = json_str.find("```", start_idx)
            if end_idx != -1:
                json_str = json_str[start_idx:end_idx].strip()
                print(f"[VALIDATION] Extracted JSON from markdown code block (mid-string)")
    
    print(f"[VALIDATION] After markdown extraction, JSON preview: {json_str[:200]}..." if len(json_str) > 200 else json_str)

    # 2. Use json_repair to fix any JSON corruption
    try:
        # json_repair.loads directly returns a Python object. It has no extra arguments.
        data = json_repair.loads(json_str)
        print(f"[VALIDATION] Successfully parsed and repaired JSON with json_repair")
    except Exception as e:
        print(f"[VALIDATION] json_repair failed: {str(e)}")
        # Log the failure
        import datetime
        with open("llm_responses.log", "a") as f:
            f.write(f"\n\n=== FAILED JSON REPAIR at {datetime.datetime.now()} ===\n")
            f.write(f"Error: {str(e)}\n")
            f.write(f"JSON String Preview:\n{json_str[:1000]}\n")
        return None
        
    # 3. Validate with Pydantic
    try:
        CurriculumResponse.model_validate(data)
        print(f"[VALIDATION] Successfully validated with Pydantic")
        return data
    except (ValidationError, Exception) as e:
        print(f"[VALIDATION] Pydantic validation failed: {str(e)}")
        # Log validation failure
        import datetime
        with open("llm_responses.log", "a") as f:
            f.write(f"\n\n=== PYDANTIC VALIDATION FAILED at {datetime.datetime.now()} ===\n")
            f.write(f"Error: {str(e)}\n")
            f.write(f"Data keys: {list(data.keys()) if isinstance(data, dict) else 'Not a dict'}\n")
        return None 