import { NextRequest, NextResponse } from 'next/server';
import { RDS_RTL_AUDIO_TRACKS } from '@/lib/audio';

export async function GET() {
  return NextResponse.json({
    success: true,
    platform: 'Rise Defense Systems (RDS) RevOps RTL Audio Engine',
    portalUrl: 'https://rdsrevops.com',
    status: 'online',
    tracks: RDS_RTL_AUDIO_TRACKS,
    timestamp: new Date().toISOString()
  });
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { title, transcript, category } = body;

    if (!title || !transcript) {
      return NextResponse.json(
        { error: 'Title and transcript are required.' },
        { status: 400 }
      );
    }

    const newTrack = {
      id: `rtl-audio-${Date.now()}`,
      title,
      category: category || 'RevOps RTL Stream',
      duration: '02:30',
      url: 'https://rdsrevops.com',
      transcript,
      sentiment: 'positive' as const,
      tags: ['RDS', 'RTL Audio', 'RevOps']
    };

    return NextResponse.json({
      success: true,
      message: 'Audio transcript synced with RDS RevOps audio intelligence portal.',
      track: newTrack
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
