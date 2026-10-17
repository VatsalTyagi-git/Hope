import fetch from 'node-fetch';

async function ingestSession5() {
  const payload = {
    roomName: 'hope_0ccbaecf-43fd-4b7f-91e0-d32233482b07_weekly_recall',
    userId: '0ccbaecf-43fd-4b7f-91e0-d32233482b07',
    startedAt: Math.floor(Date.now() / 1000) - 300,
    endedAt: Math.floor(Date.now() / 1000),
    mode: 'WEEKLY',
    transcript: [
      {
        role: 'user',
        content: 'Therapist, I am feeling that old imposter panic creeping up again like in our very first session. Can you remind me about that presentation with Marcus on Project Aurora? What cognitive distortion was I stuck in, and what was the reframed thought we agreed on?',
      },
      {
        role: 'assistant',
        content: 'Hello Elena. I am so glad you reached out. It takes a lot of self-awareness to recognize when that familiar wave of anxiety starts to crest. Let us look back at our very first session: you came to me feeling overwhelmed by the feedback Marcus gave you regarding the Project Aurora presentation. At that time, you were caught in a classic pattern of Catastrophizing—your mind took a critique of your distributed cache failover architecture and spiraled into the belief that you were on the verge of being fired. Together, we worked to ground that thought into this reframe: "Constructive critique on distributed failover architecture is a normal part of engineering review, not proof that I am incompetent or getting fired. I solved three critical bugs last sprint and cut query latency by 40%." What I want you to notice, Elena, is how far you have come since then.',
      },
      {
        role: 'user',
        content: 'Thank you so much. Hearing that reframe again and knowing you remember exactly what happened clears the fog completely. I feel grounded and ready for tomorrow.',
      },
      {
        role: 'assistant',
        content: 'You are more than ready, Elena. Carry that reframe and your morning breath with you. Remember, feedback is data for growth, not a verdict on your worth.',
      },
    ],
  };

  const res = await fetch('http://localhost:5000/api/sessions/transcript', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });

  const data = await res.json();
  console.log('Session 5 Ingestion Result:', data.success, data.sessionId);
}

ingestSession5().catch((err) => {
  console.error('Error:', err);
  process.exit(1);
});
