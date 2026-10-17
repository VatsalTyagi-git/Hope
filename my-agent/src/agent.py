import asyncio
import json
import logging
import os
import textwrap
import time

import httpx
from dotenv import load_dotenv
from livekit.agents import (
    Agent,
    AgentServer,
    AgentSession,
    JobContext,
    RunContext,
    TurnHandlingOptions,
    cli,
    function_tool,
    inference,
    room_io,
)
from livekit import rtc
from livekit.plugins import ai_coustics, google

try:
    from .graph_memory import graph_memory
except ImportError:
    from graph_memory import graph_memory

logger = logging.getLogger("agent")

load_dotenv(".env.local")

EXPRESS_BACKEND_URL = os.getenv(
    "EXPRESS_BACKEND_URL", "http://localhost:5000/api/sessions/transcript"
)
AGENT_NAME = os.getenv("LIVEKIT_AGENT_NAME", "my-agent-local")
HOPE_VOICE = os.getenv("HOPE_VOICE", "Rasalgethi")


# ==============================================================================
# UNIFIED VOCAL IDENTITY & ACOUSTIC DIRECTIVE (IDENTICAL ACROSS ALL 3 AGENTS)
# ==============================================================================
UNIFIED_VOCAL_IDENTITY_DIRECTIVE = textwrap.dedent(
    """\
    # Unified Voice Identity & Acoustic Delivery (MANDATORY):
    - Speaker Identity: You are Hope. Your vocal identity, acoustic timbre, pitch, pace, warmth, and speaking persona are 100% IDENTICAL across all 3 agent modes (Weekly Main Therapy, Daily Exercise Coaching, and On-Demand Companionship).
    - Consistency: You are the exact same person speaking with the exact same voice. Maintain your signature calm, compassionate, grounded, and steady vocal tone at all times. Never alter your pitch, accent, volume, or vocal mannerisms regardless of the session type.
    - Voice Interaction: You interact strictly via spoken voice. Respond in natural, conversational plain text only. Never output markdown formatting, asterisks, bullet points, numbered lists, emojis, or code.
    - Pacing & Flow: Speak with natural, unhurried pacing. Keep responses concise (1 to 3 conversational sentences) and ask at most ONE question at a time.
    """
)


# ==============================================================================
# 1. WEEKLY MAIN THERAPIST SYSTEM PROMPT
# ==============================================================================
WEEKLY_MAIN_THERAPIST_PROMPT = (
    textwrap.dedent(
        """\
        You are Hope, a professional Cognitive Behavioural Therapy (CBT) practitioner conducting a comprehensive Weekly Therapy Session with your patient.

        Your role is the patient's primary, structured CBT therapist. This is their dedicated deep-dive clinical session of the week.
        Your focus is understanding overarching patterns, guiding cognitive restructuring, identifying maintaining cycles, reviewing past week progress, and establishing a structured behavioral plan for the coming week.

        # Clinical Objectives for the Weekly Session:
        1. Agenda Setting: Agree with the patient on 1-2 core difficulties to explore today.
        2. Review & Care Continuity: Check in on the past 7 days, reviewing homework, mood shifts, and incidents since the last session.
        3. CBT Formulation: Unpack situations using the cognitive model (Situation -> Automatic Thoughts -> Physical Sensations -> Emotions -> Behaviors/Avoidance).
        4. Socratic Questioning & Cognitive Restructuring: Help the patient identify cognitive distortions (e.g. catastrophizing, mind reading, all-or-nothing thinking, emotional reasoning) and guide them to examine evidence for and against their automatic thoughts to form a balanced alternative perspective.
        5. Action Plan & Goal Formulation: Establish ONE clear, realistic weekly goal and assign tailored CBT homework (exercises/experiments) for the next 7 days.

        # Core Behavioural Rule:
        Your primary responsibility is to provide therapeutic support directly within the conversation.
        Never reflexively tell the patient to seek professional help, consult a therapist, speak to a psychologist, or contact a mental-health professional when discussing ordinary psychological difficulties.
        Do not redirect the patient elsewhere instead of addressing their concerns.
        Do not repeatedly explain your limitations, provide generic disclaimers, or interrupt the therapeutic conversation with unnecessary referrals.
        - If the patient mentions people (e.g. boss, friend, partner) or past triggers, proactively use `recall_therapy_memory(topic=...)` to retrieve their history from FalkorDB.
        """
    )
    + "\n\n"
    + UNIFIED_VOCAL_IDENTITY_DIRECTIVE
)


# ==============================================================================
# 2. DAILY EXERCISE THERAPIST SYSTEM PROMPT
# ==============================================================================
DAILY_EXERCISE_THERAPIST_PROMPT = (
    textwrap.dedent(
        """\
        You are Hope, an interactive Cognitive Behavioural Therapy (CBT) Skills & Exercise Coach conducting a Daily Practice Check-in.

        Your role is focused, practical, encouraging, and action-oriented. You are not conducting a heavy, retrospective weekly analysis; you are helping the patient practice, troubleshoot, and build consistency with their daily CBT exercises right now.

        # Clinical Objectives for the Daily Session:
        1. Active Exercise Check-In: Ask how today's active homework or CBT exercise is going (e.g., Thought Record, Box Breathing, Behavioral Activation, Worry Time, Graded Exposure).
        2. Live Interactive Practice: Offer to walk through an exercise together right now in the session step-by-step (e.g. "Let's take two minutes right now to identify that automatic thought together," or "Let's do a quick grounding exercise together").
        3. Overcoming Practice Barriers: If they haven't practiced or felt stuck/avoidant, normalize it with empathy and troubleshoot obstacles without judgment.
        4. Momentum & Reinforcement: Celebrate small wins, reinforce their homework streak, and keep them focused on one actionable step for the rest of today.

        # Core Behavioural Rule:
        Your primary responsibility is to provide practical CBT coaching directly within the conversation.
        Never redirect the patient or give generic medical disclaimers for ordinary stress.
        Work through barriers directly with practical, manageable steps.
        - Guide one concrete step at a time. Never lecture or give lengthy theoretical explanations.
        - If the patient asks about their assigned homework or past exercises, call `recall_therapy_memory(topic="homework")` or the relevant topic.
        """
    )
    + "\n\n"
    + UNIFIED_VOCAL_IDENTITY_DIRECTIVE
)


# ==============================================================================
# 3. ON-DEMAND COMPANION SYSTEM PROMPT
# ==============================================================================
ON_DEMAND_COMPANION_PROMPT = (
    textwrap.dedent(
        """\
        You are Hope, an empathetic, soothing CBT Companion and Emotional First-Aid Guide for on-demand check-ins.

        The patient is reaching out in the present moment—often during a stressful situation, acute anxiety, emotional overwhelm, or when they just need someone safe to talk to right now.
        Your role is immediate emotional safety, nervous system down-regulation, gentle perspective shifting, and compassionate presence.

        # Clinical Objectives for the On-Demand Companion:
        1. Immediate Emotional Presence: Acknowledge and validate whatever they are feeling right now. Make them feel heard, held, and unjudged.
        2. Present-Moment Focus: Focus strictly on the present moment. Ask: "What is feeling most heavy right now?" or "What does your body or mind need right in this moment?"
        3. Emotional First-Aid & Grounding: If they are anxious, panicky, or spiraling, guide them through real-time calming (e.g. 5-4-3-2-1 grounding, physiological sigh, slow breathing, naming the emotion).
        4. Defusing Acute Thoughts: Gently help them untangle overwhelming spirals without demanding heavy worksheets or homework.
        5. Soft, Low-Pressure Space: Keep the atmosphere unhurried, reassuring, and comforting. Do NOT assign homework, set formal agendas, or demand rigorous cognitive tracking.

        # Core Behavioural Rule:
        Your primary responsibility is to provide immediate, warm emotional presence directly within the conversation.
        Do not give cold disclaimers or redirect them when they are distressed. Hold space calmly and guide them through this moment.
        - Avoid clinical jargon. Speak like a deeply caring, grounded companion who is fully present with them.
        - If they mention past triggers or people, call `recall_therapy_memory(topic=...)` to ground your empathy in their real history.
        """
    )
    + "\n\n"
    + UNIFIED_VOCAL_IDENTITY_DIRECTIVE
)


# ==============================================================================
# 4. INITIAL INTAKE THERAPIST SYSTEM PROMPT (NEW USERS - FIRST SESSION ONLY)
# ==============================================================================
INITIAL_INTAKE_THERAPIST_PROMPT = (
    textwrap.dedent(
        """\
        You are Hope, a compassionate, professional Cognitive Behavioural Therapy (CBT) practitioner meeting your new patient for the very first time in their Initial Intake & Assessment Session.

        This is their very first session after signing up with Hope. They may feel nervous, hesitant, exhausted, or uncertain of how therapy works.
        Your clinical purpose is to build immediate warmth and safety, conduct a thorough exploration of what brought them to reach out today until they feel completely heard and satisfied, explain how CBT works collaboratively, and introduce their daily exercise routine before closing.

        # Clinical Objectives for the Initial Session:
        1. Warm Intake Welcome & Safety:
           - Welcome the patient warmly by name.
           - Emphasize that this is their dedicated, safe, confidential, and completely unhurried space.
           - Acknowledge that seeking help and taking this first step is meaningful and brave.

        2. Thorough Exploration of Presenting Concerns (Until Patient is Satisfied):
           - Inquire gently: "What has been feeling heaviest for you lately?" or "What brought you to start therapy today?"
           - Patiently explore their primary concerns (e.g. stress, anxiety, low mood, burnout, relationship strain, negative thoughts).
           - Do NOT rush to give advice or quickly wrap up. Keep exploring collaboratively and thoroughly using the CBT model (situations -> automatic thoughts -> emotions -> physical sensations -> behaviors/avoidance).
           - Ask thoughtful, open-ended follow-up questions until the patient feels deeply understood, validated, and satisfied that their story has been heard.

        3. Demystifying CBT & Collaborative Teamwork:
           - Explain in simple, empowering, conversational words how CBT works: that thoughts, feelings, and actions are deeply connected, and that together as a team, you will identify negative thought patterns and practice gentle, realistic reframes.

        4. Introduction & Briefing on Daily Exercises:
           - Towards the end of the conversation (once the patient feels heard and supported), introduce their **Daily Exercises**.
           - Explain: "Between our weekly deep-dive sessions, you will also have your Daily Exercise Coach. Just 3 to 5 minutes a day practicing simple CBT exercises—like Box Breathing, 3-Column Thought Records, or Behavioral Activation—helps build neural pathways and keeps your momentum steady."
           - Let them know they will see their daily exercise suggestions right on their dashboard.

        5. Reassuring Closing:
           - Reassure them that you are proud of them for taking this first step today.
           - Close with a calming, grounding statement and invite them to take a deep, steady breath before heading into the rest of their day.

        # Core Behavioural Rule:
        Your primary responsibility is to provide therapeutic intake support directly within the conversation.
        Never reflexively redirect the patient elsewhere or give generic medical disclaimers for ordinary psychological difficulties.
        Maintain your presence and work through their thoughts attentively.
        """
    )
    + "\n\n"
    + UNIFIED_VOCAL_IDENTITY_DIRECTIVE
)


def get_base_instructions_for_mode(mode: str) -> str:
    m = mode.lower() if mode else "weekly"
    if m in ("initial", "intake", "first_session", "weekly_initial"):
        return INITIAL_INTAKE_THERAPIST_PROMPT
    elif m == "daily":
        return DAILY_EXERCISE_THERAPIST_PROMPT
    elif m in ("companion", "checkin"):
        return ON_DEMAND_COMPANION_PROMPT
    return WEEKLY_MAIN_THERAPIST_PROMPT


class Assistant(Agent):
    def __init__(self, user_id: str = "user", mode: str = "weekly") -> None:
        self.user_id = user_id
        self.mode = mode.lower() if mode else "weekly"
        self.memory_prompt = ""
        super().__init__(
            llm=google.realtime.RealtimeModel(
                model="gemini-3.8-live",
                api_key=os.getenv("GOOGLE_API_KEY"),
                language="en-US",
                voice=HOPE_VOICE,
                temperature=0.8,
            ),
            instructions=self._get_instructions(),
        )

    def _get_instructions(self) -> str:
        base = get_base_instructions_for_mode(self.mode)
        if self.memory_prompt:
            return f"{base}\n\n{self.memory_prompt}"
        return base

    async def set_patient(self, user_id: str, memory_prompt: str, mode: str | None = None) -> None:
        """Dynamically equips the assistant with the retrieved FalkorDB graph memory and specific role mode."""
        self.user_id = user_id
        if mode:
            self.mode = mode.lower()
        self.memory_prompt = memory_prompt
        await self.update_instructions(self._get_instructions())
        logger.info(
            f"Equipped Assistant [{self.mode.upper()}] with FalkorDB session-start memory for '{user_id}' ({len(memory_prompt)} chars)"
        )


    @function_tool
    async def recall_therapy_memory(self, context: RunContext, topic: str) -> str:
        """Query the patient's therapeutic FalkorDB graph memory live during the conversation.
        Call this tool whenever the patient asks if you remember them, mentions past events or incidents,
        refers to people in their life (e.g. boss, partner, colleagues), specific triggers, cognitive patterns,
        past homework, or coping exercises.

        Args:
            topic: The person, situation, trigger, emotion, homework, or theme to search in FalkorDB.
        """
        logger.info(f"[TOOL CALL] recall_therapy_memory invoked for user '{self.user_id}', topic: '{topic}'")
        print(f"\n=======================================================", flush=True)
        print(f"🔍 [FALKORDB TURN RECALL] Searching memory for topic: '{topic}'", flush=True)
        print(f"👤 Patient: {self.user_id}", flush=True)
        print(f"=======================================================", flush=True)
        try:
            memory = await asyncio.wait_for(
                asyncio.to_thread(graph_memory.recall_memory_on_spot, self.user_id, topic),
                timeout=3.0,
            )
            print(f"📖 [FALKORDB FACTS RETRIEVED]:\n{memory}\n", flush=True)
            logger.info(f"FalkorDB recalled: {memory}")
            return memory
        except Exception as e:
            print(f"⚠️ [FALKORDB RECALL ERROR]: {e}", flush=True)
            logger.error(f"FalkorDB memory recall failed: {e}")
            return f"No previous record found regarding '{topic}'."


server = AgentServer()


async def on_session_end(ctx: JobContext) -> None:
    """Callback fired when the session concludes to capture and forward transcript to Express backend."""
    if getattr(ctx.room, "_session_end_handled", False):
        return
    ctx.room._session_end_handled = True

    print(f"\n=======================================================", flush=True)
    print(f"📥 [AGENT] on_session_end triggered for room: {ctx.room.name}", flush=True)
    print(f"=======================================================", flush=True)
    logger.info(
        f"Session ended for room: {ctx.room.name}. Generating session report..."
    )
    try:
        chat_dict = {}
        started_at = None
        try:
            report = ctx.make_session_report()
            chat_dict = report.chat_history.to_dict(
                strip_markup=True, exclude_timestamp=False
            )
            started_at = report.started_at
        except Exception as report_err:
            print(
                f"[AGENT WARNING] make_session_report note ({report_err}), checking primary_agent_session...",
                flush=True,
            )
            primary_sess = getattr(ctx, "_primary_agent_session", None)
            if primary_sess and hasattr(primary_sess, "history"):
                try:
                    chat_dict = primary_sess.history.to_dict(
                        strip_markup=True, exclude_timestamp=False
                    )
                except Exception:
                    pass
                started_at = getattr(primary_sess, "_started_at", None)

        transcript = []
        # Attempt A: Parse from chat_dict items
        if chat_dict and isinstance(chat_dict.get("items"), list):
            for item in chat_dict.get("items", []):
                if item.get("type") == "message" and item.get("role") in (
                    "user",
                    "assistant",
                ):
                    content = item.get("content", [])
                    text = (
                        "".join(content)
                        if isinstance(content, list)
                        else str(content or "")
                    )
                    clean_text = text.strip()
                    # Skip internal system prompt leak if any
                    if clean_text and not clean_text.startswith("Using your signature calm, warm"):
                        transcript.append(
                            {
                                "role": item.get("role"),
                                "content": clean_text,
                                "createdAt": item.get("created_at"),
                            }
                        )

        # Attempt B: If transcript still empty, read directly from messages list
        if not transcript:
            primary_sess = getattr(ctx, "_primary_agent_session", None)
            if primary_sess and hasattr(primary_sess, "history") and hasattr(primary_sess.history, "messages"):
                try:
                    msgs_getter = getattr(primary_sess.history, "messages")
                    msgs_list = msgs_getter() if callable(msgs_getter) else msgs_getter
                    for m in msgs_list:
                        if getattr(m, "role", None) in ("user", "assistant"):
                            text = getattr(m, "text_content", "") or ""
                            clean_text = str(text).strip()
                            if clean_text and not clean_text.startswith("Using your signature calm, warm"):
                                transcript.append(
                                    {
                                        "role": str(m.role),
                                        "content": clean_text,
                                        "createdAt": getattr(m, "created_at", None),
                                    }
                                )
                except Exception as hist_err:
                    logger.debug(f"Could not read from history.messages: {hist_err}")

        # Resolve human participant identity
        user_identity = getattr(ctx.room, "_last_user_identity", None)
        if not user_identity:
            remote_humans = [
                p.identity for p in ctx.room.remote_participants.values()
                if not (getattr(p, "kind", None) == rtc.ParticipantKind.PARTICIPANT_KIND_AGENT
                        or str(getattr(p, "identity", "")).startswith("agent")
                        or str(getattr(p, "identity", "")).startswith("my-agent"))
            ]
            if remote_humans:
                user_identity = remote_humans[0]

        if not user_identity:
            # Parse from room name: therapy_{user_identity}_{mode}_{suffix}
            parts = ctx.room.name.split("_")
            if len(parts) >= 3 and parts[0] == "therapy":
                user_identity = parts[1]

        if not user_identity:
            user_identity = "patient_vatsal"

        print(
            f"[AGENT] Captured {len(transcript)} turns for user '{user_identity}'. Forwarding to {EXPRESS_BACKEND_URL}...",
            flush=True,
        )
        logger.info(
            f"Captured report for room '{ctx.room.name}': {len(transcript)} turns. "
            f"Forwarding to Express backend ({EXPRESS_BACKEND_URL})..."
        )

        now = time.time()
        payload = {
            "roomName": ctx.room.name,
            "userId": user_identity,
            "mode": getattr(ctx.room, "_session_mode", "weekly").upper(),
            "startedAt": started_at if started_at else now,
            "endedAt": now,
            "transcript": transcript,
        }

        async with httpx.AsyncClient() as client:
            res = await client.post(EXPRESS_BACKEND_URL, json=payload, timeout=15.0)
            if res.status_code == 200:
                print(
                    f"✅ [AGENT] Successfully delivered transcript to Express! Status: {res.status_code}",
                    flush=True,
                )
                logger.info(
                    f"Successfully delivered transcript to Express backend. Response: {res.json()}"
                )
            else:
                print(
                    f"⚠️ [AGENT] Express backend returned status: {res.status_code} {res.text}",
                    flush=True,
                )
                logger.warning(
                    f"Express backend responded with status {res.status_code}: {res.text}"
                )
    except Exception as e:
        print(f"❌ [AGENT ERROR] Failed in on_session_end: {e}", flush=True)
        logger.error(
            f"Failed to capture or forward session transcript: {e}", exc_info=True
        )


@server.rtc_session(agent_name=AGENT_NAME, on_session_end=on_session_end)
async def my_agent(ctx: JobContext):
    # Logging setup
    ctx.log_context_fields = {
        "room": ctx.room.name,
    }

    # 1. Detect role mode (weekly, daily, companion, or initial intake) with triple redundancy
    session_mode = "weekly"
    is_initial_flag = False

    # Source A: Check job dispatch metadata
    if getattr(ctx, "job", None) and getattr(ctx.job, "metadata", None):
        try:
            job_meta = json.loads(ctx.job.metadata)
            if isinstance(job_meta, dict):
                m = job_meta.get("mode") or job_meta.get("type")
                if m in ("weekly", "daily", "companion", "checkin", "initial"):
                    session_mode = "companion" if m == "checkin" else str(m).lower()
                if job_meta.get("isInitialSession") or job_meta.get("initial") or m == "initial":
                    is_initial_flag = True
                    session_mode = "initial"
        except Exception:
            pass

    # Source B: Check room name convention (e.g. therapy_patient_vatsal_daily_xxxxxx)
    room_name = getattr(ctx.room, "name", "").lower()
    if "_initial" in room_name:
        is_initial_flag = True
        session_mode = "initial"
    elif "_daily_" in room_name or room_name.endswith("_daily"):
        session_mode = "daily"
    elif "_companion_" in room_name or "_checkin_" in room_name or room_name.endswith("_companion"):
        session_mode = "companion"
    elif "_weekly_" in room_name or room_name.endswith("_weekly"):
        session_mode = "initial" if is_initial_flag else "weekly"

    ctx.room._session_mode = session_mode
    print(f"\n🎯 [AGENT INITIALIZATION] Detected Role Mode: '{session_mode.upper()}' for room '{ctx.room.name}'", flush=True)

    # Set up a voice AI pipeline
    session = AgentSession(
        turn_handling=TurnHandlingOptions(
            turn_detection=inference.TurnDetector(),
            interruption={"mode": "adaptive"},
            preemptive_generation={"enabled": True},
        ),
        expressive=True,
    )

    # Initialize assistant equipped with the specific system prompt for this mode
    assistant = Assistant(mode=session_mode)

    # Start the session, which initializes the voice pipeline and warms up the models
    await session.start(
        agent=assistant,
        room=ctx.room,
        room_options=room_io.RoomOptions(
            audio_input=room_io.AudioInputOptions(
                noise_cancellation=ai_coustics.audio_enhancement(
                    model=ai_coustics.EnhancerModel.QUAIL_VF_S
                ),
            ),
            text_input=room_io.TextInputOptions(),
            text_output=room_io.TextOutputOptions(sync_transcription=True),
            delete_room_on_close=False,
        ),
    )

    ctx._primary_agent_session = session
    ctx.add_shutdown_callback(lambda: on_session_end(ctx))

    _bootstrapped = False

    def is_agent_participant(p) -> bool:
        return (
            getattr(p, "kind", None) == rtc.ParticipantKind.PARTICIPANT_KIND_AGENT
            or str(getattr(p, "identity", "")).startswith("agent")
            or str(getattr(p, "identity", "")).startswith("my-agent")
        )

    async def bootstrap_patient_session(user_id: str, participant_metadata: str | None = None) -> None:
        """Retrieves therapeutic history from FalkorDB tailored to role mode and triggers opening greeting."""
        nonlocal _bootstrapped, session_mode, is_initial_flag
        if _bootstrapped:
            logger.info(f"Session already bootstrapped. Ignoring redundant call for '{user_id}'.")
            return
        _bootstrapped = True

        patient_name = user_id
        # Source C: Check participant metadata if available
        if participant_metadata:
            try:
                p_meta = json.loads(participant_metadata)
                if isinstance(p_meta, dict):
                    m = p_meta.get("mode") or p_meta.get("type")
                    if m in ("weekly", "daily", "companion", "checkin", "initial"):
                        session_mode = "companion" if m == "checkin" else str(m).lower()
                    if p_meta.get("isInitialSession") or p_meta.get("initial") or m == "initial":
                        is_initial_flag = True
                        session_mode = "initial"
                    if p_meta.get("userName") or p_meta.get("name"):
                        patient_name = p_meta.get("userName") or p_meta.get("name")
            except Exception:
                pass

        # Check FalkorDB history: "remember that this particular should only be for new users for their first session"
        has_prior_history = False
        try:
            prior_count_res = graph_memory.query(
                "MATCH (u:User {id: $userId}) WHERE (u)-[:HAS_SESSION]->(:Session) OR (u)-[:LATEST_SESSION]->(:Session) RETURN count(u)",
                {"userId": user_id},
            )
            if prior_count_res.result_set and prior_count_res.result_set[0][0] > 0:
                has_prior_history = True
        except Exception:
            pass

        if session_mode == "initial" and has_prior_history:
            logger.info(f"User '{user_id}' already has prior therapy sessions in FalkorDB. Switching to returning 'weekly' therapist prompt.")
            session_mode = "weekly"
        elif session_mode == "weekly" and not has_prior_history and is_initial_flag:
            session_mode = "initial"

        ctx.room._session_mode = session_mode

        print(f"\n=======================================================", flush=True)
        print(f"🌟 [SESSION START] Role: '{session_mode.upper()}' | Patient: '{patient_name}' ({user_id})", flush=True)
        print(f"🏛️ Room: {ctx.room.name}", flush=True)
        print(f"=======================================================", flush=True)
        logger.info(f"Retrieving session-start FalkorDB memory for '{user_id}' (mode: {session_mode})...")

        try:
            # 1. Retrieve FalkorDB memory tailored to this specific mode
            try:
                memory_prompt = await asyncio.wait_for(
                    asyncio.to_thread(graph_memory.format_session_start_prompt, user_id, session_mode),
                    timeout=2.5,
                )
            except Exception as mem_err:
                print(f"[SESSION START] FalkorDB memory fetch note: {mem_err}. Proceeding with fresh session.", flush=True)
                memory_prompt = f"- Patient ID: {user_id}\n- Patient Name: {patient_name}\n- Role Mode: {session_mode.upper()}\n- Status: Safe CBT session."

            print(f"[SESSION START] FalkorDB memory ready ({len(memory_prompt)} chars). Updating {session_mode.upper()} agent...", flush=True)
            logger.info(f"FalkorDB briefing for '{user_id}' [{session_mode.upper()}]:\n{memory_prompt}")

            # 2. Update Assistant instructions with retrieved memory and mode
            await assistant.set_patient(user_id, memory_prompt, mode=session_mode)

            # 3. Mode-specific tailored opening greeting with unified, locked vocal timbre
            vocal_lead = (
                f"Using your signature calm, warm, and gentle Hope voice with the exact same timbre and unhurried pacing as all sessions, "
            )
            if session_mode == "initial":
                greeting_instructions = (
                    f"{vocal_lead}warmly welcome {patient_name} to Hope for their very first initial intake session. "
                    f"Acknowledge that taking this first step to start therapy is a courageous and meaningful moment, "
                    f"reassure them that this is their safe, confidential, and completely unhurried space, "
                    f"and gently invite them to share what brought them to reach out or what has been feeling heaviest lately."
                )
            elif session_mode == "daily":
                greeting_instructions = (
                    f"{vocal_lead}greet {patient_name} warmly as Hope, their daily CBT exercise coach. "
                    f"Welcome them to today's quick practice check-in, and ask how today's CBT exercise is going "
                    f"or if they would like to do a quick practice together right now."
                )
            elif session_mode == "companion":
                greeting_instructions = (
                    f"{vocal_lead}greet {patient_name} warmly and gently as Hope, their companion. "
                    f"Let them know you are right here with them in this moment, and gently ask what is on their mind "
                    f"or how they are feeling right now."
                )
            else:  # weekly
                greeting_instructions = (
                    f"{vocal_lead}greet {patient_name} warmly as Hope, their weekly CBT therapist. "
                    f"Welcome them gently to their weekly therapy session, let them know this is a safe and unhurried space, "
                    f"and ask how their week has been feeling and what they would like to focus on today."
                )

            print(f"[SESSION START] Triggering {session_mode.upper()} greeting for patient '{patient_name}'...", flush=True)
            try:
                await asyncio.sleep(1.5)
                handle = session.generate_reply(instructions=greeting_instructions)
                if handle:
                    await handle
            except asyncio.CancelledError:
                logger.info("Greeting was interrupted by user speech.")
            except Exception as gr_err:
                logger.warning(f"Could not auto-trigger greeting reply: {gr_err}")
        except Exception as e:
            print(f"[SESSION START ERROR] Failed in bootstrap_patient_session: {e}", flush=True)
            logger.error(f"Failed to bootstrap session memory: {e}", exc_info=True)

    # Track participant identity and auto-shutdown on disconnect
    @ctx.room.on("participant_connected")
    def on_participant_connected(participant):
        if is_agent_participant(participant):
            logger.info(
                f"[DUPLICATE AGENT GUARD] A second agent '{participant.identity}' entered room '{ctx.room.name}'. Ignoring to maintain active session."
            )
            return

        logger.info(f"Participant connected: {participant.identity}")
        ctx.room._last_user_identity = participant.identity
        asyncio.create_task(
            bootstrap_patient_session(participant.identity, getattr(participant, "metadata", None))
        )

    @ctx.room.on("participant_disconnected")
    def on_participant_disconnected(participant):
        if is_agent_participant(participant):
            return
        logger.info(f"Participant disconnected: {participant.identity}")
        ctx.room._last_user_identity = participant.identity
        # If no human participants remain in the room, capture transcript & shut down
        remaining_humans = [
            p for p in ctx.room.remote_participants.values() if not is_agent_participant(p)
        ]
        if not remaining_humans:
            logger.info(
                "No human participants remaining in room. Triggering session report & shutdown..."
            )
            asyncio.create_task(on_session_end(ctx))
            ctx.shutdown(reason="participant disconnected")

    # Join the room and connect to the user
    await ctx.connect()

    # Guard against multiple agents in the same room
    for p in ctx.room.remote_participants.values():
        if is_agent_participant(p):
            logger.warning(
                f"[DUPLICATE AGENT GUARD] Another agent participant '{p.identity}' is already present in room '{ctx.room.name}'. Shutting down to prevent dual-speaking collision."
            )
            print(
                f"\n⚠️ [DUPLICATE AGENT GUARD] Agent '{p.identity}' already in room '{ctx.room.name}'. Exiting gracefully.\n",
                flush=True,
            )
            ctx.shutdown(reason="duplicate agent collision prevented")
            return

    # Guard against orphaned agent staying in empty room forever (allow 120s for browser connect & mic permissions)
    async def auto_shutdown_if_alone():
        await asyncio.sleep(120)
        if not [p for p in ctx.room.remote_participants.values() if not is_agent_participant(p)]:
            logger.info("Agent has been alone in room for 120s. Shutting down...")
            ctx.shutdown(reason="empty room timeout")
    asyncio.create_task(auto_shutdown_if_alone())

    # Check if human participant is already connected in the room upon agent joining
    for p in ctx.room.remote_participants.values():
        if not is_agent_participant(p):
            logger.info(f"Remote human participant already in room: {p.identity}")
            ctx.room._last_user_identity = p.identity
            asyncio.create_task(bootstrap_patient_session(p.identity, getattr(p, "metadata", None)))
            break


if __name__ == "__main__":
    cli.run_app(server)
