import asyncio
import os
from dotenv import load_dotenv
from google import genai
from google.genai import types

load_dotenv(".env.local")
from src.agent import BASE_CBT_INSTRUCTIONS
from src.graph_memory import graph_memory

# Set up Gemini client
client = genai.Client(api_key=os.getenv("GOOGLE_API_KEY"))

user_id = "patient_vatsal"

# 1. Retrieve initial session start briefing (which only contains Session 10)
initial_prompt = graph_memory.format_session_start_prompt(user_id)
system_instruction = f"{BASE_CBT_INSTRUCTIONS}\n\n{initial_prompt}"

# 2. Tool definition matching recall_therapy_memory
recall_tool = types.Tool(
    function_declarations=[
        types.FunctionDeclaration(
            name="recall_therapy_memory",
            description=(
                "Query the patient's therapeutic FalkorDB graph memory live during the conversation. "
                "Call this tool whenever the patient asks if you remember them, mentions past events or incidents, "
                "refers to people in their life (e.g. boss, partner, colleagues, roommate, friends), specific triggers, "
                "cognitive patterns, past homework, earlier sessions, or coping exercises."
            ),
            parameters=types.Schema(
                type="OBJECT",
                properties={
                    "topic": types.Schema(
                        type="STRING",
                        description="The person, situation, trigger, emotion, homework, or theme to search in FalkorDB."
                    )
                },
                required=["topic"]
            )
        )
    ]
)

test_questions = [
    "Do you remember what happened in our very first session?",
    "Do you remember who Bruno is?",
    "What was the conflict I had with my roommate Ayush?",
    "Remind me what happened when I had to present to VP Meera?"
]

print("="*70)
print(f"TESTING END-TO-END TURN-BASED RETRIEVAL WITH GEMINI & FALKORDB")
print(f"Patient: {user_id}")
print(f"Active Session in Initial Prompt: Session 10 (Solo Mountain Hike)")
print("="*70)

for idx, question in enumerate(test_questions, 1):
    print(f"\n[TEST TURN {idx}] Patient says: \"{question}\"")
    
    # Send user question to Gemini with tool enabled
    response = client.models.generate_content(
        model="gemini-3.1-flash-lite",
        contents=question,
        config=types.GenerateContentConfig(
            system_instruction=system_instruction,
            tools=[recall_tool],
            temperature=0.7,
        )
    )
    
    # Check if Gemini decided to invoke recall_therapy_memory
    tool_calls = []
    if response.candidates and response.candidates[0].content and response.candidates[0].content.parts:
        for part in response.candidates[0].content.parts:
            if part.function_call:
                tool_calls.append(part.function_call)
                
    if not tool_calls:
        print("[FAILED] LLM did not invoke recall_therapy_memory!")
        print("Raw response text:", response.text)
        continue
        
    for tc in tool_calls:
        print(f"[SUCCESS] LLM invoked tool: '{tc.name}' with args: {tc.args}")
        topic = tc.args.get("topic", "")
        
        # Execute query on FalkorDB
        db_facts = graph_memory.recall_memory_on_spot(user_id, topic)
        print(f"\n[FALKORDB GRAPH RETRIEVED FACTS for '{topic}']:\n{db_facts}")
        
        # Feed back to model to get final spoken response
        followup_contents = [
            types.Content(role="user", parts=[types.Part.from_text(text=question)]),
            types.Content(role="model", parts=[types.Part.from_function_call(name=tc.name, args=tc.args)]),
            types.Content(role="user", parts=[types.Part.from_function_response(name=tc.name, response={"result": db_facts})])
        ]
        
        final_response = client.models.generate_content(
            model="gemini-3.1-flash-lite",
            contents=followup_contents,
            config=types.GenerateContentConfig(
                system_instruction=system_instruction,
                temperature=0.7,
            )
        )
        
        print(f"\n[FINAL AGENT SPOKEN RESPONSE]:\n{final_response.text}")
    print("-" * 70)
