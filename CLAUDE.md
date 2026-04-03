# Chalk AI — Project Context
App: chalkai.lovable.app — AI tutoring app
Mr. White is an animated SVG professor who 
teaches on a dark chalkboard with voice.
Stack: React, TypeScript, Tailwind, Supabase, 
Claude API, ElevenLabs, Stripe
Key files:
- src/components/Whiteboard.tsx
- src/components/MrWhite.tsx  
- src/pages/Ask.tsx
- supabase/functions/mr-white-chat/index.ts
Current problem: Whiteboard receives template 
field with empty elements array and draws nothing.
Needs buildElementsFromTemplate function.
Canvas: 640x400px, axes origin x=80 y=320
Colors: board #1C2E28, blue #3B6FCA, 
chalk #F5F0E8, gold #E8C44A, red #E05252
