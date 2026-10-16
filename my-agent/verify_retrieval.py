from src.graph_memory import graph_memory

print("=== 1. INITIAL SESSION-START RETRIEVAL PROMPT ===")
prompt = graph_memory.format_session_start_prompt("patient_vatsal")
print(prompt)

print("\n" + "="*60)
print("=== 2. TESTING TURN-BASED RETRIEVAL ON TOPICS ===")
print("="*60)

test_topics = [
    "first session",
    "session 1",
    "Bruno",
    "rescue dog",
    "animal shelter",
    "Clara",
    "Rohan",
    "tax",
    "Ayush",
    "grandmother"
]

for t in test_topics:
    print(f"\n--- Querying Topic: '{t}' ---")
    res = graph_memory.recall_memory_on_spot("patient_vatsal", t)
    print(res)
