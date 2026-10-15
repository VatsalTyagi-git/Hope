"""FalkorDB Graph Memory Layer for AI Therapist.

Implements the complete 4-layer Cognitive Behavioral Therapy (CBT) memory architecture:
- Layer A: History & Multi-Agent Coordination (User, Companion, Session, AgentState, Handoff)
- Layer B: Episodic Memory (Episode, DailyPractice)
- Layer C: Semantic CBT Memory (Person, Trigger, CognitiveDistortion, CoreBelief)
- Layer D: Procedural Memory (CBTExercise, TherapistRule)
"""

import logging
import os
import re
import time
from typing import Any, Optional

from dotenv import load_dotenv
from falkordb import FalkorDB

load_dotenv(".env.local")

logger = logging.getLogger("graph_memory")

FALKORDB_HOST = os.getenv("FALKORDB_HOST", "localhost")
FALKORDB_PORT = int(os.getenv("FALKORDB_PORT", "6379"))
FALKORDB_PASSWORD = os.getenv("FALKORDB_PASSWORD", None)
FALKORDB_GRAPH = os.getenv("FALKORDB_GRAPH", "therapy_memory")


class EmptyResultSet:
    """Fallback result set returned when FalkorDB is offline."""

    def __init__(self, result_set: Optional[list] = None) -> None:
        self.result_set = result_set or []


class GraphMemoryManager:
    """Manages FalkorDB connection, schema initialization, and turn-based queries."""

    def __init__(
        self,
        host: str = FALKORDB_HOST,
        port: int = FALKORDB_PORT,
        password: Optional[str] = FALKORDB_PASSWORD,
        graph_name: str = FALKORDB_GRAPH,
        socket_timeout: float = 1.0,
    ) -> None:
        self.host = host
        self.port = port
        self.password = password
        self.graph_name = graph_name
        self.socket_timeout = socket_timeout
        self._driver: Optional[FalkorDB] = None
        self._graph = None
        self._offline_until: float = 0.0

    def get_graph(self) -> Any:
        """Lazily connects to FalkorDB on demand with auto-reconnection and circuit breaker."""
        now = time.time()
        if self._offline_until > now:
            return None

        if self._graph is None:
            try:
                self._driver = FalkorDB(
                    host=self.host,
                    port=self.port,
                    password=self.password,
                    socket_timeout=self.socket_timeout,
                    socket_connect_timeout=self.socket_timeout,
                )
                self._graph = self._driver.select_graph(self.graph_name)
                # Quick health check to verify socket responsiveness
                self._graph.query("RETURN 1")
                logger.info(
                    f"Connected to FalkorDB at {self.host}:{self.port} (graph: {self.graph_name})"
                )
            except Exception as e:
                logger.warning(
                    f"FalkorDB not reachable at {self.host}:{self.port} ({e}). "
                    "Operating in resilient offline mode with empty memory."
                )
                self._driver = None
                self._graph = None
                self._offline_until = now + 30.0
                return None
        return self._graph

    @property
    def driver(self) -> Optional[FalkorDB]:
        self.get_graph()
        return self._driver

    @property
    def graph(self) -> Any:
        return self.get_graph()

    def query(self, cypher: str, params: Optional[dict[str, Any]] = None) -> Any:
        """Executes a Cypher query with optional parameters."""
        g = self.get_graph()
        if g is None:
            return EmptyResultSet([])
        try:
            return g.query(cypher, params or {})
        except Exception as e:
            err_msg = str(e).lower()
            if "already indexed" in err_msg or "already exists" in err_msg:
                # Expected when re-running schema indexes
                return EmptyResultSet([])
            logger.warning(f"FalkorDB query failed: {e}. Resetting connection.")
            self._driver = None
            self._graph = None
            self._offline_until = time.time() + 30.0
            return EmptyResultSet([])

    # --------------------------------------------------------------------------
    # 1. SCHEMA INITIALIZATION & INDEXING (USER-ISOLATED SCHEMA)
    # --------------------------------------------------------------------------
    def init_schema(self) -> None:
        """Creates primary-key and search indexes for all user-isolated node labels."""
        indexes = [
            # Layer A: History & Multi-Agent Coordination
            ("User", "id"),
            ("Companion", "id"),
            ("Companion", "userId"),
            ("Session", "id"),
            ("Session", "userId"),
            ("Session", "started_at"),
            ("AgentState", "id"),
            ("AgentState", "userId"),
            ("Handoff", "id"),
            ("Handoff", "userId"),
            # Layer B: Episodic Memory
            ("Episode", "id"),
            ("Episode", "userId"),
            ("Episode", "timestamp"),
            ("DailyPractice", "id"),
            ("DailyPractice", "userId"),
            ("DailyPractice", "timestamp"),
            # Layer C: Semantic CBT Memory
            ("Person", "id"),
            ("Person", "userId"),
            ("Person", "name"),
            ("Trigger", "id"),
            ("Trigger", "userId"),
            ("Trigger", "name"),
            ("CognitiveDistortion", "id"),
            ("CognitiveDistortion", "userId"),
            ("CognitiveDistortion", "name"),
            ("CoreBelief", "id"),
            ("CoreBelief", "userId"),
            ("CoreBelief", "statement"),
            # Layer D: Procedural Memory
            ("CBTExercise", "id"),
            ("CBTExercise", "userId"),
            ("CBTExercise", "name"),
            ("TherapistRule", "id"),
            ("TherapistRule", "userId"),
        ]

        logger.info("Initializing FalkorDB multi-tenant isolated indices...")
        for label, prop in indexes:
            try:
                self.query(f"CREATE INDEX FOR (n:{label}) ON (n.{prop})")
                logger.info(f"Created index on :{label}({prop})")
            except Exception as e:
                # FalkorDB raises if index already exists
                if "already indexed" not in str(e).lower():
                    logger.warning(f"Index creation note for :{label}({prop}): {e}")

    def clear_database(self) -> None:
        """Completely clears all nodes and relationships in FalkorDB."""
        self.query("MATCH (n) DETACH DELETE n")
        logger.info("FalkorDB completely cleared.")

    # --------------------------------------------------------------------------
    # 2. USER & AGENT STATE COORDINATION (ISOLATED PER USER)
    # --------------------------------------------------------------------------
    def ensure_user(
        self, user_id: str, name: str = "User", baseline_anxiety: int = 5
    ) -> None:
        """Ensures the primary root user node, its dedicated AgentState, and dedicated Companions exist."""
        now = int(time.time())
        self.query(
            """
            MERGE (u:User {id: $user_id})
            ON CREATE SET u.name = $name, u.created_at = $now, u.baseline_anxiety = $baseline_anxiety
            MERGE (a:AgentState {id: "state_" + $user_id})
            ON CREATE SET a.userId = $user_id,
                          a.recommended_next_mode = "WEEKLY",
                          a.active_homework = "3-Column Thought Record",
                          a.homework_streak = 0,
                          a.urgent_flag = false,
                          a.handoff_context = "",
                          a.updated_at = $now
            SET a.userId = $user_id
            MERGE (u)-[:HAS_STATE]->(a)
            """,
            {
                "user_id": user_id,
                "name": name,
                "baseline_anxiety": baseline_anxiety,
                "now": now,
            },
        )

        # Ensure the 3 dedicated user companions are directly connected to primary User node
        companions = [
            ("WEEKLY", "In-depth 45-minute structured weekly CBT psychotherapy companion"),
            ("DAILY", "5-minute daily CBT drill and practice companion for exercises and homework"),
            ("ON_DEMAND", "Immediate acute distress de-escalation, grounding, and panic support"),
        ]
        for c_mode, c_desc in companions:
            self.query(
                """
                MATCH (u:User {id: $user_id})
                MERGE (c:Companion {id: "companion_" + $user_id + "_" + $mode})
                ON CREATE SET c.mode = $mode, c.userId = $user_id, c.description = $desc + " for " + $user_id, c.last_active_at = $now
                SET c.userId = $user_id
                MERGE (u)-[:HAS_COMPANION]->(c)
                """,
                {"user_id": user_id, "mode": c_mode, "desc": c_desc, "now": now},
            )

    def get_agent_state(self, user_id: str) -> dict[str, Any]:
        """Retrieves the dedicated user state node read by companions before a session."""
        res = self.query(
            """
            MATCH (u:User {id: $user_id})-[:HAS_STATE]->(a:AgentState)
            OPTIONAL MATCH (a)-[:ACTIVE_HOMEWORK]->(ex:CBTExercise)
            RETURN a.recommended_next_mode, a.active_homework, a.homework_streak,
                   a.urgent_flag, a.handoff_context, a.updated_at, ex.name, r.target_days
            """,
            {"user_id": user_id},
        )
        if not res.result_set:
            return {}
        row = res.result_set[0]
        return {
            "recommended_next_mode": row[0],
            "active_homework": row[1],
            "homework_streak": row[2],
            "urgent_flag": row[3],
            "handoff_context": row[4],
            "updated_at": row[5],
            "homework_exercise_node": row[6],
            "homework_target_days": row[7],
        }

    def update_agent_state(
        self,
        user_id: str,
        recommended_next_mode: Optional[str] = None,
        active_homework: Optional[str] = None,
        homework_streak: Optional[int] = None,
        urgent_flag: Optional[bool] = None,
        handoff_context: Optional[str] = None,
        target_days: int = 7,
    ) -> None:
        """Updates the isolated AgentState and relinks ACTIVE_HOMEWORK strictly within user's tree."""
        now = int(time.time())
        params: dict[str, Any] = {"user_id": user_id, "now": now}
        set_clauses = ["a.updated_at = $now"]

        if recommended_next_mode is not None:
            params["rec_mode"] = recommended_next_mode
            set_clauses.append("a.recommended_next_mode = $rec_mode")
        if active_homework is not None:
            params["homework"] = active_homework
            set_clauses.append("a.active_homework = $homework")
        if homework_streak is not None:
            params["streak"] = homework_streak
            set_clauses.append("a.homework_streak = $streak")
        if urgent_flag is not None:
            params["urgent"] = urgent_flag
            set_clauses.append("a.urgent_flag = $urgent")
        if handoff_context is not None:
            params["context"] = handoff_context
            set_clauses.append("a.handoff_context = $context")

        set_sql = ", ".join(set_clauses)
        self.query(
            f"""
            MATCH (u:User {{id: $user_id}})-[:HAS_STATE]->(a:AgentState)
            SET {set_sql}
            """,
            params,
        )

        if active_homework:
            self.query(
                """
                MATCH (u:User {id: $user_id})-[:HAS_STATE]->(a:AgentState)
                OPTIONAL MATCH (a)-[old:ACTIVE_HOMEWORK]->()
                DELETE old
                WITH a, $user_id AS uid
                MERGE (ex:CBTExercise {id: "exercise_" + uid + "_" + $homework})
                ON CREATE SET ex.name = $homework, ex.userId = uid, ex.times_used = 0, ex.last_used_at = $now
                SET a.active_homework = $homework
                MERGE (a)-[:ACTIVE_HOMEWORK {assigned_at: $now, target_days: $target_days}]->(ex)
                """,
                {"user_id": user_id, "homework": active_homework, "now": now, "target_days": target_days},
            )

    # --------------------------------------------------------------------------
    # 3. SESSION & CHRONOLOGICAL SPINE (SCOPED PER USER, CONNECTED TO USER)
    # --------------------------------------------------------------------------
    def record_session(
        self,
        user_id: str,
        session_id: str,
        mode: str,
        started_at: int,
        ended_at: int,
        initial_mood: int = 5,
        final_mood: int = 5,
        summary: str = "",
        transcript_db_id: str = "",
    ) -> None:
        """Inserts a new Session node, connects it directly to Primary Node User via HAS_SESSION, and updates linked list."""
        # 1. Create the new session node, link to User-scoped Companion, and DIRECTLY to User via HAS_SESSION
        self.query(
            """
            MATCH (u:User {id: $user_id})
            MERGE (c:Companion {id: "companion_" + $user_id + "_" + $mode})
            ON CREATE SET c.mode = $mode, c.userId = $user_id, c.description = $mode + " Companion for " + $user_id, c.last_active_at = $started_at
            CREATE (s:Session {
                id: $session_id,
                userId: $user_id,
                mode: $mode,
                started_at: $started_at,
                ended_at: $ended_at,
                initial_mood: $initial_mood,
                final_mood: $final_mood,
                summary: $summary,
                transcript_db_id: $transcript_db_id
            })
            CREATE (s)-[:CONDUCTED_BY]->(c)
            MERGE (u)-[:HAS_SESSION]->(s)
            SET c.last_active_at = $ended_at, c.userId = $user_id
            """,
            {
                "user_id": user_id,
                "mode": mode,
                "session_id": session_id,
                "started_at": started_at,
                "ended_at": ended_at,
                "initial_mood": initial_mood,
                "final_mood": final_mood,
                "summary": summary,
                "transcript_db_id": transcript_db_id,
            },
        )

        # 2. Chronological linked list: connect previous latest session with NEXT_SESSION
        self.query(
            """
            MATCH (u:User {id: $user_id})
            MATCH (new_s:Session {id: $session_id, userId: $user_id})
            OPTIONAL MATCH (u)-[r:LATEST_SESSION]->(prev_s:Session {userId: $user_id})
            FOREACH (_ IN CASE WHEN prev_s IS NOT NULL THEN [1] ELSE [] END |
                CREATE (prev_s)-[:NEXT_SESSION {
                    hours_between: toFloat($started_at - prev_s.ended_at) / 3600.0
                }]->(new_s)
                DELETE r
            )
            MERGE (u)-[:LATEST_SESSION]->(new_s)
            """,
            {
                "user_id": user_id,
                "session_id": session_id,
                "started_at": started_at,
            },
        )

    # --------------------------------------------------------------------------
    # 4. HANDOFF MANAGEMENT (SCOPED PER USER)
    # --------------------------------------------------------------------------
    def create_handoff(
        self,
        session_id: str,
        handoff_id: str,
        from_mode: str,
        to_mode: str,
        reason: str,
        clinical_note: str,
    ) -> None:
        """Records an explicit cross-companion handoff strictly within user's isolated tree."""
        now = int(time.time())
        self.query(
            """
            MATCH (s:Session {id: $session_id})
            MERGE (from_c:Companion {id: "companion_" + s.userId + "_" + $from_mode})
            MERGE (to_c:Companion {id: "companion_" + s.userId + "_" + $to_mode})
            CREATE (h:Handoff {
                id: $handoff_id,
                userId: s.userId,
                from_mode: $from_mode,
                to_mode: $to_mode,
                reason: $reason,
                clinical_note: $clinical_note,
                status: "PENDING",
                timestamp: $now
            })
            CREATE (s)-[:CREATED_HANDOFF]->(h)
            CREATE (h)-[:FROM_COMPANION]->(from_c)
            CREATE (h)-[:TO_COMPANION]->(to_c)
            """,
            {
                "session_id": session_id,
                "handoff_id": handoff_id,
                "from_mode": from_mode,
                "to_mode": to_mode,
                "reason": reason,
                "clinical_note": clinical_note,
                "now": now,
            },
        )

    # --------------------------------------------------------------------------
    # 5. EPISODIC & SEMANTIC CBT MEMORY INSERTION (SCOPED PER USER)
    # --------------------------------------------------------------------------
    def record_episode(
        self,
        session_id: str,
        episode_id: str,
        situation: str,
        automatic_thought: str,
        emotion: str,
        intensity_before: int,
        intensity_after: int,
        reframed_thought: str,
        person_name: Optional[str] = None,
        person_role: Optional[str] = None,
        trigger_name: Optional[str] = None,
        trigger_category: str = "General",
        distortion_name: Optional[str] = None,
        core_belief_statement: Optional[str] = None,
        core_belief_category: str = "Worthlessness",
    ) -> None:
        """Records a distressing episode, linking to Person, Trigger, Distortion, and CoreBelief strictly within user's isolated tree."""
        now = int(time.time())

        # 1. Create Episode node linked to Session
        self.query(
            """
            MATCH (s:Session {id: $session_id})
            CREATE (e:Episode {
                id: $episode_id,
                userId: s.userId,
                situation: $situation,
                automatic_thought: $automatic_thought,
                emotion: $emotion,
                intensity_before: $intensity_before,
                intensity_after: $intensity_after,
                reframed_thought: $reframed_thought,
                timestamp: $now
            })
            CREATE (s)-[:CAPTURED_EPISODE]->(e)
            """,
            {
                "session_id": session_id,
                "episode_id": episode_id,
                "situation": situation,
                "automatic_thought": automatic_thought,
                "emotion": emotion,
                "intensity_before": intensity_before,
                "intensity_after": intensity_after,
                "reframed_thought": reframed_thought,
                "now": now,
            },
        )

        # 2. Link Person if present (scoped to userId)
        if person_name:
            self.query(
                """
                MATCH (e:Episode {id: $episode_id})
                MERGE (p:Person {id: "person_" + e.userId + "_" + $person_name})
                ON CREATE SET p.name = $person_name, p.userId = e.userId, p.role = $role, p.relationship_sentiment = "neutral", p.mention_count = 1
                ON MATCH SET p.mention_count = p.mention_count + 1, p.userId = e.userId
                CREATE (e)-[:INVOLVED_PERSON]->(p)
                """,
                {
                    "episode_id": episode_id,
                    "person_name": person_name.strip(),
                    "role": person_role or "Acquaintance",
                },
            )

        # 3. Link Trigger if present (scoped to userId)
        if trigger_name:
            self.query(
                """
                MATCH (e:Episode {id: $episode_id})
                MERGE (t:Trigger {id: "trigger_" + e.userId + "_" + $trigger_name})
                ON CREATE SET t.name = $trigger_name,
                              t.userId = e.userId,
                              t.category = $category,
                              t.avg_intensity = toFloat($intensity_before),
                              t.mention_count = 1
                ON MATCH SET t.avg_intensity = (t.avg_intensity + toFloat($intensity_before)) / 2.0,
                             t.mention_count = t.mention_count + 1,
                             t.userId = e.userId
                CREATE (e)-[:SPARKED_BY]->(t)
                """,
                {
                    "episode_id": episode_id,
                    "trigger_name": trigger_name.strip(),
                    "category": trigger_category,
                    "intensity_before": intensity_before,
                },
            )

        # 4. Link Person <-> Trigger co-occurrence (within user's tree)
        if person_name and trigger_name:
            self.query(
                """
                MATCH (e:Episode {id: $episode_id})
                MATCH (p:Person {id: "person_" + e.userId + "_" + $person_name})
                MATCH (t:Trigger {id: "trigger_" + e.userId + "_" + $trigger_name})
                MERGE (p)-[r:ASSOCIATED_WITH_TRIGGER]->(t)
                ON CREATE SET r.co_occurrence_count = 1
                ON MATCH SET r.co_occurrence_count = r.co_occurrence_count + 1
                """,
                {"episode_id": episode_id, "person_name": person_name.strip(), "trigger_name": trigger_name.strip()},
            )

        # 5. Link Cognitive Distortion if identified (scoped to userId)
        if distortion_name:
            self.query(
                """
                MATCH (e:Episode {id: $episode_id})
                MERGE (cd:CognitiveDistortion {id: "distortion_" + e.userId + "_" + $distortion_name})
                ON CREATE SET cd.name = $distortion_name, cd.userId = e.userId, cd.occurrence_count = 1, cd.example_quote = $thought
                ON MATCH SET cd.occurrence_count = cd.occurrence_count + 1, cd.userId = e.userId
                CREATE (e)-[:EXHIBITED_DISTORTION]->(cd)
                """,
                {
                    "episode_id": episode_id,
                    "distortion_name": distortion_name.strip(),
                    "thought": automatic_thought,
                },
            )

            # Trigger -> Distortion weight (scoped to userId)
            if trigger_name:
                self.query(
                    """
                    MATCH (e:Episode {id: $episode_id})
                    MATCH (t:Trigger {id: "trigger_" + e.userId + "_" + $trigger_name})
                    MATCH (cd:CognitiveDistortion {id: "distortion_" + e.userId + "_" + $distortion_name})
                    MERGE (t)-[r:ACTIVATES_DISTORTION]->(cd)
                    ON CREATE SET r.weight = 1
                    ON MATCH SET r.weight = r.weight + 1
                    """,
                    {"episode_id": episode_id, "trigger_name": trigger_name.strip(), "distortion_name": distortion_name.strip()},
                )

        # 6. Link Core Belief if discovered (scoped to userId)
        if core_belief_statement and distortion_name:
            self.query(
                """
                MATCH (e:Episode {id: $episode_id})
                MATCH (cd:CognitiveDistortion {id: "distortion_" + e.userId + "_" + $distortion_name})
                MERGE (cb:CoreBelief {id: "belief_" + e.userId + "_" + $statement})
                ON CREATE SET cb.statement = $statement, cb.userId = e.userId, cb.category = $category, cb.strength_score = 0.8
                SET cb.userId = e.userId
                MERGE (cd)-[:ROOTED_IN]->(cb)
                """,
                {
                    "episode_id": episode_id,
                    "distortion_name": distortion_name.strip(),
                    "statement": core_belief_statement.strip(),
                    "category": core_belief_category,
                },
            )

    def record_daily_practice(
        self,
        session_id: str,
        practice_id: str,
        exercise_name: str,
        user_reflection: str,
        completed: bool,
        mood_before: int,
        mood_after: int,
        friction_note: str = "",
    ) -> None:
        """Records a 5-minute daily drill from the DAILY companion strictly within user's isolated tree."""
        now = int(time.time())

        self.query(
            """
            MATCH (s:Session {id: $session_id})
            MERGE (ex:CBTExercise {id: "exercise_" + s.userId + "_" + $exercise_name})
            ON CREATE SET ex.name = $exercise_name, ex.userId = s.userId, ex.times_used = 1, ex.last_used_at = $now
            ON MATCH SET ex.times_used = ex.times_used + 1, ex.last_used_at = $now, ex.userId = s.userId
            CREATE (d:DailyPractice {
                id: $practice_id,
                userId: s.userId,
                exercise_name: $exercise_name,
                user_reflection: $user_reflection,
                completed: $completed,
                mood_before: $mood_before,
                mood_after: $mood_after,
                friction_note: $friction_note,
                timestamp: $now
            })
            CREATE (s)-[:LOGGED_PRACTICE]->(d)
            CREATE (d)-[:PRACTICED_EXERCISE]->(ex)
            """,
            {
                "session_id": session_id,
                "practice_id": practice_id,
                "exercise_name": exercise_name.strip(),
                "user_reflection": user_reflection,
                "completed": completed,
                "mood_before": mood_before,
                "mood_after": mood_after,
                "friction_note": friction_note,
                "now": now,
            },
        )

    # --------------------------------------------------------------------------
    # 6. PROCEDURAL RULES & PERSONALIZATION (SCOPED PER USER)
    # --------------------------------------------------------------------------
    def add_therapist_rule(
        self,
        user_id: str,
        rule: str,
        confidence: float = 0.9,
        learned_from_mode: str = "WEEKLY",
    ) -> None:
        """Adds a personalized rule/constraint strictly for this user (isolated node)."""
        self.query(
            """
            MATCH (u:User {id: $user_id})
            MERGE (r:TherapistRule {id: "rule_" + $user_id + "_" + $rule})
            ON CREATE SET r.rule = $rule, r.userId = $user_id, r.confidence = $confidence, r.learned_from_mode = $mode
            MERGE (u)-[:PREFERS_RULE]->(r)
            """,
            {
                "user_id": user_id,
                "rule": rule.strip(),
                "confidence": confidence,
                "mode": learned_from_mode,
            },
        )

    # --------------------------------------------------------------------------
    # 7. ON-THE-SPOT TURN-BASED RETRIEVAL (1-2 HOP)
    # --------------------------------------------------------------------------
    def recall_memory_on_spot(self, user_id: str, query_topic: str) -> str:
        """Called live during an agent turn when a user mentions a person, trigger, event, past incident, or homework."""
        topic_clean = query_topic.strip().lower()
        if not topic_clean:
            return "No topic specified for memory recall."

        facts: list[str] = []

        # 1. Homework / State Query Check
        hw_keywords = [
            "homework",
            "exercise",
            "practice",
            "task",
            "goal",
            "plan",
            "assignment",
            "streak",
        ]
        if any(w in topic_clean for w in hw_keywords):
            state_res = self.query(
                """
                MATCH (u:User {id: $uid})-[:HAS_STATE]->(a:AgentState)
                OPTIONAL MATCH (a)-[r:ACTIVE_HOMEWORK]->(ex:CBTExercise)
                RETURN a.active_homework, a.homework_streak, a.handoff_context, ex.instructions, r.target_days
                """,
                {"uid": user_id},
            )
            if state_res.result_set and state_res.result_set[0][0]:
                row = state_res.result_set[0]
                facts.append(
                    f"- Active Homework: '{row[0]}' (Streak: {row[1]} days, Target: {row[4] or 7} days)"
                )
                if row[3]:
                    facts.append(f"  * Instructions: {row[3]}")
                if row[2]:
                    facts.append(f"  * Clinical Handoff Note: {row[2]}")

        # 2. Episode / Incident Search across ALL sessions in user's history
        ep_cypher = """
        MATCH (u:User {id: $uid})-[:HAS_SESSION]->(s:Session)-[:CAPTURED_EPISODE]->(e:Episode)
        WHERE toLower(e.situation) CONTAINS $topic
           OR toLower(e.automatic_thought) CONTAINS $topic
           OR toLower(coalesce(e.reframed_thought, "")) CONTAINS $topic
           OR toLower(e.emotion) CONTAINS $topic
        OPTIONAL MATCH (e)-[:INVOLVED_PERSON]->(p:Person)
        OPTIONAL MATCH (e)-[:SPARKED_BY]->(t:Trigger)
        OPTIONAL MATCH (e)-[:EXHIBITED_DISTORTION]->(cd:CognitiveDistortion)
        OPTIONAL MATCH (cd)-[:ROOTED_IN]->(cb:CoreBelief)
        RETURN e.situation, e.automatic_thought, e.emotion, e.reframed_thought,
               p.name, p.role, t.name, cd.name, cb.statement
        ORDER BY e.timestamp DESC
        LIMIT 3
        """
        ep_res = self.query(ep_cypher, {"uid": user_id, "topic": topic_clean})
        if ep_res.result_set:
            for r in ep_res.result_set:
                p_str = f" [Person involved: {r[4]} ({r[5]})]" if r[4] else ""
                t_str = f" [Trigger: {r[6]}]" if r[6] else ""
                d_str = f" [Distortion: {r[7]}]" if r[7] else ""
                cb_str = f" [Core Belief: {r[8]}]" if r[8] else ""
                facts.append(f"- Recorded Episode: {r[0]}{p_str}{t_str}")
                facts.append(f"  * Automatic Thought: \"{r[1]}\"{d_str}{cb_str}")
                if r[3] and r[3] != "N/A":
                    facts.append(f"  * Reframed Thought: \"{r[3]}\"")

        # 3. Session Summaries across user history (e.g., past coping discussions, earlier insights)
        sess_cypher = """
        MATCH (u:User {id: $uid})-[:HAS_SESSION]->(s:Session)
        WHERE toLower(s.summary) CONTAINS $topic
        RETURN s.summary
        ORDER BY s.started_at DESC
        LIMIT 2
        """
        s_res = self.query(sess_cypher, {"uid": user_id, "topic": topic_clean})
        if s_res.result_set:
            for r in s_res.result_set:
                facts.append(f"- Prior Session Record: \"{r[0]}\"")

        # 4. CBT Exercises & Procedural Playbook (Layer D - scoped to user's tree)
        ex_cypher = """
        MATCH (ex:CBTExercise {userId: $uid})
        WHERE toLower(ex.name) CONTAINS $topic
           OR toLower(coalesce(ex.instructions, "")) CONTAINS $topic
        RETURN ex.name, ex.target_mode, ex.instructions
        LIMIT 2
        """
        ex_res = self.query(ex_cypher, {"uid": user_id, "topic": topic_clean})
        if ex_res.result_set:
            for r in ex_res.result_set:
                facts.append(f"- CBT Exercise '{r[0]}' (Mode: {r[1]}): {r[2]}")

        # 5. Session Ordinal / First Session / Past Session by Number lookup
        first_session_triggers = [
            "first session",
            "session 1",
            "session one",
            "earliest session",
            "beginning",
            "first time we spoke",
            "initial session",
            "started therapy",
        ]
        if any(w in topic_clean for w in first_session_triggers):
            first_res = self.query(
                """
                MATCH (u:User {id: $uid})-[:HAS_SESSION]->(s:Session)
                OPTIONAL MATCH (s)-[:CAPTURED_EPISODE]->(e:Episode)
                OPTIONAL MATCH (e)-[:INVOLVED_PERSON]->(p:Person)
                OPTIONAL MATCH (e)-[:SPARKED_BY]->(t:Trigger)
                OPTIONAL MATCH (e)-[:EXHIBITED_DISTORTION]->(cd:CognitiveDistortion)
                RETURN s.id, s.summary, s.started_at, e.situation, e.automatic_thought, e.emotion, e.reframed_thought, p.name, t.name, cd.name
                ORDER BY s.started_at ASC
                LIMIT 1
                """,
                {"uid": user_id},
            )
            if first_res.result_set:
                r = first_res.result_set[0]
                facts.append(f"- First Therapy Session Record ({r[0]}): \"{r[1]}\"")
                if r[3]:
                    p_str = f" [Person: {r[7]}]" if r[7] else ""
                    t_str = f" [Trigger: {r[8]}]" if r[8] else ""
                    facts.append(f"  * Episode: {r[3]}{p_str}{t_str}")
                if r[4]:
                    facts.append(f"  * Automatic Thought: \"{r[4]}\"")
                if r[6] and r[6] != "N/A":
                    facts.append(f"  * Rational Reframe: \"{r[6]}\"")

        # Specific session number match like "session 2", "session 3", "session 5", etc.
        sess_num_match = re.search(r"session\s*(\d+)", topic_clean)
        if sess_num_match and not any(w in topic_clean for w in first_session_triggers):
            s_num = int(sess_num_match.group(1))
            formatted_sid = f"session_{s_num:02d}"
            num_res = self.query(
                """
                MATCH (u:User {id: $uid})-[:HAS_SESSION]->(s:Session {id: $sid})
                OPTIONAL MATCH (s)-[:CAPTURED_EPISODE]->(e:Episode)
                OPTIONAL MATCH (e)-[:INVOLVED_PERSON]->(p:Person)
                OPTIONAL MATCH (e)-[:SPARKED_BY]->(t:Trigger)
                OPTIONAL MATCH (e)-[:EXHIBITED_DISTORTION]->(cd:CognitiveDistortion)
                RETURN s.id, s.summary, e.situation, e.automatic_thought, e.emotion, e.reframed_thought, p.name, t.name, cd.name
                LIMIT 1
                """,
                {"uid": user_id, "sid": formatted_sid},
            )
            if num_res.result_set:
                r = num_res.result_set[0]
                facts.append(f"- Session {s_num} Record ({r[0]}): \"{r[1]}\"")
                if r[2]:
                    p_str = f" [Person: {r[6]}]" if r[6] else ""
                    t_str = f" [Trigger: {r[7]}]" if r[7] else ""
                    facts.append(f"  * Episode: {r[2]}{p_str}{t_str}")
                if r[3]:
                    facts.append(f"  * Automatic Thought: \"{r[3]}\"")
                if r[5] and r[5] != "N/A":
                    facts.append(f"  * Rational Reframe: \"{r[5]}\"")

        # 6. Broad Recall Fallback (e.g. "past incident", "what happened", "remember", "earlier", "history", "assault", "trauma")
        broad_keywords = [
            "incident",
            "past",
            "history",
            "earlier",
            "remember",
            "before",
            "last time",
            "what happened",
            "about me",
            "trauma",
        ]
        if any(kw in topic_clean for kw in broad_keywords) and not facts:
            broad_res = self.query(
                """
                MATCH (u:User {id: $uid})-[:HAS_SESSION]->(s:Session)-[:CAPTURED_EPISODE]->(e:Episode)
                OPTIONAL MATCH (e)-[:INVOLVED_PERSON]->(p:Person)
                OPTIONAL MATCH (e)-[:SPARKED_BY]->(t:Trigger)
                OPTIONAL MATCH (e)-[:EXHIBITED_DISTORTION]->(cd:CognitiveDistortion)
                RETURN e.situation, e.automatic_thought, e.emotion, e.reframed_thought, p.name, t.name, cd.name
                ORDER BY e.timestamp DESC
                LIMIT 3
                """,
                {"uid": user_id},
            )
            for r in broad_res.result_set:
                p_str = f" (Involved: {r[4]})" if r[4] else ""
                t_str = f" [Trigger: {r[5]}]" if r[5] else ""
                facts.append(f"- Past Episode: {r[0]}{p_str}{t_str} (Emotion: {r[2]})")
                facts.append(f"  * Thought: \"{r[1]}\"")
                if r[3] and r[3] != "N/A":
                    facts.append(f"  * Reframed Thought: \"{r[3]}\"")

            sess_res = self.query(
                """
                MATCH (u:User {id: $uid})-[:LATEST_SESSION]->(s:Session)
                RETURN s.summary
                """,
                {"uid": user_id},
            )
            if sess_res.result_set and sess_res.result_set[0][0]:
                facts.append(f"- Recent Session Summary: \"{sess_res.result_set[0][0]}\"")

        # 6. Semantic Entity Network (strictly scoped to this user across history)
        ent_cypher = """
        MATCH (u:User {id: $uid})-[:HAS_SESSION]->(s:Session)-[:CAPTURED_EPISODE]->(e:Episode)-[*1..2]->(node)
        WHERE (node:Person OR node:Trigger OR node:CognitiveDistortion OR node:CoreBelief)
          AND (toLower(coalesce(node.name, "")) CONTAINS $topic OR toLower(coalesce(node.statement, "")) CONTAINS $topic)
        OPTIONAL MATCH (node)-[r]-(neighbor)
        WHERE NOT neighbor:User AND NOT neighbor:AgentState AND NOT neighbor:Session
        RETURN labels(node)[0] AS type,
               coalesce(node.name, node.statement) AS entity,
               type(r) AS relationship,
               labels(neighbor)[0] AS neighbor_type,
               coalesce(neighbor.name, neighbor.statement, neighbor.situation) AS neighbor_entity
        LIMIT 4
        """
        ent_res = self.query(ent_cypher, {"uid": user_id, "topic": topic_clean})
        if ent_res.result_set:
            for r in ent_res.result_set:
                node_type, entity, rel, n_type, n_entity = (
                    r[0],
                    r[1],
                    r[2],
                    r[3],
                    r[4],
                )
                if rel and n_entity:
                    facts.append(
                        f"- {node_type} '{entity}' --[{rel}]--> {n_type} '{n_entity}'"
                    )
                else:
                    facts.append(f"- {node_type} '{entity}'")

        # 5. Personalized Rules (Layer D)
        # Only attach rules if relevant facts were found or if topic directly asks about rules
        if facts or any(w in topic_clean for w in ["rule", "guideline", "constraint", "technique"]):
            rules_res = self.query(
                """
                MATCH (u:User {id: $uid})-[:PREFERS_RULE]->(r:TherapistRule)
                RETURN r.rule
                LIMIT 2
                """,
                {"uid": user_id},
            )
            if rules_res.result_set:
                for r_row in rules_res.result_set:
                    facts.append(f"- Therapist Rule: {r_row[0]}")

        if not facts:
            return f"No specific therapeutic memory found in FalkorDB regarding '{query_topic}' for patient {user_id}."

        return "\n".join(facts)

    # --------------------------------------------------------------------------
    # 8. SESSION-START RETRIEVAL SYSTEM (BOOTSTRAP MEMORY)
    # --------------------------------------------------------------------------
    def get_session_start_context(self, user_id: str) -> dict[str, Any]:
        """Retrieves all 4 layers of CBT memory for the user from FalkorDB at session start."""
        # 1. User details
        user_res = self.query(
            "MATCH (u:User {id: $uid}) RETURN u.name, u.baseline_anxiety, u.created_at",
            {"uid": user_id},
        )
        user_data: dict[str, Any] = {}
        if user_res.result_set:
            row = user_res.result_set[0]
            user_data = {
                "name": row[0] or user_id,
                "baseline_anxiety": row[1] if row[1] is not None else 5,
                "created_at": row[2],
            }

        # 2. AgentState & Active Homework (Layer A)
        state_res = self.query(
            """
            MATCH (u:User {id: $uid})-[:HAS_STATE]->(a:AgentState)
            OPTIONAL MATCH (a)-[r:ACTIVE_HOMEWORK]->(ex:CBTExercise)
            RETURN a.recommended_next_mode, a.active_homework, a.homework_streak,
                   a.urgent_flag, a.handoff_context, a.updated_at, ex.name, ex.instructions, r.target_days
            """,
            {"uid": user_id},
        )
        state_data: dict[str, Any] = {}
        if state_res.result_set:
            s_row = state_res.result_set[0]
            state_data = {
                "recommended_next_mode": s_row[0] or "WEEKLY",
                "active_homework": s_row[1] or "3-Column Thought Record",
                "homework_streak": s_row[2] or 0,
                "urgent_flag": bool(s_row[3]),
                "handoff_context": s_row[4] or "",
                "updated_at": s_row[5],
                "exercise_name": s_row[6],
                "exercise_instructions": s_row[7],
                "target_days": s_row[8] or 7,
            }

        # 3. Latest Session (Layer A)
        sess_res = self.query(
            """
            MATCH (u:User {id: $uid})-[:LATEST_SESSION]->(s:Session)
            OPTIONAL MATCH (s)-[:CONDUCTED_BY]->(c:Companion)
            RETURN s.id, s.mode, s.started_at, s.ended_at, s.initial_mood, s.final_mood, s.summary, c.mode
            """,
            {"uid": user_id},
        )
        latest_session: dict[str, Any] = {}
        if sess_res.result_set:
            row = sess_res.result_set[0]
            latest_session = {
                "id": row[0],
                "mode": row[1],
                "started_at": row[2],
                "ended_at": row[3],
                "initial_mood": row[4],
                "final_mood": row[5],
                "summary": row[6],
                "companion_mode": row[7],
            }

        # 4. Episodes from latest session (Layer B & C)
        episodes: list[dict[str, Any]] = []
        ep_res = self.query(
            """
            MATCH (u:User {id: $uid})-[:LATEST_SESSION]->(s:Session)
            OPTIONAL MATCH (s)-[:CAPTURED_EPISODE]->(e:Episode)
            OPTIONAL MATCH (e)-[:INVOLVED_PERSON]->(p:Person)
            OPTIONAL MATCH (e)-[:SPARKED_BY]->(t:Trigger)
            OPTIONAL MATCH (e)-[:EXHIBITED_DISTORTION]->(cd:CognitiveDistortion)
            OPTIONAL MATCH (cd)-[:ROOTED_IN]->(cb:CoreBelief)
            RETURN e.situation, e.automatic_thought, e.emotion, e.intensity_before, e.intensity_after,
                   e.reframed_thought, p.name, p.role, t.name, cd.name, cb.statement
            LIMIT 5
            """,
            {"uid": user_id},
        )
        for row in ep_res.result_set:
            if row[0]:  # situation
                episodes.append({
                    "situation": row[0],
                    "automatic_thought": row[1],
                    "emotion": row[2],
                    "intensity_before": row[3],
                    "intensity_after": row[4],
                    "reframed_thought": row[5],
                    "person": f"{row[6]} ({row[7]})" if row[6] else None,
                    "trigger": row[8],
                    "distortion": row[9],
                    "core_belief": row[10],
                })

        # 5. Personalized Rules (Layer D)
        rules: list[str] = []
        rule_res = self.query(
            """
            MATCH (u:User {id: $uid})-[:PREFERS_RULE]->(r:TherapistRule)
            RETURN r.rule, r.confidence, r.learned_from_mode
            LIMIT 5
            """,
            {"uid": user_id},
        )
        for row in rule_res.result_set:
            if row[0]:
                rules.append(row[0])

        # 6. Overall Triggers & Persons for this user (Layer C - traversing user tree)
        triggers_res = self.query(
            """
            MATCH (u:User {id: $uid})-[:HAS_SESSION]->(s:Session)-[:CAPTURED_EPISODE]->(e:Episode)-[:SPARKED_BY]->(t:Trigger)
            RETURN DISTINCT t.name, t.category, t.avg_intensity
            LIMIT 5
            """,
            {"uid": user_id},
        )
        triggers = [
            f"{r[0]} ({r[1]}, avg intensity: {round(r[2] or 0, 1)})"
            for r in triggers_res.result_set
            if r[0]
        ]

        persons_res = self.query(
            """
            MATCH (u:User {id: $uid})-[:HAS_SESSION]->(s:Session)-[:CAPTURED_EPISODE]->(e:Episode)-[:INVOLVED_PERSON]->(p:Person)
            RETURN DISTINCT p.name, p.role, p.relationship_sentiment
            LIMIT 5
            """,
            {"uid": user_id},
        )
        persons = [
            f"{r[0]} ({r[1]} - {r[2]})" for r in persons_res.result_set if r[0]
        ]

        is_new = not bool(latest_session or episodes or state_data.get("handoff_context"))

        return {
            "user": user_data,
            "state": state_data,
            "latest_session": latest_session,
            "episodes": episodes,
            "rules": rules,
            "triggers": triggers,
            "persons": persons,
            "is_new_patient": is_new,
        }

    def format_session_start_prompt(self, user_id: str, mode: str = "WEEKLY") -> str:
        """Formats the retrieved FalkorDB graph memory into a structured clinical brief tailored to the agent's role mode (WEEKLY, DAILY, or COMPANION)."""
        ctx = self.get_session_start_context(user_id)
        mode_upper = mode.upper() if mode else "WEEKLY"

        if ctx.get("is_new_patient"):
            if mode_upper == "DAILY":
                return (
                    f"# RETRIEVED PATIENT THERAPEUTIC GRAPH MEMORY (From FalkorDB)\n"
                    f"- Patient ID: {user_id}\n"
                    f"- Role Mode: DAILY EXERCISE COACH\n"
                    f"- Status: NEW PATIENT. No prior exercise history.\n"
                    f"- Directive: Warmly introduce today's initial CBT exercise (e.g., Identifying Automatic Thoughts or 3-Minute Breathing Space) and guide them through it step-by-step."
                )
            elif mode_upper == "COMPANION":
                return (
                    f"# RETRIEVED PATIENT THERAPEUTIC GRAPH MEMORY (From FalkorDB)\n"
                    f"- Patient ID: {user_id}\n"
                    f"- Role Mode: ON-DEMAND COMPANION\n"
                    f"- Status: NEW PATIENT. No prior records.\n"
                    f"- Directive: Offer an immediate, gentle, safe space. Ask what's on their mind in this exact moment without pressure."
                )
            else:
                return (
                    f"# RETRIEVED PATIENT THERAPEUTIC GRAPH MEMORY (From FalkorDB)\n"
                    f"- Patient ID: {user_id}\n"
                    f"- Role Mode: WEEKLY MAIN THERAPIST\n"
                    f"- Status: BRAND NEW PATIENT. No prior therapy records in FalkorDB.\n"
                    f"- Directive: Conduct a welcoming, warm initial CBT assessment. Gently explore what brings them in today."
                )

        state = ctx.get("state", {})
        session = ctx.get("latest_session", {})
        episodes = ctx.get("episodes", [])
        rules = ctx.get("rules", [])
        triggers = ctx.get("triggers", [])
        persons = ctx.get("persons", [])
        urgent = state.get("urgent_flag", False)

        lines = [
            f"# RETRIEVED PATIENT THERAPEUTIC GRAPH MEMORY (From FalkorDB - Role: {mode_upper})",
            f"You are conducting a {mode_upper} CBT session for this patient. Here is the verified therapeutic history retrieved from FalkorDB:",
            "",
            "## 1. Patient State & Care Continuity:",
            f"- Patient ID: {user_id}",
            f"- Active Session Role: {mode_upper}",
            f"- Assigned Active Homework: {state.get('active_homework', 'None')} (Current streak: {state.get('homework_streak', 0)} days)",
        ]

        if urgent:
            lines.append(
                "- [URGENT ATTENTION] URGENT ESCALATION FLAG: TRUE. Acute distress or critical safety concern was flagged in the previous session."
            )

        if state.get("handoff_context"):
            lines.append(
                f"- Clinical Handoff Note from Prior Session:\n  \"{state['handoff_context']}\""
            )

        if session.get("summary"):
            lines.extend([
                "",
                "## 2. Last Completed Session:",
                f"- Mode: {session.get('mode', 'N/A')}",
                f"- Mood Score Shift: {session.get('initial_mood', '?')}/10 -> {session.get('final_mood', '?')}/10",
                f"- Clinical Summary: \"{session.get('summary')}\"",
            ])

        if episodes:
            lines.extend(["", "## 3. Key Episodes & Distortions Previously Explored:"])
            for ep in episodes:
                p_str = f" [Person: {ep['person']}]" if ep.get("person") else ""
                t_str = f" [Trigger: {ep['trigger']}]" if ep.get("trigger") else ""
                d_str = f" [Distortion: {ep['distortion']}]" if ep.get("distortion") else ""
                cb_str = f" [Core Belief: {ep['core_belief']}]" if ep.get("core_belief") else ""
                lines.append(f"- Situation: {ep['situation']}{p_str}{t_str}")
                if ep.get("automatic_thought"):
                    lines.append(
                        f"  * Automatic Thought: \"{ep['automatic_thought']}\"{d_str}{cb_str}"
                    )
                if ep.get("reframed_thought") and ep["reframed_thought"] != "N/A":
                    lines.append(f"  * Reframed Thought: \"{ep['reframed_thought']}\"")

        if persons or triggers:
            lines.extend(["", "## 4. Known Relationships & Key Triggers:"])
            if persons:
                lines.append(f"- People in patient's world: {', '.join(persons)}")
            if triggers:
                lines.append(f"- Known triggers: {', '.join(triggers)}")

        if rules:
            lines.extend(["", "## 5. Personalized Therapist Rules:"])
            for r in rules:
                lines.append(f"- {r}")

        lines.extend([
            "",
            f"## 6. ROLE DIRECTIVE ({mode_upper}):",
        ])
        if urgent:
            lines.append(
                "- CRITICAL DIRECTIVE: An urgent flag is active from last session. Greet the patient with immediate warmth and empathy. Gently check in on their safety and how they are holding up right now."
            )
        elif mode_upper == "DAILY":
            lines.append(
                f"- DAILY COACH DIRECTIVE: Focus specifically on today's active practice ({state.get('active_homework', 'their daily CBT exercise')}). Current streak: {state.get('homework_streak', 0)} days. Ask how today's exercise went, or invite them to practice an exercise together right now step-by-step."
            )
        elif mode_upper == "COMPANION":
            lines.append(
                "- COMPANION DIRECTIVE: Provide immediate emotional presence and decompression. Focus on what they are feeling right now in this exact moment. Guide grounding if they feel anxious. Do not assign homework or demand structured clinical tracking."
            )
        else:
            lines.append(
                f"- WEEKLY THERAPIST DIRECTIVE: Welcome the patient back warmly. Naturally acknowledge continuity from your last session. Review the past 7 days, follow up on their active homework ({state.get('active_homework', 'their exercises')}), and set the weekly agenda."
            )
        lines.append(
            "- REMINDER: Do NOT recite this raw report aloud. Speak conversationally and empathetically as a seasoned therapist who knows their patient."
        )

        return "\n".join(lines)


# Global singleton instance
graph_memory = GraphMemoryManager()


if __name__ == "__main__":
    logging.basicConfig(level=logging.INFO)
    print("Initializing FalkorDB therapy memory schema...")
    graph_memory.init_schema()
    print("Schema initialized successfully!")

    # Verify seed data
    counts = graph_memory.query(
        "MATCH (n) RETURN labels(n)[0] AS label, count(n) AS count ORDER BY count DESC"
    )
    print("\nNode Counts:")
    for row in counts.result_set:
        print(f"  - {row[0]}: {row[1]}")
