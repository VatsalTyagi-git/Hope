import time
from src.graph_memory import graph_memory

def simulate_10_sessions():
    user_id = "patient_vatsal"
    print(f"=== Starting 10-Session Simulation for {user_id} ===")

    # 1. Clean previous sessions and episodes for patient_vatsal to ensure a pristine 10-session chain
    print("Clearing previous test sessions for user...")
    graph_memory.query("""
        MATCH (u:User {id: $uid})-[r:LATEST_SESSION]->(s:Session)
        DELETE r
    """, {"uid": user_id})

    # Optional: Delete older sessions that belonged to patient_vatsal
    graph_memory.query("""
        MATCH (s:Session)
        WHERE s.id STARTS WITH 'sim_session_' OR s.id STARTS WITH 'session_'
        OPTIONAL MATCH (s)-[:CAPTURED_EPISODE]->(e:Episode)
        DETACH DELETE e, s
    """)

    # Base timestamp: 10 weeks ago (7 days per session = 604800 seconds)
    now = int(time.time())
    one_week = 7 * 24 * 3600
    start_base = now - (9 * one_week)

    sessions_data = [
        {
            "id": "session_01",
            "number": 1,
            "mode": "WEEKLY",
            "time_offset": 0,
            "initial_mood": 9,
            "final_mood": 5,
            "summary": "The patient experienced an acute panic spike (9/10) at the animal shelter while finalizing the adoption of a rescue dog named Bruno. Feared personal inadequacy would harm the pet. Introduced decatastrophizing and diaphragmatic breathing, shifting mood to 5/10. Assigned daily grounding practice with Bruno.",
            "episodes": [
                {
                    "situation": "Panic attack at the animal shelter while finalizing the adoption of rescue dog Bruno when staff asked for commitment.",
                    "thought": "I am too irresponsible and broken to take care of Bruno; he will suffer because of me.",
                    "emotion": "Panic / Severe Anxiety",
                    "intensity_before": 9,
                    "intensity_after": 5,
                    "reframe": "Feeling nervous shows I care deeply; being anxious does not make me irresponsible, and I can take this one day at a time with Bruno.",
                    "person": {"name": "Clara", "role": "Shelter Volunteer", "sentiment": "supportive"},
                    "trigger": {"name": "Adopting rescue dog Bruno", "category": "Responsibility / Commitment", "intensity": 9.0},
                    "distortion": "Catastrophizing",
                    "core_belief": {"statement": "I am fundamentally inadequate.", "category": "Incompetence"}
                }
            ],
            "homework": "5-Minute Daily Breathing & Grounding with Bruno",
            "handoff": "Patient successfully brought Bruno home. Continue monitoring panic around pet care responsibilities."
        },
        {
            "id": "session_02",
            "number": 2,
            "mode": "WEEKLY",
            "time_offset": 1 * one_week,
            "initial_mood": 8,
            "final_mood": 6,
            "summary": "Session focused on imposter syndrome sparked by code review comments from Tech Lead Rohan. Identified Mind Reading distortion. Practiced evidence testing to separate code feedback from personal worth.",
            "episodes": [
                {
                    "situation": "Received four critical comments during a GitHub code review from Tech Lead Rohan.",
                    "thought": "Rohan thinks I am a fraud and will tell engineering leadership that I don't belong here.",
                    "emotion": "Imposter Dread",
                    "intensity_before": 8,
                    "intensity_after": 5,
                    "reframe": "Code review comments are standard engineering best practices, not an assessment of my intelligence.",
                    "person": {"name": "Rohan", "role": "Tech Lead", "sentiment": "professional"},
                    "trigger": {"name": "PR Code Review Comments", "category": "Work Evaluation", "intensity": 8.0},
                    "distortion": "Mind Reading",
                    "core_belief": {"statement": "I am an intellectual fraud.", "category": "Incompetence"}
                }
            ],
            "homework": "3-Column Thought Record for Work Meetings",
            "handoff": "Addressed workplace imposter feelings. Homework assigned for thought records."
        },
        {
            "id": "session_03",
            "number": 3,
            "mode": "WEEKLY",
            "time_offset": 2 * one_week,
            "initial_mood": 7,
            "final_mood": 4,
            "summary": "Explored social anxiety and black-or-white thinking regarding friend Kabir's multi-day wedding. Built a structured compromise plan allowing attendance at the ceremony without exhausting late-night commitments.",
            "episodes": [
                {
                    "situation": "Contemplating completely skipping childhood friend Kabir's wedding due to fear of crowds and burnout.",
                    "thought": "If I don't stay for the full three-day celebration, I am a terrible friend and Kabir will cut me off.",
                    "emotion": "Guilt and Social Dread",
                    "intensity_before": 7,
                    "intensity_after": 4,
                    "reframe": "Attending the main ceremony and setting an early exit boundary is a healthy compromise that respects both my social battery and our friendship.",
                    "person": {"name": "Kabir", "role": "Childhood Friend", "sentiment": "warm"},
                    "trigger": {"name": "Multi-day Wedding Invitation", "category": "Social Commitment", "intensity": 7.0},
                    "distortion": "All-or-Nothing Thinking",
                    "core_belief": {"statement": "I must sacrifice my well-being to be loved.", "category": "Acceptance"}
                }
            ],
            "homework": "Graded Social Exposure Plan",
            "handoff": "Patient agreed to boundary-setting for Kabir's wedding."
        },
        {
            "id": "session_04",
            "number": 4,
            "mode": "WEEKLY",
            "time_offset": 3 * one_week,
            "initial_mood": 8,
            "final_mood": 5,
            "summary": "Addressed chronic avoidance of overdue tax filing and emotional reasoning. Applied 'Worry Time' constraint and broke the filing process into 15-minute micro-steps, completing the initial document sort.",
            "episodes": [
                {
                    "situation": "Stomach cramping and panic upon seeing unopened official tax audit and filing letters on the kitchen table.",
                    "thought": "Because I feel immense dread opening this envelope, something catastrophic must be wrong with my finances.",
                    "emotion": "Avoidance Dread",
                    "intensity_before": 8,
                    "intensity_after": 5,
                    "reframe": "The feeling of dread is my nervous system sounding a false alarm, not proof that the tax balance is unmanageable.",
                    "person": None,
                    "trigger": {"name": "Opening Official Tax Mail", "category": "Financial Responsibility", "intensity": 8.5},
                    "distortion": "Emotional Reasoning",
                    "core_belief": {"statement": "I cannot handle adult financial obligations.", "category": "Helplessness"}
                }
            ],
            "homework": "15-Minute Worry Time & Chunked Filing",
            "handoff": "Initial tax envelope sorted. Follow up on completing accountant submission."
        },
        {
            "id": "session_05",
            "number": 5,
            "mode": "WEEKLY",
            "time_offset": 4 * one_week,
            "initial_mood": 9,
            "final_mood": 5,
            "summary": "Patient spiraled into acute health anxiety over a tension headache after reading medical forums. Instituted a strict 7-day moratorium on symptom googling and reviewed Dr. Patel's reassuring physical checkup.",
            "episodes": [
                {
                    "situation": "Spent three hours late at night reading medical discussion boards after noticing a persistent right-sided tension headache.",
                    "thought": "This headache is definitely a progressive neurological condition that doctors overlooked.",
                    "emotion": "Health Panic",
                    "intensity_before": 9,
                    "intensity_after": 4,
                    "reframe": "Headaches are extremely common responses to screen eye strain, dehydration, and poor sleep. Compulsive googling amplifies adrenaline.",
                    "person": {"name": "Dr. Patel", "role": "Primary Physician", "sentiment": "trusted"},
                    "trigger": {"name": "Physical Tension Headache", "category": "Somatic Sensation", "intensity": 9.0},
                    "distortion": "Catastrophizing",
                    "core_belief": {"statement": "My physical body is vulnerable and doomed.", "category": "Vulnerability"}
                }
            ],
            "homework": "Digital Detox & Symptom-Checking Ban",
            "handoff": "Addressed health anxiety loop. Zero WebMD policy enforced."
        },
        {
            "id": "session_06",
            "number": 6,
            "mode": "WEEKLY",
            "time_offset": 5 * one_week,
            "initial_mood": 7,
            "final_mood": 5,
            "summary": "Analyzed conflict avoidance and catastrophic fortune-telling regarding roommate Ayush's late-night noise. Rehearsed the DEAR MAN communication technique to make a calm, direct request for quiet hours.",
            "episodes": [
                {
                    "situation": "Lying awake with insomnia at 2 AM while roommate Ayush played multiplayer games on speaker in the living room.",
                    "thought": "If I ask Ayush to lower the volume, he will explode, create a toxic apartment war, and hate me.",
                    "emotion": "Resentment / Fear of Conflict",
                    "intensity_before": 7,
                    "intensity_after": 4,
                    "reframe": "Requesting quiet hours after midnight is basic courtesy, not an attack. Ayush cannot respect boundaries he doesn't know exist.",
                    "person": {"name": "Ayush", "role": "Roommate", "sentiment": "strained"},
                    "trigger": {"name": "Late-Night Living Room Noise", "category": "Interpersonal Friction", "intensity": 7.5},
                    "distortion": "Fortune Telling",
                    "core_belief": {"statement": "Expressing my needs will lead to hostility and rejection.", "category": "Unlovable"}
                }
            ],
            "homework": "DEAR MAN Assertive Communication Conversation with Ayush",
            "handoff": "Rehearsed DEAR MAN dialogue. Patient will speak with Ayush before next session."
        },
        {
            "id": "session_07",
            "number": 7,
            "mode": "WEEKLY",
            "time_offset": 6 * one_week,
            "initial_mood": 8,
            "final_mood": 6,
            "summary": "Addressed avoidance behaviors triggered by career ambiguity. Introduced the 'Urge Surfing' technique to sit with the physical sensations of uncertainty for 10 minutes before reacting.",
            "episodes": [
                {
                    "situation": "Paralyzed while looking at future tech industry hiring trends and restructuring news.",
                    "thought": "I cannot stand not knowing what my job will look like next year; I must distract myself and give up.",
                    "emotion": "Existential Overwhelm",
                    "intensity_before": 8,
                    "intensity_after": 5,
                    "reframe": "Uncertainty is an unavoidable reality of professional growth, not a personal emergency. I can observe discomfort without escaping.",
                    "person": None,
                    "trigger": {"name": "Career Path Ambiguity", "category": "Existential Uncertainty", "intensity": 8.0},
                    "distortion": "Emotional Reasoning",
                    "core_belief": {"statement": "Uncertainty is intolerable and dangerous.", "category": "Helplessness"}
                }
            ],
            "homework": "Urge Surfing 10-Minute Timer",
            "handoff": "Practicing urge surfing when feeling the impulse to distract or doomscroll."
        },
        {
            "id": "session_08",
            "number": 8,
            "mode": "WEEKLY",
            "time_offset": 7 * one_week,
            "initial_mood": 8,
            "final_mood": 6,
            "summary": "Tackled mental filtering following a corporate presentation to VP Meera. Identified the tendency to dismiss 95% positive reception to fixate on a single stutter. Began a Positive Data Log.",
            "episodes": [
                {
                    "situation": "Delivered quarterly infrastructure roadmap to VP Meera and stumbled on slide four metric calculation.",
                    "thought": "Because I stumbled on that one slide, the entire presentation was a complete embarrassment and failure.",
                    "emotion": "Shame & Hyper-vigilance",
                    "intensity_before": 8,
                    "intensity_after": 5,
                    "reframe": "Stumbling over one slide does not negate 25 minutes of stellar content and VP Meera's explicit praise for the roadmap.",
                    "person": {"name": "VP Meera", "role": "Executive VP", "sentiment": "evaluative"},
                    "trigger": {"name": "Executive Leadership Presentation", "category": "High-Stakes Performance", "intensity": 8.5},
                    "distortion": "Mental Filtering",
                    "core_belief": {"statement": "Unless I perform flawlessly, I am worthless.", "category": "Defectiveness"}
                }
            ],
            "homework": "Positive Data Log (Evidence of Competence)",
            "handoff": "Patient reframing public speaking performance. Documenting positive feedback."
        },
        {
            "id": "session_09",
            "number": 9,
            "mode": "WEEKLY",
            "time_offset": 8 * one_week,
            "initial_mood": 7,
            "final_mood": 6,
            "summary": "Processed anniversary grief and rigid 'should' statements regarding emotional recovery. Reframed grief as enduring love and encouraged honoring feelings rather than suppressing them.",
            "episodes": [
                {
                    "situation": "Sudden tearfulness and heavy sorrow while looking at an old photo album on grandmother's anniversary.",
                    "thought": "It has been three years; I should be completely over this and not crying at my desk.",
                    "emotion": "Deep Grief & Self-Judgment",
                    "intensity_before": 7,
                    "intensity_after": 4,
                    "reframe": "Grief has no expiration date. Mourning my grandmother honors our lasting bond; it is a sign of deep love, not weakness.",
                    "person": {"name": "Grandmother", "role": "Family (Deceased)", "sentiment": "loving"},
                    "trigger": {"name": "Anniversary of Loss", "category": "Bereavement", "intensity": 7.0},
                    "distortion": "'Should' Statements",
                    "core_belief": {"statement": "Vulnerability and emotional grief are signs of failure.", "category": "Defectiveness"}
                }
            ],
            "homework": "Compassionate Self-Letter",
            "handoff": "Patient practiced self-compassion around family bereavement."
        },
        {
            "id": "session_10",
            "number": 10,
            "mode": "WEEKLY",
            "time_offset": 9 * one_week,
            "initial_mood": 6,
            "final_mood": 8,
            "summary": "The patient celebrated major autonomy gains and discussed anticipatory nervousness about a solo mountain hiking trip this weekend. Reframed solitude as peaceful independence. Assigned sensory photo journaling on the trail.",
            "episodes": [
                {
                    "situation": "Packing backpacking gear for a 2-day solo mountain hike in the backcountry.",
                    "thought": "What if I feel completely isolated and out of my depth on the trail with no one to rely on?",
                    "emotion": "Anticipatory Excitement & Mild Apprehension",
                    "intensity_before": 5,
                    "intensity_after": 3,
                    "reframe": "Solo hiking is an intentional gift of solitude and autonomy. I have prepared my gear and can trust my problem-solving skills.",
                    "person": None,
                    "trigger": {"name": "Solo Mountain Hiking Trip", "category": "Autonomy Challenge", "intensity": 5.0},
                    "distortion": "Fortune Telling",
                    "core_belief": {"statement": "I am capable of independent exploration.", "category": "Self-Efficacy"}
                }
            ],
            "homework": "Solo Hiking Sensory Grounding & Photo Journaling",
            "handoff": "Patient is embarking on a solo mountain hike this weekend. Anxiety is low (3/10) and self-efficacy is high. Celebrate autonomy gains and follow up on their hiking photo journal."
        }
    ]

    prev_session_id = None

    for s in sessions_data:
        sess_id = s["id"]
        sess_time = start_base + s["time_offset"]
        started_at = sess_time
        ended_at = sess_time + 2700  # 45 min session

        print(f"-> Inserting Session {s['number']}: {sess_id} ({s['summary'][:50]}...)")

        # Create Session node
        graph_memory.query("""
            MATCH (u:User {id: $uid})
            MATCH (c:Companion {mode: $mode})
            MERGE (s:Session {id: $sid})
            SET s.mode = $mode,
                s.started_at = $started_at,
                s.ended_at = $ended_at,
                s.initial_mood = $initial_mood,
                s.final_mood = $final_mood,
                s.summary = $summary,
                s.transcript_db_id = $sid
            MERGE (s)-[:CONDUCTED_BY]->(c)
        """, {
            "uid": user_id,
            "mode": s["mode"],
            "sid": sess_id,
            "started_at": started_at,
            "ended_at": ended_at,
            "initial_mood": s["initial_mood"],
            "final_mood": s["final_mood"],
            "summary": s["summary"]
        })

        # Link from previous session via NEXT_SESSION
        if prev_session_id:
            graph_memory.query("""
                MATCH (prev:Session {id: $prev_id})
                MATCH (curr:Session {id: $curr_id})
                MERGE (prev)-[r:NEXT_SESSION]->(curr)
                SET r.hours_between = 168.0
            """, {"prev_id": prev_session_id, "curr_id": sess_id})

        # Create Episodes and links
        for idx, ep in enumerate(s["episodes"]):
            ep_id = f"ep_{sess_id}_{idx + 1}"
            graph_memory.query("""
                MATCH (s:Session {id: $sid})
                MERGE (e:Episode {id: $epid})
                SET e.situation = $situation,
                    e.automatic_thought = $thought,
                    e.emotion = $emotion,
                    e.intensity_before = $ib,
                    e.intensity_after = $ia,
                    e.reframed_thought = $reframe,
                    e.timestamp = $ts
                MERGE (s)-[:CAPTURED_EPISODE]->(e)
            """, {
                "sid": sess_id,
                "epid": ep_id,
                "situation": ep["situation"],
                "thought": ep["thought"],
                "emotion": ep["emotion"],
                "ib": ep["intensity_before"],
                "ia": ep["intensity_after"],
                "reframe": ep["reframe"],
                "ts": started_at
            })

            # Person
            if ep.get("person"):
                p = ep["person"]
                graph_memory.query("""
                    MATCH (e:Episode {id: $epid})
                    MERGE (p:Person {name: $pname})
                    ON CREATE SET p.role = $role, p.relationship_sentiment = $sentiment, p.mention_count = 1
                    ON MATCH SET p.mention_count = p.mention_count + 1
                    MERGE (e)-[:INVOLVED_PERSON]->(p)
                """, {
                    "epid": ep_id,
                    "pname": p["name"],
                    "role": p["role"],
                    "sentiment": p["sentiment"]
                })

            # Trigger
            if ep.get("trigger"):
                t = ep["trigger"]
                graph_memory.query("""
                    MATCH (e:Episode {id: $epid})
                    MERGE (tr:Trigger {name: $tname})
                    ON CREATE SET tr.category = $cat, tr.avg_intensity = $intensity, tr.mention_count = 1
                    ON MATCH SET tr.mention_count = tr.mention_count + 1
                    MERGE (e)-[:SPARKED_BY]->(tr)
                """, {
                    "epid": ep_id,
                    "tname": t["name"],
                    "cat": t["category"],
                    "intensity": float(t["intensity"])
                })

            # Distortion & Core Belief
            if ep.get("distortion"):
                dist_name = ep["distortion"]
                graph_memory.query("""
                    MATCH (e:Episode {id: $epid})
                    MERGE (cd:CognitiveDistortion {name: $dname})
                    ON CREATE SET cd.occurrence_count = 1
                    ON MATCH SET cd.occurrence_count = cd.occurrence_count + 1
                    MERGE (e)-[:EXHIBITED_DISTORTION]->(cd)
                """, {"epid": ep_id, "dname": dist_name})

                if ep.get("core_belief"):
                    cb = ep["core_belief"]
                    graph_memory.query("""
                        MATCH (cd:CognitiveDistortion {name: $dname})
                        MERGE (cb:CoreBelief {statement: $stmt})
                        ON CREATE SET cb.category = $cat, cb.strength_score = 0.85
                        MERGE (cd)-[:ROOTED_IN]->(cb)
                    """, {"dname": dist_name, "stmt": cb["statement"], "cat": cb["category"]})

        prev_session_id = sess_id

    # 4. Link Session 10 as LATEST_SESSION for patient_vatsal
    last_session = sessions_data[-1]
    graph_memory.query("""
        MATCH (u:User {id: $uid})
        MATCH (s:Session {id: $sid})
        MERGE (u)-[:LATEST_SESSION]->(s)
    """, {"uid": user_id, "sid": last_session["id"]})

    # 5. Update AgentState with Session 10 context
    graph_memory.query("""
        MATCH (u:User {id: $uid})-[:HAS_STATE]->(a:AgentState {id: "active_state"})
        MERGE (ex:CBTExercise {name: $hw})
        SET a.active_homework = $hw,
            a.homework_streak = 2,
            a.handoff_context = $handoff,
            a.recommended_next_mode = "WEEKLY",
            a.urgent_flag = false,
            a.updated_at = $now
        MERGE (a)-[:ACTIVE_HOMEWORK {assigned_at: $now, target_days: 7}]->(ex)
    """, {
        "uid": user_id,
        "hw": last_session["homework"],
        "handoff": last_session["handoff"],
        "now": now
    })

    print("\n[SUCCESS] All 10 Sessions Successfully Inserted and Linked in FalkorDB!")

if __name__ == "__main__":
    simulate_10_sessions()
