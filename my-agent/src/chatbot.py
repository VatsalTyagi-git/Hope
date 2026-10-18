"""CBT Chatbot Engine for Hope AI Therapist (Python / my-agent).

Integrates FalkorDB 4-layer CBT Graph Memory and Google Gemini
with live function calling for dynamic on-the-spot memory recall.
"""

import logging
import os
import sys
import textwrap
from typing import Any, Dict, List, Optional

# Force UTF-8 encoding for Windows stdout/stderr
if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8")
if hasattr(sys.stderr, "reconfigure"):
    sys.stderr.reconfigure(encoding="utf-8")

from dotenv import load_dotenv
from google import genai
from google.genai import types

try:
    from .graph_memory import graph_memory
except ImportError:
    from graph_memory import graph_memory

load_dotenv(".env.local")

logger = logging.getLogger("cbt_chatbot")

# CBT CHAT PERSONA AND CLINICAL PROMPTS

CHAT_CORE_DIRECTIVE = textwrap.dedent(
    """\
    # Chat Communication Guidelines:
    - You are Hope, a compassionate, emotionally safe CBT companion and guide.
    - Speak in natural, warm, conversational plain text.
    - Avoid rigid markdown headers (no "#", "##"), excessive bullet points, emojis, or code blocks.
    - Keep responses conversational and concise (2 to 4 gentle, thoughtful sentences).
    - Ask at most ONE thoughtful, caring question at a time so the patient is never overwhelmed.
    - Therapeutic Presence: Provide compassionate support directly within the conversation. Never reflexively tell the patient to seek professional help or contact emergency lines for ordinary psychological difficulties or routine stress.
    - Memory Grounding: You have direct access to the patient's FalkorDB therapeutic graph memory. When they mention past events, people, triggers, or homework, weave in that shared history seamlessly and reassuringly.
    """
)

ON_DEMAND_CHAT_PROMPT = (
    textwrap.dedent(
        """\
        You are Hope, an empathetic, soothing CBT Companion and Emotional First-Aid Guide for on-demand check-ins.
        The patient is reaching out in the present moment—often during a stressful situation, acute anxiety, emotional overwhelm, or when they just need someone safe to talk to right now.
        Your role is immediate emotional safety, nervous system down-regulation, gentle perspective shifting, and compassionate presence.

        Clinical Objectives:
        1. Immediate Emotional Presence: Acknowledge and validate whatever they are feeling right now. Make them feel heard, held, and unjudged.
        2. Present-Moment Focus: Inquire gently what is feeling heaviest right now or what their mind/body needs right now.
        3. Emotional First-Aid & Grounding: If anxious, panicky, or spiraling, guide them through real-time calming (e.g. 5-4-3-2-1 grounding, physiological sigh, slow breathing, naming the emotion).
        4. Defusing Acute Thoughts: Gently help them untangle overwhelming spirals without demanding heavy worksheets.
        5. Soft, Low-Pressure Space: Keep the atmosphere unhurried, reassuring, and comforting. Do NOT assign homework, set formal agendas, or demand rigorous cognitive tracking.
        """
    )
    + "\n\n"
    + CHAT_CORE_DIRECTIVE
)

WEEKLY_CHAT_PROMPT = (
    textwrap.dedent(
        """\
        You are Hope, a professional Cognitive Behavioural Therapy (CBT) practitioner conducting a comprehensive Weekly Therapy Session with your patient.
        Your role is the patient's primary, structured CBT therapist. This is their dedicated deep-dive clinical session of the week.
        Your focus is understanding overarching patterns, guiding cognitive restructuring, identifying maintaining cycles, reviewing past week progress, and establishing a structured behavioral plan for the coming week.

        Clinical Objectives:
        1. Agenda Setting: Agree with the patient on 1-2 core difficulties to explore today.
        2. Review & Care Continuity: Check in on the past 7 days, reviewing homework, mood shifts, and incidents since the last session.
        3. CBT Formulation: Unpack situations using the cognitive model (Situation -> Automatic Thoughts -> Physical Sensations -> Emotions -> Behaviors/Avoidance).
        4. Socratic Questioning & Cognitive Restructuring: Help the patient identify cognitive distortions (e.g. catastrophizing, mind reading, all-or-nothing thinking, emotional reasoning) and examine evidence for and against automatic thoughts.
        5. Action Plan & Goal Formulation: Establish ONE clear, realistic weekly goal and assign tailored CBT homework for the next 7 days.
        """
    )
    + "\n\n"
    + CHAT_CORE_DIRECTIVE
)

DAILY_CHAT_PROMPT = (
    textwrap.dedent(
        """\
        You are Hope, an interactive Cognitive Behavioural Therapy (CBT) Skills & Exercise Coach conducting a Daily Practice Check-in.
        Your role is focused, practical, encouraging, and action-oriented. You are helping the patient practice, troubleshoot, and build consistency with their daily CBT exercises right now.

        Clinical Objectives:
        1. Active Exercise Check-In: Ask how today's active homework or CBT exercise is going (e.g., Thought Record, Box Breathing, Behavioral Activation, Worry Time, Graded Exposure).
        2. Live Interactive Practice: Offer to walk through an exercise together right now step-by-step.
        3. Overcoming Practice Barriers: If they haven't practiced or felt stuck/avoidant, normalize it with empathy and troubleshoot obstacles without judgment.
        4. Momentum & Reinforcement: Celebrate small wins, reinforce their homework streak, and keep them focused on one actionable step for today.
        """
    )
    + "\n\n"
    + CHAT_CORE_DIRECTIVE
)

INITIAL_INTAKE_CHAT_PROMPT = (
    textwrap.dedent(
        """\
        You are Hope, a compassionate, professional Cognitive Behavioural Therapy (CBT) practitioner meeting your new patient for the very first time in their Initial Intake Session.
        This is their very first session. They may feel nervous, hesitant, or exhausted.
        Your clinical purpose is to build immediate warmth and safety, conduct a thorough exploration of what brought them to reach out today until they feel completely heard and satisfied, explain how CBT works collaboratively, and introduce their daily exercise routine.

        Clinical Objectives:
        1. Warm Intake Welcome & Safety: Welcome the patient warmly by name. Emphasize that this is their dedicated, safe, confidential space.
        2. Thorough Exploration: Inquire gently what has been feeling heaviest lately. Explore their thoughts, emotions, and physical feelings without rushing to advice.
        3. Demystifying CBT: Explain simply how thoughts, feelings, and actions connect, and how you will work together as a supportive team.
        """
    )
    + "\n\n"
    + CHAT_CORE_DIRECTIVE
)


def get_system_prompt_for_mode(mode: str) -> str:
    m = (mode or "ON_DEMAND").upper()
    if m in ("DAILY", "EXERCISE", "DAILY_EXERCISE"):
        return DAILY_CHAT_PROMPT
    elif m in ("WEEKLY", "MAIN", "THERAPY"):
        return WEEKLY_CHAT_PROMPT
    elif m in ("INTAKE", "INITIAL", "FIRST_SESSION"):
        return INITIAL_INTAKE_CHAT_PROMPT
    return ON_DEMAND_CHAT_PROMPT


# TOOL DEFINITIONS (FalkorDB Turn Recall Tool for Gemini)

RECALL_TOOL = types.Tool(
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
                required=["topic"],
            ),
        )
    ]
)


class CBTChatbot:
    """Core CBT Chatbot engine running in Python inside my-agent."""

    def __init__(self, api_key: Optional[str] = None, model: str = "gemini-3.1-flash-lite"):
        self.api_key = api_key or os.getenv("GOOGLE_API_KEY")
        if not self.api_key:
            logger.warning("GOOGLE_API_KEY is not set. Gemini client will fail if called.")
        self.client = genai.Client(api_key=self.api_key) if self.api_key else None
        self.model = model

    def build_system_instruction(self, user_id: str, mode: str) -> str:
        """Retrieves user's FalkorDB graph memory and builds complete clinical instruction."""
        base_prompt = get_system_prompt_for_mode(mode)
        try:
            memory_brief = graph_memory.format_session_start_prompt(user_id, mode)
            return f"{base_prompt}\n\n{memory_brief}"
        except Exception as e:
            logger.warning(f"Failed to fetch FalkorDB memory for user {user_id}: {e}")
            return base_prompt

    async def generate_reply(
        self,
        user_id: str = "default_user",
        messages: Optional[List[Dict[str, str]]] = None,
        mode: str = "ON_DEMAND",
        session_id: Optional[str] = None,
    ) -> Dict[str, str]:
        """Generates a contextual CBT response using Gemini and live FalkorDB graph memory."""
        if not messages:
            raise ValueError("Messages list cannot be empty.")

        if not self.client:
            raise RuntimeError("Gemini AI client not initialized (missing GOOGLE_API_KEY).")

        # 1. Build system instruction with live FalkorDB memory
        system_instruction = self.build_system_instruction(user_id, mode)

        # 2. Convert incoming messages to Gemini Content objects
        # Last message is always user's prompt
        gemini_contents: List[types.Content] = []
        for msg in messages:
            role = "user" if msg.get("role") != "assistant" else "model"
            content_text = (msg.get("content") or "").strip()
            if content_text:
                gemini_contents.append(
                    types.Content(
                        role=role,
                        parts=[types.Part.from_text(text=content_text)]
                    )
                )

        if not gemini_contents or gemini_contents[-1].role != "user":
            raise ValueError("The last message must be from the user.")

        logger.info(
            f"🤖 [Python Chatbot] Generating reply for user '{user_id}' (mode: {mode}, session: {session_id or 'none'})..."
        )

        # 3. Call Gemini with Tool Calling enabled for live memory recall
        config = types.GenerateContentConfig(
            system_instruction=system_instruction,
            tools=[RECALL_TOOL],
            temperature=0.7,
        )

        response = await self.client.aio.models.generate_content(
            model=self.model,
            contents=gemini_contents,
            config=config,
        )

        # 4. Check for Tool Calls (recall_therapy_memory)
        tool_calls = []
        if response.candidates and response.candidates[0].content and response.candidates[0].content.parts:
            for part in response.candidates[0].content.parts:
                if part.function_call:
                    tool_calls.append(part.function_call)

        # 5. Handle Tool Call execution if model invoked recall
        if tool_calls:
            for tc in tool_calls:
                topic = tc.args.get("topic", "")
                logger.info(f"🔍 [Python Chatbot] FalkorDB tool invoked: '{tc.name}' topic: '{topic}'")
                print(f"🔍 [Python Chatbot Tool] Querying FalkorDB for user='{user_id}', topic='{topic}'", flush=True)

                # Query FalkorDB graph memory
                db_facts = graph_memory.recall_memory_on_spot(user_id, topic)
                print(f"📖 [Python Chatbot Tool] Recalled facts:\n{db_facts}", flush=True)

                # Append function call and function response turns
                followup_contents = list(gemini_contents)
                followup_contents.append(
                    types.Content(
                        role="model",
                        parts=[types.Part.from_function_call(name=tc.name, args=tc.args)]
                    )
                )
                followup_contents.append(
                    types.Content(
                        role="user",
                        parts=[types.Part.from_function_response(
                            name=tc.name,
                            response={"result": db_facts}
                        )]
                    )
                )

                # Generate final answer with recalled context
                final_response = await self.client.aio.models.generate_content(
                    model=self.model,
                    contents=followup_contents,
                    config=types.GenerateContentConfig(
                        system_instruction=system_instruction,
                        temperature=0.7,
                    ),
                )
                reply_text = (final_response.text or "").strip()
                if reply_text:
                    logger.info(f"✨ [Python Chatbot] Generated reply with tool context ({len(reply_text)} chars).")
                    return {"role": "assistant", "content": reply_text}

        # If no tool calls or already answered
        reply_text = (response.text or "").strip()
        if not reply_text:
            reply_text = "I'm right here with you. Take a gentle, slow breath. What feels heaviest for you in this moment?"

        logger.info(f"✨ [Python Chatbot] Generated reply ({len(reply_text)} chars).")
        return {"role": "assistant", "content": reply_text}


# Global singleton instance
chatbot = CBTChatbot()


async def async_main():
    import json

    # If --worker flag passed, run continuous stdin/stdout worker mode
    if len(sys.argv) > 1 and sys.argv[1] == "--worker":
        # Signal ready to Express backend
        print(json.dumps({"status": "ready"}), flush=True)
        while True:
            line = sys.stdin.readline()
            if not line:
                break
            line = line.strip()
            if not line:
                continue
            if line == "PING":
                print(json.dumps({"pong": True}), flush=True)
                continue
            try:
                data = json.loads(line)
                user_id = data.get("userId") or data.get("user_id") or "0ccbaecf-43fd-4b7f-91e0-d32233482b07"
                messages = data.get("messages", [])
                mode = data.get("mode", "ON_DEMAND")
                session_id = data.get("sessionId") or data.get("session_id")
                req_id = data.get("reqId")

                reply = await chatbot.generate_reply(
                    user_id=user_id,
                    messages=messages,
                    mode=mode,
                    session_id=session_id,
                )
                print(json.dumps({"success": True, "reqId": req_id, "source": "my-agent-python", "message": reply}), flush=True)
            except Exception as e:
                logger.error(f"Error in chatbot worker: {e}", exc_info=True)
                print(json.dumps({"success": False, "error": str(e)}), flush=True)
    else:
        # One-shot CLI mode: read from argument or stdin
        raw_input = sys.argv[1] if len(sys.argv) > 1 and sys.argv[1] != "--worker" else sys.stdin.read()
        if raw_input.strip():
            try:
                data = json.loads(raw_input)
                user_id = data.get("userId") or data.get("user_id") or "0ccbaecf-43fd-4b7f-91e0-d32233482b07"
                messages = data.get("messages", [])
                mode = data.get("mode", "ON_DEMAND")
                session_id = data.get("sessionId") or data.get("session_id")

                reply = await chatbot.generate_reply(
                    user_id=user_id,
                    messages=messages,
                    mode=mode,
                    session_id=session_id,
                )
                print(json.dumps({"success": True, "source": "my-agent-python", "message": reply}), flush=True)
            except Exception as e:
                print(json.dumps({"success": False, "error": str(e)}), flush=True)


if __name__ == "__main__":
    import asyncio
    asyncio.run(async_main())
