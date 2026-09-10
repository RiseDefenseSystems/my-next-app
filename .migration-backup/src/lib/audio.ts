export interface AudioTrack {
  id: string;
  title: string;
  category: string;
  duration: string;
  url: string;
  transcript: string;
  sentiment: 'positive' | 'neutral' | 'action_required';
  tags: string[];
}

export const RDS_RTL_AUDIO_TRACKS: AudioTrack[] = [
  {
    id: 'track-1',
    title: 'RDS RevOps Live Audio Briefing - Q3 Pipeline Velocity',
    category: 'Executive Briefing',
    duration: '04:15',
    url: 'https://rdsrevops.com/assets/audio/briefing-q3.mp3',
    transcript: 'Welcome to the Rise Defense Systems revenue operations real-time briefing. Today we are reviewing deal stage velocity, CAC payback optimization, and automated CRM sync workflows.',
    sentiment: 'positive',
    tags: ['RevOps', 'Pipeline', 'Neon Postgres', 'RTL Audio']
  },
  {
    id: 'track-2',
    title: 'Client Discovery Call - Compliance & SOC2 Security Overview',
    category: 'Sales Intelligence',
    duration: '06:42',
    url: 'https://rdsrevops.com/assets/audio/client-call-soc2.mp3',
    transcript: 'Client inquired about role-based access control and data residency. Revbot automated the vector search retrieval for security certificates and compliance documentation.',
    sentiment: 'positive',
    tags: ['Security', 'Compliance', 'SOC2', 'Enterprise']
  },
  {
    id: 'track-3',
    title: 'Revenue Operations Friction Point Analysis & Churn Mitigation',
    category: 'Customer Success',
    duration: '03:28',
    url: 'https://rdsrevops.com/assets/audio/churn-mitigation.mp3',
    transcript: 'Identified bottleneck in onboarding workflow at day 14. Recommended automated engagement trigger and AI agent intervention.',
    sentiment: 'action_required',
    tags: ['Retention', 'Churn', 'Onboarding', 'Automation']
  }
];
