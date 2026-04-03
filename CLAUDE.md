# Chalk AI — Complete Project Vision and Context

## The Vision — Read This First
Chalk is a personal digital tutor. A student 
types any question and Mr. White — a tiny 
animated chalk-drawn professor — teaches them 
visually on a dark chalkboard in real time.

The experience must feel like watching an 
educational YouTube video — but it is live, 
interactive, and generated specifically for 
the student's exact question.

Mr. White SPEAKS while SIMULTANEOUSLY DRAWING 
on the chalkboard. His voice and the drawings 
are locked together — when he says "here is 
the curve" the curve appears at that exact 
moment. When he says "and the slope here" 
the tangent line draws in at that word.

This synchronization is the entire product.
Without it Chalk is just a chatbot with 
a drawing next to it. With it Chalk feels 
like a real professor at a real chalkboard.

## The Student Experience
Student types: "what is a derivative?"

Mr. White's voice begins: "Think of a 
derivative as a speedometer..."
At that moment: nothing on board yet

Voice continues: "First let's set up 
our axes..."
At that moment: x and y axes draw in

Voice: "Here is our function f(x)..."
At that moment: the curve draws left to right

Voice: "Now at this specific point..."
At that moment: a red dot appears on the curve

Voice: "The derivative is the slope of the 
tangent line at that point..."
At that moment: yellow tangent line draws through dot

Voice: "We write this as f prime of x..."
At that moment: label "f'(x)" appears

Student watches this and says "oh NOW I get it"
That moment is the entire product.

## Technical Stack
- Frontend: React + TypeScript + Tailwind (Lovable)
- Backend: Supabase Edge Functions (Deno)
- AI: Claude API claude-sonnet-4-20250514
- Voice: ElevenLabs TTS (voice Adam)
- Payments: Stripe (working)
- Auth + DB: Supabase

## Live URL
https://chalkai.lovable.app
GitHub: github.com/Emperorr12/chalkai

## Key Files
src/components/Whiteboard.tsx — SVG whiteboard
src/components/MrWhite.tsx — animated professor
src/pages/Ask.tsx — main page, coordinates everything
src/hooks/useTextToSpeech.ts — ElevenLabs voice
supabase/functions/mr-white-chat/index.ts — Claude API

## Current State
WORKING:
- Claude API connected and responding warmly
- ElevenLabs voice narration playing
- Dark chalkboard #1C2E28 with wood frame
- Mr. White SVG with 7 animation states
- DiagramEngine generating 6 templates
- Freemium paywall + Stripe payments
- Learning profile, exam prep, lesson replay
- Photo upload with Claude vision

BROKEN:
- Voice and whiteboard are NOT synchronized
  They start at the same time but have no 
  relationship — elements appear all at once
  instead of appearing when Mr. White says them
  THIS IS THE MOST CRITICAL REMAINING PROBLEM

## The TimelineEngine — What Needs Building
A system that locks audio playback position
to whiteboard element appearance.

How it works:
1. Mr. White's audio starts playing
2. requestAnimationFrame loop checks 
   audio.currentTime every 16ms
3. Each whiteboard element has a delay_seconds 
   field — this is the timestamp in the audio
   when that element should appear
4. When currentTime >= element.delay_seconds
   that element's draw animation triggers
5. Result: whiteboard builds in sync with voice

This is the difference between Chalk feeling
like a slideshow vs feeling like a real teacher.

## SVG Canvas
Width: 640px, Height: 400px
Axes origin: x=80, y=320 (always fixed)
Safe area: x 60-600, y 30-380

## Whiteboard Colors
Board: #1C2E28 (dark chalkboard green)
Primary: blue #3B6FCA
Chalk: #F5F0E8
Emphasis: gold #E8C44A, red #E05252
Frame: wood #8B6914

## WhiteboardElement Type
{
  kind: "text"|"line"|"curve"|"circle"|
        "rect"|"axis"|"point"|"arrow"|"path"
  content: string
  color: "blue"|"white"|"red"|"green"|"yellow"
  delay_seconds: number — audio timestamp 
    when this element should appear
  size?: "small"|"medium"|"large"
}

## Mr. White States
idle — breathing animation, waiting
talking — bounce animation while voice plays
thinking — head tilt, dots above head
excited — star burst, correct quiz answer
celebrating — confetti, Chalk it up pressed
drawing — arm extends toward whiteboard
listening — soundwave rings, mic recording

## The Design Principle
Every decision should serve one moment:
A student stuck on a concept at 11pm types 
their question and Mr. White draws it out 
while explaining in his voice until it clicks.
That click is the product.
Build everything in service of that moment.

## Git Workflow
Pull before starting: git pull origin main
Push when done: 
git add . && git commit -m "description" && git push origin main
Lovable auto-syncs from GitHub main branch.
