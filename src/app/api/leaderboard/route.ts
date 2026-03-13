import { NextResponse } from 'next/server';
import { put, list } from '@vercel/blob';

const LEADERBOARD_PATH = 'config/leaderboard.json';

interface LeaderboardEntry {
  name: string;
  score: number;
  wins: number;
  bestScore: number;
  lastPlayed: string;
}

interface LeaderboardData {
  entries: LeaderboardEntry[];
}

async function getLeaderboard(): Promise<LeaderboardEntry[]> {
  try {
    const { blobs } = await list({ prefix: LEADERBOARD_PATH });
    if (blobs.length === 0) {
      return [];
    }

    const url = new URL(blobs[0].url);
    url.searchParams.set('t', Date.now().toString());

    const response = await fetch(url.toString(), { cache: 'no-store' });
    const data: LeaderboardData = await response.json();
    return data.entries || [];
  } catch (error) {
    console.error('Error reading leaderboard:', error);
    return [];
  }
}

async function saveLeaderboard(entries: LeaderboardEntry[]): Promise<void> {
  const data: LeaderboardData = { entries };

  // Delete existing
  try {
    const { blobs } = await list({ prefix: LEADERBOARD_PATH });
    for (const blob of blobs) {
      const { del } = await import('@vercel/blob');
      await del(blob.url);
    }
  } catch {
    // Ignore
  }

  await put(LEADERBOARD_PATH, JSON.stringify(data, null, 2), {
    access: 'public',
    contentType: 'application/json',
  });
}

// GET - Get leaderboard
export async function GET() {
  try {
    const entries = await getLeaderboard();
    // Sort by total score descending
    entries.sort((a, b) => b.score - a.score);
    return NextResponse.json(entries.slice(0, 20), {
      headers: { 'Cache-Control': 'no-store' },
    });
  } catch (error) {
    console.error('Error fetching leaderboard:', error);
    return NextResponse.json([], { status: 500 });
  }
}

// POST - Submit score
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { name, score } = body;

    if (!name || typeof score !== 'number') {
      return NextResponse.json({ error: 'Name and score required' }, { status: 400 });
    }

    // Sanitize name
    const cleanName = name.trim().slice(0, 20).replace(/[<>]/g, '');
    if (!cleanName) {
      return NextResponse.json({ error: 'Invalid name' }, { status: 400 });
    }

    const entries = await getLeaderboard();

    // Find existing entry or create new
    const existingIndex = entries.findIndex(e => e.name.toLowerCase() === cleanName.toLowerCase());

    if (existingIndex >= 0) {
      // Update existing player
      entries[existingIndex].score += score;
      entries[existingIndex].wins += 1;
      entries[existingIndex].bestScore = Math.max(entries[existingIndex].bestScore, score);
      entries[existingIndex].lastPlayed = new Date().toISOString();
    } else {
      // New player
      entries.push({
        name: cleanName,
        score: score,
        wins: 1,
        bestScore: score,
        lastPlayed: new Date().toISOString(),
      });
    }

    await saveLeaderboard(entries);

    // Return updated leaderboard
    entries.sort((a, b) => b.score - a.score);
    return NextResponse.json({
      success: true,
      leaderboard: entries.slice(0, 20),
      playerRank: entries.findIndex(e => e.name.toLowerCase() === cleanName.toLowerCase()) + 1
    });
  } catch (error) {
    console.error('Error submitting score:', error);
    return NextResponse.json({ error: 'Failed to submit score' }, { status: 500 });
  }
}
