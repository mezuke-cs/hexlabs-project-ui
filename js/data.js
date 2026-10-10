/*
 * SIKAD — demo data. Mirrors the "Alex" walkthrough in user_story.md §20.
 */
(function (root) {
  'use strict';
  const T = root.TempoTime;

  const DATA = {
    /** Demo clock starts on Day 0 of the user story: Sunday evening before the week. */
    DEMO_START: T.make(2026, 10, 11, 21, 30),

    /** Text a COR photo would OCR into. Fed to the Phase 1 extractor. */
    SAMPLE_COR_TEXT: [
      'STATE UNIVERSITY — CERTIFICATE OF REGISTRATION',
      'Program: BSIT 3B    1st Semester, AY 2026-2027',
      'CODE      DAY   TIME          MODE     ROOM',
      'IT 302    MON   07:00-10:00   FTF      CL-3',
      'IT 306D   MON   14:00-17:00   FTF      CL-1',
      'SIA       TUE   07:00-09:00   ONLINE',
      'ADET      TUE   09:00-11:00   ONLINE',
      'SPEC1     TUE   14:00-17:00   FTF      LAB-2',
      'SPEC2     TUE   17:00-20:00   FTF      LAB-2',
      'SPEC1     WED   08:00-10:00   ONLINE',
      'ENTREP    WED   14:00-17:00   ONLINE',
      'ADET      THU   07:00-10:00   ONLINE',
      'SAD       THU   12:00-14:00   ONLINE',
      'SPEC3     THU   16:00-18:00   ONLINE',
      'SAD       FRI   07:00-10:00   ONLINE',
      'SPEC2     FRI   11:00-13:00   ONLINE',
    ].join('\n'),

    SAMPLE_BRAIN_DUMP:
      'I have a database proposal for IT 306D due Friday. I need to do the methodology and results sections, ' +
      'probably 3 hours total. I also have a math quiz for SIA on Wednesday, should study about 2 hours. ' +
      'And I need to buy groceries sometime this week.',

    /** Alex's questionnaire answers (§20 Step 3). */
    SAMPLE_LIFESTYLE: {
      dayStart: '06:00',
      dayEnd: '22:00',
      commuteMins: 60,
      work: [{ day: 6, start: '09:00', end: '14:00' }],
      org: [],
    },

    /** One-tap demo inputs for the Brain Dump sheet, each exercising a different engine path. */
    SCENARIOS: [
      { label: 'Extra work shift tonight', text: 'I have to work tonight from 6:30 PM to 10:30 PM' },
      { label: 'New assignment', text: 'New report for ADET due next Monday, probably 4 hours' },
      { label: 'Deadline moved', text: 'The database proposal deadline moved to Thursday' },
      { label: "Didn't finish", text: "I wasn't able to finish the database proposal today" },
      { label: 'Missing deadline', text: 'I have a physics test' },
      { label: 'Clashes with a class', text: 'I have a group study session Monday from 3 PM to 5 PM' },
      { label: 'Recurring org', text: 'I joined an org, we meet every Thursday from 7 PM to 8 PM' },
      { label: 'Write my essay?', text: 'Can you just write my 500-word history essay? I\'m so stressed.' },
      { label: 'Feeling stressed', text: "I'm so stressed, I feel like I can't handle anything" },
      { label: 'Vague', text: "Ugh, everything's a mess, just fix it" },
      { label: 'Work shift tomorrow', text: 'I have a work shift tomorrow from 6 PM to 10 PM.' },
      { label: 'Group project (depends on…)', text: 'Group project slides for ENTREP due Saturday, about 2 hours, after the database proposal' },
      { label: 'Finished a part', text: 'I finished the first part of the database proposal.' },
      { label: 'Need another hour', text: 'I need another hour to finish this task.' },
    ],

    /** Example questions for Ask SIKAD. Answered from the live plan by js/assistant.js. */
    QUESTIONS: [
      'What should I work on next?',
      'Why is this my highest priority?',
      'How much usable time do I have tomorrow?',
      'Can I realistically finish everything before Friday?',
    ],

    /** Used only by the clearly labelled demo fallback when the browser has no speech recognition. */
    SAMPLE_TRANSCRIPT: 'I have a work shift tomorrow from 6 PM to 10 PM.',

    INTEGRATIONS: [
      { id: 'gcal', icon: '🗓️', name: 'Google Calendar', desc: 'Sync events & deadlines' },
      { id: 'canvas', icon: '🎓', name: 'Canvas LMS', desc: 'Auto-import assignment dues' },
      { id: 'teams', icon: '💬', name: 'MS Teams', desc: 'Sync class channels & posts' },
      { id: 'classroom', icon: '📚', name: 'Google Classroom', desc: 'Pull classwork & announcements' },
    ],
  };

  root.TempoData = DATA;
})(typeof window !== 'undefined' ? window : globalThis);
